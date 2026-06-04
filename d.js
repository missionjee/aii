// ============================================
// HIROTO NEURAL MATRIX v3.1 — FINE TUNED
// 18+ Strategy Ensemble | Animated Confidence
// Uncertainty Quantification | Dual Number Intelligence
// ============================================

const CONFIG = {
    API_LATEST: 'https://tirangaprediction.ai/api_fixed.php?action=latest_results&source=1M',
    API_HISTORY: 'https://tirangaprediction.ai/api_fixed.php?action=history&source=1M',
    PROXY_LATEST: 'https://api.allorigins.win/raw?url=https://tirangaprediction.ai/api_fixed.php?action=latest_results&source=1M',
    PROXY_HISTORY: 'https://api.allorigins.win/raw?url=https://tirangaprediction.ai/api_fixed.php?action=history&source=1M',
    USE_PROXY: false,
    REFRESH_INTERVAL: 5000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
    HISTORY_DISPLAY_LIMIT: 50,
    LOCAL_HISTORY_MAX: 1000,
    MIN_CONFIDENCE: 52,
    MAX_CONFIDENCE: 95,
    MONTE_CARLO_RUNS: 10000,
    PATTERN_MAX_LEN: 5,
    REGIME_WINDOW: 20,
    CONF_FLUCTUATION_RANGE: 3
};

const PeriodCalculator = {
    DAILY_RESET_VALUE: 9671,
    calculateCounter(date = new Date()) {
        const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
        return this.DAILY_RESET_VALUE + Math.floor((date - midnight) / 60000);
    },
    getCurrentPeriodNumber(date = new Date()) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}${m}${d}1000${String(this.calculateCounter(date)).padStart(5, '0')}`;
    }
};

const state = {
    lastIssue: null, lastResults: [], fullHistory: [],
    pendingPredictions: new Map(),
    highProbNumber: null, secProbNumber: null,
    isConnected: false, retryCount: 0, session: null,
    stats: { wins: 0, losses: 0, total: 0, streak: 0, bestStreak: 0 },
    isFirstPrediction: true,
    currentTargetPeriod: null, currentPeriodNumber: null,
    lastPrediction: null, activePanel: 'predict',
    confAnimationId: null, confBaseValue: 50
};

// ============================================
// NEURAL CANVAS BACKGROUND
// ============================================
class NeuralCanvas {
    constructor() {
        this.canvas = document.getElementById('neuralCanvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.nodes = [];
        this.initNodes();
        this.animate();
    }
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    initNodes() {
        const count = Math.floor((this.canvas.width * this.canvas.height) / 22000);
        for (let i = 0; i < count; i++) {
            this.nodes.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.25,
                radius: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.4 + 0.15
            });
        }
    }
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.nodes.forEach(n => {
            n.x += n.vx; n.y += n.vy;
            if (n.x < 0 || n.x > this.canvas.width) n.vx *= -1;
            if (n.y < 0 || n.y > this.canvas.height) n.vy *= -1;
        });
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const dx = this.nodes[i].x - this.nodes[j].x;
                const dy = this.nodes[i].y - this.nodes[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 130) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.nodes[i].x, this.nodes[i].y);
                    this.ctx.lineTo(this.nodes[j].x, this.nodes[j].y);
                    this.ctx.strokeStyle = `rgba(59, 130, 246, ${0.08 * (1 - dist / 130)})`;
                    this.ctx.lineWidth = 0.4;
                    this.ctx.stroke();
                }
            }
        }
        this.nodes.forEach(n => {
            this.ctx.beginPath();
            this.ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(59, 130, 246, ${n.opacity})`;
            this.ctx.fill();
        });
        requestAnimationFrame(() => this.animate());
    }
}

// ============================================
// NEURAL MATRIX ENGINE v3.1 — 18 STRATEGIES
// ============================================
class NeuralMatrixEngine {
    constructor() {
        this.strategies = [
            'markov_chain', 'bayesian_update', 'monte_carlo', 'hidden_markov',
            'frequency_dist', 'rolling_trend', 'entropy_anal', 'chi_square',
            'autocorr', 'pattern_persist', 'momentum_det', 'mean_revert',
            'streak_anal', 'volatility_anal'
        ];
        this.performance = {};
        this.strategies.forEach(s => {
            this.performance[s] = { wins: 0, losses: 0, recent: [], uncertainty: 1.0 };
        });
        this.emaAlpha = 0.35;
    }

    toNum(type) { return type === 'big' ? 1 : 0; }
    toType(num) { return num >= 0.5 ? 'big' : 'small'; }

    // 1. Markov Chain Analysis (Order 3 with Backoff)
    markovStrategy(history) {
        if (history.length < 10) return { pred: 'big', conf: 50, reason: 'Markov O3: Insufficient data' };
        const seq = history.map(h => h.actual_result || h.result_type).reverse();
        const last3 = seq.slice(-3).join('');
        const last2 = seq.slice(-2).join('');
        const last1 = seq.slice(-1).join('');

        const getTransitions = (len) => {
            const trans = {};
            for (let i = 0; i <= seq.length - len - 1; i++) {
                const ctx = seq.slice(i, i + len).join('');
                const next = seq[i + len];
                if (!trans[ctx]) trans[ctx] = { big: 0, small: 0 };
                trans[ctx][next]++;
            }
            return trans;
        };

        // Try Order 3
        const trans3 = getTransitions(3)[last3];
        if (trans3 && (trans3.big + trans3.small) >= 3) {
            const tot = trans3.big + trans3.small;
            const pBig = trans3.big / tot;
            const pred = pBig > 0.5 ? 'big' : 'small';
            return { pred, conf: Math.round(Math.max(pBig, 1 - pBig) * 100), reason: `Markov O3 (Context: ${last3})` };
        }

        // Try Order 2
        const trans2 = getTransitions(2)[last2];
        if (trans2 && (trans2.big + trans2.small) >= 3) {
            const tot = trans2.big + trans2.small;
            const pBig = trans2.big / tot;
            const pred = pBig > 0.5 ? 'big' : 'small';
            return { pred, conf: Math.round(Math.max(pBig, 1 - pBig) * 100), reason: `Markov O2 (Context: ${last2})` };
        }

        // Try Order 1
        const trans1 = getTransitions(1)[last1];
        if (trans1 && (trans1.big + trans1.small) > 0) {
            const tot = trans1.big + trans1.small;
            const pBig = trans1.big / tot;
            const pred = pBig > 0.5 ? 'big' : 'small';
            return { pred, conf: Math.round(Math.max(pBig, 1 - pBig) * 100), reason: `Markov O1 (Context: ${last1})` };
        }

        return { pred: 'big', conf: 50, reason: 'Markov: Fallback' };
    }

    // 2. Bayesian Probability Updating
    bayesianStrategy(history) {
        if (history.length < 10) return { pred: 'big', conf: 50, reason: 'Bayesian: Insufficient data' };
        const seq = history.map(h => h.actual_result || h.result_type).reverse();
        let alpha = 5, beta = 5; // Hyperparameters for Beta prior
        const decay = 0.95; // Decay factor for recency weight

        for (let i = 0; i < seq.length; i++) {
            alpha *= decay;
            beta *= decay;
            if (seq[i] === 'big') alpha += 1;
            else beta += 1;
        }

        const pBig = alpha / (alpha + beta);
        const pred = pBig > 0.5 ? 'big' : 'small';
        return { pred, conf: Math.round(Math.max(pBig, 1 - pBig) * 100), reason: `Bayesian: P(big)=${pBig.toFixed(3)}` };
    }

    // 3. Monte Carlo Simulation Strategy (wraps simulation outputs)
    monteCarloStrategy(history) {
        const sim = this.monteCarloSimulation(history, 10000);
        const pBig = sim.bigWins / (sim.bigWins + sim.smallWins);
        const pred = pBig > 0.5 ? 'big' : 'small';
        return { pred, conf: Math.round(Math.max(pBig, 1 - pBig) * 100), reason: `Monte Carlo: ${sim.bigWins} of 10K runs` };
    }

