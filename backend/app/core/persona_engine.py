"""Persona generation and behavioral modeling engine."""

from __future__ import annotations

import logging
from typing import Any

from app.llm.client import LLMClient
from app.llm.schemas import PersonaProfile

logger = logging.getLogger(__name__)


class PersonaEngine:
    """Generates full persona profiles and derives behavioral modifiers."""

    def __init__(self, llm_client: LLMClient) -> None:
        self._llm = llm_client

    async def generate_from_template(
        self, template: dict[str, Any]
    ) -> PersonaProfile:
        """Hydrate a persona template into a full PersonaProfile via LLM."""
        logger.info("Generating persona from template: %s", template.get("name", "?"))
        profile = await self._llm.generate_persona_from_template(template)
        profile.behavioral_notes = self.get_behavioral_modifiers(profile)
        return profile

    async def generate_custom(self, description: str) -> PersonaProfile:
        """Generate a persona from a natural language description via Opus."""
        logger.info("Generating custom persona from description: %s...", description[:60])
        profile = await self._llm.generate_persona_from_description(description)
        profile.behavioral_notes = self.get_behavioral_modifiers(profile)
        return profile

    async def generate_random(self) -> PersonaProfile:
        """Generate a random diverse persona."""
        profile = await self._llm.generate_persona()
        profile.behavioral_notes = self.get_behavioral_modifiers(profile)
        return profile

    @staticmethod
    def get_behavioral_modifiers(persona: PersonaProfile) -> str:
        """Translate persona attributes into concrete behavioral rules.

        These rules are injected into the navigation prompt so the LLM
        simulates the persona's web browsing behavior accurately.
        """
        rules: list[str] = []

        # Tech literacy
        tl = persona.tech_literacy
        if tl <= 3:
            rules.append(
                "LOW TECH LITERACY: You read every label carefully. Icons without "
                "text labels confuse you. You don't understand technical jargon. "
                "You look for familiar patterns (blue underlined links, big buttons). "
                "Dropdown menus and hamburger icons are not obvious to you."
            )
        elif tl <= 6:
            rules.append(
                "MODERATE TECH LITERACY: You understand common web patterns but may "
                "struggle with advanced features. You prefer clear labels over icons."
            )
        else:
            rules.append(
                "HIGH TECH LITERACY: You quickly scan pages for key actions. You "
                "understand icons, shortcuts, and advanced UI patterns. You may "
                "skip tutorials and onboarding steps. You notice developer-facing "
                "issues like slow load times and broken layouts."
            )

        # Patience
        pl = persona.patience_level
        if pl <= 3:
            rules.append(
                "LOW PATIENCE: You get frustrated quickly. After 2-3 failed "
                "attempts you consider giving up. Loading delays annoy you. "
                "Long forms or multi-step processes feel like too much work."
            )
        elif pl <= 6:
            rules.append(
                "MODERATE PATIENCE: You'll retry a couple times but get frustrated "
                "if things don't work after a reasonable effort."
            )
        else:
            rules.append(
                "HIGH PATIENCE: You are persistent and methodical. You'll try "
                "multiple approaches before giving up. You carefully read error "
                "messages and instructions."
            )

        # Reading speed
        rs = persona.reading_speed
        if rs <= 3:
            rules.append(
                "SKIMMER: You barely read body text. You scan for headings, "
                "buttons, and links. You may miss important instructions or "
                "warnings that are in paragraph text."
            )
        elif rs <= 6:
            rules.append(
                "MODERATE READER: You read headings and key text but may skip "
                "longer paragraphs. You notice bold text and callouts."
            )
        else:
            rules.append(
                "THOROUGH READER: You read everything on the page — every label, "
                "every description, every footnote. This means you catch things "
                "others miss, but you're also slower."
            )

        # Trust level
        trust = persona.trust_level
        if trust <= 3:
            rules.append(
                "SKEPTICAL: You hesitate before entering personal information. "
                "You look for privacy policies and trust signals. Required phone "
                "number fields feel invasive. You're wary of email signups."
            )
        elif trust <= 6:
            rules.append(
                "MODERATE TRUST: You'll provide basic information but pause at "
                "sensitive fields. You notice when sites ask for more data than "
                "seems necessary."
            )
        else:
            rules.append(
                "TRUSTING: You generally fill out forms without hesitation. You "
                "don't worry much about privacy or data collection. You click "
                "CTAs readily."
            )

        # Exploration tendency
        et = persona.exploration_tendency
        if et <= 3:
            rules.append(
                "TASK-FOCUSED: You go straight for the goal. You ignore side "
                "content, navigation menus, and promotional banners. You take "
                "the most direct path."
            )
        elif et <= 6:
            rules.append(
                "MODERATE EXPLORER: You mostly stay on task but may notice "
                "interesting side content. You glance at navigation menus."
            )
        else:
            rules.append(
                "EXPLORER: You browse around before committing to an action. "
                "You check navigation menus, footer links, about pages. You "
                "like to understand the full site before completing a task."
            )

        # Accessibility needs
        acc = persona.accessibility_needs
        if acc.low_vision:
            rules.append(
                "LOW VISION: Small text is hard to read. You depend on high "
                "contrast. You may zoom in. Low-contrast text is invisible to you."
            )
        if acc.screen_reader:
            rules.append(
                "SCREEN READER USER: You rely on headings, ARIA labels, and "
                "semantic HTML. Unlabeled buttons and images are meaningless. "
                "Focus order matters greatly."
            )
        if acc.color_blind:
            # Provide specific color confusion pairs based on the type noted in
            # the accessibility_needs description (from template data).
            cb_detail = ""
            desc = (acc.description or "").lower()
            if "deuteranopia" in desc:
                cb_detail = (
                    " You have deuteranopia (red-green, green-deficient). "
                    "You confuse: red↔green, green↔brown, orange↔green, "
                    "and light green↔yellow. Red and green look like muddy "
                    "yellow/brown to you."
                )
            elif "protanopia" in desc:
                cb_detail = (
                    " You have protanopia (red-green, red-deficient). "
                    "You confuse: red↔dark brown/black, red↔green, "
                    "orange↔dark yellow, and purple↔blue. Red appears very "
                    "dark or nearly black to you."
                )
            elif "tritanopia" in desc:
                cb_detail = (
                    " You have tritanopia (blue-yellow). "
                    "You confuse: blue↔green, yellow↔violet, "
                    "orange↔pink, and light blue↔grey. Blues and greens "
                    "look very similar to you."
                )
            rules.append(
                "COLOR BLIND: Color-only indicators (red for error, green for "
                "success) don't work for you. You need text or icon alternatives."
                + cb_detail
            )
        if acc.motor_impairment:
            rules.append(
                "MOTOR IMPAIRMENT: Small click targets are difficult. You need "
                "generous spacing. Hover-only interactions are inaccessible. "
                "Drag-and-drop is very hard."
            )
        if acc.cognitive:
            rules.append(
                "COGNITIVE ACCESSIBILITY: Complex layouts overwhelm you. You "
                "need simple, predictable interfaces. Too many choices cause "
                "decision paralysis. Jargon confuses you."
            )

        # Frustration triggers
        if persona.frustration_triggers:
            triggers = ", ".join(persona.frustration_triggers)
            rules.append(f"SPECIFIC FRUSTRATION TRIGGERS: {triggers}")

        return "\n\n".join(rules)

    @staticmethod
    def profile_to_dict(persona: PersonaProfile) -> dict[str, Any]:
        """Convert a PersonaProfile to a dict suitable for prompt injection."""
        return persona.model_dump()
