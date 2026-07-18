# 07 — Going Global, New Features & Brand

Answers the "India-only vs global?", the new feature ideas (invoice, tools/calculator), the mascot, and naming/domain.

## 1. Global vs India — go global, US/UK first

**Decision: build global, prioritize US & UK.** That's where users who pay live, and nothing in the product is India-specific anymore (EMI/SBI examples already removed). Region only affects **currency, date/number format, and payment tax** — the features are universal.

### What's already global-ready
- **Per-user currency** (chosen at onboarding, stored on the user).
- **Per-user timezone** (used for dates/scheduling).
- **AI statement import** handles *any* bank format (no per-country parser needed) — a genuine global advantage.
- English UI (fine for US/UK; other languages are a later i18n project, not needed for launch).

### What to change for a credible global product
| Area | Change | Priority | Who |
|---|---|---|---|
| **Date format** | Stop hardcoding DD-MM-YYYY. Use `Intl.DateTimeFormat` with the user's locale, or a "date format" preference (US = MM/DD/YYYY, UK = DD/MM/YYYY). (UX audit NewTransaction #5.) | 🔴 launch | `[S]` |
| **Currency formatting** | Format money with `Intl.NumberFormat(locale, { style:'currency', currency })` so symbol, separators, and decimals are correct per region (₹, $, £, €). | 🔴 launch | `[S]` |
| **Number/thousands separators** | Same `Intl` approach; don't hardcode. | 🟡 | `[S]` |
| **Onboarding: country → currency → locale** | Default currency/date-format from the chosen country; let the user override. (You already collect country + currency — extend it.) | 🔴 launch | `[S/O]` |
| **Payments tax/VAT** | Use a **merchant-of-record** (LemonSqueezy) so US sales tax + UK/EU VAT are handled for you. (See `02`.) | 🔴 to charge | `[You]` |
| **Legal** | Privacy Policy + ToS that work for US/UK/EU users (GDPR-aware language). | 🔴 to charge | `[You+F]` |
| **Currency conversion** | *Not* required for launch. Only needed if one user mixes currencies across accounts (Phase 7.3 multi-currency). Single-currency-per-user is fine to start. | 🟢 later | — |

**Bottom line:** the only launch-blocking global work is date/currency **formatting via `Intl`**, an onboarding that sets those from country, and a MoR payment processor. Everything else is universal.

## 2. Onboarding (proper, global)

Target a crisp first-run: **Account (email/Google) → Name → Country → Currency + Date format (pre-filled from country, overridable) → Create first account → land on Dashboard with the tour.** You already have most stages; the additions are **date-format** capture and pre-filling currency from country. Keep it to ≤4 short steps — every extra field drops completion.

## 3. New features

### Invoice generator (good Pro feature)
- Create/send simple invoices (client, line items, tax, total), export **PDF**, mark paid → optionally auto-create an income transaction.
- **Note:** the app has **no PDF library yet** (that's why PDF export is deferred). Invoice PDF would add one (e.g. `pdf-lib`/`jspdf`). Scope it as a **post-launch Pro feature** — it's a different surface from expense tracking and shouldn't delay launch.
- Fit: sells to freelancers/small-biz (a paying US/UK segment). `[O]` when scheduled.

### Tools section + slide-out calculator
- A **"Tools" area** (sidebar entry or a toggle) holding small utilities: a **calculator** (slide-out panel), plus finance-specific helpers: **loan/EMI calculator, savings-goal calculator, currency converter**.
- The **slide-out calculator** is a nice, low-risk `[S]` win and demos well for build-in-public.
- Fit: calculator/basic tools **free** (drive engagement); advanced/finance calculators can be **Pro**.

**Sequencing:** none of these block launch. Ship the **slide-out calculator** as an early, cheap delight; schedule **invoice generator** post-launch as a Pro headline feature.

## 4. Mascot / character

A mascot is great for build-in-public and memorability (see **Cleo** — a finance app whose sassy mascot *is* the brand). Keep it cheap:
- A simple, friendly character tied to the name (e.g. an owl = "wise with money", a piggy/robot hybrid, a coin character).
- Uses: app empty states, the onboarding tour guide, Twitter/X avatar and reply reactions, the 404 page, launch graphics.
- Don't over-invest pre-launch: one clean SVG in 2–3 poses is enough. `[You]` (a designer/AI image tool) makes the art; `[S]` drops the SVG into empty states/tour.

## 5. Naming & domain

The `.com` for "ExpenseVision" is showing **premium/aftermarket prices** (the ₹40k/mo lease · ₹4.8L buy you saw) — **don't pay that.** Pick a name with a clean, cheap available domain instead.

### Criteria for a good name here
Short (1–2 syllables or a snappy compound), easy to spell/say, brandable, **not** boxed into "expense" (so you can grow into budgeting/invoicing), and with an affordable `.com` if possible (best trust for US/UK) — otherwise a respectable alt TLD.

### Your candidates
- **TrackMo** — short, catchy, brandable, friendly (pairs well with a mascot). Risk: verify `trackmo.com` isn't taken/premium; `.co` is widely accepted for startups. **Strong option.**
- **ExpenseVision.net / .co.in** — descriptive but `.net` reads a bit dated for a consumer app, and it keeps you boxed into "expense." OK as a fallback, not ideal for a US/UK consumer brand.
- **trackmo.co / trackmo.net** — `.co` > `.net` for a modern consumer brand.

### ✅ Decision (2026-07): keep **ExpenseVision**, domain **`expensevision.net`**
Grabbed at ₹1 first year (₹1,799 / 3yr). Rationale: cheap, locks the brand, and **no renaming work** (the `.com` was premium-priced — correctly avoided).
- **Caveat to accept:** `.net` has marginally less consumer trust than `.com` in US/UK. Fully usable; revisit a `.com` only if the brand gains traction.
- **Do next:** grab the matching **social handles** (X/Twitter, Instagram, Reddit) as `@expensevision` or nearest available — handle consistency matters more than the TLD.
- **Mascot tie-in:** "ExpenseVision" → a **vision/eye theme** works well (an owl, a friendly telescope/binoculars character, or an eye mascot "watching your money"). Cheap to make, memorable for build-in-public.