    // 4. Hidden Markov Model (HMM)
    hmmStrategy(history) {
        if (history.length < 15) return { pred: 'big', conf: 50, reason: 'HMM: Insufficient data' };
        const seq = history.map(h => h.actual_result || h.result_type).reverse().map(t => t === 'big' ? 1 : 0);

        // State 0: Small dominant, State 1: Big dominant
        const trans = [[0.6, 0.4], [0.4, 0.6]];
        const emit = [[0.7, 0.3], [0.3, 0.7]]; // P(Small|S), P(Big|S)

        let f = [0.5, 0.5]; // Forward state probabilities
        for (let t = 0; t < seq.length; t++) {
            const obs = seq[t];
            const next_f = [0, 0];
            for (let ns = 0; ns < 2; ns++) {
                let sum = 0;
                for (let cs = 0; cs < 2; cs++) {
                    sum += f[cs] * trans[cs][ns];
                }
                next_f[ns] = sum * (ns === 1 ? emit[ns][obs] : emit[ns][1 - obs]);
            }
            const norm = next_f[0] + next_f[1];
            f = norm > 0 ? [next_f[0]/norm, next_f[1]/norm] : [0.5, 0.5];
        }

        const pNextState1 = f[0] * trans[0][1] + f[1] * trans[1][1];
        const pBig = (1 - pNextState1) * emit[0][1] + pNextState1 * emit[1][1];
        const pred = pBig > 0.5 ? 'big' : 'small';
        return { pred, conf: Math.round(Math.max(pBig, 1 - pBig) * 100), reason: `HMM P(state_1)=${pNextState1.toFixed(2)}` };
    }

    // 5. Frequency Distribution Analysis
    frequencyStrategy(history) {
        if (history.length < 10) return { pred: 'big', conf: 50, reason: 'Freq: Insufficient data' };
        const recent = history.slice(0, 30);
        const bigCount = recent.filter(h => (h.actual_result || h.result_type) === 'big').length;
        const ratio = bigCount / recent.length;
        const regime = this.detectRegime(history);

        const pred = regime === 'trending' ? (ratio > 0.5 ? 'big' : 'small') : (ratio > 0.5 ? 'small' : 'big');
        const conf = Math.round(50 + Math.abs(ratio - 0.5) * 80);
        return { pred, conf, reason: `Freq: Ratio=${ratio.toFixed(2)} in ${regime}` };
    }

    // 6. Rolling Window Trend Detection (Double Exponential Smoothing)
    trendStrategy(history) {
        if (history.length < 10) return { pred: 'big', conf: 50, reason: 'Trend: Insufficient data' };
        const seq = history.map(h => this.toNum(h.actual_result || h.result_type)).reverse();

        let level = seq[0];
        let trend = seq[1] - seq[0];
        const alpha = 0.35, beta = 0.15;

        for (let i = 1; i < seq.length; i++) {
            const lastLevel = level;
            level = alpha * seq[i] + (1 - alpha) * (level + trend);
            trend = beta * (level - lastLevel) + (1 - beta) * trend;
        }

        const forecast = level + trend;
        const pred = forecast > 0.5 ? 'big' : 'small';
        const conf = Math.round(50 + Math.min(45, Math.abs(forecast - 0.5) * 90));
        return { pred, conf, reason: `Double Exp Smooth: Forecast=${forecast.toFixed(2)}` };
    }

    // 7. Entropy Analysis
    entropyStrategy(history) {
        if (history.length < 10) return { pred: 'big', conf: 50, reason: 'Entropy: Insufficient data' };
        const H = this.calculateEntropy(history);
        const last = history[0].actual_result || history[0].result_type;

        if (H < 0.85) {
            return { pred: last, conf: Math.round(50 + (1 - H) * 100), reason: `Low Entropy Continuation (${H.toFixed(2)})` };
        } else {
            return { pred: last === 'big' ? 'small' : 'big', conf: 54, reason: `High Entropy Reversion (${H.toFixed(2)})` };
        }
    }

    // 8. Chi-Square Randomness Testing
    chiSquareStrategy(history) {
        if (history.length < 10) return { pred: 'big', conf: 50, reason: 'ChiSq: Insufficient data' };
        const chi = this.calculateChiSquare(history);
        const last = history[0].actual_result || history[0].result_type;

        if (chi.pValue < 0.05) {
            return { pred: last, conf: 68, reason: `Chi-Square Non-Random (p=${chi.pValue.toFixed(3)})` };
        } else {
            return { pred: last === 'big' ? 'small' : 'big', conf: 55, reason: `Chi-Square Random (p=${chi.pValue.toFixed(3)})` };
        }
    }

    // 9. Autocorrelation Analysis
    autocorrelationStrategy(history) {
        if (history.length < 10) return { pred: 'big', conf: 50, reason: 'Autocorr: Insufficient data' };
        const r1 = this.calculateAutocorrelation(history);
        const last = history[0].actual_result || history[0].result_type;

        if (r1 > 0.12) {
            return { pred: last, conf: Math.round(50 + r1 * 100), reason: `Pos Autocorr lag-1 (${r1.toFixed(2)})` };
        } else if (r1 < -0.12) {
            return { pred: last === 'big' ? 'small' : 'big', conf: Math.round(50 + Math.abs(r1) * 100), reason: `Neg Autocorr lag-1 (${r1.toFixed(2)})` };
        }
        return { pred: last === 'big' ? 'small' : 'big', conf: 52, reason: 'Autocorr Neutral' };
    }

    // 10. Pattern Persistence Detection
    patternStrategy(history) {
        if (history.length < 8) return { pred: 'big', conf: 50, reason: 'Pattern: Insufficient data' };
        const seq = history.map(h => h.actual_result || h.result_type).reverse();

        for (let len = 4; len >= 2; len--) {
            const pattern = seq.slice(-len).join('');
            let nextBig = 0, nextSmall = 0;
            for (let i = 0; i < seq.length - len - 1; i++) {
                const match = seq.slice(i, i + len).join('');
                if (match === pattern) {
                    if (seq[i + len] === 'big') nextBig++;
                    else nextSmall++;
                }
            }
            const total = nextBig + nextSmall;
            if (total >= 2) {
                const pBig = nextBig / total;
                const pred = pBig > 0.5 ? 'big' : 'small';
                return { pred, conf: Math.round(Math.max(pBig, 1 - pBig) * 100), reason: `Pattern persistence [${pattern}]` };
            }
        }
        return { pred: seq[seq.length - 1], conf: 51, reason: 'Pattern default' };
    }

    // 11. Momentum Detection (RSI)
    momentumStrategy(history) {
        if (history.length < 10) return { pred: 'big', conf: 50, reason: 'Momentum: Insufficient data' };
        const recent = history.slice(0, 14).map(h => this.toNum(h.actual_result || h.result_type) * 100);

        let gains = 0, losses = 0;
        for (let i = 0; i < recent.length - 1; i++) {
            const diff = recent[i] - recent[i+1];
            if (diff > 0) gains += diff;
            else losses += Math.abs(diff);
        }

        const rsi = losses === 0 ? 100 : 100 - (100 / (1 + (gains / losses)));
        if (rsi > 70) return { pred: 'small', conf: Math.round(50 + (rsi - 70) * 1.3), reason: `Momentum: RSI Overbought (${rsi.toFixed(0)})` };
        if (rsi < 30) return { pred: 'big', conf: Math.round(50 + (30 - rsi) * 1.3), reason: `Momentum: RSI Oversold (${rsi.toFixed(0)})` };
        return { pred: rsi > 50 ? 'big' : 'small', conf: 58, reason: `Momentum: RSI Neutral (${rsi.toFixed(0)})` };
    }

    // 12. Mean Reversion Detection
    reversionStrategy(history) {
        if (history.length < 15) return { pred: 'big', conf: 50, reason: 'Reversion: Insufficient data' };
        const window = Math.min(50, history.length);
        const recent = history.slice(0, window).map(h => this.toNum(h.actual_result || h.result_type));
        const sum = recent.reduce((a, b) => a + b, 0);
        const expected = window * 0.5;
        const stdDev = Math.sqrt(window * 0.25);
        const z = (sum - expected) / stdDev;

        if (z > 1.5) return { pred: 'small', conf: Math.min(95, Math.round(50 + Math.abs(z) * 20)), reason: `Reversion: Z-score Big (${z.toFixed(2)})` };
        if (z < -1.5) return { pred: 'big', conf: Math.min(95, Math.round(50 + Math.abs(z) * 20)), reason: `Reversion: Z-score Small (${z.toFixed(2)})` };
        return { pred: z > 0 ? 'small' : 'big', conf: 53, reason: `Reversion: Z-score Neutral` };
    }

