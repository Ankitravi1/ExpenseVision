# ExpenseVision Project Plan

## 1. Foundation (Completed)

### 1.1 Web Application Foundation
- [x] Implement core CRUD operations for accounts, categories, transactions, and budgets.
- [x] Build bulk CSV import/export functionality.
- [x] Configure timezone support across the application.
- [x] Implement Web Push Notifications for budget alerts.

### 1.2 Mobile App & Transaction Entry
- [x] Develop Android mobile app (Expo) with shared backend data sync.
- [x] Create native UI patterns: native date picker, bottom-sheet pickers, haptics, and swipe-to-delete.
- [x] Integrate optional AI-assisted quick transaction parsing.
- [x] Build drawer navigation shortcuts and a bottom tab action bar.
- [x] Establish Expo SDK 54 / Expo Go development workflow (emulator, LAN phone, USB phone).

### 1.3 Recurring, Budgets & Insights
- [x] Build recurring transaction engine (rent, EMI, salary, subscriptions).
- [x] Implement budget roll-over and per-budget alert thresholds (defaults to 90%).
- [x] Develop Reports insights (spending changes, budget pace).
- [x] Provide Swagger / OpenAPI documentation with Bearer authentication.

## 2. Refinement & Fixes Phase (Completed)

### 2.1 Mobile UI & Layout Polishing
- [x] Fix mobile signup keyboard overlap (inputs now scroll above the keyboard).
- [x] Add Hamburger Menu globally to all main mobile screens.
- [x] Redesign Drawer layout: move "Add transaction" to the bottom, just above the new user pill.
- [x] Migrate user settings (Currency & Timezone) into a dedicated editable Profile Screen.
- [x] Add CSV template download to Mobile Settings.

### 2.2 Unification & Backend Integrity
- [x] Rename DB `description` to `note` via Prisma migration and unify labels.
- [x] Unify Recurring Transactions UI (mobile/web) to use "First occurrence" and end-date toggles.
- [x] Enforce unique constraints on Category + Month to prevent duplicate budgets.
- [x] Secure AI Parsing by moving LLM requests to the backend (keeps API keys hidden from frontend).
- [x] Add Gemini API as an option alongside OpenAI and DeepSeek.

### 2.3 Web UI Bug Fixes
- [x] Disable "Set Budget" when all categories are already budgeted.
- [x] Fix budget modal step inputs and `alertThreshold` default value handling.
- [x] Fix budget deletion bug for recurring budgets created on mobile.
- [x] Remove unused "Unbudgeted Categories" UI.
- [x] Hide AI Quick Entry UI dynamically when AI Parsing is disabled.
- [x] Gracefully hide push notification toggle when backend VAPID keys are missing.

## 3. Future Roadmap (To Do)

The following main tasks define the upcoming major features for ExpenseVision. Each task is broken down into sub-tasks detailing the *why* and *how*.

### 3.1 Voice-Based Background Quick Entry
**Why:** Typing transactions manually is tedious. Allowing users to tap a mic, speak "spent 10 dollars on coffee", and have it auto-save reduces friction.
**How:**
- [ ] **Web:** Integrate the Web Speech API (`webkitSpeechRecognition`) for browser dictation. Send the transcript directly to the backend AI parser.
- [ ] **Mobile:** Use `expo-speech-recognition` or `react-native-voice` to capture dictation on Android. 
- [ ] **Backend:** Expose a direct POST endpoint that takes raw text, parses it via AI, and automatically saves the transaction without needing an intermediate draft confirmation.

### 3.2 Real-Time Data Synchronization
**Why:** Users switching between Web and Mobile should see changes instantly without needing to manually refresh or pull-to-refresh.
**How:**
- [ ] **Socket.IO:** Implement Socket.IO on the Express backend.
- [ ] **Client Integration:** Add socket listeners to Web and Mobile React Contexts.
- [ ] **Event Emitting:** Emit `transaction_added`, `budget_updated`, etc., from backend routes.

### 3.3 Receipt & Statement Parsing (AI Vision)
**Why:** Users often want to upload a photo of a receipt or a PDF bank statement for bulk importing.
**How:**
- [ ] **Image Upload:** Add an image picker to Expo (Mobile) and a file input (Web).
- [ ] **Vision API:** Send the image/PDF to Google Gemini 1.5 Pro (or equivalent Vision model) with a strict prompt to return a JSON array of transactions.
- [ ] **Preview UI:** Present the parsed array in a staging UI so the user can verify amounts and categories before committing to the DB.

### 3.4 Production Readiness & Security
**Why:** The current SQLite and placeholder-email setup is meant for personal use. Scaling requires robust infrastructure.
**How:**
- [ ] **PostgreSQL Migration:** Replace SQLite with PostgreSQL in Prisma (`provider = "postgresql"`). Create initial migration.
- [ ] **Real Password Reset Mechanism:** Integrate `nodemailer` with a real provider (e.g., SendGrid, AWS SES) for verified forgot-password and secure reset-link flows.
- [ ] **Mobile Push Notifications:** Integrate Expo Push Notifications (requires obtaining an Expo token and storing it alongside the user in the DB) to replace or supplement Web Push.

### 3.6 Mobile Swipe Gestures (Instagram-style)
**Why:** Modern mobile apps rely on fluid gesture controls to navigate.
**How:**
- [ ] **PanResponder & Reanimated:** Implement fluid left, up, and down swipe gestures using `react-native-reanimated` and `react-native-gesture-handler`.
- [ ] **Interaction:** Map these gestures to app functionality (e.g., swipe down to dismiss modals, swipe left/right to switch tabs or categories) to mimic premium native app experiences like Instagram.
### 3.5 Regional Integrations (India-specific)
**Why:** For users in India, auto-tracking UPI and bank balances is highly desired.
**How:**
- [ ] **UPI Intent / SMS Parsing:** On Android, explore reading banking SMS messages (requires explicit user permissions, often restricted by Google Play) to auto-draft transactions.
- [ ] **Account Aggregator (AA):** Research integrating with an AA gateway (like Setu) to securely fetch live bank balances.

### 3.7 Full Report Modification, Filtering, and Analysis (Version 3.0)
**Why:** Users need advanced analytical reporting to understand their spending habits deeply, with custom date range filters, multi-category comparisons, and automated exports.
**How:**
- [ ] **Advanced Filtering:** Add dynamic filters for custom date ranges, accounts, categories, and transaction types (income vs. expense) to the Reports screen on both Web and Mobile.
- [ ] **Comparative Reports:** Implement month-over-month and year-over-year spending comparison charts.
- [ ] **AI-Powered Financial Insights:** Add an "AI Insights" button that uses Gemini to analyze current reports/spending patterns and generate actionable budgeting tips.
- [ ] **Export Options:** Implement PDF and Excel export options for generated reports on both Web and Mobile.
