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
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.browser.actions import BrowserActions
from app.browser.pool import BrowserPool
from app.browser.screencast import CDPScreencastManager
from app.browser.screenshots import ScreenshotService
from app.config import settings
from app.core.accessibility_auditor import AccessibilityAuditor
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
from app.llm.schemas import AccessibilityNeeds, PersonaProfile
from app.models.insight import Insight, InsightType
from app.models.session import SessionStatus
from app.models.study import StudyStatus
from app.services.cost_estimator import CostTracker
from app.services.fix_service import FixService
from app.services.live_session_state import LiveSessionStateStore
from app.storage.file_storage import FileStorage

logger = logging.getLogger(__name__)


class StudyOrchestrator:
    """Manages the lifecycle of a study run.

    Integrates Agent 1's infrastructure (DB, Redis, storage) with
    Agent 2's AI engine (navigation, analysis, synthesis, reporting).
    """

    def __init__(
        self,
        db: AsyncSession,
        redis: aioredis.Redis,
        db_factory: async_sessionmaker[AsyncSession] | None = None,
        browser_mode: str | None = None,
    ):
        self.db = db
        self.redis = redis
        self.db_factory = db_factory
        self._browser_mode = browser_mode
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
        self._accessibility_auditor = AccessibilityAuditor(self._llm)
        self._heatmap_gen = HeatmapGenerator()
        self._report_builder = ReportBuilder(self._llm)
        self._firecrawl = FirecrawlClient()

        # Fast LLM client for small studies (uses Sonnet for synthesis + reports)
        from app.llm.client import SONNET_MODEL
        self._fast_llm = LLMClient(stage_model_overrides={
            "synthesis": SONNET_MODEL,
            "report_generation": SONNET_MODEL,
        })
        self._fast_synthesizer = Synthesizer(self._fast_llm)
        self._fast_report_builder = ReportBuilder(self._fast_llm)

        # Browser pool (initialized lazily)
        self._pool: BrowserPool | None = None

        # Cost tracking (Iteration 4)
        self._cost_tracker = CostTracker()

    async def _ensure_browser_pool(self) -> BrowserPool:
        """Initialize browser pool if not already done."""
        if self._pool is None:
            max_ctx = int(os.getenv("MAX_CONCURRENT_SESSIONS", "5"))
            force_local = self._browser_mode == "local"
            self._pool = BrowserPool(max_contexts=max_ctx, force_local=force_local, redis=self.redis)
            logger.info("Initializing browser pool (mode=%s)...", self._browser_mode or "auto")
            await self._pool.initialize()

            # Log browser pool mode for observability
            if self._pool.is_cloud:
                logger.info("Study using cloud browser mode (Browserbase)")
            else:
                logger.info(
                    "Study using local browser mode (instances=%d)",
                    self._pool.stats.browser_instances,
                )
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

        # Configure Langfuse session context so all LLM calls group under this study
        self._llm.set_langfuse_context(
            session_id=str(study_id),
            tags=["study-run"],
        )
        self._fast_llm.set_langfuse_context(
            session_id=str(study_id),
            tags=["study-run", "fast-model"],
        )

        try:
            # --- Phase 1: Setup ---
            await self.study_repo.update_status(study_id, StudyStatus.RUNNING)
            await LiveSessionStateStore(self.redis).clear_study(str(study_id))
            await self._publish_progress(study_id, 5, "starting")

            study_url = study.url
            starting_path = study.starting_path or ""

            # --- Phase 1b: Parallel setup (browser + personas + sitemap) ---
            # Run browser init, persona generation, and Firecrawl concurrently
            # to eliminate sequential delays (saves 10-25 seconds)
            await self._publish_progress(study_id, 6, "provisioning_browser")

            pool_task = asyncio.create_task(self._ensure_browser_pool())
            persona_task = asyncio.create_task(
                self._generate_persona_profiles(study)
            )
            sitemap_task = asyncio.create_task(
                self._precrawl_site_cached(study_url)
            )

            # Wait for browser + personas (required for navigation)
            pool, persona_profiles = await asyncio.gather(
                pool_task, persona_task
            )
            await self._publish_progress(study_id, 12, "personas_ready")

            # Sitemap is optional — don't block navigation on it.
            # If it's already done, great; otherwise navigation starts without it
            # and we inject the sitemap context later.
            sitemap: SiteMap | None = None
            if sitemap_task.done():
                sitemap = sitemap_task.result()
                await self._publish_progress(study_id, 15, "sitemap_ready")
            else:
                logger.info(
                    "Firecrawl still running — starting navigation without sitemap"
                )

            # --- Phase 3: Parallel navigation ---
            await self._publish_progress(study_id, 15, "navigating")
            nav_results = await self._run_navigation_sessions(
                study_id=study_id,
                study=study,
                study_url=study_url,
                starting_path=starting_path,
                persona_profiles=persona_profiles,
                pool=pool,
            )

            # Cancel sitemap task if still running (navigation is done)
            if not sitemap_task.done():
                sitemap_task.cancel()
                logger.info("Cancelled pending Firecrawl task (navigation complete)")
            if not nav_results:
                raise RuntimeError(
                    "No navigation sessions completed. Browserbase may be rate-limited."
                )
            await self._publish_progress(study_id, 60, "navigation_complete")

            # --- Phase 4: Analysis + Heatmaps (parallel) ---
            await self.study_repo.update_status(study_id, StudyStatus.ANALYZING)
            await self._publish_progress(study_id, 65, "analyzing")

            # Determine if this is a small study (use faster models)
            is_small_study = len(nav_results) <= 2
            synthesizer = self._fast_synthesizer if is_small_study else self._synthesizer
            report_builder = self._fast_report_builder if is_small_study else self._report_builder
            if is_small_study:
                logger.info("Small study (%d sessions) — using Sonnet for synthesis + report", len(nav_results))

            session_summaries = self._build_session_summaries(nav_results)
            task_descriptions = [t.description for t in study.tasks]

            # Run analysis + a11y audit + heatmap prep in parallel
            analysis_task = asyncio.create_task(
                self._run_analysis_pipeline(study_id, nav_results)
            )
            a11y_task = asyncio.create_task(
                self._run_accessibility_audit(study_id, nav_results)
            )
            all_issues_steps, a11y_report = await asyncio.gather(
                analysis_task, a11y_task
            )
            all_issues, all_steps = all_issues_steps

            if a11y_report and a11y_report.get("visual_issues"):
                for vi in a11y_report["visual_issues"]:
                    all_issues.append({
                        "description": vi.get("description", ""),
                        "severity": vi.get("severity", "minor"),
                        "page_url": vi.get("page_url", ""),
                        "element": vi.get("element", "Accessibility"),
                        "heuristic": "Accessibility",
                        "recommendation": vi.get("recommendation", ""),
                        "wcag_criterion": vi.get("wcag_criterion", ""),
                    })

            await self._publish_progress(study_id, 75, "analysis_complete")

            # --- Phase 5: Synthesis + Heatmaps (parallel) ---
            await self._publish_event(study_id, {
                "type": "study:analyzing",
                "study_id": str(study_id),
                "phase": "synthesis",
            })

            # Run synthesis and heatmaps in parallel (heatmaps don't need synthesis)
            synthesis_coro = synthesizer.synthesize(
                study_url=study_url,
                tasks=task_descriptions,
                session_summaries=session_summaries,
                all_issues=all_issues,
                extended_thinking=not is_small_study,
                thinking_budget_tokens=5000 if is_small_study else 10000,
            )
            heatmap_coro = self._generate_heatmaps(study_id, all_steps)

            synthesis, _ = await asyncio.gather(synthesis_coro, heatmap_coro)

            await self._publish_progress(study_id, 85, "synthesis_complete")

            # --- Phase 6: Report + Insights + Dedup (parallel) ---
            await self._publish_event(study_id, {
                "type": "study:analyzing",
                "study_id": str(study_id),
                "phase": "report",
            })

            async def _post_synthesis_tasks() -> None:
                """Save insights + dedup. Fix suggestions are generated on-demand."""
                await self._save_insights(study_id, synthesis)
                try:
                    deduplicator = IssueDeduplicator(self.db)
                    await deduplicator.deduplicate_study_issues(study_id, study_url)
                    prioritizer = IssuePrioritizer(self.db)
                    await prioritizer.prioritize_study_issues(study_id)
                except Exception as e:
                    logger.warning("Issue dedup/prioritization failed (non-fatal): %s", e)

            # Run report generation and post-synthesis DB tasks in parallel
            if is_small_study:
                # Build report directly from synthesis (no LLM call — instant)
                report_content = ReportBuilder.build_report_from_synthesis(
                    study_url, synthesis, session_summaries, task_descriptions
                )
                report_coro = self._save_report(
                    study_id, study_url, synthesis, session_summaries, report_content
                )
            else:
                report_coro = self._generate_reports_with_builder(
                    study_id, study_url, synthesis, session_summaries, task_descriptions, report_builder
                )

            await asyncio.gather(report_coro, _post_synthesis_tasks())

            await self._publish_progress(study_id, 95, "report_complete")

            # --- Phase 8: Complete ---
            total_issues = (
                len(synthesis.universal_issues)
                + len(synthesis.persona_specific_issues)
            )

            study.overall_score = synthesis.overall_ux_score
            study.executive_summary = synthesis.executive_summary

            # Persist cost breakdown to study record
            cost_breakdown = self._cost_tracker.get_breakdown()
            study.llm_input_tokens = cost_breakdown.llm_input_tokens
            study.llm_output_tokens = cost_breakdown.llm_output_tokens
            study.llm_total_tokens = cost_breakdown.llm_total_tokens
            study.llm_api_calls = cost_breakdown.llm_api_calls
            study.llm_cost_usd = cost_breakdown.llm_cost_usd
            study.browser_mode = cost_breakdown.browser_mode
            study.browser_cost_usd = cost_breakdown.browser_cost_usd
            study.total_cost_usd = cost_breakdown.total_cost_usd

            await self.study_repo.update_status(study_id, StudyStatus.COMPLETE)
            await self.db.commit()

            await self._publish_event(study_id, {
                "type": "study:complete",
                "study_id": str(study_id),
                "score": synthesis.overall_ux_score,
                "issues_count": total_issues,
                "cost": cost_breakdown.model_dump(),
            })

            # Push study scores to Langfuse for evals/monitoring
            self._llm.push_study_scores(
                trace_name="study-complete",
                scores={
                    "overall_ux_score": synthesis.overall_ux_score,
                    "task_completion_rate": (
                        sum(1 for r in nav_results if r.task_completed)
                        / max(len(nav_results), 1)
                    ),
                    "total_issues": total_issues,
                    "total_cost_usd": cost_breakdown.total_cost_usd,
                    "sessions_completed": sum(1 for r in nav_results if r.task_completed),
                    "sessions_gave_up": sum(1 for r in nav_results if r.gave_up),
                    "total_steps": sum(r.total_steps for r in nav_results),
                },
            )

            logger.info(
                "Study %s complete: score=%d, issues=%d, cost=$%.4f (savings=$%.4f)",
                study_id, synthesis.overall_ux_score, total_issues,
                cost_breakdown.total_cost_usd, cost_breakdown.savings_vs_cloud_usd,
            )

            return {
                "study_id": str(study_id),
                "status": "complete",
                "score": synthesis.overall_ux_score,
                "total_issues": total_issues,
                "token_usage": self._llm.usage.to_dict(),
                "cost": cost_breakdown.model_dump(),
            }

        except asyncio.TimeoutError:
            logger.error("Study %s timed out", study_id)
            await self.study_repo.update_status(study_id, StudyStatus.FAILED)
            self._llm.push_study_scores(
                trace_name="study-failed",
                scores={"study_failed": 1.0, "failure_reason": "timeout"},
            )
            await self._publish_event(study_id, {
                "type": "study:error",
                "study_id": str(study_id),
                "error": "Study timed out",
            })
            return {"study_id": str(study_id), "status": "failed", "error": "Timed out"}

        except Exception as e:
            logger.error("Study %s failed: %s", study_id, e, exc_info=True)
            await self.study_repo.update_status(study_id, StudyStatus.FAILED)
            self._llm.push_study_scores(
                trace_name="study-failed",
                scores={"study_failed": 1.0, "failure_reason": str(e)[:200]},
            )
            await self._publish_event(study_id, {
                "type": "study:error",
                "study_id": str(study_id),
                "error": str(e),
            })
            return {"study_id": str(study_id), "status": "failed", "error": str(e)}

        finally:
            # Ensure all Langfuse events are flushed regardless of outcome
            self._llm.flush_langfuse()
            self._fast_llm.flush_langfuse()

    # ------------------------------------------------------------------
    # AI Engine: Persona generation
    # ------------------------------------------------------------------

    async def _generate_persona_profiles(self, study: Any) -> list[dict[str, Any]]:
        """Generate full PersonaProfiles for each persona in the study.

        Builds PersonaProfile directly from template data to skip the expensive
        LLM call (~19s per persona via Opus). Falls back to LLM generation only
        for custom personas with only a description.
        """
        profiles = []
        for persona in study.personas:
            try:
                template = persona.profile or {}

                # Custom personas with only a description require LLM generation
                if persona.is_custom and template.get("description"):
                    profile = await self._persona_engine.generate_custom(
                        template["description"]
                    )
                elif template and template.get("name"):
                    profile = self._build_profile_from_template(template)
                    logger.info(
                        "Persona %s built from template (LLM skipped)",
                        persona.id,
                    )
                else:
                    profile = await self._persona_engine.generate_random()

                profile_dict = profile.model_dump()
                profile_dict["id"] = str(persona.id)
                profile_dict["behavioral_notes"] = PersonaEngine.get_behavioral_modifiers(profile)
                profiles.append(profile_dict)
            except Exception as e:
                logger.error("Failed to generate persona %s: %s", persona.id, e)
                # Create a minimal fallback profile instead of skipping
                fallback = {
                    "id": str(persona.id),
                    "name": template.get("name", f"Tester {str(persona.id)[:8]}"),
                    "age": template.get("age", 30),
                    "occupation": template.get("occupation", "General user"),
                    "tech_literacy": 5,
                    "patience_level": 5,
                    "reading_speed": 5,
                    "trust_level": 5,
                    "exploration_tendency": 5,
                    "device_preference": "desktop",
                    "frustration_triggers": [],
                    "goals": [],
                    "background": "A general user testing the website.",
                    "behavioral_notes": "",
                }
                profiles.append(fallback)
        return profiles

    @staticmethod
    def _build_profile_from_template(t: dict[str, Any]) -> PersonaProfile:
        """Convert a template dict (string values) into a PersonaProfile (int values).

        Templates use strings like 'high'/'low' for behavioral attributes,
        while PersonaProfile expects 1-10 integers. This avoids an Opus API call.
        """
        LEVEL_MAP = {"low": 2, "moderate": 5, "medium": 5, "high": 8}
        READING_MAP = {"skims": 2, "scans": 3, "moderate": 5, "thorough": 8, "careful": 8}

        def to_int(val: Any, mapping: dict[str, int], default: int = 5) -> int:
            if isinstance(val, int):
                return max(1, min(10, val))
            if isinstance(val, str):
                return mapping.get(val.lower(), default)
            return default

        # Convert accessibility_needs from list/dict/etc to AccessibilityNeeds
        acc_raw = t.get("accessibility_needs", {})
        if isinstance(acc_raw, list):
            acc = AccessibilityNeeds()
        elif isinstance(acc_raw, dict):
            acc = AccessibilityNeeds(**acc_raw)
        else:
            acc = AccessibilityNeeds()

        return PersonaProfile(
            name=t.get("name", "Tester"),
            age=t.get("age", 30),
            occupation=t.get("occupation", "General user"),
            emoji=t.get("emoji", "🧑"),
            short_description=t.get("short_description", f"{t.get('name', 'Tester')}, {t.get('age', 30)}, {t.get('occupation', 'user')}"),
            background=t.get("background", f"{t.get('name', 'Tester')} is a {t.get('age', 30)}-year-old {t.get('occupation', 'user')}."),
            tech_literacy=to_int(t.get("tech_literacy"), LEVEL_MAP),
            patience_level=to_int(t.get("patience_level"), LEVEL_MAP),
            reading_speed=to_int(t.get("reading_speed"), {**READING_MAP, **LEVEL_MAP}),
            trust_level=to_int(t.get("trust_level"), LEVEL_MAP),
            exploration_tendency=to_int(t.get("exploration_tendency"), LEVEL_MAP, 5),
            device_preference=t.get("device_preference", "desktop"),
            frustration_triggers=t.get("frustration_triggers", []),
            goals=t.get("goals", []),
            accessibility_needs=acc,
        )

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

    async def _precrawl_site_cached(self, url: str) -> SiteMap:
        """Pre-crawl with Redis cache (24h TTL per domain).

        Avoids re-crawling the same domain on repeat tests, saving 5-15s.
        """
        from urllib.parse import urlparse

        domain = urlparse(url).netloc
        cache_key = f"firecrawl:sitemap:{domain}"

        # Check cache first
        try:
            cached = await self.redis.get(cache_key)
            if cached:
                logger.info("Firecrawl cache hit for %s", domain)
                return SiteMap.model_validate_json(cached)
        except Exception as e:
            logger.debug("Cache read failed (non-fatal): %s", e)

        # Cache miss — crawl
        sitemap = await self._precrawl_site(url)

        # Store in cache with 24h TTL
        if sitemap.total_pages > 0:
            try:
                await self.redis.setex(
                    cache_key,
                    86400,  # 24 hours
                    sitemap.model_dump_json(),
                )
                logger.info("Cached Firecrawl sitemap for %s (%d pages)", domain, sitemap.total_pages)
            except Exception as e:
                logger.debug("Cache write failed (non-fatal): %s", e)

        return sitemap

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
        session_timeout = getattr(settings, "SESSION_TIMEOUT_SECONDS", 120)

        storage = FileStorage(base_path=os.getenv("STORAGE_PATH", "./data"))
        state_store = LiveSessionStateStore(self.redis)

        async def run_one(
            session: Any, persona_dict: dict[str, Any], task_desc: str
        ) -> NavigationResult:
            async with semaphore:
                viewport = persona_dict.get("device_preference", "desktop")
                session_id = str(session.id)
                persona_name = persona_dict.get("name", "Unknown")
                browser_session = await pool.acquire(viewport=viewport)
                result: NavigationResult | None = None
                screencast: CDPScreencastManager | None = None
                try:
                    await state_store.upsert(
                        study_id=str(study_id),
                        session_id=session_id,
                        updates={
                            "persona_name": persona_name,
                            "live_view_url": browser_session.live_view_url,
                            "browser_active": True,
                            "completed": False,
                            "step_number": 0,
                            "total_steps": 0,
                        },
                    )

                    # Publish live view URL if available (Browserbase mode)
                    if browser_session.live_view_url:
                        logger.info(
                            "[live-view] URL available at session start: study=%s session=%s",
                            study_id,
                            session_id,
                        )
                        await self._publish_event(study_id, {
                            "type": "session:live_view",
                            "session_id": session_id,
                            "persona_name": persona_name,
                            "live_view_url": browser_session.live_view_url,
                        })
                    else:
                        logger.warning(
                            (
                                "[live-view] URL missing at session start; "
                                "frontend will rely on durable updates: study=%s session=%s"
                            ),
                            study_id,
                            session_id,
                        )

                    # Start CDP screencast for local mode
                    if (
                        settings.ENABLE_SCREENCAST
                        and not pool.is_cloud
                    ):
                        screencast = CDPScreencastManager(session_id=session_id)
                        await self._publish_event(study_id, {
                            "type": "session:screencast_started",
                            "session_id": session_id,
                            "persona_name": persona_name,
                        })
                        await state_store.upsert(
                            study_id=str(study_id),
                            session_id=session_id,
                            updates={"screencast_available": True},
                        )

                    # Each persona gets its own DB session to avoid
                    # concurrent transaction corruption in asyncio.gather()
                    async with self.db_factory() as persona_db:
                        recorder = DatabaseStepRecorder(
                            db=persona_db,
                            redis=self.redis,
                            storage=storage,
                            study_id=study_id,
                            live_view_url=browser_session.live_view_url,
                            state_store=state_store,
                        )

                        # Update session status
                        db_session = await persona_db.get(
                            type(session), session.id
                        )
                        db_session.status = SessionStatus.RUNNING
                        await persona_db.commit()

                        result = await self._navigator.navigate_session(
                            session_id=session_id,
                            persona=persona_dict,
                            task_description=task_desc,
                            behavioral_notes=persona_dict.get("behavioral_notes", ""),
                            start_url=start_url,
                            browser_context=browser_session.context,
                            recorder=recorder,
                            screencast=screencast,
                            session_timeout=session_timeout,
                        )

                        # Notify frontend if hybrid failover is active
                        if pool.is_failover_active:
                            await self._publish_event(study_id, {
                                "type": "session:browser_failover",
                                "session_id": session_id,
                                "persona_name": persona_name,
                                "message": "Switched to cloud browser due to local crashes",
                            })

                        # Update session with results
                        db_session = await persona_db.get(
                            type(session), session.id
                        )
                        if result.error:
                            db_session.status = SessionStatus.FAILED
                        elif result.gave_up:
                            db_session.status = SessionStatus.GAVE_UP
                        else:
                            db_session.status = SessionStatus.COMPLETE
                        db_session.total_steps = result.total_steps
                        db_session.task_completed = result.task_completed
                        await persona_db.commit()

                        await state_store.upsert(
                            study_id=str(study_id),
                            session_id=session_id,
                            updates={
                                "completed": True,
                                "total_steps": result.total_steps,
                            },
                        )

                        return result
                finally:
                    # Stop screencast before releasing browser
                    if screencast is not None:
                        try:
                            await screencast.stop()
                        except Exception as e:
                            logger.debug("Screencast stop error (non-fatal): %s", e)

                    await state_store.upsert(
                        study_id=str(study_id),
                        session_id=session_id,
                        updates={
                            "browser_active": False,
                            "completed": True if result else None,
                            "total_steps": result.total_steps if result else None,
                        },
                    )

                    # Notify frontend that browser is closing
                    await self._publish_event(study_id, {
                        "type": "session:browser_closed",
                        "session_id": session_id,
                    })
                    await pool.release(browser_session)

        # Build persona lookup
        persona_map = {p["id"]: p for p in persona_profiles}

        # Create coroutines for all sessions
        coros = []
        for session in study.sessions:
            persona_dict = persona_map.get(str(session.persona_id), {})
            if not persona_dict:
                logger.warning(
                    "No persona profile found for session %s (persona_id=%s). "
                    "Persona map keys: %s",
                    session.id, session.persona_id, list(persona_map.keys()),
                )
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

        # --- Flow analysis (Feature 1c) ---
        try:
            storage_path = os.getenv("STORAGE_PATH", "./data")
            for result in nav_results:
                if not result.steps or len(result.steps) < 2:
                    continue
                step_data_with_screenshots: list[dict[str, Any]] = []
                for step in result.steps:
                    screenshot_bytes: bytes | None = None
                    if step.screenshot_path:
                        full_path = os.path.join(storage_path, step.screenshot_path)
                        if os.path.exists(full_path):
                            with open(full_path, "rb") as f:
                                screenshot_bytes = f.read()
                    step_data_with_screenshots.append({
                        "step_number": step.step_number,
                        "page_url": step.page_url,
                        "page_title": step.page_title,
                        "action_type": step.action_type,
                        "think_aloud": step.think_aloud,
                        "task_progress": step.task_progress,
                        "emotional_state": step.emotional_state,
                        "screenshot_bytes": screenshot_bytes,
                    })
                flow_analyses = await self._analyzer.analyze_flows(
                    step_data_with_screenshots, result.persona_name
                )
                # Convert flow transition issues to regular issues for synthesis
                for fa in flow_analyses:
                    for ti in fa.transition_issues:
                        all_issues.append({
                            "description": ti.description,
                            "severity": ti.severity.value if hasattr(ti.severity, "value") else str(ti.severity),
                            "page_url": ti.from_page,
                            "element": f"Transition: {ti.from_page} → {ti.to_page}",
                            "heuristic": ti.heuristic,
                            "recommendation": ti.recommendation,
                            "flow_name": fa.flow_name,
                        })
        except Exception as e:
            logger.warning("Flow analysis failed (non-fatal): %s", e)

        return all_issues, all_steps

    # ------------------------------------------------------------------
    # AI Engine: Accessibility Audit
    # ------------------------------------------------------------------

    async def _run_accessibility_audit(
        self,
        study_id: uuid.UUID,
        nav_results: list[NavigationResult],
    ) -> dict[str, Any] | None:
        """Run deep accessibility audit on unique pages from navigation results.

        Collects unique page screenshots from all sessions and runs the
        accessibility auditor on each. Results are aggregated into a
        compliance report. This is non-fatal; failures are logged as warnings.

        Returns:
            Compliance report dict, or None if the audit could not run.
        """
        try:
            storage_path = os.getenv("STORAGE_PATH", "./data")
            seen_urls: set[str] = set()
            audits = []

            for result in nav_results:
                if not result.steps:
                    continue
                for step in result.steps:
                    page_url = step.page_url
                    if not page_url or page_url in seen_urls:
                        continue
                    seen_urls.add(page_url)

                    # Load screenshot from disk
                    if not step.screenshot_path:
                        continue
                    full_path = os.path.join(storage_path, step.screenshot_path)
                    if not os.path.exists(full_path):
                        continue
                    with open(full_path, "rb") as f:
                        screenshot_bytes = f.read()

                    try:
                        audit = await self._accessibility_auditor.audit_page(
                            screenshot=screenshot_bytes,
                            a11y_tree="",  # a11y tree not persisted during navigation
                            page_url=page_url,
                            page_title=step.page_title or "",
                        )
                        audits.append(audit)
                    except Exception as e:
                        logger.warning(
                            "Accessibility audit failed for %s (non-fatal): %s",
                            page_url, e,
                        )

            if not audits:
                logger.info("No pages audited for accessibility in study %s", study_id)
                return None

            report = await self._accessibility_auditor.generate_compliance_report(audits)
            logger.info(
                "Accessibility audit complete for study %s: %d pages, %.1f%% compliant",
                study_id, report.get("total_pages", 0),
                report.get("overall_compliance_percentage", 0.0),
            )

            # Persist report to filesystem
            report_dir = f"{storage_path}/studies/{study_id}"
            os.makedirs(report_dir, exist_ok=True)
            a11y_path = f"{report_dir}/accessibility_report.json"
            with open(a11y_path, "w") as f:
                json.dump(report, f, indent=2)
            logger.info("Saved accessibility report: %s", a11y_path)

            return report

        except Exception as e:
            logger.warning("Accessibility audit failed (non-fatal): %s", e)
            return None

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
        await self._generate_reports_with_builder(
            study_id, study_url, synthesis, session_summaries, tasks, self._report_builder
        )

    async def _save_report(
        self,
        study_id: uuid.UUID,
        study_url: str,
        synthesis: Any,
        session_summaries: list[dict[str, Any]],
        report_content: Any,
    ) -> None:
        """Save a pre-built report to disk (no LLM call)."""
        storage_path = os.getenv("STORAGE_PATH", "./data")
        report_dir = f"{storage_path}/studies/{study_id}"
        os.makedirs(report_dir, exist_ok=True)

        try:
            md_content = self._report_builder.render_markdown(
                report_content, synthesis, session_summaries
            )
            md_path = f"{report_dir}/report.md"
            with open(md_path, "w") as f:
                f.write(md_content)
            logger.info("Saved Markdown report (template): %s", md_path)

            try:
                pdf_bytes = self._report_builder.render_pdf(md_content, study_url)
                pdf_path = f"{report_dir}/report.pdf"
                with open(pdf_path, "wb") as f:
                    f.write(pdf_bytes)
                logger.info("Saved PDF report: %s", pdf_path)
            except Exception as e:
                logger.warning("PDF generation failed (non-fatal): %s", e)
        except Exception as e:
            logger.error("Report save failed: %s", e)

    async def _generate_reports_with_builder(
        self,
        study_id: uuid.UUID,
        study_url: str,
        synthesis: Any,
        session_summaries: list[dict[str, Any]],
        tasks: list[str],
        builder: ReportBuilder,
    ) -> None:
        """Generate Markdown and PDF reports using the given builder."""
        storage_path = os.getenv("STORAGE_PATH", "./data")
        report_dir = f"{storage_path}/studies/{study_id}"
        os.makedirs(report_dir, exist_ok=True)

        try:
            report = await builder.generate_report_content(
                study_url=study_url,
                synthesis=synthesis,
                session_summaries=session_summaries,
                tasks=tasks,
            )

            md_content = builder.render_markdown(
                report, synthesis, session_summaries
            )

            # Save Markdown
            md_path = f"{report_dir}/report.md"
            with open(md_path, "w") as f:
                f.write(md_content)
            logger.info("Saved Markdown report: %s", md_path)

            # Save PDF
            try:
                pdf_bytes = builder.render_pdf(md_content, study_url)
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
