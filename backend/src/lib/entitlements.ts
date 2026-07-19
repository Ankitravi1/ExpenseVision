// ─── Entitlements ────────────────────────────────────────────────────────────
// Single source of truth for what a user's billing plan unlocks. The server is
// always the enforcer — the client only reflects these decisions with upgrade
// CTAs. See docs/roadmap/02-monetization-tiers.md.
//
// Product rules (as decided; note these differ from the earliest draft matrix):
//   • AI quick-entry  — available to EVERYONE, capped per day for platform-key
//     users (free 10 / pro 40), unlimited on own key. Not gated here.
//   • AI statement import — PRO only when using the host/platform key; own-key
//     users (incl. self-host) always have it.
//   • Paper theme (+ future premium themes) — PRO only.
//   • Bring-your-own AI key — available to EVERYONE (host isn't billed for it).

export interface EntitlementUser {
    plan?: string | null;
    /** Optional — only enforced when actually selected/loaded from the DB. */
    planExpiresAt?: Date | null;
}

/** A user is Pro when their plan is 'pro' and (if an expiry is set) it hasn't passed. */
export function isPro(user: EntitlementUser | null | undefined): boolean {
    if (!user || user.plan !== 'pro') return false;
    if (user.planExpiresAt instanceof Date && user.planExpiresAt.getTime() < Date.now()) return false;
    return true;
}

/**
 * Can this user run AI statement import? Own-key usage (self-host / BYO) is always
 * allowed; the host/platform key is a Pro perk.
 */
export function canUseAiImport(user: EntitlementUser | null | undefined, aiSource: 'own' | 'platform'): boolean {
    return aiSource === 'own' || isPro(user);
}

/** Themes that require Pro. Everything else (light/dark) is free. */
export const PREMIUM_THEMES = ['paper'];

export function canUseTheme(user: EntitlementUser | null | undefined, theme: string): boolean {
    if (!PREMIUM_THEMES.includes(theme)) return true;
    return isPro(user);
}

// User-facing upgrade prompts. These are legitimate product messages (distinct
// from the generic "temporarily unavailable" used to mask internal AI faults).
export const UPGRADE_REQUIRED_AI_IMPORT = 'AI statement import is a Pro feature. Upgrade to Pro, or add your own AI key in Settings to use it for free.';
export const UPGRADE_REQUIRED_THEME = 'This theme is a Pro feature. Upgrade to Pro to unlock it.';
