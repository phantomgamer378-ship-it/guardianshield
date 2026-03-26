(function() {
    function initShapeGrid(canvasId, config) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const direction = config.direction || 'diagonal';
        const speed = config.speed || 0.5;
        const borderColor = config.borderColor || '#271E37';
        const squareSize = config.squareSize || 40;
        const hoverFillColor = config.hoverFillColor || '#222222';
        const shape = config.shape || 'square';
        const hoverTrailAmount = config.hoverTrailAmount || 0;

        let requestRef;
        let numSquaresX = 0;
        let numSquaresY = 0;
        const gridOffset = { x: 0, y: 0 };
        let hoveredSquare = null;
        let trailCells = [];
        let cellOpacities = new Map();

        const isHex = shape === 'hexagon';
        const isTri = shape === 'triangle';
        const hexHoriz = squareSize * 1.5;
        const hexVert = squareSize * Math.sqrt(3);

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            numSquaresX = Math.ceil(canvas.width / squareSize) + 1;
            numSquaresY = Math.ceil(canvas.height / squareSize) + 1;
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        const drawHex = (cx, cy, size) => {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const vx = cx + size * Math.cos(angle);
                const vy = cy + size * Math.sin(angle);
                if (i === 0) ctx.moveTo(vx, vy);
                else ctx.lineTo(vx, vy);
            }
            ctx.closePath();
        };

        const drawCircle = (cx, cy, size) => {
            ctx.beginPath();
            ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
            ctx.closePath();
        };

        const drawTriangle = (cx, cy, size, flip) => {
            ctx.beginPath();
            if (flip) {
                ctx.moveTo(cx, cy + size / 2);
                ctx.lineTo(cx + size / 2, cy - size / 2);
                ctx.lineTo(cx - size / 2, cy - size / 2);
            } else {
                ctx.moveTo(cx, cy - size / 2);
                ctx.lineTo(cx + size / 2, cy + size / 2);
                ctx.lineTo(cx - size / 2, cy + size / 2);
            }
            ctx.closePath();
        };

        const drawGrid = () => {
            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            const currentBorder = isLight ? 'rgba(16, 185, 129, 0.15)' : borderColor;
            const currentHover = isLight ? 'rgba(16, 185, 129, 0.08)' : hoverFillColor;
            const currentBg = isLight ? '#f6fff8' : '#07090f';

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (isHex) {
                const colShift = Math.floor(gridOffset.x / hexHoriz);
                const offsetX = ((gridOffset.x % hexHoriz) + hexHoriz) % hexHoriz;
                const offsetY = ((gridOffset.y % hexVert) + hexVert) % hexVert;

                const cols = Math.ceil(canvas.width / hexHoriz) + 3;
                const rows = Math.ceil(canvas.height / hexVert) + 3;

                for (let col = -2; col < cols; col++) {
                    for (let row = -2; row < rows; row++) {
                        const cx = col * hexHoriz + offsetX;
                        const cy = row * hexVert + ((col + colShift) % 2 !== 0 ? hexVert / 2 : 0) + offsetY;

                        const cellKey = `${col},${row}`;
                        const alpha = cellOpacities.get(cellKey);
                        if (alpha) {
                            ctx.globalAlpha = alpha;
                            drawHex(cx, cy, squareSize);
                            ctx.fillStyle = currentHover;
                            ctx.fill();
                            ctx.globalAlpha = 1;
                        }

                        drawHex(cx, cy, squareSize);
                        ctx.strokeStyle = currentBorder;
                        ctx.stroke();
                    }
                }
            } else if (isTri) {
                const halfW = squareSize / 2;
                const colShift = Math.floor(gridOffset.x / halfW);
                const rowShift = Math.floor(gridOffset.y / squareSize);
                const offsetX = ((gridOffset.x % halfW) + halfW) % halfW;
                const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;

                const cols = Math.ceil(canvas.width / halfW) + 4;
                const rows = Math.ceil(canvas.height / squareSize) + 4;

                for (let col = -2; col < cols; col++) {
                    for (let row = -2; row < rows; row++) {
                        const cx = col * halfW + offsetX;
                        const cy = row * squareSize + squareSize / 2 + offsetY;
                        const flip = ((col + colShift + row + rowShift) % 2 + 2) % 2 !== 0;

                        const cellKey = `${col},${row}`;
                        const alpha = cellOpacities.get(cellKey);
                        if (alpha) {
                            ctx.globalAlpha = alpha;
                            drawTriangle(cx, cy, squareSize, flip);
                            ctx.fillStyle = currentHover;
                            ctx.fill();
                            ctx.globalAlpha = 1;
                        }

                        drawTriangle(cx, cy, squareSize, flip);
                        ctx.strokeStyle = currentBorder;
                        ctx.stroke();
                    }
                }
            } else if (shape === 'circle') {
                const offsetX = ((gridOffset.x % squareSize) + squareSize) % squareSize;
                const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;

                const cols = Math.ceil(canvas.width / squareSize) + 3;
                const rows = Math.ceil(canvas.height / squareSize) + 3;

                for (let col = -2; col < cols; col++) {
                    for (let row = -2; row < rows; row++) {
                        const cx = col * squareSize + squareSize / 2 + offsetX;
                        const cy = row * squareSize + squareSize / 2 + offsetY;

                        const cellKey = `${col},${row}`;
                        const alpha = cellOpacities.get(cellKey);
                        if (alpha) {
                            ctx.globalAlpha = alpha;
                            drawCircle(cx, cy, squareSize);
                            ctx.fillStyle = currentHover;
                            ctx.fill();
                            ctx.globalAlpha = 1;
                        }

                        drawCircle(cx, cy, squareSize);
                        ctx.strokeStyle = currentBorder;
                        ctx.stroke();
                    }
                }
            } else {
                const offsetX = ((gridOffset.x % squareSize) + squareSize) % squareSize;
                const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;

                const cols = Math.ceil(canvas.width / squareSize) + 3;
                const rows = Math.ceil(canvas.height / squareSize) + 3;

                for (let col = -2; col < cols; col++) {
                    for (let row = -2; row < rows; row++) {
                        const sx = col * squareSize + offsetX;
                        const sy = row * squareSize + offsetY;

                        const cellKey = `${col},${row}`;
                        const alpha = cellOpacities.get(cellKey);
                        if (alpha) {
                            ctx.globalAlpha = alpha;
                            ctx.fillStyle = currentHover;
                            ctx.fillRect(sx, sy, squareSize, squareSize);
                            ctx.globalAlpha = 1;
                        }

                        ctx.strokeStyle = currentBorder;
                        ctx.strokeRect(sx, sy, squareSize, squareSize);
                    }
                }
            }

            const gradient = ctx.createRadialGradient(
                canvas.width / 2,
                canvas.height / 2,
                0,
                canvas.width / 2,
                canvas.height / 2,
                Math.sqrt(canvas.width ** 2 + canvas.height ** 2) / 2
            );
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(1, currentBg);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        };

        const updateAnimation = () => {
            const effectiveSpeed = Math.max(speed, 0.1);
            const wrapX = isHex ? hexHoriz * 2 : squareSize;
            const wrapY = isHex ? hexVert : isTri ? squareSize * 2 : squareSize;

            switch (direction) {
                case 'right':
                    gridOffset.x = (gridOffset.x - effectiveSpeed + wrapX) % wrapX;
                    break;
                case 'left':
                    gridOffset.x = (gridOffset.x + effectiveSpeed + wrapX) % wrapX;
                    break;
                case 'up':
                    gridOffset.y = (gridOffset.y + effectiveSpeed + wrapY) % wrapY;
                    break;
                case 'down':
                    gridOffset.y = (gridOffset.y - effectiveSpeed + wrapY) % wrapY;
                    break;
                case 'diagonal':
                    gridOffset.x = (gridOffset.x - effectiveSpeed + wrapX) % wrapX;
                    gridOffset.y = (gridOffset.y - effectiveSpeed + wrapY) % wrapY;
                    break;
            }

            updateCellOpacities();
            drawGrid();
            requestRef = requestAnimationFrame(updateAnimation);
        };

        const updateCellOpacities = () => {
            const targets = new Map();

            if (hoveredSquare) {
                targets.set(`${hoveredSquare.x},${hoveredSquare.y}`, 1);
            }

            if (hoverTrailAmount > 0) {
                for (let i = 0; i < trailCells.length; i++) {
                    const t = trailCells[i];
                    const key = `${t.x},${t.y}`;
                    if (!targets.has(key)) {
                        targets.set(key, (trailCells.length - i) / (trailCells.length + 1));
                    }
                }
            }

            for (const [key] of targets) {
                if (!cellOpacities.has(key)) {
                    cellOpacities.set(key, 0);
                }
            }

            for (const [key, opacity] of cellOpacities) {
                const target = targets.get(key) || 0;
                const next = opacity + (target - opacity) * 0.15;
                if (next < 0.005) {
                    cellOpacities.delete(key);
                } else {
                    cellOpacities.set(key, next);
                }
            }
        };

        const handleMouseMove = event => {
            const mouseX = event.clientX;
            const mouseY = event.clientY;

            if (isHex) {
                const colShift = Math.floor(gridOffset.x / hexHoriz);
                const offsetX = ((gridOffset.x % hexHoriz) + hexHoriz) % hexHoriz;
                const offsetY = ((gridOffset.y % hexVert) + hexVert) % hexVert;
                const adjustedX = mouseX - offsetX;
                const adjustedY = mouseY - offsetY;

                const col = Math.round(adjustedX / hexHoriz);
                const rowOffset = (col + colShift) % 2 !== 0 ? hexVert / 2 : 0;
                const row = Math.round((adjustedY - rowOffset) / hexVert);

                if (
                    !hoveredSquare ||
                    hoveredSquare.x !== col ||
                    hoveredSquare.y !== row
                ) {
                    if (hoveredSquare && hoverTrailAmount > 0) {
                        trailCells.unshift({ ...hoveredSquare });
                        if (trailCells.length > hoverTrailAmount) trailCells.length = hoverTrailAmount;
                    }
                    hoveredSquare = { x: col, y: row };
                }
            } else if (isTri) {
                const halfW = squareSize / 2;
                const offsetX = ((gridOffset.x % halfW) + halfW) % halfW;
                const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;

                const adjustedX = mouseX - offsetX;
                const adjustedY = mouseY - offsetY;

                const col = Math.round(adjustedX / halfW);
                const row = Math.floor(adjustedY / squareSize);

                if (
                    !hoveredSquare ||
                    hoveredSquare.x !== col ||
                    hoveredSquare.y !== row
                ) {
                    if (hoveredSquare && hoverTrailAmount > 0) {
                        trailCells.unshift({ ...hoveredSquare });
                        if (trailCells.length > hoverTrailAmount) trailCells.length = hoverTrailAmount;
                    }
                    hoveredSquare = { x: col, y: row };
                }
            } else if (shape === 'circle') {
                const offsetX = ((gridOffset.x % squareSize) + squareSize) % squareSize;
                const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;

                const adjustedX = mouseX - offsetX;
                const adjustedY = mouseY - offsetY;

                const col = Math.round(adjustedX / squareSize);
                const row = Math.round(adjustedY / squareSize);

                if (
                    !hoveredSquare ||
                    hoveredSquare.x !== col ||
                    hoveredSquare.y !== row
                ) {
                    if (hoveredSquare && hoverTrailAmount > 0) {
                        trailCells.unshift({ ...hoveredSquare });
                        if (trailCells.length > hoverTrailAmount) trailCells.length = hoverTrailAmount;
                    }
                    hoveredSquare = { x: col, y: row };
                }
            } else {
                const offsetX = ((gridOffset.x % squareSize) + squareSize) % squareSize;
                const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;

                const adjustedX = mouseX - offsetX;
                const adjustedY = mouseY - offsetY;

                const col = Math.floor(adjustedX / squareSize);
                const row = Math.floor(adjustedY / squareSize);

                if (
                    !hoveredSquare ||
                    hoveredSquare.x !== col ||
                    hoveredSquare.y !== row
                ) {
                    if (hoveredSquare && hoverTrailAmount > 0) {
                        trailCells.unshift({ ...hoveredSquare });
                        if (trailCells.length > hoverTrailAmount) trailCells.length = hoverTrailAmount;
                    }
                    hoveredSquare = { x: col, y: row };
                }
            }
        };

        const handleMouseLeave = () => {
            if (hoveredSquare && hoverTrailAmount > 0) {
                trailCells.unshift({ ...hoveredSquare });
                if (trailCells.length > hoverTrailAmount) trailCells.length = hoverTrailAmount;
            }
            hoveredSquare = null;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        requestRef = requestAnimationFrame(updateAnimation);
    }

    document.addEventListener('DOMContentLoaded', () => {
        initShapeGrid('shapegrid-canvas', {
            direction: 'diagonal',
            borderColor: '#271E37',
            hoverFillColor: '#222222',
            squareSize: 40,
            shape: 'square',
            hoverTrailAmount: 0,
            speed: 0.5
        });
    });
})();
