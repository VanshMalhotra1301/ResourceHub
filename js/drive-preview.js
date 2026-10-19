/**
 * BU Resource Hub - Google Drive In-Site Preview & Course Promo Module
 * XSS-safe rendering for all user-derived content
 */

(function () {
    // ── HTML Escape Helper ─────────────────────────
    function escapeHtml(str) {
        if (typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // ===========================================
    // 1. DRIVE IN-SITE PREVIEW MODAL
    // ===========================================
    document.addEventListener('DOMContentLoaded', () => {
        const modal = document.getElementById('drive-modal');
        const iframe = document.getElementById('drive-iframe');
        const spinner = document.getElementById('drive-spinner');
        const title = document.getElementById('drive-modal-title');
        const openLink = document.getElementById('drive-modal-open-link');
        const downloadBtn = document.getElementById('drive-modal-download');

        if (!modal || !iframe) return;

        // Hide spinner once iframe loads real Drive URL
        iframe.addEventListener('load', () => {
            if (iframe.src && !iframe.src.startsWith('about:blank') && iframe.src !== window.location.href) {
                if (spinner) spinner.classList.add('hidden');
            }
        });

        // Validate that a string looks like a Drive file ID (alphanumeric + hyphens/underscores)
        function isValidDriveId(id) {
            return typeof id === 'string' && /^[a-zA-Z0-9_-]{10,100}$/.test(id);
        }

        window.openDriveModal = function (fileId, label) {
            if (!isValidDriveId(fileId)) {
                console.warn('[Drive Preview] Invalid file ID:', fileId);
                return;
            }

            // Use textContent (not innerHTML) for the label to prevent XSS
            if (title) title.textContent = label || 'Document';
            if (openLink) openLink.href = 'https://drive.google.com/file/d/' + encodeURIComponent(fileId) + '/view';
            if (downloadBtn) downloadBtn.href = 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(fileId);

            if (spinner) spinner.classList.remove('hidden');
            iframe.src = 'about:blank';

            modal.classList.add('open');
            document.body.style.overflow = 'hidden';

            setTimeout(() => {
                iframe.src = 'https://drive.google.com/file/d/' + encodeURIComponent(fileId) + '/preview';
            }, 50);

            if (window.trackFeatureUsage) {
                window.trackFeatureUsage('Drive Preview', 'Opened: ' + (label || 'Unknown'));
            }
        };

        window.closeDriveModal = function () {
            modal.classList.remove('open');
            document.body.style.overflow = '';
            setTimeout(() => { iframe.src = 'about:blank'; }, 350);
        };

        // Intercept Drive file links across cards
        document.addEventListener('click', function (e) {
            const a = e.target.closest('a[href*="drive.google.com/file/d/"]');
            if (!a) return;
            if (a.id === 'drive-modal-open-link' || a.id === 'drive-modal-download') return;

            e.preventDefault();
            const match = a.href.match(/\/file\/d\/([^/?#]+)/);
            if (!match) {
                window.open(a.href, '_blank', 'noopener');
                return;
            }
            const fileId = match[1];
            const label = (a.querySelector('span') || a).textContent.trim();
            window.openDriveModal(fileId, label);
        }, true);

        // Escape Key Listener
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('open')) {
                window.closeDriveModal();
            }
        });

        // Click outside modal content to close
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                window.closeDriveModal();
            }
        });
    });

    // ===========================================
    // 2. COURSE PROMO TOOLTIP ON PYQ CLICK
    // ===========================================
    (function initCoursePromo() {
        const promoCount = {};
        const MAX_PER_SUBJECT = 2;

        const courseMap = {
            'Engineering Calculus': 'https://www.skillsseekers.com/courses/Engineering-Calculus--6a9c33c23281b0338cfbb9a9',
            'Calculus': 'https://www.skillsseekers.com/courses/Engineering-Calculus--6a9c33c23281b0338cfbb9a9',
            'Electronics': 'https://www.skillsseekers.com/courses/ECE-END-TERM-EXPRESS-TUTORIAL-SHEETS--PYQ-SOLVED--6aa528bbd7479e875f3051ac',
            'ECE': 'https://www.skillsseekers.com/courses/ECE-END-TERM-EXPRESS-TUTORIAL-SHEETS--PYQ-SOLVED--6aa528bbd7479e875f3051ac',
            'Mechanics & Electromagnetism': 'https://www.skillsseekers.com/courses/Mechanics-End-Term-Express-Crash-Course-67c81c40eadd7267af53e1ad',
            'Computational Thinking': 'https://www.skillsseekers.com/courses/Computational-Thinking--Programming-Python--End-Term-Express--Theory--Fully-Solved-Tutorials-6aa14fb0e357b92628dea76d',
            'Python': 'https://www.skillsseekers.com/courses/Computational-Thinking--Programming-Python--End-Term-Express--Theory--Fully-Solved-Tutorials-6aa14fb0e357b92628dea76d',
            'Linear Algebra & ODE': 'https://www.skillsseekers.com/courses/Digital-Design--Linear-Algebra--Discrete-Mathematics-Complete-End-Term-Courses-69e07c89d5bf1319ba104a81',
            'OOP (Java)': 'https://www.skillsseekers.com/courses',
            'Discrete Mathematics': 'https://www.skillsseekers.com/courses/Digital-Design--Linear-Algebra--Discrete-Mathematics-Complete-End-Term-Courses-69e07c89d5bf1319ba104a81',
            'Digital Design': 'https://www.skillsseekers.com/courses/Digital-Design--Lectures--Notes--Question-Banks--PYP--65f3c32854bc821a1192472f',
            'IMS': 'https://www.skillsseekers.com/courses/IMS-End-Sem-Course--Theory--Questions-Practice-67499a62a0101406538b095b',
            'Data Structures (C++)': 'https://www.skillsseekers.com/courses/Data-Structures-using-Cpp-Express-Crash-Course-6a84b55b3c9a5e1bd7515ef0',
            'Data Structures': 'https://www.skillsseekers.com/courses/Data-Structures-using-Cpp-Express-Crash-Course-6a84b55b3c9a5e1bd7515ef0',
            'SML (Machine Learning)': 'https://www.skillsseekers.com/courses/Statistical-Machine-Learning-Mid-End-Term-Crash-Course-6a8422844b93a4aeead5c37e',
            'Data Analysis using Python': 'https://www.skillsseekers.com/courses/Data-Analysis-Using-Python-End--Term-Course-2026-6a8bd1747013957d7e8ec6ef',
            'Data Analysis (Python)': 'https://www.skillsseekers.com/courses/Data-Analysis-Using-Python-End--Term-Course-2026-6a8bd1747013957d7e8ec6ef',
            'Probability & Statistics': 'https://www.skillsseekers.com/courses/Probability-and-Statistics-End-Term-Express-Crash-Course-68f24c05943a5543bdb86135',
            'Microprocessors & Computer Architecture': 'https://www.skillsseekers.com/courses/Microprocessors-and-Computer-Architecture-Mid-Term-Express-Crash-Course-69628f196254b83697fd78e7',
            'Microprocessors & CA': 'https://www.skillsseekers.com/courses/Microprocessors-and-Computer-Architecture-Mid-Term-Express-Crash-Course-69628f196254b83697fd78e7',
            'Design & Analysis of Algorithms': 'https://www.skillsseekers.com/courses/Design-and-Analysis-of-Algorithms--FULL-SYLLABUS--For-Placement-Preparations-Very-Important---Full-Mid-Sem-End-Sem-6975cddfcbf54f7e05ec38ff',
            'DAA (Algorithms)': 'https://www.skillsseekers.com/courses/Design-and-Analysis-of-Algorithms--FULL-SYLLABUS--For-Placement-Preparations-Very-Important---Full-Mid-Sem-End-Sem-6975cddfcbf54f7e05ec38ff',
            'DAA': 'https://www.skillsseekers.com/courses/Design-and-Analysis-of-Algorithms--FULL-SYLLABUS--For-Placement-Preparations-Very-Important---Full-Mid-Sem-End-Sem-6975cddfcbf54f7e05ec38ff',
            'Computer Networks': 'https://www.skillsseekers.com/courses/Computer-Network-End-Sem-Course--THEORY--PRACTICE--PYQS-67fbad4d1712547038d3df19',
            'Operating Systems': 'https://www.skillsseekers.com/courses/Operating-Systems-Mid-Term-Express-Crash-Course-695d4f66949d112b79278602',
            'Artificial Intelligence & ML': 'https://www.skillsseekers.com/courses/Artificial-Intelligence-and-Machine-Learning-AI-ML-End-Term-Express-Crash-Course-6a95a23c75430a992a01d943',
            'AI & ML': 'https://www.skillsseekers.com/courses/Artificial-Intelligence-and-Machine-Learning-AI-ML-End-Term-Express-Crash-Course-6a95a23c75430a992a01d943',
            'CSET 312': 'https://www.skillsseekers.com/courses/CSET-312---AIML-End-SEM-Prep-69d7eae1c8ed5dbf5d44f309',
            'Environment': 'https://www.skillsseekers.com/courses',
            'Automata / Theory of Computation': 'https://www.skillsseekers.com/courses/Automata-Theory-and-Computability--End-Sem-Sprint--6912054225c39a250b05a0e2',
            'Automata': 'https://www.skillsseekers.com/courses/Automata-Theory-and-Computability--End-Sem-Sprint--6912054225c39a250b05a0e2',
            'Intelligent Model Design': 'https://www.skillsseekers.com/courses/Intelligent-Model-Design-using-AI-Mid--End-Term-Express-Crash-Course-6a842303a33bff187396bfde',
            'Natural Language Processing': 'https://www.skillsseekers.com/courses',
            'Software Project Management': 'https://www.skillsseekers.com/courses',
            'AI and Society': 'https://www.skillsseekers.com/courses'
        };

        const FALLBACK_URL = 'https://www.skillsseekers.com/courses';

        function getCourseUrl(subjectName) {
            const key = subjectName.trim();
            if (courseMap[key]) return courseMap[key];
            for (const [mapKey, url] of Object.entries(courseMap)) {
                if (key.toLowerCase().includes(mapKey.toLowerCase()) || mapKey.toLowerCase().includes(key.toLowerCase())) {
                    return url;
                }
            }
            return FALLBACK_URL;
        }

        // Validate URL to prevent javascript: injection
        function isSafeUrl(url) {
            try {
                const parsed = new URL(url);
                return parsed.protocol === 'https:' || parsed.protocol === 'http:';
            } catch (e) {
                return false;
            }
        }

        const messages = [
            (subj) => `Ace ${subj}! Get the full crash course.`,
            (subj) => `PYQs + the ${subj} video course = guaranteed results.`,
            (subj) => `Want solved explanations for ${subj}? Check out the course.`
        ];

        function showPromo(x, y, subjectName) {
            const key = subjectName.trim();
            if (!promoCount[key]) promoCount[key] = 0;
            if (promoCount[key] >= MAX_PER_SUBJECT) return;
            promoCount[key]++;

            const old = document.querySelector('.course-promo-tip');
            if (old) old.remove();

            const msgFn = messages[Math.floor(Math.random() * messages.length)];
            const shortName = key.length > 30 ? key.substring(0, 28) + '\u2026' : key;
            const courseUrl = getCourseUrl(key);

            // Validate URL before rendering
            if (!isSafeUrl(courseUrl)) return;

            // Build tooltip using DOM API (XSS-safe)
            const tip = document.createElement('div');
            tip.className = 'course-promo-tip';

            const closeBtn = document.createElement('button');
            closeBtn.className = 'promo-close';
            closeBtn.title = 'Dismiss';
            closeBtn.textContent = '✕';
            closeBtn.addEventListener('click', () => {
                tip.classList.add('fade-out');
                setTimeout(() => tip.remove(), 300);
            });

            const iconDiv = document.createElement('div');
            iconDiv.className = 'promo-icon';
            iconDiv.innerHTML = '<i class="ph-fill ph-play-circle"></i>';

            const body = document.createElement('div');
            body.className = 'promo-body';

            const text = document.createElement('p');
            text.className = 'promo-text';
            text.textContent = msgFn(shortName);

            const link = document.createElement('a');
            link.className = 'promo-link';
            link.href = courseUrl;
            link.target = '_blank';
            link.rel = 'noopener';
            link.innerHTML = 'View Course <i class="ph-bold ph-arrow-right"></i>';

            body.appendChild(text);
            body.appendChild(link);
            tip.appendChild(closeBtn);
            tip.appendChild(iconDiv);
            tip.appendChild(body);

            document.body.appendChild(tip);

            const tipW = 280, tipH = 70;
            let posX = x + 16;
            let posY = y - tipH - 12;

            if (posX + tipW > window.innerWidth - 12) { posX = x - tipW - 16; }
            if (posY < 12) { posY = y + 20; }

            tip.style.left = posX + 'px';
            tip.style.top = posY + 'px';

            // Auto-dismiss after 8 seconds
            setTimeout(() => {
                if (tip.parentNode) {
                    tip.classList.add('fade-out');
                    setTimeout(() => tip.remove(), 300);
                }
            }, 8000);
        }

        document.addEventListener('click', function (e) {
            const link = e.target.closest('.subject-card a[href*="drive.google.com"]');
            if (!link) return;
            const card = link.closest('.subject-card');
            if (!card) return;
            const nameEl = card.querySelector('.subject-name');
            if (!nameEl) return;
            const subjectName = nameEl.textContent.trim();

            setTimeout(() => {
                showPromo(e.clientX, e.clientY, subjectName);
            }, 400);
        }, true);
    })();
})();
