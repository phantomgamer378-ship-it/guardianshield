document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const token = api.getToken();
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const user = await api.get('/user/profile');

        document.getElementById('p-name').textContent = user.name;
        document.getElementById('p-initial').textContent = user.name.charAt(0).toUpperCase();
        document.getElementById('p-email').textContent = user.email;
        document.getElementById('p-phone').textContent = user.phone;

        if (user.profilePic) {
            const imgEl = document.getElementById('p-avatar-img');
            imgEl.src = user.profilePic;
            imgEl.classList.remove('hidden');
            document.getElementById('p-initial').style.display = 'none';
        }

        const date = new Date(user.createdAt);
        document.getElementById('p-created').textContent = date.toLocaleDateString('en-IN', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

    } catch (error) {
        alert("Failed to load profile. Please log in again.");
        api.clearToken();
        window.location.href = 'login.html';
    }

    // Avatar Upload Handler
    const avatarUpload = document.getElementById('p-avatar-upload');
    if (avatarUpload) {
        avatarUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Optional: Basic validation
            if (file.size > 2 * 1024 * 1024) {
                alert('Image must be less than 2MB');
                return;
            }

            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64Str = event.target.result;
                try {
                    // Update preview instantly
                    const imgEl = document.getElementById('p-avatar-img');
                    imgEl.src = base64Str;
                    imgEl.classList.remove('hidden');
                    document.getElementById('p-initial').style.display = 'none';

                    // Save to server
                    await api.put('/user/profile/avatar', { profilePic: base64Str });
                } catch (err) {
                    alert('Failed to upload avatar: ' + err.message);
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // Password Update
    const pwdForm = document.getElementById('pwd-update-form');
    pwdForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPassword = document.getElementById('currentPwd').value;
        const newPassword = document.getElementById('newPwd').value;
        const msgDiv = document.getElementById('pwd-msg');
        const btnText = document.getElementById('pwd-btn-text');

        try {
            btnText.textContent = "Updating...";
            msgDiv.classList.add('hidden');

            await api.put('/user/profile/password', { currentPassword, newPassword });

            msgDiv.className = "p-4 rounded-xl text-sm border text-center font-medium bg-green-50 text-green-700 border-green-200 mb-6 block";
            msgDiv.textContent = "Password updated successfully.";
            pwdForm.reset();

        } catch (error) {
            msgDiv.className = "p-4 rounded-xl text-sm border text-center font-medium bg-red-50 text-red-600 border-red-200 mb-6 block";
            msgDiv.textContent = error.message;
        } finally {
            btnText.textContent = "Update Password";
        }
    });
});
