/**
 * BU Resource Hub - Google Drive In-Site Preview & Course Promo Module
 */

(function () {
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

        window.openDriveModal = function (fileId, label) {
            if (title) title.textContent = label || 'Document';
            if (openLink) openLink.href = 'https://drive.google.com/file/d/' + fileId + '/view';
            if (downloadBtn) downloadBtn.href = 'https://drive.google.com/uc?export=download&id=' + fileId;

            if (spinner) spinner.classList.remove('hidden');
            iframe.src = 'about:blank';

            modal.classList.add('open');
            document.body.style.overflow = 'hidden';

            setTimeout(() => {
                iframe.src = 'https://drive.google.com/file/d/' + fileId + '/preview';
            }, 50);

            if (window.trackFeatureUsage) {
                window.trackFeatureUsage('Drive Preview', 'Opened: ' + label);
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
    });

    // ===========================================
    // 2. COURSE PROMO TOOLTIP ON PYQ CLICK
    // ===========================================
    (function initCoursePromo() {
        const promoCount = {};
        const MAX_PER_SUBJECT = 2;

        const courseMap = {
            'Engineering Calculus': 'https://www.skillsseekers.com/courses/Engineering-Calculus-END-SEM-TUTORIAL-SHEETS--PYQ-2025-68ebe50c73460975dc74ccf4',
            'Electronics': 'https://www.skillsseekers.com/courses/ECE-END-SEM-TUTORIAL-SHEETS--PYQ-SOLVED-2025-6904f0913315445bda01a275',
            'Mechanics & Electromagnetism': 'https://www.skillsseekers.com/courses/Mechanics-End-Term-Express-Crash-Course-67c81c40eadd7267af53e1ad',
            'Computational Thinking': 'https://www.skillsseekers.com/courses/Python-Mid-Sem-Hunt--Theory--Tutorial-Sheets-Solved---By--Pratham-Kocher-Copy-67373fde108e6312f95e2fe0',
            'Linear Algebra & ODE': 'https://www.skillsseekers.com/courses/Linear-Algebra-END-SEM-THEORY-LECTURE-TUTORIAL-SHEETS--PYQ-2025-69c506916b8037fc81a925f6',
            'OOP (Java)': 'https://www.skillsseekers.com/s/store',
            'Discrete Mathematics': 'https://www.skillsseekers.com/courses/Discrete-Mathematics-END-SEM-THEORY-LECTURE-TUTORIAL-SHEETS--PYQ-2026-69c50b274d4eacd62847e3ad',
            'Digital Design': 'https://www.skillsseekers.com/courses/Digital-Design--Lectures--Notes--Question-Banks--PYP--65f3c32854bc821a1192472f',
            'IMS': 'https://www.skillsseekers.com/courses/IMS-End-Sem-Course--Theory--Questions-Practice-67499a62a0101406538b095b',
            'Data Structures (C++)': 'https://www.skillsseekers.com/courses/Data-Structures-using-Cpp-End-Term-Express-Crash-Course-6905e20728326e69fb83de97',
            'SML (Machine Learning)': 'https://www.skillsseekers.com/courses/Statistical-Machine-Learning-Mid-End-Term-Crash-Course-6a8422844b93a4aeead5c37e',
            'Data Analysis using Python': 'https://www.skillsseekers.com/courses/Data-Analysis-Using-Python-End--Term-Express-Crash-Course-691213351826d90967997a6d',
            'Probability & Statistics': 'https://www.skillsseekers.com/courses/Probability-and-Statistics-End-Term-Express-Crash-Course-68f24c05943a5543bdb86135',
            'Microprocessors & Computer Architecture': 'https://www.skillsseekers.com/courses/Microprocessors-and-Computer-Architecture-Mid-Term-Express-Crash-Course-69628f196254b83697fd78e7',
            'Design & Analysis of Algorithms': 'https://www.skillsseekers.com/s/store',
            'Computer Networks': 'https://www.skillsseekers.com/courses/Computer-Network-End-Sem-Course--THEORY--PRACTICE--PYQS-67fbad4d1712547038d3df19',
            'Operating Systems': 'https://www.skillsseekers.com/courses/Operating-Systems-Mid-Term-Express-Crash-Course-695d4f66949d112b79278602',
            'Artificial Intelligence & ML': 'https://www.skillsseekers.com/courses/AI-and-ML-End-Sem-Sprint-69386305006ffc1a762fa256',
            'Environment': 'https://www.skillsseekers.com/s/store',
            'Automata / Theory of Computation': 'https://www.skillsseekers.com/courses/Automata-Theory-and-Computability--End-Sem-Sprint--6912054225c39a250b05a0e2',
            'Automata': 'https://www.skillsseekers.com/courses/Automata-Theory-and-Computability--End-Sem-Sprint--6912054225c39a250b05a0e2',
            'Intelligent Model Design': 'https://www.skillsseekers.com/s/store',
            'Natural Language Processing': 'https://www.skillsseekers.com/s/store',
            'Software Project Management': 'https://www.skillsseekers.com/s/store',
            'AI and Society': 'https://www.skillsseekers.com/s/store'
        };

        const FALLBACK_URL = 'https://www.skillsseekers.com/s/store';

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

            const tip = document.createElement('div');
            tip.className = 'course-promo-tip';
            tip.innerHTML = `
                <button class="promo-close" title="Dismiss">✕</button>
                <div class="promo-icon"><i class="ph-fill ph-play-circle"></i></div>
                <div class="promo-body">
                    <p class="promo-text">${msgFn(shortName)}</p>
                    <a class="promo-link" href="${courseUrl}" target="_blank" rel="noopener">
                        View Course <i class="ph-bold ph-arrow-right"></i>
                    </a>
                </div>
            `;

            tip.querySelector('.promo-close').addEventListener('click', () => {
                tip.classList.add('fade-out');
                setTimeout(() => tip.remove(), 300);
            });

            document.body.appendChild(tip);

            const tipW = 280, tipH = 70;
            let posX = x + 16;
            let posY = y - tipH - 12;

            if (posX + tipW > window.innerWidth - 12) { posX = x - tipW - 16; }
            if (posY < 12) { posY = y + 20; }

            tip.style.left = posX + 'px';
            tip.style.top = posY + 'px';
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
