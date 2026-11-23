/**
 * Skills Seekers AI Chatbot Widget (V2 - Enhanced)
 * Production-ready Vanilla JavaScript Assistant
 * Features:
 * - Natural Voice Speech Synthesis (Web Speech API)
 * - Auto-readout toggle & individual message "Listen" controls
 * - In-site Drive modal preview integration
 * - Viewport-safe responsive layout & auto-scrolling
 * - Session history persistence with clear conversation
 * - Dynamic suggested prompt chips carousel
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'ss_chatbot_history_v2';
    const VOICE_KEY = 'ss_chatbot_voice_v2';
    const CALLOUT_KEY = 'ss_chatbot_callout_dismissed_v2';

    class SkillsSeekersChatbot {
        constructor() {
            this.isOpen = false;
            this.isInitialized = false;
            this.messages = [];
            this.nlpEngine = null;
            this.elements = {};
            this.hasOpenedBefore = localStorage.getItem('chatbot_opened') === 'true';
            this.isVoiceEnabled = localStorage.getItem(VOICE_KEY) === 'true';
            this.isCalloutDismissed = sessionStorage.getItem(CALLOUT_KEY) === 'true';
            this.currentUtterance = null;
            this.activeSpeakBtn = null;
            this.activeStreamInterval = null;
        }

        init() {
            this.createDOM();
            this.attachEvents();
            this.loadSessionHistory();

            setTimeout(() => {
                if (this.elements.fab) {
                    this.elements.fab.classList.remove('hidden');
                }
                if (this.elements.callout && !this.isCalloutDismissed && !this.isOpen) {
                    this.elements.callout.classList.remove('dismissed');
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

            // 1.5 Floating Launcher Callout Pill
            const callout = document.createElement('div');
            callout.className = 'chatbot-launcher-callout' + (this.isCalloutDismissed ? ' dismissed' : '');
            callout.id = 'chatbot-launcher-callout';
            callout.setAttribute('title', 'Click to open Skills Seekers Chatbox');
            callout.innerHTML = `
                <div class="chatbot-callout-icon">✨</div>
                <div class="chatbot-callout-body">
                    <div class="chatbot-callout-title">Chat with Skills Seekers Chatbox</div>
                    <div class="chatbot-callout-desc">Find quick doubts and fast searches</div>
                </div>
                <button class="chatbot-callout-close" title="Dismiss">&times;</button>
            `;

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
                    <button class="chatbot-voice-toggle-btn ${this.isVoiceEnabled ? 'active' : ''}" title="${this.isVoiceEnabled ? 'Voice Readout: ON' : 'Voice Readout: OFF'}" aria-label="Toggle Voice Readout">
                        <i class="ph-bold ${this.isVoiceEnabled ? 'ph-speaker-high' : 'ph-speaker-slash'}"></i>
                    </button>
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
            document.body.appendChild(callout);
            document.body.appendChild(fab);
            document.body.appendChild(win);

            // Cache element references
            this.elements = {
                callout: callout,
                fab: fab,
                window: win,
                header: header,
                messages: messagesArea,
                suggestions: suggestions,
                input: inputArea.querySelector('.chatbot-input'),
                sendBtn: inputArea.querySelector('.chatbot-send-btn'),
                voiceToggleBtn: header.querySelector('.chatbot-voice-toggle-btn'),
                clearBtn: header.querySelector('.chatbot-clear-btn'),
                minimizeBtn: header.querySelector('.chatbot-minimize-btn'),
                closeBtn: header.querySelector('.chatbot-close-btn')
            };
        }

        attachEvents() {
            this.elements.fab.addEventListener('click', () => this.open());
            this.elements.closeBtn.addEventListener('click', () => this.close());
            this.elements.minimizeBtn.addEventListener('click', () => this.close());
            this.elements.clearBtn.addEventListener('click', () => this.clearHistory());
            this.elements.voiceToggleBtn.addEventListener('click', () => this.toggleVoiceMode());

            if (this.elements.callout) {
                this.elements.callout.addEventListener('click', (e) => {
                    if (e.target.closest('.chatbot-callout-close')) {
                        e.stopPropagation();
                        this.elements.callout.classList.add('dismissed');
                        this.isCalloutDismissed = true;
                        sessionStorage.setItem(CALLOUT_KEY, 'true');
                    } else {
                        this.open();
                    }
                });
            }

            this.elements.sendBtn.addEventListener('click', () => this.sendMessage());

            this.elements.input.addEventListener('input', () => {
                const text = this.elements.input.value.trim();
                this.elements.sendBtn.disabled = !text;
                this.elements.input.style.height = 'auto';
                this.elements.input.style.height = Math.min(this.elements.input.scrollHeight, 80) + 'px';
            });

            this.elements.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (this.elements.input.value.trim()) {
                        this.sendMessage();
                    }
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            });

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
            if (this.elements.callout) {
                this.elements.callout.classList.add('dismissed');
            }

            if (!this.hasOpenedBefore) {
                localStorage.setItem('chatbot_opened', 'true');
                this.hasOpenedBefore = true;
                const badge = this.elements.fab.querySelector('.chatbot-fab-badge');
                if (badge) badge.remove();
            }

            if (!this.isInitialized) {
                this.initializeEngine();
            }

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
            if (!this.isCalloutDismissed && this.elements.callout) {
                this.elements.callout.classList.remove('dismissed');
            }
            this.stopSpeaking();
        }

        initializeEngine() {
            if (this.isInitialized) return;

            try {
                if (!window.ChatbotNLP || !window.CHATBOT_KB) {
                    throw new Error("ChatbotNLP or CHATBOT_KB not loaded in window");
                }
                this.nlpEngine = new window.ChatbotNLP(window.CHATBOT_KB);
                this.nlpEngine.initialize();
                this.isInitialized = true;

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
            const heroDiv = document.createElement('div');
            heroDiv.className = 'chatbot-hero-card';
            heroDiv.innerHTML = `
                <div class="chatbot-hero-glow"></div>
                <div class="chatbot-hero-badge"><span class="status-dot"></span> AI Resource Assistant</div>
                <h3 class="chatbot-hero-heading">Chat with Skills Seekers Chatbox</h3>
                <p class="chatbot-hero-sub">Find quick doubts, instant PYQ solutions, course sprints & fast searches across Bennett University.</p>
                <div class="chatbot-hero-tags">
                    <span class="chatbot-hero-tag"><i class="ph-bold ph-lightning"></i> Quick Doubts</span>
                    <span class="chatbot-hero-tag"><i class="ph-bold ph-magnifying-glass"></i> Fast Searches</span>
                    <span class="chatbot-hero-tag"><i class="ph-bold ph-file-pdf"></i> Verified PYQs</span>
                    <span class="chatbot-hero-tag"><i class="ph-bold ph-graduation-cap"></i> Courses</span>
                    <span class="chatbot-hero-tag"><i class="ph-bold ph-speaker-high"></i> Voice Audio</span>
                </div>
            `;
            this.elements.messages.appendChild(heroDiv);
        }

        showInitialSuggestions() {
            const chips = [
                'Show Semester 1 PYQs',
                'Browse all educators',
                'What courses are available?',
                'How to calculate CGPA?',
                'Who built this platform?',
                'What do students say? (Reviews)'
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

            this.stopSpeaking();
            if (this.activeStreamInterval) {
                clearInterval(this.activeStreamInterval);
                this.activeStreamInterval = null;
            }

            this.elements.input.value = '';
            this.elements.input.style.height = 'auto';
            this.elements.sendBtn.disabled = true;

            this.addUserMessage(text);
            this.saveMessage('user', text);

            const typingEl = this.showTyping();

            let response;
            try {
                response = this.nlpEngine.processQuery(text);
            } catch (e) {
                console.error('[Chatbot] Query processing error:', e);
                response = {
                    text: "I encountered an error processing your question. Please try asking in a different way.",
                    speakText: "I encountered an error. Please try asking in a different way.",
                    links: [],
                    suggestedPrompts: ['Show Semester 1 PYQs', 'What courses are available?'],
                    confidence: 0,
                    intent: 'ERROR'
                };
            }

            const delay = Math.min(200 + (response.text?.length || 0) * 0.8, 550);
            await new Promise(resolve => setTimeout(resolve, delay));

            typingEl.remove();

            // Render live streaming bot response with ChatGPT typewriter effect
            this.addBotResponse(response, true);
            this.saveMessage('bot', response.text, response.links, response.confidence, response.intent, response.speakText);

            if (response.suggestedPrompts && response.suggestedPrompts.length > 0) {
                this.showSuggestions(response.suggestedPrompts);
            }

            this.scrollToBottom();
        }

        typewriterStream(bubbleElement, fullText, onComplete) {
            if (this.activeStreamInterval) {
                clearInterval(this.activeStreamInterval);
                this.activeStreamInterval = null;
            }

            // Word and whitespace tokens for smooth, steady GPT streaming
            const tokens = fullText.split(/(\s+|\n)/);
            let currentIndex = 0;
            let currentText = '';

            bubbleElement.innerHTML = '<span class="chatbot-stream-cursor"></span>';

            // Constant, soothing speed: ~20ms per token
            const streamSpeed = 20;

            this.activeStreamInterval = setInterval(() => {
                if (currentIndex < tokens.length) {
                    currentText += tokens[currentIndex];
                    currentIndex++;
                    bubbleElement.innerHTML = this.formatBotText(currentText) + '<span class="chatbot-stream-cursor"></span>';
                    this.scrollToBottom();
                } else {
                    clearInterval(this.activeStreamInterval);
                    this.activeStreamInterval = null;
                    bubbleElement.innerHTML = this.formatBotText(fullText);
                    this.scrollToBottom();
                    if (onComplete) onComplete();
                }
            }, streamSpeed);
        }

        addUserMessage(text) {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'chatbot-message user';

            const avatar = document.createElement('div');
            avatar.className = 'chatbot-message-avatar';
            avatar.innerHTML = '<i class="ph-fill ph-user"></i>';

            const bubble = document.createElement('div');
            bubble.className = 'chatbot-message-bubble';
            bubble.textContent = text;

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

        addBotResponse(response, isStreaming = true) {
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
            contentWrapper.appendChild(bubble);

            msgDiv.appendChild(avatar);
            msgDiv.appendChild(contentWrapper);
            this.elements.messages.appendChild(msgDiv);
            this.scrollToBottom();

            const renderPostMessageItems = () => {
                // Resource cards
                if (response.links && response.links.length > 0) {
                    response.links.forEach(link => {
                        const card = this.createResourceCard(link);
                        contentWrapper.appendChild(card);
                    });
                }

                // Action row: Confidence badge + Listen (TTS) button
                const actionsRow = document.createElement('div');
                actionsRow.className = 'chatbot-msg-actions';

                // Speech Listen Button
                const speechText = response.speakText || this.extractCleanText(response.text);
                let speakBtn = null;
                if (speechText && ('speechSynthesis' in window)) {
                    speakBtn = document.createElement('button');
                    speakBtn.className = 'chatbot-speak-btn';
                    speakBtn.setAttribute('title', 'Listen to answer');
                    speakBtn.setAttribute('aria-label', 'Read response aloud');
                    speakBtn.innerHTML = '<i class="ph-bold ph-speaker-high"></i> Listen';
                    speakBtn.addEventListener('click', () => {
                        if (speakBtn.classList.contains('speaking')) {
                            this.stopSpeaking();
                        } else {
                            this.speak(speechText, speakBtn);
                        }
                    });
                    actionsRow.appendChild(speakBtn);
                }

                // Confidence indicator
                if (response.confidence < 0.75 && response.confidence >= 0.15) {
                    const confDiv = document.createElement('div');
                    confDiv.className = 'chatbot-confidence ' + (response.confidence >= 0.4 ? 'medium' : 'low');
                    confDiv.innerHTML = '<i class="ph-bold ph-info"></i> ' +
                        (response.confidence >= 0.4 ? 'Fairly confident answer' : 'Best match in knowledge base');
                    actionsRow.appendChild(confDiv);
                }

                if (actionsRow.children.length > 0) {
                    contentWrapper.appendChild(actionsRow);
                }

                this.scrollToBottom();

                // Trigger voice readout if enabled
                if (this.isVoiceEnabled && response.speakText) {
                    this.speak(response.speakText, speakBtn);
                }
            };

            if (isStreaming) {
                this.typewriterStream(bubble, response.text, renderPostMessageItems);
            } else {
                bubble.innerHTML = this.formatBotText(response.text);
                renderPostMessageItems();
            }

            return msgDiv;
        }

        formatBotText(text) {
            if (!text) return '';

            let safe = text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            safe = safe.replace(/\*(.+?)\*/g, '<em>$1</em>');
            safe = safe.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:2px 5px;border-radius:4px;font-size:11px;color:#c7d2fe;">$1</code>');
            safe = safe.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#818cf8;text-decoration:underline;">$1</a>');

            safe = safe.replace(/^[•\-]\s+(.+)$/gm, '<li>$1</li>');
            if (safe.includes('<li>')) {
                safe = safe.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
                safe = safe.replace(/<\/ul>\s*<ul>/g, '');
            }

            safe = safe.replace(/\n/g, '<br>');
            safe = safe.replace(/<br><ul>/g, '<ul>');
            safe = safe.replace(/<\/ul><br>/g, '</ul>');

            return safe;
        }

        createResourceCard(link) {
            const card = document.createElement('a');
            card.className = 'chatbot-resource-card';
            card.href = link.url || '#';

            const isDriveUrl = link.url && link.url.includes('drive.google.com/file/d/');
            let driveFileId = null;
            if (isDriveUrl) {
                const match = link.url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                if (match) driveFileId = match[1];
            }

            if (isDriveUrl && driveFileId && typeof window.openDriveModal === 'function') {
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

        // ── Speech Synthesis (Voice Readout) ──────────
        toggleVoiceMode() {
            this.isVoiceEnabled = !this.isVoiceEnabled;
            localStorage.setItem(VOICE_KEY, this.isVoiceEnabled ? 'true' : 'false');

            const btn = this.elements.voiceToggleBtn;
            if (this.isVoiceEnabled) {
                btn.classList.add('active');
                btn.title = 'Voice Readout: ON';
                btn.innerHTML = '<i class="ph-bold ph-speaker-high"></i>';
                this.speak("Voice readout enabled.");
            } else {
                btn.classList.remove('active');
                btn.title = 'Voice Readout: OFF';
                btn.innerHTML = '<i class="ph-bold ph-speaker-slash"></i>';
                this.stopSpeaking();
            }
        }

        speak(text, btnElement = null) {
            if (!('speechSynthesis' in window) || !text) return;

            this.stopSpeaking();

            const utter = new SpeechSynthesisUtterance(text);
            utter.rate = 1.05;
            utter.pitch = 1.0;
            utter.lang = 'en-US';

            // Find an English voice if available
            const voices = window.speechSynthesis.getVoices();
            const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
            if (englishVoice) {
                utter.voice = englishVoice;
            }

            if (btnElement) {
                this.activeSpeakBtn = btnElement;
                btnElement.classList.add('speaking');
                btnElement.innerHTML = '<i class="ph-fill ph-speaker-simple-high"></i> Stop';
            }

            utter.onend = () => {
                this.resetSpeakButton();
            };

            utter.onerror = () => {
                this.resetSpeakButton();
            };

            this.currentUtterance = utter;
            window.speechSynthesis.speak(utter);
        }

        stopSpeaking() {
            if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
            this.resetSpeakButton();
        }

        resetSpeakButton() {
            if (this.activeSpeakBtn) {
                this.activeSpeakBtn.classList.remove('speaking');
                this.activeSpeakBtn.innerHTML = '<i class="ph-bold ph-speaker-high"></i> Listen';
                this.activeSpeakBtn = null;
            }
            this.currentUtterance = null;
        }

        extractCleanText(htmlOrMarkdown) {
            if (!htmlOrMarkdown) return '';
            return htmlOrMarkdown
                .replace(/<[^>]+>/g, ' ')
                .replace(/\*\*(.+?)\*\*/g, '$1')
                .replace(/\*(.+?)\*/g, '$1')
                .replace(/`([^`]+)`/g, '$1')
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .replace(/^[•\-]\s+/gm, '')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 220);
        }

        // ── Session Storage Management ────────────────
        saveMessage(role, text, links = [], confidence = 1, intent = '', speakText = '') {
            this.messages.push({ role, text, links, confidence, intent, speakText });
            try {
                const trimmed = this.messages.slice(-30);
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
            } catch (e) {}
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
                                    intent: msg.intent || '',
                                    speakText: msg.speakText || ''
                                }, false);
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
            this.stopSpeaking();
            if (this.activeStreamInterval) {
                clearInterval(this.activeStreamInterval);
                this.activeStreamInterval = null;
            }
            this.messages = [];
            try {
                sessionStorage.removeItem(STORAGE_KEY);
            } catch (e) {}

            this.elements.messages.innerHTML = '';
            this.showWelcome();
            this.showInitialSuggestions();
        }
    }

    function initChatbot() {
        if (window.skillsSeekersChatbot) return;

        if (window.CHATBOT_KB && window.ChatbotNLP) {
            window.skillsSeekersChatbot = new SkillsSeekersChatbot();
            window.skillsSeekersChatbot.init();
        } else {
            let attempts = 0;
            const checker = setInterval(() => {
                attempts++;
                if (window.CHATBOT_KB && window.ChatbotNLP) {
                    clearInterval(checker);
                    window.skillsSeekersChatbot = new SkillsSeekersChatbot();
                    window.skillsSeekersChatbot.init();
                } else if (attempts >= 25) {
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