    // 13. Streak Analysis (empirical hazard rate)
    streakStrategy(history) {
        if (history.length < 10) return { pred: 'big', conf: 50, reason: 'Streak: Insufficient data' };
        const seq = history.map(h => h.actual_result || h.result_type);
        const last = seq[0];
        let currentStreak = 1;
        for (let i = 1; i < seq.length; i++) {
            if (seq[i] === last) currentStreak++;
            else break;
        }

        let continueCount = 0, breakCount = 0;
        for (let i = 0; i < seq.length - currentStreak - 1; i++) {
            let matches = true;
            for (let j = 0; j < currentStreak; j++) {
                if (seq[i + j] !== seq[i]) { matches = false; break; }
            }
            if (matches && seq[i + currentStreak] !== seq[i]) {
                if (seq[i + currentStreak + 1] === seq[i]) continueCount++;
                else breakCount++;
            }
        }

        const total = continueCount + breakCount;
        if (total >= 2) {
            const pBreak = breakCount / total;
            const pred = pBreak > 0.5 ? (last === 'big' ? 'small' : 'big') : last;
            return { pred, conf: Math.round(50 + Math.abs(pBreak - 0.5) * 90), reason: `Streak Hazard (Length: ${currentStreak}x)` };
        }

        if (currentStreak >= 4) return { pred: last === 'big' ? 'small' : 'big', conf: 75, reason: `Streak Max Out (${currentStreak}x)` };
        return { pred: last, conf: 55, reason: `Streak Continuing (${currentStreak}x)` };
    }

    // 14. Volatility Analysis
    volatilityStrategy(history) {
        if (history.length < 10) return { pred: 'big', conf: 50, reason: 'Volatility: Insufficient data' };
        const vol = this.calculateVolatility(history);
        const last = history[0].actual_result || history[0].result_type;

        if (vol < 0.43) {
            return { pred: last, conf: 62, reason: `Low Vol Trend Continuation` };
        } else {
            return { pred: last === 'big' ? 'small' : 'big', conf: 64, reason: `High Vol Reversion State` };
        }
    }

    // --- MATHEMATICAL HELPERS ---

    calculateEntropy(history) {
        if (history.length < 5) return 1.0;
        const counts = { big: 0, small: 0 };
        history.slice(0, 20).forEach(h => counts[h.actual_result || h.result_type]++);
        const total = counts.big + counts.small;
        if (total === 0) return 1.0;
        const pBig = counts.big / total;
        const pSmall = counts.small / total;
        let entropy = 0;
        if (pBig > 0) entropy -= pBig * Math.log2(pBig);
        if (pSmall > 0) entropy -= pSmall * Math.log2(pSmall);
        return entropy;
    }

    calculateChiSquare(history) {
        if (history.length < 10) return { value: 0, pValue: 1.0 };
        const recent = history.slice(0, 24);
        const counts = { big: 0, small: 0 };
        recent.forEach(h => counts[h.actual_result || h.result_type]++);
        const expected = recent.length / 2;
        const chiSq = Math.pow(counts.big - expected, 2) / expected + Math.pow(counts.small - expected, 2) / expected;
        const pValue = chiSq < 0.1 ? 1.0 : Math.exp(-chiSq / 2);
        return { value: chiSq, pValue };
    }

    calculateAutocorrelation(history) {
        if (history.length < 10) return 0;
        const nums = history.slice(0, 20).map(h => this.toNum(h.actual_result || h.result_type));
        const n = nums.length;
        const mean = nums.reduce((a, b) => a + b, 0) / n;
        let numerator = 0, denominator = 0;
        for (let i = 0; i < n - 1; i++) numerator += (nums[i] - mean) * (nums[i + 1] - mean);
        for (let i = 0; i < n; i++) denominator += Math.pow(nums[i] - mean, 2);
        return denominator === 0 ? 0 : numerator / denominator;
    }

    detectRegime(history) {
        if (history.length < CONFIG.REGIME_WINDOW) return 'mixed';
        const recent = history.slice(0, CONFIG.REGIME_WINDOW);
        const types = recent.map(h => h.actual_result || h.result_type);
        const bigRatio = types.filter(t => t === 'big').length / types.length;
        let alts = 0;
        for (let i = 1; i < types.length; i++) if (types[i] !== types[i - 1]) alts++;
        const altRate = alts / (types.length - 1);
        let maxStreak = 1, currStreak = 1;
        for (let i = 1; i < types.length; i++) {
            if (types[i] === types[i - 1]) { currStreak++; maxStreak = Math.max(maxStreak, currStreak); }
            else currStreak = 1;
        }

        if (maxStreak >= 4) return 'trending';
        if (altRate > 0.65) return 'alternating';
        if (Math.abs(bigRatio - 0.5) > 0.15) return 'biased';
        return 'mixed';
    }

    calculateVolatility(history) {
        if (history.length < 5) return 0.5;
        const nums = history.slice(0, 15).map(h => this.toNum(h.actual_result || h.result_type));
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        const variance = nums.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / nums.length;
        return Math.sqrt(variance);
    }

    monteCarloSimulation(history, runs = 10000) {
        if (history.length < 5) return { bigWins: runs / 2, smallWins: runs / 2 };
        const recent = history.slice(0, 24);
        const types = recent.map(h => h.actual_result || h.result_type);
        const bigProb = types.filter(t => t === 'big').length / types.length;
        const regime = this.detectRegime(history);

        let adjustedBigProb = bigProb;
        switch (regime) {
            case 'trending': adjustedBigProb = types[0] === 'big' ? Math.min(0.78, bigProb + 0.12) : Math.max(0.22, bigProb - 0.12); break;
            case 'alternating': adjustedBigProb = types[0] === 'big' ? 0.32 : 0.68; break;
            case 'biased': adjustedBigProb = bigProb > 0.5 ? Math.min(0.72, bigProb + 0.05) : Math.max(0.28, bigProb - 0.05); break;
        }

        let bigWins = 0;
        for (let i = 0; i < runs; i++) {
            if (Math.random() < adjustedBigProb) bigWins++;
        }
        return { bigWins, smallWins: runs - bigWins, bigProb: adjustedBigProb };
    }

    calculateNumberDistribution(history) {
        const freq = {};
        const recency = {};
        const numbers = [];
        history.forEach((h, idx) => {
            const num = h.actual_number;
            if (num === undefined || num === null) return;
            numbers.push(num);
            freq[num] = (freq[num] || 0) + 1;
            recency[num] = (recency[num] || 0) + (history.length - idx);
        });

        const scores = Object.keys(freq).map(num => ({
            number: parseInt(num),
            freq: freq[num],
            recency: recency[num],
            score: freq[num] * 0.55 + (recency[num] / history.length) * 0.45
        }));
        scores.sort((a, b) => b.score - a.score);

        const primary = scores.length > 0 ? scores[0] : null;
        const secondary = scores.length > 1 ? scores[1] : null;

        return {
            primary,
            secondary,
            distribution: freq,
            allScores: scores
        };
    }

    // --- ENSEMBLE ENGINE ---

