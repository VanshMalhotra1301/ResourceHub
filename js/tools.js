/**
 * BU Resource Hub - Study Productivity Tools Module
 * (Pomodoro Timer, Sticky Notes, Bookmarks, Exam Countdown, Streak Tracker)
 */

(function () {
    // ── HTML Escape Helper (XSS Protection) ────────
    function escapeHtml(str) {
        if (typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // ── Toast Notification (replaces alert()) ──────
    function showToast(message, type = 'info', duration = 4000) {
        // Remove existing toast
        const existing = document.querySelector('.bu-toast');
        if (existing) existing.remove();

        const icons = {
            success: '✅',
            info: 'ℹ️',
            warning: '⚠️',
            error: '❌'
        };

        const toast = document.createElement('div');
        toast.className = `bu-toast bu-toast--${type}`;
        toast.innerHTML = `
            <span class="bu-toast__icon">${icons[type] || icons.info}</span>
            <span class="bu-toast__msg">${escapeHtml(message)}</span>
            <button class="bu-toast__close" aria-label="Close">&times;</button>
        `;

        // Inject toast styles if not already present
        if (!document.getElementById('bu-toast-styles')) {
            const style = document.createElement('style');
            style.id = 'bu-toast-styles';
            style.textContent = `
                .bu-toast {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 14px 20px;
                    border-radius: 12px;
                    background: rgba(24, 24, 27, 0.95);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(99, 102, 241, 0.3);
                    color: #e4e4e7;
                    font-size: 14px;
                    font-family: 'Inter', 'Outfit', sans-serif;
                    z-index: 99999;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                    animation: buToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                    max-width: 380px;
                }
                .bu-toast--success { border-color: rgba(34, 197, 94, 0.4); }
                .bu-toast--warning { border-color: rgba(251, 191, 36, 0.4); }
                .bu-toast--error   { border-color: rgba(239, 68, 68, 0.4); }
                .bu-toast__icon { font-size: 18px; flex-shrink: 0; }
                .bu-toast__msg { flex: 1; line-height: 1.4; }
                .bu-toast__close {
                    background: none; border: none; color: #71717a;
                    cursor: pointer; font-size: 18px; padding: 0 0 0 8px;
                    transition: color 0.2s;
                }
                .bu-toast__close:hover { color: #e4e4e7; }
                .bu-toast--out { animation: buToastOut 0.3s ease-in forwards; }
                @keyframes buToastIn {
                    0% { opacity: 0; transform: translateY(20px) scale(0.95); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes buToastOut {
                    0% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(20px); }
                }
                @media (max-width: 480px) {
                    .bu-toast { left: 12px; right: 12px; bottom: 12px; max-width: none; }
                }
            `;
            document.head.appendChild(style);
        }

        toast.querySelector('.bu-toast__close').addEventListener('click', () => {
            toast.classList.add('bu-toast--out');
            setTimeout(() => toast.remove(), 300);
        });

        document.body.appendChild(toast);

        // Auto-dismiss
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('bu-toast--out');
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }

    // Expose globally for other modules
    window.showToast = showToast;

    // ===========================================
    // 1. STUDY STREAK TRACKER
    // ===========================================
    function initStreak() {
        const today = new Date().toDateString();
        const lastVisit = localStorage.getItem('bu_last_visit');
        let streak = parseInt(localStorage.getItem('bu_streak') || '0');

        if (lastVisit !== today) {
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            if (lastVisit === yesterday) {
                streak++;
            } else if (lastVisit !== today) {
                streak = 1;
            }
            localStorage.setItem('bu_streak', streak);
            localStorage.setItem('bu_last_visit', today);
        }

        const streakNumEl = document.getElementById('streak-num');
        if (streakNumEl) streakNumEl.textContent = streak;

        // Reset daily pomodoro session count on new day
        const lastPomoDay = localStorage.getItem('bu_pomo_day');
        if (lastPomoDay !== today) {
            localStorage.setItem('bu_pomo_sessions_today', '0');
            localStorage.setItem('bu_pomo_day', today);
        }

        // Milestone celebration
        if ([7, 14, 30, 50, 100].includes(streak) && lastVisit !== today) {
            setTimeout(() => {
                launchConfetti();
                showToast(`🔥 ${streak}-day streak! You're on fire!`, 'success', 5000);
            }, 800);
        }
    }

    window.showStreakInfo = function () {
        const streak = localStorage.getItem('bu_streak') || 0;
        showToast(`🔥 You're on a ${streak}-day study streak! Visit daily to keep it alive.`, 'info', 5000);
    };

    window.launchConfetti = function () {
        const colors = ['#6366f1', '#a855f7', '#fbbf24', '#22d3ee', '#f87171', '#34d399'];
        for (let i = 0; i < 60; i++) {
            const el = document.createElement('div');
            el.style.cssText = `position:fixed;top:-10px;left:${Math.random() * 100}vw;width:8px;height:8px;background:${colors[Math.floor(Math.random() * colors.length)]};border-radius:${Math.random() > 0.5 ? '50%' : '2px'};z-index:9999;pointer-events:none;animation:confettiFall ${1.5 + Math.random() * 2}s linear forwards;`;
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 3500);
        }
        if (!document.getElementById('confetti-style')) {
            const s = document.createElement('style');
            s.id = 'confetti-style';
            s.textContent = `@keyframes confettiFall { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(105vh) rotate(${Math.random() > 0.5 ? '' : '-'}720deg);opacity:0} }`;
            document.head.appendChild(s);
        }
    };

    // ===========================================
    // 2. EXAM COUNTDOWN
    // ===========================================
    let countdownInterval = null;

    window.setExamDate = function () {
        const dateInput = document.getElementById('exam-date-input');
        const nameInput = document.getElementById('exam-name-input');
        if (!dateInput) return;
        const dateVal = dateInput.value;
        const nameVal = nameInput ? nameInput.value || 'Exam' : 'Exam';
        if (!dateVal) {
            showToast('Please select a date first.', 'warning');
            return;
        }
        localStorage.setItem('bu_exam_date', dateVal);
        localStorage.setItem('bu_exam_name', nameVal);
        startCountdown(dateVal, nameVal);
        showToast(`Countdown set for ${nameVal}!`, 'success');
    };

    function startCountdown(dateStr, name) {
        if (countdownInterval) clearInterval(countdownInterval);
        const target = new Date(dateStr);
        const labelEl = document.getElementById('cd-exam-label');
        if (labelEl) labelEl.textContent = '⏳ ' + (name || 'Exam');

        function update() {
            const now = new Date();
            const diff = target - now;
            if (diff <= 0) {
                clearInterval(countdownInterval);
                ['cd-days', 'cd-hours', 'cd-mins', 'cd-secs'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = '00';
                });
                if (labelEl) labelEl.textContent = '🎯 Exam Day is here!';
                return;
            }
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);

            const daysEl = document.getElementById('cd-days');
            const hoursEl = document.getElementById('cd-hours');
            const minsEl = document.getElementById('cd-mins');
            const secsEl = document.getElementById('cd-secs');

            if (daysEl) daysEl.textContent = String(d).padStart(2, '0');
            if (hoursEl) hoursEl.textContent = String(h).padStart(2, '0');
            if (minsEl) minsEl.textContent = String(m).padStart(2, '0');
            if (secsEl) secsEl.textContent = String(s).padStart(2, '0');
        }

        update();
        countdownInterval = setInterval(update, 1000);
    }

    function initCountdown() {
        const saved = localStorage.getItem('bu_exam_date');
        const savedName = localStorage.getItem('bu_exam_name');
        if (saved) {
            const dateInput = document.getElementById('exam-date-input');
            const nameInput = document.getElementById('exam-name-input');
            if (dateInput) dateInput.value = saved;
            if (nameInput) nameInput.value = savedName || '';
            startCountdown(saved, savedName);
        }
    }

    // ===========================================
    // 3. SIDE PANELS CONTROLLER
    // ===========================================
    window.togglePanel = function (id) {
        const panels = ['pomodoro-panel', 'notes-panel', 'bookmarks-panel'];
        panels.forEach(p => {
            const el = document.getElementById(p);
            if (!el) return;
            if (p === id) el.classList.toggle('open');
            else el.classList.remove('open');
        });
    };

    // ===========================================
    // 4. POMODORO TIMER
    // ===========================================
    const POMO_MODES = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };
    let pomoMode = 'work';
    let pomoTimeLeft = POMO_MODES.work;
    let pomoRunning = false;
    let pomoInterval = null;
    let pomoSessions = parseInt(localStorage.getItem('bu_pomo_sessions_today') || '0');

    window.setPomoMode = function (mode) {
        window.resetPomodoro();
        pomoMode = mode;
        pomoTimeLeft = POMO_MODES[mode];
        updatePomoDisplay();
        document.querySelectorAll('.pomo-mode-btn').forEach(b => b.classList.remove('active'));
        const activeBtn = document.getElementById('pomo-' + mode + '-btn');
        if (activeBtn) activeBtn.classList.add('active');
        const ring = document.getElementById('pomo-ring');
        if (ring) ring.style.stroke = mode === 'work' ? '#ef4444' : mode === 'short' ? '#22d3ee' : '#a855f7';
    };

    function updatePomoDisplay() {
        const m = Math.floor(pomoTimeLeft / 60);
        const s = pomoTimeLeft % 60;
        const displayEl = document.getElementById('pomodoro-display');
        if (displayEl) displayEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        const total = POMO_MODES[pomoMode];
        const offset = 376 * (1 - pomoTimeLeft / total);
        const ring = document.getElementById('pomo-ring');
        if (ring) ring.style.strokeDashoffset = offset;
    }

    window.togglePomodoro = function () {
        const startBtn = document.getElementById('pomo-start-btn');
        if (pomoRunning) {
            clearInterval(pomoInterval);
            pomoRunning = false;
            if (startBtn) startBtn.textContent = '▶ Resume';
        } else {
            pomoRunning = true;
            if (startBtn) startBtn.textContent = '⏸ Pause';
            pomoInterval = setInterval(() => {
                pomoTimeLeft--;
                updatePomoDisplay();
                if (pomoTimeLeft <= 0) {
                    clearInterval(pomoInterval);
                    pomoRunning = false;
                    if (startBtn) startBtn.textContent = '▶ Start';
                    if (pomoMode === 'work') {
                        pomoSessions++;
                        localStorage.setItem('bu_pomo_sessions_today', pomoSessions);
                        const countEl = document.getElementById('pomo-session-count');
                        if (countEl) countEl.textContent = pomoSessions;
                    }
                    // Play notification sound (non-blocking)
                    try {
                        new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAA').play().catch(() => {});
                    } catch (e) { /* silent */ }
                    // Toast instead of blocking alert()
                    if (pomoMode === 'work') {
                        showToast('Focus session complete! Take a well-deserved break.', 'success', 6000);
                    } else {
                        showToast('Break over! Time to focus again.', 'info', 5000);
                    }
                }
            }, 1000);
        }
    };

    window.resetPomodoro = function () {
        clearInterval(pomoInterval);
        pomoRunning = false;
        pomoTimeLeft = POMO_MODES[pomoMode];
        updatePomoDisplay();
        const startBtn = document.getElementById('pomo-start-btn');
        if (startBtn) startBtn.textContent = '▶ Start';
    };

    // ===========================================
    // 5. STICKY NOTES (XSS-Safe)
    // ===========================================
    window.loadNotes = function () {
        const notes = JSON.parse(localStorage.getItem('bu_notes') || '[]');
        const container = document.getElementById('notes-container');
        if (!container) return;
        container.innerHTML = '';
        notes.forEach((text, i) => {
            const div = document.createElement('div');
            div.className = 'sticky-note';

            const delBtn = document.createElement('button');
            delBtn.className = 'sticky-note-del';
            delBtn.textContent = '✕';
            delBtn.addEventListener('click', () => window.deleteNote(i));

            const textarea = document.createElement('textarea');
            textarea.placeholder = 'Type your note...';
            textarea.value = text; // Safe: .value doesn't execute HTML
            textarea.addEventListener('change', function () {
                window.saveNote(i, this.value);
            });

            div.appendChild(delBtn);
            div.appendChild(textarea);
            container.appendChild(div);
        });
    };

    window.addNote = function () {
        const notes = JSON.parse(localStorage.getItem('bu_notes') || '[]');
        notes.push('');
        localStorage.setItem('bu_notes', JSON.stringify(notes));
        window.loadNotes();
    };

    window.saveNote = function (idx, val) {
        const notes = JSON.parse(localStorage.getItem('bu_notes') || '[]');
        notes[idx] = val;
        localStorage.setItem('bu_notes', JSON.stringify(notes));
    };

    window.deleteNote = function (idx) {
        const notes = JSON.parse(localStorage.getItem('bu_notes') || '[]');
        notes.splice(idx, 1);
        localStorage.setItem('bu_notes', JSON.stringify(notes));
        window.loadNotes();
    };

    // ===========================================
    // 6. BOOKMARKS MANAGER (XSS-Safe + Export/Clear)
    // ===========================================
    window.loadBookmarks = function () {
        const bms = JSON.parse(localStorage.getItem('bu_bookmarks') || '[]');
        const list = document.getElementById('bookmarks-list');
        if (!list) return;
        if (!bms.length) {
            list.innerHTML = '<p class="text-sm text-zinc-600 text-center py-6">No bookmarks yet.<br>Save resources to access them quickly!</p>';
            return;
        }

        list.innerHTML = '';
        bms.forEach((bm, i) => {
            const item = document.createElement('div');
            item.className = 'bookmark-item';

            const info = document.createElement('div');
            const labelSpan = document.createElement('span');
            labelSpan.textContent = bm.label; // safe: textContent
            const subSpan = document.createElement('span');
            subSpan.className = 'bookmark-sub';
            subSpan.textContent = bm.subject;
            info.appendChild(labelSpan);
            info.appendChild(subSpan);

            const openLink = document.createElement('a');
            openLink.href = bm.url;
            openLink.target = '_blank';
            openLink.rel = 'noopener';
            openLink.title = 'Open';
            openLink.textContent = '↗';

            const delBtn = document.createElement('button');
            delBtn.className = 'bookmark-del';
            delBtn.title = 'Remove';
            delBtn.textContent = '✕';
            delBtn.addEventListener('click', () => window.deleteBookmark(i));

            item.appendChild(info);
            item.appendChild(openLink);
            item.appendChild(delBtn);
            list.appendChild(item);
        });
    };

    window.saveBookmark = function (label, url, subject) {
        const bms = JSON.parse(localStorage.getItem('bu_bookmarks') || '[]');
        if (bms.find(b => b.url === url)) {
            const idx = bms.findIndex(b => b.url === url);
            bms.splice(idx, 1);
            localStorage.setItem('bu_bookmarks', JSON.stringify(bms));
            window.loadBookmarks();
            return false;
        }
        bms.unshift({ label, url, subject });
        localStorage.setItem('bu_bookmarks', JSON.stringify(bms));
        window.loadBookmarks();
        return true;
    };

    window.deleteBookmark = function (i) {
        const bms = JSON.parse(localStorage.getItem('bu_bookmarks') || '[]');
        bms.splice(i, 1);
        localStorage.setItem('bu_bookmarks', JSON.stringify(bms));
        window.loadBookmarks();
    };

    // Export bookmarks as JSON file
    window.exportBookmarks = function () {
        const bms = JSON.parse(localStorage.getItem('bu_bookmarks') || '[]');
        if (!bms.length) {
            showToast('No bookmarks to export.', 'warning');
            return;
        }
        const blob = new Blob([JSON.stringify(bms, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bu-bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`Exported ${bms.length} bookmarks.`, 'success');
    };

    // Clear all bookmarks with confirmation
    window.clearAllBookmarks = function () {
        const bms = JSON.parse(localStorage.getItem('bu_bookmarks') || '[]');
        if (!bms.length) {
            showToast('No bookmarks to clear.', 'info');
            return;
        }
        if (confirm(`Delete all ${bms.length} bookmarks? This cannot be undone.`)) {
            localStorage.setItem('bu_bookmarks', '[]');
            window.loadBookmarks();
            showToast('All bookmarks cleared.', 'info');
        }
    };

    window.attachBookmarkButtons = function () {
        document.querySelectorAll('.subject-card').forEach(card => {
            const subject = card.querySelector('.subject-name')?.textContent?.trim() || 'Unknown';
            card.querySelectorAll('.pyq-link, a[href*="drive.google.com"]').forEach(link => {
                if (link.querySelector('.bm-btn')) return;
                const label = link.querySelector('span')?.textContent?.trim() || 'Resource';
                const btn = document.createElement('button');
                btn.className = 'bm-btn';
                btn.title = 'Bookmark this resource';
                btn.innerHTML = '<i class="ph-bold ph-bookmark-simple"></i>';
                const bms = JSON.parse(localStorage.getItem('bu_bookmarks') || '[]');
                if (bms.find(b => b.url === link.href)) btn.classList.add('saved');
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const isSaved = window.saveBookmark(label, link.href, subject);
                    btn.classList.toggle('saved', isSaved);
                };
                link.appendChild(btn);
            });
        });
    };

    // Initialize all tools when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        initStreak();
        initCountdown();
        const countEl = document.getElementById('pomo-session-count');
        if (countEl) countEl.textContent = pomoSessions;
        window.loadNotes();
        window.loadBookmarks();
        window.attachBookmarkButtons();
    });
})();
