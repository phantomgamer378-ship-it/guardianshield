document.addEventListener('DOMContentLoaded', () => {
    const panel = document.getElementById('dock-panel');
    if (!panel) return;
    const items = panel.querySelectorAll('.dock-item');
    const baseItemSize = 50;
    const magnification = 70;
    const distance = 150;

    panel.addEventListener('mousemove', (e) => {
        items.forEach(item => {
            const rect = item.getBoundingClientRect();
            // We use the center of the base bounding box for stable calculation
            const center = rect.x + rect.width / 2;
            const d = Math.abs(e.clientX - center);
            
            let size = baseItemSize;
            if (d < distance) {
                // map [0, distance] to [magnification, baseItemSize]
                // easing slightly with out-sine can look nicer, but linear works
                const ratio = 1 - (d / distance);
                size = baseItemSize + (magnification - baseItemSize) * ratio;
            }
            item.style.width = `${size}px`;
            item.style.height = `${size}px`;
        });
    });

    panel.addEventListener('mouseleave', () => {
        items.forEach(item => {
            item.style.width = `${baseItemSize}px`;
            item.style.height = `${baseItemSize}px`;
        });
    });
});