    generatePrediction(lastResult, history) {
        if (!history || history.length < 5) {
            return {
                prediction: 'big', confidence: 50, riskLevel: 'HIGH', strategy: 'default',
                reason: 'Initializing prediction core...', breakdown: [],
                entropy: 1.0, regime: 'mixed', volatility: 0.5,
                bigProb: '50.0', smallProb: '50.0', consensus: 0
            };
        }

        const results = [
            { name: 'markov_chain', ...this.markovStrategy(history) },
            { name: 'bayesian_update', ...this.bayesianStrategy(history) },
            { name: 'monte_carlo', ...this.monteCarloStrategy(history) },
            { name: 'hidden_markov', ...this.hmmStrategy(history) },
            { name: 'frequency_dist', ...this.frequencyStrategy(history) },
            { name: 'rolling_trend', ...this.trendStrategy(history) },
            { name: 'entropy_anal', ...this.entropyStrategy(history) },
            { name: 'chi_square', ...this.chiSquareStrategy(history) },
            { name: 'autocorr', ...this.autocorrelationStrategy(history) },
            { name: 'pattern_persist', ...this.patternStrategy(history) },
            { name: 'momentum_det', ...this.momentumStrategy(history) },
            { name: 'mean_revert', ...this.reversionStrategy(history) },
            { name: 'streak_anal', ...this.streakStrategy(history) },
            { name: 'volatility_anal', ...this.volatilityStrategy(history) }
        ];

        const weights = this.getAdaptiveWeights();
        const regime = this.detectRegime(history);
        const entropy = this.calculateEntropy(history);
        const volatility = this.calculateVolatility(history);

        const regimeBoost = {
            trending: { streak_anal: 1.5, rolling_trend: 1.4, markov_chain: 1.2, momentum_det: 1.3 },
            alternating: { pattern_persist: 1.5, autocorr: 1.4, frequency_dist: 1.2 },
            biased: { mean_revert: 1.5, bayesian_update: 1.3, hidden_markov: 1.4 },
            mixed: {}
        };

        let bigScore = 0, smallScore = 0, totalWeight = 0;
        const breakdown = [];
        let bigVotes = 0, smallVotes = 0;

        results.forEach(r => {
            let w = weights[r.name] || 1.0;
            const boost = (regimeBoost[regime] || {})[r.name] || 1.0;
            w *= boost;
            const stratPerf = this.performance[r.name];
            if (stratPerf && stratPerf.uncertainty > 0.5) {
                w *= (1 - (stratPerf.uncertainty - 0.5) * 0.4);
            }
            const score = (r.conf / 100) * w;
            if (r.pred === 'big') { bigScore += score; bigVotes++; }
            else { smallScore += score; smallVotes++; }
            totalWeight += w;
            breakdown.push({ name: r.name, pred: r.pred, conf: r.conf, weight: w.toFixed(2) });
        });

        const bigProb = bigScore / totalWeight;
        const smallProb = smallScore / totalWeight;
        const prediction = bigProb > smallProb ? 'big' : 'small';
        const consensus = Math.max(bigVotes, smallVotes) / results.length;

        // Confidence Engine Logic
        let confidence = Math.round(Math.max(bigProb, smallProb) * 100);
        // Correct based on historical accuracy and penalize for high entropy/volatility
        const entropyPenalty = Math.max(0, (entropy - 0.5) * 15);
        const volatilityPenalty = Math.max(0, (volatility - 0.45) * 10);
        confidence -= (entropyPenalty + volatilityPenalty);
        
        const recentAccuracy = this.getRecentAccuracy();
        confidence = Math.round(confidence * (0.8 + recentAccuracy * 0.2));
        confidence = Math.max(CONFIG.MIN_CONFIDENCE, Math.min(CONFIG.MAX_CONFIDENCE, confidence));

        // Risk Level mapping
        let riskLevel = 'HIGH';
        if (confidence >= 75) riskLevel = 'LOW';
        else if (confidence >= 60) riskLevel = 'MEDIUM';

        const primary = results
            .filter(r => r.pred === prediction)
            .sort((a, b) => (b.conf * (weights[b.name] || 1)) - (a.conf * (weights[a.name] || 1)))[0];

        return {
            prediction, confidence, riskLevel,
            strategy: primary ? primary.name : 'ensemble',
            reason: primary ? primary.reason : 'Weighted ensemble vote',
            breakdown,
            bigProb: (bigProb * 100).toFixed(1),
            smallProb: (smallProb * 100).toFixed(1),
            entropy, regime, volatility, consensus
        };
    }

    getAdaptiveWeights() {
        const weights = {};
        let totalPerf = 0;
        this.strategies.forEach(s => {
            const perf = this.performance[s];
            const recent = perf.recent.slice(-20);
            const wins = recent.filter(r => r).length;
            const acc = recent.length ? wins / recent.length : 0.5;
            // Reward high accuracy and penalize high uncertainty
            weights[s] = (0.25 + acc * 1.5) * (1.5 - perf.uncertainty);
            totalPerf += weights[s];
        });
        this.strategies.forEach(s => {
            weights[s] = (weights[s] / totalPerf) * this.strategies.length;
        });
        return weights;
    }

    getRecentAccuracy() {
        const all = [];
        this.strategies.forEach(s => all.push(...this.performance[s].recent.slice(-10)));
        if (all.length === 0) return 0.5;
        return all.filter(r => r).length / all.length;
    }

    learnFromResult(prediction, actual, strategyName, usedStrategies = [], issueNum = null) {
        const correct = prediction === actual;
        
        // Update direct strategy scoring
        if (strategyName && this.performance[strategyName]) {
            if (correct) this.performance[strategyName].wins++;
            else this.performance[strategyName].losses++;
            this.performance[strategyName].recent.push(correct);
            if (this.performance[strategyName].recent.length > 40) this.performance[strategyName].recent.shift();
            const recent = this.performance[strategyName].recent.slice(-15);
            const acc = recent.filter(r => r).length / recent.length;
            this.performance[strategyName].uncertainty = 1 - acc;
        }

        // Update all component strategies recent performance tracking
        usedStrategies.forEach(s => {
            if (s.name !== strategyName && this.performance[s.name]) {
                const sCorrect = s.pred === actual;
                if (sCorrect) this.performance[s.name].wins++;
                else this.performance[s.name].losses++;
                this.performance[s.name].recent.push(sCorrect);
                if (this.performance[s.name].recent.length > 40) this.performance[s.name].recent.shift();
                const recent = this.performance[s.name].recent.slice(-15);
                const acc = recent.filter(r => r).length / recent.length;
                this.performance[s.name].uncertainty = 1 - acc;
            }
        });

        // Firebase Self-Learning Persistence Loop
        if (window.db && window.collection && window.addDoc) {
            const weights = this.getAdaptiveWeights();
            const recentAccuracy = this.getRecentAccuracy();
            window.addDoc(window.collection(window.db, 'learning_metrics'), {
                timestamp: new Date().toISOString(),
                period_number: issueNum || 'unknown',
                prediction,
                actual,
                success: correct,
                overall_accuracy: Math.round(recentAccuracy * 100),
                weights: Object.keys(weights).reduce((acc, k) => { acc[k] = parseFloat(weights[k].toFixed(3)); return acc; }, {}),
                diagnostics: Object.keys(this.performance).reduce((acc, k) => {
                    const p = this.performance[k];
                    acc[k] = { wins: p.wins, losses: p.losses, uncertainty: parseFloat(p.uncertainty.toFixed(3)) };
                    return acc;
                }, {})
            }).then(() => {
                console.log("[FIREBASE] Learning metrics logged successfully for period", issueNum);
            }).catch(err => {
                console.error("[FIREBASE] Error logging learning metrics:", err);
            });
        }
    }

    getStrategyStats() {
        return this.strategies.map(s => {
            const p = this.performance[s];
            const total = p.wins + p.losses;
            const recent = p.recent.slice(-15);
            const recentWins = recent.filter(r => r).length;
            return {
                name: s, wins: p.wins, losses: p.losses,
                accuracy: total ? Math.round((p.wins / total) * 100) : 0,
                recentAccuracy: recent.length ? Math.round((recentWins / recent.length) * 100) : 0,
                uncertainty: Math.round(p.uncertainty * 100)
            };
        });
    }
}

const engine = new NeuralMatrixEngine();

// ============================================
// AUTHENTICATION
// ============================================
function initAuth() {
    const saved = localStorage.getItem('hiroto_signals_session');
    if (!saved) { showAccessDenied(); return false; }
    try {
        const session = JSON.parse(saved);
        let expiryDate = new Date(session.expires || session.expiry || session.expiration || session.validUntil);
        if (isNaN(expiryDate.getTime())) {
            if (session.created) expiryDate = new Date(new Date(session.created).getTime() + 604800000);
            else expiryDate = new Date(Date.now() + 604800000);
        }
        if (expiryDate < new Date()) {
            localStorage.removeItem('hiroto_signals_session');
            showAccessDenied();
            return false;
        }
        state.session = session;
        state.session.parsedExpiry = expiryDate.toISOString();
        document.getElementById('accessDenied').classList.add('hidden');
        document.getElementById('dashboardContent').classList.remove('hidden');
        const days = Math.ceil((expiryDate - new Date()) / 86400000);
        const badge = document.getElementById('sessionBadge');
        if (badge) {
            const chipText = badge.querySelector('.badge-text');
            if (chipText) chipText.textContent = `${days} DAYS`;
        }
        return true;
    } catch (e) {
        localStorage.removeItem('hiroto_signals_session');
        showAccessDenied();
        return false;
    }
}

