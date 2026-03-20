import axios from 'axios';

// The proxy in vite.config.ts handles mapping this to localhost:3000
// baseURL is configurable via env for deployment, defaults to /api for local dev proxy
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Request Interceptor: Attach the JWT token securely to every outgoing request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('vaxcess_admin_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle global 401s (Token expiration) gracefully
api.interceptors.response.use(
    (response) => {
        // Defensive check: If an endpoint is expected to return JSON but returns HTML (string)
        // this is usually a sign of a proxy misconfiguration or server crash returning a generic error page.
        const isJsonRequest = !response.config.url?.endsWith('.js') && !response.config.url?.endsWith('.css');

        if (isJsonRequest && typeof response.data === 'string' && response.data.trim().startsWith('<!DOCTYPE')) {
            console.error(`[API Error] Received HTML instead of JSON from ${response.config.url}. Possible proxy issue.`);
            console.debug('[API Error Content Snippet]:', response.data.substring(0, 200));
            // Return empty versions to prevent crashes
            response.data = response.config.url?.includes('overview') ? {} : [];
        }

        const listEndpoints = ['/auth/workers', '/children/registry', '/schedule/upcoming'];
        const isListEndpoint = listEndpoints.some(url => response.config.url?.includes(url));

        if (isListEndpoint && !Array.isArray(response.data)) {
            response.data = [];
        }

        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid, forcefully log out the UI.
            localStorage.removeItem('vaxcess_admin_token');
            // React router handles redirect to login
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
