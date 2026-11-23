/**
 * Skills Seekers AI Chatbot Widget
 * Production-ready Vanilla JavaScript Assistant
 * Zero external dependencies except ChatbotNLP and CHATBOT_KB
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'ss_chatbot_history_v1';

    class SkillsSeekersChatbot {
        constructor() {
            this.isOpen = false;
            this.isInitialized = false;
            this.messages = [];
            this.nlpEngine = null;
            this.elements = {};
            this.hasOpenedBefore = localStorage.getItem('chatbot_opened') === 'true';
        }

        init() {
            this.createDOM();
            this.attachEvents();

            // Load session messages if any
            this.loadSessionHistory();

            // Show Floating Action Button
            setTimeout(() => {
                if (this.elements.fab) {
                    this.elements.fab.classList.remove('hidden');
                }
            }, 1000);
        }

        createDOM() {
            // 1. Floating Action Button (FAB)
            const fab = document.createElement('button');
            fab.className = 'chatbot-fab hidden' + (this.hasOpenedBefore ? ' no-pulse' : '');
            fab.setAttribute('aria-label', 'Open Skills Seekers AI Assistant');
            fab.setAttribute('title', 'Ask Skills Seekers AI');
            fab.innerHTML = '<i class="ph-fill ph-chat-teardrop-dots"></i>';

            if (!this.hasOpenedBefore) {
                const badge = document.createElement('span');
                badge.className = 'chatbot-fab-badge';
                fab.appendChild(badge);
            }

            // 2. Chat Window Container
            const win = document.createElement('div');
            win.className = 'chatbot-window closed';
            win.setAttribute('role', 'dialog');
            win.setAttribute('aria-label', 'Skills Seekers AI Assistant');

            // Header
            const header = document.createElement('div');
            header.className = 'chatbot-header';
            header.innerHTML = `
                <div class="chatbot-header-avatar"><i class="ph-fill ph-robot"></i></div>
                <div class="chatbot-header-info">
                    <div class="chatbot-header-title">Skills Seekers AI</div>
                    <div class="chatbot-header-status"><span class="status-dot"></span> Online • Resource Assistant</div>
                </div>
                <div class="chatbot-header-actions">
                    <button class="chatbot-clear-btn" title="Clear conversation" aria-label="Clear chat"><i class="ph-bold ph-trash"></i></button>
                    <button class="chatbot-minimize-btn" title="Minimize" aria-label="Minimize chat"><i class="ph-bold ph-minus"></i></button>
                    <button class="chatbot-close-btn" title="Close" aria-label="Close chat"><i class="ph-bold ph-x"></i></button>
                </div>
            `;

            // Messages container
            const messagesArea = document.createElement('div');
            messagesArea.className = 'chatbot-messages';
            messagesArea.setAttribute('role', 'log');
            messagesArea.setAttribute('aria-live', 'polite');

            // Quick suggestion chips
            const suggestions = document.createElement('div');
            suggestions.className = 'chatbot-suggestions';

            // Input area
            const inputArea = document.createElement('div');
            inputArea.className = 'chatbot-input-area';
            inputArea.innerHTML = `
                <textarea class="chatbot-input" placeholder="Ask about PYQs, crash courses, tools..." rows="1" aria-label="Type your message"></textarea>
                <button class="chatbot-send-btn" title="Send message" aria-label="Send message" disabled><i class="ph-bold ph-paper-plane-right"></i></button>
            `;

            // Powered by footer
            const powered = document.createElement('div');
            powered.className = 'chatbot-powered';
            powered.textContent = 'Skills Seekers NLP Retrieval Engine • Zero-API Architecture';

            // Assemble window
            win.appendChild(header);
            win.appendChild(messagesArea);
            win.appendChild(suggestions);
            win.appendChild(inputArea);
            win.appendChild(powered);

            // Mount to DOM
            document.body.appendChild(fab);
            document.body.appendChild(win);

            // Cache element references
            this.elements = {
                fab: fab,
                window: win,
                header: header,
                messages: messagesArea,
                suggestions: suggestions,
                input: inputArea.querySelector('.chatbot-input'),
                sendBtn: inputArea.querySelector('.chatbot-send-btn'),
                clearBtn: header.querySelector('.chatbot-clear-btn'),
                minimizeBtn: header.querySelector('.chatbot-minimize-btn'),
                closeBtn: header.querySelector('.chatbot-close-btn')
            };
        }

        attachEvents() {
            // FAB open
            this.elements.fab.addEventListener('click', () => this.open());

            // Header buttons
            this.elements.closeBtn.addEventListener('click', () => this.close());
            this.elements.minimizeBtn.addEventListener('click', () => this.close());
            this.elements.clearBtn.addEventListener('click', () => this.clearHistory());

            // Message send
            this.elements.sendBtn.addEventListener('click', () => this.sendMessage());

            // Input handling & Auto-resize
            this.elements.input.addEventListener('input', () => {
                const text = this.elements.input.value.trim();
                this.elements.sendBtn.disabled = !text;
                this.elements.input.style.height = 'auto';
                this.elements.input.style.height = Math.min(this.elements.input.scrollHeight, 80) + 'px';
            });

            // Enter key to send
            this.elements.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (this.elements.input.value.trim()) {
                        this.sendMessage();
                    }
                }
            });

            // Escape key to close
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            });

            // Mobile click outside to close
            document.addEventListener('click', (e) => {
                if (this.isOpen && window.innerWidth <= 640) {
                    if (!this.elements.window.contains(e.target) && !this.elements.fab.contains(e.target)) {
                        this.close();
                    }
                }
            });
        }

        open() {
            if (this.isOpen) return;
            this.isOpen = true;
            this.elements.window.classList.remove('closed');
            this.elements.window.classList.add('open');
            this.elements.fab.classList.add('hidden');

            if (!this.hasOpenedBefore) {
                localStorage.setItem('chatbot_opened', 'true');
                this.hasOpenedBefore = true;
                const badge = this.elements.fab.querySelector('.chatbot-fab-badge');
                if (badge) badge.remove();
            }

            if (!this.isInitialized) {
                this.initializeEngine();
            }

            // Focus textarea after opening transition
            setTimeout(() => {
                this.elements.input.focus();
                this.scrollToBottom();
            }, 300);
        }

        close() {
            if (!this.isOpen) return;
            this.isOpen = false;
            this.elements.window.classList.remove('open');
            this.elements.window.classList.add('closed');
            this.elements.fab.classList.remove('hidden');
            this.elements.fab.classList.add('no-pulse');
        }

        initializeEngine() {
            if (this.isInitialized) return;

            try {
                if (!window.ChatbotNLP || !window.CHATBOT_KB) {
                    throw new Error("ChatbotNLP or CHATBOT_KB not loaded in global window");
                }
                this.nlpEngine = new window.ChatbotNLP(window.CHATBOT_KB);
                this.nlpEngine.initialize();
                this.isInitialized = true;

                // If messages are empty, show welcome screen
                if (this.messages.length === 0) {
                    this.showWelcome();
                    this.showInitialSuggestions();
                }
            } catch (err) {
                console.error('[Chatbot] Engine init error:', err);
                this.addBotMessage('Sorry, I had trouble starting up. Please refresh the page and try again.');
            }
        }

        showWelcome() {
            const welcomeDiv = document.createElement('div');
            welcomeDiv.className = 'chatbot-welcome';
            welcomeDiv.innerHTML = `
                <span class="chatbot-welcome-emoji">👋</span>
                <h3>Skills Seekers AI Resource Assistant</h3>
                <p>Welcome! Ask me anything about Bennett University academic resources:</p>
                <ul>
                    <li>Verified PYQs for all semesters (1-5)</li>
                    <li>Skills Seekers crash courses & video sprints</li>
                    <li>Academic study tools (CGPA, Pomodoro, Notes)</li>
                    <li>Visual DSA & OS virtual interactive labs</li>
                    <li>Top educators & 1-on-1 live class mentorship</li>
                </ul>
            `;
            this.elements.messages.appendChild(welcomeDiv);
        }

        showInitialSuggestions() {
            const chips = [
                'Show Semester 1 PYQs',
                'What courses are available?',
                'How to calculate CGPA?',
                'Tell me about Visual DSA Lab',
                'Who are the top educators?',
                'How to share PYQs?'
            ];
            this.showSuggestions(chips);
        }

        showSuggestions(chips) {
            this.elements.suggestions.innerHTML = '';
            chips.forEach(text => {
                const chip = document.createElement('button');
                chip.className = 'chatbot-suggestion-chip';
                chip.textContent = text;
                chip.addEventListener('click', () => {
                    this.elements.input.value = text;
                    this.sendMessage();
                });
                this.elements.suggestions.appendChild(chip);
            });
        }

        async sendMessage() {
            const text = this.elements.input.value.trim();
            if (!text) return;

            if (!this.nlpEngine) {
                this.initializeEngine();
            }

            // Clear input & reset height
            this.elements.input.value = '';
            this.elements.input.style.height = 'auto';
            this.elements.sendBtn.disabled = true;

            // Render user bubble
            this.addUserMessage(text);
            this.saveMessage('user', text);

            // Render animated typing indicator
            const typingEl = this.showTyping();

            // Process query through NLP engine
            let response;
            try {
                response = this.nlpEngine.processQuery(text);
            } catch (e) {
                console.error('[Chatbot] Query processing error:', e);
                response = {
                    text: "I encountered an error processing your question. Please try asking in a different way.",
                    links: [],
                    suggestedPrompts: ['Show Semester 1 PYQs', 'What courses are available?'],
                    confidence: 0,
                    intent: 'ERROR'
                };
            }

            // Natural typing delay based on response length (300ms - 800ms)
            const delay = Math.min(300 + (response.text?.length || 0) * 1.5, 800);
            await new Promise(resolve => setTimeout(resolve, delay));

            // Remove typing indicator
            typingEl.remove();

            // Render bot response
            this.addBotResponse(response);
            this.saveMessage('bot', response.text, response.links, response.confidence, response.intent);

            // Update suggestions carousel
            if (response.suggestedPrompts && response.suggestedPrompts.length > 0) {
                this.showSuggestions(response.suggestedPrompts);
            }

            this.scrollToBottom();
        }

        addUserMessage(text) {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'chatbot-message user';

            const avatar = document.createElement('div');
            avatar.className = 'chatbot-message-avatar';
            avatar.innerHTML = '<i class="ph-fill ph-user"></i>';

            const bubble = document.createElement('div');
            bubble.className = 'chatbot-message-bubble';
            bubble.textContent = text; // Safe textContent against XSS

            msgDiv.appendChild(avatar);
            msgDiv.appendChild(bubble);
            this.elements.messages.appendChild(msgDiv);
            this.scrollToBottom();
        }

        addBotMessage(text) {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'chatbot-message bot';

            const avatar = document.createElement('div');
            avatar.className = 'chatbot-message-avatar';
            avatar.innerHTML = '<i class="ph-fill ph-robot"></i>';

            const bubble = document.createElement('div');
            bubble.className = 'chatbot-message-bubble';
            bubble.innerHTML = this.formatBotText(text);

            msgDiv.appendChild(avatar);
            msgDiv.appendChild(bubble);
            this.elements.messages.appendChild(msgDiv);
            this.scrollToBottom();
        }

        addBotResponse(response) {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'chatbot-message bot';

            const avatar = document.createElement('div');
            avatar.className = 'chatbot-message-avatar';
            avatar.innerHTML = '<i class="ph-fill ph-robot"></i>';

            const contentWrapper = document.createElement('div');
            contentWrapper.style.display = 'flex';
            contentWrapper.style.flexDirection = 'column';
            contentWrapper.style.width = '100%';

            const bubble = document.createElement('div');
            bubble.className = 'chatbot-message-bubble';
            bubble.innerHTML = this.formatBotText(response.text);
            contentWrapper.appendChild(bubble);

            // Render resource cards if any
            if (response.links && response.links.length > 0) {
                response.links.forEach(link => {
                    const card = this.createResourceCard(link);
                    contentWrapper.appendChild(card);
                });
            }

            // Confidence indicator for low/medium scores
            if (response.confidence < 0.75 && response.confidence >= 0.15) {
                const confDiv = document.createElement('div');
                confDiv.className = 'chatbot-confidence ' + (response.confidence >= 0.4 ? 'medium' : 'low');
                confDiv.innerHTML = '<i class="ph-bold ph-info"></i> ' +
                    (response.confidence >= 0.4 ? 'Fairly confident answer' : 'Best match in knowledge base');
                contentWrapper.appendChild(confDiv);
            }

            msgDiv.appendChild(avatar);
            msgDiv.appendChild(contentWrapper);
            this.elements.messages.appendChild(msgDiv);
            this.scrollToBottom();
        }

        formatBotText(text) {
            if (!text) return '';

            // 1. Escape HTML for safety
            let safe = text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            // 2. Bold: **text**
            safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

            // 3. Italic: *text*
            safe = safe.replace(/\*(.+?)\*/g, '<em>$1</em>');

            // 4. Inline code: `text`
            safe = safe.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:2px 5px;border-radius:4px;font-size:11px;color:#c7d2fe;">$1</code>');

            // 5. Links: [label](url)
            safe = safe.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#818cf8;text-decoration:underline;">$1</a>');

            // 6. Bullet lists
            safe = safe.replace(/^[•\-]\s+(.+)$/gm, '<li>$1</li>');
            if (safe.includes('<li>')) {
                safe = safe.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
                safe = safe.replace(/<\/ul>\s*<ul>/g, '');
            }

            // 7. Newlines
            safe = safe.replace(/\n/g, '<br>');
            safe = safe.replace(/<br><ul>/g, '<ul>');
            safe = safe.replace(/<\/ul><br>/g, '</ul>');

            return safe;
        }

        createResourceCard(link) {
            const card = document.createElement('a');
            card.className = 'chatbot-resource-card';
            card.href = link.url || '#';

            // Check if this is a Google Drive link
            const isDriveUrl = link.url && link.url.includes('drive.google.com/file/d/');
            let driveFileId = null;
            if (isDriveUrl) {
                const match = link.url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                if (match) driveFileId = match[1];
            }

            if (isDriveUrl && driveFileId && typeof window.openDriveModal === 'function') {
                // If in-site drive modal preview is available, wire it up!
                card.target = '_self';
                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.openDriveModal(driveFileId, link.title);
                });
            } else if (link.url.startsWith('/')) {
                card.target = '_self';
            } else {
                card.target = '_blank';
                card.rel = 'noopener';
            }

            // Determine Icon
            let iconClass = 'nav';
            let iconName = 'ph-arrow-right';
            if (link.type === 'pyq' || isDriveUrl) {
                iconClass = 'pdf';
                iconName = 'ph-file-pdf';
            } else if (link.type === 'course') {
                iconClass = 'course';
                iconName = 'ph-graduation-cap';
            } else if (link.type === 'tool') {
                iconClass = 'tool';
                iconName = 'ph-wrench';
            } else if (link.type === 'external') {
                iconClass = 'external';
                iconName = 'ph-arrow-square-out';
            }

            const iconDiv = document.createElement('div');
            iconDiv.className = 'card-icon ' + iconClass;
            iconDiv.innerHTML = '<i class="ph-fill ' + iconName + '"></i>';

            const contentDiv = document.createElement('div');
            contentDiv.className = 'card-content';

            const title = document.createElement('span');
            title.className = 'card-title';
            title.textContent = link.title;

            const subtitle = document.createElement('span');
            subtitle.className = 'card-subtitle';
            subtitle.textContent = link.subtitle || (isDriveUrl ? 'Preview in Site • PDF' :
                                   link.url.startsWith('/') ? 'BU Resource Hub' : 'Skills Seekers');

            contentDiv.appendChild(title);
            contentDiv.appendChild(subtitle);

            const arrow = document.createElement('i');
            arrow.className = (isDriveUrl && typeof window.openDriveModal === 'function')
                ? 'ph-bold ph-eye card-arrow'
                : 'ph-bold ph-arrow-square-out card-arrow';

            card.appendChild(iconDiv);
            card.appendChild(contentDiv);
            card.appendChild(arrow);

            return card;
        }

        showTyping() {
            const typingDiv = document.createElement('div');
            typingDiv.className = 'chatbot-typing';

            const avatar = document.createElement('div');
            avatar.className = 'chatbot-message-avatar';
            avatar.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))';
            avatar.style.color = '#a5b4fc';
            avatar.style.border = '1px solid rgba(99, 102, 241, 0.2)';
            avatar.innerHTML = '<i class="ph-fill ph-robot"></i>';

            const dots = document.createElement('div');
            dots.className = 'chatbot-typing-dots';
            dots.innerHTML = '<span></span><span></span><span></span>';

            typingDiv.appendChild(avatar);
            typingDiv.appendChild(dots);
            this.elements.messages.appendChild(typingDiv);
            this.scrollToBottom();

            return typingDiv;
        }

        scrollToBottom() {
            requestAnimationFrame(() => {
                if (this.elements.messages) {
                    this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
                }
            });
        }

        // ── Session Storage Management ────────────────
        saveMessage(role, text, links = [], confidence = 1, intent = '') {
            this.messages.push({ role, text, links, confidence, intent });
            try {
                // Keep last 30 messages in sessionStorage
                const trimmed = this.messages.slice(-30);
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
            } catch (e) { /* non-fatal quota ignore */ }
        }

        loadSessionHistory() {
            try {
                const stored = sessionStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        this.messages = parsed;
                        this.elements.messages.innerHTML = '';
                        this.messages.forEach(msg => {
                            if (msg.role === 'user') {
                                this.addUserMessage(msg.text);
                            } else {
                                this.addBotResponse({
                                    text: msg.text,
                                    links: msg.links || [],
                                    confidence: msg.confidence || 1,
                                    intent: msg.intent || ''
                                });
                            }
                        });
                        this.showInitialSuggestions();
                        return;
                    }
                }
            } catch (e) {
                console.warn('[Chatbot] Failed to load history:', e);
            }
        }

        clearHistory() {
            this.messages = [];
            try {
                sessionStorage.removeItem(STORAGE_KEY);
            } catch (e) {}

            this.elements.messages.innerHTML = '';
            this.showWelcome();
            this.showInitialSuggestions();
        }
    }

    // ── Global Mount & Initialization ─────────────────
    function initChatbot() {
        if (window.skillsSeekersChatbot) return; // prevent duplicate init

        if (window.CHATBOT_KB && window.ChatbotNLP) {
            window.skillsSeekersChatbot = new SkillsSeekersChatbot();
            window.skillsSeekersChatbot.init();
        } else {
            // If KB or NLP script is loading async, wait up to 2 seconds
            let attempts = 0;
            const checker = setInterval(() => {
                attempts++;
                if (window.CHATBOT_KB && window.ChatbotNLP) {
                    clearInterval(checker);
                    window.skillsSeekersChatbot = new SkillsSeekersChatbot();
                    window.skillsSeekersChatbot.init();
                } else if (attempts >= 20) {
                    clearInterval(checker);
                    console.warn('[Chatbot] Knowledge base or NLP engine not found after timeout.');
                }
            }, 100);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChatbot);
    } else {
        initChatbot();
    }
})();