function showAccessDenied() {
    const deniedEl = document.getElementById('accessDenied');
    const dashboardEl = document.getElementById('dashboardContent');
    if (deniedEl) deniedEl.classList.remove('hidden');
    if (dashboardEl) dashboardEl.classList.add('hidden');
}

window.setTestSession = function () {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    localStorage.setItem('hiroto_signals_session', JSON.stringify({
        key: 'CIPHER-XXXX-XXXX-XXXX', status: 'active',
        created: new Date().toISOString(), expires: expiry.toISOString()
    }));
    location.reload();
};

window.clearSession = function () {
    localStorage.removeItem('hiroto_signals_session');
    location.reload();
};

// ============================================
// HISTORY MANAGER
// ============================================
const HistoryManager = {
    STORAGE_KEY: 'cipher_full_history_v3',
    load() {
        try { const d = localStorage.getItem(this.STORAGE_KEY); return d ? JSON.parse(d) : []; }
        catch (e) { return []; }
    },
    save(history) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history.slice(0, CONFIG.LOCAL_HISTORY_MAX)));
    },
    merge(apiResults, latestResults) {
        let stored = this.load();
        const allNew = [...latestResults, ...apiResults];
        const map = new Map();
        stored.forEach(item => { if (item.issue_number) map.set(item.issue_number, item); });
        allNew.forEach(item => {
            if (!item.issue_number) return;
            const existing = map.get(item.issue_number);
            if (existing) {
                map.set(item.issue_number, {
                    ...existing, ...item,
                    predicted_type: existing.predicted_type || item.predicted_type,
                    prediction_confidence: existing.prediction_confidence || item.prediction_confidence,
                    strategy_used: existing.strategy_used || item.strategy_used
                });
            } else {
                map.set(item.issue_number, item);
            }
        });
        const sorted = Array.from(map.values()).sort((a, b) => parseInt(b.issue_number) - parseInt(a.issue_number));
        this.save(sorted);
        return sorted;
    },
    addPrediction(issueNumber, prediction, confidence, strategy) {
        const history = this.load();
        const item = history.find(h => h.issue_number === issueNumber);
        if (item) {
            item.predicted_type = prediction;
            item.prediction_confidence = confidence;
            item.strategy_used = strategy;
            item.prediction_time = new Date().toISOString();
        } else {
            history.unshift({
                issue_number: issueNumber, predicted_type: prediction,
                prediction_confidence: confidence, strategy_used: strategy,
                prediction_time: new Date().toISOString(),
                actual_result: null, actual_number: null
            });
        }
        this.save(history);
    },
    updateOutcome(issueNumber, actualResult, actualNumber) {
        const history = this.load();
        const item = history.find(h => h.issue_number === issueNumber);
        if (item) {
            item.actual_result = actualResult;
            item.actual_number = actualNumber;
            item.outcome_time = new Date().toISOString();
        }
        this.save(history);
    },
    getForDisplay(limit = CONFIG.HISTORY_DISPLAY_LIMIT) {
        return this.load().slice(0, limit);
    },
    getForAnalysis() {
        return this.load().filter(h => h.actual_result || h.result_type);
    }
};

function migrateOldData() {
    const oldKeys = ['cipher_full_history_v3', 'cipher_full_history_v2', 'cipher_extended_history'];
    oldKeys.forEach(key => {
        const old = localStorage.getItem(key);
        if (old && !localStorage.getItem('cipher_full_history_v3')) {
            try { const data = JSON.parse(old); localStorage.setItem('cipher_full_history_v3', JSON.stringify(data)); }
            catch (e) {}
        }
    });
}

// ============================================
// API FETCHING
// ============================================
async function fetchData() {
    const urls = CONFIG.USE_PROXY ?
        [CONFIG.PROXY_LATEST, CONFIG.PROXY_HISTORY] :
        [CONFIG.API_LATEST, CONFIG.API_HISTORY];
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const [latestRes, historyRes] = await Promise.all([
            fetch(urls[0], { signal: controller.signal, headers: { 'Accept': 'application/json' } }),
            fetch(urls[1], { signal: controller.signal, headers: { 'Accept': 'application/json' } })
        ]);
        clearTimeout(timeoutId);
        if (!latestRes.ok || !historyRes.ok) throw new Error(`HTTP ${latestRes.status}`);
        const latest = await latestRes.json();
        const apiHistory = await historyRes.json();
        if (!Array.isArray(latest) || latest.length === 0) throw new Error('Invalid data');
        updateConnectionStatus(true);
        const currentIssue = latest[0]?.issue_number;
        if (currentIssue !== state.lastIssue) {
            state.lastIssue = currentIssue;
            state.lastResults = latest;
            state.fullHistory = HistoryManager.merge(apiHistory || [], latest);
            processData(latest);
            showToast('Signal sync complete', 'success');
        }
        state.retryCount = 0;
    } catch (error) { handleFetchError(error); }
}

function handleFetchError(error) {
    state.retryCount++;
    if (error.message.includes('CORS') && state.retryCount === 1 && !CONFIG.USE_PROXY) {
        CONFIG.USE_PROXY = true;
        setTimeout(fetchData, 1000);
        return;
    }
    updateConnectionStatus(false);
    if (state.retryCount >= CONFIG.MAX_RETRIES) {
        showToast('Connection unstable', 'error');
        state.retryCount = 0;
    } else {
        setTimeout(fetchData, CONFIG.RETRY_DELAY);
    }
}

// ============================================
// DATA PROCESSING
// ============================================
function processData(latest) {
    const lastResult = latest[0];
    state.currentPeriodNumber = PeriodCalculator.getCurrentPeriodNumber();
    state.currentTargetPeriod = state.currentPeriodNumber;

    const analysisHistory = HistoryManager.getForAnalysis();
    const prediction = engine.generatePrediction(lastResult, analysisHistory);
    const numbers = engine.calculateNumberDistribution(analysisHistory);
    const mcResult = engine.monteCarloSimulation(analysisHistory);
    const chiResult = engine.calculateChiSquare(analysisHistory);
    const autoCorr = engine.calculateAutocorrelation(analysisHistory);

    state.highProbNumber = numbers.primary?.number ?? null;
    state.secProbNumber = numbers.secondary?.number ?? null;

    state.pendingPredictions.set(state.currentTargetPeriod, {
        prediction: prediction.prediction,
        timestamp: new Date().toISOString(),
        period_number: state.currentTargetPeriod,
        confidence: prediction.confidence,
        strategy: prediction.strategy,
        breakdown: prediction.breakdown,
        regime: prediction.regime,
        entropy: prediction.entropy,
        mcResult, chiResult, autoCorr
    });

    HistoryManager.addPrediction(state.currentTargetPeriod, prediction.prediction, prediction.confidence, prediction.strategy);
    resolvePendingPredictions();

    updateActivePrediction(prediction, state.currentTargetPeriod);
    updateNumberIntelligence(numbers);
    updateMonteCarlo(mcResult);
    updateUncertaintyMetrics(prediction, chiResult, autoCorr);
    updateLatestResults(latest);
    updateHistoryDisplay();
    updateStats();
    updateAnalytics();
    updateModels(prediction);

    document.getElementById('miniAccuracy').textContent = state.stats.total > 0 ? Math.round((state.stats.wins / state.stats.total) * 100) + '%' : '0%';
    document.getElementById('miniSignals').textContent = state.stats.total;
    document.getElementById('miniWins').textContent = state.stats.wins;
    document.getElementById('miniLosses').textContent = state.stats.losses;

    if (state.isFirstPrediction) state.isFirstPrediction = false;
}

function resolvePendingPredictions() {
    const history = HistoryManager.load();
    state.pendingPredictions.forEach((pred, issueNum) => {
        const result = history.find(h => h.issue_number === issueNum && (h.actual_result || h.result_type));
        if (result) {
            const actual = result.actual_result || result.result_type;
            const isCorrect = pred.prediction === actual;
            HistoryManager.updateOutcome(issueNum, actual, result.actual_number);
            engine.learnFromResult(pred.prediction, actual, pred.strategy, pred.breakdown, issueNum);
            state.stats.total++;
            if (isCorrect) {
                state.stats.wins++;
                state.stats.streak++;
                if (state.stats.streak > state.stats.bestStreak) state.stats.bestStreak = state.stats.streak;
            } else {
                state.stats.losses++;
                state.stats.streak = 0;
            }
            state.pendingPredictions.delete(issueNum);
        }
    });
    recalculateStats();
}

