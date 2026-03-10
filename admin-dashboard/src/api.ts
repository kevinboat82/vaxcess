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
    (response) => response,
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
