const API_BASE = '/api';

/**
 * Google OAuth Token Pickup
 * After Google OAuth, the server redirects to home.html?token=...&user=...
 * We pick up the token and user data here and clean the URL.
 */
(function pickupGoogleOAuthToken() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userJson = params.get('user');

    if (token) {
        localStorage.setItem('gs_token', token);
        if (userJson) {
            try {
                const user = JSON.parse(decodeURIComponent(userJson));
                localStorage.setItem('gs_user', JSON.stringify(user));
            } catch (_) { /* ignore parse errors */ }
        }
        // Remove token & user from the URL without a page reload
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }

    // Show error toast if Google auth failed
    const error = params.get('error');
    if (error) {
        const messages = {
            google_failed: 'Google sign-in failed. Please try again.',
            no_email: 'Your Google account did not share an email address.',
            google_auth_failed: 'Google authentication failed.',
            server_error: 'A server error occurred. Please try again.',
            create_failed: 'Could not create your account. Please try again.',
        };
        const msg = messages[error] || 'Google sign-in failed.';
        // Show a toast or error message if we're on login/signup page
        const errEl = document.getElementById('error-msg');
        if (errEl) {
            errEl.textContent = msg;
            errEl.classList.remove('hidden');
        } else {
            console.warn('[Google OAuth Error]', msg);
        }
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
})();


const api = {
    getToken: () => localStorage.getItem('gs_token'),
    setToken: (token) => localStorage.setItem('gs_token', token),
    clearToken: () => localStorage.removeItem('gs_token'),

    request: async (endpoint, options = {}) => {
        const token = api.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (options.body instanceof FormData) {
            delete headers['Content-Type']; // Let browser set multipart boundary
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
        });

        let data;
        try {
            data = await response.json();
        } catch (e) {
            throw new Error('Server returned an invalid response. Is the server running?');
        }

        if (!response.ok) {
            if (response.status === 401) {
                api.clearToken();
                window.location.href = 'login.html';
                return; // stop further execution
            }
            throw new Error(data.message || data.error || `Server error (${response.status})`);
        }

        return data;
    },

    post: (endpoint, body) => api.request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    get: (endpoint) => api.request(endpoint, { method: 'GET' }),
    put: (endpoint, body) => api.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
    postForm: (endpoint, formData) => api.request(endpoint, { method: 'POST', body: formData }),
};
