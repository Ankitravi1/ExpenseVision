

# Deployment Guide for ExpenseVision

This guide covers the steps to deploy ExpenseVision to a production environment (e.g., a VPS like DigitalOcean, AWS EC2, or a dedicated server).

## 1. Environment Variables

Ensure you have the correct environment variables set for both the frontend and backend.

### Backend (`backend/.env`)

Create a `.env` file in the `backend` directory:

```env
# Port for the backend server
PORT=5000

# Database URL (SQLite file path)
DATABASE_URL="file:./dev.db"

# JWT Secret (Generate a strong random string)
JWT_SECRET=your_super_secret_jwt_key_here

# Google OAuth Credentials (from Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://your-domain.com/api/auth/google/callback

# Frontend URL (for CORS)
FRONTEND_URL=http://your-domain.com

# VAPID Keys for Push Notifications (generate with `node backend/generate-keys.cjs`)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

### Frontend (`.env`)

Create a `.env` file in the root directory:

```env
# URL of your deployed backend API
VITE_API_URL=http://your-domain.com/api

# Google OAuth Client ID (Must match the one in backend)
VITE_GOOGLE_CLIENT_ID=your_google_client_id

```

## 2. Building the Frontend

For production, you should build the React frontend into static files.

1.  Navigate to the root directory.
2.  Run the build command:
    ```bash
    npm run build
    ```
3.  This will create a `dist` directory containing the static files (HTML, CSS, JS).

## 3. Serving the Application

### Option A: Serve Frontend via Backend (Recommended for simple deployments)

You can configure the backend to serve the static frontend files.

1.  Copy the `dist` folder from the root to `backend/public` (create the folder if it doesn't exist).
2.  Ensure your `server.ts` is set up to serve static files from `public`.

### Option B: Reverse Proxy (Nginx/Apache)

Set up Nginx to serve the `dist` folder for the root path `/` and proxy `/api` requests to `localhost:5000`.

Example Nginx Config:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/expensevision/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 4. Keeping the Backend Running (PM2)

Use `pm2` to keep your Node.js backend running continuously, even after system reboots.

1.  **Install PM2 globally:**
    ```bash
    npm install -g pm2
    ```

2.  **Start the backend:**
    Navigate to the `backend` directory and run:
    ```bash
    # If using ts-node directly (dev/test)
    pm2 start src/server.ts --interpreter ./node_modules/.bin/ts-node --name expensevision-backend

    # OR if you compiled TypeScript to JS (recommended for prod)
    # npm run build (in backend)
    # pm2 start dist/server.js --name expensevision-backend
    ```

3.  **Save the process list:**
    ```bash
    pm2 save
    ```

4.  **Setup startup script:**
    This command generates a script to resurrect PM2 processes on boot. Run the command output by:
    ```bash
    pm2 startup
    ```

5.  **Monitoring:**
    - View status: `pm2 status`
    - View logs: `pm2 logs expensevision-backend`
    - Restart: `pm2 restart expensevision-backend`

## 5. SSL/HTTPS (Important)

For Push Notifications and Service Workers to work, **HTTPS is required**.
Use Certbot (Let's Encrypt) to automatically generate and renew SSL certificates for your Nginx/Apache server.

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```
