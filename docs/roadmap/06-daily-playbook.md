# 06 — Daily Playbook (how to actually run this)

A repeatable loop so 1–2h/day compounds instead of scattering. Use this alongside `04`'s dated tasks.

## Your daily 1–2h block

1. **(5 min) Triage** — check Sentry (errors) + any user messages. A real bug jumps the queue.
2. **(60–90 min) The one build task** — do *today's* task from `04`. One meaningful thing beats five half-things. Hand code to Claude with the right model (below); you review + decide.
3. **(15–20 min) Show up** — one build-in-public action (a reply thread, a progress GIF, a Reddit comment). Consistency > volume.
4. **(5 min) Log** — jot what you shipped + tomorrow's task. This becomes your launch-story material.

## Weekly rhythm

- **Monday:** pick the week's goal from `04`; line up the tasks.
- **Mid-week:** one visible improvement you can post.
- **Friday:** review metrics (activation, waitlist, Pro), write the week's devlog note, plan next week.
- **Weekend:** light catch-up or rest. Burnout is the #1 solo-founder failure — protect it.

## How to delegate to Claude (model routing)

| Task type | Model | Why |
|---|---|---|
| Roadmap, breaking down work, marketing/legal copy drafts, "what should I do next?" | **Fable** (`/model` → fable) | Fast, strong at planning & writing |
| Small scoped code: copy fixes, one component, wire an endpoint, a script | **Sonnet** | Cheap/fast for well-defined work |
| Auth, payments/entitlements, security, data migrations, deploy/Docker, self-host packaging | **Opus** | High-stakes correctness; worth the cost |

Switch with `/model`. Give Claude: the goal, the file(s), and the constraint ("don't touch X"). For risky work, ask Opus to **run `/verify` or `/security-review`** before you ship.

## A good task hand-off template

> "Goal: <what and why>. Files: <paths>. Constraints: <don't break X, match existing style>. When done: typecheck + tell me what you changed and what I need to test."

## Decisions only you should make (don't delegate)

Pricing, what's Free vs Pro, privacy claims, what to post publicly, which feedback to act on, when to launch. Claude advises; you decide.

## Guardrails so scope doesn't explode

- The 11-week goal is **hosted web + paywall + waitlist + build-in-public launch** — *not* mobile, *not* self-host packaging, *not* every UX-audit item. Defer ruthlessly (post-launch list in `04`).
- Every new idea → the backlog, not today. Ship the plan; iterate after real users.
- If you're behind, cut scope, not the fundamentals (backups, security, legal, payments correctness).

## Where everything lives

- Product roadmap & phases: `plan.md`
- This launch plan: `docs/roadmap/00–06`
- UX findings + fixes tracker: `docs/web-ux-audit.md`
- Agent/architecture notes: `AGENTS.md`
