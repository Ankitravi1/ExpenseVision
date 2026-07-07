# ExpenseVision Plan

## Completed foundation

### v0.1 - Web Foundation
- [x] Core CRUD for accounts, categories, transactions, and budgets
- [x] Bulk CSV import/export
- [x] Timezone support
- [x] Web push notifications for budget alerts

### v0.2 - Mobile & Transaction Entry
- [x] Android mobile app with shared backend data sync
- [x] Native date picker, bottom-sheet pickers, haptics, and swipe-to-delete
- [x] Optional AI-assisted quick transaction parsing
- [x] Mobile bottom Add Transaction action and drawer shortcuts
- [x] Expo SDK 54 / Expo Go dev workflow for emulator, LAN phone, and USB phone

### v0.3 - Recurring, Budgets & Insights
- [x] Recurring transactions for rent, EMI, salary, and subscriptions
- [x] Budget roll-over and per-budget alert thresholds
- [x] Reports insights for spending changes and budget pace
- [x] Swagger / OpenAPI documentation with bearer auth

## Current fix phase 2 (Feedback)
- [x] Fix mobile signup keyboard overlap using KeyboardAwareScrollView or behavior tweaks.
- [x] Fix mobile Google sign-in missing (use EXPO_PUBLIC_ env prefix).
- [x] Rename DB `description` to `note` via Prisma migration and update UI labels everywhere.
- [x] Unify Recurring Transactions UI (mobile/web) to use "First occurrence" and end-date toggles.
- [x] Add Gemini API option for AI parsing.
- [x] Secure AI Parsing: Move LLM call to backend so keys stay hidden from frontend.
- [x] Hide Quick Entry UI when AI Parsing is disabled.
- [x] Fix Budget UI input validation (Web step error, Mobile missing validation).
- [x] Prevent duplicate budgets in DB (unique constraint on category + month).
- [x] Add Hamburger Menu to all main mobile screens (not just Dashboard).
- [x] Add Import Transactions (CSV) option to Mobile Settings.

## Later work (Big Features)
- [ ] Voice-based Quick Entry: Mic button auto-saves transactions in background (Web & Mobile).
- [ ] Camera receipt parsing using AI Vision.
- [ ] Add real forgot-password email delivery and reset-link flow for production SMTP.
- [ ] AI-based smart import for PDF/image statements.
- [ ] Real-time sync with refresh on focus or websockets.
- [ ] Mobile push notifications for budget alerts.
- [ ] UPI payment intent integration.
- [ ] Bank Account Aggregator integration.
- [ ] Migrate database from SQLite to PostgreSQL for production/multi-user support.
