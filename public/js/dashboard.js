/* ============================================================
   GuardianShield — Dashboard JS
   All DOM interactions for the redesigned home.html
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

    // =========================================================
    // 1. AUTH CHECK
    // =========================================================
    const token = api.getToken();
    if (!token) {
        window.location.href = 'login.html';
        return;
    }



    // =========================================================
    // 2. LOAD USER PROFILE

    // =========================================================
    try {
        const user = await api.get('/user/profile');
        const uName = user.name || 'Guardian';
        const emailOrPhone = user.phone || user.email || '';

        // Navbar
        setText('user-name', uName);
        setText('user-phone', emailOrPhone);
        setText('user-initial', uName.charAt(0).toUpperCase());

        if (user.profilePic) {
            const avatarImg = document.getElementById('user-avatar-img');
            const userInitial = document.getElementById('user-initial');
            if (avatarImg && userInitial) {
                avatarImg.src = user.profilePic;
                avatarImg.classList.add('visible');
                userInitial.style.display = 'none';
            }
        }

        // Mobile dropdown header
        setText('mobile-user-name', uName);
        setText('mobile-user-phone', emailOrPhone);

        // Hero greeting
        setText('hero-user-name', uName.split(' ')[0]);

        loadActivity();
    } catch (err) {
        console.error('Failed to load profile:', err.message);
    }

    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    // =========================================================
    // 3. PROFILE DROPDOWN
    // =========================================================
    const dropBtn = document.getElementById('profile-dropdown-btn');
    const dropMenu = document.getElementById('profile-dropdown-menu');

    function openDropdown() {
        dropMenu.classList.remove('hidden');
        dropMenu.style.opacity = '0';
        dropMenu.style.transform = 'scale(0.95) translateY(-4px)';
        requestAnimationFrame(() => {
            dropMenu.style.transition = 'opacity 200ms, transform 200ms';
            dropMenu.style.opacity = '1';
            dropMenu.style.transform = 'scale(1) translateY(0)';
        });
    }

    function closeDropdown() {
        dropMenu.style.opacity = '0';
        dropMenu.style.transform = 'scale(0.95) translateY(-4px)';
        setTimeout(() => dropMenu.classList.add('hidden'), 200);
    }

    if (dropBtn && dropMenu) {
        dropBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropMenu.classList.contains('hidden') ? openDropdown() : closeDropdown();
        });

        document.addEventListener('click', (e) => {
            if (!dropMenu.contains(e.target) && !dropBtn.contains(e.target)) {
                if (!dropMenu.classList.contains('hidden')) closeDropdown();
            }
        });
    }

    // =========================================================
    // 4. LOGOUT
    // =========================================================
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            api.clearToken();
            window.location.href = 'login.html';
        });
    }

    // =========================================================
    // 5. NAVIGATION (sidebar + mobile tabs share same logic)
    // =========================================================
    const allNavBtns = document.querySelectorAll('.gs-nav-btn[data-target]');
    const allSections = document.querySelectorAll('.content-section');

    function activateSection(targetId) {
        // Buttons
        allNavBtns.forEach(b => {
            if (b.getAttribute('data-target') === targetId) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });

        // Sections
        allSections.forEach(sec => {
            if (sec.id === targetId) {
                sec.classList.add('active');
            } else {
                sec.classList.remove('active');
            }
        });

        if (targetId === 'dash-overview') loadActivity();
    }

    allNavBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            activateSection(btn.getAttribute('data-target'));
        });
    });

    // Handle deep linking from index.html animated menu 
    if (window.location.hash) {
        const targetId = window.location.hash.substring(1);
        const targetSection = document.getElementById(targetId);
        if (targetSection && targetSection.classList.contains('content-section')) {
            activateSection(targetId);
        }
    }

    // =========================================================
    // 6. PHONE SCAN
    // =========================================================
    const phoneScanForm = document.getElementById('phone-scan-form');
    const phoneScanBtn = document.getElementById('phone-scan-btn');
    const phoneSpinner = document.getElementById('phone-spinner');
    const phoneBtnIcon = document.getElementById('phone-btn-icon');
    const phoneBtnText = document.getElementById('phone-btn-text');
    const phoneResultArea = document.getElementById('phone-result-area');

    phoneScanForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phone = document.getElementById('scan-phone-input').value.trim();

        setBtnLoading(phoneScanBtn, phoneSpinner, phoneBtnIcon, phoneBtnText, true, 'Analyzing…');
        phoneResultArea.style.display = 'none';

        try {
            const result = await api.post('/phone/analyze', { phoneNumber: phone });

            let cls, icon;
            if (result.riskLevel === 'high') {
                cls = 'danger';
                icon = dangerIcon('var(--col-danger)');
            } else if (result.riskLevel === 'medium') {
                cls = 'warning';
                icon = warningIcon('var(--col-warning)');
            } else {
                cls = 'safe';
                icon = safeIcon('var(--col-success)');
            }

            phoneResultArea.innerHTML = `
                <div class="gs-result ${cls}">
                    <div class="gs-result-icon">${icon}</div>
                    <div style="flex:1">
                        <h4>${capitalize(result.riskLevel)} Risk Detected</h4>
                        <p>${result.details}</p>
                        <div class="gs-result-meta">
                            <div class="meta-row"><span class="meta-key">Risk Score:</span><span class="meta-val">${result.riskScore}/100</span></div>
                            <div class="meta-row"><span class="meta-key">Number:</span><span class="meta-val">+91 ${phone}</span></div>
                            <div class="meta-row"><span class="meta-key">Community Flags:</span><span class="meta-val">${result.reportedCount}</span></div>
                        </div>
                    </div>
                </div>`;
            phoneResultArea.style.display = 'block';

        } catch (err) {
            showError('Phone analysis failed: ' + err.message);
        } finally {
            setBtnLoading(phoneScanBtn, phoneSpinner, phoneBtnIcon, phoneBtnText, false, 'Analyze Number');
        }
    });

    // =========================================================
    // 7. MEDIA (VIDEO / VOICE) SCAN
    // =========================================================
    const fileInput = document.getElementById('media-file');
    const fileNameDisplay = document.getElementById('file-name-display');
    const fileNameText = document.getElementById('file-name-text');
    const dropZone = document.getElementById('drop-zone');
    const mediaScanForm = document.getElementById('media-scan-form');
    const mediaScanBtn = document.getElementById('media-scan-btn');
    const mediaSpinner = document.getElementById('media-spinner');
    const mediaBtnIcon = document.getElementById('media-btn-icon');
    const mediaBtnText = document.getElementById('media-btn-text');
    const mediaResultArea = document.getElementById('media-result-area');

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            fileNameText.textContent = fileInput.files[0].name;
            fileNameDisplay.style.display = 'inline-flex';
        } else {
            fileNameDisplay.style.display = 'none';
        }
    });

    // Drag visual feedback
    ['dragenter', 'dragover'].forEach(ev => {
        dropZone.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('dragging'); }, false);
    });
    ['dragleave', 'drop'].forEach(ev => {
        dropZone.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('dragging'); }, false);
    });

    mediaScanForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const file = fileInput.files[0];
        if (!file) { alert('Please select a file to analyze.'); return; }

        const analyzeType = document.querySelector('input[name="media-type"]:checked').value;
        const endpoint = analyzeType === 'video' ? '/video/analyze' : '/video/voice/analyze';

        const formData = new FormData();
        formData.append(analyzeType, file);

        setBtnLoading(mediaScanBtn, mediaSpinner, mediaBtnIcon, mediaBtnText, true, 'AI Processing…');
        mediaResultArea.style.display = 'none';

        try {
            const result = await api.postForm(endpoint, formData);

            const isFake = analyzeType === 'video' ? result.isDeepfake : result.isAI;
            const conf = analyzeType === 'video' ? result.confidence : result.confidenceScore;
            const cls = isFake ? 'danger' : 'safe';
            const icon = isFake ? dangerIcon('var(--col-danger)') : safeIcon('var(--col-success)');
            const title = isFake ? 'Synthetic Media Detected' : 'Authentic Media Confirmed';
            const fillCls = isFake ? 'fill-red' : 'fill-green';
            const confColor = isFake ? 'var(--col-danger)' : 'var(--col-success)';

            mediaResultArea.innerHTML = `
                <div class="gs-result ${cls}">
                    <div class="gs-result-icon">${icon}</div>
                    <div style="flex:1">
                        <h4>${title}</h4>
                        <p>${result.analysisDetails}</p>
                        <div class="gs-progress-wrap">
                            <div class="gs-progress-header">
                                <span>AI Confidence Score</span>
                                <span style="color:${confColor}">${conf}%</span>
                            </div>
                            <div class="gs-progress-bar-bg">
                                <div class="gs-progress-bar-fill ${fillCls}" style="width:0%" data-width="${conf}%"></div>
                            </div>
                        </div>
                    </div>
                </div>`;
            mediaResultArea.style.display = 'block';

            // Animate progress bar
            requestAnimationFrame(() => {
                setTimeout(() => {
                    const bar = mediaResultArea.querySelector('.gs-progress-bar-fill');
                    if (bar) bar.style.width = bar.dataset.width;
                }, 80);
            });

            loadActivity();

        } catch (err) {
            showError('Media analysis failed: ' + err.message);
        } finally {
            setBtnLoading(mediaScanBtn, mediaSpinner, mediaBtnIcon, mediaBtnText, false, 'Run AI Analysis');
            fileInput.value = '';
            fileNameDisplay.style.display = 'none';
        }
    });

    // =========================================================
    // 8. REPORT FORM
    // =========================================================
    const reportForm = document.getElementById('report-form');
    const reportMsg = document.getElementById('report-msg');
    const reportSpinner = document.getElementById('report-spinner');
    const reportBtnText = document.getElementById('report-btn-text');
    const reportBtn = reportForm.querySelector('button[type="submit"]');

    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phoneNumber = document.getElementById('report-phone').value;
        const scamType = document.getElementById('report-type').value;
        const description = document.getElementById('report-desc').value;

        reportMsg.style.display = 'none';
        reportSpinner.classList.add('show');
        reportBtnText.textContent = 'Submitting…';
        reportBtn.disabled = true;

        try {
            await api.post('/report/community', { phoneNumber, scamType, description });
            reportMsg.className = 'gs-feedback success';
            reportMsg.textContent = '✓ Report submitted successfully. Thank you for protecting the community.';
            reportMsg.style.display = 'block';
            reportForm.reset();
        } catch (err) {
            reportMsg.className = 'gs-feedback error';
            reportMsg.textContent = err.message;
            reportMsg.style.display = 'block';
        } finally {
            reportSpinner.classList.remove('show');
            reportBtnText.textContent = 'Submit Report to Database';
            reportBtn.disabled = false;
        }
    });

    // =========================================================
    // 9. LOAD ACTIVITY (overview table + stats)
    // =========================================================
    async function loadActivity() {
        try {
            const history = await api.get('/user/history');

            let total = history.phoneScans.length + history.videoScans.length + history.voiceScans.length;
            let threats = 0;
            let combined = [];

            history.phoneScans.forEach(s => {
                if (s.riskLevel !== 'low') threats++;
                combined.push({ ...s, _type: 'phone', date: new Date(s.scanDate) });
            });
            history.videoScans.forEach(s => {
                if (s.isDeepfake) threats++;
                combined.push({ ...s, _type: 'video', date: new Date(s.scanDate) });
            });
            history.voiceScans.forEach(s => {
                if (s.isAI) threats++;
                combined.push({ ...s, _type: 'voice', date: new Date(s.scanDate) });
            });

            // Stats with pop animation
            animateStat('stat-total', total);
            animateStat('stat-threat', threats);
            animateStat('stat-safe', total - threats);

            combined.sort((a, b) => b.date - a.date);
            const tbody = document.getElementById('activity-log');

            if (combined.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--col-text-muted);">No activity yet. Run a scan to get started.</td></tr>`;
                return;
            }

            tbody.innerHTML = combined.slice(0, 8).map(item => {
                const d = item.date.toLocaleDateString() + ' ' + item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                let typeBadge, target, resultBadge;

                if (item._type === 'phone') {
                    typeBadge = `<span class="badge badge-blue">Phone</span>`;
                    target = `+91 ${item.phoneNumber}`;
                    resultBadge = item.riskLevel === 'high'
                        ? `<span class="badge badge-red">High Risk</span>`
                        : item.riskLevel === 'medium'
                            ? `<span class="badge badge-yellow">Suspicious</span>`
                            : `<span class="badge badge-green">Safe</span>`;
                } else if (item._type === 'video') {
                    typeBadge = `<span class="badge badge-purple">Video</span>`;
                    target = item.fileName || 'Video File';
                    resultBadge = item.isDeepfake
                        ? `<span class="badge badge-red">Deepfake</span>`
                        : `<span class="badge badge-green">Authentic</span>`;
                } else {
                    typeBadge = `<span class="badge badge-indigo">Voice</span>`;
                    target = item.fileName || 'Audio File';
                    resultBadge = item.isAI
                        ? `<span class="badge badge-red">AI Generated</span>`
                        : `<span class="badge badge-green">Authentic</span>`;
                }

                return `
                    <tr>
                        <td style="color:var(--col-text-muted);white-space:nowrap;">${d}</td>
                        <td>${typeBadge}</td>
                        <td style="font-weight:500;">${target}</td>
                        <td>${resultBadge}</td>
                    </tr>`;
            }).join('');

        } catch (err) {
            console.error('Failed to load activity:', err.message);
        }
    }

    // Animate stat counter (simple pop)
    function animateStat(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = value;
        el.classList.remove('stat-pop');
        void el.offsetWidth; // reflow to restart animation
        el.classList.add('stat-pop');
    }

    // =========================================================
    // HELPERS
    // =========================================================

    function setBtnLoading(btn, spinner, icon, textEl, loading, loadText) {
        btn.disabled = loading;
        if (loading) {
            spinner.classList.add('show');
            if (icon) icon.style.display = 'none';
            textEl.textContent = loadText;
        } else {
            spinner.classList.remove('show');
            if (icon) icon.style.display = '';
            textEl.textContent = textEl.dataset.default || textEl.textContent;
        }
    }

    function capitalize(str) {
        return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    }

    function showError(msg) {
        alert(msg);
    }

    function safeIcon(color) {
        return `<svg fill="none" stroke="${color}" viewBox="0 0 24 24" width="40" height="40">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
        </svg>`;
    }

    function dangerIcon(color) {
        return `<svg fill="none" stroke="${color}" viewBox="0 0 24 24" width="40" height="40">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>`;
    }

    function warningIcon(color) {
        return `<svg fill="none" stroke="${color}" viewBox="0 0 24 24" width="40" height="40">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>`;
    }

});
