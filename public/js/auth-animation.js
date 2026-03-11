document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        mouseX: 0, mouseY: 0,
        showPassword: false, passwordLength: 0, isTyping: false,
        isPurpleBlinking: false, isBlackBlinking: false,
        isLookingAtEachOther: false, isPurplePeeking: false,
    };

    // Elements
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const togglePasswordIcon = document.getElementById('toggle-password-icon');

    // Character Refs
    const purpleRef = document.getElementById('char-purple');
    const blackRef = document.getElementById('char-black');
    const orangeRef = document.getElementById('char-orange');
    const yellowRef = document.getElementById('char-yellow');

    const chars = {
        purple: { el: purpleRef, eyes: document.getElementById('purple-eyes') },
        black: { el: blackRef, eyes: document.getElementById('black-eyes') },
        orange: { el: orangeRef, eyes: document.getElementById('orange-eyes') },
        yellow: { el: yellowRef, eyes: document.getElementById('yellow-eyes') },
        yellowMouth: document.getElementById('yellow-mouth')
    };

    if (!purpleRef) return; // Exit if not on auth page with characters

    // Input Events
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            state.passwordLength = e.target.value.length;
            render();
        });
        passwordInput.addEventListener('focus', () => {
            setTyping(true);
        });
        passwordInput.addEventListener('blur', () => {
            setTyping(false);
        });
    }

    if (emailInput) {
        emailInput.addEventListener('focus', () => { setTyping(true); });
        emailInput.addEventListener('blur', () => { setTyping(false); });
    }

    const nameInput = document.getElementById('name');
    if (nameInput) {
        nameInput.addEventListener('focus', () => { setTyping(true); });
        nameInput.addEventListener('blur', () => { setTyping(false); });
    }
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('focus', () => { setTyping(true); });
        phoneInput.addEventListener('blur', () => { setTyping(false); });
    }

    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            state.showPassword = !state.showPassword;
            if (passwordInput) {
                passwordInput.type = state.showPassword ? 'text' : 'password';
            }
            if (togglePasswordIcon) {
                if (state.showPassword) {
                    togglePasswordIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />`;
                } else {
                    togglePasswordIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />`;
                }
            }
            render();
        });
    }

    // Mouse Tracking
    window.addEventListener("mousemove", (e) => {
        state.mouseX = e.clientX;
        state.mouseY = e.clientY;
        window.requestAnimationFrame(render);
    });

    // Sub-systems
    let lookTimer = null;
    const setTyping = (typing) => {
        if (typing && !state.isTyping) {
            state.isLookingAtEachOther = true;
            clearTimeout(lookTimer);
            lookTimer = setTimeout(() => {
                state.isLookingAtEachOther = false;
                render();
            }, 800);
        } else if (!typing) {
            state.isLookingAtEachOther = false;
            clearTimeout(lookTimer);
        }
        state.isTyping = typing;
        render();
    };

    let peekTimer = null;
    let peeLoop = null;
    const checkPeekingConfig = () => {
        if (state.passwordLength > 0 && state.showPassword) {
            if (!peeLoop) {
                const schedulePeek = () => {
                    peeLoop = setTimeout(() => {
                        state.isPurplePeeking = true; render();
                        setTimeout(() => { state.isPurplePeeking = false; render(); }, 800);
                        schedulePeek();
                    }, Math.random() * 3000 + 2000);
                }
                schedulePeek();
            }
        } else {
            clearTimeout(peeLoop);
            peeLoop = null;
            state.isPurplePeeking = false;
        }
    }

    const blinkLoop = (charKey) => {
        const flag = charKey === 'purple' ? 'isPurpleBlinking' : 'isBlackBlinking';
        setTimeout(() => {
            state[flag] = true; render();
            setTimeout(() => {
                state[flag] = false; render();
                blinkLoop(charKey);
            }, 150);
        }, Math.random() * 4000 + 3000);
    }
    blinkLoop('purple');
    blinkLoop('black');

    // Computations
    const calculatePosition = (ref) => {
        if (!ref) return { faceX: 0, faceY: 0, bodySkew: 0 };
        const rect = ref.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 3;

        const deltaX = state.mouseX - centerX;
        const deltaY = state.mouseY - centerY;

        const faceX = Math.max(-15, Math.min(15, deltaX / 20));
        const faceY = Math.max(-10, Math.min(10, deltaY / 30));
        const bodySkew = Math.max(-6, Math.min(6, -deltaX / 120));

        return { faceX, faceY, bodySkew };
    };

    const getPupilTransform = (eyeEl, size, maxDistance, forceLookX, forceLookY) => {
        if (forceLookX !== undefined && forceLookY !== undefined) {
            return `translate(${forceLookX}px, ${forceLookY}px)`;
        }
        const eye = eyeEl.getBoundingClientRect();
        const eyeCenterX = eye.left + eye.width / 2;
        const eyeCenterY = eye.top + eye.height / 2;

        const deltaX = state.mouseX - eyeCenterX;
        const deltaY = state.mouseY - eyeCenterY;
        const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

        const angle = Math.atan2(deltaY, deltaX);
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        return `translate(${x}px, ${y}px)`;
    };

    const render = () => {
        checkPeekingConfig();

        const pPos = calculatePosition(chars.purple.el);
        const bPos = calculatePosition(chars.black.el);
        const oPos = calculatePosition(chars.orange.el);
        const yPos = calculatePosition(chars.yellow.el);

        const pwExposed = state.passwordLength > 0 && state.showPassword;
        const typingHidden = state.isTyping || (state.passwordLength > 0 && !state.showPassword);

        // -- Purple --
        if (chars.purple.el && chars.purple.eyes) {
            const el = chars.purple.el;
            const eyes = chars.purple.eyes;

            el.style.height = typingHidden ? '440px' : '400px';
            el.style.transform = pwExposed
                ? `skewX(0deg)`
                : typingHidden ? `skewX(${pPos.bodySkew - 12}deg) translateX(40px)` : `skewX(${pPos.bodySkew}deg)`;

            const left = pwExposed ? 20 : state.isLookingAtEachOther ? 55 : (45 + pPos.faceX);
            const top = pwExposed ? 35 : state.isLookingAtEachOther ? 65 : (40 + pPos.faceY);
            eyes.style.left = `${left}px`;
            eyes.style.top = `${top}px`;

            // Blinking
            const eyeBalls = eyes.querySelectorAll('.eyeball');
            eyeBalls.forEach(eb => {
                eb.style.height = state.isPurpleBlinking ? '2px' : '18px';
                if (!state.isPurpleBlinking) {
                    const pupil = eb.querySelector('.pupil');
                    if (pupil) {
                        const fx = pwExposed ? (state.isPurplePeeking ? 4 : -4) : state.isLookingAtEachOther ? 3 : undefined;
                        const fy = pwExposed ? (state.isPurplePeeking ? 5 : -4) : state.isLookingAtEachOther ? 4 : undefined;
                        pupil.style.transform = getPupilTransform(eb, 7, 5, fx, fy);
                    }
                }
            });
        }

        // -- Black --
        if (chars.black.el && chars.black.eyes) {
            const el = chars.black.el;
            const eyes = chars.black.eyes;

            el.style.transform = pwExposed
                ? `skewX(0deg)`
                : state.isLookingAtEachOther ? `skewX(${bPos.bodySkew * 1.5 + 10}deg) translateX(20px)`
                    : typingHidden ? `skewX(${bPos.bodySkew * 1.5}deg)` : `skewX(${bPos.bodySkew}deg)`;

            const left = pwExposed ? 10 : state.isLookingAtEachOther ? 32 : (26 + bPos.faceX);
            const top = pwExposed ? 28 : state.isLookingAtEachOther ? 12 : (32 + bPos.faceY);
            eyes.style.left = `${left}px`;
            eyes.style.top = `${top}px`;

            const eyeBalls = eyes.querySelectorAll('.eyeball');
            eyeBalls.forEach(eb => {
                eb.style.height = state.isBlackBlinking ? '2px' : '16px';
                if (!state.isBlackBlinking) {
                    const pupil = eb.querySelector('.pupil');
                    if (pupil) {
                        const fx = pwExposed ? -4 : state.isLookingAtEachOther ? 0 : undefined;
                        const fy = pwExposed ? -4 : state.isLookingAtEachOther ? -4 : undefined;
                        pupil.style.transform = getPupilTransform(eb, 6, 4, fx, fy);
                    }
                }
            });
        }

        // -- Orange --
        if (chars.orange.el && chars.orange.eyes) {
            const el = chars.orange.el;
            const eyes = chars.orange.eyes;

            el.style.transform = pwExposed ? `skewX(0deg)` : `skewX(${oPos.bodySkew}deg)`;

            const left = pwExposed ? 50 : (82 + oPos.faceX);
            const top = pwExposed ? 85 : (90 + oPos.faceY);
            eyes.style.left = `${left}px`;
            eyes.style.top = `${top}px`;

            const pupils = eyes.querySelectorAll('.pupil');
            pupils.forEach(pupil => {
                const fx = pwExposed ? -5 : undefined;
                const fy = pwExposed ? -4 : undefined;
                pupil.style.transform = getPupilTransform(pupil, 12, 5, fx, fy);
            });
        }

        // -- Yellow --
        if (chars.yellow.el && chars.yellow.eyes) {
            const el = chars.yellow.el;
            const eyes = chars.yellow.eyes;
            const mouth = chars.yellowMouth;

            el.style.transform = pwExposed ? `skewX(0deg)` : `skewX(${yPos.bodySkew}deg)`;

            const left = pwExposed ? 20 : (52 + yPos.faceX);
            const top = pwExposed ? 35 : (40 + yPos.faceY);
            eyes.style.left = `${left}px`;
            eyes.style.top = `${top}px`;

            const pupils = eyes.querySelectorAll('.pupil');
            pupils.forEach(pupil => {
                const fx = pwExposed ? -5 : undefined;
                const fy = pwExposed ? -4 : undefined;
                pupil.style.transform = getPupilTransform(pupil, 12, 5, fx, fy);
            });

            if (mouth) {
                mouth.style.left = pwExposed ? `10px` : `${40 + yPos.faceX}px`;
                mouth.style.top = pwExposed ? `88px` : `${88 + yPos.faceY}px`;
            }
        }
    };

    // Delay initial render slightly to ensure CSS layouts
    setTimeout(render, 100);
});
