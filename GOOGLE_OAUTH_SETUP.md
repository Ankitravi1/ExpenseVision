# Google OAuth Setup Guide for ExpenseVision

If you are encountering the `Error 401: invalid_client` or "The OAuth client was not found" error, follow these steps to configure your Google Cloud Console correctly.

## 1. Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.

## 2. Configure OAuth Consent Screen
1. Navigate to **APIs & Services > OAuth consent screen**.
2. Select **External** (or Internal if you have a Workspace organization) and click **Create**.
3. Fill in the required fields:
   - **App Name**: ExpenseVision
   - **User Support Email**: Your email
   - **Developer Contact Information**: Your email
4. Click **Save and Continue**.
5. (Optional) Add Scopes: `userinfo.email`, `userinfo.profile`.
6. **Test Users**: Add your email address (`ankitravione@gmail.com`) to the list of test users. **This is critical while the app is in "Testing" mode.**

## 3. Create OAuth Credentials
1. Navigate to **APIs & Services > Credentials**.
2. Click **Create Credentials** > **OAuth client ID**.
3. Select **Web application** as the Application type.
4. Name it "ExpenseVision Web".
5. **Authorized JavaScript origins**:
   - Add the URL where your frontend is running.
   - Typically: `http://localhost:5173` (Check your browser address bar to be sure).
   - Also add: `http://localhost:3000` (if you run it there).
6. **Authorized redirect URIs**:
   - For the Google Login button popup flow, you might not strictly need this, but it's good practice to add your base URL: `http://localhost:5173`.
7. Click **Create**.

## 4. Update Environment Variables
1. Copy the **Client ID** (it looks like `123456789-xxxx.apps.googleusercontent.com`).
2. Open your frontend `.env` file (`C:\Users\Administrator\Documents\0Project\expensevision\.env`).
3. Update the variable:
   ```env
   VITE_GOOGLE_CLIENT_ID=your_copied_client_id_here
   ```
4. **Restart your Vite server**:
   - Stop the terminal process (Ctrl+C).
   - Run `npm run dev` again.

## Troubleshooting
- **Clear Cache**: Sometimes the browser caches the old configuration. Try opening the app in an Incognito window.
- **Wait a few minutes**: Google changes can take a few minutes to propagate.
- **Check Port**: Ensure your app is actually running on the port you specified in "Authorized JavaScript origins".
