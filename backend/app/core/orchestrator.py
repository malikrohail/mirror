"""Study orchestrator — manages study lifecycle and dispatches work to workers.

This module handles:
- Study status transitions: setup → running → analyzing → complete
- AI-driven navigation of personas through the target website
- Post-session analysis pipeline (screenshot analysis, synthesis, heatmaps, reports)
- Timeout handling and progress tracking
- Publishing events to Redis for WebSocket consumption
"""

import asyncio
import json
import logging
import os
import uuid
from typing import Any

import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession

from app.browser.actions import BrowserActions
from app.browser.pool import BrowserPool
from app.browser.screenshots import ScreenshotService
from app.config import settings
from app.core.analyzer import Analyzer
from app.core.deduplicator import IssueDeduplicator
from app.core.firecrawl_client import FirecrawlClient, SiteMap
from app.core.heatmap import HeatmapGenerator
from app.core.navigator import Navigator, NavigationResult
from app.core.persona_engine import PersonaEngine
from app.core.prioritizer import IssuePrioritizer
from app.core.report_builder import ReportBuilder
from app.core.step_recorder import DatabaseStepRecorder
from app.core.synthesizer import Synthesizer
from app.db.repositories.session_repo import SessionRepository
from app.db.repositories.study_repo import StudyRepository
from app.llm.client import LLMClient
from app.models.insight import Insight, InsightType
from app.models.session import SessionStatus
from app.models.study import StudyStatus
from app.storage.file_storage import FileStorage

logger = logging.getLogger(__name__)


