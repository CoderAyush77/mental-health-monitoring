class ToneAnalyzer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        
        // History of features to calculate variance/stability
        this.history = {
            pitch: [],
            loudness: []
        };
        
        this.maxHistory = 100; // Store last 100 frames
        
        // Tone characteristics
        this.characteristics = {
            calm: { name: 'Calm', score: 0, color: '#4299e1' },
            energetic: { name: 'Energetic', score: 0, color: '#f56565' },
            soft: { name: 'Soft', score: 0, color: '#9f7aea' },
            strong: { name: 'Strong', score: 0, color: '#ed8936' },
            monotone: { name: 'Monotone', score: 0, color: '#a0aec0' },
            expressive: { name: 'Expressive', score: 0, color: '#48bb78' },
            fast_paced: { name: 'Fast-paced', score: 0, color: '#ecc94b' },
            slow_paced: { name: 'Slow-paced', score: 0, color: '#4fd1c5' }
        };
        
        this.initUI();
    }
    
    initUI() {
        if (!this.container) return;
        this.container.innerHTML = '';
        
        for (const [key, char] of Object.entries(this.characteristics)) {
            const item = document.createElement('div');
            item.className = 'tone-item';
            
            item.innerHTML = `
                <div class="tone-header">
                    <span>${char.name}</span>
                    <span id="score-${key}">0%</span>
                </div>
                <div class="tone-bar-container">
                    <div id="bar-${key}" class="tone-bar-fill" style="background-color: ${char.color}"></div>
                </div>
            `;
            this.container.appendChild(item);
        }
    }
    
    update(stats) {
        // Only update history when speaking
        if (stats.isSpeaking) {
            if (stats.pitch > 0) this.history.pitch.push(stats.pitch);
            this.history.loudness.push(stats.currentDb);
            
            if (this.history.pitch.length > this.maxHistory) this.history.pitch.shift();
            if (this.history.loudness.length > this.maxHistory) this.history.loudness.shift();
        }
        
        // Calculate derived acoustic features
        const pitchVar = this.calculateVariance(this.history.pitch);
        const loudnessVar = this.calculateVariance(this.history.loudness);
        
        // Use standard deviations for more intuitive linear scaling
        const pitchStdDev = Math.sqrt(pitchVar);
        const loudnessStdDev = Math.sqrt(loudnessVar);
        
        const isSpeaking = stats.isSpeaking;
        const volume = stats.currentVolume;
        
        // Heuristic mapping (0-100)
        
        // Calm: Low volume, low pitch variation
        let calmScore = 0;
        if (volume < 60 && pitchStdDev < 30) {
            calmScore = 100 - (volume * 1.0) - (pitchStdDev * 1.5);
        }
        if (!isSpeaking) calmScore = 0;
        this.characteristics.calm.score = this.smooth(this.characteristics.calm.score, Math.max(0, Math.min(100, calmScore)));
        
        // Energetic: High volume, high pitch variation
        let energyScore = (volume * 0.8) + (pitchStdDev * 1.5);
        if (!isSpeaking) energyScore = 0;
        this.characteristics.energetic.score = this.smooth(this.characteristics.energetic.score, Math.max(0, Math.min(100, energyScore)));
        
        // Soft: Very low volume, but only counts if actually speaking
        let softScore = 100 - (volume * 2.5);
        if (volume < 5 || !isSpeaking) softScore = 0; 
        this.characteristics.soft.score = this.smooth(this.characteristics.soft.score, Math.max(0, Math.min(100, softScore)));
        
        // Strong: High volume and dynamic loudness
        let strongScore = (volume * 0.7) + (loudnessStdDev * 5);
        if (!isSpeaking) strongScore = 0;
        this.characteristics.strong.score = this.smooth(this.characteristics.strong.score, Math.max(0, Math.min(100, strongScore)));
        
        // Monotone: Very low pitch variation while speaking
        let monotoneScore = 0;
        if (isSpeaking && this.history.pitch.length > 20) {
            monotoneScore = 100 - (pitchStdDev * 3);
        }
        if (!isSpeaking) monotoneScore = 0;
        this.characteristics.monotone.score = this.smooth(this.characteristics.monotone.score, Math.max(0, Math.min(100, monotoneScore)));
        
        // Expressive: High pitch variation
        let exprScore = (pitchStdDev * 2.5);
        if (!isSpeaking) exprScore = 0;
        this.characteristics.expressive.score = this.smooth(this.characteristics.expressive.score, Math.max(0, Math.min(100, exprScore)));
        
        // Speaking rate estimations based on speaking ratio
        let totalTime = stats.speakingDuration + stats.silenceDuration;
        let speakingRatio = totalTime > 0 ? (stats.speakingDuration / totalTime) : 0;
        
        let fastScore = (speakingRatio * 100 * 0.8) + (volume * 0.2);
        let slowScore = 100 - (speakingRatio * 100);
        
        if (stats.speakingDuration < 2) {
            fastScore = 0;
            slowScore = 0;
        }
        
        this.characteristics.fast_paced.score = this.smooth(this.characteristics.fast_paced.score, Math.max(0, Math.min(100, fastScore)));
        this.characteristics.slow_paced.score = this.smooth(this.characteristics.slow_paced.score, Math.max(0, Math.min(100, slowScore)));
        
        this.render();
    }
    
    render() {
        for (const [key, char] of Object.entries(this.characteristics)) {
            const score = Math.round(char.score);
            const scoreEl = document.getElementById(`score-${key}`);
            const barEl = document.getElementById(`bar-${key}`);
            
            if (scoreEl && barEl) {
                scoreEl.textContent = `${score}%`;
                barEl.style.width = `${score}%`;
            }
        }
    }
    
    smooth(oldVal, newVal) {
        return oldVal * 0.9 + newVal * 0.1;
    }
    
    calculateAverage(arr) {
        if (!arr || arr.length === 0) return 0;
        const sum = arr.reduce((a, b) => a + b, 0);
        return sum / arr.length;
    }
    
    calculateVariance(arr) {
        if (!arr || arr.length < 2) return 0;
        const avg = this.calculateAverage(arr);
        const squareDiffs = arr.map(val => {
            const diff = val - avg;
            return diff * diff;
        });
        return this.calculateAverage(squareDiffs);
    }
    
    getDominantCharacteristic() {
        let maxScore = -1;
        let dominant = 'None';
        
        for (const char of Object.values(this.characteristics)) {
            if (char.score > maxScore) {
                maxScore = char.score;
                dominant = char.name;
            }
        }
        
        if (maxScore < 20) return 'Neutral';
        return dominant;
    }
    
    getConsistencyScore() {
        // High variance in loudness over a long period implies lower consistency
        const loudVar = this.calculateVariance(this.history.loudness);
        let score = 100 - (loudVar * 2);
        return Math.max(0, Math.min(100, Math.round(score)));
    }
    
    // NEW: Map acoustic characteristics to basic emotions for Fusion
    getEmotionProbabilities() {
        const chars = this.characteristics;
        const totalScore = Math.max(1, 
            chars.calm.score + chars.energetic.score + 
            chars.soft.score + chars.strong.score + 
            chars.monotone.score + chars.expressive.score +
            chars.slow_paced.score + chars.fast_paced.score
        );

        // Acoustic mapping rules (avoiding simplistic volume = happy)
        // Sadness: Soft, Slow-paced, Monotone
        let sadProb = (chars.soft.score * 0.5 + chars.slow_paced.score * 0.3 + chars.monotone.score * 0.2) / totalScore;
        
        // Happiness/Joy: Expressive, Energetic (but not purely strong/loud)
        let happyProb = (chars.expressive.score * 0.6 + chars.energetic.score * 0.4) / totalScore;
        
        // Anger: Strong, Fast-paced, Monotone/Harsh
        let angryProb = (chars.strong.score * 0.5 + chars.fast_paced.score * 0.3 + chars.monotone.score * 0.2) / totalScore;
        
        // Fear/Anxiety: Fast-paced, Soft, Expressive (shaky voice)
        let fearProb = (chars.fast_paced.score * 0.4 + chars.soft.score * 0.3 + chars.expressive.score * 0.3) / totalScore;
        
        // Neutral: Calm, average pace
        let neutralProb = (chars.calm.score * 0.7 + (100 - chars.expressive.score) * 0.3) / totalScore;

        // Normalize
        const sum = sadProb + happyProb + angryProb + fearProb + neutralProb + 0.0001; // avoid div by 0
        
        return {
            Sad: Number((sadProb / sum).toFixed(2)),
            Happy: Number((happyProb / sum).toFixed(2)),
            Angry: Number((angryProb / sum).toFixed(2)),
            Fear: Number((fearProb / sum).toFixed(2)),
            Neutral: Number((neutralProb / sum).toFixed(2))
        };
    }

    reset() {
        this.history = { pitch: [], loudness: [] };
        for (const char of Object.values(this.characteristics)) {
            char.score = 0;
        }
        this.render();
    }
}
