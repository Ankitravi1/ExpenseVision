// OpenAPI 3.0 specification for the ExpenseVision API.
// Served with Swagger UI at GET /api/docs so every endpoint can be tried
// interactively. Use POST /api/auth/login (or /signup), copy the returned
// `token`, click "Authorize" and paste it to call the protected endpoints.

const bearerAuth = [{ bearerAuth: [] }];

const errorResponse = {
    description: 'Error',
    content: {
        'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Descriptive error message' },
        },
    },
};

export const openApiSpec = {
    openapi: '3.0.3',
    info: {
        title: 'ExpenseVision API',
        version: '1.0.0',
        description:
            'Personal finance REST API shared by the web and mobile apps.\n\n' +
            '## Authenticating in this UI\n' +
            '1. Call **POST /auth/signup** (or **/auth/login**) below and copy the `token` from the response.\n' +
            '2. Click the green **Authorize** button (top right), paste the token, and confirm.\n' +
            '3. All 🔒 endpoints will now send `Authorization: Bearer <token>` automatically.\n\n' +
            'Access tokens last 15 minutes; use **/auth/refresh-token** to get a new one. ' +
            'All error responses have the shape `{ "error": string }`.',
    },
    servers: [{ url: '/api', description: 'Current host' }],
    tags: [
        { name: 'Auth', description: 'Signup, login, profile, 2FA, password reset' },
        { name: 'Accounts', description: 'Bank/cash/card accounts with balances' },
        { name: 'Categories', description: 'Income/expense categories' },
        { name: 'Transactions', description: 'Income, expense and transfer records' },
        { name: 'Budgets', description: 'Monthly category budgets with rollover & alerts' },
        { name: 'Recurring', description: 'Repeating rules (rent, EMI, salary) auto-materialized when due' },
        { name: 'Push', description: 'Web push subscriptions (optional, needs VAPID keys)' },
        { name: 'Data', description: 'Combined initial data + health' },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'JWT access token returned by /auth/login or /auth/signup',
            },
        },
        schemas: {
            Error: {
                type: 'object',
                properties: { error: { type: 'string' } },
                required: ['error'],
            },
            User: {
                type: 'object',
                properties: {
                    id: { type: 'string', example: 'clx123abc' },
                    email: { type: 'string', format: 'email', example: 'jane@example.com' },
                    name: { type: 'string', example: 'Jane Doe' },
                    country: { type: 'string', nullable: true, example: 'IN' },
                    timezone: { type: 'string', example: 'Asia/Kolkata' },
                    currency: { type: 'string', nullable: true, example: 'INR' },
                    theme: { type: 'string', nullable: true, example: 'light' },
                    profilePicture: { type: 'string', nullable: true },
                    profileComplete: { type: 'boolean', example: false },
                    emailVerified: { type: 'boolean', example: true },
                },
            },
            AuthResponse: {
                type: 'object',
                properties: {
                    user: { $ref: '#/components/schemas/User' },
                    token: { type: 'string', description: 'JWT access token (15 min)' },
                    refreshToken: { type: 'string', description: 'Opaque refresh token (30 days)' },
                    needsProfileCompletion: { type: 'boolean', example: true },
                },
            },
            Account: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    userId: { type: 'string' },
                    name: { type: 'string', example: 'HDFC Savings' },
                    type: { type: 'string', example: 'savings' },
                    balance: { type: 'number', example: 15000.5 },
                    color: { type: 'string', nullable: true, example: '#10b981' },
                    icon: { type: 'string', nullable: true, example: 'PiggyBank' },
                    logo: { type: 'string', nullable: true },
                },
            },
            Category: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    userId: { type: 'string' },
                    name: { type: 'string', example: 'Groceries' },
                    type: { type: 'string', enum: ['income', 'expense', 'transfer'], example: 'expense' },
                    icon: { type: 'string', nullable: true, example: 'ShoppingCart' },
                },
            },
            Transaction: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    userId: { type: 'string' },
                    accountId: { type: 'string' },
                    transferToAccountId: { type: 'string', nullable: true },
                    categoryId: { type: 'string', nullable: true },
                    amount: { type: 'number', example: 250 },
                    type: { type: 'string', enum: ['income', 'expense', 'transfer'], example: 'expense' },
                    date: { type: 'string', example: '2026-07-05', description: 'YYYY-MM-DD (stored as a string, not a DateTime)' },
                    description: { type: 'string', example: 'Weekly groceries' },
                    notes: { type: 'string', nullable: true, example: 'upi, bigbasket' },
                },
            },
            Budget: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    userId: { type: 'string' },
                    categoryId: { type: 'string' },
                    amount: { type: 'number', example: 8000 },
                    month: { type: 'string', nullable: true, example: null, description: 'YYYY-MM, or null for a budget that repeats every month' },
                    rollover: { type: 'boolean', example: true },
                    alertThreshold: { type: 'number', example: 80, description: 'Percent of budget at which an alert fires' },
                    spent: { type: 'number', example: 5200, description: 'Spend in the applicable month (computed)' },
                    carryover: { type: 'number', example: 1000, description: 'Last month leftover carried in when rollover is on' },
                    effectiveAmount: { type: 'number', example: 9000, description: 'amount + carryover (min 0); use as the progress denominator' },
                },
            },
            RecurringRule: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    userId: { type: 'string' },
                    description: { type: 'string', example: 'Flat rent' },
                    notes: { type: 'string', nullable: true },
                    amount: { type: 'number', example: 18000 },
                    type: { type: 'string', enum: ['income', 'expense', 'transfer'], example: 'expense' },
                    accountId: { type: 'string' },
                    transferToAccountId: { type: 'string', nullable: true },
                    categoryId: { type: 'string', nullable: true },
                    frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'], example: 'monthly' },
                    dayAnchor: { type: 'integer', example: 1, description: 'Day-of-month anchor, clamped to shorter months' },
                    nextRun: { type: 'string', example: '2026-08-01', description: 'YYYY-MM-DD of the next occurrence to create' },
                    endDate: { type: 'string', nullable: true, example: null },
                    active: { type: 'boolean', example: true },
                },
            },
            InitialData: {
                type: 'object',
                properties: {
                    accounts: { type: 'array', items: { $ref: '#/components/schemas/Account' } },
                    categories: { type: 'array', items: { $ref: '#/components/schemas/Category' } },
                    transactions: { type: 'array', items: { $ref: '#/components/schemas/Transaction' } },
                    budgets: { type: 'array', items: { $ref: '#/components/schemas/Budget' } },
                    recurring: { type: 'array', items: { $ref: '#/components/schemas/RecurringRule' } },
                },
            },
        },
    },
    paths: {
        '/health': {
            get: {
                tags: ['Data'],
                summary: 'Health check',
                description: 'Returns 200 when the API is up. No auth required.',
                security: [],
                responses: {
                    200: {
                        description: 'API is running',
                        content: { 'application/json': { example: { status: 'ok', message: 'ExpenseVision API is running' } } },
                    },
                },
            },
        },
        '/auth/signup': {
            post: {
                tags: ['Auth'],
                summary: 'Create an account',
                description:
                    'Registers a new user, seeds default categories + a Savings account, and returns tokens. ' +
                    'Without SMTP configured the user is auto-verified. `needsProfileCompletion` is true until a currency is set.',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password', 'name'],
                                properties: {
                                    email: { type: 'string', format: 'email' },
                                    password: { type: 'string', minLength: 6, description: 'At least 6 characters' },
                                    name: { type: 'string', minLength: 1 },
                                },
                            },
                            example: { email: 'jane@example.com', password: 'Password123!', name: 'Jane Doe' },
                        },
                    },
                },
                responses: {
                    201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
                    400: errorResponse,
                },
            },
        },
        '/auth/login': {
            post: {
                tags: ['Auth'],
                summary: 'Log in',
                description: 'Returns user + tokens. If the account has 2FA enabled, returns `{ require2FA: true, userId }` instead — then call /auth/2fa/login.',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password'],
                                properties: {
                                    email: { type: 'string', format: 'email' },
                                    password: { type: 'string' },
                                },
                            },
                            example: { email: 'jane@example.com', password: 'Password123!' },
                        },
                    },
                },
                responses: {
                    200: { description: 'Logged in (or 2FA required)', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
                    401: errorResponse,
                },
            },
        },
        '/auth/google': {
            post: {
                tags: ['Auth'],
                summary: 'Sign in with Google',
                description: 'Exchanges a Google ID token for ExpenseVision tokens. Returns 503 when GOOGLE_CLIENT_ID is not configured.',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { type: 'object', required: ['googleToken'], properties: { googleToken: { type: 'string' } } },
                            example: { googleToken: 'eyJhbGciOi...' },
                        },
                    },
                },
                responses: {
                    200: { description: 'Logged in', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
                    503: errorResponse,
                },
            },
        },
        '/auth/complete-profile': {
            put: {
                tags: ['Auth'],
                summary: 'Complete profile (set currency)',
                description: 'Sets currency + timezone after signup and marks the profile complete. Requires a bearer token.',
                security: bearerAuth,
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['currency'],
                                properties: {
                                    currency: { type: 'string', example: 'INR' },
                                    timezone: { type: 'string', example: 'Asia/Kolkata' },
                                    country: { type: 'string', example: 'IN' },
                                },
                            },
                            example: { currency: 'INR', timezone: 'Asia/Kolkata' },
                        },
                    },
                },
                responses: {
                    200: { description: 'Updated', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } },
                    400: errorResponse,
                    401: errorResponse,
                },
            },
        },
        '/auth/update-profile': {
            put: {
                tags: ['Auth'],
                summary: 'Update profile',
                description: 'Updates any of name, country, timezone, currency, theme.',
                security: bearerAuth,
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    country: { type: 'string' },
                                    timezone: { type: 'string' },
                                    currency: { type: 'string' },
                                    theme: { type: 'string', enum: ['light', 'dark'] },
                                },
                            },
                            example: { name: 'Jane D.', theme: 'dark' },
                        },
                    },
                },
                responses: {
                    200: { description: 'Updated', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } },
                    401: errorResponse,
                },
            },
        },
        '/auth/forgot-password': {
            post: {
                tags: ['Auth'],
                summary: 'Request a password reset',
                description: 'Sends a reset email if the account exists (always responds 200 to avoid leaking which emails are registered).',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } },
                            example: { email: 'jane@example.com' },
                        },
                    },
                },
                responses: { 200: { description: 'Reset email sent if account exists' } },
            },
        },
        '/auth/reset-password': {
            post: {
                tags: ['Auth'],
                summary: 'Reset password with token',
                description: 'Sets a new password using the token from the reset email (valid 1 hour).',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { type: 'object', required: ['token', 'password'], properties: { token: { type: 'string' }, password: { type: 'string', minLength: 6 } } },
                            example: { token: 'a1b2c3...', password: 'NewPassword123!' },
                        },
                    },
                },
                responses: { 200: { description: 'Password reset' }, 400: errorResponse },
            },
        },
        '/auth/verify-email': {
            post: {
                tags: ['Auth'],
                summary: 'Verify email with token',
                security: [],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { type: 'object', required: ['token'], properties: { token: { type: 'string' } } }, example: { token: 'a1b2c3...' } } },
                },
                responses: { 200: { description: 'Email verified' }, 400: errorResponse },
            },
        },
        '/auth/2fa/setup': {
            post: {
                tags: ['Auth'],
                summary: 'Begin 2FA setup',
                description: 'Generates a TOTP secret + QR code data URL. Scan it, then confirm with /auth/2fa/verify.',
                security: bearerAuth,
                responses: {
                    200: { description: 'Secret + QR', content: { 'application/json': { example: { secret: 'JBSWY3DPEHPK3PXP', qrCode: 'data:image/png;base64,...' } } } },
                    401: errorResponse,
                },
            },
        },
        '/auth/2fa/verify': {
            post: {
                tags: ['Auth'],
                summary: 'Confirm & enable 2FA',
                security: bearerAuth,
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { type: 'object', required: ['code'], properties: { code: { type: 'string', example: '123456' } } }, example: { code: '123456' } } },
                },
                responses: { 200: { description: '2FA enabled' }, 400: errorResponse, 401: errorResponse },
            },
        },
        '/auth/2fa/login': {
            post: {
                tags: ['Auth'],
                summary: 'Complete login with a 2FA code',
                description: 'Second step after /auth/login returns require2FA. Returns tokens on success.',
                security: [],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { type: 'object', required: ['userId', 'code'], properties: { userId: { type: 'string' }, code: { type: 'string', example: '123456' } } }, example: { userId: 'clx123abc', code: '123456' } } },
                },
                responses: { 200: { description: 'Logged in', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } }, 401: errorResponse },
            },
        },
        '/auth/refresh-token': {
            post: {
                tags: ['Auth'],
                summary: 'Rotate tokens',
                description: 'Exchanges a valid refresh token for a fresh access + refresh token (the old refresh token is revoked).',
                security: [],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } }, example: { refreshToken: 'opaque-token' } } },
                },
                responses: { 200: { description: 'New tokens', content: { 'application/json': { example: { token: 'new.jwt', refreshToken: 'new-opaque' } } } }, 401: errorResponse },
            },
        },
        '/initial-data': {
            get: {
                tags: ['Data'],
                summary: 'Fetch everything for the app',
                description: 'Returns accounts, categories, transactions, budgets (with spent/carryover/effectiveAmount) and recurring rules. Also materializes any recurring transactions that are now due.',
                security: bearerAuth,
                responses: { 200: { description: 'All data', content: { 'application/json': { schema: { $ref: '#/components/schemas/InitialData' } } } }, 401: errorResponse },
            },
        },
        '/accounts': {
            get: {
                tags: ['Accounts'],
                summary: 'List accounts',
                security: bearerAuth,
                responses: { 200: { description: 'Accounts', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Account' } } } } }, 401: errorResponse },
            },
            post: {
                tags: ['Accounts'],
                summary: 'Create account',
                security: bearerAuth,
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name', 'type'],
                                properties: {
                                    name: { type: 'string' },
                                    type: { type: 'string', example: 'checking' },
                                    balance: { type: 'number', default: 0 },
                                    color: { type: 'string' },
                                    icon: { type: 'string' },
                                    logo: { type: 'string' },
                                },
                            },
                            example: { name: 'HDFC Savings', type: 'savings', balance: 15000, icon: 'PiggyBank', color: '#10b981' },
                        },
                    },
                },
                responses: { 201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Account' } } } }, 400: errorResponse },
            },
        },
        '/accounts/{id}': {
            put: {
                tags: ['Accounts'],
                summary: 'Update account',
                security: bearerAuth,
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Account' }, example: { name: 'HDFC Salary', color: '#4f46e5' } } },
                },
                responses: { 200: { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Account' } } } }, 400: errorResponse, 404: errorResponse },
            },
            delete: {
                tags: ['Accounts'],
                summary: 'Delete account',
                description: 'Deletes the account and its transactions (cascade).',
                security: bearerAuth,
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 204: { description: 'Deleted' }, 404: errorResponse },
            },
        },
        '/categories': {
            get: {
                tags: ['Categories'],
                summary: 'List categories',
                security: bearerAuth,
                responses: { 200: { description: 'Categories', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Category' } } } } }, 401: errorResponse },
            },
            post: {
                tags: ['Categories'],
                summary: 'Create category',
                security: bearerAuth,
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name', 'type'],
                                properties: {
                                    name: { type: 'string' },
                                    type: { type: 'string', enum: ['income', 'expense', 'transfer'] },
                                    icon: { type: 'string', description: 'lucide-react icon name (shared web + mobile)' },
                                },
                            },
                            example: { name: 'Subscriptions', type: 'expense', icon: 'Repeat' },
                        },
                    },
                },
                responses: { 201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } } }, 400: errorResponse },
            },
        },
        '/categories/{id}': {
            put: {
                tags: ['Categories'],
                summary: 'Update category',
                security: bearerAuth,
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' }, example: { name: 'Streaming', icon: 'Video' } } } },
                responses: { 200: { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } } }, 400: errorResponse, 404: errorResponse },
            },
            delete: {
                tags: ['Categories'],
                summary: 'Delete category',
                description: 'Fails if the category is in use by transactions.',
                security: bearerAuth,
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 204: { description: 'Deleted' }, 400: errorResponse, 404: errorResponse },
            },
        },
        '/transactions': {
            get: {
                tags: ['Transactions'],
                summary: 'List transactions',
                description: 'Optional query filters. Dates are YYYY-MM-DD strings.',
                security: bearerAuth,
                parameters: [
                    { name: 'startDate', in: 'query', schema: { type: 'string', example: '2026-07-01' } },
                    { name: 'endDate', in: 'query', schema: { type: 'string', example: '2026-07-31' } },
                    { name: 'type', in: 'query', schema: { type: 'string', enum: ['income', 'expense', 'transfer'] } },
                    { name: 'categoryId', in: 'query', schema: { type: 'string' } },
                    { name: 'accountId', in: 'query', schema: { type: 'string' } },
                ],
                responses: { 200: { description: 'Transactions', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Transaction' } } } } }, 401: errorResponse },
            },
            post: {
                tags: ['Transactions'],
                summary: 'Create transaction',
                description:
                    'Creates a transaction and adjusts account balance(s) atomically. For transfers, set `type: transfer`, an `accountId` (source) and `transferToAccountId` (destination); leave `categoryId` null.',
                security: bearerAuth,
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['accountId', 'amount', 'type', 'date', 'description'],
                                properties: {
                                    accountId: { type: 'string' },
                                    amount: { type: 'number', minimum: 0.01 },
                                    type: { type: 'string', enum: ['income', 'expense', 'transfer'] },
                                    date: { type: 'string', example: '2026-07-05' },
                                    description: { type: 'string' },
                                    categoryId: { type: 'string', nullable: true },
                                    transferToAccountId: { type: 'string', nullable: true },
                                    notes: { type: 'string', nullable: true },
                                },
                            },
                            examples: {
                                expense: { summary: 'Expense', value: { accountId: 'acc_1', categoryId: 'cat_groceries', amount: 250, type: 'expense', date: '2026-07-05', description: 'Groceries', notes: 'upi' } },
                                transfer: { summary: 'Transfer', value: { accountId: 'acc_1', transferToAccountId: 'acc_2', amount: 5000, type: 'transfer', date: '2026-07-05', description: 'Move to savings' } },
                            },
                        },
                    },
                },
                responses: { 201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Transaction' } } } }, 400: errorResponse },
            },
        },
        '/transactions/{id}': {
            put: {
                tags: ['Transactions'],
                summary: 'Update transaction',
                description: 'Reverses the old balance effect and applies the new one atomically.',
                security: bearerAuth,
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Transaction' }, example: { amount: 275, description: 'Groceries (updated)' } } } },
                responses: { 200: { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Transaction' } } } }, 400: errorResponse },
            },
            delete: {
                tags: ['Transactions'],
                summary: 'Delete transaction',
                description: 'Deletes and reverses the balance effect.',
                security: bearerAuth,
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 204: { description: 'Deleted' }, 400: errorResponse },
            },
        },
        '/transactions/all': {
            delete: {
                tags: ['Transactions'],
                summary: 'Clear all transactions',
                description: 'Deletes every transaction for the user and resets account balances. Irreversible.',
                security: bearerAuth,
                responses: { 204: { description: 'Cleared' }, 401: errorResponse },
            },
        },
        '/transactions/bulk': {
            post: {
                tags: ['Transactions'],
                summary: 'Bulk create (CSV import)',
                security: bearerAuth,
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['transactions'],
                                properties: { transactions: { type: 'array', items: { $ref: '#/components/schemas/Transaction' } } },
                            },
                            example: { transactions: [{ accountId: 'acc_1', categoryId: 'cat_1', amount: 100, type: 'expense', date: '2026-07-01', description: 'Imported row' }] },
                        },
                    },
                },
                responses: { 201: { description: 'Created', content: { 'application/json': { example: { count: 1 } } } }, 400: errorResponse },
            },
        },
        '/transactions/parse-text': {
            post: {
                tags: ['Transactions'],
                summary: 'AI: parse a note into a draft',
                description:
                    'Uses the user-supplied AI provider/key to turn a free-text note ("spent 250 on groceries from HDFC") into a transaction draft. Nothing is saved — it returns a draft to review.',
                security: bearerAuth,
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['text', 'aiConfig'],
                                properties: {
                                    text: { type: 'string', minLength: 3 },
                                    preferredType: { type: 'string', enum: ['income', 'expense', 'transfer'] },
                                    aiConfig: {
                                        type: 'object',
                                        required: ['enabled', 'provider', 'model', 'apiKey'],
                                        properties: {
                                            enabled: { type: 'boolean' },
                                            provider: { type: 'string', enum: ['deepseek', 'openai', 'openrouter', 'custom'] },
                                            model: { type: 'string' },
                                            apiKey: { type: 'string' },
                                            baseUrl: { type: 'string' },
                                        },
                                    },
                                },
                            },
                            example: { text: 'spent 250 on groceries from HDFC', preferredType: 'expense', aiConfig: { enabled: true, provider: 'deepseek', model: 'deepseek-v4-flash', apiKey: 'sk-...' } },
                        },
                    },
                },
                responses: { 200: { description: 'Draft transaction' }, 400: errorResponse, 502: errorResponse },
            },
        },
        '/transactions/export': {
            get: {
                tags: ['Transactions'],
                summary: 'Export as CSV',
                description: 'Returns a CSV file of all transactions (Date, Time, Description, Amount, Type, Category, Account, Transfer To, Notes).',
                security: bearerAuth,
                responses: { 200: { description: 'CSV file', content: { 'text/csv': { schema: { type: 'string' } } } }, 401: errorResponse },
            },
        },
        '/budgets': {
            get: {
                tags: ['Budgets'],
                summary: 'List budgets',
                description: 'Each budget includes computed `spent`, `carryover`, and `effectiveAmount`.',
                security: bearerAuth,
                responses: { 200: { description: 'Budgets', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Budget' } } } } }, 401: errorResponse },
            },
            post: {
                tags: ['Budgets'],
                summary: 'Create or update a budget (upsert)',
                description: 'Upserts on (category, month). Omit `month` for a budget that repeats every month. `rollover` carries last month\'s leftover; `alertThreshold` is the % at which alerts fire.',
                security: bearerAuth,
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['categoryId', 'amount'],
                                properties: {
                                    categoryId: { type: 'string' },
                                    amount: { type: 'number', minimum: 0.01 },
                                    month: { type: 'string', nullable: true, example: null, description: 'YYYY-MM or omit/null for every month' },
                                    rollover: { type: 'boolean', default: false },
                                    alertThreshold: { type: 'number', minimum: 1, maximum: 500, default: 100 },
                                },
                            },
                            example: { categoryId: 'cat_groceries', amount: 8000, rollover: true, alertThreshold: 80 },
                        },
                    },
                },
                responses: { 201: { description: 'Saved', content: { 'application/json': { schema: { $ref: '#/components/schemas/Budget' } } } }, 400: errorResponse },
            },
        },
        '/budgets/{id}': {
            delete: {
                tags: ['Budgets'],
                summary: 'Delete budget',
                security: bearerAuth,
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 204: { description: 'Deleted' }, 404: errorResponse },
            },
        },
        '/recurring': {
            get: {
                tags: ['Recurring'],
                summary: 'List recurring rules',
                security: bearerAuth,
                responses: { 200: { description: 'Rules', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/RecurringRule' } } } } }, 401: errorResponse },
            },
            post: {
                tags: ['Recurring'],
                summary: 'Create recurring rule',
                description:
                    'Creates a repeating rule (rent, EMI, salary, subscription). Due occurrences are auto-created on the next /initial-data call. `startDate` is the first occurrence; the day-of-month becomes the anchor for monthly/yearly rules.',
                security: bearerAuth,
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['description', 'amount', 'type', 'accountId', 'frequency', 'startDate'],
                                properties: {
                                    description: { type: 'string' },
                                    amount: { type: 'number', minimum: 0.01 },
                                    type: { type: 'string', enum: ['income', 'expense', 'transfer'] },
                                    accountId: { type: 'string' },
                                    transferToAccountId: { type: 'string', nullable: true },
                                    categoryId: { type: 'string', nullable: true },
                                    frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'] },
                                    startDate: { type: 'string', example: '2026-08-01' },
                                    endDate: { type: 'string', nullable: true },
                                    notes: { type: 'string', nullable: true },
                                    active: { type: 'boolean', default: true },
                                },
                            },
                            example: { description: 'Flat rent', amount: 18000, type: 'expense', accountId: 'acc_1', categoryId: 'cat_rent', frequency: 'monthly', startDate: '2026-08-01' },
                        },
                    },
                },
                responses: { 201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/RecurringRule' } } } }, 400: errorResponse },
            },
        },
        '/recurring/{id}': {
            put: {
                tags: ['Recurring'],
                summary: 'Update recurring rule',
                description: 'Partial update. Sending `startDate` resets nextRun and the day anchor. Set `active: false` to pause.',
                security: bearerAuth,
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RecurringRule' }, example: { amount: 19000, active: false } } } },
                responses: { 200: { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/RecurringRule' } } } }, 400: errorResponse, 404: errorResponse },
            },
            delete: {
                tags: ['Recurring'],
                summary: 'Delete recurring rule',
                description: 'Removes the rule. Already-created transactions are kept.',
                security: bearerAuth,
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 204: { description: 'Deleted' }, 404: errorResponse },
            },
        },
        '/push/vapid-key': {
            get: {
                tags: ['Push'],
                summary: 'Get VAPID public key',
                description: 'Returns 503 when web push is not configured (no VAPID keys).',
                security: bearerAuth,
                responses: { 200: { description: 'Public key', content: { 'application/json': { example: { publicKey: 'B...' } } } }, 503: errorResponse },
            },
        },
        '/push/subscribe': {
            post: {
                tags: ['Push'],
                summary: 'Save a push subscription',
                security: bearerAuth,
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { type: 'object', required: ['subscription'], properties: { subscription: { type: 'object', description: 'Browser PushSubscription JSON' } } } } },
                },
                responses: { 201: { description: 'Subscribed' }, 400: errorResponse },
            },
            delete: {
                tags: ['Push'],
                summary: 'Remove a push subscription',
                security: bearerAuth,
                requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['endpoint'], properties: { endpoint: { type: 'string' } } } } } },
                responses: { 204: { description: 'Unsubscribed' }, 400: errorResponse },
            },
        },
    },
} as const;
