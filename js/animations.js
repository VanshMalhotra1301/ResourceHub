/**
 * BU Resource Hub - High Performance Animations, 3D Tilt & Effects Module
 * Optimized for 60+ FPS fluid scrolling, zero layout thrashing, and native CSS 3D transforms
 */

(function () {
    // ===========================================
    // 1. MOBILE MENU CONTROLS
    // ===========================================
    window.openMobileMenu = function () {
        const menu = document.getElementById('mobile-menu');
        if (menu) {
            menu.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    };

    window.closeMobileMenu = function () {
        const menu = document.getElementById('mobile-menu');
        if (menu) {
            menu.classList.remove('open');
            document.body.style.overflow = '';
        }
    };

    // ===========================================
    // 2. THROTTLED SCROLL PROGRESS & BACK TO TOP
    // ===========================================
    let scrollTicking = false;
    window.addEventListener('scroll', () => {
        if (!scrollTicking) {
            window.requestAnimationFrame(() => {
                const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
                const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

                const progressBar = document.getElementById('scroll-progress');
                if (progressBar) progressBar.style.width = progress + '%';

                const btn = document.getElementById('back-to-top');
                if (btn) {
                    if (scrollTop > 400) btn.classList.add('visible');
                    else btn.classList.remove('visible');
                }
                scrollTicking = false;
            });
            scrollTicking = true;
        }
    }, { passive: true });

    // ===========================================
    // 3. 3D CARD HOVER TILT & LIGHTING (Zero Lag)
    // ===========================================
    let activeCard = null;
    let cardRect = null;

    document.addEventListener('mouseover', (e) => {
        const card = e.target.closest('.tilt-card, .sem-hub-card, .course-card, .premium-card');
        if (card && card !== activeCard) {
            activeCard = card;
            cardRect = card.getBoundingClientRect();
        } else if (!card && activeCard) {
            activeCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
            activeCard = null;
            cardRect = null;
        }
    }, { passive: true });

    document.addEventListener('mousemove', (e) => {
        if (activeCard && cardRect) {
            const x = e.clientX - cardRect.left;
            const y = e.clientY - cardRect.top;

            activeCard.style.setProperty('--mouse-x', `${x}px`);
            activeCard.style.setProperty('--mouse-y', `${y}px`);

            // Calculate 3D tilt angles (max ±7 degrees)
            const centerX = cardRect.width / 2;
            const centerY = cardRect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -6;
            const rotateY = ((x - centerX) / centerX) * 6;

            activeCard.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.018, 1.018, 1.018)`;
        }
    }, { passive: true });

    document.addEventListener('mouseout', (e) => {
        const card = e.target.closest('.tilt-card, .sem-hub-card, .course-card, .premium-card');
        if (card && !card.contains(e.relatedTarget)) {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        }
    }, { passive: true });

    window.addEventListener('scroll', () => {
        if (activeCard) cardRect = activeCard.getBoundingClientRect();
    }, { passive: true });

    // ===========================================
    // 4. GSAP SCROLLTRIGGER & HERO ANIMATIONS
    // ===========================================
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof gsap === 'undefined') return;

        if (typeof ScrollTrigger !== 'undefined') {
            gsap.registerPlugin(ScrollTrigger);
            ScrollTrigger.config({
                fastScrollEnd: true,
                preventOverlaps: true,
                autoRefreshEvents: "DOMContentLoaded,load,resize"
            });
        }

        // Hero Fade In
        gsap.from(".hero-content > *", {
            y: 24,
            opacity: 0,
            duration: 0.9,
            stagger: 0.08,
            ease: "power3.out"
        });

        // Fade In Sections
        const fadeElements = document.querySelectorAll('.fade-in-section');
        fadeElements.forEach(el => {
            gsap.from(el, {
                scrollTrigger: {
                    trigger: el,
                    start: "top 88%",
                    once: true
                },
                y: 28,
                opacity: 0,
                duration: 0.65,
                ease: "power2.out"
            });
        });

        // Semester Cards Stagger
        const semCards = document.querySelectorAll('.sem-hub-card');
        if (semCards.length > 0) {
            gsap.from(semCards, {
                y: 35,
                opacity: 0,
                duration: 0.7,
                stagger: 0.08,
                ease: "power3.out"
            });
        }
    });

    // ===========================================
    // 5. HERO TYPEWRITER HEADLINE (Dynamic Cycle)
    // ===========================================
    (function heroTypewriter() {
        const sentences = [
            'Elevate Your\nAcademic <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-brand-accent">Performance.</span>',
            'Crack Every\nExam With <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-brand-accent">Confidence.</span>',
            'Your Academic\nSuccess Starts <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-brand-accent">Here.</span>'
        ];
        const plain = [
            'Elevate Your\nAcademic Performance.',
            'Crack Every\nExam With Confidence.',
            'Your Academic\nSuccess Starts Here.'
        ];
        const el = document.getElementById('hero-tw-text');
        if (!el) return;

        let sIdx = 0, cIdx = 0, deleting = false;

        function render(text, len) {
            let result = '';
            let count = 0;
            for (let i = 0; i < text.length && count < len; i++) {
                if (text[i] === '\\' && text[i + 1] === 'n') {
                    result += '<br>';
                    i++;
                } else if (text[i] === '\n') {
                    result += '<br>';
                } else {
                    result += text[i];
                    count++;
                }
            }
            return result;
        }

        function getPlainLen(text) {
            return text.replace(/\\n/g, '').replace(/\n/g, '').length;
        }

        function tick() {
            const p = plain[sIdx];
            const totalLen = getPlainLen(p);

            if (!deleting) {
                cIdx++;
                el.innerHTML = render(p, cIdx);
                if (cIdx >= totalLen) {
                    el.innerHTML = sentences[sIdx].replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
                    setTimeout(() => { deleting = true; tick(); }, 2400);
                    return;
                }
                setTimeout(tick, 45 + Math.random() * 25);
            } else {
                cIdx--;
                el.innerHTML = render(p, cIdx);
                if (cIdx <= 0) {
                    deleting = false;
                    sIdx = (sIdx + 1) % sentences.length;
                    setTimeout(tick, 400);
                    return;
                }
                setTimeout(tick, 20 + Math.random() * 15);
            }
        }

        setTimeout(tick, 600);
    })();

    // ===========================================
    // 6. HERO SUBTITLE TYPEWRITER (Skills Seekers Promotion)
    // ===========================================
    (function subTypewriter() {
        const fullText = 'The ultimate archive of verified PYQs, comprehensive and strategic crash courses for Bennett University students.';
        const suffix = ' Engineered by Skills Seekers.';
        const el = document.getElementById('hero-sub-tw');
        const cursor = document.getElementById('hero-sub-cursor');
        if (!el) return;

        let i = 0;
        let phase = 'main';

        function typeNext() {
            if (phase === 'main') {
                if (i < fullText.length) {
                    el.textContent = fullText.substring(0, i + 1);
                    i++;
                    setTimeout(typeNext, 16 + Math.random() * 12);
                } else {
                    phase = 'suffix';
                    i = 0;
                    setTimeout(typeNext, 200);
                }
            } else {
                if (i < suffix.length) {
                    el.innerHTML = fullText + '<br><span class="text-indigo-400 font-semibold">' + suffix.substring(0, i + 1) + '</span>';
                    i++;
                    setTimeout(typeNext, 20 + Math.random() * 16);
                } else {
                    if (cursor) cursor.classList.add('done');
                }
            }
        }

        setTimeout(typeNext, 1400);
    })();

    // ===========================================
    // 7. LIGHTWEIGHT AMBIENT BACKGROUND PARTICLES
    // ===========================================
    (function initCanvasParticles() {
        const canvas = document.getElementById('canvas-container');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];
        let isRunning = true;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize, { passive: true });
        resize();

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.35;
                this.vy = (Math.random() - 0.5) * 0.35;
                this.size = Math.random() * 1.8 + 0.5;
                const colors = ['rgba(99, 102, 241, 0.45)', 'rgba(34, 211, 238, 0.4)', 'rgba(251, 191, 36, 0.35)'];
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;
            }
            draw() {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function init() {
            particles = [];
            for (let i = 0; i < 40; i++) particles.push(new Particle());
        }

        function animate() {
            if (!isRunning) return;
            ctx.clearRect(0, 0, width, height);
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < 14400) {
                        const distance = Math.sqrt(distSq);
                        ctx.strokeStyle = `rgba(99, 102, 241, ${0.08 - distance / 1500})`;
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(animate);
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                isRunning = false;
            } else {
                isRunning = true;
                animate();
            }
        });

        init();
        animate();
    })();
})();
