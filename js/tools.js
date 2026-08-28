/**
 * BU Resource Hub - Study Productivity Tools Module
 * (Pomodoro Timer, Sticky Notes, Bookmarks, Exam Countdown, Streak Tracker)
 */

(function () {
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

        // Milestone celebration
        if ([7, 14, 30, 50, 100].includes(streak) && lastVisit !== today) {
            setTimeout(() => launchConfetti(), 800);
        }
    }

    window.showStreakInfo = function () {
        const streak = localStorage.getItem('bu_streak') || 0;
        alert(`🔥 You're on a ${streak}-day study streak!\n\nVisit every day to keep your streak alive. Milestones at 7, 14, 30, 50, and 100 days!`);
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
        if (!dateVal) { alert('Please select a date.'); return; }
        localStorage.setItem('bu_exam_date', dateVal);
        localStorage.setItem('bu_exam_name', nameVal);
        startCountdown(dateVal, nameVal);
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
                    new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAA').play().catch(() => {});
                    alert(pomoMode === 'work' ? '✅ Focus session complete! Take a break.' : '⏰ Break over! Time to focus.');
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
    // 5. STICKY NOTES
    // ===========================================
    window.loadNotes = function () {
        const notes = JSON.parse(localStorage.getItem('bu_notes') || '[]');
        const container = document.getElementById('notes-container');
        if (!container) return;
        container.innerHTML = '';
        notes.forEach((text, i) => {
            const div = document.createElement('div');
            div.className = 'sticky-note';
            div.innerHTML = `<button class="sticky-note-del" onclick="deleteNote(${i})">✕</button><textarea onchange="saveNote(${i}, this.value)" placeholder="Type your note...">${text}</textarea>`;
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
    // 6. BOOKMARKS MANAGER
    // ===========================================
    window.loadBookmarks = function () {
        const bms = JSON.parse(localStorage.getItem('bu_bookmarks') || '[]');
        const list = document.getElementById('bookmarks-list');
        if (!list) return;
        if (!bms.length) {
            list.innerHTML = '<p class="text-sm text-zinc-600 text-center py-6">No bookmarks yet.<br>Save resources to access them quickly!</p>';
            return;
        }
        list.innerHTML = bms.map((bm, i) => `
            <div class="bookmark-item">
                <div>
                    <span>${bm.label}</span>
                    <span class="bookmark-sub">${bm.subject}</span>
                </div>
                <a href="${bm.url}" target="_blank" title="Open">↗</a>
                <button class="bookmark-del" onclick="deleteBookmark(${i})" title="Remove">✕</button>
            </div>`).join('');
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
