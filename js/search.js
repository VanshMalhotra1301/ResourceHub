/**
 * BU Resource Hub - Search & Filter Module
 * Enhanced with subject code matching, keyboard shortcuts, and highlight support
 */

(function () {
    let searchDebounceTimeout = null;

    // 1. Fast Subject Search Filter (matches names AND subject codes like "CSET", "EPHY", etc.)
    window.filterSubjects = function () {
        clearTimeout(searchDebounceTimeout);
        searchDebounceTimeout = setTimeout(() => {
            const input = document.getElementById('searchInput');
            if (!input) return;
            const filter = input.value.trim().toUpperCase();
            const cards = document.getElementsByClassName('subject-card');
            let visibleCount = 0;

            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];
                const h3 = card.getElementsByClassName('subject-name')[0];
                const subjectName = h3 ? (h3.textContent || h3.innerText) : '';

                // Also check data-code attribute and any tag/label elements
                const subjectCode = card.getAttribute('data-code') || '';
                const tagEl = card.querySelector('.subject-tag, .subject-code');
                const tagText = tagEl ? (tagEl.textContent || tagEl.innerText) : '';

                const searchable = (subjectName + ' ' + subjectCode + ' ' + tagText).toUpperCase();

                if (filter === '' || searchable.indexOf(filter) > -1) {
                    card.style.display = '';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            }

            // Show "no results" message if nothing matches
            let noResultsEl = document.getElementById('search-no-results');
            if (filter !== '' && visibleCount === 0) {
                if (!noResultsEl) {
                    noResultsEl = document.createElement('div');
                    noResultsEl.id = 'search-no-results';
                    noResultsEl.className = 'search-no-results';
                    noResultsEl.innerHTML = `
                        <div style="text-align:center;padding:40px 20px;color:#71717a;">
                            <div style="font-size:40px;margin-bottom:12px;">🔍</div>
                            <p style="font-size:16px;margin:0;">No subjects found for "<strong style="color:#a1a1aa;">${escapeHtmlInline(input.value.trim())}</strong>"</p>
                            <p style="font-size:13px;margin-top:8px;color:#52525b;">Try a different search term or subject code</p>
                        </div>
                    `;
                    // Insert after the search bar or at the start of the subject grid
                    const grid = document.querySelector('.subjects-grid, .semester-section, #subjects-container');
                    if (grid) grid.appendChild(noResultsEl);
                }
            } else if (noResultsEl) {
                noResultsEl.remove();
            }
        }, 80);
    };

    // Inline HTML escaper for search display
    function escapeHtmlInline(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

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

        // Clear search when switching tabs
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value) {
            searchInput.value = '';
            window.filterSubjects();
        }
    };

    // 3. Keyboard Shortcuts for Search
    document.addEventListener('keydown', (e) => {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        // '/' or Ctrl+K to focus search (standard web convention)
        if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && document.activeElement !== searchInput) {
            // Don't trigger if user is typing in an input/textarea
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }

        // Escape to clear and blur search
        if (e.key === 'Escape' && document.activeElement === searchInput) {
            searchInput.value = '';
            window.filterSubjects();
            searchInput.blur();
        }
    });
})();