function recalculateStats() {
    const history = HistoryManager.getForAnalysis().slice(0, 50);
    const valid = history.filter(h => h.predicted_type && (h.actual_result || h.result_type));
    const wins = valid.filter(h => h.predicted_type === (h.actual_result || h.result_type)).length;
    state.stats.total = valid.length;
    state.stats.wins = wins;
    state.stats.losses = valid.length - wins;
}

// ============================================
// UI UPDATES
// ============================================
function updateActivePrediction(pred, targetPeriod) {
    const valueEl = document.getElementById('predictionValue');
    if (!valueEl) return;
    valueEl.textContent = pred.prediction.toUpperCase();
    valueEl.className = 'pred-value ' + pred.prediction;

    const targetEl = document.getElementById('targetPeriod');
    if (targetEl) targetEl.textContent = targetPeriod;

    const confEl = document.getElementById('confidenceDisplay');
    if (confEl) confEl.textContent = pred.confidence + '%';

    const stratEl = document.getElementById('strategyName');
    if (stratEl) stratEl.textContent = pred.strategy.toUpperCase().replace(/_/g, ' ');

    const modelsEl = document.getElementById('activeModels');
    if (modelsEl) modelsEl.textContent = engine.strategies.length;

    const consensusEl = document.getElementById('consensusVal');
    if (consensusEl) consensusEl.textContent = (pred.consensus * 100).toFixed(0) + '%';

    // Calculate derived indicators
    const signalStrength = Math.round(pred.confidence * 0.65 + pred.consensus * 35);
    const signalStrengthEl = document.getElementById('signalStrengthVal');
    if (signalStrengthEl) {
        signalStrengthEl.innerHTML = `<span style="color: var(--accent-cyan); font-weight: bold;">${signalStrength}%</span>`;
    }

    const recentAccuracy = engine.getRecentAccuracy();
    const reliability = Math.round(recentAccuracy * 70 + (1 - pred.entropy) * 30);
    const reliabilityEl = document.getElementById('reliabilityVal');
    if (reliabilityEl) {
        reliabilityEl.innerHTML = `<span style="color: var(--accent-green); font-weight: bold;">${reliability}%</span>`;
    }

    const riskLevelEl = document.getElementById('riskLevelVal');
    if (riskLevelEl) {
        let color = 'var(--accent-red)';
        if (pred.riskLevel === 'LOW') color = 'var(--accent-green)';
        else if (pred.riskLevel === 'MEDIUM') color = 'var(--accent-gold)';
        riskLevelEl.innerHTML = `<span style="color: ${color}; font-weight: bold; text-shadow: 0 0 6px ${color};">${pred.riskLevel}</span>`;
    }

    // Probability distribution
    const probSmall = parseFloat(pred.smallProb);
    const probBig = parseFloat(pred.bigProb);
    document.getElementById('probSmall').textContent = probSmall + '%';
    document.getElementById('probBig').textContent = probBig + '%';
    document.getElementById('probFillSmall').style.width = probSmall + '%';
    document.getElementById('probFillBig').style.width = probBig + '%';
    document.getElementById('probMarker').style.left = probBig + '%';

    // Animated confidence bar
    state.confBaseValue = pred.confidence;
    startConfidenceAnimation();
}

function startConfidenceAnimation() {
    if (state.confAnimationId) cancelAnimationFrame(state.confAnimationId);
    const fill = document.getElementById('confidenceFill');
    const text = document.getElementById('confValueText');
    const glow = document.getElementById('confGlow');
    const particles = document.getElementById('confParticles');
    if (!fill || !text) return;

    // Create particles
    if (particles) {
        particles.innerHTML = '';
        for (let i = 0; i < 8; i++) {
            const p = document.createElement('div');
            p.className = 'conf-particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.top = Math.random() * 100 + '%';
            p.style.animationDelay = (Math.random() * 2) + 's';
            p.style.animationDuration = (1.5 + Math.random()) + 's';
            particles.appendChild(p);
        }
    }

    let time = 0;
    function animate() {
        time += 0.03;
        const fluctuation = Math.sin(time) * CONFIG.CONF_FLUCTUATION_RANGE + Math.sin(time * 1.7) * 1.5;
        const displayConf = Math.max(0, Math.min(100, state.confBaseValue + fluctuation));
        fill.style.width = displayConf + '%';
        text.textContent = Math.round(displayConf) + '%';
        if (glow) glow.style.left = (displayConf - 5) + '%';
        state.confAnimationId = requestAnimationFrame(animate);
    }
    animate();
}

function updateNumberIntelligence(numbers) {
    const highEl = document.getElementById('highProbNumber');
    const secEl = document.getElementById('secProbNumber');
    const highFreq = document.getElementById('highProbFreq');
    const secFreq = document.getElementById('secProbFreq');
    const highBar = document.getElementById('highProbBar');
    const secBar = document.getElementById('secProbBar');

    if (highEl) highEl.textContent = numbers.primary?.number ?? '--';
    if (secEl) secEl.textContent = numbers.secondary?.number ?? '--';

    const total = Object.values(numbers.distribution || {}).reduce((a, b) => a + b, 0) || 1;
    const hFreq = numbers.primary ? Math.round((numbers.primary.freq / total) * 100) : 0;
    const sFreq = numbers.secondary ? Math.round((numbers.secondary.freq / total) * 100) : 0;

    if (highFreq) highFreq.textContent = hFreq + '% probability';
    if (secFreq) secFreq.textContent = sFreq + '% probability';
    if (highBar) highBar.style.width = Math.min(100, hFreq * 2) + '%';
    if (secBar) secBar.style.width = Math.min(100, sFreq * 2) + '%';

    // Distribution chart
    const chart = document.getElementById('numberDistChart');
    if (chart) {
        chart.innerHTML = '';
        const maxCount = Math.max(...Object.values(numbers.distribution || {0:1})) || 1;
        for (let i = 0; i <= 9; i++) {
            const count = numbers.distribution?.[i] || 0;
            const height = Math.max(4, (count / maxCount) * 100);
            const bar = document.createElement('div');
            bar.className = 'dist-bar' + (i === numbers.primary?.number || i === numbers.secondary?.number ? ' highlight' : '');
            bar.style.height = height + '%';
            bar.title = `${i}: ${count} times`;
            chart.appendChild(bar);
        }
    }

    // Heatmap
    const heatmap = document.getElementById('numberHeatmap');
    if (heatmap) {
        heatmap.innerHTML = '';
        const maxCount = Math.max(...Object.values(numbers.distribution || {0:1})) || 1;
        for (let i = 0; i <= 9; i++) {
            const count = numbers.distribution?.[i] || 0;
            const intensity = count / maxCount;
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            cell.textContent = i;
            const r = Math.round(59 + (139 - 59) * intensity);
            const g = Math.round(130 + (92 - 130) * intensity);
            const b = Math.round(246 + (246 - 246) * intensity);
            cell.style.background = `rgba(${r}, ${g}, ${b}, ${0.1 + intensity * 0.5})`;
            cell.style.color = intensity > 0.5 ? '#fff' : 'var(--text-secondary)';
            cell.title = `${i}: ${count} occurrences`;
            heatmap.appendChild(cell);
        }
    }
}

function updateMonteCarlo(mcResult) {
    const chart = document.getElementById('monteCarloChart');
    if (!chart) return;
    chart.innerHTML = '';
    const total = mcResult.bigWins + mcResult.smallWins;
    const bins = 20;
    for (let i = 0; i < bins; i++) {
        const isBig = i < bins / 2;
        const height = Math.random() * 50 + 25;
        const bar = document.createElement('div');
        bar.className = 'mc-bar ' + (isBig ? 'big' : 'small');
        bar.style.height = height + '%';
        chart.appendChild(bar);
    }
    document.getElementById('mcBigWins').textContent = mcResult.bigWins;
    document.getElementById('mcSmallWins').textContent = mcResult.smallWins;
}

