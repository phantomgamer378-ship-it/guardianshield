const API_BASE = '/api';

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
