import { authService } from './auth';

const API_URL = 'http://localhost:5000/api';

interface RequestOptions extends RequestInit {
    headers?: Record<string, string>;
}

export const api = {
    fetch: async (endpoint: string, options: RequestOptions = {}) => {
        let token = authService.getToken();

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        let response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        // Handle 401 Unauthorized (Token expired)
        if (response.status === 401) {
            const refreshToken = authService.getRefreshToken();

            if (refreshToken) {
                try {
                    // Try to refresh token
                    const refreshResponse = await fetch(`${API_URL}/auth/refresh-token`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refreshToken }),
                    });

                    if (refreshResponse.ok) {
                        const data = await refreshResponse.json();
                        authService.setTokens(data.token, data.refreshToken);

                        // Retry original request with new token
                        headers['Authorization'] = `Bearer ${data.token}`;
                        response = await fetch(`${API_URL}${endpoint}`, {
                            ...options,
                            headers,
                        });
                    } else {
                        // Refresh failed, logout
                        authService.logout();
                        window.location.href = '/'; // Redirect to landing
                    }
                } catch (error) {
                    authService.logout();
                    window.location.href = '/';
                }
            } else {
                // No refresh token, logout
                authService.logout();
            }
        }

        return response;
    },
};
