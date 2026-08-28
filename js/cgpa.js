/**
 * BU Resource Hub - CGPA / SGPA Calculator Module
 */

(function () {
    window.toggleModal = function (modalID) {
        const modal = document.getElementById(modalID);
        if (!modal) return;
        modal.classList.toggle('active');
    };

    window.addSubjectRow = function () {
        const container = document.getElementById('subjectContainer');
        if (!container) return;
        const rowCount = container.querySelectorAll('.subject-row').length + 1;
        const row = document.createElement('div');
        row.className = 'subject-row grid grid-cols-12 gap-3 items-center';
        row.innerHTML = `
            <div class="col-span-6">
                <input type="text" placeholder="Subject ${rowCount}" class="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:bg-zinc-800 transition-all placeholder-zinc-600">
            </div>
            <div class="col-span-3">
                <input type="number" placeholder="4" class="credit-input w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:bg-zinc-800 transition-all placeholder-zinc-600">
            </div>
            <div class="col-span-3">
                <input type="number" placeholder="100" min="0" max="100" class="marks-input w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:bg-zinc-800 transition-all placeholder-zinc-600">
            </div>
        `;
        container.appendChild(row);
    };

    window.getGradePoint = function (marks) {
        if (marks >= 91) return 10;
        if (marks >= 81) return 9;
        if (marks >= 71) return 8;
        if (marks >= 61) return 7;
        if (marks >= 51) return 6;
        if (marks >= 41) return 5; // Pass
        return 0; // Fail
    };

    window.calculateCGPA = function () {
        let totalCredits = 0;
        let totalPoints = 0;
        const creditInputs = document.querySelectorAll('.credit-input');
        const marksInputs = document.querySelectorAll('.marks-input');

        for (let i = 0; i < creditInputs.length; i++) {
            const credit = parseFloat(creditInputs[i].value);
            const marks = parseFloat(marksInputs[i].value);

            if (!isNaN(credit) && !isNaN(marks)) {
                const gp = window.getGradePoint(marks);
                totalCredits += credit;
                totalPoints += credit * gp;
            }
        }

        const resultArea = document.getElementById('resultArea');
        const cgpaValue = document.getElementById('cgpaValue');

        if (totalCredits > 0) {
            const sgpa = (totalPoints / totalCredits).toFixed(2);
            if (cgpaValue) cgpaValue.innerText = sgpa;
            if (resultArea) {
                resultArea.classList.remove('hidden');
                if (typeof gsap !== 'undefined') {
                    gsap.from(resultArea, { scale: 0.95, opacity: 0, duration: 0.35, ease: "back.out(1.4)" });
                }
            }
        } else {
            alert("Please enter valid credits and marks.");
        }
    };
})();
