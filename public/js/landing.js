document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.getElementById('navbar');

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('bg-navy', 'shadow-lg');
            navbar.classList.remove('bg-navy/90', 'border-white/10');
        } else {
            navbar.classList.add('bg-navy/90', 'border-white/10');
            navbar.classList.remove('bg-navy', 'shadow-lg');
        }
    });

    // Glowing Effect Logic (Vanilla JS implementation of Aceternity UI's component)
    const handleGlowMove = (e) => {
        const glowCards = document.querySelectorAll('.glow-card');
        if (!glowCards.length) return;

        glowCards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const mouseX = e.clientX;
            const mouseY = e.clientY;

            const center = [rect.left + rect.width * 0.5, rect.top + rect.height * 0.5];
            const distanceFromCenter = Math.hypot(mouseX - center[0], mouseY - center[1]);

            const inactiveZone = 0.1; // Reduced to show effect more often
            const inactiveRadius = 0.5 * Math.min(rect.width, rect.height) * inactiveZone;

            // Optional: You can uncomment this to disable the glow if the mouse is in the center
            // if (distanceFromCenter < inactiveRadius) {
            //     card.style.setProperty("--active", "0");
            //     return;
            // }

            const proximity = 64; // Allows glowing even slightly outside the box
            const isActive =
                mouseX > rect.left - proximity &&
                mouseX < rect.right + proximity &&
                mouseY > rect.top - proximity &&
                mouseY < rect.bottom + proximity;

            card.style.setProperty("--active", isActive ? "1" : "0");

            if (!isActive) return;

            const targetAngle = (180 * Math.atan2(mouseY - center[1], mouseX - center[0])) / Math.PI + 90;
            card.style.setProperty("--start", String(targetAngle));
        });
    };

    window.addEventListener("scroll", () => handleGlowMove({ clientX: window.lastMouseX || 0, clientY: window.lastMouseY || 0 }), { passive: true });
    document.body.addEventListener("pointermove", (e) => {
        window.lastMouseX = e.clientX;
        window.lastMouseY = e.clientY;
        handleGlowMove(e);
    }, { passive: true });

    // Animated Menu Bar Logic
    const menuButtons = document.querySelectorAll('.menu-btn');
    if (menuButtons.length) {
        menuButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Prevent default behavior if needed (e.g. href="#")
                e.preventDefault();

                // Remove active classes from all buttons
                menuButtons.forEach(b => {
                    b.classList.remove('active', 'border-white/20', 'bg-white/10', 'text-white', 'font-semibold');
                    b.classList.add('border-transparent', 'bg-transparent', 'hover:bg-white/5', 'hover:text-white', 'text-gray-400');
                });

                // Add active classes to the clicked button
                btn.classList.remove('border-transparent', 'bg-transparent', 'hover:bg-white/5', 'hover:text-white', 'text-gray-400');
                btn.classList.add('active', 'border-white/20', 'bg-white/10', 'text-white', 'font-semibold');

                // Optional: Handle mobile tooltip logic (if visible, fade it out)
                const tooltip = btn.querySelector('.tooltip-label');
                if (window.innerWidth < 640 && tooltip) {
                    tooltip.classList.remove('opacity-0');
                    tooltip.classList.add('opacity-100');
                    setTimeout(() => {
                        tooltip.classList.remove('opacity-100');
                        tooltip.classList.add('opacity-0');
                    }, 1200);
                }
            });
        });
    }
});
