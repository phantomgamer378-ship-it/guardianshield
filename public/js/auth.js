document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('error-msg');
            const btnText = document.getElementById('btn-text');

            try {
                btnText.textContent = "Processing...";
                errorMsg.classList.add('hidden');

                const res = await api.post('/auth/login', { email, password });
                api.setToken(res.token);
                window.location.href = 'home.html';
            } catch (error) {
                btnText.textContent = "Sign In";
                errorMsg.innerText = error.message.includes('Unexpected token') ? 'Failed to connect. Is server running?' : error.message;
                errorMsg.classList.remove('hidden');
            }
        });
    }

    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('error-msg');
            const btnText = document.getElementById('btn-text');

            try {
                btnText.textContent = "Processing...";
                errorMsg.classList.add('hidden');

                const res = await api.post('/auth/register', { name, email, phone, password });
                api.setToken(res.token);
                window.location.href = 'home.html';
            } catch (error) {
                btnText.textContent = "Create Account";
                errorMsg.innerText = error.message;
                errorMsg.classList.remove('hidden');
            }
        });
    }
});
