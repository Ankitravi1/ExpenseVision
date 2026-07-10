# ExpenseVision Project Plan

## 1. Foundation (Completed)

### 1.1 Web Application Foundation
- [x] Implement core CRUD operations for accounts, categories, transactions, and budgets.
- [x] Build bulk CSV import/export functionality.
- [x] Configure timezone support across the application.
- [x] Implement Web Push Notifications for budget alerts.

### 1.2 Mobile App & Transaction Entry
- [x] Develop Android mobile app (Expo) with shared backend data sync.
- [x] Create native UI patterns: native date picker, haptics, and swipe-to-delete.
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

## 3. Web UI Spacing, Contrast & Import Overhaul (Completed)

### 3.1 Date Selection & Period Navigation
- [x] **Date Shifting Chevrons**: Implement forward/backward chevrons `[◀] [View selector] [▶]` shifting date ranges based on active period (Daily, Weekly, Monthly, 3-Month, Yearly).
- [x] **Custom Date Ranges**: Change date fields manually to auto-toggle view to `Custom`. Fix inclusive boundaries to include transactions occurring on the end date.

### 3.2 Spacing & Dark Mode Readability
- [x] **Theme Picker Dynamic Binding**: Bound native date calendars to theme colors to ensure picker popovers are legible in dark mode.
- [x] **Table Header Proportions**: Squeezed columns (`w-[18%]` Note, `w-[18%]` Amount) to make space for all fields.
- [x] **Accounts Details modal redesign**: Standardized row contrast, account gradients, and Combined Balance blue theme highlight.
- [x] **Cancel Actions & Recurring rule controls**: Styled the edit-form cancel buttons with distinct rose highlights (`bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 border-rose-200`) and highlighted top header settings.

### 3.3 Unified Uploader Zone (CSV, Excel, PDF, Image OCR)
- [x] **One Drag-and-Drop Zone**: Replaced split CSV/AI tabs with a single file upload dropzone.
- [x] **Programmatic Excel & Shuffled CSV conversions**: Loads SheetJS (`xlsx`) dynamically to convert Excel spreadsheets to CSV client-side. Shuffled sheets are automatically routed to the AI Parser.
- [x] **Client-Side Text & OCR Extraction**: Runs client-side text extraction for PDFs and Tesseract.js OCR engine for receipt images, passing extracted strings to the backend AI parser.
- [x] **Password-Protected Decryption**: Catches PDF.js password errors and prompts the user to enter the decryption password dynamically.

### 3.4 Reports Layout Alignment
- [x] **Stats parity & Card Gradients**: Standardized stats grids (Total Expense first) using gradients (rose/emerald/blue) and enforced blue value colors.
- [x] **Category Distribution Merge**: Merged separate charts to mimic Dashboard's single card layout (Pie chart on left, detailed rows list on right).
- [x] **Repositioned elements**: Swapped Export CSV and Import Data button placement, and moved Carry Over check to the right next to Import buttons.

---

## 4. Future Roadmap (To Do)

The following main tasks define the upcoming major features for ExpenseVision. Each task is broken down into sub-tasks detailing the *why* and *how*.

### 4.1 Voice-Based Background Quick Entry
**Why:** Typing transactions manually is tedious. Allowing users to tap a mic, speak "spent 10 dollars on coffee", and have it auto-save reduces friction.
**How:**
- [ ] **Web:** Integrate the Web Speech API (`webkitSpeechRecognition`) for browser dictation. Send the transcript directly to the backend AI parser.
- [ ] **Mobile:** Use `expo-speech-recognition` or `react-native-voice` to capture dictation on Android. 
- [ ] **Backend:** Expose a direct POST endpoint that takes raw text, parses it via AI, and automatically saves the transaction without needing an intermediate draft confirmation.

### 4.2 Real-Time Data Synchronization (Socket.IO)
**Why:** Users switching between Web and Mobile should see changes instantly without needing to manually refresh or pull-to-refresh.
**How:**
- [ ] **Socket.IO:** Implement Socket.IO on the Express backend.
- [ ] **Client Integration:** Add socket listeners to Web and Mobile React Contexts.
- [ ] **Event Emitting:** Emit `transaction_added`, `budget_updated`, etc., from backend routes.

### 4.3 Production Database Migration & Mail Server
**Why:** The current SQLite and placeholder-email setup is meant for personal use. Scaling requires robust infrastructure.
**How:**
- [ ] **PostgreSQL Migration:** Replace SQLite with PostgreSQL in Prisma (`provider = "postgresql"`). Create initial migration.
- [ ] **Real Password Reset Mechanism:** Integrate `nodemailer` with a real provider (e.g., SendGrid, AWS SES) for verified forgot-password and secure reset-link flows.
- [ ] **Mobile Push Notifications**: Integrate Expo Push Notifications (requires obtaining an Expo token and storing it alongside the user in the DB) to replace or supplement Web Push.

### 4.4 Regional Integrations (India-specific UPI SMS Parsing)
**Why:** For users in India, auto-tracking UPI and bank balances is highly desired.
**How:**
- [ ] **UPI Intent / SMS Parsing:** On Android, explore reading banking SMS messages (requires explicit user permissions, often restricted by Google Play) to auto-draft transactions.
- [ ] **Account Aggregator (AA):** Research integrating with an AA gateway (like Setu) to securely fetch live bank balances.

### 4.5 Mobile Swipe Gestures & Custom Transitions
**Why:** Modern mobile apps rely on fluid gesture controls to navigate.
**How:**
- [ ] **PanResponder & Reanimated:** Implement fluid left, up, and down swipe gestures using `react-native-reanimated` and `react-native-gesture-handler`.
- [ ] **Interaction:** Map these gestures to app functionality (e.g., swipe down to dismiss modals, swipe left/right to switch tabs or categories) to mimic premium native app experiences like Instagram.

### 4.6 Advanced Machine Learning Forecasts & Recommendations
**Why:** Users want proactive feedback to avoid running out of funds before the end of the month.
**How:**
- [ ] **Trend Regression**: Implement simple rolling average and seasonal autoregressive forecasting of transaction categories.
- [ ] **AI Advisory Panel**: Allow the AI settings screen to train a monthly coach persona which alerts the user on budgeting pitfalls based on historical trends.