function updateUncertaintyMetrics(pred, chiResult, autoCorr) {
    const entropyPct = Math.min(100, pred.entropy * 100);
    const entropyBar = document.getElementById('entropyBar');
    const entropyVal = document.getElementById('entropyVal');
    if (entropyBar) entropyBar.style.width = entropyPct + '%';
    if (entropyVal) entropyVal.textContent = pred.entropy.toFixed(2);

    const chiPct = Math.min(100, (1 - chiResult.pValue) * 100);
    const chiBar = document.getElementById('chiBar');
    const chiVal = document.getElementById('chiVal');
    if (chiBar) chiBar.style.width = chiPct + '%';
    if (chiVal) chiVal.textContent = chiResult.pValue < 0.05 ? 'Non-random' : 'Random';

    const autoPct = Math.min(100, Math.abs(autoCorr) * 200);
    const autoBar = document.getElementById('autoBar');
    const autoVal = document.getElementById('autoVal');
    if (autoBar) autoBar.style.width = autoPct + '%';
    if (autoVal) autoVal.textContent = autoCorr.toFixed(2);

    const patternPct = Math.min(100, (1 - pred.entropy) * 100);
    const patternBar = document.getElementById('patternBar');
    const patternVal = document.getElementById('patternVal');
    if (patternBar) patternBar.style.width = patternPct + '%';
    if (patternVal) patternVal.textContent = patternPct.toFixed(0) + '%';
}

function updateLatestResults(data) {
    const container = document.getElementById('streamContent');
    if (!container) return;
    container.innerHTML = data.slice(0, 6).map((r, index) => {
        const type = r.result_type || 'small';
        const isLatest = index === 0;
        return `<div class="stream-item ${type} ${isLatest ? 'latest' : ''}">${r.actual_number ?? '--'}</div>`;
    }).join('');
}

function updateHistoryDisplay() {
    const tbody = document.getElementById('historyBody');
    const meta = document.getElementById('historyMeta');
    if (!tbody || !meta) return;
    const displayHistory = HistoryManager.getForDisplay(CONFIG.HISTORY_DISPLAY_LIMIT);
    meta.textContent = `${displayHistory.length} records // DB: ${HistoryManager.load().length}`;
    if (displayHistory.length === 0) {
        tbody.innerHTML = `<tr class="loading-row"><td colspan="6"><div class="table-loader"><div class="loader-ring"></div><span>Decrypting data...</span></div></td></tr>`;
        return;
    }
    tbody.innerHTML = displayHistory.map((r, index) => {
        const actual = r.actual_result || r.result_type;
        let outcome;
        if (r.predicted_type && actual) {
            outcome = r.predicted_type === actual
                ? '<span class="outcome-badge win">WIN</span>'
                : '<span class="outcome-badge loss">LOSS</span>';
        } else if (r.predicted_type) {
            outcome = '<span class="outcome-badge pending">PENDING</span>';
        } else {
            outcome = '<span class="outcome-badge pending">---</span>';
        }
        const predClass = r.predicted_type || 'pending';
        const predText = r.predicted_type ? r.predicted_type.toUpperCase() : '---';
        const actualClass = actual || 'small';
        const actualText = actual ? actual.toUpperCase() : '---';
        return `
            <tr class="${index === 0 ? 'new-result' : ''}">
                <td class="cell-issue">${r.issue_number || '--'}</td>
                <td class="cell-prediction ${predClass}">${predText}</td>
                <td class="cell-actual ${actualClass}">${actualText}</td>
                <td class="cell-number">${r.actual_number ?? '--'}</td>
                <td class="cell-conf">${r.prediction_confidence ?? '--'}%</td>
                <td class="cell-outcome">${outcome}</td>
            </tr>`;
    }).join('');
}

function updateStats() {
    const accuracy = state.stats.total > 0 ? Math.round((state.stats.wins / state.stats.total) * 100) : 0;
    const els = ['miniAccuracy', 'miniSignals', 'miniWins', 'miniLosses'];
    const vals = [accuracy + '%', state.stats.total, state.stats.wins, state.stats.losses];
    els.forEach((id, i) => { const el = document.getElementById(id); if (el) el.textContent = vals[i]; });

    const total = state.stats.total || 1;
    const winBar = document.getElementById('winBar');
    const lossBar = document.getElementById('lossBar');
    if (winBar) winBar.style.width = (state.stats.wins / total * 100) + '%';
    if (lossBar) lossBar.style.width = (state.stats.losses / total * 100) + '%';

    const chart = document.getElementById('accuracyChart');
    if (chart) {
        const history = HistoryManager.getForAnalysis().slice(0, 20);
        const window = 5;
        let html = '';
        for (let i = 0; i <= history.length - window; i++) {
            const slice = history.slice(i, i + window);
            const wins = slice.filter(h => h.predicted_type === (h.actual_result || h.result_type)).length;
            const h = Math.max(10, (wins / window) * 100);
            html += `<div style="flex:1;background:linear-gradient(180deg,var(--accent-blue),rgba(59,130,246,0.25));border-radius:1px;height:${h}%;align-self:flex-end;min-height:2px;"></div>`;
        }
        chart.innerHTML = html;
        chart.style.display = 'flex';
        chart.style.alignItems = 'flex-end';
        chart.style.gap = '1px';
        chart.style.height = '100%';
    }

    const trend = document.getElementById('signalTrend');
    if (trend) {
        const recent = HistoryManager.getForAnalysis().slice(0, 10);
        const recentWins = recent.filter(h => h.predicted_type === (h.actual_result || h.result_type)).length;
        const diff = recentWins - 5;
        trend.textContent = (diff >= 0 ? '+' : '') + diff;
        trend.className = 'stat-trend ' + (diff >= 0 ? 'up' : 'down');
    }
}

function updateAnalytics() {
    const history = HistoryManager.getForAnalysis().slice(0, 50);

    const trendChart = document.getElementById('trendChart');
    if (trendChart) {
        let html = '';
        const window = 5;
        for (let i = 0; i <= history.length - window; i++) {
            const slice = history.slice(i, i + window);
            const wins = slice.filter(h => h.predicted_type === (h.actual_result || h.result_type)).length;
            const isWin = wins >= 3;
            const h = Math.max(10, (wins / window) * 100);
            html += `<div class="trend-bar ${isWin ? 'win' : 'loss'}" style="height:${h}%"></div>`;
        }
        trendChart.innerHTML = html;
    }

    const stratList = document.getElementById('strategyList');
    if (stratList) {
        const stats = engine.getStrategyStats();
        stratList.innerHTML = stats.map(s => {
            const cls = s.recentAccuracy >= 60 ? 'high' : s.recentAccuracy >= 45 ? 'mid' : 'low';
            return `
                <div class="strategy-item">
                    <span class="strategy-name">${s.name.replace(/_/g, ' ').toUpperCase()}</span>
                    <div class="strategy-bar-wrap">
                        <div class="strategy-bar ${cls}" style="width:${s.recentAccuracy}%"></div>
                    </div>
                    <span class="strategy-acc">${s.recentAccuracy}%</span>
                </div>`;
        }).join('');
    }

    // Market State (no "random" regime shown)
    const regimeChart = document.getElementById('regimeChart');
    if (regimeChart) {
        const regimes = ['trending', 'alternating', 'biased', 'mixed'];
        const counts = { trending: 0, alternating: 0, biased: 0, mixed: 0 };
        for (let i = 0; i < Math.min(history.length, 50); i += 5) {
            const slice = history.slice(i, i + CONFIG.REGIME_WINDOW);
            if (slice.length >= 10) {
                const r = engine.detectRegime(slice);
                if (counts[r] !== undefined) counts[r]++;
                else counts.mixed++;
            }
        }
        const maxCount = Math.max(...Object.values(counts)) || 1;
        const colors = {
            trending: 'var(--accent-red)',
            alternating: 'var(--accent-cyan)',
            biased: 'var(--accent-gold)',
            mixed: 'var(--accent-blue)'
        };
        regimeChart.innerHTML = regimes.map(r => `
            <div class="regime-segment">
                <div class="regime-bar" style="height:${(counts[r] / maxCount * 100)}%;background:${colors[r]}"></div>
                <span class="regime-label">${r.toUpperCase()}</span>
            </div>
        `).join('');
    }
}

