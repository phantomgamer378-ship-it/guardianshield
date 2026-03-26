document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const knobIconMoon = document.getElementById('knob-icon-moon');
    const knobIconSun = document.getElementById('knob-icon-sun');
    const passiveIconSun = document.getElementById('passive-icon-sun');
    const passiveIconMoon = document.getElementById('passive-icon-moon');

    function updateToggleIcons(theme) {
        if (!knobIconMoon) return;
        if (theme === 'light') {
            knobIconMoon.style.display = 'none';
            knobIconSun.style.display = 'block';
            passiveIconSun.style.display = 'none';
            passiveIconMoon.style.display = 'block';
        } else {
            knobIconMoon.style.display = 'block';
            knobIconSun.style.display = 'none';
            passiveIconSun.style.display = 'block';
            passiveIconMoon.style.display = 'none';
        }
    }

    if (themeToggleBtn) {
        updateToggleIcons(document.documentElement.getAttribute('data-theme') || 'dark');

        themeToggleBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            const nextTheme = current === 'dark' ? 'light' : 'dark';

            document.documentElement.setAttribute('data-theme', nextTheme);
            localStorage.setItem('gs-theme', nextTheme);

            updateToggleIcons(nextTheme);
        });
    }
});
