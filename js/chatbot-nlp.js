/**
 * Skills Seekers AI Chatbot - Conversational NLP, Knowledge Graph & Reasoning Engine (V3)
 * Pure zero-dependency client/server AI assistant grounded strictly in the Skills Seekers KB.
 *
 * Upgrades in V3:
 * - Relational Knowledge Graph linking Educators <-> Subjects <-> Courses <-> PYQs <-> Bundles <-> Labs <-> Roles
 * - Multi-entity extraction with span deduplication, typo/fuzzy recovery, and informal/Hinglish phrasing support
 * - Polar assumption detection & correction (e.g. "Is Calculus taught by Vansh?" -> "No, Khushi Goyal teaches...")
 * - Pronoun & coreference memory (she/her, he/him, they/them, it/this/that) + elliptical follow-ups ("What about Linear Algebra?")
 * - Multi-condition & comparative reasoning (price/budget/discount filters, availability checks, X vs Y comparisons)
 * - Uncertainty & role distinction (teaching vs founding vs "Skills Seekers Faculty" vs bio-only mention vs Coming Soon)
 * - Natural conversational response generation with direct-first answers and context-aware follow-up questions
 */

(function () {
    'use strict';

    // ── 1. Stopwords & Contractions ───────────────────────────
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

    const CONTRACTIONS = {
        "what's": "what is", "who's": "who is", "where's": "where is", "how's": "how is",
        "it's": "it is", "that's": "that is", "can't": "cannot", "won't": "will not",
        "i'm": "i am", "i've": "i have", "i'll": "i will", "i'd": "i would",
        "you're": "you are", "we're": "we are", "they're": "they are", "there's": "there is",
        "don't": "do not", "doesn't": "does not", "didn't": "did not", "haven't": "have not",
        "hasn't": "has not", "isn't": "is not", "aren't": "are not",
        "shouldn't": "should not", "wouldn't": "would not", "pls": "please", "plz": "please",
        "thx": "thanks", "ty": "thank you"
    };

    // ── 2. Domain Synonyms Map ────────────────────────────────
    const SYNONYM_MAP = {
        'pyq': 'pyq', 'pyqs': 'pyq', 'pyp': 'pyq', 'pyps': 'pyq', 'paper': 'pyq', 'papers': 'pyq',
        'midsem': 'midsem', 'midterms': 'midsem', 'midterm': 'midsem', 'minor': 'midsem',
        'endsem': 'endsem', 'endterms': 'endsem', 'endterm': 'endsem', 'major': 'endsem',
        'course': 'course', 'courses': 'course', 'sprint': 'course', 'sprints': 'course', 'mastercourse': 'course', 'mastercourses': 'course',
        'bundle': 'course', 'bundles': 'course', 'tutorial': 'course', 'tutorials': 'course', 'lecture': 'course', 'lectures': 'course',
        'teacher': 'educator', 'teachers': 'educator', 'educator': 'educator', 'educators': 'educator',
        'instructor': 'educator', 'instructors': 'educator', 'faculty': 'educator', 'mentor': 'educator', 'mentors': 'educator',
        'teaches': 'educator', 'teach': 'educator', 'taught': 'educator',
        'calculator': 'tool', 'pomodoro': 'tool', 'timer': 'tool', 'countdown': 'tool', 'scratchpad': 'tool',
        'review': 'testimonial', 'reviews': 'testimonial', 'testimonial': 'testimonial', 'testimonials': 'testimonial',
        'feedback': 'testimonial', 'ratings': 'testimonial', 'story': 'testimonial', 'stories': 'testimonial',
        'algorithm': 'daa', 'algorithms': 'daa', 'daaa': 'daa', 'scheduling': 'os', 'pratham': 'founder',
        'ims': 'dbms', 'database': 'dbms', 'databases': 'dbms', 'rdbms': 'dbms',
        'mpca': 'microprocessor', 'mca': 'microprocessor', 'microprocessors': 'microprocessor',
        'pns': 'probability', 'toc': 'automata', 'flats': 'automata', 'sml': 'sml',
        'imd': 'intelligent', 'ivp': 'image', 'spm': 'spm', 'evs': 'environment',
        'dms': 'discrete', 'oop': 'java', 'oops': 'java', 'ece': 'electronics', 'ephy': 'mechanics'
    };

    // ── 3. Canonical Subjects & Matching ──────────────────────
    const CANONICAL_SUBJECTS = {
        'Data Analysis (Python)': ['data analysis (python)', 'data analysis using python', 'data analysis with python', 'data analysis python', 'data analysis', 'dap', 'eda', 'pandas', 'numpy', 'matplotlib'],
        'Engineering Calculus': ['engineering calculus', 'engg calculus', 'engg calc', 'calculus', 'calc', 'cset 101 math', 'math 1', 'maths 1', 'multivariable calculus', 'differential calculus', 'partial differentiation', 'multiple integrals'],
        'Electronics': ['electronics', 'basic electronics', 'electronic circuits', 'ece', 'semiconductors', 'bjt', 'mosfet', 'op-amp', 'diode'],
        'Mechanics & Electromagnetism': ['mechanics & electromagnetism', 'mechanics and electromagnetism', 'mechanics', 'electromagnetism', 'ephy', 'physics', 'mech', 'maxwell equations', 'rotational dynamics'],
        'Digital Design': ['digital design', 'digital logic', 'logic design', 'dd', 'logic gates', 'k-map', 'kmap', 'flip flop', 'flip-flops', 'sequential circuits', 'boolean algebra'],
        'Linear Algebra & ODE': ['linear algebra & ode', 'linear algebra and ode', 'linear algebra', 'la & ode', 'linalg', 'ode', 'differential equations', 'eigenvalues', 'vector spaces'],
        'Discrete Mathematics': ['discrete mathematics', 'discrete math', 'discrete maths', 'discrete structures', 'dms', 'dm', 'graph theory', 'propositional logic', 'recurrence relations'],
        'Environment': ['environment', 'environmental studies', 'environmental science', 'evs', 'ecology', 'biodiversity'],
        'Data Structures (C++)': ['data structures (c++)', 'data structures using c++', 'data structures in c++', 'data structures', 'data structure', 'dsa', 'cpp dsa', 'c++', 'cpp', 'linked list', 'avl trees', 'binary trees'],
        'Statistical Machine Learning (SML)': ['statistical machine learning (sml)', 'statistical machine learning', 'sml (machine learning)', 'sml', 'machine learning sml', 'regression models', 'pca'],
        'Probability & Statistics': ['probability & statistics', 'probability and statistics', 'prob & stats', 'prob and stats', 'probability & stat', 'pns', 'p&s', 'probability', 'hypothesis testing', 'bayes theorem', 'chi-square'],
        'DBMS': ['dbms', 'database management system', 'database management systems', 'database', 'databases', 'rdbms', 'sql', 'ims', 'information management system', 'information management systems', 'er diagram', 'er diagrams', 'normalization', 'bcnf'],
        'Microprocessors & CA': ['microprocessors & ca', 'microprocessors & computer architecture', 'microprocessors and computer architecture', 'microprocessors', 'microprocessor', 'mpca', 'mca', 'computer architecture', '8086', 'assembly programming'],
        'DAA (Algorithms)': ['daa (algorithms)', 'design & analysis of algorithms', 'design and analysis of algorithms', 'algorithm design', 'algorithms prep', 'daa', 'daaa', 'algorithms', 'algorithm', 'np-completeness', 'dynamic programming'],
        'Operating Systems': ['operating systems', 'operating system', 'os', 'cpu scheduling', 'process synchronization', 'process management', 'deadlocks', 'deadlock', 'semaphores', 'paging'],
        'Computer Networks': ['computer networks', 'computer network', 'cn', 'networking', 'networks', 'tcp/ip', 'osi model', 'ip subnetting', 'routing algorithms'],
        'Intelligent Model Design': ['intelligent model design', 'intelligent model design using ai', 'intelligent model design imd', 'imd', 'hyperparameter optimization', 'model compression'],
        'AI and Society': ['ai and society', 'ai & society', 'ai and society ai ethics', 'ai ethics', 'ethics in ai', 'algorithmic fairness'],
        'AI & ML': ['ai & ml', 'ai-ml', 'ai/ml', 'aiml', 'ai ml', 'ai & machine learning', 'artificial intelligence & ml', 'artificial intelligence & machine learning', 'artificial intelligence and machine learning', 'artificial intelligence', 'cset 312', 'cset312'],
        'Automata / Theory of Computation': ['automata / theory of computation', 'automata theory of computation toc', 'automata theory and computability', 'theory of computation', 'automata theory', 'automata', 'toc', 'computability', 'flats', 'turing machine', 'pushdown automata', 'pumping lemma'],
        'Natural Language Processing': ['natural language processing', 'natural language processing nlp', 'nlp', 'text mining', 'word2vec', 'glove', 'language models'],
        'Image Video Processing': ['image video processing', 'image video processing ivp', 'image & video processing', 'image and video processing', 'image processing', 'video processing', 'ivp', 'computer vision', 'opencv'],
        'Software Project Management': ['software project management', 'software project management spm', 'spm', 'project management', 'cocomo', 'pert', 'cpm'],
        'Agile Software Development': ['agile software development', 'agile software development scrum kanban', 'agile', 'scrum', 'kanban', 'user stories', 'tdd'],
        'MLOps': ['mlops', 'mlops machine learning operations', 'ml ops', 'machine learning operations', 'mlflow', 'dvc', 'model registry'],
        'Computational Thinking': ['computational thinking', 'computational thinking & programming', 'ctp', 'ct', 'python', 'python programming', 'coding in python'],
        'OOP (Java)': ['oop (java)', 'oop java', 'object oriented programming', 'object oriented', 'oops', 'oop', 'java', 'java programming']
    };

    function buildAliasMatcher(alias, flags = 'i') {
        const escaped = alias.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
        const prefix = /^[a-z0-9]/i.test(alias) ? '\\b' : '(?:^|[\\s,(&/-])';
        const suffix = /[a-z0-9]$/i.test(alias) ? '\\b' : '(?=$|[\\s,).&/!?-])';
        return new RegExp(prefix + escaped + suffix, flags);
    }

    const ALIAS_ENTRIES = [];
    for (const [canonical, aliases] of Object.entries(CANONICAL_SUBJECTS)) {
        for (const alias of aliases) {
            ALIAS_ENTRIES.push({
                canonical,
                alias,
                regex: buildAliasMatcher(alias, 'i'),
                globalRegex: buildAliasMatcher(alias, 'ig')
            });
        }
    }
    ALIAS_ENTRIES.sort((a, b) => b.alias.length - a.alias.length);

    const FUZZY_SUBJECT_TOKENS = [
        { token: 'calculus', canonical: 'Engineering Calculus' },
        { token: 'calculas', canonical: 'Engineering Calculus' },
        { token: 'calclus', canonical: 'Engineering Calculus' },
        { token: 'electronics', canonical: 'Electronics' },
        { token: 'electronic', canonical: 'Electronics' },
        { token: 'mechanics', canonical: 'Mechanics & Electromagnetism' },
        { token: 'electromagnetism', canonical: 'Mechanics & Electromagnetism' },
        { token: 'physics', canonical: 'Mechanics & Electromagnetism' },
        { token: 'computational', canonical: 'Computational Thinking' },
        { token: 'python', canonical: 'Computational Thinking' },
        { token: 'digital', canonical: 'Digital Design' },
        { token: 'linear', canonical: 'Linear Algebra & ODE' },
        { token: 'algebra', canonical: 'Linear Algebra & ODE' },
        { token: 'discrete', canonical: 'Discrete Mathematics' },
        { token: 'environment', canonical: 'Environment' },
        { token: 'environmental', canonical: 'Environment' },
        { token: 'structures', canonical: 'Data Structures (C++)' },
        { token: 'statistical', canonical: 'Statistical Machine Learning (SML)' },
        { token: 'probability', canonical: 'Probability & Statistics' },
        { token: 'statistics', canonical: 'Probability & Statistics' },
        { token: 'database', canonical: 'DBMS' },
        { token: 'databases', canonical: 'DBMS' },
        { token: 'microprocessor', canonical: 'Microprocessors & CA' },
        { token: 'microprocessors', canonical: 'Microprocessors & CA' },
        { token: 'architecture', canonical: 'Microprocessors & CA' },
        { token: 'algorithms', canonical: 'DAA (Algorithms)' },
        { token: 'algorithm', canonical: 'DAA (Algorithms)' },
        { token: 'operating', canonical: 'Operating Systems' },
        { token: 'networks', canonical: 'Computer Networks' },
        { token: 'networking', canonical: 'Computer Networks' },
        { token: 'intelligent', canonical: 'Intelligent Model Design' },
        { token: 'automata', canonical: 'Automata / Theory of Computation' },
        { token: 'computability', canonical: 'Automata / Theory of Computation' },
        { token: 'language', canonical: 'Natural Language Processing' },
        { token: 'management', canonical: 'Software Project Management' },
        { token: 'agile', canonical: 'Agile Software Development' },
        { token: 'scrum', canonical: 'Agile Software Development' },
        { token: 'mlops', canonical: 'MLOps' }
    ];

    // Educator metadata (strictly grounded in KB team; roles & gender tracked explicitly)
    const EDUCATORS = [
        { name: 'Pratham Kocher', gender: 'male', aliases: ['pratham kocher', 'pratham', 'kocher'] },
        { name: 'Vansh Malhotra', gender: 'male', aliases: ['vansh malhotra', 'vansh', 'malhotra'] },
        { name: 'Hrehaan Ahuja', gender: 'male', aliases: ['hrehaan ahuja', 'hrehaan', 'ahuja'] },
        { name: 'Khushi Goyal', gender: 'female', aliases: ['khushi goyal', 'khushi', 'goyal'] },
        { name: 'Samman Dev Dubey', gender: 'male', aliases: ['samman dev dubey', 'samman dev', 'samman', 'dubey'] },
        { name: 'Pranay Wadhwa', gender: 'male', aliases: ['pranay wadhwa', 'pranay', 'wadhwa'] },
        { name: 'Vinayak Gupta', gender: 'male', aliases: ['vinayak gupta', 'vinayak', 'gupta'] }
    ];

    const FUZZY_EDUCATOR_TOKENS = [
        { token: 'pratham', name: 'Pratham Kocher' },
        { token: 'kocher', name: 'Pratham Kocher' },
        { token: 'vansh', name: 'Vansh Malhotra' },
        { token: 'malhotra', name: 'Vansh Malhotra' },
        { token: 'hrehaan', name: 'Hrehaan Ahuja' },
        { token: 'hrehan', name: 'Hrehaan Ahuja' },
        { token: 'khushi', name: 'Khushi Goyal' },
        { token: 'samman', name: 'Samman Dev Dubey' },
        { token: 'pranay', name: 'Pranay Wadhwa' },
        { token: 'vinayak', name: 'Vinayak Gupta' }
    ];

    function levenshtein(a, b) {
        const m = a.length, n = b.length;
        if (Math.abs(m - n) > 2) return 99;
        const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
            }
        }
        return dp[m][n];
    }

    function spansOverlap(spans, start, end) {
        for (const [s, e] of spans) {
            if (start < e && end > s) return true;
        }
        return false;
    }

    function resolveSubjects(text) {
        if (!text) return [];
        const lower = text.toLowerCase();
        if (CANONICAL_SUBJECTS[text]) return [text];

        const isMetaNLP = /\b(chatbot nlp|nlp engine|nlp retrieval|your nlp)\b/i.test(lower);
        const claimedSpans = [];
        const found = []; // { canonical, index }

        for (const entry of ALIAS_ENTRIES) {
            if (isMetaNLP && entry.canonical === 'Natural Language Processing' && entry.alias === 'nlp') {
                continue;
            }
            // Guard against matching "dd" inside random words or "ct" inside unrelated acronyms if lowercase edge
            entry.globalRegex.lastIndex = 0;
            let match;
            while ((match = entry.globalRegex.exec(lower)) !== null) {
                const start = match.index;
                const end = start + match[0].length;
                if (!spansOverlap(claimedSpans, start, end)) {
                    claimedSpans.push([start, end]);
                    if (!found.some(f => f.canonical === entry.canonical)) {
                        found.push({ canonical: entry.canonical, index: start });
                    }
                }
            }
        }

        if (found.length > 0) {
            found.sort((a, b) => a.index - b.index);
            return found.map(f => f.canonical);
        }

        const fuzzy = resolveFuzzySubjects(text);
        return fuzzy;
    }

    function resolveSubjectName(text) {
        const all = resolveSubjects(text);
        return all.length > 0 ? all[0] : null;
    }

    function resolveFuzzySubjects(text) {
        if (!text) return [];
        const skipWords = new Set(['paper', 'papers', 'midsem', 'endsem', 'course', 'courses', 'semester', 'question', 'questions', 'teacher', 'teaches', 'compare', 'difference', 'between', 'available', 'pratham', 'malhotra', 'hrehaan']);
        const words = text.toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length >= 5 && !STOPWORDS.has(w) && !skipWords.has(w));

        const matched = [];
        for (const w of words) {
            let bestMatch = null;
            let bestDist = 3;
            for (const f of FUZZY_SUBJECT_TOKENS) {
                const dist = levenshtein(w, f.token);
                const maxAllowed = f.token.length >= 7 ? 2 : 1;
                if (dist <= maxAllowed && dist < bestDist) {
                    bestDist = dist;
                    bestMatch = f.canonical;
                }
            }
            if (bestMatch && !matched.includes(bestMatch)) {
                matched.push(bestMatch);
            }
        }
        return matched;
    }

    function resolveFuzzySubject(text) {
        const res = resolveFuzzySubjects(text);
        return res.length > 0 ? res[0] : null;
    }

    function resolveEducators(text) {
        if (!text) return [];
        const lower = text.toLowerCase();
        const claimedSpans = [];
        const found = [];

        // Check longer aliases first
        const flatAliases = [];
        for (const ed of EDUCATORS) {
            for (const alias of ed.aliases) {
                flatAliases.push({ name: ed.name, alias, regex: buildAliasMatcher(alias, 'ig') });
            }
        }
        flatAliases.sort((a, b) => b.alias.length - a.alias.length);

        for (const item of flatAliases) {
            item.regex.lastIndex = 0;
            let match;
            while ((match = item.regex.exec(lower)) !== null) {
                const start = match.index;
                const end = start + match[0].length;
                if (!spansOverlap(claimedSpans, start, end)) {
                    claimedSpans.push([start, end]);
                    if (!found.some(f => f.name === item.name)) {
                        found.push({ name: item.name, index: start });
                    }
                }
            }
        }

        if (found.length > 0) {
            found.sort((a, b) => a.index - b.index);
            return found.map(f => f.name);
        }

        // Typo-tolerant educator fallback (words >= 5 chars)
        const words = lower.replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length >= 5 && !STOPWORDS.has(w));
        const fuzzyMatched = [];
        for (const w of words) {
            if (['skills', 'seekers', 'course', 'courses', 'teaches', 'teacher', 'taught', 'founder', 'subject', 'semester', 'linear', 'calculus'].includes(w)) continue;
            let bestEd = null;
            let bestDist = 2;
            for (const fe of FUZZY_EDUCATOR_TOKENS) {
                const d = levenshtein(w, fe.token);
                if (d <= 1 && d < bestDist) {
                    bestDist = d;
                    bestEd = fe.name;
                }
            }
            if (bestEd && !fuzzyMatched.includes(bestEd)) {
                fuzzyMatched.push(bestEd);
            }
        }
        return fuzzyMatched;
    }

    // ── 4. Stemmer & Speech Helper ────────────────────────────
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

    function cleanForSpeech(text) {
        if (!text) return '';
        const clean = text
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/\*(.+?)\*/g, '$1')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/^[•\-]\s+/gm, '')
            .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{200D}\u{FE0F}]/gu, '')
            .replace(/\s+/g, ' ')
            .trim();

        const sentences = clean.split(/(?<=[.?!])\s+/);
        if (sentences.length > 1) {
            return (sentences[0] + ' ' + sentences[1]).slice(0, 235);
        }
        return clean.slice(0, 235);
    }

    function parsePriceNum(priceStr) {
        if (!priceStr) return null;
        const m = String(priceStr).match(/(\d[\d,]*)/);
        return m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
    }

    function parseDiscountNum(discountStr) {
        if (!discountStr) return 0;
        const m = String(discountStr).match(/(\d+)\s*%/);
        return m ? parseInt(m[1], 10) : 0;
    }

    function detectCourseScope(title) {
        const t = (title || '').toLowerCase();
        if (t.includes('1 - 1') || t.includes('one to one')) return '1-on-1 Live Mentorship';
        if (t.includes('package') || t.includes('combo')) return 'Combo Bundle';
        const hasMid = /\bmid\b|mid[\s-]?sem|mid[\s-]?term/i.test(t);
        const hasEnd = /\bend\b|end[\s-]?sem|end[\s-]?term/i.test(t);
        if (hasMid && hasEnd) return 'Mid + End-Sem';
        if (t.includes('full syllabus')) return 'Full Syllabus';
        if (hasMid) return 'Mid-Sem';
        if (hasEnd) return 'End-Sem';
        return 'Complete Sprint';
    }

    function splitCourseEducators(educatorField) {
        if (!educatorField) return [];
        if (/skills seekers/i.test(educatorField)) return [];
        const parts = educatorField.split(/\s*(?:&|,|and)\s*/i).map(s => s.trim()).filter(Boolean);
        const canonical = [];
        for (const p of parts) {
            const matched = resolveEducators(p);
            if (matched.length > 0 && !canonical.includes(matched[0])) {
                canonical.push(matched[0]);
            }
        }
        return canonical;
    }

    function formatListNatural(items) {
        if (!items || items.length === 0) return '';
        if (items.length === 1) return items[0];
        if (items.length === 2) return `${items[0]} and ${items[1]}`;
        return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
    }

    // ── 5. Relational Knowledge Graph Class ───────────────────
    class KnowledgeGraph {
        constructor(kb) {
            this.kb = kb || {};
            this.educators = new Map();
            this.subjects = new Map();
            this.semesters = new Map();
            this.courses = [];
            this.build();
        }

        build() {
            // 1. Initialize canonical subject nodes
            for (const canon of Object.keys(CANONICAL_SUBJECTS)) {
                this.subjects.set(canon, {
                    name: canon,
                    semesters: [],
                    semesterEntries: [],
                    papers: [],
                    courses: [],
                    bundles: [],
                    namedEducators: [],
                    facultyCourses: [],
                    teamSpecialists: [],
                    labs: [],
                    description: '',
                    credits: '',
                    status: 'Available'
                });
            }

            // 2. Initialize Semester nodes & attach subject entries
            for (let s = 1; s <= 5; s++) {
                this.semesters.set(s, {
                    semester: s,
                    subjects: [],
                    papers: [],
                    courses: [],
                    educators: []
                });
            }

            for (const [semKey, list] of Object.entries(this.kb.semesters || {})) {
                const sNum = parseInt(semKey.replace('sem', ''), 10);
                const semNode = this.semesters.get(sNum);
                for (const sub of (list || [])) {
                    const canon = sub.canonicalSubject || resolveSubjectName(sub.name) || sub.name;
                    if (!this.subjects.has(canon)) {
                        this.subjects.set(canon, {
                            name: canon, semesters: [], semesterEntries: [], papers: [],
                            courses: [], bundles: [], namedEducators: [], facultyCourses: [],
                            teamSpecialists: [], labs: [], description: '', credits: '', status: sub.status || 'Available'
                        });
                    }
                    const sNode = this.subjects.get(canon);
                    const entry = { ...sub, semester: sNum, canonicalSubject: canon };
                    sNode.semesterEntries.push(entry);
                    if (!sNode.semesters.includes(sNum)) sNode.semesters.push(sNum);
                    if (!sNode.description && sub.description) sNode.description = sub.description;
                    if (!sNode.credits && sub.credits) sNode.credits = sub.credits;
                    if (sub.status) sNode.status = sub.status;
                    if (semNode) semNode.subjects.push(entry);
                }
            }

            // 3. Attach PYQ library items to Subject & Semester nodes
            for (const paper of (this.kb.library || [])) {
                const canon = CANONICAL_SUBJECTS[paper.subject]
                    ? paper.subject
                    : (resolveSubjectName(paper.subject) || resolveSubjectName(paper.displaySubject) || paper.subject);
                const sNode = this.subjects.get(canon);
                const sems = Array.isArray(paper.semesters) && paper.semesters.length > 0
                    ? paper.semesters
                    : [paper.semester].filter(Boolean);

                if (sNode) {
                    sNode.papers.push(paper);
                    sNode.status = 'Available';
                    for (const sm of sems) {
                        if (sm && !sNode.semesters.includes(sm)) sNode.semesters.push(sm);
                    }
                }
                for (const sm of sems) {
                    const semNode = this.semesters.get(sm);
                    if (semNode && !semNode.papers.some(p => p.url === paper.url)) {
                        semNode.papers.push(paper);
                    }
                }
            }

            // Sort papers newest first inside each subject
            for (const sNode of this.subjects.values()) {
                sNode.semesters.sort((a, b) => a - b);
                sNode.papers.sort((a, b) => parseInt(b.year || '0', 10) - parseInt(a.year || '0', 10));
            }

            // 4. Initialize Educator nodes from KB team + metadata
            const founderName = (this.kb.platform?.founder || 'Pratham Kocher').toLowerCase();
            for (const edMeta of EDUCATORS) {
                const teamEntry = (this.kb.team || []).find(t => t.name.toLowerCase() === edMeta.name.toLowerCase());
                const bioSubjects = [];
                if (teamEntry && Array.isArray(teamEntry.subjects)) {
                    for (const rawSub of teamEntry.subjects) {
                        const canon = resolveSubjectName(rawSub);
                        if (canon && !bioSubjects.includes(canon)) bioSubjects.push(canon);
                    }
                }
                this.educators.set(edMeta.name, {
                    name: edMeta.name,
                    gender: edMeta.gender,
                    role: teamEntry?.role || 'Educator',
                    isFounder: edMeta.name.toLowerCase() === founderName,
                    bio: teamEntry?.bio || '',
                    profileSubjectsRaw: teamEntry?.subjects || [],
                    bioSubjects,
                    courses: [],
                    taughtSubjects: [],
                    mentionedOnlySubjects: [],
                    semesters: [],
                    lowestPrice: null,
                    highestPrice: null
                });
            }

            // 5. Enrich & link Courses -> Subjects, Educators, Semesters
            this.courses = (this.kb.courses || []).map(c => {
                const namedInstructors = splitCourseEducators(c.educator);
                const canonicalSubs = [];
                if (c.canonicalSubject && CANONICAL_SUBJECTS[c.canonicalSubject]) {
                    canonicalSubs.push(c.canonicalSubject);
                }
                for (const s of (c.subjects || [])) {
                    const res = CANONICAL_SUBJECTS[s] ? s : resolveSubjectName(s);
                    if (res && !canonicalSubs.includes(res)) canonicalSubs.push(res);
                }
                if (canonicalSubs.length === 0) {
                    const fromTitle = resolveSubjects(c.title + ' ' + (c.description || ''));
                    for (const fs of fromTitle) {
                        if (!canonicalSubs.includes(fs)) canonicalSubs.push(fs);
                    }
                }

                const priceNum = parsePriceNum(c.price);
                const discountNum = parseDiscountNum(c.discount);
                const scope = detectCourseScope(c.title);
                const isBundle = scope === 'Combo Bundle' || canonicalSubs.length > 1;
                const isMentorship = scope === '1-on-1 Live Mentorship';

                const enriched = {
                    ...c,
                    namedInstructors,
                    hasIndividualEducator: namedInstructors.length > 0,
                    canonicalSubjects: canonicalSubs,
                    priceNum,
                    discountNum,
                    scope,
                    isBundle,
                    isMentorship
                };

                // Link to educators
                for (const edName of namedInstructors) {
                    const edNode = this.educators.get(edName);
                    if (edNode) {
                        edNode.courses.push(enriched);
                        for (const cs of canonicalSubs) {
                            if (!isMentorship && !edNode.taughtSubjects.includes(cs)) {
                                edNode.taughtSubjects.push(cs);
                            }
                        }
                        for (const sm of (c.semesters || [])) {
                            if (!edNode.semesters.includes(sm)) edNode.semesters.push(sm);
                        }
                        if (priceNum !== null) {
                            edNode.lowestPrice = edNode.lowestPrice === null ? priceNum : Math.min(edNode.lowestPrice, priceNum);
                            edNode.highestPrice = edNode.highestPrice === null ? priceNum : Math.max(edNode.highestPrice, priceNum);
                        }
                    }
                }

                // Link to subjects
                for (const cs of canonicalSubs) {
                    const sNode = this.subjects.get(cs);
                    if (sNode) {
                        sNode.courses.push(enriched);
                        if (namedInstructors.length > 0) {
                            for (const edName of namedInstructors) {
                                if (!sNode.namedEducators.includes(edName)) sNode.namedEducators.push(edName);
                            }
                        } else {
                            sNode.facultyCourses.push(enriched);
                        }
                    }
                }

                // Link to semesters
                for (const sm of (c.semesters || [])) {
                    const semNode = this.semesters.get(sm);
                    if (semNode) {
                        semNode.courses.push(enriched);
                        for (const edName of namedInstructors) {
                            if (!semNode.educators.includes(edName)) semNode.educators.push(edName);
                        }
                    }
                }

                return enriched;
            });

            // 6. Identify subjects mentioned in educator profile but lacking standalone course card (e.g. OOP Java)
            for (const edNode of this.educators.values()) {
                edNode.semesters.sort((a, b) => a - b);
                for (const bs of edNode.bioSubjects) {
                    if (!edNode.taughtSubjects.includes(bs)) {
                        edNode.mentionedOnlySubjects.push(bs);
                        const sNode = this.subjects.get(bs);
                        if (sNode && !sNode.teamSpecialists.includes(edNode.name)) {
                            sNode.teamSpecialists.push(edNode.name);
                        }
                    }
                }
            }

            // 7. Attach Bundles to Subject nodes
            for (const b of (this.kb.bundles || [])) {
                for (const s of (b.subjects || [])) {
                    const canon = CANONICAL_SUBJECTS[s] ? s : resolveSubjectName(s);
                    const sNode = this.subjects.get(canon);
                    if (sNode && !sNode.bundles.some(x => x.url === b.url)) {
                        sNode.bundles.push(b);
                    }
                }
            }

            // 8. Link Virtual Labs to relevant Subject nodes
            if (this.kb.labs?.dsa) {
                for (const subj of ['DAA (Algorithms)', 'Data Structures (C++)']) {
                    const sNode = this.subjects.get(subj);
                    if (sNode) sNode.labs.push({ id: 'dsa', name: 'Visual DSA Lab', url: '/dsa', description: this.kb.labs.dsa.description });
                }
            }
            if (this.kb.labs?.os) {
                const osNode = this.subjects.get('Operating Systems');
                if (osNode) osNode.labs.push({ id: 'os', name: 'Visual OS Lab', url: '/os', description: this.kb.labs.os.description });
            }
        }

        getEducator(name) {
            return this.educators.get(name) || null;
        }

        getSubject(canonName) {
            return this.subjects.get(canonName) || null;
        }

        getSemester(semNum) {
            return this.semesters.get(semNum) || null;
        }

        verifyEducatorTeachesSubject(educatorName, canonSubject) {
            const edNode = this.getEducator(educatorName);
            const sNode = this.getSubject(canonSubject);
            if (!edNode || !sNode) return null;

            const matchingCourses = sNode.courses.filter(c => c.namedInstructors.includes(educatorName));
            const teachesViaCourse = matchingCourses.length > 0;
            const teachesViaBio = edNode.bioSubjects.includes(canonSubject);
            const actualOtherEducators = sNode.namedEducators.filter(n => n !== educatorName);

            return {
                educator: edNode,
                subject: sNode,
                teachesViaCourse,
                teachesViaBio,
                matchingCourses,
                actualEducators: sNode.namedEducators,
                actualOtherEducators,
                actualCourses: sNode.courses,
                hasFacultyOnlyCourse: sNode.namedEducators.length === 0 && sNode.facultyCourses.length > 0,
                teamSpecialists: sNode.teamSpecialists
            };
        }

        filterCourses({ maxPrice = null, minPrice = null, cheapest = false, minDiscount = null, scope = null, semester = null, subject = null, educator = null, excludeBundles = false } = {}) {
            let list = [...this.courses];

            if (excludeBundles) {
                list = list.filter(c => !c.isBundle && !c.isMentorship);
            }
            if (subject) {
                list = list.filter(c => c.canonicalSubjects.includes(subject));
            }
            if (educator) {
                list = list.filter(c => c.namedInstructors.includes(educator));
            }
            if (semester) {
                list = list.filter(c => Array.isArray(c.semesters) && c.semesters.includes(semester));
            }
            if (scope) {
                const scLower = scope.toLowerCase();
                list = list.filter(c => c.scope.toLowerCase().includes(scLower));
            }
            if (maxPrice !== null) {
                list = list.filter(c => c.priceNum !== null && c.priceNum <= maxPrice);
            }
            if (minPrice !== null) {
                list = list.filter(c => c.priceNum !== null && c.priceNum >= minPrice);
            }
            if (minDiscount !== null) {
                list = list.filter(c => c.discountNum >= minDiscount);
            }
            if (cheapest) {
                list = list.filter(c => c.priceNum !== null).sort((a, b) => a.priceNum - b.priceNum);
            } else if (minDiscount !== null) {
                list.sort((a, b) => b.discountNum - a.discountNum);
            }
            return list;
        }
    }

    // ── 6. Main Conversational NLP & Reasoning Engine ─────────
    class ChatbotNLP {
        constructor(kb) {
            this.kb = kb || (typeof window !== 'undefined' ? window.CHATBOT_KB : null);
            this.isReady = false;
            this.graph = null;

            this.documents = [];
            this.vocab = new Map();
            this.idf = [];
            this.docVectors = [];

            this.context = this.createEmptyContext();
        }

        createEmptyContext() {
            return {
                currentSemester: null,
                currentSubject: null,
                currentSubjects: [],
                currentCourse: null,
                currentEducator: null,
                lastMaleEducator: null,
                lastFemaleEducator: null,
                currentTool: null,
                currentLab: null,
                lastIntent: null,
                lastQuestionFocus: null, // 'WHO_TEACHES' | 'COURSES' | 'PYQS' | 'SUBJECT_INFO' | 'LAB' | 'TOOL' | 'VERIFY' | 'ROLE'
                turnCount: 0,
                history: []
            };
        }

        exportContext() {
            return JSON.parse(JSON.stringify(this.context));
        }

        importContext(savedCtx) {
            if (!savedCtx || typeof savedCtx !== 'object') return;
            const fresh = this.createEmptyContext();
            this.context = {
                ...fresh,
                ...savedCtx,
                currentSubjects: Array.isArray(savedCtx.currentSubjects) ? savedCtx.currentSubjects : [],
                history: Array.isArray(savedCtx.history) ? savedCtx.history.slice(-10) : []
            };
        }

        resetContext() {
            this.context = this.createEmptyContext();
        }

        initialize() {
            if (this.isReady) return;
            if (!this.kb) {
                throw new Error("ChatbotNLP: Knowledge Base (KB) is required for initialization.");
            }

            this.graph = new KnowledgeGraph(this.kb);
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

        // ── Query Frame & Multi-Entity Extraction ─────────────
        extractQueryFrame(rawQuery, activeCtx = this.context) {
            const query = this.expandContractions(rawQuery || '');
            const rawLower = (rawQuery || '').toLowerCase().trim();

            const subjects = resolveSubjects(query);
            const educators = resolveEducators(query);

            // Multi-semester extraction
            const semesters = [];
            const semRegex = /(?:sem(?:ester)?)\s*([1-5])\b|\b([1-5])(?:st|nd|rd|th)?\s*sem(?:ester)?\b|\bsem([1-5])\b/gi;
            let sm;
            while ((sm = semRegex.exec(query)) !== null) {
                const n = parseInt(sm[1] || sm[2] || sm[3], 10);
                if (!semesters.includes(n)) semesters.push(n);
            }

            // Exam type
            let examType = null;
            if (/\b(mid[\s-]?sem|mid[\s-]?terms?|minor)\b/i.test(query)) {
                examType = 'Midsem';
            } else if (/\b(make[\s-]?up)\b/i.test(query)) {
                examType = 'Make-up';
            } else if (/\b(end[\s-]?sem|end[\s-]?terms?|major)\b/i.test(query)) {
                examType = 'Endsem';
            }

            // Year
            const yearMatch = query.match(/\b(202[2-6])\b/);
            const year = yearMatch ? yearMatch[1] : null;

            // Tools
            let tool = null;
            if (/\b(pomodoro|focus clock)\b/i.test(query) || (query.includes('timer') && !query.includes('exam'))) {
                tool = 'pomodoro';
            } else if (/\b(cgpa|sgpa|gpa|grade calculator)\b/i.test(query)) {
                tool = 'cgpa';
            } else if (/\b(countdown|exam timer|exam date)\b/i.test(query)) {
                tool = 'countdown';
            } else if (/\b(scratchpad|quick notes|notepad)\b/i.test(query)) {
                tool = 'scratchpad';
            } else if (/\b(bookmarks?)\b/i.test(query)) {
                tool = 'bookmarks';
            }

            // Labs
            let lab = null;
            const labsMentioned = [];
            if (/\b(dsa lab|data structure lab|sorting visual|algorithm lab|visual dsa)\b/i.test(query)) {
                labsMentioned.push('dsa');
            }
            if (/\b(os lab|operating system lab|gantt chart|visual os)\b/i.test(query)) {
                labsMentioned.push('os');
            }
            if (labsMentioned.length > 0) lab = labsMentioned[0];

            // Price / Discount / Scope filters
            const priceMatchMax = query.match(/\b(?:under|below|less than|within|upto|up to|max|cheaper than)\s*(?:rs\.?|inr|₹)?\s*(\d{2,5})\b/i);
            const priceMatchMin = query.match(/\b(?:above|over|more than|at least)\s*(?:rs\.?|inr|₹)?\s*(\d{2,5})\b/i);
            const discountMatch = query.match(/(\d{1,2})\s*%\s*(?:\+|or more|above|off)?/i);

            const priceFilter = {
                maxPrice: priceMatchMax ? parseInt(priceMatchMax[1], 10) : null,
                minPrice: priceMatchMin ? parseInt(priceMatchMin[1], 10) : null,
                wantCheapest: /\b(cheapest|lowest price|most affordable|budget|least expensive|sasta)\b/i.test(query),
                wantFree: /\b(free|without paying|zero cost|no cost)\b/i.test(query),
                minDiscount: discountMatch ? parseInt(discountMatch[1], 10) : (/\b(highest discount|best discount|most discounted|max discount)\b/i.test(query) ? 45 : null)
            };

            // Question form & sub-signals
            const isPolar = /^(?:is|are|does|do|did|was|were|has|have|can)\b/i.test(rawLower) ||
                /(?:,\s*(?:right|correct|no|yes|na)|isn't it|does not|doesn't he|doesn't she)\s*\??$/i.test(rawLower);

            const isComparison = /\b(compare|comparison|versus|vs\.?|difference between|differences between|better between|diff between|which is better|which one should i)\b/i.test(query);

            const asksEducator = /\b(who teaches|who takes|who handles|who is the (teacher|instructor|educator)|taught by|taken by|created by|mentor for|teacher of|faculty for|educator for|kaun padhata)\b/i.test(query) ||
                (educators.length > 0 && subjects.length > 0 && /\b(teach|teaches|teaching|taught|by|handle|handles)\b/i.test(query));

            const asksRole = /\b(role|what does .* do|position|designation|founder|founded|built|created|started)\b/i.test(query) ||
                /\bfound\b.*\b(skills seekers|this|platform|website|hub|it)\b/i.test(query);
            const asksCourses = /\b(courses?|crash courses?|sprints?|mastercourses?|bundles?|packages?|classes|enroll|price|fees?|cost|how much|tutorials?)\b/i.test(query);
            const asksPYQ = /\b(pyqs?|pyps?|previous year|past papers?|question papers?|exam papers?|question banks?|midsem|endsem|papers?)\b/i.test(query);
            const isAllPYQQuery = /\b(all|every|complete|list of|list all|which subjects|available)\b.*\b(pyqs?|papers?|question papers?)\b|\b(pyqs?|papers?)\b.*\b(list|all|every|directory|subjects)\b/i.test(query);

            const asksAvailability = /\b(coming soon|no pyqs?|don'?t have|without (a )?course|without pyqs?|missing|not available|unavailable|yet to|which subjects have)\b/i.test(query);

            // Pronoun detection
            let pronounUsed = null;
            let unresolvedPronoun = null;
            const resolvedEducators = [...educators];
            const resolvedSubjects = [...subjects];
            const resolvedSemesters = [...semesters];

            if (/\b(she|her|hers)\b/i.test(query)) {
                pronounUsed = 'female';
                if (resolvedEducators.length === 0) {
                    if (activeCtx.lastFemaleEducator) {
                        resolvedEducators.push(activeCtx.lastFemaleEducator);
                    } else {
                        unresolvedPronoun = 'she';
                    }
                }
            } else if (/\b(he|him|his)\b/i.test(query)) {
                pronounUsed = 'male';
                if (resolvedEducators.length === 0) {
                    if (activeCtx.lastMaleEducator) {
                        resolvedEducators.push(activeCtx.lastMaleEducator);
                    } else {
                        unresolvedPronoun = 'he';
                    }
                }
            } else if (/\b(they|them|their)\b/i.test(query) && resolvedEducators.length === 0 && activeCtx.currentEducator) {
                pronounUsed = 'plural_or_neutral';
                resolvedEducators.push(activeCtx.currentEducator);
            }

            // Follow-up & "it/this/that/what about" resolution
            const hasReferentWord = /\b(it|its|this|that|these|those|them|both|same|else|more)\b/i.test(query);
            const hasEllipticalLead = /^(what about|how about|and for|and what about|and|also|only)\b/i.test(rawLower);
            const isShortFollowUp = (activeCtx.turnCount > 0) && rawLower.split(/\s+/).length <= 5 &&
                (resolvedSubjects.length > 0 || resolvedEducators.length > 0 || resolvedSemesters.length > 0 || Boolean(examType) || Boolean(year));

            const isFollowUp = hasReferentWord || hasEllipticalLead || Boolean(pronounUsed) || isShortFollowUp;

            if (isFollowUp && !unresolvedPronoun) {
                // If query did NOT mention a new subject and didn't explicitly switch to an educator-only bio/course list, inherit subject when appropriate
                if (resolvedSubjects.length === 0 && activeCtx.currentSubject && resolvedEducators.length === 0 && resolvedSemesters.length === 0 && !tool && !lab) {
                    resolvedSubjects.push(activeCtx.currentSubject);
                }
                if (resolvedSemesters.length === 0 && activeCtx.currentSemester && resolvedSubjects.length === 0 && resolvedEducators.length === 0) {
                    resolvedSemesters.push(activeCtx.currentSemester);
                }
                if (resolvedEducators.length === 0 && activeCtx.currentEducator && resolvedSubjects.length === 0 && (asksCourses || priceFilter.maxPrice !== null || priceFilter.wantCheapest || /\b(anything else|other courses|what else)\b/i.test(query))) {
                    resolvedEducators.push(activeCtx.currentEducator);
                }
            }

            return {
                rawQuery,
                query,
                subjects: resolvedSubjects,
                subject: resolvedSubjects[0] || null,
                educators: resolvedEducators,
                educator: resolvedEducators[0] || null,
                semesters: resolvedSemesters,
                semester: resolvedSemesters[0] || null,
                examType,
                year,
                tool,
                lab,
                labsMentioned,
                priceFilter,
                isPolar,
                isComparison,
                asksEducator,
                asksRole,
                asksCourses,
                asksPYQ,
                isAllPYQQuery,
                asksAvailability,
                pronounUsed,
                unresolvedPronoun,
                isFollowUp,
                isTeacherQuery: asksEducator // backwards compatibility
            };
        }

        extractEntities(query) {
            return this.extractQueryFrame(query, this.context);
        }

        // ── Intent Detection ──────────────────────────────────
        detectIntent(query, frame, activeCtx = this.context) {
            const lower = (query || '').toLowerCase().trim();
            const wordCount = lower.split(/\s+/).filter(Boolean).length;

            // 1. Unresolved pronoun needing polite clarification (anti-hallucination!)
            if (frame.unresolvedPronoun && frame.subjects.length === 0) {
                return 'CLARIFY_PRONOUN';
            }

            // 2. Conversational greetings & gratitude/farewells
            if (/^(hi+|hello+|hey+|hola|greetings|good\s+(morning|afternoon|evening)|yo|sup|namaste)\b/i.test(lower) && wordCount <= 4) {
                return 'GREETING';
            }
            if (/^(thanks|thank you|thx|ok thanks|okay thanks|got it|cool|awesome|great|helpful|nice|perfect|bye|goodbye|see you)\b/i.test(lower) && wordCount <= 6) {
                return 'SMALL_TALK';
            }

            // 3. Explicit platform policy / upload / testimonials / stats / mentorship / contact
            if (/^(browse|show|view|list|see|tell me about|who are|meet)?\s*(all\s*)?(educators|teachers|faculty|mentors|instructors|team)\b/i.test(lower) ||
                ['browse all educators', 'all educators', 'educators', 'teachers', 'faculty', 'team'].includes(lower)) {
                return 'TEAM_INFO';
            }

            if (/\b(testimonials?|reviews?|feedback|ratings?|what (do|are) students say|success stories)\b/i.test(lower)) {
                return 'TESTIMONIALS';
            }

            if (!frame.subject && !/\b(pyqs?|papers?|exams?|midsem|endsem|course|syllabus|probability)\b/i.test(lower) &&
                /\b(achievements?|how many (students|learners)|learners?|youtube views?|stats|statistics|milestones)\b/i.test(lower)) {
                return 'STATS_ACHIEVEMENTS';
            }

            if (/\b(refunds?|cancellations?|cancel order|account limit|device limit|multiple devices|blocked account|platform polic(?:y|ies)|privacy policy|terms (?:and|&) conditions|how to sign up|sign up)\b/i.test(lower)) {
                return 'POLICIES_FAQ';
            }

            if (/(?:can\s+i\s+|how\s+to\s+)?\b(contribute|upload|share|submit|send)\b.*?\b(pyqs?|papers?|exams?|questions?)\b/i.test(lower) ||
                lower.includes('share pyq') || lower.includes('share paper') || lower.includes('share exam') || lower.includes('upload pyq')) {
                return 'CONTRIBUTE_PYQ';
            }

            if (/\b(what is (skills seekers|bu resource hub)|about (skills seekers|bu resource hub)|purpose of this website|overview of platform)\b/i.test(lower)) {
                return 'ABOUT_PLATFORM';
            }

            if (/^(help|what can you do|how to use|guide me|features|commands|options)\b/i.test(lower)) {
                return 'HELP';
            }

            if (/\b(contacts?|support|whatsapp|email|reach out|talk to someone|phone number|helpline)\b/i.test(lower)) {
                return 'CONTACT';
            }

            if (/\b(1-1|1\s*to\s*1|one\s*to\s*one|personal mentorship|private class|doubt clearing|placement coaching)\b/i.test(lower) && !frame.isPolar) {
                return 'LIVE_MENTORSHIP';
            }

            // 4. Comparative queries (e.g., "Compare Vansh and Pratham", "Calculus vs Linear Algebra", "DSA Lab vs OS Lab")
            if (frame.isComparison && (frame.educators.length >= 2 || frame.subjects.length >= 2 || frame.labsMentioned.length >= 2 ||
                (frame.subject && this.graph && (this.graph.getSubject(frame.subject)?.courses?.length || 0) >= 2))) {
                return 'COMPARE_ENTITIES';
            }

            // 5. Polar assumption verification & founder/role checks
            //    e.g., "Is Calculus taught by Vansh?", "Did Vansh found Skills Seekers?", "Does she have any courses?", "Is there a course for Java?"
            if (frame.isPolar && (
                (frame.educator && frame.subject) ||
                (frame.educator && frame.asksCourses) ||
                (frame.educator && frame.asksRole) ||
                (frame.subject && frame.asksCourses && !frame.asksPYQ) ||
                (frame.subject && frame.semester) ||
                (frame.educators.length > 0 && /\b(teach|teaches|founder|founded|created|built|anything else)\b/i.test(lower))
            )) {
                return 'VERIFY_RELATIONSHIP';
            }

            // Non-polar explicit wrong-pair course check? e.g. "I want Calculus course by Vansh"
            if (frame.educator && frame.subject && !frame.asksPYQ) {
                const verification = this.graph?.verifyEducatorTeachesSubject(frame.educator, frame.subject);
                if (verification && !verification.teachesViaCourse && !verification.teachesViaBio) {
                    return 'VERIFY_RELATIONSHIP';
                }
            }

            // 6. Founder info (when asking who founded/built/mission, without incorrectly claiming another educator)
            if (/\b(who (built|made|created|founded|started)|who is the founder|about (the )?founder|creator of|story behind|vision|motto|slogan)\b/i.test(lower) ||
                lower.includes('who built this platform') || lower.includes('founder of skills seekers')) {
                return 'FOUNDER_INFO';
            }
            if (frame.educator === 'Pratham Kocher' && !frame.subject && !frame.asksCourses && /\b(who is|tell me about|pratham kocher)\b/i.test(lower)) {
                // Asking who Pratham Kocher is -> show Founder & Core Educator details cleanly in TEAM_INFO or FOUNDER_INFO
                return 'TEAM_INFO';
            }

            // 7. Availability / Gap queries ("Which Sem 5 subjects are coming soon?", "Which subjects don't have courses?")
            if (frame.asksAvailability && !frame.subject) {
                return 'AVAILABILITY_QUERY';
            }

            // 8. Filtered / Multi-condition Course discovery ("courses under 500", "cheapest course", "sem 3 courses under 500", "50% off courses")
            if (frame.priceFilter.maxPrice !== null || frame.priceFilter.minPrice !== null || frame.priceFilter.wantCheapest ||
                frame.priceFilter.minDiscount !== null || (frame.priceFilter.wantFree && !frame.asksPYQ)) {
                return 'FILTERED_COURSES';
            }

            // 9. Virtual Labs & Study Tools
            if (frame.tool || /\b(calculators?|pomodoro|timer|countdown|scratchpad|bookmarks?|study tools|gpa|cgpa|sgpa|how to calculate cgpa)\b/i.test(lower)) {
                return 'FIND_TOOL';
            }

            if (frame.lab || /\b(visual dsa|visual os|virtual labs?|algorithm visualizer|cpu scheduling simulation|paging simulation|gantt chart)\b/i.test(lower)) {
                return 'VIRTUAL_LAB';
            }

            // 10. Explicit Educator / Teacher Queries ("Who teaches Calculus?", "Who is Hrehaan Ahuja?")
            if (frame.asksEducator || (frame.educator && !frame.asksCourses && !frame.asksPYQ && !frame.subject) ||
                /\b(who are the (teachers|educators|faculty|instructors)|team members?|who teaches|faculty members?|mentors?)\b/i.test(lower)) {
                return 'TEAM_INFO';
            }

            // 11. PYQ vs Course Priority
            const hasExplicitPYQWords = /\b(pyqs?|pyps?|previous year|past papers?|question papers?|exam papers?|question banks?|midsem|endsem|end[\s-]?term paper|mid[\s-]?term paper|make[\s-]?up|papers?)\b/i.test(lower) ||
                frame.isAllPYQQuery ||
                Boolean(frame.subject && (frame.examType || frame.year)) ||
                lower.includes('show semester 1 pyqs') || lower.includes('show semester 3 pyqs');

            const hasExplicitCourseWords = /\b(courses?|crash courses?|sprints?|mastercourses?|bundles?|packages?|classes|video lectures|tutorial sheets|price|discount|how much|fee|cost|enroll)\b/i.test(lower) ||
                lower.includes('what courses are available') || lower.includes('browse all crash courses');

            if (hasExplicitCourseWords && !/\b(pyqs?|question papers?|past papers?)\b/i.test(lower)) {
                return 'FIND_COURSE';
            }

            if (hasExplicitPYQWords) {
                return 'FIND_PYQ';
            }

            if (hasExplicitCourseWords || (frame.educator && frame.asksCourses)) {
                return 'FIND_COURSE';
            }

            // 12. Elliptical follow-up inheritance (e.g., "What about Linear Algebra?" after "Who teaches Calculus?")
            if (frame.isFollowUp && activeCtx.turnCount > 0 && activeCtx.lastQuestionFocus) {
                if ((frame.subject || frame.educator || frame.semester) && !frame.asksPYQ && !frame.asksCourses && !frame.asksEducator) {
                    if (activeCtx.lastQuestionFocus === 'WHO_TEACHES') return 'TEAM_INFO';
                    if (activeCtx.lastQuestionFocus === 'PYQS') return 'FIND_PYQ';
                    if (activeCtx.lastQuestionFocus === 'COURSES') return 'FIND_COURSE';
                    if (activeCtx.lastQuestionFocus === 'SUBJECT_INFO' && frame.subject) return 'SPECIFIC_SUBJECT';
                }
                if ((frame.examType || frame.year) && frame.subject) {
                    return 'FIND_PYQ';
                }
            }

            // 13. Semester Overview
            if (frame.semester && (/\b(subjects?|syllabus|what is in|overview|curriculum|what courses)\b/i.test(lower) || /^(what about |and )?(sem(?:ester)?\s*[1-5])\??$/i.test(lower))) {
                return 'SEMESTER_INFO';
            }

            // 14. Specific Subject (including multi-subject mentions without compare keyword)
            if (frame.subject) {
                return 'SPECIFIC_SUBJECT';
            }

            // 15. Navigation
            if (/\b(navigate|where is|how to go to|page|link to|take me to|open|go to)\b/i.test(lower)) {
                return 'NAVIGATION';
            }

            return 'GENERAL_SEARCH';
        }

        // ── Corpus & TF-IDF ──────────────────────────────────
        buildCorpus() {
            this.documents = [];
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

            (this.kb.bundles || []).forEach((b, idx) => {
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

            (this.kb.testimonials || []).forEach((t, idx) => {
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

            (this.kb.courses || []).forEach((c, idx) => {
                const subjAliases = (c.subjects || []).flatMap(s => CANONICAL_SUBJECTS[s] || [s]).join(' ');
                this.documents.push({
                    id: `course_${idx}`,
                    type: 'course',
                    title: c.title,
                    subtitle: `${c.educator} • ${c.discount || 'Special Offer'}`,
                    text: `${c.title} ${c.canonicalSubject || ''} ${subjAliases} ${c.educator} ${c.description} ${c.discount} ${c.price} ${c.fullText || ''}`,
                    url: c.url,
                    data: c
                });
            });

            (this.kb.library || []).forEach((item, idx) => {
                const aliases = (CANONICAL_SUBJECTS[item.subject] || [item.subject]).join(' ');
                const semList = (item.semesters || [item.semester]).map(s => `Semester ${s}`).join(' ');
                this.documents.push({
                    id: `pyq_${idx}`,
                    type: 'pyq',
                    title: item.title || `${item.subject} ${item.type} ${item.year}`,
                    subtitle: `Semester ${item.semester} • ${item.paperTitle || `${item.type} ${item.year}`}`,
                    text: `${semList} ${item.subject} ${item.displaySubject || ''} ${aliases} ${item.type} ${item.paperTitle || ''} ${item.year} previous year question paper pyq download view preview`,
                    url: item.url,
                    data: item
                });
            });

            for (const [semKey, subjects] of Object.entries(this.kb.semesters || {})) {
                const semNum = semKey.replace('sem', '');
                subjects.forEach((s, idx) => {
                    const canon = s.canonicalSubject || s.name;
                    const aliases = (CANONICAL_SUBJECTS[canon] || [s.name]).join(' ');
                    this.documents.push({
                        id: `subject_${semNum}_${idx}`,
                        type: 'subject',
                        title: `${s.name} (Semester ${semNum})`,
                        subtitle: `Semester ${semNum}${s.credits ? ' • ' + s.credits : ''}${s.code ? ' • ' + s.code : ''}`,
                        text: `Semester ${semNum} ${s.name} ${canon} ${aliases} ${s.code || ''} ${s.description || ''} subject notes syllabus question papers pyqs`,
                        url: `/sem${semNum}`,
                        data: { ...s, semester: semNum }
                    });
                });
            }

            (this.kb.tools || []).forEach((t) => {
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

            if (this.kb.labs?.dsa) {
                (this.kb.labs.dsa.algorithms || []).forEach((algo, idx) => {
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
            if (this.kb.labs?.os) {
                (this.kb.labs.os.simulations || []).forEach((sim, idx) => {
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

            (this.kb.team || []).forEach((m, idx) => {
                this.documents.push({
                    id: `team_${idx}`,
                    type: 'team',
                    title: `${m.name} - ${m.role}`,
                    subtitle: 'Skills Seekers Educator',
                    text: `${m.name} ${m.role} ${(m.subjects || []).join(' ')} ${m.bio} teacher instructor faculty`,
                    url: '/courses',
                    data: m
                });
            });

            (this.kb.faq || []).forEach((f, idx) => {
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

            (this.kb.routes || []).forEach((r, idx) => {
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

        computeTFIDF() {
            this.vocab = new Map();
            const N = this.documents.length;
            const docTermFreqs = [];
            const dfCounts = [];

            for (let i = 0; i < N; i++) {
                const tokens = this.tokenize(this.documents[i].text);
                const tf = new Map();
                for (const t of tokens) {
                    if (!this.vocab.has(t)) {
                        this.vocab.set(t, this.vocab.size);
                        dfCounts.push(0);
                    }
                    const termIdx = this.vocab.get(t);
                    tf.set(termIdx, (tf.get(termIdx) || 0) + 1);
                }
                for (const termIdx of tf.keys()) dfCounts[termIdx]++;
                docTermFreqs.push(tf);
            }

            const V = this.vocab.size;
            this.idf = new Float32Array(V);
            for (let t = 0; t < V; t++) {
                this.idf[t] = Math.log((1 + N) / (1 + (dfCounts[t] || 0))) + 1.0;
            }

            this.docVectors = [];
            for (let i = 0; i < N; i++) {
                const vec = new Map();
                let sumSq = 0;
                for (const [termIdx, count] of docTermFreqs[i].entries()) {
                    const weight = (1.0 + Math.log(count)) * this.idf[termIdx];
                    vec.set(termIdx, weight);
                    sumSq += weight * weight;
                }
                const norm = Math.sqrt(sumSq) || 1.0;
                for (const [termIdx, weight] of vec.entries()) vec.set(termIdx, weight / norm);
                this.docVectors.push(vec);
            }
        }

        search(tokens, topK = 6) {
            if (!tokens || tokens.length === 0) return [];
            const queryTF = new Map();
            for (const t of tokens) {
                if (this.vocab.has(t)) {
                    const idx = this.vocab.get(t);
                    queryTF.set(idx, (queryTF.get(idx) || 0) + 1);
                }
            }
            if (queryTF.size === 0) return [];

            const queryVec = new Map();
            let sumSq = 0;
            for (const [termIdx, count] of queryTF.entries()) {
                const weight = (1.0 + Math.log(count)) * this.idf[termIdx];
                queryVec.set(termIdx, weight);
                sumSq += weight * weight;
            }
            const queryNorm = Math.sqrt(sumSq) || 1.0;
            for (const [termIdx, weight] of queryVec.entries()) queryVec.set(termIdx, weight / queryNorm);

            const scores = [];
            for (let i = 0; i < this.documents.length; i++) {
                const docVec = this.docVectors[i];
                let dot = 0;
                for (const [termIdx, qWeight] of queryVec.entries()) {
                    const dWeight = docVec.get(termIdx);
                    if (dWeight) dot += qWeight * dWeight;
                }
                if (dot > 0.05) scores.push({ doc: this.documents[i], score: dot });
            }
            scores.sort((a, b) => b.score - a.score);
            return scores.slice(0, topK);
        }

        // ── Context Updating & Memory ─────────────────────────
        resolveFocus(intent, frame) {
            if (intent === 'TEAM_INFO' && (frame.subject || frame.asksEducator)) return 'WHO_TEACHES';
            if (intent === 'TEAM_INFO' && frame.educator) return 'COURSES';
            if (intent === 'FIND_COURSE' || intent === 'FILTERED_COURSES') return 'COURSES';
            if (intent === 'FIND_PYQ') return 'PYQS';
            if (intent === 'SPECIFIC_SUBJECT') return 'SUBJECT_INFO';
            if (intent === 'SEMESTER_INFO') return 'PYQS';
            if (intent === 'FIND_TOOL') return 'TOOL';
            if (intent === 'VIRTUAL_LAB') return 'LAB';
            return null;
        }

        updateContext(activeCtx, rawQuery, frame, intent, response) {
            if (frame.semester) activeCtx.currentSemester = frame.semester;
            if (frame.subject) {
                activeCtx.currentSubject = frame.subject;
                activeCtx.currentSubjects = frame.subjects;
                const sNode = this.graph?.getSubject(frame.subject);
                if (sNode && sNode.semesters.length === 1 && !frame.semester) {
                    activeCtx.currentSemester = sNode.semesters[0];
                }
            }

            // Record explicitly matched or discovered educators WITHOUT wiping gender memory unnecessarily
            let discoveredEducator = frame.educator || null;
            if (!discoveredEducator && intent === 'FOUNDER_INFO') {
                discoveredEducator = this.kb.platform?.founder || 'Pratham Kocher';
            }
            if (!discoveredEducator && frame.subject && (intent === 'TEAM_INFO' || intent === 'SPECIFIC_SUBJECT' || intent === 'FIND_COURSE')) {
                const sNode = this.graph?.getSubject(frame.subject);
                if (sNode && sNode.namedEducators.length > 0) {
                    discoveredEducator = sNode.namedEducators[0];
                }
            }

            if (discoveredEducator) {
                activeCtx.currentEducator = discoveredEducator;
                const edNode = this.graph?.getEducator(discoveredEducator);
                if (edNode?.gender === 'female') activeCtx.lastFemaleEducator = discoveredEducator;
                if (edNode?.gender === 'male') activeCtx.lastMaleEducator = discoveredEducator;
            } else if (frame.subject && (intent === 'TEAM_INFO' || intent === 'SPECIFIC_SUBJECT')) {
                // Subject has no named educator (e.g. Linear Algebra -> Skills Seekers Faculty)
                // Clear currentEducator so it doesn't pretend Khushi teaches Linear Algebra,
                // while preserving lastFemaleEducator / lastMaleEducator for pronoun ("she"/"he") resolution!
                activeCtx.currentEducator = null;
            }

            if (frame.tool) activeCtx.currentTool = frame.tool;
            if (frame.lab) activeCtx.currentLab = frame.lab;

            const newFocus = this.resolveFocus(intent, frame);
            if (newFocus) activeCtx.lastQuestionFocus = newFocus;
            activeCtx.lastIntent = intent;
            activeCtx.turnCount = (activeCtx.turnCount || 0) + 1;

            if (!Array.isArray(activeCtx.history)) activeCtx.history = [];
            activeCtx.history.push({
                user: rawQuery,
                intent,
                subject: frame.subject || activeCtx.currentSubject,
                educator: discoveredEducator || activeCtx.currentEducator,
                confidence: response?.confidence || 0
            });
            if (activeCtx.history.length > 10) activeCtx.history = activeCtx.history.slice(-10);
        }

        // ── Main Pipeline ─────────────────────────────────────
        processQuery(rawQuery, options = {}) {
            if (!this.isReady) {
                this.initialize();
            }

            const activeCtx = options.context || this.context;
            const query = (rawQuery || '').trim();
            if (!query) {
                return {
                    text: "Hey! How can I help you today? Ask me about PYQs, crash courses, who teaches a subject, study tools, or our Virtual Labs!",
                    speakText: "Hey! How can I help you today? Ask me about previous year questions, courses, educators, or study tools.",
                    links: [],
                    suggestedPrompts: ['Show Semester 1 PYQs', 'Who teaches Calculus?', 'What courses are available?'],
                    confidence: 1.0,
                    intent: 'EMPTY'
                };
            }

            const frame = this.extractQueryFrame(query, activeCtx);
            const intent = this.detectIntent(query, frame, activeCtx);

            const tokens = this.tokenize(query);
            for (const sub of frame.subjects) tokens.push(...this.tokenize(sub));
            for (const ed of frame.educators) tokens.push(...this.tokenize(ed));
            const rawSearchResults = this.search(tokens, 8);

            const isExplicitIntent = ![
                'GENERAL_SEARCH', 'NAVIGATION'
            ].includes(intent);

            const maxRawScore = rawSearchResults.length > 0 ? rawSearchResults[0].score : 0;

            let response;
            if (!isExplicitIntent && !frame.isFollowUp && maxRawScore < 0.14 &&
                !frame.subject && !frame.semester && !frame.educator && !frame.tool && !frame.lab) {
                response = this.generateFallbackResponse(query);
            } else {
                const boostedResults = rawSearchResults.map(res => {
                    let boost = 0;
                    const doc = res.doc;
                    const dLower = doc.text.toLowerCase();
                    if (frame.subject && dLower.includes(frame.subject.toLowerCase())) boost += 0.35;
                    if (frame.semester && dLower.includes(`semester ${frame.semester}`)) boost += 0.25;
                    if (frame.educator && dLower.includes(frame.educator.toLowerCase())) boost += 0.40;
                    if (intent === 'FIND_PYQ' && doc.type === 'pyq') boost += 0.30;
                    if (intent === 'FIND_COURSE' && doc.type === 'course') boost += 0.30;
                    if (intent === 'FIND_TOOL' && doc.type === 'tool') boost += 0.35;
                    if (intent === 'VIRTUAL_LAB' && (doc.type === 'lab_dsa' || doc.type === 'lab_os')) boost += 0.35;
                    if (intent === 'TEAM_INFO' && doc.type === 'team') boost += 0.35;
                    if (intent === 'TESTIMONIALS' && doc.type === 'testimonial') boost += 0.45;
                    if (intent === 'FOUNDER_INFO' && doc.type === 'founder') boost += 0.45;
                    return { doc, score: Math.min(1.0, res.score + boost) };
                });
                boostedResults.sort((a, b) => b.score - a.score);

                response = this.generateResponse(query, intent, frame, boostedResults, activeCtx);
            }

            this.updateContext(activeCtx, query, frame, response.intent, response);
            response.speakText = cleanForSpeech(response.text);
            return response;
        }

        // ── Shared Canonical KB Lookup Helpers ────────────────
        findSubjectEntries(canonicalSubject, semesterFilter = null) {
            const sNode = this.graph?.getSubject(canonicalSubject);
            if (!sNode) return [];
            return semesterFilter
                ? sNode.semesterEntries.filter(e => e.semester === semesterFilter)
                : sNode.semesterEntries;
        }

        findPapers({ subject = null, semester = null, examType = null, year = null } = {}) {
            let papers = this.kb.library || [];

            if (subject) {
                papers = papers.filter(p => {
                    const pCanon = CANONICAL_SUBJECTS[p.subject] ? p.subject : (resolveSubjectName(p.subject) || resolveSubjectName(p.displaySubject));
                    return pCanon === subject;
                });
            }
            if (semester) {
                papers = papers.filter(p =>
                    p.semester === semester || (Array.isArray(p.semesters) && p.semesters.includes(semester))
                );
            }
            if (examType) {
                const target = examType.toLowerCase();
                papers = papers.filter(p => {
                    const pType = (p.type || '').toLowerCase();
                    const pTitle = (p.paperTitle || p.title || '').toLowerCase();
                    if (target === 'make-up') return pType.includes('make') || pTitle.includes('make');
                    if (target === 'endsem') return pType.includes('end') || pTitle.includes('end');
                    return pType.includes(target) || pTitle.includes(target);
                });
            }
            if (year) {
                papers = papers.filter(p => p.year === year || (p.paperTitle && p.paperTitle.includes(year)));
            }
            return papers;
        }

        findCourses(canonicalSubject = null, semesterFilter = null) {
            if (!this.graph) return [];
            let matches = [];
            if (canonicalSubject) {
                const sNode = this.graph.getSubject(canonicalSubject);
                if (sNode) matches = [...sNode.courses];
                if (sNode && sNode.bundles.length > 0) {
                    for (const b of sNode.bundles) {
                        if (!matches.some(m => m.url === b.url)) {
                            matches.push({
                                title: b.title,
                                educator: 'Skills Seekers Faculty',
                                discount: 'Combo Bundle',
                                description: b.description,
                                url: b.url,
                                scope: 'Combo Bundle'
                            });
                        }
                    }
                }
            } else if (semesterFilter) {
                matches = this.graph.filterCourses({ semester: semesterFilter });
            }
            return matches;
        }

        // ── Dispatcher ────────────────────────────────────────
        generateResponse(query, intent, frame, rankedDocs, activeCtx) {
            const topMatch = rankedDocs[0];
            const confidence = topMatch ? topMatch.score : 0;

            switch (intent) {
                case 'CLARIFY_PRONOUN':
                    return this.generateClarifyPronounResponse(frame, activeCtx);
                case 'SMALL_TALK':
                    return this.generateSmallTalkResponse(query, activeCtx);
                case 'GREETING':
                    return this.generateGreetingResponse(activeCtx);
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
                case 'VERIFY_RELATIONSHIP':
                    return this.generateVerifyRelationshipResponse(query, frame, activeCtx);
                case 'COMPARE_ENTITIES':
                    return this.generateComparisonResponse(query, frame);
                case 'AVAILABILITY_QUERY':
                    return this.generateAvailabilityResponse(query, frame);
                case 'FILTERED_COURSES':
                    return this.generateFilteredCoursesResponse(query, frame);
                case 'TEAM_INFO':
                    return this.generateTeamResponse(frame, rankedDocs, query);
                case 'FIND_TOOL':
                    return this.generateToolResponse(frame);
                case 'VIRTUAL_LAB':
                    return this.generateLabResponse(frame);
                case 'FIND_COURSE':
                    return this.generateCourseResponse(frame, rankedDocs);
                case 'FIND_PYQ':
                    return this.generatePYQResponse(frame, rankedDocs, query);
                case 'SEMESTER_INFO':
                    return this.generateSemesterResponse(frame);
                case 'NAVIGATION':
                    return this.generateNavigationResponse(frame, query);
                case 'SPECIFIC_SUBJECT':
                    return this.generateSubjectResponse(frame);
                default:
                    if (confidence >= 0.22) {
                        return this.generateBestMatchResponse(topMatch, rankedDocs);
                    }
                    return this.generateFallbackResponse(query);
            }
        }

        // ── New Intelligent Conversational Generators ─────────

        generateClarifyPronounResponse(frame, activeCtx) {
            const pWord = frame.unresolvedPronoun === 'she' ? '"she" / "her"' : '"he" / "him"';
            let hintLine = '';
            if (frame.unresolvedPronoun === 'she') {
                hintLine = `If you mean **Khushi Goyal**, she's the female educator on our team — teaching **Engineering Calculus** and **Electronics (ECE)** (both ₹549 crash courses in Sem 1).`;
            } else if (activeCtx.currentEducator) {
                hintLine = `We were just looking at **${activeCtx.currentEducator}**, who isn't matched by ${pWord}.`;
            }

            return {
                text: `I want to make sure I get the right person — I'm not sure who ${pWord} refers to yet in this conversation.\n\n` +
                      `${hintLine ? hintLine + '\n\n' : ''}` +
                      `Which educator would you like me to check?`,
                links: frame.unresolvedPronoun === 'she'
                    ? (this.graph.getEducator('Khushi Goyal')?.courses || []).map(c => ({ title: c.title, subtitle: `Khushi Goyal • ${c.price}`, url: c.url, type: 'course' }))
                    : [{ title: "Browse Courses Catalog", subtitle: "All Skills Seekers Educators", url: "/courses", type: "course" }],
                suggestedPrompts: frame.unresolvedPronoun === 'she'
                    ? ["Courses by Khushi Goyal", "Who teaches Calculus?", "Browse all educators"]
                    : ["Courses by Pratham Kocher", "Courses by Vansh Malhotra", "Browse all educators"],
                confidence: 0.72,
                intent: 'CLARIFY_PRONOUN'
            };
        }

        generateSmallTalkResponse(query, activeCtx) {
            const lower = (query || '').toLowerCase();
            const isBye = /\b(bye|goodbye|see you)\b/i.test(lower);
            const topicNote = activeCtx.currentSubject
                ? ` Anytime you want more **${activeCtx.currentSubject}** PYQs, crash courses, or anything else, just drop a message!`
                : ` Let me know whenever you need PYQs, crash course info, or exam tools!`;

            return {
                text: isBye
                    ? `All the best with your exam prep! 👋 Come back whenever you need PYQs, quick revisions, or CGPA tracking.`
                    : `Happy to help! 😊${topicNote}\n\nIs there another subject, semester paper, or educator you'd like to check?`,
                links: [],
                suggestedPrompts: activeCtx.currentSubject
                    ? [`Show ${activeCtx.currentSubject} PYQs`, `Who teaches ${activeCtx.currentSubject}?`, "Browse all educators", "Open Study Tools"]
                    : ["Show Semester 1 PYQs", "Browse all educators", "What courses are available?", "How to calculate CGPA?"],
                confidence: 0.99,
                intent: 'SMALL_TALK'
            };
        }

        generateGreetingResponse(activeCtx) {
            const resumePrompt = activeCtx.currentSubject
                ? `Welcome back! Earlier we looked at **${activeCtx.currentSubject}** — want to pick up there, or check something new?\n\n`
                : `Hey there! 👋 Welcome to **Skills Seekers BU Resource Hub**.\n\n`;

            return {
                text: resumePrompt +
                      `Think of me as your campus study buddy for Bennett University. You can ask me naturally — like:\n` +
                      `• *"Who teaches Operating Systems?"* or *"Does Khushi teach Calculus?"*\n` +
                      `• *"Give me DBMS or DAA PYQs"* or *"Only 2024 Endsem papers"*\n` +
                      `• *"Compare Vansh and Pratham"* or *"Courses under ₹500"*\n` +
                      `• *"How do I calculate BU CGPA?"* or *"Open Visual DSA Lab"*\n\n` +
                      `What are you preparing for today?`,
                links: [
                    { title: "Universal PYQ Library", subtitle: `${(this.kb.library || []).length} Verified Question Papers`, url: "/library", type: "nav" },
                    { title: "Crash Courses Catalog", subtitle: `${(this.kb.courses || []).length} Courses & Bundles`, url: "/courses", type: "course" },
                    { title: "Academic Study Tools", subtitle: "Pomodoro & CGPA Calculator", url: "/tools", type: "tool" }
                ],
                suggestedPrompts: [
                    "Show Semester 1 PYQs",
                    "Who teaches Calculus?",
                    "Courses under ₹500",
                    "How to calculate CGPA?"
                ],
                confidence: 1.0,
                intent: 'GREETING'
            };
        }

        generateVerifyRelationshipResponse(query, frame, activeCtx) {
            const lower = (query || '').toLowerCase();

            // Case A: Founder role assumption ("Did Vansh found Skills Seekers?", "Is Khushi the founder?", "Is Pratham the founder?")
            if (frame.educator && frame.asksRole && !frame.subject && (/\b(founder|founded|built|created|started)\b/i.test(lower) || /\bfound\b.*\b(skills seekers|this|platform|website|hub|it)\b/i.test(lower))) {
                const ed = this.graph.getEducator(frame.educator);
                if (ed?.isFounder) {
                    return {
                        text: `Yes — **${ed.name}** founded Skills Seekers! He serves as **${ed.role}**, teaching **${formatListNatural(ed.taughtSubjects)}** alongside 1-on-1 coding & exam mentorship.`,
                        links: ed.courses.slice(0, 4).map(c => ({ title: c.title, subtitle: `${c.scope} • ${c.price}`, url: c.url, type: 'course' })),
                        suggestedPrompts: [`Courses by ${ed.name}`, "Browse all educators", "1-on-1 Live Mentorship"],
                        confidence: 0.99,
                        intent: 'VERIFY_RELATIONSHIP'
                    };
                }
                return {
                    text: `No, **${frame.educator}** is not the founder — Skills Seekers was founded by **Pratham Kocher**.\n\n` +
                          `**${frame.educator}** is our **${ed?.role || 'Educator'}**${ed?.taughtSubjects?.length ? ` and teaches **${formatListNatural(ed.taughtSubjects)}**` : ''}. Want to see ${frame.educator.split(' ')[0]}'s courses or read about Pratham Kocher?`,
                    links: [
                        ...(ed?.courses || []).slice(0, 2).map(c => ({ title: c.title, subtitle: `${ed.name} • ${c.price}`, url: c.url, type: 'course' })),
                        { title: "Skills Seekers Courses & Team", subtitle: "Founded by Pratham Kocher", url: "/courses", type: "course" }
                    ],
                    suggestedPrompts: [`Courses by ${frame.educator}`, "Who built this platform?", "Browse all educators"],
                    confidence: 0.98,
                    intent: 'VERIFY_RELATIONSHIP'
                };
            }

            // Case B: Educator <-> Subject assumption ("Is Calculus taught by Vansh?", "Does Pratham teach Python?", "Does Khushi teach Linear Algebra?")
            if (frame.educator && frame.subject) {
                const check = this.graph.verifyEducatorTeachesSubject(frame.educator, frame.subject);
                const ed = check.educator;
                const subj = check.subject;
                const firstName = ed.name.split(' ')[0];

                if (check.teachesViaCourse) {
                    const otherNote = check.actualOtherEducators.length > 0
                        ? ` (${formatListNatural(check.actualOtherEducators)} also offer${check.actualOtherEducators.length === 1 ? 's' : ''} a course for **${subj.name}**!)`
                        : '';
                    const links = check.matchingCourses.map(c => ({
                        title: c.title,
                        subtitle: `${c.educator} • ${c.discount || c.scope}${c.price ? ' • ' + c.price : ''}`,
                        url: c.url,
                        type: 'course'
                    }));
                    subj.papers.slice(0, 2).forEach(p => {
                        links.push({ title: p.title, subtitle: `Sem ${p.semester} • ${p.paperTitle} • Drive PDF`, url: p.url, type: 'pyq' });
                    });

                    return {
                        text: `Yes! **${ed.name}** teaches **${subj.name}**${subj.semesters.length ? ` (Semester ${subj.semesters.join('/')})` : ''}${otherNote}.\n\n` +
                              `Here's ${firstName}'s course${check.matchingCourses.length > 1 ? 's' : ''}: ${check.matchingCourses.map(c => `**${c.title}** (${c.price || c.discount})`).join(' and ')}.` +
                              `${subj.papers.length > 0 ? `\n\nWe also have **${subj.papers.length} verified ${subj.name} PYQs** ready if you want past papers next.` : ''}`,
                        links,
                        suggestedPrompts: [
                            `Show ${subj.name} PYQs`,
                            `More courses by ${ed.name}`,
                            "Browse all educators"
                        ],
                        confidence: 0.99,
                        intent: 'VERIFY_RELATIONSHIP'
                    };
                }

                // Special nuanced case: mentioned in team bio/profile (e.g. OOP (Java) for Pratham Kocher) without standalone course card
                if (check.teachesViaBio) {
                    const links = subj.papers.slice(0, 3).map(p => ({
                        title: p.title,
                        subtitle: `Sem ${p.semester} • ${p.paperTitle} • Drive PDF`,
                        url: p.url,
                        type: 'pyq'
                    }));
                    const liveLinks = ed.courses.filter(c => c.isMentorship).slice(0, 1).map(c => ({
                        title: c.title,
                        subtitle: `${ed.name} • 1-on-1 Coaching`,
                        url: c.url,
                        type: 'course'
                    }));

                    return {
                        text: `**${ed.name}** lists **${subj.name}** among his profile specialties and offers **1-to-1 Live Coding Mentorship** (covering Java/Python/DSA), though there isn't a standalone **${subj.name}** video crash course card in the catalog right now.\n\n` +
                              `${subj.papers.length > 0 ? `On the PYQ side, we do have **${subj.papers.length} verified ${subj.name} question papers** below!` : ''}`,
                        links: [...links, ...liveLinks],
                        suggestedPrompts: [
                            `Show ${subj.name} PYQs`,
                            `Courses by ${ed.name}`,
                            "Tell me about 1-on-1 mentorship"
                        ],
                        confidence: 0.96,
                        intent: 'VERIFY_RELATIONSHIP'
                    };
                }

                // FALSE ASSUMPTION — Politely & clearly correct it!
                let correction = `No, **${subj.name}** is not taught by **${ed.name}**.`;
                const links = [];

                if (check.actualEducators.length > 0) {
                    const actualNames = formatListNatural(check.actualEducators);
                    correction = `No — **${subj.name}** is taught by **${actualNames}**, not **${ed.name}**.`;
                    check.actualCourses.slice(0, 2).forEach(c => {
                        links.push({
                            title: c.title,
                            subtitle: `${c.educator} • ${c.discount || c.scope}${c.price ? ' • ' + c.price : ''}`,
                            url: c.url,
                            type: 'course'
                        });
                    });
                } else if (check.hasFacultyOnlyCourse) {
                    correction = `I don't see **${ed.name}** listed for **${subj.name}** — that course is listed under **Skills Seekers Faculty** without a specific individual instructor named in the catalog.`;
                    check.actualCourses.slice(0, 2).forEach(c => {
                        links.push({
                            title: c.title,
                            subtitle: `${c.educator} • ${c.discount || 'Course'}`,
                            url: c.url,
                            type: 'course'
                        });
                    });
                } else {
                    correction = `No — **${ed.name}** doesn't teach **${subj.name}**, and in fact there isn't a dedicated crash course listed for ${subj.name} right now.`;
                }

                // Helpful extra check: e.g. Data Analysis (Python) vs Python (CT) clarification
                let ambiguityTip = '';
                if (subj.name === 'Computational Thinking' && ed.name === 'Pranay Wadhwa') {
                    ambiguityTip = `\n\n*(Quick note: **Pranay Wadhwa** does teach **Data Analysis Using Python** in Semester 3, while Sem 1 **Computational Thinking & Python** is taught by **Pratham Kocher** and **Hrehaan Ahuja**!)*`;
                }

                const edTaughtLine = ed.taughtSubjects.length > 0
                    ? `\n\nFor reference, **${ed.name}** teaches **${formatListNatural(ed.taughtSubjects)}**.`
                    : '';

                subj.papers.slice(0, 2).forEach(p => {
                    links.push({ title: p.title, subtitle: `Sem ${p.semester} • ${p.paperTitle} • Drive PDF`, url: p.url, type: 'pyq' });
                });

                const followUpQ = ed.taughtSubjects.length > 0
                    ? `Would you like **${subj.name}** PYQs, or want to browse ${firstName}'s courses instead?`
                    : `Would you like me to pull up the **${subj.name}** PYQs?`;

                return {
                    text: `${correction}${ambiguityTip}${edTaughtLine}\n\n${followUpQ}`,
                    links: links.slice(0, 5),
                    suggestedPrompts: [
                        `Show ${subj.name} PYQs`,
                        `Courses by ${ed.name}`,
                        check.actualEducators[0] ? `Courses by ${check.actualEducators[0]}` : "What courses are available?",
                        "Browse all educators"
                    ],
                    confidence: 0.99,
                    intent: 'VERIFY_RELATIONSHIP'
                };
            }

            // Case C: "Does she/he/<educator> have any courses?"
            if (frame.educator && frame.asksCourses) {
                const ed = this.graph.getEducator(frame.educator);
                const courses = ed?.courses || [];
                if (courses.length === 0) {
                    return {
                        text: `I don't see any active course cards listed under **${frame.educator}** right now in the catalog. Let me know if you'd like to check another educator!`,
                        links: [{ title: "Browse All Courses", subtitle: "Skills Seekers Catalog", url: "/courses", type: "course" }],
                        suggestedPrompts: ["Browse all educators", "What courses are available?"],
                        confidence: 0.90,
                        intent: 'VERIFY_RELATIONSHIP'
                    };
                }

                const bullets = courses.map(c =>
                    `• **${c.title}** — ${c.price || 'Check Store'}${c.discount ? ` (${c.discount})` : ''}`
                ).join('\n');

                const links = courses.slice(0, 5).map(c => ({
                    title: c.title,
                    subtitle: `${c.scope}${c.price ? ' • ' + c.price : ''}${c.discount ? ' • ' + c.discount : ''}`,
                    url: c.url,
                    type: 'course'
                }));

                const firstName = ed.name.split(' ')[0];
                const subjPreview = formatListNatural(ed.taughtSubjects.slice(0, 3));

                return {
                    text: `Yes! **${ed.name}** (${ed.role}) teaches **${courses.length} course${courses.length > 1 ? 's' : ''}** on Skills Seekers${subjPreview ? ` covering **${subjPreview}**` : ''}:\n\n` +
                          `${bullets}\n\n` +
                          `Want me to grab PYQs for any of ${firstName}'s subjects?`,
                    links,
                    suggestedPrompts: [
                        ...(ed.taughtSubjects.slice(0, 2).map(s => `Show ${s} PYQs`)),
                        "Compare educators",
                        "Browse all courses"
                    ],
                    confidence: 0.99,
                    intent: 'VERIFY_RELATIONSHIP'
                };
            }

            // Case D: "Is there a course for <subject>?" ("Is there a course for OOP Java?" / "Does DBMS have a course?")
            if (frame.subject && frame.asksCourses) {
                const sNode = this.graph.getSubject(frame.subject);
                if (sNode && sNode.courses.length > 0) {
                    const edLine = sNode.namedEducators.length > 0
                        ? `taught by **${formatListNatural(sNode.namedEducators)}**`
                        : `listed under **Skills Seekers Faculty**`;
                    return {
                        text: `Yes — **${sNode.name}** has **${sNode.courses.length} course${sNode.courses.length > 1 ? 's' : ''}** available (${edLine}):\n\n` +
                              sNode.courses.map(c => `• **${c.title}** (${c.price || c.discount})`).join('\n') +
                              `\n\nWant the **${sNode.name} PYQs** too?`,
                        links: sNode.courses.slice(0, 4).map(c => ({
                            title: c.title,
                            subtitle: `${c.educator} • ${c.price || c.discount}`,
                            url: c.url,
                            type: 'course'
                        })),
                        suggestedPrompts: [`Show ${sNode.name} PYQs`, `Who teaches ${sNode.name}?`, "Browse all courses"],
                        confidence: 0.98,
                        intent: 'VERIFY_RELATIONSHIP'
                    };
                }

                // No standalone course exists — explain honestly what DOES exist!
                const bioNote = sNode?.teamSpecialists?.length
                    ? ` **${formatListNatural(sNode.teamSpecialists)}** does list **${sNode.name}** as a specialty (and offers **1-on-1 mentorship**), even though there's no standalone video crash course card for it yet.`
                    : ` Currently, no crash course is listed for this subject in the catalog.`;
                const pyqNote = sNode?.papers?.length > 0
                    ? `\n\nHowever, we do have **${sNode.papers.length} verified PYQ paper${sNode.papers.length > 1 ? 's' : ''}** for **${sNode.name}** below!`
                    : `\n\nIts PYQs are also currently marked **Coming Soon**.`;

                const links = (sNode?.papers || []).slice(0, 3).map(p => ({
                    title: p.title,
                    subtitle: `Sem ${p.semester} • ${p.paperTitle} • Drive PDF`,
                    url: p.url,
                    type: 'pyq'
                }));
                if (sNode?.semesters[0]) {
                    links.push({ title: `Semester 0${sNode.semesters[0]} Hub`, subtitle: "Syllabus & Resources", url: `/sem${sNode.semesters[0]}`, type: "nav" });
                }

                return {
                    text: `No, there isn't a standalone video crash course card for **${frame.subject}** in our catalog right now.${bioNote}${pyqNote}`,
                    links,
                    suggestedPrompts: [
                        ...(sNode?.papers?.length > 0 ? [`Show ${frame.subject} PYQs`] : []),
                        "1-on-1 Live Mentorship",
                        "Browse all courses"
                    ],
                    confidence: 0.96,
                    intent: 'VERIFY_RELATIONSHIP'
                };
            }

            // Case E: Subject <-> Semester check ("Is Digital Design in Sem 2?" / "Is DBMS in Sem 1?")
            if (frame.subject && frame.semester) {
                const sNode = this.graph.getSubject(frame.subject);
                const actualSems = sNode?.semesters || [];
                const inAskedSem = actualSems.includes(frame.semester);

                if (inAskedSem) {
                    const crossNote = actualSems.length > 1
                        ? ` (it's cross-listed across Semesters ${actualSems.join(' & ')})`
                        : '';
                    return {
                        text: `Yes! **${frame.subject}** is covered under **Semester ${frame.semester}**${crossNote}. We have **${sNode.papers.length} verified PYQs**${sNode.namedEducators.length ? ` and a course taught by **${formatListNatural(sNode.namedEducators)}**` : ''}.\n\nWant me to show the papers or course details?`,
                        links: [
                            ...sNode.papers.slice(0, 3).map(p => ({ title: p.title, subtitle: `Sem ${p.semester} • ${p.paperTitle} • Drive PDF`, url: p.url, type: 'pyq' })),
                            { title: `Semester 0${frame.semester} Page`, subtitle: "View semester syllabus", url: `/sem${frame.semester}`, type: "nav" }
                        ],
                        suggestedPrompts: [`Show ${frame.subject} PYQs`, `Who teaches ${frame.subject}?`, `Semester ${frame.semester} subjects`],
                        confidence: 0.98,
                        intent: 'VERIFY_RELATIONSHIP'
                    };
                }

                return {
                    text: `No — on BU Resource Hub, **${frame.subject}** isn't listed in Semester ${frame.semester}; it belongs to **Semester ${actualSems.join(' / ')}**.\n\nWould you like me to pull up the **${frame.subject}** PYQs or show what's in **Semester ${frame.semester}** instead?`,
                    links: [
                        ...(actualSems[0] ? [{ title: `Semester 0${actualSems[0]} Hub`, subtitle: `${frame.subject} is here`, url: `/sem${actualSems[0]}`, type: "nav" }] : []),
                        { title: `Semester 0${frame.semester} Hub`, subtitle: "Browse your asked semester", url: `/sem${frame.semester}`, type: "nav" }
                    ],
                    suggestedPrompts: [`Show ${frame.subject} PYQs`, `Semester ${frame.semester} subjects`, "All subject PYQs list"],
                    confidence: 0.97,
                    intent: 'VERIFY_RELATIONSHIP'
                };
            }

            // Fallback within verify -> delegate neatly
            if (frame.educator) return this.generateTeamResponse(frame, [], query);
            if (frame.subject) return this.generateSubjectResponse(frame);
            return this.generateFallbackResponse(query);
        }

        generateComparisonResponse(query, frame) {
            // 1. Compare two educators ("Compare Pratham and Vansh", "Vansh vs Hrehaan")
            if (frame.educators.length >= 2) {
                const ed1 = this.graph.getEducator(frame.educators[0]);
                const ed2 = this.graph.getEducator(frame.educators[1]);
                const overlap = ed1.taughtSubjects.filter(s => ed2.taughtSubjects.includes(s));

                const links = [
                    ...(ed1.courses.slice(0, 2).map(c => ({ title: c.title, subtitle: `${ed1.name} • ${c.price || c.scope}`, url: c.url, type: 'course' }))),
                    ...(ed2.courses.slice(0, 2).map(c => ({ title: c.title, subtitle: `${ed2.name} • ${c.price || c.scope}`, url: c.url, type: 'course' })))
                ];

                return {
                    text: `Here's how **${ed1.name}** and **${ed2.name}** compare at Skills Seekers:\n\n` +
                          `• **${ed1.name}** (*${ed1.role}*): Teaches **${ed1.courses.length} courses** across **${formatListNatural(ed1.taughtSubjects) || '1-on-1 mentorship'}**${ed1.semesters.length ? ` (Semesters ${ed1.semesters.join(', ')})` : ''}.\n` +
                          `• **${ed2.name}** (*${ed2.role}*): Teaches **${ed2.courses.length} courses** across **${formatListNatural(ed2.taughtSubjects)}**${ed2.semesters.length ? ` (Semesters ${ed2.semesters.join(', ')})` : ''}.\n\n` +
                          `${overlap.length > 0 ? `**Where they team up:** Both co-teach **${formatListNatural(overlap)}**!` : `**Distinct focus:** They specialize in different subjects so you rarely have to choose between them.`}\n\n` +
                          `Want to dive deeper into either educator's courses?`,
                    links,
                    suggestedPrompts: [`Courses by ${ed1.name}`, `Courses by ${ed2.name}`, "Browse all educators"],
                    confidence: 0.98,
                    intent: 'COMPARE_ENTITIES'
                };
            }

            // 2. Compare two Virtual Labs ("DSA lab vs OS lab") - check BEFORE subjects since dsa/os also match subjects!
            if (frame.labsMentioned.length >= 2 || ((query.toLowerCase().includes('dsa') && query.toLowerCase().includes('os')) && /\blabs?\b/i.test(query))) {
                return {
                    text: `Great comparison — both interactive labs run right in your browser with step-by-step playback:\n\n` +
                          `• **Visual DSA Lab (/dsa):** Built for algorithm mastery with **20+ visualizers** — Sorting (Quick, Merge, Radix), Graph Algorithms (Dijkstra, Prim, Kruskal, Ford-Fulkerson), DP (Knapsack, LCS, MCM), and Greedy problems.\n` +
                          `• **Visual OS Lab (/os):** Built for systems internals — **CPU Scheduling** with live Gantt charts (FCFS, SJF, SRTF, Round Robin, Priority, HRRN), **Paging & TLB**, **Page Replacement**, **Banker's Deadlock**, and **Disk Scheduling**.\n\n` +
                          `Which lab do you want to jump into?`,
                    links: [
                        { title: "Launch Visual DSA Lab", subtitle: "20+ Algorithms", url: "/dsa", type: "tool" },
                        { title: "Launch Visual OS Lab", subtitle: "Scheduling & Memory Sims", url: "/os", type: "tool" }
                    ],
                    suggestedPrompts: ["Open Visual DSA Lab", "Open Visual OS Lab", "DAA PYQs", "Operating Systems PYQs"],
                    confidence: 0.98,
                    intent: 'COMPARE_ENTITIES'
                };
            }

            // 3. Compare two subjects ("Calculus vs Linear Algebra", "DBMS vs OS")
            if (frame.subjects.length >= 2) {
                const s1 = this.graph.getSubject(frame.subjects[0]);
                const s2 = this.graph.getSubject(frame.subjects[1]);
                const ed1 = s1.namedEducators.length ? formatListNatural(s1.namedEducators) : (s1.facultyCourses.length ? 'Skills Seekers Faculty' : 'No dedicated course');
                const ed2 = s2.namedEducators.length ? formatListNatural(s2.namedEducators) : (s2.facultyCourses.length ? 'Skills Seekers Faculty' : 'No dedicated course');

                const links = [];
                if (s1.courses[0]) links.push({ title: s1.courses[0].title, subtitle: `${s1.name} • ${s1.courses[0].educator}`, url: s1.courses[0].url, type: 'course' });
                if (s2.courses[0]) links.push({ title: s2.courses[0].title, subtitle: `${s2.name} • ${s2.courses[0].educator}`, url: s2.courses[0].url, type: 'course' });
                if (s1.semesters[0]) links.push({ title: `Semester 0${s1.semesters[0]} Hub`, subtitle: `${s1.name} (${s1.papers.length} PYQs)`, url: `/sem${s1.semesters[0]}`, type: 'nav' });
                if (s2.semesters[0] && s2.semesters[0] !== s1.semesters[0]) links.push({ title: `Semester 0${s2.semesters[0]} Hub`, subtitle: `${s2.name} (${s2.papers.length} PYQs)`, url: `/sem${s2.semesters[0]}`, type: 'nav' });

                return {
                    text: `Here's a quick side-by-side of **${s1.name}** vs **${s2.name}** on BU Resource Hub:\n\n` +
                          `• **${s1.name}:** Semester ${s1.semesters.join('/')} (${s1.credits || 'Core'}) • **${s1.papers.length} verified PYQs** • Instructor: **${ed1}**\n` +
                          `• **${s2.name}:** Semester ${s2.semesters.join('/')} (${s2.credits || 'Core'}) • **${s2.papers.length} verified PYQs** • Instructor: **${ed2}**\n\n` +
                          `Which one are you studying right now — I can pull up its PYQs for you!`,
                    links,
                    suggestedPrompts: [`Show ${s1.name} PYQs`, `Show ${s2.name} PYQs`, `Who teaches ${s1.name}?`],
                    confidence: 0.98,
                    intent: 'COMPARE_ENTITIES'
                };
            }

            // 4. Compare multiple course options within ONE subject (e.g. "Compare Python courses", "Compare AI ML courses", "Midsem vs Endsem DBMS course")
            if (frame.subject) {
                const sNode = this.graph.getSubject(frame.subject);
                const courses = sNode?.courses || [];
                if (courses.length >= 2) {
                    const bullets = courses.map(c =>
                        `• **${c.title}** — **${c.educator}** • ${c.scope} • **${c.price || 'Check Store'}**${c.discount ? ` (${c.discount})` : ''}`
                    ).join('\n');
                    return {
                        text: `There are **${courses.length} course options** available for **${sNode.name}**:\n\n` +
                              `${bullets}\n\n` +
                              `Look at the exam scope (**Mid-Sem** vs **End-Sem** vs **Full Sprint**) and pricing above to match what your upcoming exam needs. Want the PYQs for **${sNode.name}** too?`,
                        links: courses.map(c => ({ title: c.title, subtitle: `${c.educator} • ${c.price || c.scope}`, url: c.url, type: 'course' })),
                        suggestedPrompts: [`Show ${sNode.name} PYQs`, "Courses under ₹500", "Browse all courses"],
                        confidence: 0.97,
                        intent: 'COMPARE_ENTITIES'
                    };
                }
            }

            return this.generateFallbackResponse(query);
        }

        generateAvailabilityResponse(query, frame) {
            const lower = (query || '').toLowerCase();
            const sem = frame.semester;

            // 1. Subjects with Coming Soon PYQs
            if (lower.includes('coming soon') || lower.includes('no pyq') || lower.includes('without pyq') || lower.includes('missing pyq')) {
                const comingSoon = [];
                for (const sNode of this.graph.subjects.values()) {
                    if (sem && !sNode.semesters.includes(sem)) continue;
                    if (sNode.papers.length === 0) {
                        comingSoon.push(`${sNode.name} (Sem ${sNode.semesters.join('/')})`);
                    }
                }
                const semLabel = sem ? ` in Semester ${sem}` : '';
                return {
                    text: comingSoon.length > 0
                        ? `Right now${semLabel}, these subjects don't have verified PDFs uploaded yet and are marked **Coming Soon**:\n\n` +
                          comingSoon.map(x => `• **${x}**`).join('\n') +
                          `\n\nAll other subjects across Semesters 1–5 have **${(this.kb.library || []).length} verified PYQs** ready! Have any of these papers to share?`
                        : `Every listed subject${semLabel} already has verified PYQs available!`,
                    links: [
                        { title: "Universal PYQ Library", subtitle: `${(this.kb.library || []).length} Verified Papers`, url: "/library", type: "nav" },
                        { title: "Share a Missing Paper", subtitle: "WhatsApp +91 9588598168", url: this.kb.platform.whatsapp, type: "external" }
                    ],
                    suggestedPrompts: ["All subject PYQs list", "How to contribute PYQs?", "Show Semester 5 PYQs"],
                    confidence: 0.96,
                    intent: 'AVAILABILITY_QUERY'
                };
            }

            // 2. Subjects without dedicated courses in catalog
            const noCourseSubs = [];
            for (const sNode of this.graph.subjects.values()) {
                if (sem && !sNode.semesters.includes(sem)) continue;
                if (sNode.courses.length === 0) {
                    noCourseSubs.push({ name: sNode.name, sem: sNode.semesters.join('/'), papers: sNode.papers.length });
                }
            }

            return {
                text: `Out of our **27 subjects**, these **${noCourseSubs.length}** currently don't have a standalone crash course card in the catalog${sem ? ` for Semester ${sem}` : ''}:\n\n` +
                      noCourseSubs.map(x => `• **${x.name}** (Sem ${x.sem}) — ${x.papers > 0 ? `${x.papers} PYQ${x.papers > 1 ? 's' : ''} available` : 'PYQs Coming Soon'}`).join('\n') +
                      `\n\n*(Note: **OOP (Java)** is covered via Pratham Kocher's **1-on-1 Live Mentorship** even without a standalone video sprint.)*\n\nNeed PYQs for any of these?`,
                links: [
                    { title: "Universal PYQ Library", subtitle: "Free PYQs for available subjects", url: "/library", type: "nav" },
                    { title: "1-on-1 Live Coaching", subtitle: "Pratham Kocher", url: "/courses", type: "course" }
                ],
                suggestedPrompts: ["OOP Java PYQs", "NLP PYQs", "What courses are available?"],
                confidence: 0.95,
                intent: 'AVAILABILITY_QUERY'
            };
        }

        generateFilteredCoursesResponse(query, frame) {
            const pf = frame.priceFilter;

            if (pf.wantFree) {
                return {
                    text: `Great news on free resources: all **${(this.kb.library || []).length} verified PYQs**, all **5 Academic Study Tools**, and both **Visual DSA & Visual OS Labs** on BU Resource Hub are **100% free**!\n\n` +
                          `Plus, Skills Seekers hosts **free educational lectures** (180,000+ views) on YouTube. Paid crash courses & sprints in the catalog currently start from **₹299**.`,
                    links: [
                        { title: "Universal PYQ Library", subtitle: `All ${(this.kb.library || []).length} PYQs • Free`, url: "/library", type: "nav" },
                        { title: "Skills Seekers YouTube", subtitle: "Free Lectures • 180K+ Views", url: this.kb.platform.youtube, type: "external" },
                        { title: "Cheapest Paid Sprints", subtitle: "Starting at ₹299", url: "/courses", type: "course" }
                    ],
                    suggestedPrompts: ["Cheapest crash courses", "Show Semester 1 PYQs", "Visual DSA Lab"],
                    confidence: 0.97,
                    intent: 'FILTERED_COURSES'
                };
            }

            const matched = this.graph.filterCourses({
                maxPrice: pf.maxPrice,
                minPrice: pf.minPrice,
                cheapest: pf.wantCheapest,
                minDiscount: pf.minDiscount,
                semester: frame.semester,
                subject: frame.subject,
                educator: frame.educator,
                excludeBundles: false
            });

            if (matched.length === 0) {
                const desc = [
                    frame.educator ? `by ${frame.educator}` : null,
                    frame.semester ? `for Semester ${frame.semester}` : null,
                    pf.maxPrice ? `under ₹${pf.maxPrice}` : null
                ].filter(Boolean).join(' ');

                return {
                    text: `I checked our catalog, and there aren't any courses ${desc || 'matching all those exact filters'} right now — individual crash courses start at **₹299** (Mid-Sem sprints for IMS and TOC) and most End-Term Express courses are **₹399–₹549**.\n\nWant me to show the closest options without that price cap?`,
                    links: [{ title: "Browse Full Course Catalog", subtitle: `${this.kb.courses.length} Courses & Bundles`, url: "/courses", type: "course" }],
                    suggestedPrompts: ["Cheapest crash courses", "Courses under ₹500", "What courses are available?"],
                    confidence: 0.92,
                    intent: 'FILTERED_COURSES'
                };
            }

            const criteriaParts = [];
            if (pf.wantCheapest) criteriaParts.push('most affordable');
            if (pf.maxPrice !== null) criteriaParts.push(`under ₹${pf.maxPrice}`);
            if (pf.minDiscount !== null) criteriaParts.push(`${pf.minDiscount}%+ discount`);
            if (frame.semester) criteriaParts.push(`Semester ${frame.semester}`);
            if (frame.educator) criteriaParts.push(`by ${frame.educator}`);
            if (frame.subject) criteriaParts.push(`for ${frame.subject}`);

            const bullets = matched.slice(0, 6).map(c =>
                `• **${c.title}** — **${c.price || 'Store'}**${c.discount ? ` (${c.discount})` : ''} • *${c.educator}*`
            ).join('\n');

            return {
                text: `Found **${matched.length} course${matched.length > 1 ? 's' : ''}** matching **${criteriaParts.join(', ')}**:\n\n` +
                      `${bullets}\n\n` +
                      `Click any card below to inspect syllabus coverage or enroll!`,
                links: matched.slice(0, 5).map(c => ({
                    title: c.title,
                    subtitle: `${c.educator} • ${c.price || 'Check Store'}${c.discount ? ' • ' + c.discount : ''}`,
                    url: c.url,
                    type: 'course'
                })),
                suggestedPrompts: [
                    "Show all courses in catalog",
                    "Browse all educators",
                    frame.semester ? `Semester ${frame.semester} PYQs` : "Show Semester 3 PYQs"
                ],
                confidence: 0.98,
                intent: 'FILTERED_COURSES'
            };
        }

        // ── Core Domain Generators (Upgraded & Conversational) ─

        generateFounderResponse() {
            const p = this.kb.platform;
            const pratham = this.graph.getEducator('Pratham Kocher');
            return {
                text: `**${p.founder}** founded Skills Seekers! He leads as **Founder & Core Educator**, creating the platform to help engineering students prepare faster and score higher in semester exams.\n\n` +
                      `In his own words: *"${p.founderMessage}"*\n\n` +
                      `Along with running Skills Seekers (**"${p.motto}"**), Pratham directly teaches **${formatListNatural(pratham?.taughtSubjects || [])}** and offers **1-on-1 Live Mentorship** — reaching over **25,000+ learners** and **180,000+ YouTube views**.`,
                links: [
                    { title: "Pratham Kocher Courses", subtitle: "Python, Digital Design, DBMS, Networks, TOC", url: "/courses", type: "course" },
                    { title: "1-on-1 Mentorship", subtitle: "Personalized Coaching", url: "/courses", type: "course" },
                    { title: "Official Website", subtitle: "skillsseekers.com", url: p.website, type: "external" }
                ],
                suggestedPrompts: [
                    "Courses by Pratham Kocher",
                    "Browse all educators",
                    "What do students say? (Reviews)",
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
                      `Over **25,000+ engineering students** have prepped with Skills Seekers mastercourses — here's what students say:\n\n` +
                      `${list}\n\n` +
                      `Want to see the courses they used?`,
                links: [
                    { title: "Explore Best-Seller Courses", subtitle: "Join 25K+ learners", url: "/courses", type: "course" },
                    { title: "Universal PYQ Library", subtitle: "Free Exam Papers", url: "/library", type: "nav" }
                ],
                suggestedPrompts: [
                    "Browse all educators",
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
            const pyqCount = (this.kb.library || []).length;
            const courseCount = (this.kb.courses || []).length;
            return {
                text: `🏆 **Skills Seekers Achievements & Milestones:**\n\n` +
                      `So far, Skills Seekers has reached **25,000+ Happy Learners** across engineering colleges and **180,000+ YouTube Views** on free tutorials.\n\n` +
                      `On the resource side right now:\n` +
                      `• 📚 **${courseCount} Crash Courses & Bundles** taught by 7 specialist educators\n` +
                      `• 📄 **${pyqCount} Verified Question Papers** across Semesters 1 to 5\n\n` +
                      `*"${p.motto}"*`,
                links: [
                    { title: "Skills Seekers YouTube Channel", subtitle: "180K+ Views", url: p.youtube, type: "external" },
                    { title: "Course Store", subtitle: "skillsseekers.com/s/store", url: p.store, type: "external" }
                ],
                suggestedPrompts: ["Who built this platform?", "Browse all educators", "View course catalog"],
                confidence: 0.98,
                intent: 'STATS_ACHIEVEMENTS'
            };
        }

        generatePoliciesResponse(query) {
            const lower = query.toLowerCase();
            let directLead = "Here are the key Skills Seekers platform policies to keep in mind:\n\n";

            if (lower.includes('device') || lower.includes('limit') || lower.includes('account') || lower.includes('multiple')) {
                directLead = "📱 **No — each account is limited to 1 device only** (the purchasing device). The device cannot be changed later, and sharing or concurrent logins from another device trigger an automatic block.\n\n";
            } else if (lower.includes('cancel') || lower.includes('refund')) {
                directLead = "💳 **No — orders cannot be cancelled or refunded once purchased.** Please check course details and previews carefully before enrolling.\n\n";
            }

            return {
                text: `${directLead}` +
                      `📋 **Quick Policy Summary:**\n` +
                      `• **Device Limit:** 1 account = 1 device only\n` +
                      `• **Cancellations & Refunds:** Not permitted after purchase\n` +
                      `• **Signing Up:** Use email or Google Sign-Up via 'Sign Up'\n` +
                      `• **Support:** Email **skillsseekers16@gmail.com** or WhatsApp **+91 9588598168**`,
                links: [
                    { title: "Student Support Email", subtitle: "skillsseekers16@gmail.com", url: "mailto:skillsseekers16@gmail.com", type: "external" },
                    { title: "Chat on WhatsApp", subtitle: "+91 9588598168", url: this.kb.platform.whatsapp, type: "external" },
                    { title: "Official Website", subtitle: "skillsseekers.com", url: this.kb.platform.website, type: "external" }
                ],
                suggestedPrompts: ["How to contact support?", "What courses are available?", "1-on-1 Personal Coaching"],
                confidence: 0.95,
                intent: 'POLICIES_FAQ'
            };
        }

        generateAboutResponse() {
            const p = this.kb.platform;
            return {
                text: `**${p.hubName}** is our dedicated academic portal for **Bennett University** students, powered by **${p.name}** (founded by **Pratham Kocher**).\n\n` +
                      `Everything you need for exam prep lives in one spot: **${(this.kb.library || []).length} verified PYQs** across Semesters 1–5, **${(this.kb.courses || []).length} high-yield crash courses & bundles** taught by top educators, interactive **Visual DSA & OS Labs**, and **5 built-in study tools**.\n\n` +
                      `Backed by **25,000+ learners** and **180,000+ YouTube views** (*"${p.motto}"*). Where would you like to start?`,
                links: [
                    { title: "Universal PYQ Library", subtitle: `Browse ${(this.kb.library || []).length} Verified Papers`, url: "/library", type: "nav" },
                    { title: "Course Catalog", subtitle: `${(this.kb.courses || []).length} Crash Courses`, url: "/courses", type: "course" },
                    { title: "Academic Study Tools", subtitle: "CGPA, Pomodoro, Notes", url: "/tools", type: "tool" }
                ],
                suggestedPrompts: ["Browse all educators", "What crash courses are available?", "Show Semester 1 PYQs", "How to calculate CGPA?"],
                confidence: 0.98,
                intent: 'ABOUT_PLATFORM'
            };
        }

        generateHelpResponse() {
            return {
                text: "You can talk to me like a human study buddy — no rigid commands needed! Here's what I can help you with:\n\n" +
                      "• **Subject & PYQ Lookup:** *\"DBMS PYQ\"*, *\"OOP Java 2022 Endsem\"*, *\"MLOps papers\"*\n" +
                      "• **Educators & Fact-Checking:** *\"Who teaches Calculus?\"*, *\"Is OS taught by Pratham?\"*, *\"Does she have other courses?\"*\n" +
                      "• **Smart Filtering & Comparisons:** *\"Courses under ₹500\"*, *\"Compare Vansh and Pratham\"*\n" +
                      "• **Tools & Interactive Labs:** *\"Calculate BU CGPA\"*, *\"Open Visual DSA Lab\"*, *\"Pomodoro Timer\"*\n\n" +
                      "Go ahead and ask me anything about Bennett University semesters, PYQs, or Skills Seekers!",
                links: [
                    { title: "Universal PYQ Library", subtitle: `${(this.kb.library || []).length} Verified Papers`, url: "/library", type: "nav" },
                    { title: "Course Catalog", subtitle: `${(this.kb.courses || []).length} Crash Courses & Bundles`, url: "/courses", type: "course" },
                    { title: "Visual DSA Lab", subtitle: "20+ Algorithm Visualizers", url: "/dsa", type: "tool" }
                ],
                suggestedPrompts: ["Who teaches Calculus?", "Browse all educators", "Courses under ₹500", "Semester 1 subjects"],
                confidence: 0.98,
                intent: 'HELP'
            };
        }

        generateContributeResponse() {
            const p = this.kb.platform;
            return {
                text: "📄 **Yes, anyone can share Question Papers (PYQs)!**\n\n" +
                      "Helping peers out takes less than a minute: scan or click clear photos of your Midsem or Endsem paper, mention the **Semester, Subject, Exam Type & Year**, and send it over via **WhatsApp** (`" + p.whatsappNumber + "`) or email **`" + p.backupEmail + "`**.\n\n" +
                      "We'll verify it and add it straight into the Universal PYQ Library!",
                links: [
                    { title: "Share via WhatsApp", subtitle: p.whatsappNumber, url: p.whatsapp, type: "external" },
                    { title: "Universal PYQ Library", subtitle: `See ${(this.kb.library || []).length} verified papers`, url: "/library", type: "nav" },
                    { title: "Home Dashboard", subtitle: "Quick PYQ Share Helper", url: "/home", type: "nav" }
                ],
                suggestedPrompts: ["Which PYQs are Coming Soon?", "View existing PYQ papers", "Contact Skills Seekers team"],
                confidence: 0.98,
                intent: 'CONTRIBUTE_PYQ'
            };
        }

        generateContactResponse() {
            const p = this.kb.platform;
            return {
                text: "Here's the fastest way to reach the **Skills Seekers** team:\n\n" +
                      `• 💬 **WhatsApp (Fastest):** [${p.whatsappNumber}](${p.whatsapp}) — course help & PYQ submissions\n` +
                      `• ✉️ **Course Support Email:** [${p.email}](mailto:${p.email})\n` +
                      `• ✉️ **Academic Hub / PYQ Email:** [${p.backupEmail}](mailto:${p.backupEmail})\n` +
                      `• 🌐 **Official Site:** [skillsseekers.com](${p.website})`,
                links: [
                    { title: "Chat on WhatsApp", subtitle: p.whatsappNumber, url: p.whatsapp, type: "external" },
                    { title: "Official Website", subtitle: "skillsseekers.com", url: p.website, type: "external" },
                    { title: "Skills Seekers Store", subtitle: "skillsseekers.com/s/store", url: p.store, type: "external" }
                ],
                suggestedPrompts: ["What crash courses are available?", "Tell me about 1-on-1 mentorship", "Who built this platform?"],
                confidence: 0.98,
                intent: 'CONTACT'
            };
        }

        generateMentorshipResponse() {
            const liveCourses = this.graph.courses.filter(c => c.isMentorship);
            const links = liveCourses.map(c => ({
                title: c.title,
                subtitle: `${c.educator} • ${c.price || ''} ${c.discount || ''}`.trim(),
                url: c.url,
                type: 'course'
            }));

            return {
                text: "Skills Seekers offers dedicated **1-to-1 Live Classes & Personal Mentorship** led directly by founder **Pratham Kocher**.\n\n" +
                      "It covers tailored doubt clearing, hands-on coding (Java, Python, DSA), semester exam strategy, and placement preparation scheduled around your timeline.",
                links: links.length > 0 ? links : [{ title: "Explore Store Mentorship", subtitle: "Skills Seekers Store", url: this.kb.platform.store, type: "course" }],
                suggestedPrompts: ["Courses by Pratham Kocher", "Browse all educators", "What do students say? (Reviews)"],
                confidence: 0.98,
                intent: 'LIVE_MENTORSHIP'
            };
        }

        generateTeamResponse(frame, rankedDocs, query) {
            // Case 1: "Who teaches <subject>?" (or elliptical "What about Linear Algebra?")
            if (frame.subject && !frame.educator) {
                const sNode = this.graph.getSubject(frame.subject);
                const courses = sNode?.courses || [];
                const namedEds = sNode?.namedEducators || [];
                const bioSpecialists = sNode?.teamSpecialists || [];

                // Subcase 1A: One or more named individual educators teach courses for this subject
                if (namedEds.length > 0) {
                    const namesStr = formatListNatural(namedEds);
                    const courseDesc = courses
                        .filter(c => c.namedInstructors.length > 0)
                        .slice(0, 3)
                        .map(c => `**${c.title}** (${c.price || c.scope}, ${c.educator})`)
                        .join(' and ');

                    const links = courses.slice(0, 4).map(c => ({
                        title: c.title,
                        subtitle: `${c.educator} • ${c.discount || c.scope}${c.price ? ' • ' + c.price : ''}`,
                        url: c.url,
                        type: 'course'
                    }));
                    sNode.papers.slice(0, 2).forEach(p => {
                        links.push({ title: p.title, subtitle: `Sem ${p.semester} • ${p.paperTitle} • Drive PDF`, url: p.url, type: 'pyq' });
                    });

                    const singleEd = namedEds.length === 1 ? this.graph.getEducator(namedEds[0]) : null;
                    const intro = namedEds.length > 1
                        ? `**${sNode.name}** is taught by **${namesStr}** on Skills Seekers (we actually have ${courses.length > 1 ? 'multiple options' : 'co-taught coverage'} for it)!`
                        : `**${sNode.name}** is taught by **${namesStr}**${singleEd ? ` (*${singleEd.role}*)` : ''} at Skills Seekers.`;

                    const pyqQuestion = sNode.papers.length > 0
                        ? `\n\nWe also have **${sNode.papers.length} verified ${sNode.name} PYQs** — want those, or want to see ${namedEds.length === 1 ? `${namedEds[0].split(' ')[0]}'s` : 'their'} other courses?`
                        : '';

                    return {
                        text: `👨‍🏫 ${intro}\n\n` +
                              `Course${courses.length > 1 ? 's' : ''}: ${courseDesc}.${pyqQuestion}`,
                        links,
                        suggestedPrompts: [
                            `Show ${sNode.name} PYQs`,
                            `More courses by ${namedEds[0]}`,
                            ...(namedEds[1] ? [`Compare ${namedEds[0]} and ${namedEds[1]}`] : []),
                            "Browse all educators"
                        ],
                        confidence: 0.99,
                        intent: 'TEAM_INFO'
                    };
                }

                // Subcase 1B: Course exists, but ONLY listed under generic "Skills Seekers Faculty" (e.g. Linear Algebra & ODE, Discrete Mathematics)
                if (sNode && sNode.facultyCourses.length > 0) {
                    const links = sNode.facultyCourses.slice(0, 2).map(c => ({
                        title: c.title,
                        subtitle: `${c.educator} • ${c.discount || 'Course'}`,
                        url: c.url,
                        type: 'course'
                    }));
                    sNode.papers.slice(0, 3).forEach(p => {
                        links.push({ title: p.title, subtitle: `Sem ${p.semester} • ${p.paperTitle} • Drive PDF`, url: p.url, type: 'pyq' });
                    });

                    return {
                        text: `For **${sNode.name}** (Semester ${sNode.semesters.join('/')}), the Skills Seekers course (**${sNode.facultyCourses[0].title}**) is listed under **Skills Seekers Faculty** — the catalog doesn't name an individual instructor for it yet.\n\n` +
                              `${sNode.papers.length > 0 ? `I do have **${sNode.papers.length} verified ${sNode.name} PYQs** linked below — want me to pull up more details on those papers or check the combo bundle?` : ''}`,
                        links,
                        suggestedPrompts: [
                            `Show ${sNode.name} PYQs`,
                            `Semester ${sNode.semesters[0] || 2} subjects`,
                            "Browse all educators"
                        ],
                        confidence: 0.95,
                        intent: 'TEAM_INFO'
                    };
                }

                // Subcase 1C: No course card, but listed in an educator's team profile/specialties (e.g., OOP (Java) -> Pratham Kocher bio)
                if (bioSpecialists.length > 0) {
                    const specStr = formatListNatural(bioSpecialists);
                    return {
                        text: `There isn't a standalone video crash course for **${sNode.name}** in the catalog yet, though **${specStr}** lists it among his core specialties and teaches it via **1-on-1 Live Coding Mentorship**.\n\n` +
                              `${sNode.papers.length > 0 ? `On the bright side, we have **${sNode.papers.length} verified ${sNode.name} PYQs** ready below!` : ''}`,
                        links: sNode.papers.slice(0, 3).map(p => ({ title: p.title, subtitle: `Sem ${p.semester} • ${p.paperTitle} • Drive PDF`, url: p.url, type: 'pyq' })),
                        suggestedPrompts: [`Show ${sNode.name} PYQs`, `Courses by ${bioSpecialists[0]}`, "1-on-1 Live Mentorship"],
                        confidence: 0.94,
                        intent: 'TEAM_INFO'
                    };
                }

                // Subcase 1D: Subject with no assigned instructor in KB (e.g., Environment, NLP, MLOps, Agile, SPM, IVP)
                return {
                    text: `We don't have an instructor or crash course listed for **${frame.subject}** right now on Skills Seekers${sNode?.papers?.length ? ` — though we do have **${sNode.papers.length} verified ${frame.subject} PYQ${sNode.papers.length > 1 ? 's' : ''}** ready to study from!` : ' (both its course and PYQs are not available yet).'}` +
                          `\n\nWould you like me to check another subject or show all Skills Seekers educators?`,
                    links: (sNode?.papers || []).slice(0, 3).map(p => ({ title: p.title, subtitle: `Sem ${p.semester} • ${p.paperTitle} • Drive PDF`, url: p.url, type: 'pyq' })),
                    suggestedPrompts: ["Browse all educators", `Show ${frame.subject} PYQs`, "Which subjects have courses?"],
                    confidence: 0.93,
                    intent: 'TEAM_INFO'
                };
            }

            // Case 2: Specific educator queried ("Tell me about Vansh Malhotra", "Who is Hrehaan Ahuja?")
            if (frame.educator) {
                const ed = this.graph.getEducator(frame.educator);
                const courses = ed?.courses || [];
                const links = courses.slice(0, 4).map(c => ({
                    title: c.title,
                    subtitle: `${c.discount || c.scope}${c.price ? ' • ' + c.price : ''}`,
                    url: c.url,
                    type: 'course'
                }));

                const taughtStr = ed?.taughtSubjects?.length
                    ? formatListNatural(ed.taughtSubjects)
                    : (ed?.bioSubjects?.length ? formatListNatural(ed.bioSubjects) : 'Skills Seekers subjects');

                const courseBullets = courses.map(c =>
                    `• **${c.title}** — ${c.price || 'Check Store'}${c.discount ? ` (${c.discount})` : ''}`
                ).join('\n');

                return {
                    text: `👨‍🏫 **${ed.name}** is a **${ed.role}** at Skills Seekers${ed.isFounder ? ' (and the platform founder!)' : ''}.\n\n` +
                          `${ed.bio ? ed.bio + '\n\n' : ''}` +
                          `He/she teaches **${courses.length} course${courses.length > 1 ? 's' : ''}** covering **${taughtStr}**:\n`.replace('He/she', ed.gender === 'female' ? 'She' : 'He') +
                          `${courseBullets}\n\n` +
                          `Want PYQs for any of ${ed.name.split(' ')[0]}'s subjects, or want to compare pricing?`,
                    links,
                    suggestedPrompts: [
                        ...(ed.taughtSubjects.slice(0, 2).map(s => `Show ${s} PYQs`)),
                        "Browse all educators",
                        "Courses under ₹500"
                    ],
                    confidence: 0.98,
                    intent: 'TEAM_INFO'
                };
            }

            // Case 3: Browse all educators
            const teamMembers = (this.kb.team || []).map(m => {
                const ed = this.graph.getEducator(m.name);
                const list = (ed?.taughtSubjects?.length ? ed.taughtSubjects : m.subjects).slice(0, 4).join(', ');
                return `• **${m.name}** (*${m.role}*): ${list}`;
            }).join('\n');

            const topEducatorCourses = [
                { title: "Pratham Kocher - Python, DBMS, DD, CN & TOC", subtitle: "Founder & Core Educator", url: "/courses", type: "course" },
                { title: "Vansh Malhotra - OS, SML, Prob & Stats, MPCA", subtitle: "Lead Educator & Mentor", url: "/courses", type: "course" },
                { title: "Hrehaan Ahuja - DAA & Python End Term", subtitle: "Core Algorithms Educator", url: "/courses", type: "course" },
                { title: "Khushi Goyal - Engineering Calculus & ECE", subtitle: "End Term Express Sprints", url: "/courses", type: "course" }
            ];

            return {
                text: "🎓 Here is the **Skills Seekers Educator Team** (**7 specialists** teaching across Bennett University semesters):\n\n" +
                      teamMembers + "\n\n" +
                      "Ask me about any educator (like *\"What does Khushi teach?\"* or *\"Compare Vansh and Pratham\"*) or click a card below!",
                links: topEducatorCourses,
                suggestedPrompts: [
                    "Courses by Pratham Kocher",
                    "Courses by Vansh Malhotra",
                    "Who teaches Calculus?",
                    "Compare Vansh and Pratham"
                ],
                confidence: 1.0,
                intent: 'TEAM_INFO'
            };
        }

        generateToolResponse(frame) {
            if (frame.tool) {
                const toolObj = (this.kb.tools || []).find(t => t.id === frame.tool);
                if (toolObj) {
                    const features = (toolObj.features || []).map(f => `• ${f}`).join('\n');
                    return {
                        text: `🛠️ You can use our built-in **${toolObj.name}** directly on the Study Tools page — ${toolObj.description}\n\n` +
                              `**What it includes:**\n${features}\n\n` +
                              `Click below to launch it, or ask if you also want the Pomodoro timer or exam countdown!`,
                        links: [
                            { title: toolObj.name, subtitle: "Open Tool", url: toolObj.url, type: "tool" },
                            { title: "All 5 Study Tools", subtitle: "Pomodoro, CGPA, Countdown, Notes", url: "/tools", type: "nav" }
                        ],
                        suggestedPrompts: ["How does the CGPA calculator work?", "Tell me about Pomodoro Timer", "Exam countdown timer", "Saved Bookmarks tool"],
                        confidence: 0.98,
                        intent: 'FIND_TOOL'
                    };
                }
            }

            return {
                text: "🛠️ BU Resource Hub includes **5 built-in study tools** right in your browser:\n\n" +
                      "• ⏱️ **Pomodoro Focus Timer:** 25-min study / 5-min break intervals with alerts and streak counter\n" +
                      "• 📊 **SGPA & CGPA Calculator:** Exact BU 10-point scale (O=10, A+=9, A=8, B+=7, B=6, C=5, P=4, F=0)\n" +
                      "• ⏳ **Exam Target Countdown:** Live timer until midsem & endsem dates\n" +
                      "• 📝 **Study Scratchpad:** Auto-saving formula & quick notes pad\n" +
                      "• 🔖 **Saved Bookmarks:** Quick access panel for frequent subjects and PYQs\n\n" +
                      "Which one would you like to open?",
                links: [
                    { title: "Open Study Tools", subtitle: "Access all 5 tools", url: "/tools", type: "tool" },
                    { title: "SGPA / CGPA Calculator", subtitle: "BU 10-point scale", url: "/tools#cgpa", type: "tool" },
                    { title: "Pomodoro Focus Timer", subtitle: "Productivity timer", url: "/tools#pomodoro", type: "tool" }
                ],
                suggestedPrompts: ["How to calculate BU CGPA?", "Pomodoro timer features", "Exam countdown", "Show Semester 3 PYQs"],
                confidence: 0.98,
                intent: 'FIND_TOOL'
            };
        }

        generateLabResponse(frame) {
            if (frame.lab === 'dsa') {
                const algos = (this.kb.labs?.dsa?.algorithms || []).slice(0, 5);
                return {
                    text: "💻 Our **Visual DSA Lab** (`/dsa`) gives you **20+ interactive algorithm visualizers** with step-by-step playback and time/space complexity meters.\n\n" +
                          "It covers **Sorting** (Merge, Quick, Radix, Bucket), **Binary Search**, **Greedy** (Knapsack, Huffman, Activity Selection), **Dynamic Programming** (0/1 Knapsack, LCS, MCM, Floyd-Warshall), and **Graph Algorithms** (Dijkstra, Prim, Kruskal, Ford-Fulkerson).\n\n" +
                          "Want to jump into a visualizer below or pull up **DAA PYQs** alongside it?",
                    links: algos.map(a => ({ title: a.name, subtitle: `${a.category} • ${a.time}`, url: a.url, type: 'tool' })),
                    suggestedPrompts: ["Compare DSA Lab and OS Lab", "Show DAA PYQs", "Who teaches DAA?"],
                    confidence: 0.98,
                    intent: 'VIRTUAL_LAB'
                };
            }

            if (frame.lab === 'os') {
                const sims = (this.kb.labs?.os?.simulations || []).slice(0, 5);
                return {
                    text: "🖥️ Our **Visual OS Lab** (`/os`) lets you interactively simulate core OS mechanics with live Gantt charts and memory tables.\n\n" +
                          "Test **CPU Scheduling** (FCFS, SJF, SRTF, Round Robin, Priority, HRRN), **Process Lifecycle**, **Paging + TLB Translation**, **Page Replacement** (FIFO, LRU, Optimal), **Banker's Safety**, **Dining Philosophers**, and **Disk Scheduling**.\n\n" +
                          "Pick a simulation below, or ask me for **Operating Systems PYQs**!",
                    links: sims.map(s => ({ title: s.name, subtitle: `${s.category} Simulation`, url: s.url, type: 'tool' })),
                    suggestedPrompts: ["Compare DSA Lab and OS Lab", "Operating Systems PYQs", "Who teaches Operating Systems?"],
                    confidence: 0.98,
                    intent: 'VIRTUAL_LAB'
                };
            }

            return {
                text: "🧪 BU Resource Hub has **2 interactive browser labs** — zero setup needed:\n\n" +
                      "1. 💻 **Visual DSA Lab (`/dsa`):** 20+ step-by-step Sorting, Graph, Greedy & DP visualizers.\n" +
                      "2. 🖥️ **Visual OS Lab (`/os`):** Interactive CPU Scheduling Gantt charts, Paging, Page Replacement & Banker's Algorithm.\n\n" +
                      "Which lab would you like to explore?",
                links: [
                    { title: "Visual DSA Lab", subtitle: "20+ Algorithm Visualizers", url: "/dsa", type: "tool" },
                    { title: "Visual OS Lab", subtitle: "Scheduling & Memory Simulations", url: "/os", type: "tool" }
                ],
                suggestedPrompts: ["Explore Visual DSA Lab", "Explore Visual OS Lab", "Compare DSA Lab and OS Lab", "DAA crash course"],
                confidence: 0.98,
                intent: 'VIRTUAL_LAB'
            };
        }

        generateCourseResponse(frame, rankedDocs) {
            let matchedCourses = [];

            if (frame.subject) {
                matchedCourses = this.findCourses(frame.subject);
            } else if (frame.educator) {
                matchedCourses = this.graph.filterCourses({ educator: frame.educator });
            } else if (frame.semester) {
                matchedCourses = this.findCourses(null, frame.semester);
            }

            if (matchedCourses.length === 0) {
                matchedCourses = rankedDocs.filter(r => r.doc.type === 'course').map(r => r.doc.data);
            }
            if (matchedCourses.length === 0) {
                matchedCourses = (this.kb.courses || []).slice(0, 5);
            }

            // Honest notice if user asked for a course on a subject that currently has none (e.g. OOP Java, NLP, MLOps)
            if (frame.subject && this.findCourses(frame.subject).length === 0) {
                const sNode = this.graph.getSubject(frame.subject);
                const specialistNote = sNode?.teamSpecialists?.length
                    ? ` **${formatListNatural(sNode.teamSpecialists)}** covers **${frame.subject}** in his profile specialties and **1-on-1 Live Mentorship**, though there's no standalone crash course card yet.`
                    : '';
                return {
                    text: `We don't currently have a dedicated crash course card for **${frame.subject}** in the catalog.${specialistNote}` +
                          `${sNode?.papers?.length ? `\n\nWe do have **${sNode.papers.length} verified ${frame.subject} PYQ${sNode.papers.length > 1 ? 's' : ''}** free to view — would you like those instead?` : ''}`,
                    links: [
                        ...(sNode?.papers?.slice(0, 3).map(p => ({ title: p.title, subtitle: `Sem ${p.semester} • ${p.paperTitle} • Drive PDF`, url: p.url, type: 'pyq' })) || []),
                        { title: "Browse All Courses", subtitle: `${(this.kb.courses || []).length} Courses in Catalog`, url: "/courses", type: "course" }
                    ],
                    suggestedPrompts: [`Show ${frame.subject} PYQs`, "1-on-1 Live Mentorship", "Browse all courses"],
                    confidence: 0.94,
                    intent: 'FIND_COURSE'
                };
            }

            const links = matchedCourses.slice(0, 5).map(c => ({
                title: c.title,
                subtitle: `${c.educator} • ${c.discount || 'Special Offer'}${c.price ? ' • ' + c.price : ''}`,
                url: c.url,
                type: 'course'
            }));

            if (this.kb.bundles && this.kb.bundles.length > 0 && links.length < 5 && !frame.subject && !frame.educator) {
                links.push({
                    title: this.kb.bundles[0].title,
                    subtitle: "All-in-One Semester Bundle",
                    url: this.kb.bundles[0].url,
                    type: 'course'
                });
            }

            const subjectMention = frame.subject
                ? `for **${frame.subject}**`
                : frame.educator
                    ? `by **${frame.educator}**`
                    : frame.semester
                        ? `for **Semester ${frame.semester}**`
                        : '';

            const courseSummaryLines = matchedCourses.slice(0, 3).map(c =>
                `• **${c.title}** (*${c.educator}*${c.price ? ` • **${c.price}**` : ''}${c.discount ? ` • ${c.discount}` : ''})`
            ).join('\n');

            const isPlural = matchedCourses.length > 1;
            const followUpLine = frame.subject
                ? `Want me to also pull up the **${frame.subject} PYQs** or check who teaches it?`
                : `Looking for a specific semester or want courses under **₹500**?`;

            return {
                text: `🎓 Here ${isPlural ? `are **${matchedCourses.length}** Skills Seekers courses` : 'is the Skills Seekers Mastercourse'} ${subjectMention || 'catalog overview'} (high-yield video sprints + solved tutorial sheets):\n\n` +
                      `${courseSummaryLines}\n\n` +
                      `${followUpLine}`,
                links,
                suggestedPrompts: [
                    frame.subject ? `Show ${frame.subject} PYQs` : "Courses under ₹500",
                    frame.subject ? `Who teaches ${frame.subject}?` : "Courses by Pratham Kocher",
                    "Courses by Vansh Malhotra",
                    "Browse all courses in catalog"
                ],
                confidence: 0.98,
                intent: 'FIND_COURSE'
            };
        }

        generatePYQResponse(frame, rankedDocs, query) {
            const totalLibCount = (this.kb.library || []).length;

            // Case 1: Full PYQ Directory overview
            if (frame.isAllPYQQuery && !frame.subject && !frame.semester) {
                const semLines = [];
                for (let s = 1; s <= 5; s++) {
                    const subs = this.kb.semesters?.[`sem${s}`] || [];
                    const subSummary = subs.map(sub => {
                        const cnt = (sub.papers || []).length;
                        return cnt > 0 ? `${sub.name} (${cnt})` : `${sub.name} (Coming Soon)`;
                    }).join(', ');
                    semLines.push(`• **Semester ${s}:** ${subSummary}`);
                }

                return {
                    text: `📚 Here's the complete breakdown of all **${totalLibCount} Verified PYQs** across Semesters 1–5:\n\n` +
                          semLines.join('\n') + `\n\n` +
                          `Just tell me which subject you're preparing for (like *"DBMS PYQ"* or *"DAA Endsem 2022"*) and I'll pull the direct Drive PDFs!`,
                    links: [
                        { title: "Universal PYQ Library", subtitle: `Browse all ${totalLibCount} verified PDFs`, url: "/library", type: "nav" },
                        { title: "Semester 1 Papers", subtitle: "Calculus, ECE, Physics, Python, DD", url: "/sem1", type: "nav" },
                        { title: "Semester 3 Papers", subtitle: "DSA, SML, DBMS, Prob & Stat, MPCA", url: "/sem3", type: "nav" },
                        { title: "Semester 4 Papers", subtitle: "DAA, OS, Networks, AI & ML", url: "/sem4", type: "nav" }
                    ],
                    suggestedPrompts: ["DBMS PYQ", "DAA PYQ", "Operating Systems PYQ", "Show Semester 5 PYQs"],
                    confidence: 0.98,
                    intent: 'FIND_PYQ'
                };
            }

            // Case 2: Subject or Semester or Year/Exam lookup
            let matchedPapers = [];
            let note = '';

            if (frame.subject) {
                matchedPapers = this.findPapers({
                    subject: frame.subject,
                    semester: frame.semester,
                    examType: frame.examType,
                    year: frame.year
                });

                if (matchedPapers.length === 0 && (frame.semester || frame.examType || frame.year)) {
                    const allForSubject = this.findPapers({ subject: frame.subject });
                    if (allForSubject.length > 0) {
                        matchedPapers = allForSubject;
                        const filtersAsked = [
                            frame.semester ? `Semester ${frame.semester}` : null,
                            frame.examType || null,
                            frame.year || null
                        ].filter(Boolean).join(' ');
                        note = `*(I don't see a **${filtersAsked}** PDF uploaded yet for ${frame.subject}, so here are all **${allForSubject.length}** verified papers we have instead!)*\n\n`;
                    }
                }
            } else if (frame.semester) {
                matchedPapers = this.findPapers({
                    semester: frame.semester,
                    examType: frame.examType,
                    year: frame.year
                });
                if (matchedPapers.length === 0 && (frame.examType || frame.year)) {
                    matchedPapers = this.findPapers({ semester: frame.semester });
                    const filtersAsked = [frame.examType, frame.year].filter(Boolean).join(' ');
                    if (matchedPapers.length > 0) {
                        note = `*(No exact **${filtersAsked}** tag matched in Semester ${frame.semester} — showing all Semester ${frame.semester} PYQs instead.)*\n\n`;
                    }
                }
            } else {
                if (frame.examType || frame.year) {
                    matchedPapers = this.findPapers({ examType: frame.examType, year: frame.year });
                }
                if (matchedPapers.length === 0) {
                    matchedPapers = rankedDocs.filter(r => r.doc.type === 'pyq').map(r => r.doc.data);
                }
            }

            const seenUrls = new Set();
            matchedPapers = matchedPapers.filter(p => {
                if (!p.url || seenUrls.has(p.url)) return false;
                seenUrls.add(p.url);
                return true;
            });

            const sNode = frame.subject ? this.graph.getSubject(frame.subject) : null;
            const subjectEntries = frame.subject ? this.findSubjectEntries(frame.subject, frame.semester) : [];
            const fallbackEntries = (frame.subject && subjectEntries.length === 0) ? this.findSubjectEntries(frame.subject) : [];
            const activeSubjectInfo = subjectEntries[0] || fallbackEntries[0] || null;
            const relatedCourses = frame.subject ? this.findCourses(frame.subject) : [];

            // Case 3: Coming Soon subject (0 uploaded PDFs)
            if (matchedPapers.length === 0 && frame.subject && activeSubjectInfo) {
                const links = [];
                if (relatedCourses.length > 0) {
                    links.push({ title: relatedCourses[0].title, subtitle: `${relatedCourses[0].educator} • Crash Course`, url: relatedCourses[0].url, type: 'course' });
                }
                links.push({ title: `Semester ${activeSubjectInfo.semester} Hub`, subtitle: `${activeSubjectInfo.name} Syllabus & Status`, url: `/sem${activeSubjectInfo.semester}`, type: 'nav' });
                links.push({ title: `Share ${frame.subject} PYQ on WhatsApp`, subtitle: "Help fellow students (+91 9588598168)", url: this.kb.platform.whatsapp, type: 'external' });

                return {
                    text: `Not yet — **${activeSubjectInfo.name}** (Semester ${activeSubjectInfo.semester}${activeSubjectInfo.credits ? ' • ' + activeSubjectInfo.credits : ''}) is currently marked **Coming Soon**, so no verified PYQ PDFs have been uploaded for it yet.\n\n` +
                          `${activeSubjectInfo.description ? `**Topics in this course:** ${activeSubjectInfo.description}\n\n` : ''}` +
                          `If you happen to have a Midsem or Endsem copy, you can send it on WhatsApp (+91 9588598168) to help peers! Want to check another Sem ${activeSubjectInfo.semester} subject?`,
                    links,
                    suggestedPrompts: [`Semester ${activeSubjectInfo.semester} subjects`, "All subject PYQs list", "How to upload a question paper?", "Universal PYQ Library"],
                    confidence: 0.96,
                    intent: 'FIND_PYQ'
                };
            }

            if (matchedPapers.length === 0) {
                const semText = frame.semester ? ` for Semester ${frame.semester}` : '';
                return {
                    text: `I couldn't find exact individual PDFs${semText} matching that query, though all **${totalLibCount}** verified question papers across Semesters 1–5 live inside the **Universal PYQ Library** with subject & semester filters:`,
                    links: [
                        { title: "Universal PYQ Library", subtitle: `Browse ${totalLibCount} Verified Papers`, url: "/library", type: "nav" },
                        { title: frame.semester ? `Semester ${frame.semester} Page` : "Home Dashboard", subtitle: "Subject Papers", url: frame.semester ? `/sem${frame.semester}` : "/home", type: "nav" }
                    ],
                    suggestedPrompts: ["All subject PYQs list", "DBMS PYQ", "Show Semester 1 PYQs", "How to upload a question paper?"],
                    confidence: 0.75,
                    intent: 'FIND_PYQ'
                };
            }

            const displayPapers = matchedPapers.slice(0, 8);
            const paperBullets = displayPapers.map(p =>
                `• **${p.paperTitle || `${p.type} ${p.year}`}** (Sem ${p.semester}${p.year ? ` • ${p.year}` : ''})`
            ).join('\n');

            const links = displayPapers.map(p => ({
                title: p.title || `${p.subject} — ${p.paperTitle || `${p.type} ${p.year}`}`,
                subtitle: `Sem ${p.semester} • ${p.paperTitle || `${p.type} ${p.year}`} • Drive PDF`,
                url: p.url,
                type: 'pyq'
            }));

            if (frame.subject && relatedCourses.length > 0 && links.length < 10) {
                links.push({
                    title: relatedCourses[0].title,
                    subtitle: `Crash Course • ${relatedCourses[0].educator}`,
                    url: relatedCourses[0].url,
                    type: 'course'
                });
            }
            const primarySem = frame.semester || activeSubjectInfo?.semester || matchedPapers[0]?.semester;
            if (primarySem && links.length < 10) {
                links.push({
                    title: `Semester 0${primarySem} Page`,
                    subtitle: "View syllabus & all subject PYQs",
                    url: `/sem${primarySem}`,
                    type: 'nav'
                });
            }

            const isYesNoAsk = frame.isPolar;
            const leadPrefix = isYesNoAsk ? 'Yes! ' : '';
            const semBadge = activeSubjectInfo ? ` (Semester ${activeSubjectInfo.semester}${activeSubjectInfo.credits ? ' • ' + activeSubjectInfo.credits : ''})` : '';
            const targetDesc = frame.subject
                ? `for **${frame.subject}**${semBadge}`
                : frame.semester
                    ? `for **Semester ${frame.semester}**`
                    : (frame.examType || frame.year ? `matching **${[frame.examType, frame.year].filter(Boolean).join(' ')}**` : '');

            const courseNudge = frame.subject && sNode?.namedEducators?.length > 0
                ? `\n\nNeed help solving these? **${formatListNatural(sNode.namedEducators)}** teaches the crash course for **${frame.subject}** — just ask if you want course pricing!`
                : `\n\nClick any card below to preview or download the PDF:`;

            return {
                text: `📄 ${leadPrefix}Here ${matchedPapers.length === 1 ? 'is the **1 verified paper**' : `are **${matchedPapers.length} verified PYQs**`} ${targetDesc}:\n\n` +
                      note +
                      `${activeSubjectInfo?.description ? `*Topics: ${activeSubjectInfo.description}*\n\n` : ''}` +
                      paperBullets +
                      courseNudge,
                links,
                suggestedPrompts: [
                    frame.subject ? `Who teaches ${frame.subject}?` : "All subject PYQs list",
                    frame.subject ? `Crash course for ${frame.subject}` : "Browse crash courses",
                    "View all papers in PYQ Library",
                    "How to share question papers?"
                ],
                confidence: 0.99,
                intent: 'FIND_PYQ'
            };
        }

        generateSemesterResponse(frame) {
            const sem = frame.semester || 1;
            const semNode = this.graph.getSemester(sem);
            const subjects = semNode?.subjects || [];
            const availableCount = subjects.filter(s => (s.papers || []).length > 0).length;

            const subjectList = subjects.map(s => {
                const paperCount = (s.papers || []).length;
                const statusStr = paperCount > 0 ? `${paperCount} verified PYQ${paperCount > 1 ? 's' : ''}` : 'Coming Soon';
                return `• **${s.name}**${s.credits ? ` (${s.credits})` : ''}: ${statusStr}`;
            }).join('\n');

            const edLine = semNode?.educators?.length
                ? `\n\nEducators teaching Sem ${sem} courses: **${formatListNatural(semNode.educators)}**.`
                : '';

            return {
                text: `📚 **Semester 0${sem}** has **${subjects.length} subjects** (${availableCount} with PYQs ready right now):\n\n` +
                      subjectList +
                      edLine +
                      `\n\nWhich subject should I pull PYQs or course details for?`,
                links: [
                    { title: `Semester 0${sem} Hub`, subtitle: `Full Subject List & Papers`, url: `/sem${sem}`, type: "nav" },
                    { title: "Universal PYQ Library", subtitle: `Filter by Semester ${sem}`, url: "/library", type: "nav" },
                    { title: "Course Catalog", subtitle: `Semester ${sem} Crash Courses`, url: "/courses", type: "course" }
                ],
                suggestedPrompts: [
                    `Show Semester ${sem} PYQs`,
                    subjects[0] ? `${subjects[0].name} PYQ` : `Courses for Semester ${sem}`,
                    sem < 5 ? `What about Semester ${sem + 1}?` : "Semester 1 resources",
                    "All subject PYQs list"
                ],
                confidence: 0.98,
                intent: 'SEMESTER_INFO'
            };
        }

        generateSubjectResponse(frame) {
            const subject = frame.subject;
            const sNode = this.graph.getSubject(subject);
            const subjectEntries = this.findSubjectEntries(subject, frame.semester);
            const fallbackEntries = subjectEntries.length === 0 ? this.findSubjectEntries(subject) : [];
            const info = subjectEntries[0] || fallbackEntries[0] || null;

            const libraryPapers = this.findPapers({ subject, semester: frame.semester });
            const allPapers = libraryPapers.length > 0 ? libraryPapers : this.findPapers({ subject });
            const courses = this.findCourses(subject);
            const semNum = frame.semester || info?.semester || allPapers[0]?.semester;

            const links = [];
            allPapers.slice(0, 6).forEach(p => {
                links.push({
                    title: p.title || `${subject} — ${p.paperTitle || `${p.type} ${p.year}`}`,
                    subtitle: `Sem ${p.semester} • ${p.paperTitle || `${p.type} ${p.year}`} • Drive PDF`,
                    url: p.url,
                    type: 'pyq'
                });
            });

            if (courses.length > 0) {
                links.push({
                    title: courses[0].title,
                    subtitle: `${courses[0].educator} • ${courses[0].discount || 'Course Sprint'}`,
                    url: courses[0].url,
                    type: 'course'
                });
            }
            if (sNode?.labs?.length > 0) {
                links.push({ title: sNode.labs[0].name, subtitle: "Interactive Visualizer Lab", url: sNode.labs[0].url, type: 'tool' });
            }
            if (semNum) {
                links.push({ title: `Semester 0${semNum} Page`, subtitle: "View all resources", url: `/sem${semNum}`, type: 'nav' });
            }

            const pyqSummary = allPapers.length > 0
                ? `**${allPapers.length}** verified paper${allPapers.length > 1 ? 's' : ''} (${allPapers.slice(0, 4).map(p => p.paperTitle || `${p.type} ${p.year}`).join(', ')}${allPapers.length > 4 ? ', ...' : ''})`
                : `Coming Soon (no PDFs uploaded yet — feel free to share yours!)`;

            let courseLine = 'No standalone crash course card listed right now';
            if (sNode?.namedEducators?.length > 0) {
                courseLine = `Taught by **${formatListNatural(sNode.namedEducators)}** (${courses[0].price || courses[0].discount || 'Available'})`;
            } else if (courses.length > 0) {
                courseLine = `Available under **${courses[0].educator}** (${courses[0].title})`;
            } else if (sNode?.teamSpecialists?.length > 0) {
                courseLine = `Covered in **1-on-1 Live Mentorship** by **${formatListNatural(sNode.teamSpecialists)}**`;
            }

            return {
                text: `📖 Here's everything we have for **${info?.name || subject}**${semNum ? ` (Semester ${semNum}${info?.credits ? ' • ' + info.credits : ''})` : ''}:\n\n` +
                      `${info?.description ? `*Syllabus:* ${info.description}\n\n` : ''}` +
                      `• **Verified PYQs:** ${pyqSummary}\n` +
                      `• **Educators & Course:** ${courseLine}\n` +
                      `${sNode?.labs?.length ? `• **Interactive Lab:** Practice visually in **${sNode.labs[0].name}**\n` : ''}\n` +
                      `Click any PYQ or course card below — or ask *"Who teaches it?"* or *"Only Endsem papers"*!`,
                links,
                suggestedPrompts: [
                    `Show all ${subject} PYQs`,
                    `Who teaches ${subject}?`,
                    `Crash course for ${subject}`,
                    semNum ? `Semester ${semNum} subjects` : "Universal PYQ Library"
                ],
                confidence: 0.99,
                intent: 'SPECIFIC_SUBJECT'
            };
        }

        generateNavigationResponse(frame, query) {
            const lower = (query || '').toLowerCase();
            const totalLibCount = (this.kb.library || []).length;
            let target = { title: "Dashboard / Home", url: "/home", subtitle: "Main Platform Hub" };

            if (lower.includes('library') || lower.includes('pyq') || lower.includes('past paper')) {
                target = { title: "Universal PYQ Library", url: "/library", subtitle: `${totalLibCount} Verified Exam Papers` };
            } else if (lower.includes('course') || lower.includes('catalog') || lower.includes('store')) {
                target = { title: "Course Catalog", url: "/courses", subtitle: "Crash Courses & Sprints" };
            } else if (lower.includes('tool') || lower.includes('calculator') || lower.includes('pomodoro') || lower.includes('cgpa')) {
                target = { title: "Academic Study Tools", url: "/tools", subtitle: "Pomodoro, CGPA, Countdown" };
            } else if (lower.includes('dsa') || lower.includes('sorting')) {
                target = { title: "Visual DSA Lab", url: "/dsa", subtitle: "20+ Interactive Visualizers" };
            } else if (lower.includes('os') || lower.includes('operating system') || lower.includes('scheduling')) {
                target = { title: "Visual OS Lab", url: "/os", subtitle: "Interactive Systems Simulations" };
            } else if (frame.semester || lower.match(/sem(?:ester)?\s*([1-5])/)) {
                const s = frame.semester || (lower.match(/sem(?:ester)?\s*([1-5])/) ? lower.match(/sem(?:ester)?\s*([1-5])/)[1] : 1);
                target = { title: `Semester 0${s} Hub`, url: `/sem${s}`, subtitle: `Semester ${s} Resources` };
            } else if (lower.includes('login') || lower.includes('sign in')) {
                target = { title: "Student Login", url: "/login", subtitle: "Sign In to BU Resource Hub" };
            } else if (lower.includes('signup') || lower.includes('register')) {
                target = { title: "Student Sign Up", url: "/signup", subtitle: "Create an Account" };
            }

            return {
                text: `🧭 You can jump straight to **${target.title}** (${target.url}) using the card below:`,
                links: [
                    { title: target.title, subtitle: target.subtitle || "Jump to page", url: target.url, type: "nav" },
                    { title: "Home Dashboard", subtitle: "Main platform hub", url: "/home", type: "nav" }
                ],
                suggestedPrompts: ["Take me to PYQ Library", "Take me to Courses", "Take me to Study Tools", "Open Visual DSA Lab"],
                confidence: 0.98,
                intent: 'NAVIGATION'
            };
        }

        generateBestMatchResponse(topMatch, rankedDocs) {
            const doc = topMatch.doc;
            const confidence = topMatch.score;
            const typeMap = t => t.includes('pyq') ? 'pyq' : t.includes('course') ? 'course' : t.includes('tool') ? 'tool' : 'nav';

            const links = [{
                title: doc.title,
                subtitle: doc.subtitle || "Skills Seekers Resource",
                url: doc.url,
                type: typeMap(doc.type)
            }];

            rankedDocs.slice(1, 3).forEach(r => {
                if (r.score > confidence * 0.7) {
                    links.push({
                        title: r.doc.title,
                        subtitle: r.doc.subtitle || "Related Resource",
                        url: r.doc.url,
                        type: typeMap(r.doc.type)
                    });
                }
            });

            return {
                text: `The closest match I found for that is **${doc.title}**${doc.subtitle ? ` (*${doc.subtitle}*)` : ''}:\n\n` +
                      `${doc.data?.description || doc.data?.bio || doc.text.slice(0, 220) + '...'}\n\n` +
                      `Click below to open it directly — or let me know if you meant a specific subject or PYQ!`,
                links,
                suggestedPrompts: ["Explore PYQ Library", "Browse Crash Courses", "Academic Study Tools", "Contact Skills Seekers"],
                confidence: Math.min(0.92, confidence),
                intent: 'BEST_MATCH'
            };
        }

        generateFallbackResponse(query) {
            const lower = (query || '').toLowerCase();
            const totalPapers = (this.kb.library || []).length;
            const totalCourses = (this.kb.courses || []).length;
            let hint = "";
            let suggestedPrompts = [
                "Show Semester 1 PYQs",
                "Who teaches Calculus?",
                "Browse all educators",
                "Courses under ₹500",
                "How to calculate CGPA?"
            ];

            if (lower.includes('pyq') || lower.includes('paper') || lower.includes('exam')) {
                hint = "💡 Tip: Mention any subject name or semester (for example, *\"DBMS PYQ\"* or *\"Sem 2 Java papers\"*) and I'll pull the Drive PDFs.\n\n";
                suggestedPrompts = ["All subject PYQs list", "DBMS PYQ", "Show Semester 1 PYQs", "Contribute a question paper"];
            } else if (lower.includes('course') || lower.includes('learn') || lower.includes('study') || lower.includes('video')) {
                hint = `💡 Skills Seekers offers ${totalCourses} crash courses & bundles. Try asking about a subject, educator, or budget (like *"Courses under ₹500"* or *"Who teaches OS?"*).\n\n`;
                suggestedPrompts = ["Browse all educators", "Courses under ₹500", "1-on-1 Mentorship", "What do students say? (Reviews)"];
            } else if (lower.includes('lab') || lower.includes('code') || lower.includes('visual')) {
                hint = "💡 Try asking about our interactive **Visual DSA Lab** or **Visual OS Lab**!\n\n";
                suggestedPrompts = ["Open Visual DSA Lab", "Open Visual OS Lab", "Compare DSA Lab and OS Lab", "DAA PYQs"];
            }

            return {
                text: `I couldn't find a direct match in my Skills Seekers knowledge base for "${query}", and I don't want to guess.\n\n` +
                      hint +
                      `I'm tuned for Bennett University academics across:\n` +
                      `• **${totalPapers} Verified PYQs** across Semesters 1–5\n` +
                      `• **${totalCourses} Crash Courses & Bundles** taught by 7 educators\n` +
                      `• **Study Tools** (CGPA Calculator, Pomodoro, Countdown, Notes)\n` +
                      `• **Virtual Labs** (Visual DSA & Visual OS)\n\n` +
                      `Try one of the prompts below, or ask me directly!`,
                links: [
                    { title: "Universal PYQ Library", subtitle: `Browse ${totalPapers} verified papers`, url: "/library", type: "nav" },
                    { title: "Crash Courses Catalog", subtitle: `Explore ${totalCourses} courses`, url: "/courses", type: "course" },
                    { title: "Ask on WhatsApp", subtitle: "Direct student support", url: this.kb.platform.whatsapp, type: "external" }
                ],
                suggestedPrompts,
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