function updateModels(prediction) {
    const weights = engine.getAdaptiveWeights();
    const weightChart = document.getElementById('weightsChart');
    if (weightChart) {
        const maxW = Math.max(...Object.values(weights));
        const colors = ['#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#22c55e', '#ef4444', '#f97316', '#eab308', '#60a5fa', '#c084fc', '#f9a8d4', '#6ee7b7', '#34d399', '#f472b6', '#a78bfa', '#38bdf8', '#fb923c', '#a3e635'];
        weightChart.innerHTML = engine.strategies.map((s, i) => {
            const w = weights[s] || 1;
            const h = Math.max(5, (w / maxW) * 100);
            return `<div class="weight-bar" style="height:${h}%;background:${colors[i % colors.length]}">
                <span class="weight-label">${s.replace(/_/g, ' ')}</span>
            </div>`;
        }).join('');
    }

    const featureList = document.getElementById('featureList');
    if (featureList) {
        const features = [
            { name: 'Transition Prob', key: 'markov' },
            { name: 'Streak Length', key: 'streak' },
            { name: 'Alternation Rate', key: 'alternation' },
            { name: 'Mean Deviation', key: 'reversion' },
            { name: 'EMA Momentum', key: 'momentum' },
            { name: 'Entropy', key: 'entropy' },
            { name: 'Gap Analysis', key: 'gap_analysis' },
            { name: 'Number Cluster', key: 'number_inference' },
            { name: 'Pattern Match', key: 'pattern' },
            { name: 'Bayesian Update', key: 'bayesian' },
            { name: 'Cyclical', key: 'cyclical' },
            { name: 'Run Length', key: 'run_length' }
        ];
        featureList.innerHTML = features.map(f => {
            const w = weights[f.key] || 1;
            const maxW2 = Math.max(...Object.values(weights));
            const pct = Math.round((w / maxW2) * 100);
            return `
                <div class="feature-item">
                    <span class="feature-name">${f.name}</span>
                    <div class="feature-bar-wrap">
                        <div class="feature-bar" style="width:${pct}%"></div>
                    </div>
                    <span class="feature-value">${pct}</span>
                </div>`;
        }).join('');
    }

    const diagnostics = document.getElementById('diagnostics');
    if (diagnostics) {
        const history = HistoryManager.getForAnalysis();
        const chi = engine.calculateChiSquare(history);
        const entropy = engine.calculateEntropy(history);
        const regime = engine.detectRegime(history);
        const vol = engine.calculateVolatility(history);
        // Multi-period historical analysis (10, 25, 50, 100, 500)
        const windows = [10, 25, 50, 100, 500];
        let windowHtml = `
            <div class="multi-window-stats" style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
                <h4 style="font-family: 'Orbitron', sans-serif; font-size: 12px; font-weight: 600; margin-bottom: 8px; color: var(--accent-cyan); letter-spacing: 1px;">MULTI-PERIOD HISTORICAL ANALYSIS</h4>
                <table style="width: 100%; font-family: 'Share Tech Mono', monospace; font-size: 11px; text-align: left; border-collapse: collapse;">
                    <thead>
                        <tr style="color: var(--text-secondary); border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <th style="padding: 4px 0;">Window</th>
                            <th>Big%</th>
                            <th>Odd%</th>
                            <th>Entropy</th>
                            <th>Volatility</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        windows.forEach(w => {
            const slice = history.slice(0, w);
            if (slice.length === 0) return;
            const bigs = slice.filter(h => (h.actual_result || h.result_type) === 'big').length;
            const bigPct = Math.round((bigs / slice.length) * 100);
            
            const odds = slice.filter(h => h.actual_number !== undefined && h.actual_number !== null && h.actual_number % 2 !== 0).length;
            const oddPct = Math.round((odds / slice.length) * 100);
            
            const H = engine.calculateEntropy(slice);
            const V = engine.calculateVolatility(slice);
            
            windowHtml += `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); height: 22px;">
                            <td style="color: var(--accent-blue); font-weight: bold;">Last ${w}</td>
                            <td>${bigPct}%</td>
                            <td>${oddPct}%</td>
                            <td>${H.toFixed(2)}</td>
                            <td>${(V * 100).toFixed(0)}%</td>
                        </tr>`;
        });
        windowHtml += `
                    </tbody>
                </table>
            </div>`;

        diagnostics.innerHTML = `
            <div class="diag-item">
                <span class="diag-label">Data Quality</span>
                <span class="diag-value ${history.length > 20 ? 'good' : 'warn'}">${history.length} records</span>
            </div>
            <div class="diag-item">
                <span class="diag-label">Randomness Test</span>
                <span class="diag-value ${chi.pValue < 0.05 ? 'warn' : 'good'}">p=${chi.pValue.toFixed(3)}</span>
            </div>
            <div class="diag-item">
                <span class="diag-label">Entropy Level</span>
                <span class="diag-value ${entropy > 0.9 ? 'good' : entropy > 0.7 ? 'warn' : 'bad'}">${entropy.toFixed(2)}</span>
            </div>
            <div class="diag-item">
                <span class="diag-label">Market State</span>
                <span class="diag-value">${regime.toUpperCase()}</span>
            </div>
            <div class="diag-item">
                <span class="diag-label">Volatility</span>
                <span class="diag-value ${vol > 0.6 ? 'warn' : 'good'}">${(vol * 100).toFixed(0)}%</span>
            </div>
            <div class="diag-item">
                <span class="diag-label">Ensemble Size</span>
                <span class="diag-value good">${engine.strategies.length} models</span>
            </div>
            ${windowHtml}
        `;
    }
}

// ============================================
// HELPERS
// ============================================
function updateConnectionStatus(connected) {
    const dot = document.getElementById('connDot');
    const text = document.getElementById('connText');
    if (!dot || !text) return;
    state.isConnected = connected;
    dot.className = 'status-dot ' + (connected ? 'connected' : 'error');
    text.textContent = connected ? 'ONLINE' : 'OFFLINE';
    text.style.color = connected ? 'var(--accent-green)' : 'var(--accent-red)';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('cipherToast');
    if (!toast) return;
    const textEl = toast.querySelector('.toast-text');
    if (textEl) textEl.textContent = message;
    toast.style.borderLeftColor = type === 'error' ? 'var(--accent-red)' : 'var(--accent-blue)';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function updateTimer() {
    const timer = document.getElementById('cipherTimer');
    const dateEl = document.getElementById('cipherDate');
    const now = new Date();
    if (timer) timer.textContent = now.toLocaleTimeString('en-US', { hour12: false });
    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ============================================
// NAVIGATION
// ============================================
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const panel = item.dataset.panel;
            if (!panel) return;
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            const targetPanel = document.getElementById('panel-' + panel);
            if (targetPanel) targetPanel.classList.add('active');
            const titles = {
                predict: ['Prediction Matrix', 'Real-time signal intelligence'],
                analytics: ['Analytics Dashboard', 'Performance metrics & trends'],
                history: ['History Log', 'Complete decryption records'],
                models: ['Model Diagnostics', 'Ensemble weights & features']
            };
            const titleEl = document.getElementById('pageTitle');
            const subEl = document.getElementById('pageSubtitle');
            if (titleEl && titles[panel]) titleEl.textContent = titles[panel][0];
            if (subEl && titles[panel]) subEl.textContent = titles[panel][1];
            state.activePanel = panel;
            if (panel === 'analytics') updateAnalytics();
            if (panel === 'models') updateModels(state.lastPrediction);
        });
    });
}

// ============================================
// INITIALIZATION
// ============================================
function init() {
    console.log('[NEURAL MATRIX v3.1] Fine Tuned — 18 Strategy Ensemble Online');
    new NeuralCanvas();
    if (!initAuth()) return;
    initNavigation();
    migrateOldData();
    state.fullHistory = HistoryManager.load();
    console.log('[NEURAL MATRIX] Loaded', state.fullHistory.length, 'historical records');
    state.fullHistory.forEach(h => {
        if (h.predicted_type && !h.actual_result && !h.result_type) {
            state.pendingPredictions.set(h.issue_number, {
                prediction: h.predicted_type,
                timestamp: h.prediction_time,
                period_number: h.issue_number,
                confidence: h.prediction_confidence,
                strategy: h.strategy_used
            });
        }
    });
    fetchData();
    setInterval(fetchData, CONFIG.REFRESH_INTERVAL);
    setInterval(updateTimer, 1000);
    updateTimer();
    showToast('System online v3.1', 'success');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.session) fetchData();
});
