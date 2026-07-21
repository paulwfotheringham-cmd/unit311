/**
 * Product surface visibility — same codebase for Internal and Demo.
 * Flip to true only when the surface is production-ready for customers.
 */

/** Executive Assistant — dedicated workspace + sidebar module (`?view=executive-assistant`). */
export const EXECUTIVE_ASSISTANT_VISIBLE = true;

/**
 * Platform floating AI Assistant — shell-level drawer/FAB on every Internal Ops page.
 * Independent of the Executive Assistant workspace module.
 */
export const PLATFORM_AI_ASSISTANT_VISIBLE = true;
