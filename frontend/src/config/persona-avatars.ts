/**
 * Persona avatar resolution — maps persona templates to avatar URLs.
 *
 * Passes through templates as-is since avatars are already resolved
 * from the backend's avatar_url field. This helper exists to allow
 * future overrides or client-side avatar generation.
 */

import type { PersonaTemplateOut } from '@/types';

export function withResolvedPersonaAvatar<T extends Partial<PersonaTemplateOut>>(
  persona: T,
): T {
  return persona;
}