class StudyOrchestrator:
    """Manages the lifecycle of a study run.

    Integrates Agent 1's infrastructure (DB, Redis, storage) with
    Agent 2's AI engine (navigation, analysis, synthesis, reporting).
    """

    def __init__(self, db: AsyncSession, redis: aioredis.Redis):
        self.db = db
        self.redis = redis
        self.study_repo = StudyRepository(db)
        self.session_repo = SessionRepository(db)

        # AI engine components
        self._llm = LLMClient()
        self._persona_engine = PersonaEngine(self._llm)
        self._navigator = Navigator(
            self._llm,
            max_steps=int(os.getenv("MAX_STEPS_PER_SESSION", "30")),
        )
        self._analyzer = Analyzer(self._llm)
        self._synthesizer = Synthesizer(self._llm)
        self._heatmap_gen = HeatmapGenerator()
        self._report_builder = ReportBuilder(self._llm)
        self._firecrawl = FirecrawlClient()

        # Browser pool (initialized lazily)
        self._pool: BrowserPool | None = None

    async def _ensure_browser_pool(self) -> BrowserPool:
        """Initialize browser pool if not already done."""
        if self._pool is None:
            max_ctx = int(os.getenv("MAX_CONCURRENT_SESSIONS", "5"))
            self._pool = BrowserPool(max_contexts=max_ctx)
            await self._pool.initialize()
        return self._pool

    async def run_study(self, study_id: uuid.UUID) -> dict[str, Any]:
        """Main entry point for running a study.

        Executes the full pipeline:
        1. Load study config → 2. Generate personas → 3. Navigate in parallel →
        4. Analyze screenshots → 5. Synthesize insights → 6. Generate heatmaps →
        7. Build reports → 8. Mark complete
        """
        study = await self.study_repo.get_with_all(study_id)
        if not study:
            logger.error("Study %s not found", study_id)
            return {"study_id": str(study_id), "status": "failed", "error": "Not found"}

        try:
            # --- Phase 1: Setup ---
            await self.study_repo.update_status(study_id, StudyStatus.RUNNING)
            await self._publish_progress(study_id, 5, "starting")

            pool = await self._ensure_browser_pool()
            study_url = study.url
            starting_path = study.starting_path or ""

            # --- Phase 2: Generate persona profiles ---
            persona_profiles = await self._generate_persona_profiles(study)
            await self._publish_progress(study_id, 10, "personas_ready")

            # --- Phase 2.5: Pre-crawl site with Firecrawl ---
            sitemap = await self._precrawl_site(study_url)
            await self._publish_progress(study_id, 15, "sitemap_ready")

            # --- Phase 3: Parallel navigation ---
            nav_results = await self._run_navigation_sessions(
                study_id=study_id,
                study=study,
                study_url=study_url,
                starting_path=starting_path,
                persona_profiles=persona_profiles,
                pool=pool,
            )
            await self._publish_progress(study_id, 60, "navigation_complete")

            # --- Phase 4: Analysis ---
            await self.study_repo.update_status(study_id, StudyStatus.ANALYZING)
            await self._publish_progress(study_id, 65, "analyzing")

            all_issues, all_steps = await self._run_analysis_pipeline(
                study_id, nav_results
            )
            await self._publish_progress(study_id, 75, "analysis_complete")

            # --- Phase 5: Synthesis ---
            await self._publish_event(study_id, {
                "type": "study:analyzing",
                "study_id": str(study_id),
                "phase": "synthesis",
            })

            session_summaries = self._build_session_summaries(nav_results)
            task_descriptions = [t.description for t in study.tasks]

            synthesis = await self._synthesizer.synthesize(
                study_url=study_url,
                tasks=task_descriptions,
                session_summaries=session_summaries,
                all_issues=all_issues,
            )

            # --- Persist insights to database ---
            await self._save_insights(study_id, synthesis)

            # --- Issue deduplication & prioritization ---
            try:
                deduplicator = IssueDeduplicator(self.db)
                await deduplicator.deduplicate_study_issues(study_id, study_url)
                prioritizer = IssuePrioritizer(self.db)
                await prioritizer.prioritize_study_issues(study_id)
            except Exception as e:
                logger.warning("Issue dedup/prioritization failed (non-fatal): %s", e)

            await self._publish_progress(study_id, 85, "synthesis_complete")

            # --- Phase 6: Heatmaps ---
            await self._generate_heatmaps(study_id, all_steps)
            await self._publish_progress(study_id, 90, "heatmaps_complete")

            # --- Phase 7: Reports ---
            await self._publish_event(study_id, {
                "type": "study:analyzing",
                "study_id": str(study_id),
                "phase": "report",
            })

            await self._generate_reports(
                study_id, study_url, synthesis, session_summaries, task_descriptions
            )
            await self._publish_progress(study_id, 95, "report_complete")

            # --- Phase 8: Complete ---
            total_issues = (
                len(synthesis.universal_issues)
                + len(synthesis.persona_specific_issues)
            )

            study.overall_score = synthesis.overall_ux_score
            study.executive_summary = synthesis.executive_summary
            await self.study_repo.update_status(study_id, StudyStatus.COMPLETE)
            await self.db.commit()

            await self._publish_event(study_id, {
                "type": "study:complete",
                "study_id": str(study_id),
                "score": synthesis.overall_ux_score,
                "issues_count": total_issues,
            })

            logger.info(
                "Study %s complete: score=%d, issues=%d",
                study_id, synthesis.overall_ux_score, total_issues,
            )

            return {
                "study_id": str(study_id),
                "status": "complete",
                "score": synthesis.overall_ux_score,
                "total_issues": total_issues,
                "token_usage": self._llm.usage.to_dict(),
            }

        except asyncio.TimeoutError:
            logger.error("Study %s timed out", study_id)
            await self.study_repo.update_status(study_id, StudyStatus.FAILED)
            await self._publish_event(study_id, {
                "type": "study:error",
                "study_id": str(study_id),
                "error": "Study timed out",
            })
            return {"study_id": str(study_id), "status": "failed", "error": "Timed out"}

        except Exception as e:
            logger.error("Study %s failed: %s", study_id, e, exc_info=True)
            await self.study_repo.update_status(study_id, StudyStatus.FAILED)
            await self._publish_event(study_id, {
                "type": "study:error",
                "study_id": str(study_id),
                "error": str(e),
            })
            return {"study_id": str(study_id), "status": "failed", "error": str(e)}

    # ------------------------------------------------------------------
    # AI Engine: Persona generation
    # ------------------------------------------------------------------

    async def _generate_persona_profiles(self, study: Any) -> list[dict[str, Any]]:
        """Generate full PersonaProfiles for each persona in the study."""
        profiles = []
        for persona in study.personas:
            try:
                template = persona.profile or {}
                if persona.is_custom and template.get("description"):
                    profile = await self._persona_engine.generate_custom(
                        template["description"]
                    )
                elif template:
                    profile = await self._persona_engine.generate_from_template(template)
                else:
                    profile = await self._persona_engine.generate_random()

                profile_dict = profile.model_dump()
                profile_dict["id"] = str(persona.id)
                profile_dict["behavioral_notes"] = PersonaEngine.get_behavioral_modifiers(profile)
                profiles.append(profile_dict)
            except Exception as e:
                logger.error("Failed to generate persona %s: %s", persona.id, e)
        return profiles

    # ------------------------------------------------------------------
    # Site Pre-Crawling
    # ------------------------------------------------------------------

    async def _precrawl_site(self, url: str) -> SiteMap:
        """Pre-crawl the target site to discover pages and build a sitemap."""
        if not self._firecrawl.is_configured:
            logger.info("Firecrawl not configured, skipping pre-crawl")
            return SiteMap(base_url=url, total_pages=0)

        try:
            sitemap = await self._firecrawl.crawl_site(url)
            logger.info(
                "Pre-crawl complete: %d pages discovered for %s",
                sitemap.total_pages, url,
            )
            return sitemap
        except Exception as e:
            logger.warning("Pre-crawl failed (non-fatal): %s", e)
            return SiteMap(base_url=url, total_pages=0)

    # ------------------------------------------------------------------
    # AI Engine: Navigation
    # ------------------------------------------------------------------

    async def _run_navigation_sessions(
        self,
        study_id: uuid.UUID,
        study: Any,
        study_url: str,
        starting_path: str,
        persona_profiles: list[dict[str, Any]],
        pool: BrowserPool,
    ) -> list[NavigationResult]:
        """Run parallel navigation sessions for all persona×task combos."""
        start_url = study_url.rstrip("/")
        if starting_path:
            start_url += "/" + starting_path.lstrip("/")

        max_concurrent = int(os.getenv("MAX_CONCURRENT_SESSIONS", "5"))
        semaphore = asyncio.Semaphore(max_concurrent)
        timeout = int(os.getenv("STUDY_TIMEOUT_SECONDS", "600"))

        # Create StepRecorder for persisting navigation data
        storage = FileStorage(base_path=os.getenv("STORAGE_PATH", "./data"))
        recorder = DatabaseStepRecorder(
            db=self.db,
            redis=self.redis,
            storage=storage,
            study_id=study_id,
        )

        async def run_one(
            session: Any, persona_dict: dict[str, Any], task_desc: str
        ) -> NavigationResult:
            async with semaphore:
                viewport = persona_dict.get("device_preference", "desktop")
                ctx = await pool.acquire(viewport=viewport)
                try:
                    # Update session status
                    session.status = SessionStatus.RUNNING
                    await self.db.commit()

                    result = await self._navigator.navigate_session(
                        session_id=str(session.id),
                        persona=persona_dict,
                        task_description=task_desc,
                        behavioral_notes=persona_dict.get("behavioral_notes", ""),
                        start_url=start_url,
                        browser_context=ctx,
                        recorder=recorder,
                    )

                    # Update session with results
                    if result.error:
                        session.status = SessionStatus.FAILED
                    elif result.gave_up:
                        session.status = SessionStatus.GAVE_UP
                    else:
                        session.status = SessionStatus.COMPLETE
                    session.total_steps = result.total_steps
                    session.task_completed = result.task_completed
                    await self.db.commit()

                    return result
                finally:
                    await pool.release(ctx)

        # Build persona lookup
        persona_map = {p["id"]: p for p in persona_profiles}

        # Create coroutines for all sessions
        coros = []
        for session in study.sessions:
            persona_dict = persona_map.get(str(session.persona_id), {})
            task_desc = ""
            for t in study.tasks:
                if t.id == session.task_id:
                    task_desc = t.description
                    break
            coros.append(run_one(session, persona_dict, task_desc))

        # Run all with global timeout
        results_raw = await asyncio.wait_for(
            asyncio.gather(*coros, return_exceptions=True),
            timeout=timeout,
        )

        nav_results: list[NavigationResult] = []
        for r in results_raw:
            if isinstance(r, NavigationResult):
                nav_results.append(r)
            elif isinstance(r, Exception):
                logger.error("Session failed: %s", r)

        return nav_results

    # ------------------------------------------------------------------
    # AI Engine: Post-session analysis
    # ------------------------------------------------------------------

    async def _run_analysis_pipeline(
        self,
        study_id: uuid.UUID,
        nav_results: list[NavigationResult],
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """Run screenshot analysis on all session results."""
        all_issues: list[dict[str, Any]] = []
        all_steps: list[dict[str, Any]] = []

        for result in nav_results:
            if not result.steps:
                continue

            step_data: list[dict[str, Any]] = []
            for step in result.steps:
                step_dict = {
                    "step_number": step.step_number,
                    "page_url": step.page_url,
                    "page_title": "",
                    "action_type": step.action_type,
                    "think_aloud": step.think_aloud,
                    "task_progress": step.task_progress,
                    "emotional_state": step.emotional_state,
                    "persona_name": result.persona_name,
                }
                step_data.append(step_dict)

            all_steps.extend(step_data)

            try:
                analysis = await self._analyzer.analyze_session(
                    session_id=result.session_id,
                    steps=step_data,
                    persona_context=result.persona_name,
                )
                all_issues.extend(
                    Analyzer.issues_to_dicts(analysis.deduplicated_issues)
                )
            except Exception as e:
                logger.error("Analysis failed for session %s: %s", result.session_id, e)

        return all_issues, all_steps

    # ------------------------------------------------------------------
    # AI Engine: Heatmaps
    # ------------------------------------------------------------------

    async def _generate_heatmaps(
        self,
        study_id: uuid.UUID,
        all_steps: list[dict[str, Any]],
    ) -> None:
        """Generate heatmap PNGs from aggregated click data."""
        page_data = self._heatmap_gen.aggregate_clicks(all_steps)
        storage_path = os.getenv("STORAGE_PATH", "./data")

        for page_url, heatmap_data in page_data.items():
            try:
                heatmap_bytes = self._heatmap_gen.render_heatmap(heatmap_data)
                # Save to filesystem (Agent 1's FileStorage can be used when available)
                import hashlib
                url_hash = hashlib.md5(page_url.encode()).hexdigest()[:12]
                heatmap_dir = f"{storage_path}/studies/{study_id}/heatmaps"
                os.makedirs(heatmap_dir, exist_ok=True)
                heatmap_path = f"{heatmap_dir}/{url_hash}.png"
                with open(heatmap_path, "wb") as f:
                    f.write(heatmap_bytes)
                logger.info("Saved heatmap: %s", heatmap_path)
            except Exception as e:
                logger.error("Heatmap generation failed for %s: %s", page_url, e)

    # ------------------------------------------------------------------
    # AI Engine: Reports
    # ------------------------------------------------------------------

    async def _generate_reports(
        self,
        study_id: uuid.UUID,
        study_url: str,
        synthesis: Any,
        session_summaries: list[dict[str, Any]],
        tasks: list[str],
    ) -> None:
        """Generate Markdown and PDF reports."""
        storage_path = os.getenv("STORAGE_PATH", "./data")
        report_dir = f"{storage_path}/studies/{study_id}"
        os.makedirs(report_dir, exist_ok=True)

        try:
            report = await self._report_builder.generate_report_content(
                study_url=study_url,
                synthesis=synthesis,
                session_summaries=session_summaries,
                tasks=tasks,
            )

            md_content = self._report_builder.render_markdown(
                report, synthesis, session_summaries
            )

            # Save Markdown
            md_path = f"{report_dir}/report.md"
            with open(md_path, "w") as f:
                f.write(md_content)
            logger.info("Saved Markdown report: %s", md_path)

            # Save PDF
            try:
                pdf_bytes = self._report_builder.render_pdf(md_content, study_url)
                pdf_path = f"{report_dir}/report.pdf"
                with open(pdf_path, "wb") as f:
                    f.write(pdf_bytes)
                logger.info("Saved PDF report: %s", pdf_path)
            except Exception as e:
                logger.warning("PDF generation failed (non-fatal): %s", e)

        except Exception as e:
            logger.error("Report generation failed: %s", e)

    # ------------------------------------------------------------------
    # Insight Persistence
    # ------------------------------------------------------------------

    async def _save_insights(
        self,
        study_id: uuid.UUID,
        synthesis: Any,
    ) -> None:
        """Save all synthesis insights to the insights table."""
        rank = 0

        # Universal issues
        for item in synthesis.universal_issues:
            rank += 1
            insight = Insight(
                study_id=study_id,
                type=InsightType.UNIVERSAL,
                title=item.title,
                description=item.description,
                severity=item.severity.value if hasattr(item.severity, "value") else str(item.severity),
                personas_affected=item.personas_affected,
                evidence=item.evidence,
                rank=rank,
            )
            self.db.add(insight)

        # Persona-specific issues
        for item in synthesis.persona_specific_issues:
            rank += 1
            insight = Insight(
                study_id=study_id,
                type=InsightType.PERSONA_SPECIFIC,
                title=item.title,
                description=item.description,
                severity=item.severity.value if hasattr(item.severity, "value") else str(item.severity),
                personas_affected=item.personas_affected,
                evidence=item.evidence,
                rank=rank,
            )
            self.db.add(insight)

        # Comparative insights
        for item in synthesis.comparative_insights:
            rank += 1
            insight = Insight(
                study_id=study_id,
                type=InsightType.COMPARATIVE,
                title=item.title,
                description=item.description,
                severity=item.severity.value if hasattr(item.severity, "value") else str(item.severity),
                personas_affected=item.personas_affected,
                evidence=item.evidence,
                rank=rank,
            )
            self.db.add(insight)

        # Recommendations
        for rec in synthesis.recommendations:
            insight = Insight(
                study_id=study_id,
                type=InsightType.RECOMMENDATION,
                title=rec.title,
                description=rec.description,
                impact=rec.impact,
                effort=rec.effort,
                personas_affected=rec.personas_helped,
                evidence=rec.evidence,
                rank=rec.rank,
            )
            self.db.add(insight)

        await self.db.flush()
        logger.info(
            "Saved %d insights for study %s",
            rank + len(synthesis.recommendations),
            study_id,
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _build_session_summaries(
        nav_results: list[NavigationResult],
    ) -> list[dict[str, Any]]:
        """Build session summary dicts from navigation results."""
        summaries = []
        for result in nav_results:
            emotional_arc = [s.emotional_state for s in result.steps]
            key_struggles = [
                s.think_aloud[:100]
                for s in result.steps
                if s.emotional_state in ("confused", "frustrated")
            ]
            summaries.append({
                "persona_name": result.persona_name,
                "session_id": result.session_id,
                "task_completed": result.task_completed,
                "total_steps": result.total_steps,
                "gave_up": result.gave_up,
                "emotional_arc": emotional_arc,
                "key_struggles": key_struggles[:5],
                "summary": (
                    f"{result.persona_name} "
                    f"{'completed' if result.task_completed else 'did not complete'} "
                    f"the task in {result.total_steps} steps."
                ),
                "overall_difficulty": (
                    "easy" if result.total_steps <= 8 else
                    "moderate" if result.total_steps <= 18 else
                    "difficult"
                ),
            })
        return summaries

    async def update_progress(self, study_id: uuid.UUID):
        """Aggregate session progress into study-level progress."""
        sessions = await self.session_repo.list_sessions(study_id)
        if not sessions:
            return

        total = len(sessions)
        completed = sum(
            1 for s in sessions if s.status in (SessionStatus.COMPLETE, SessionStatus.GAVE_UP)
        )
        failed = sum(1 for s in sessions if s.status == SessionStatus.FAILED)

        percent = ((completed + failed) / total) * 70  # 70% for navigation, 30% for analysis
        await self._publish_progress(study_id, percent, "navigating")

    async def _publish_progress(self, study_id: uuid.UUID, percent: float, phase: str):
        """Publish study progress to Redis."""
        await self.redis.set(f"study:{study_id}:progress", str(percent))
        await self._publish_event(study_id, {
            "type": "study:progress",
            "study_id": str(study_id),
            "percent": percent,
            "phase": phase,
        })

    async def _publish_event(self, study_id: uuid.UUID, event: dict):
        """Publish an event to the Redis PubSub channel for this study."""
        channel = f"study:{study_id}"
        await self.redis.publish(channel, json.dumps(event))
