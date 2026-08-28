/**
 * BU Resource Hub - Search & Filter Module
 */

(function () {
    let searchDebounceTimeout = null;

    // 1. Fast Subject Search Filter
    window.filterSubjects = function () {
        clearTimeout(searchDebounceTimeout);
        searchDebounceTimeout = setTimeout(() => {
            const input = document.getElementById('searchInput');
            if (!input) return;
            const filter = input.value.trim().toUpperCase();
            const cards = document.getElementsByClassName('subject-card');

            for (let i = 0; i < cards.length; i++) {
                const h3 = cards[i].getElementsByClassName('subject-name')[0];
                const txtValue = h3 ? (h3.textContent || h3.innerText) : '';
                if (filter === '' || txtValue.toUpperCase().indexOf(filter) > -1) {
                    cards[i].style.display = "";
                } else {
                    cards[i].style.display = "none";
                }
            }
        }, 50);
    };

    // 2. Semester Category Filter Tabs
    window.filterSem = function (id, btn) {
        document.querySelectorAll('.sem-tab').forEach(t => t.classList.remove('active'));
        if (btn) btn.classList.add('active');

        const sections = document.querySelectorAll('.semester-section');
        sections.forEach(sec => {
            if (id === 'all' || sec.id === id) {
                sec.style.display = '';
                if (typeof gsap !== 'undefined') {
                    gsap.fromTo(sec, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
                }
            } else {
                sec.style.display = 'none';
            }
        });
    };
})();
