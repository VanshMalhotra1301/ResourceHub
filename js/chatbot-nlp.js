/**
 * Skills Seekers AI Chatbot - NLP & Retrieval Engine (V2 - Expanded)
 * High-performance, zero-dependency client/server NLP system.
 * Features:
 * - Scraped live data integration from www.skillsseekers.com
 * - Founder & Mission Info (Pratham Kocher)
 * - Real Student Testimonials & Success Stories
 * - Platform Achievements & YouTube stats (25K+ learners, 180K+ views)
 * - Order policies, account device limits, and platform FAQs
 * - Preprocessing, Tokenization, Domain Synonyms, and Morphological Stemming
 * - Robust Intent Classifier & Zero-Fail Suggestion Chip matching
 * - TF-IDF Vector Space Model & Cosine Similarity
 * - Dialogue Manager with Session Context Tracking
 * - Clean Speech Synthesis (TTS) Text Generation
 */

(function () {
    'use strict';

    // ── 1. Stopwords List ─────────────────────────────
    const STOPWORDS = new Set([
        'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t',
        'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
        'can', 'cannot', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for',
        'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him',
        'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more',
        'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
        'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such',
        'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
        'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were',
        'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your',
        'yours', 'yourself', 'yourselves'
    ]);

    const PRESERVED_TOKENS = new Set(['1', '2', '3', '4', '5']);

    // ── 2. Contractions Map ───────────────────────────
    const CONTRACTIONS = {
        "what's": "what is", "who's": "who is", "where's": "where is", "how's": "how is",
        "it's": "it is", "that's": "that is", "can't": "cannot", "won't": "will not",
        "i'm": "i am", "i've": "i have", "i'll": "i will", "i'd": "i would",
        "you're": "you are", "we're": "we are", "they're": "they are", "there's": "there is",
        "don't": "do not", "doesn't": "does not", "didn't": "did not", "haven't": "have not",
        "hasn't": "has not", "shouldn't": "should not", "wouldn't": "would not"
    };

    // ── 3. Domain Synonyms Map ─────────────────────────
    const SYNONYM_MAP = {
        'pyq': 'pyq', 'pyqs': 'pyq', 'pyp': 'pyq', 'pyps': 'pyq', 'paper': 'pyq', 'papers': 'pyq',
        'midsem': 'midsem', 'midterms': 'midsem', 'midterm': 'midsem', 'endsem': 'endsem', 'endterms': 'endsem', 'endterm': 'endsem',
        'course': 'course', 'courses': 'course', 'sprint': 'course', 'sprints': 'course', 'mastercourse': 'course', 'mastercourses': 'course',
        'bundle': 'course', 'bundles': 'course', 'tutorial': 'course', 'tutorials': 'course', 'lecture': 'course', 'lectures': 'course',
        'teacher': 'educator', 'teachers': 'educator', 'educator': 'educator', 'educators': 'educator', 'instructor': 'educator', 'faculty': 'educator', 'mentor': 'educator',
        'calculator': 'tool', 'pomodoro': 'tool', 'timer': 'tool', 'countdown': 'tool', 'scratchpad': 'tool',
        'review': 'testimonial', 'reviews': 'testimonial', 'testimonial': 'testimonial', 'testimonials': 'testimonial',
        'feedback': 'testimonial', 'ratings': 'testimonial', 'story': 'testimonial', 'stories': 'testimonial',
        'algorithm': 'daa', 'algorithms': 'daa', 'daaa': 'daa', 'scheduling': 'os', 'pratham': 'founder'
    };

    // Canonical Subject Mapping
    const CANONICAL_SUBJECTS = {
        'Engineering Calculus': ['engineering calculus', 'calculus', 'calc', 'engg calc', 'cset 101 math', 'math 1', 'maths 1', 'differential calculus', 'integral'],
        'Electronics': ['electronics', 'ece', 'basic electronics', 'electronic circuits', 'semiconductors'],
        'Mechanics & Electromagnetism': ['mechanics & electromagnetism', 'mechanics', 'electromagnetism', 'physics', 'ephy', 'em', 'electro', 'magnetic'],
        'Computational Thinking': ['computational thinking', 'computational thinking & programming', 'python', 'python programming', 'ct', 'coding in python'],
        'Digital Design': ['digital design', 'dd', 'logic design', 'logic gates', 'k-map', 'flip flop', 'sequential circuits'],
        'Linear Algebra & ODE': ['linear algebra & ode', 'linear algebra', 'ode', 'differential equations', 'matrices', 'matrix', 'eigenvalues'],
        'OOP (Java)': ['oop (java)', 'oop', 'java', 'object oriented', 'object oriented programming'],
        'Discrete Mathematics': ['discrete mathematics', 'discrete math', 'dms', 'discrete structures', 'graph theory'],
        'Environment': ['environment', 'environmental studies', 'evs', 'environmental science'],
        'Data Structures (C++)': ['data structures (c++)', 'data structures', 'dsa', 'data structures in c++', 'cpp dsa', 'trees', 'linked list'],
        'Statistical Machine Learning (SML)': ['statistical machine learning (sml)', 'statistical machine learning', 'sml', 'machine learning sml', 'regression'],
        'Probability & Statistics': ['probability & statistics', 'probability and statistics', 'pns', 'stats', 'probability'],
        'Data Analysis (Python)': ['data analysis (python)', 'data analysis using python', 'data analysis', 'pandas', 'numpy'],
        'DBMS': ['dbms', 'database management system', 'database', 'sql', 'rdbms'],
        'Microprocessors & CA': ['microprocessors & ca', 'microprocessors & computer architecture', 'microprocessors', 'microprocessor', 'computer architecture', '8086'],
        'DAA (Algorithms)': ['daa (algorithms)', 'daa', 'daaa', 'algorithms', 'algorithm', 'design and analysis of algorithms', 'algorithms prep', 'algorithm design'],
        'Operating Systems': ['operating systems', 'operating system', 'os', 'cpu scheduling', 'process management'],
        'Computer Networks': ['computer networks', 'computer network', 'cn', 'networking', 'tcp/ip', 'osi model'],
        'AI & ML': ['ai & ml', 'ai-ml', 'artificial intelligence & machine learning', 'ai/ml', 'cset 312', 'cset312'],
        'Intelligent Model Design': ['intelligent model design', 'intelligent model design using ai', 'imd'],
        'Automata / Theory of Computation': ['automata / theory of computation', 'automata', 'theory of computation', 'toc', 'automata theory', 'flats', 'turing machine'],
        'Natural Language Processing': ['natural language processing', 'nlp', 'text mining', 'language models'],
        'Image Video Processing': ['image video processing', 'image processing', 'ivp', 'computer vision'],
        'Software Project Management': ['software project management', 'spm', 'project management'],
        'AI and Society': ['ai and society', 'ai & society', 'ethics in ai'],
        'Agile Software Development': ['agile software development', 'agile', 'scrum'],
        'MLOps': ['mlops', 'machine learning operations', 'model deployment']
    };

    // Educators List
    const EDUCATORS = [
        { name: 'Pratham Kocher', aliases: ['pratham', 'kocher', 'pratham kocher', 'founder', 'creator'] },
        { name: 'Vansh Malhotra', aliases: ['vansh', 'malhotra', 'vansh malhotra'] },
        { name: 'Hrehaan Ahuja', aliases: ['hrehaan', 'ahuja', 'hrehaan ahuja'] },
        { name: 'Khushi Goyal', aliases: ['khushi', 'goyal', 'khushi goyal'] },
        { name: 'Samman Dev Dubey', aliases: ['samman', 'dubey', 'samman dev', 'samman dev dubey'] },
        { name: 'Pranay Wadhwa', aliases: ['pranay', 'wadhwa', 'pranay wadhwa'] },
        { name: 'Vinayak Gupta', aliases: ['vinayak', 'gupta', 'vinayak gupta'] }
    ];

    // ── 4. Lightweight Stemmer ─────────────────────────
    function simpleStem(word) {
        if (word.length <= 3) return word;
        let w = word.toLowerCase();
        
        if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
        if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
        if (w.endsWith('edly') && w.length > 6) return w.slice(0, -4);
        if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
        if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
        if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
        if (w.endsWith('ment') && w.length > 6) return w.slice(0, -4);
        if (w.endsWith('tion') && w.length > 6) return w.slice(0, -4);
        if (w.endsWith('able') && w.length > 6) return w.slice(0, -4);
        
        return w;
    }

    // Clean text helper for Speech Synthesis
    function cleanForSpeech(text) {
        if (!text) return '';
        let clean = text
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/\*(.+?)\*/g, '$1')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/^[•\-]\s+/gm, '')
            .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
            .replace(/\s+/g, ' ')
            .trim();

        // Get first 1-2 sentences for a punchy voice readout
        const sentences = clean.split(/(?<=[.?!])\s+/);
        if (sentences.length > 1) {
            return (sentences[0] + ' ' + sentences[1]).slice(0, 220);
        }
        return clean.slice(0, 220);
    }

    // ── 5. Main NLP Engine Class ───────────────────────
    class ChatbotNLP {
        constructor(kb) {
            this.kb = kb || (typeof window !== 'undefined' ? window.CHATBOT_KB : null);
            this.isReady = false;
            
            this.documents = [];
            this.vocab = new Map();
            this.idf = [];
            this.docVectors = [];
            
            this.context = {
                currentSemester: null,
                currentSubject: null,
                currentCourse: null,
                currentEducator: null,
                currentTool: null,
                lastIntent: null,
                turnCount: 0
            };
        }

        initialize() {
            if (this.isReady) return;
            if (!this.kb) {
                throw new Error("ChatbotNLP: Knowledge Base (KB) is required for initialization.");
            }

            this.buildCorpus();
            this.computeTFIDF();
            this.isReady = true;
        }

        expandContractions(text) {
            let res = text.toLowerCase();
            for (const [cont, exp] of Object.entries(CONTRACTIONS)) {
                res = res.replace(new RegExp('\\b' + cont + '\\b', 'g'), exp);
            }
            return res;
        }

        tokenize(text) {
            if (!text) return [];
            const expanded = this.expandContractions(text);
            const cleaned = expanded
                .replace(/[^a-z0-9\s\+\-\#]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
                
            const rawTokens = cleaned.split(' ').filter(Boolean);
            const tokens = [];

            for (const t of rawTokens) {
                if (STOPWORDS.has(t) && !PRESERVED_TOKENS.has(t)) {
                    continue;
                }
                const canonical = SYNONYM_MAP[t] || t;
                const stemmed = simpleStem(canonical);
                tokens.push(stemmed);
                if (canonical !== t) {
                    tokens.push(simpleStem(t));
                }
            }
            return tokens;
        }

        // ── Entity Extraction ──────────────────────────
        extractEntities(query) {
            const rawLower = query.toLowerCase();
            const entities = {
                semester: null,
                subject: null,
                educator: null,
                examType: null,
                year: null,
                tool: null,
                lab: null,
                isFollowUp: false,
                isTeacherQuery: false
            };

            if (/\b(who teaches|who is the (teacher|instructor|educator)|taught by|mentor for|teacher of|faculty for)\b/i.test(rawLower)) {
                entities.isTeacherQuery = true;
            }

            // 1. Semester matching
            const semMatch = rawLower.match(/(?:sem(?:ester)?|term)\s*([1-5])\b|\b([1-5])(?:st|nd|rd|th)?\s*sem(?:ester)?\b|\bsem([1-5])\b/);
            if (semMatch) {
                entities.semester = parseInt(semMatch[1] || semMatch[2] || semMatch[3], 10);
            }

            // 2. Exam Type (Midsem vs Endsem)
            if (rawLower.includes('midsem') || rawLower.includes('mid sem') || rawLower.includes('mid-sem') || rawLower.includes('mid term') || rawLower.includes('midterm')) {
                entities.examType = 'Midsem';
            } else if (rawLower.includes('endsem') || rawLower.includes('end sem') || rawLower.includes('end-sem') || rawLower.includes('end term') || rawLower.includes('endterm')) {
                entities.examType = 'Endsem';
            }

            // 3. Year detection
            const yearMatch = rawLower.match(/\b(202[3-6])\b/);
            if (yearMatch) {
                entities.year = yearMatch[1];
            }

            // 4. Subject matching
            for (const [canonicalName, aliases] of Object.entries(CANONICAL_SUBJECTS)) {
                for (const alias of aliases) {
                    const regex = new RegExp('\\b' + alias.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") + '\\b', 'i');
                    if (regex.test(rawLower)) {
                        entities.subject = canonicalName;
                        break;
                    }
                }
                if (entities.subject) break;
            }

            // 5. Educator matching
            for (const ed of EDUCATORS) {
                for (const alias of ed.aliases) {
                    if (new RegExp('\\b' + alias + '\\b', 'i').test(rawLower)) {
                        entities.educator = ed.name;
                        break;
                    }
                }
                if (entities.educator) break;
            }

            // 6. Tools matching
            if (rawLower.includes('pomodoro') || rawLower.includes('timer') || rawLower.includes('focus clock')) {
                entities.tool = 'pomodoro';
            } else if (rawLower.includes('cgpa') || rawLower.includes('sgpa') || rawLower.includes('gpa') || rawLower.includes('grade calculator')) {
                entities.tool = 'cgpa';
            } else if (rawLower.includes('countdown') || rawLower.includes('exam timer') || rawLower.includes('exam date')) {
                entities.tool = 'countdown';
            } else if (rawLower.includes('scratchpad') || rawLower.includes('quick notes') || rawLower.includes('notepad')) {
                entities.tool = 'scratchpad';
            } else if (rawLower.includes('bookmark') || rawLower.includes('bookmarks') || rawLower.includes('saved')) {
                entities.tool = 'bookmarks';
            }

            // 7. Lab matching
            if (rawLower.includes('dsa lab') || rawLower.includes('data structure lab') || rawLower.includes('sorting visual') || rawLower.includes('algorithm lab')) {
                entities.lab = 'dsa';
            } else if (rawLower.includes('os lab') || rawLower.includes('operating system lab') || rawLower.includes('gantt') || rawLower.includes('cpu scheduling')) {
                entities.lab = 'os';
            }

            // 8. Follow-up indicators
            const followUpWords = ['it', 'its', 'this', 'that', 'these', 'those', 'who teaches it', 'what about', 'how much is it', 'price of it', 'show me pyqs for it', 'and for this', 'same for'];
            for (const fw of followUpWords) {
                if (new RegExp('\\b' + fw + '\\b', 'i').test(rawLower)) {
                    entities.isFollowUp = true;
                    break;
                }
            }

            return entities;
        }

        // ── Intent Detection ───────────────────────────
        detectIntent(query, entities) {
            const lower = query.toLowerCase().trim();

            // 1. Greetings
            if (/^(hi|hello|hey|hola|greetings|good\s+(morning|afternoon|evening)|yo|sup)\b/i.test(lower) && lower.split(' ').length <= 4) {
                return 'GREETING';
            }

            // 2. Suggestion chip & Educator list queries (PRIORITY FIX)
            if (/^(browse|show|view|list|see|tell me about|who are)?\s*(all\s*)?(educators|teachers|faculty|mentors|instructors)\b/i.test(lower) ||
                lower === 'browse all educators' || lower === 'all educators' || lower === 'educators' || lower === 'teachers' || lower === 'faculty') {
                return 'TEAM_INFO';
            }

            // 3. Founder / Who built this platform
            if (/\b(who (built|made|created|founded)|who is the founder|about (the )?founder|pratham kocher|creator of|story behind|vision|motto|slogan)\b/i.test(lower) ||
                lower.includes('who built this platform') || lower.includes('founder of skills seekers')) {
                return 'FOUNDER_INFO';
            }

            // 4. Testimonials & Student Reviews
            if (/\b(testimonials?|reviews?|feedback|ratings?|what (do|are) students say|success stories)\b/i.test(lower)) {
                return 'TESTIMONIALS';
            }

            // 5. Achievements & Stats (YouTube views, 25K learners)
            if (/\b(achievements?|how many (students|learners)|learners?|youtube views?|stats|statistics|milestones)\b/i.test(lower)) {
                return 'STATS_ACHIEVEMENTS';
            }

            // 6. Platform policies & Account FAQs
            if (/\b(refunds?|cancellations?|cancel order|account limit|device limit|multiple devices|blocked account|policies?|terms|how to sign up|sign up)\b/i.test(lower)) {
                return 'POLICIES_FAQ';
            }

            // 7. Contribute / Upload PYQ
            if (/(?:can\s+i\s+|how\s+to\s+)?\b(contribute|upload|share|submit|send)\b.*?\b(pyqs?|papers?|exams?|questions?)\b/i.test(lower) ||
                lower.includes('share pyq') || lower.includes('share paper') || lower.includes('share exam') || lower.includes('upload pyq')) {
                return 'CONTRIBUTE_PYQ';
            }

            // 8. Platform Overview / About
            if (/\b(what is (skills seekers|bu resource hub)|about (skills seekers|bu resource hub)|purpose of this website|overview of platform)\b/i.test(lower)) {
                return 'ABOUT_PLATFORM';
            }

            // 9. Help / Capabilities
            if (/^(help|what can you do|how to use|guide me|features|commands|options)\b/i.test(lower)) {
                return 'HELP';
            }

            // 10. Contact / Support
            if (/\b(contacts?|support|whatsapp|email|reach out|talk to someone|phone number|helpline)\b/i.test(lower)) {
                return 'CONTACT';
            }

            // 11. 1-1 Live Class / Mentorship
            if (/\b(1-1|1\s*to\s*1|one\s*to\s*one|personal mentorship|private class|doubt clearing|placement coaching)\b/i.test(lower)) {
                return 'LIVE_MENTORSHIP';
            }

            // 12. Educator queries
            if (entities.isTeacherQuery || entities.educator || /\b(who are the (teachers|educators|faculty|instructors)|team members?|who teaches|faculty members?|mentors?)\b/i.test(lower)) {
                return 'TEAM_INFO';
            }

            // 13. Study Tools
            if (entities.tool || /\b(calculators?|pomodoro|timer|countdown|scratchpad|bookmarks?|study tools|gpa|cgpa|sgpa|how to calculate cgpa)\b/i.test(lower)) {
                return 'FIND_TOOL';
            }

            // 14. Virtual Labs (DSA / OS)
            if (entities.lab || /\b(visual dsa|visual os|virtual labs?|algorithm visualizer|cpu scheduling simulation|paging simulation|gantt chart)\b/i.test(lower)) {
                return 'VIRTUAL_LAB';
            }

            // 15. Courses / Mastercourses & Bundles
            if (/\b(courses?|crash courses?|sprints?|mastercourses?|bundles?|classes|video lectures|tutorial sheets|price|discount|how much|fee|cost)\b/i.test(lower) ||
                lower.includes('what courses are available') || lower.includes('browse all crash courses')) {
                return 'FIND_COURSE';
            }

            // 16. PYQs / Question Papers
            if (/\b(pyqs?|previous year|past papers?|question papers?|exam papers?|endsem papers?|midsem papers?|papers)\b/i.test(lower) ||
                lower.includes('show semester 1 pyqs') || lower.includes('show semester 3 pyqs')) {
                return 'FIND_PYQ';
            }

            // 17. Semester Overview
            if (entities.semester && /\b(subjects?|syllabus|what is in|overview|curriculum|what courses)\b/i.test(lower)) {
                return 'SEMESTER_INFO';
            }

            // 18. Subject Specific query
            if (entities.subject) {
                return 'SPECIFIC_SUBJECT';
            }

            // 19. Website Navigation
            if (/\b(navigate|where is|how to go to|page|link to|take me to|open|go to)\b/i.test(lower)) {
                return 'NAVIGATION';
            }

            return 'GENERAL_SEARCH';
        }

        // ── Build Corpus for Vector Retrieval ──────────
        buildCorpus() {
            this.documents = [];

            // 1. Founder & Platform Story
            const p = this.kb.platform;
            if (p) {
                this.documents.push({
                    id: 'platform_founder',
                    type: 'founder',
                    title: `Founder of Skills Seekers: ${p.founder || 'Pratham Kocher'}`,
                    subtitle: p.motto || 'Skills mein dum hai to .. manzil door nahi...',
                    text: `Founder Pratham Kocher teaching passion platform assist college engineering students semester exams good grades ${p.founderMessage} ${p.motto} ${p.description}`,
                    url: '/courses',
                    data: p
                });

                this.documents.push({
                    id: 'platform_achievements',
                    type: 'stats',
                    title: 'Skills Seekers Platform Achievements',
                    subtitle: '25K+ Learners • 180K+ Views',
                    text: `25000 25K happy learners 180000 180K views on youtube stats achievements engineering exam courses ${p.youtube}`,
                    url: p.youtube,
                    data: p.achievements
                });
            }

            // 2. Bundles
            if (this.kb.bundles) {
                this.kb.bundles.forEach((b, idx) => {
                    this.documents.push({
                        id: `bundle_${idx}`,
                        type: 'course',
                        title: b.title,
                        subtitle: 'Special Semester Bundle',
                        text: `Course Bundle ${b.title} ${(b.subjects || []).join(' ')} ${b.description}`,
                        url: b.url,
                        data: b
                    });
                });
            }

            // 3. Testimonials
            if (this.kb.testimonials) {
                this.kb.testimonials.forEach((t, idx) => {
                    this.documents.push({
                        id: `testimony_${idx}`,
                        type: 'testimonial',
                        title: `Review by ${t.student} (${t.program})`,
                        subtitle: 'Student Success Story',
                        text: `Testimonial Review Feedback ${t.student} ${t.program} ${t.quote}`,
                        url: '/courses',
                        data: t
                    });
                });
            }

            // 4. Courses
            if (this.kb.courses) {
                this.kb.courses.forEach((c, idx) => {
                    this.documents.push({
                        id: `course_${idx}`,
                        type: 'course',
                        title: c.title,
                        subtitle: `${c.educator} • ${c.discount || 'Special Offer'}`,
                        text: `${c.title} ${c.educator} ${c.description} ${c.discount} ${c.price} ${c.fullText || ''}`,
                        url: c.url,
                        data: c
                    });
                });
            }

            // 5. Library Papers
            if (this.kb.library) {
                this.kb.library.forEach((item, idx) => {
                    this.documents.push({
                        id: `pyq_${idx}`,
                        type: 'pyq',
                        title: item.title || `${item.subject} ${item.type} ${item.year}`,
                        subtitle: `Semester ${item.semester} • ${item.type} ${item.year}`,
                        text: `Semester ${item.semester} ${item.subject} ${item.type} ${item.year} previous year question paper pyq download view preview`,
                        url: item.url,
                        data: item
                    });
                });
            }

            // 6. Semester Subjects
            if (this.kb.semesters) {
                for (const [semKey, subjects] of Object.entries(this.kb.semesters)) {
                    const semNum = semKey.replace('sem', '');
                    subjects.forEach((s, idx) => {
                        this.documents.push({
                            id: `subject_${semNum}_${idx}`,
                            type: 'subject',
                            title: `${s.name} (Semester ${semNum})`,
                            subtitle: `Semester ${semNum} ${s.code ? '• ' + s.code : ''}`,
                            text: `Semester ${semNum} ${s.name} ${s.code} subject notes syllabus question papers pyqs`,
                            url: `/sem${semNum}`,
                            data: { ...s, semester: semNum }
                        });
                    });
                }
            }

            // 7. Study Tools
            if (this.kb.tools) {
                this.kb.tools.forEach((t) => {
                    this.documents.push({
                        id: `tool_${t.id}`,
                        type: 'tool',
                        title: t.name,
                        subtitle: 'BU Resource Hub Study Tool',
                        text: `${t.name} ${t.description} ${(t.features || []).join(' ')} calculator timer notes`,
                        url: t.url,
                        data: t
                    });
                });
            }

            // 8. Visual Labs
            if (this.kb.labs) {
                if (this.kb.labs.dsa) {
                    const dsa = this.kb.labs.dsa;
                    (dsa.algorithms || []).forEach((algo, idx) => {
                        this.documents.push({
                            id: `dsa_${idx}`,
                            type: 'lab_dsa',
                            title: `Visual DSA: ${algo.name}`,
                            subtitle: `${algo.category} • Time: ${algo.time}`,
                            text: `DSA Lab Algorithm Visualizer ${algo.name} ${algo.category} ${algo.time} ${algo.space}`,
                            url: algo.url,
                            data: algo
                        });
                    });
                }
                if (this.kb.labs.os) {
                    const os = this.kb.labs.os;
                    (os.simulations || []).forEach((sim, idx) => {
                        this.documents.push({
                            id: `os_${idx}`,
                            type: 'lab_os',
                            title: `Visual OS: ${sim.name}`,
                            subtitle: `${sim.category} Simulation`,
                            text: `OS Lab Operating System Visualizer Simulation ${sim.name} ${sim.category} ${sim.description}`,
                            url: sim.url,
                            data: sim
                        });
                    });
                }
            }

            // 9. Team Members
            if (this.kb.team) {
                this.kb.team.forEach((m, idx) => {
                    this.documents.push({
                        id: `team_${idx}`,
                        type: 'team',
                        title: `${m.name} - ${m.role}`,
                        subtitle: `Skills Seekers Educator`,
                        text: `${m.name} ${m.role} ${(m.subjects || []).join(' ')} ${m.bio} teacher instructor faculty`,
                        url: '/courses',
                        data: m
                    });
                });
            }

            // 10. FAQs
            if (this.kb.faq) {
                this.kb.faq.forEach((f, idx) => {
                    this.documents.push({
                        id: `faq_${idx}`,
                        type: 'faq',
                        title: f.question,
                        subtitle: 'Frequently Asked Question',
                        text: `${f.question} ${f.answer} ${(f.keywords || []).join(' ')}`,
                        url: '/home',
                        data: f
                    });
                });
            }

            // 11. Navigation Routes
            if (this.kb.routes) {
                this.kb.routes.forEach((r, idx) => {
                    this.documents.push({
                        id: `route_${idx}`,
                        type: 'navigation',
                        title: r.name,
                        subtitle: `Direct Route: ${r.path}`,
                        text: `${r.name} ${r.path} ${r.description} navigation page route`,
                        url: r.path,
                        data: r
                    });
                });
            }
        }

        // ── TF-IDF Model Construction ──────────────────
        computeTFIDF() {
            this.vocab = new Map();
            const N = this.documents.length;
            const docTermFreqs = [];
            const dfCounts = [];

            for (let i = 0; i < N; i++) {
                const doc = this.documents[i];
                const tokens = this.tokenize(doc.text);
                const tf = new Map();

                for (const t of tokens) {
                    if (!this.vocab.has(t)) {
                        const newIdx = this.vocab.size;
                        this.vocab.set(t, newIdx);
                        dfCounts.push(0);
                    }
                    const termIdx = this.vocab.get(t);
                    tf.set(termIdx, (tf.get(termIdx) || 0) + 1);
                }

                for (const termIdx of tf.keys()) {
                    dfCounts[termIdx]++;
                }

                docTermFreqs.push(tf);
            }

            const V = this.vocab.size;
            this.idf = new Float32Array(V);
            for (let t = 0; t < V; t++) {
                const df = dfCounts[t] || 0;
                this.idf[t] = Math.log((1 + N) / (1 + df)) + 1.0;
            }

            this.docVectors = [];
            for (let i = 0; i < N; i++) {
                const tf = docTermFreqs[i];
                const vec = new Map();
                let sumSq = 0;

                for (const [termIdx, count] of tf.entries()) {
                    const tfWeight = 1.0 + Math.log(count);
                    const weight = tfWeight * this.idf[termIdx];
                    vec.set(termIdx, weight);
                    sumSq += weight * weight;
                }

                const norm = Math.sqrt(sumSq) || 1.0;
                for (const [termIdx, weight] of vec.entries()) {
                    vec.set(termIdx, weight / norm);
                }

                this.docVectors.push(vec);
            }
        }

        search(tokens, topK = 6) {
            if (!tokens || tokens.length === 0) return [];

            const queryTF = new Map();
            for (const t of tokens) {
                if (this.vocab.has(t)) {
                    const termIdx = this.vocab.get(t);
                    queryTF.set(termIdx, (queryTF.get(termIdx) || 0) + 1);
                }
            }

            if (queryTF.size === 0) return [];

            const queryVec = new Map();
            let sumSq = 0;
            for (const [termIdx, count] of queryTF.entries()) {
                const tfWeight = 1.0 + Math.log(count);
                const weight = tfWeight * this.idf[termIdx];
                queryVec.set(termIdx, weight);
                sumSq += weight * weight;
            }

            const queryNorm = Math.sqrt(sumSq) || 1.0;
            for (const [termIdx, weight] of queryVec.entries()) {
                queryVec.set(termIdx, weight / queryNorm);
            }

            const scores = [];
            const N = this.documents.length;

            for (let i = 0; i < N; i++) {
                const docVec = this.docVectors[i];
                let dot = 0;

                if (queryVec.size < docVec.size) {
                    for (const [termIdx, qWeight] of queryVec.entries()) {
                        const dWeight = docVec.get(termIdx);
                        if (dWeight) dot += qWeight * dWeight;
                    }
                } else {
                    for (const [termIdx, dWeight] of docVec.entries()) {
                        const qWeight = queryVec.get(termIdx);
                        if (qWeight) dot += qWeight * dWeight;
                    }
                }

                if (dot > 0.05) {
                    scores.push({
                        doc: this.documents[i],
                        score: dot
                    });
                }
            }

            scores.sort((a, b) => b.score - a.score);
            return scores.slice(0, topK);
        }

        resolveContext(entities, intent) {
            if (entities.isFollowUp) {
                if (!entities.subject && this.context.currentSubject) {
                    entities.subject = this.context.currentSubject;
                }
                if (!entities.semester && this.context.currentSemester) {
                    entities.semester = this.context.currentSemester;
                }
                if (!entities.educator && this.context.currentEducator) {
                    entities.educator = this.context.currentEducator;
                }
            }

            if (entities.semester) this.context.currentSemester = entities.semester;
            if (entities.subject) this.context.currentSubject = entities.subject;
            if (entities.educator) this.context.currentEducator = entities.educator;
            if (entities.tool) this.context.currentTool = entities.tool;
            this.context.lastIntent = intent;
            this.context.turnCount++;
        }

        processQuery(rawQuery) {
            if (!this.isReady) {
                this.initialize();
            }

            const query = (rawQuery || '').trim();
            if (!query) {
                return {
                    text: "How can I help you? Ask me about PYQs, crash courses, study tools, educators, or labs!",
                    speakText: "How can I help you? Ask me about previous year questions, crash courses, study tools, or virtual labs.",
                    links: [],
                    suggestedPrompts: ['Show Semester 1 PYQs', 'What courses are available?', 'Tell me about study tools'],
                    confidence: 1.0,
                    intent: 'EMPTY'
                };
            }

            const entities = this.extractEntities(query);
            const intent = this.detectIntent(query, entities);
            this.resolveContext(entities, intent);

            const tokens = this.tokenize(query);
            if (entities.subject) {
                tokens.push(...this.tokenize(entities.subject));
            }
            const rawSearchResults = this.search(tokens, 8);

            const isExplicitIntent = [
                'GREETING', 'HELP', 'CONTRIBUTE_PYQ', 'CONTACT', 'ABOUT_PLATFORM',
                'FOUNDER_INFO', 'TESTIMONIALS', 'STATS_ACHIEVEMENTS', 'POLICIES_FAQ',
                'LIVE_MENTORSHIP', 'TEAM_INFO'
            ].includes(intent);

            const maxRawScore = rawSearchResults.length > 0 ? rawSearchResults[0].score : 0;

            if (!isExplicitIntent && !entities.isFollowUp && maxRawScore < 0.14 &&
                !entities.subject && !entities.semester && !entities.educator && !entities.tool && !entities.lab) {
                return this.generateFallbackResponse(query);
            }

            const boostedResults = rawSearchResults.map(res => {
                let boost = 0;
                const doc = res.doc;

                if (entities.subject && doc.text.toLowerCase().includes(entities.subject.toLowerCase())) {
                    boost += 0.35;
                }
                if (entities.semester && doc.text.toLowerCase().includes(`semester ${entities.semester}`)) {
                    boost += 0.25;
                }
                if (entities.educator && doc.text.toLowerCase().includes(entities.educator.toLowerCase())) {
                    boost += 0.40;
                }
                if (intent === 'FIND_PYQ' && doc.type === 'pyq') boost += 0.30;
                if (intent === 'FIND_COURSE' && doc.type === 'course') boost += 0.30;
                if (intent === 'FIND_TOOL' && doc.type === 'tool') boost += 0.35;
                if (intent === 'VIRTUAL_LAB' && (doc.type === 'lab_dsa' || doc.type === 'lab_os')) boost += 0.35;
                if (intent === 'TEAM_INFO' && doc.type === 'team') boost += 0.35;
                if (intent === 'TESTIMONIALS' && doc.type === 'testimonial') boost += 0.45;
                if (intent === 'FOUNDER_INFO' && doc.type === 'founder') boost += 0.45;

                return {
                    doc: doc,
                    score: Math.min(1.0, res.score + boost)
                };
            });

            boostedResults.sort((a, b) => b.score - a.score);

            const response = this.generateResponse(query, intent, entities, boostedResults);
            response.speakText = cleanForSpeech(response.text);
            return response;
        }

        // ── Response Generation Dispatcher ────────────
        generateResponse(query, intent, entities, rankedDocs) {
            const topMatch = rankedDocs[0];
            const confidence = topMatch ? topMatch.score : 0;

            switch (intent) {
                case 'GREETING':
                    return this.generateGreetingResponse();
                case 'FOUNDER_INFO':
                    return this.generateFounderResponse();
                case 'TESTIMONIALS':
                    return this.generateTestimonialsResponse();
                case 'STATS_ACHIEVEMENTS':
                    return this.generateStatsResponse();
                case 'POLICIES_FAQ':
                    return this.generatePoliciesResponse(query);
                case 'ABOUT_PLATFORM':
                    return this.generateAboutResponse();
                case 'HELP':
                    return this.generateHelpResponse();
                case 'CONTRIBUTE_PYQ':
                    return this.generateContributeResponse();
                case 'CONTACT':
                    return this.generateContactResponse();
                case 'LIVE_MENTORSHIP':
                    return this.generateMentorshipResponse();
                case 'TEAM_INFO':
                    return this.generateTeamResponse(entities, rankedDocs, query);
                case 'FIND_TOOL':
                    return this.generateToolResponse(entities, rankedDocs);
                case 'VIRTUAL_LAB':
                    return this.generateLabResponse(entities, rankedDocs);
                case 'FIND_COURSE':
                    return this.generateCourseResponse(entities, rankedDocs);
                case 'FIND_PYQ':
                    return this.generatePYQResponse(entities, rankedDocs);
                case 'SEMESTER_INFO':
                    return this.generateSemesterResponse(entities);
                case 'NAVIGATION':
                    return this.generateNavigationResponse(entities, rankedDocs, query);
                case 'SPECIFIC_SUBJECT':
                    return this.generateSubjectResponse(entities, rankedDocs);
                default:
                    if (confidence >= 0.22) {
                        return this.generateBestMatchResponse(topMatch, rankedDocs, entities);
                    }
                    return this.generateFallbackResponse(query);
            }
        }

        // ── Specialized Response Generators ────────────

        generateGreetingResponse() {
            return {
                text: "Hello! 👋 Welcome to **Skills Seekers BU Resource Hub**!\n\n" +
                      "I am your AI Resource Assistant. Ask me about:\n" +
                      "• **Previous Year Questions (PYQs)** with instant Drive previews\n" +
                      "• **Skills Seekers Crash Courses & Sprints** with solved tutorial sheets\n" +
                      "• **Top Educators** (Pratham Kocher, Vansh Malhotra, Hrehaan Ahuja)\n" +
                      "• **Academic Study Tools** (Pomodoro timer, SGPA/CGPA Calculator)\n" +
                      "• **Virtual Interactive Labs** (Visual DSA & Visual OS)\n\n" +
                      "What would you like to explore today?",
                links: [
                    { title: "Universal PYQ Library", subtitle: "39+ Verified Question Papers", url: "/library", type: "nav" },
                    { title: "Crash Courses Catalog", subtitle: "Up to 69% OFF Express Prep", url: "/courses", type: "course" },
                    { title: "Academic Study Tools", subtitle: "Pomodoro & CGPA Calculator", url: "/tools", type: "tool" }
                ],
                suggestedPrompts: [
                    "Show Semester 1 PYQs",
                    "Browse all educators",
                    "What courses are available?",
                    "How to calculate CGPA?"
                ],
                confidence: 1.0,
                intent: 'GREETING'
            };
        }

        generateFounderResponse() {
            const p = this.kb.platform;
            return {
                text: `🌟 **About the Founder: ${p.founder}**\n\n` +
                      `Teaching is Pratham Kocher's passion. He developed **Skills Seekers** specifically to assist college engineering students in preparing for their semester exams and achieving good grades.\n\n` +
                      `*"${p.founderMessage}"*\n\n` +
                      `✨ **Guiding Motto:** *"${p.motto}"*\n` +
                      `📈 **Platform Milestones:** Over **25,000+** learners and **180,000+** views on YouTube!`,
                links: [
                    { title: "Pratham Kocher Courses", subtitle: "Python, Digital Design, Networks, TOC", url: "/courses", type: "course" },
                    { title: "1-on-1 Mentorship", subtitle: "Personalized Coaching", url: "/courses", type: "course" },
                    { title: "Official Website", subtitle: "skillsseekers.com", url: p.website, type: "external" }
                ],
                suggestedPrompts: [
                    "Browse all educators",
                    "What do students say? (Reviews)",
                    "Explore crash courses",
                    "1-on-1 Live Classes"
                ],
                confidence: 0.98,
                intent: 'FOUNDER_INFO'
            };
        }

        generateTestimonialsResponse() {
            const list = (this.kb.testimonials || []).map(t =>
                `• **${t.student}** (${t.program}):\n  *"${t.quote}"*`
            ).join('\n\n');

            return {
                text: `💬 **Success Stories from Our Learners:**\n\n` +
                      `${list}\n\n` +
                      `Over **25,000+ engineering students** rely on Skills Seekers mastercourses to ace their exams!`,
                links: [
                    { title: "Explore Best-Seller Courses", subtitle: "Join 25K+ learners", url: "/courses", type: "course" },
                    { title: "Universal PYQ Library", subtitle: "Free Exam Papers", url: "/library", type: "nav" }
                ],
                suggestedPrompts: [
                    "Who are the top educators?",
                    "What courses are available?",
                    "Tell me about 1:1 coaching",
                    "Show Semester 3 PYQs"
                ],
                confidence: 0.98,
                intent: 'TESTIMONIALS'
            };
        }

        generateStatsResponse() {
            const p = this.kb.platform;
            return {
                text: `🏆 **Skills Seekers Achievements & Milestones:**\n\n` +
                      `• 👨‍🎓 **25,000+ Happy Learners** across engineering universities\n` +
                      `• 📺 **180,000+ YouTube Views** on free educational lectures and tutorials\n` +
                      `• 📚 **24+ High-Yield Crash Courses** and all-in-one semester bundles\n` +
                      `• 📄 **39+ Verified Question Papers** in the BU Resource Hub Library\n\n` +
                      `*"${p.motto}"*`,
                links: [
                    { title: "Skills Seekers YouTube Channel", subtitle: "180K+ Views", url: p.youtube, type: "external" },
                    { title: "Course Store", subtitle: "skillsseekers.com/s/store", url: p.store, type: "external" }
                ],
                suggestedPrompts: [
                    "Who is the founder?",
                    "Browse all educators",
                    "View course catalog"
                ],
                confidence: 0.98,
                intent: 'STATS_ACHIEVEMENTS'
            };
        }

        generatePoliciesResponse(query) {
            const lower = query.toLowerCase();
            let specific = "";

            if (lower.includes('device') || lower.includes('limit') || lower.includes('account')) {
                specific = "📱 **Account & Device Limits Policy:**\n" +
                           "Your account is limited to the purchasing device only. The device cannot be changed later, and accounts will be automatically blocked if concurrent access is attempted from another device.\n\n";
            } else if (lower.includes('cancel') || lower.includes('refund')) {
                specific = "💳 **Order Cancellation & Refund Policy:**\n" +
                           "Per Skills Seekers platform policy, order cancellation or refunds are not allowed once a purchase is completed. Please consider carefully and inspect course details before enrolling.\n\n";
            }

            return {
                text: `${specific}` +
                      `📋 **Skills Seekers Important Platform FAQs:**\n\n` +
                      `• **Device Limit:** 1 account = 1 device only (auto-blocked on multi-device attempts).\n` +
                      `• **Cancellations:** Orders cannot be cancelled or refunded after purchase.\n` +
                      `• **Signing Up:** Click 'Sign Up' and register via email or Google account.\n` +
                      `• **Support:** Reach customer service at **skillsseekers16@gmail.com** or WhatsApp at **+91 9588598168**.`,
                links: [
                    { title: "Student Support Email", subtitle: "skillsseekers16@gmail.com", url: "mailto:skillsseekers16@gmail.com", type: "external" },
                    { title: "Chat on WhatsApp", subtitle: "+91 9588598168", url: this.kb.platform.whatsapp, type: "external" },
                    { title: "Official Website", subtitle: "skillsseekers.com", url: this.kb.platform.website, type: "external" }
                ],
                suggestedPrompts: [
                    "How to contact support?",
                    "What courses are available?",
                    "1-on-1 Personal Coaching"
                ],
                confidence: 0.95,
                intent: 'POLICIES_FAQ'
            };
        }

        generateAboutResponse() {
            const p = this.kb.platform;
            return {
                text: `**${p.hubName}** is the premier academic platform tailored for Bennett University students, powered by **${p.name}**.\n\n` +
                      `🎯 **Mission:** Founded by **${p.founder}**, Skills Seekers provides verified exam papers, high-yield crash courses, solved tutorial sheets, and interactive simulations.\n\n` +
                      `✨ **Guiding Motto:** *"${p.motto}"*\n\n` +
                      `📊 **Platform Scale:**\n` +
                      `• Over **25,000+** learners\n` +
                      `• **180,000+** YouTube video views\n` +
                      `• **39+ Verified PYQs** for Semesters 1 to 5\n` +
                      `• **24+ Mastercourses** taught by top educators like Pratham Kocher, Vansh Malhotra, and Hrehaan Ahuja.`,
                links: [
                    { title: "Skills Seekers Store", subtitle: "Official Course Store", url: p.store, type: "external" },
                    { title: "Universal PYQ Library", subtitle: "Browse All Exam Papers", url: "/library", type: "nav" },
                    { title: "Academic Study Tools", subtitle: "CGPA, Pomodoro, Notes", url: "/tools", type: "tool" }
                ],
                suggestedPrompts: [
                    "Browse all educators",
                    "What crash courses are available?",
                    "What do students say? (Reviews)",
                    "How to calculate CGPA?"
                ],
                confidence: 0.98,
                intent: 'ABOUT_PLATFORM'
            };
        }

        generateHelpResponse() {
            return {
                text: "Here is everything you can ask me:\n\n" +
                      "👨‍🏫 **Educators & Platform:**\n" +
                      "• *\"Browse all educators\"*\n" +
                      "• *\"Who founded Skills Seekers?\"*\n" +
                      "• *\"What do students say? (Reviews)\"*\n\n" +
                      "📚 **PYQ Assistance:**\n" +
                      "• *\"Give me Semester 3 PYQs\"*\n" +
                      "• *\"Show me Operating Systems Endsem paper\"*\n" +
                      "• *\"Where can I find Calculus question papers?\"*\n\n" +
                      "🎓 **Courses & Sprints:**\n" +
                      "• *\"What courses are taught by Vansh Malhotra?\"*\n" +
                      "• *\"Show me Python sprint crash courses\"*\n" +
                      "• *\"Tell me about 1-1 Live Classes\"*\n\n" +
                      "🛠️ **Study Tools & Labs:**\n" +
                      "• *\"How does the CGPA calculator work?\"*\n" +
                      "• *\"Take me to the Pomodoro Timer\"*\n" +
                      "• *\"Open the Visual DSA Lab\"*\n\n" +
                      "🤝 **Contributions & Support:**\n" +
                      "• *\"How can I upload a question paper?\"*\n" +
                      "• *\"Connect with WhatsApp support\"*",
                links: [
                    { title: "Universal PYQ Library", subtitle: "39+ Papers", url: "/library", type: "nav" },
                    { title: "Course Catalog", subtitle: "Crash Courses & Sprints", url: "/courses", type: "course" },
                    { title: "Visual DSA Lab", subtitle: "20+ Algorithm Visualizers", url: "/dsa", type: "tool" }
                ],
                suggestedPrompts: [
                    "Browse all educators",
                    "Semester 1 subjects",
                    "Who founded Skills Seekers?",
                    "Calculate my SGPA"
                ],
                confidence: 0.98,
                intent: 'HELP'
            };
        }

        generateContributeResponse() {
            const p = this.kb.platform;
            return {
                text: "📄 **Anyone can share Question Paper PYQs!**\n\n" +
                      "Help your fellow Bennett University peers by sharing previous question papers.\n\n" +
                      "**How to share:**\n" +
                      "1. Take clear photos or scan your exam question paper into a PDF.\n" +
                      "2. Mention the **Semester**, **Subject Name**, and **Exam Type** (Midsem or Endsem).\n" +
                      `3. Send it directly via **WhatsApp** to [${p.whatsappNumber}](${p.whatsapp}) or email **${p.backupEmail}**.\n\n` +
                      "Your contribution will be verified and added to the Universal PYQ Library with credit!",
                links: [
                    { title: "Share via WhatsApp", subtitle: p.whatsappNumber, url: p.whatsapp, type: "external" },
                    { title: "Universal PYQ Library", subtitle: "See verified papers", url: "/library", type: "nav" },
                    { title: "Home Dashboard", subtitle: "Use Quick PYQ Share Helper", url: "/home", type: "nav" }
                ],
                suggestedPrompts: [
                    "View existing PYQ papers",
                    "Show Semester 5 PYQs",
                    "Contact Skills Seekers team"
                ],
                confidence: 0.98,
                intent: 'CONTRIBUTE_PYQ'
            };
        }

        generateContactResponse() {
            const p = this.kb.platform;
            return {
                text: "📬 **Get in touch with the Skills Seekers Team:**\n\n" +
                      `• 💬 **WhatsApp Direct:** [${p.whatsappNumber}](${p.whatsapp}) (Fastest response for course inquiries and paper submissions)\n` +
                      `• ✉️ **Primary Email:** [${p.email}](mailto:${p.email})\n` +
                      `• ✉️ **Academic Support:** [${p.backupEmail}](mailto:${p.backupEmail})\n` +
                      `• 🌐 **Official Website:** [skillsseekers.com](${p.website})\n\n` +
                      "We are always happy to help with course enrollment, mentorship, doubt clearing, or adding new academic resources!",
                links: [
                    { title: "Chat on WhatsApp", subtitle: p.whatsappNumber, url: p.whatsapp, type: "external" },
                    { title: "Official Website", subtitle: "skillsseekers.com", url: p.website, type: "external" },
                    { title: "Skills Seekers Store", subtitle: "skillsseekers.com/s/store", url: p.store, type: "external" }
                ],
                suggestedPrompts: [
                    "What crash courses are available?",
                    "Tell me about 1-on-1 mentorship",
                    "Who founded Skills Seekers?"
                ],
                confidence: 0.98,
                intent: 'CONTACT'
            };
        }

        generateMentorshipResponse() {
            const liveCourses = (this.kb.courses || []).filter(c => c.title.toLowerCase().includes('1 - 1') || c.title.toLowerCase().includes('one to one'));
            const links = liveCourses.map(c => ({
                title: c.title,
                subtitle: `${c.educator} • ${c.discount || 'Special Discount'}`,
                url: c.url,
                type: 'course'
            }));

            return {
                text: "🎯 **Skills Seekers 1-on-1 Live Mentorship & Coaching**\n\n" +
                      "Need tailored guidance, rapid exam revision, or placement preparation? Skills Seekers provides dedicated **1-to-1 Live Classes** with founder and expert instructor **Pratham Kocher**.\n\n" +
                      "**Key Mentorship Features:**\n" +
                      "• Personalized 1-on-1 doubt clearing mapped to your syllabus\n" +
                      "• Hands-on coding mastery (Java, Python, Data Structures)\n" +
                      "• Academic exam sprint coaching & strategy\n" +
                      "• Flexible scheduling tailored to your exam timeline",
                links: links.length > 0 ? links : [
                    { title: "Explore Store Mentorship", subtitle: "Skills Seekers Store", url: this.kb.platform.store, type: "course" }
                ],
                suggestedPrompts: [
                    "What courses does Pratham Kocher teach?",
                    "Browse all educators",
                    "Student reviews & testimonials"
                ],
                confidence: 0.98,
                intent: 'LIVE_MENTORSHIP'
            };
        }

        generateTeamResponse(entities, rankedDocs, query) {
            // Case 1: "Who teaches <subject>?"
            if (entities.subject && !entities.educator) {
                const matchingCourses = (this.kb.courses || []).filter(c =>
                    c.title.toLowerCase().includes(entities.subject.toLowerCase()) ||
                    c.description.toLowerCase().includes(entities.subject.toLowerCase())
                );

                if (matchingCourses.length > 0) {
                    const topCourse = matchingCourses[0];
                    const educatorName = topCourse.educator;
                    const links = matchingCourses.slice(0, 3).map(c => ({
                        title: c.title,
                        subtitle: `${c.educator} • ${c.discount || 'Available'}`,
                        url: c.url,
                        type: 'course'
                    }));

                    return {
                        text: `👨‍🏫 **${entities.subject}** is taught by **${educatorName}** at Skills Seekers!\n\n` +
                              `In the **${topCourse.title}**, ${educatorName} provides complete video sprints, fully solved tutorial sheets, and high-yield previous year question solutions.\n\n` +
                              `Here is the course link:`,
                        links: links,
                        suggestedPrompts: [
                            `More courses by ${educatorName}`,
                            `Show ${entities.subject} PYQs`,
                            "Browse all educators",
                            "Universal PYQ Library"
                        ],
                        confidence: 0.98,
                        intent: 'TEAM_INFO'
                    };
                }
            }

            // Case 2: Specific educator queried ("Tell me about Vansh Malhotra" or "Pratham Kocher")
            if (entities.educator) {
                const member = (this.kb.team || []).find(m => m.name.toLowerCase() === entities.educator.toLowerCase());
                const educatorCourses = (this.kb.courses || []).filter(c => c.educator.toLowerCase().includes(entities.educator.toLowerCase()));

                const links = educatorCourses.slice(0, 4).map(c => ({
                    title: c.title,
                    subtitle: `${c.discount || 'Available now'} • ${c.price || 'Store'}`,
                    url: c.url,
                    type: 'course'
                }));

                const subjectsList = member ? member.subjects.map(s => `• ${s}`).join('\n') : '';

                return {
                    text: `👨‍🏫 **${entities.educator}** (${member ? member.role : 'Skills Seekers Educator'})\n\n` +
                          `${member ? member.bio + '\n\n' : ''}` +
                          `**Key Courses & Subjects Taught:**\n${subjectsList}\n\n` +
                          `Here are popular mastercourses taught by ${entities.educator}:`,
                    links: links,
                    suggestedPrompts: [
                        `More courses by ${entities.educator}`,
                        "Browse all educators",
                        "Show all crash courses",
                        "Universal PYQ Library"
                    ],
                    confidence: 0.98,
                    intent: 'TEAM_INFO'
                };
            }

            // Case 3: "Browse all educators" (FIX FOR USER SCREENSHOT BUG)
            const teamMembers = (this.kb.team || []).map(m =>
                `• **${m.name}** (*${m.role}*):\n  ${(m.subjects || []).slice(0, 4).join(', ')}`
            ).join('\n\n');

            const topEducatorCourses = [
                { title: "Pratham Kocher - Python Sprint & Live Classes", subtitle: "Founder & Core Educator", url: "/courses", type: "course" },
                { title: "Vansh Malhotra - OS, SML & Microprocessors", subtitle: "Lead Educator & Mentor", url: "/courses", type: "course" },
                { title: "Hrehaan Ahuja - DAA Full Syllabus", subtitle: "Core Algorithms Educator", url: "/courses", type: "course" },
                { title: "Khushi Goyal - Engineering Calculus & ECE", subtitle: "End Term Express Sprints", url: "/courses", type: "course" }
            ];

            return {
                text: "🎓 **Top Skills Seekers Educators & Mentors:**\n\n" +
                      "Our courses and academic resources are created by experienced Bennett University top achievers and subject specialists:\n\n" +
                      teamMembers + "\n\n" +
                      "Click below to explore their courses or ask about any educator to see their full subject list!",
                links: topEducatorCourses,
                suggestedPrompts: [
                    "Courses by Pratham Kocher",
                    "Courses by Vansh Malhotra",
                    "Courses by Hrehaan Ahuja",
                    "Courses by Khushi Goyal"
                ],
                confidence: 1.0,
                intent: 'TEAM_INFO'
            };
        }

        generateToolResponse(entities, rankedDocs) {
            if (entities.tool) {
                const toolObj = (this.kb.tools || []).find(t => t.id === entities.tool);
                if (toolObj) {
                    const features = (toolObj.features || []).map(f => `• ${f}`).join('\n');
                    return {
                        text: `🛠️ **${toolObj.name}**\n\n` +
                              `${toolObj.description}\n\n` +
                              `**Key Features:**\n${features}\n\n` +
                              `You can use it right now on the Study Tools page!`,
                        links: [
                            { title: toolObj.name, subtitle: "Open Tool", url: toolObj.url, type: "tool" },
                            { title: "All Study Tools", subtitle: "Pomodoro, CGPA, Countdown", url: "/tools", type: "nav" }
                        ],
                        suggestedPrompts: [
                            "How does the CGPA calculator work?",
                            "Tell me about Pomodoro Timer",
                            "Exam countdown timer",
                            "Saved Bookmarks tool"
                        ],
                        confidence: 0.98,
                        intent: 'FIND_TOOL'
                    };
                }
            }

            return {
                text: "🛠️ **Academic Study Tools on BU Resource Hub:**\n\n" +
                      "• ⏱️ **Pomodoro Focus Timer:** 25-minute focus intervals with 5-minute restorative breaks, audio chime, and session streak counter.\n" +
                      "• 📊 **SGPA & CGPA Grade Calculator:** BU 10-point scale calculator (O=10, A+=9, A=8, B+=7, B=6, C=5, P=4, F=0) for semester SGPA and cumulative CGPA forecasting.\n" +
                      "• ⏳ **Exam Target Countdown:** Real-time countdown clock tracking days, hours, and minutes until exams.\n" +
                      "• 📝 **Study Scratchpad:** In-browser persistent markdown notepad for formulas and revision notes.\n" +
                      "• 🔖 **Saved Bookmarks:** 1-click bookmarks to quickly access high-traffic subjects and PYQ papers.",
                links: [
                    { title: "Open Study Tools", subtitle: "Access all 5 tools", url: "/tools", type: "tool" },
                    { title: "SGPA / CGPA Calculator", subtitle: "BU 10-point scale", url: "/tools#cgpa", type: "tool" },
                    { title: "Pomodoro Focus Timer", subtitle: "Productivity timer", url: "/tools#pomodoro", type: "tool" }
                ],
                suggestedPrompts: [
                    "How to calculate BU CGPA?",
                    "Pomodoro timer features",
                    "Exam countdown",
                    "Show Semester 3 PYQs"
                ],
                confidence: 0.98,
                intent: 'FIND_TOOL'
            };
        }

        generateLabResponse(entities, rankedDocs) {
            const labType = entities.lab;

            if (labType === 'dsa') {
                const algos = (this.kb.labs?.dsa?.algorithms || []).slice(0, 8);
                const links = algos.map(a => ({
                    title: a.name,
                    subtitle: `${a.category} • ${a.time}`,
                    url: a.url,
                    type: 'tool'
                }));

                return {
                    text: "💻 **Visual DSA Lab** (`/dsa`)\n\n" +
                          "The Visual DSA Lab features **20+ interactive algorithm visualizers** with step-by-step playback, visual array/graph manipulations, and complexity meters:\n\n" +
                          "• **Sorting:** Bubble, Selection, Insertion, Merge, Quick, Radix, Bucket Sort\n" +
                          "• **Searching:** Binary Search\n" +
                          "• **Greedy:** Fractional Knapsack, Huffman Coding, Activity Selection\n" +
                          "• **Dynamic Programming:** 0/1 Knapsack, LCS, Matrix Chain Multiplication (MCM), Floyd-Warshall\n" +
                          "• **Graph Algorithms:** Dijkstra's, Prim's, Kruskal's, DFS Applications, Ford-Fulkerson Flow\n\n" +
                          "Click any algorithm below to launch its visual simulation:",
                    links: links.slice(0, 5),
                    suggestedPrompts: [
                        "Tell me about Visual OS Lab",
                        "Show Merge Sort visualizer",
                        "Show Dijkstra algorithm",
                        "DAA Crash Course"
                    ],
                    confidence: 0.98,
                    intent: 'VIRTUAL_LAB'
                };
            }

            if (labType === 'os') {
                const sims = (this.kb.labs?.os?.simulations || []).slice(0, 6);
                const links = sims.map(s => ({
                    title: s.name,
                    subtitle: `${s.category} Simulation`,
                    url: s.url,
                    type: 'tool'
                }));

                return {
                    text: "🖥️ **Visual OS Lab** (`/os`)\n\n" +
                          "The Visual OS Lab simulates core operating system mechanisms with interactive Gantt charts and memory maps:\n\n" +
                          "• **CPU Scheduling:** FCFS, SJF (Non-Preemptive), SRTF (Preemptive SJF), Round Robin, Priority (Preemptive & Non-Preemptive), HRRN\n" +
                          "• **Process Management:** Process States Lifecycle (New, Ready, Running, Blocked, Terminated)\n" +
                          "• **Memory Management:** Paging Address Translation with TLB simulation, Page Replacement (FIFO, LRU, Optimal)\n" +
                          "• **Synchronization & Deadlocks:** Banker's Safety Algorithm, Dining Philosophers Problem, Disk Scheduling (SCAN, C-SCAN, SSTF)\n\n" +
                          "Choose a simulation below to experiment interactively:",
                    links: links.slice(0, 5),
                    suggestedPrompts: [
                        "Tell me about Visual DSA Lab",
                        "How Round Robin works in OS",
                        "Banker's algorithm visualizer",
                        "Operating Systems Crash Course"
                    ],
                    confidence: 0.98,
                    intent: 'VIRTUAL_LAB'
                };
            }

            return {
                text: "🧪 **Virtual Interactive Labs on BU Resource Hub:**\n\n" +
                      "1. 💻 **Visual DSA Lab (`/dsa`):** 20+ algorithms visualized step-by-step across Sorting, Searching, Graphs, Greedy, and Dynamic Programming with time/space complexity meters.\n\n" +
                      "2. 🖥️ **Visual OS Lab (`/os`):** Hands-on simulations of CPU Scheduling with live Gantt charts (FCFS, SJF, RR, Priority), Paging Translation, Page Replacement (FIFO, LRU), Banker's Algorithm, and Dining Philosophers.",
                links: [
                    { title: "Visual DSA Lab", subtitle: "20+ Algorithm Visualizers", url: "/dsa", type: "tool" },
                    { title: "Visual OS Lab", subtitle: "Scheduling & Memory Simulations", url: "/os", type: "tool" }
                ],
                suggestedPrompts: [
                    "Explore Visual DSA Lab",
                    "Explore Visual OS Lab",
                    "Show CPU scheduling algorithms",
                    "DAA crash course"
                ],
                confidence: 0.98,
                intent: 'VIRTUAL_LAB'
            };
        }

        generateCourseResponse(entities, rankedDocs) {
            let matchedCourses = [];

            if (entities.subject) {
                matchedCourses = (this.kb.courses || []).filter(c =>
                    c.title.toLowerCase().includes(entities.subject.toLowerCase()) ||
                    c.description.toLowerCase().includes(entities.subject.toLowerCase()) ||
                    (c.fullText && c.fullText.toLowerCase().includes(entities.subject.toLowerCase()))
                );
            } else if (entities.educator) {
                matchedCourses = (this.kb.courses || []).filter(c =>
                    c.educator.toLowerCase().includes(entities.educator.toLowerCase())
                );
            } else if (entities.semester) {
                const semSubjects = (this.kb.semesters?.[`sem${entities.semester}`] || []).map(s => s.name.toLowerCase());
                matchedCourses = (this.kb.courses || []).filter(c =>
                    semSubjects.some(sub => c.title.toLowerCase().includes(sub) || c.description.toLowerCase().includes(sub))
                );
            }

            if (matchedCourses.length === 0) {
                matchedCourses = rankedDocs
                    .filter(r => r.doc.type === 'course')
                    .map(r => r.doc.data);
            }

            if (matchedCourses.length === 0) {
                matchedCourses = (this.kb.courses || []).slice(0, 5);
            }

            const links = matchedCourses.slice(0, 5).map(c => ({
                title: c.title,
                subtitle: `${c.educator} • ${c.discount || 'Special Discount'}`,
                url: c.url,
                type: 'course'
            }));

            // Add bundle if available
            if (this.kb.bundles && this.kb.bundles.length > 0 && links.length < 5) {
                links.push({
                    title: this.kb.bundles[0].title,
                    subtitle: "All-in-One Semester Bundle",
                    url: this.kb.bundles[0].url,
                    type: 'course'
                });
            }

            const subjectMention = entities.subject ? `for **${entities.subject}**` : entities.semester ? `for **Semester ${entities.semester}**` : '';

            return {
                text: `🎓 **Skills Seekers Mastercourses & Crash Courses ${subjectMention}**\n\n` +
                      `Fast-track your exam prep with high-yield video sprints, fully solved tutorial sheets, and step-by-step past paper walkthroughs directly aligned to the Bennett University syllabus.\n\n` +
                      `Here are the most relevant courses:`,
                links: links,
                suggestedPrompts: [
                    "What courses does Pratham Kocher teach?",
                    "What courses does Vansh Malhotra teach?",
                    "Browse all courses in catalog",
                    "Show corresponding PYQs"
                ],
                confidence: 0.98,
                intent: 'FIND_COURSE'
            };
        }

        generatePYQResponse(entities, rankedDocs) {
            let matchedPapers = [];

            if (entities.semester && entities.subject) {
                matchedPapers = (this.kb.library || []).filter(p =>
                    p.semester === entities.semester &&
                    p.subject.toLowerCase().includes(entities.subject.toLowerCase())
                );
            } else if (entities.subject) {
                matchedPapers = (this.kb.library || []).filter(p =>
                    p.subject.toLowerCase().includes(entities.subject.toLowerCase())
                );
            } else if (entities.semester) {
                matchedPapers = (this.kb.library || []).filter(p =>
                    p.semester === entities.semester
                );
            }

            if (entities.examType && matchedPapers.length > 0) {
                const typeFiltered = matchedPapers.filter(p => p.type.toLowerCase().includes(entities.examType.toLowerCase()));
                if (typeFiltered.length > 0) matchedPapers = typeFiltered;
            }

            if (matchedPapers.length === 0) {
                matchedPapers = rankedDocs
                    .filter(r => r.doc.type === 'pyq')
                    .map(r => r.doc.data);
            }

            if (matchedPapers.length === 0) {
                const semText = entities.semester ? ` for Semester ${entities.semester}` : '';
                return {
                    text: `I couldn't find specific individual papers${semText} matching that exact query, but all verified question papers are organized in the **Universal PYQ Library**.\n\n` +
                          `You can filter by semester, subject, and exam type with 1-click preview:`,
                    links: [
                        { title: "Universal PYQ Library", subtitle: "Browse 39+ Papers", url: "/library", type: "nav" },
                        { title: entities.semester ? `Semester ${entities.semester} Page` : "Home Dashboard", subtitle: "Subject Papers", url: entities.semester ? `/sem${entities.semester}` : "/home", type: "nav" }
                    ],
                    suggestedPrompts: [
                        "Show Semester 1 PYQs",
                        "Show Semester 3 PYQs",
                        "How to upload a question paper?"
                    ],
                    confidence: 0.70,
                    intent: 'FIND_PYQ'
                };
            }

            const links = matchedPapers.slice(0, 6).map(p => ({
                title: p.title || `${p.subject} ${p.type} ${p.year}`,
                subtitle: `Sem ${p.semester} • ${p.type} ${p.year} • Google Drive PDF`,
                url: p.url,
                type: 'pyq'
            }));

            const targetDesc = entities.subject ? `for **${entities.subject}**` : entities.semester ? `for **Semester ${entities.semester}**` : '';

            return {
                text: `📄 **Verified Question Papers (PYQs) ${targetDesc}:**\n\n` +
                      `Found **${matchedPapers.length}** verified papers with direct Google Drive preview links. Click any card below to view or download:`,
                links: links,
                suggestedPrompts: [
                    "View all papers in PYQ Library",
                    entities.subject ? `Crash course for ${entities.subject}` : "Browse crash courses",
                    "How to share question papers?"
                ],
                confidence: 0.98,
                intent: 'FIND_PYQ'
            };
        }

        generateSemesterResponse(entities) {
            const sem = entities.semester || 1;
            const subjects = this.kb.semesters?.[`sem${sem}`] || [];

            const subjectList = subjects.map(s => {
                const paperCount = (s.papers || []).length;
                return `• **${s.name}** ${s.code ? `(${s.code})` : ''}: ${paperCount} verified PYQs`;
            }).join('\n');

            return {
                text: `📚 **Semester 0${sem} Resources & Subjects:**\n\n` +
                      `Here are the core subjects and question papers available for Semester ${sem}:\n\n` +
                      subjectList + "\n\n" +
                      `You can view all question papers, tutorial sheets, and crash courses on the Semester ${sem} page.`,
                links: [
                    { title: `Semester 0${sem} Hub`, subtitle: `Full Subject List & Papers`, url: `/sem${sem}`, type: "nav" },
                    { title: "Universal PYQ Library", subtitle: "Filter by Semester " + sem, url: "/library", type: "nav" },
                    { title: "Course Catalog", subtitle: `Semester ${sem} Crash Courses`, url: "/courses", type: "course" }
                ],
                suggestedPrompts: [
                    `Show Semester ${sem} PYQs`,
                    `Courses for Semester ${sem}`,
                    sem < 5 ? `What about Semester ${sem + 1}?` : "Semester 1 resources",
                    "Universal PYQ Library"
                ],
                confidence: 0.98,
                intent: 'SEMESTER_INFO'
            };
        }

        generateSubjectResponse(entities, rankedDocs) {
            const subject = entities.subject;
            const libraryPapers = (this.kb.library || []).filter(p => p.subject.toLowerCase() === subject.toLowerCase());
            const courses = (this.kb.courses || []).filter(c =>
                c.title.toLowerCase().includes(subject.toLowerCase()) ||
                c.description.toLowerCase().includes(subject.toLowerCase()) ||
                (c.fullText && c.fullText.toLowerCase().includes(subject.toLowerCase()))
            );

            let semNum = entities.semester;
            if (!semNum) {
                for (const [sKey, subs] of Object.entries(this.kb.semesters || {})) {
                    if (subs.some(s => s.name.toLowerCase() === subject.toLowerCase())) {
                        semNum = parseInt(sKey.replace('sem', ''), 10);
                        break;
                    }
                }
            }

            const links = [];
            if (courses.length > 0) {
                links.push({
                    title: courses[0].title,
                    subtitle: `${courses[0].educator} • ${courses[0].discount || 'Course Sprint'}`,
                    url: courses[0].url,
                    type: 'course'
                });
            }

            libraryPapers.slice(0, 3).forEach(p => {
                links.push({
                    title: p.title || `${p.subject} ${p.type} ${p.year}`,
                    subtitle: `Sem ${p.semester} • ${p.type} ${p.year} (Drive Preview)`,
                    url: p.url,
                    type: 'pyq'
                });
            });

            if (semNum) {
                links.push({
                    title: `Semester ${semNum} Page`,
                    subtitle: "View all resources",
                    url: `/sem${semNum}`,
                    type: 'nav'
                });
            }

            return {
                text: `📖 **${subject}** ${semNum ? `(Semester ${semNum})` : ''}\n\n` +
                      `• **Verified PYQs:** ${libraryPapers.length} previous year papers available with 1-click preview.\n` +
                      `• **Crash Courses:** ${courses.length > 0 ? `Available by ${courses[0].educator} (${courses[0].discount || 'Discounted'})` : 'Check Skills Seekers Store for tutorials'}.\n\n` +
                      `Here are the top resources for ${subject}:`,
                links: links,
                suggestedPrompts: [
                    `Show all ${subject} PYQs`,
                    `Crash course for ${subject}`,
                    semNum ? `Semester ${semNum} subjects` : "Universal PYQ Library",
                    "Study Tools"
                ],
                confidence: 0.98,
                intent: 'SPECIFIC_SUBJECT'
            };
        }

        generateNavigationResponse(entities, rankedDocs, query) {
            const lower = (query || '').toLowerCase();
            let target = { title: "Dashboard / Home", url: "/home", subtitle: "Main Platform Hub" };

            if (lower.includes('library') || lower.includes('pyq') || lower.includes('past paper')) {
                target = { title: "Universal PYQ Library", url: "/library", subtitle: "39+ Verified Exam Papers" };
            } else if (lower.includes('course') || lower.includes('catalog') || lower.includes('store')) {
                target = { title: "Course Catalog", url: "/courses", subtitle: "Crash Courses & Sprints" };
            } else if (lower.includes('tool') || lower.includes('calculator') || lower.includes('pomodoro') || lower.includes('cgpa')) {
                target = { title: "Academic Study Tools", url: "/tools", subtitle: "Pomodoro, CGPA, Countdown" };
            } else if (lower.includes('dsa') || lower.includes('sorting')) {
                target = { title: "Visual DSA Lab", url: "/dsa", subtitle: "20+ Interactive Visualizers" };
            } else if (lower.includes('os') || lower.includes('operating system') || lower.includes('scheduling')) {
                target = { title: "Visual OS Lab", url: "/os", subtitle: "Interactive Systems Simulations" };
            } else if (entities.semester || lower.match(/sem(?:ester)?\s*([1-5])/)) {
                const s = entities.semester || (lower.match(/sem(?:ester)?\s*([1-5])/) ? lower.match(/sem(?:ester)?\s*([1-5])/)[1] : 1);
                target = { title: `Semester 0${s} Hub`, url: `/sem${s}`, subtitle: `Semester ${s} Resources` };
            } else if (lower.includes('login') || lower.includes('sign in')) {
                target = { title: "Student Login", url: "/login", subtitle: "Sign In to BU Resource Hub" };
            } else if (lower.includes('signup') || lower.includes('register')) {
                target = { title: "Student Sign Up", url: "/signup", subtitle: "Create an Account" };
            }

            return {
                text: `🧭 **Navigation Helper**\n\n` +
                      `You can navigate directly to **${target.title}** (${target.url}):\n\n` +
                      `Click below to jump straight to the page:`,
                links: [
                    { title: target.title, subtitle: target.subtitle || "Jump to page", url: target.url, type: "nav" },
                    { title: "Home Dashboard", subtitle: "Main platform hub", url: "/home", type: "nav" }
                ],
                suggestedPrompts: [
                    "Take me to PYQ Library",
                    "Take me to Courses",
                    "Take me to Study Tools",
                    "Open Visual DSA Lab"
                ],
                confidence: 0.98,
                intent: 'NAVIGATION'
            };
        }

        generateBestMatchResponse(topMatch, rankedDocs, entities) {
            const doc = topMatch.doc;
            const confidence = topMatch.score;

            const links = [
                {
                    title: doc.title,
                    subtitle: doc.subtitle || "Skills Seekers Resource",
                    url: doc.url,
                    type: doc.type.includes('pyq') ? 'pyq' : doc.type.includes('course') ? 'course' : doc.type.includes('tool') ? 'tool' : 'nav'
                }
            ];

            rankedDocs.slice(1, 3).forEach(r => {
                if (r.score > confidence * 0.7) {
                    links.push({
                        title: r.doc.title,
                        subtitle: r.doc.subtitle || "Related Resource",
                        url: r.doc.url,
                        type: r.doc.type.includes('pyq') ? 'pyq' : r.doc.type.includes('course') ? 'course' : 'nav'
                    });
                }
            });

            return {
                text: `Here is the most relevant resource matching your query:\n\n` +
                      `📌 **${doc.title}**\n` +
                      `${doc.subtitle ? `*${doc.subtitle}*\n\n` : ''}` +
                      `${doc.data?.description || doc.data?.bio || doc.text.slice(0, 220) + '...'}\n\n` +
                      `Click below to access this resource directly:`,
                links: links,
                suggestedPrompts: [
                    "Explore PYQ Library",
                    "Browse Crash Courses",
                    "Academic Study Tools",
                    "Contact Skills Seekers"
                ],
                confidence: Math.min(0.92, confidence),
                intent: 'BEST_MATCH'
            };
        }

        generateFallbackResponse(query) {
            const lower = (query || '').toLowerCase();
            let hint = "";
            let suggestedPrompts = [
                "Show Semester 1 PYQs",
                "Browse all educators",
                "What courses are available?",
                "How to calculate CGPA?",
                "Who built this platform?"
            ];

            if (lower.includes('pyq') || lower.includes('paper') || lower.includes('exam')) {
                hint = "💡 If you are looking for specific exam papers, try specifying the subject name and semester (e.g., *'Show Semester 2 Maths PYQ'*).\n\n";
                suggestedPrompts = ["Show Semester 1 PYQs", "Show Semester 3 PYQs", "Universal PYQ Library", "Contribute a question paper"];
            } else if (lower.includes('course') || lower.includes('learn') || lower.includes('study') || lower.includes('video')) {
                hint = "💡 Skills Seekers offers 24+ high-yield crash courses with solved tutorials. Try asking about a subject or instructor (e.g., *'Courses by Pratham Kocher'* or *'Operating Systems Sprint'*).\n\n";
                suggestedPrompts = ["Browse all educators", "Explore crash courses", "1-on-1 Mentorship", "What do students say? (Reviews)"];
            } else if (lower.includes('lab') || lower.includes('code') || lower.includes('visual')) {
                hint = "💡 We feature interactive Virtual Labs for Visual DSA and Visual OS simulations.\n\n";
                suggestedPrompts = ["Open Visual DSA Lab", "Open Visual OS Lab", "CPU Scheduling simulation", "Sorting algorithms"];
            }

            return {
                text: `I couldn't find a direct match in the Skills Seekers knowledge base for "${query}".\n\n` +
                      hint +
                      `As the Skills Seekers Resource Assistant, I specialize in academic resources for Bennett University:\n` +
                      `• **Previous Year Questions (PYQs)** for Semesters 1 through 5\n` +
                      `• **Skills Seekers Mastercourses** & Crash Course Sprints\n` +
                      `• **Top Educators** (Pratham Kocher, Vansh Malhotra, Hrehaan Ahuja)\n` +
                      `• **Academic Study Tools** (Pomodoro, CGPA Calculator, Scratchpad)\n` +
                      `• **Virtual Labs** (Visual DSA & Visual OS)\n\n` +
                      `Try asking one of the suggestions below or reach out to student support:`,
                links: [
                    { title: "Universal PYQ Library", subtitle: "Browse 39+ verified papers", url: "/library", type: "nav" },
                    { title: "Crash Courses Catalog", subtitle: "Explore 24+ courses", url: "/courses", type: "course" },
                    { title: "Ask on WhatsApp", subtitle: "Direct student support", url: this.kb.platform.whatsapp, type: "external" }
                ],
                suggestedPrompts: suggestedPrompts,
                confidence: 0.10,
                intent: 'FALLBACK'
            };
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ChatbotNLP;
    }
    if (typeof window !== 'undefined') {
        window.ChatbotNLP = ChatbotNLP;
    }
})();
