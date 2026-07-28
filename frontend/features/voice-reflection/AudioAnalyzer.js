class AudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.isProcessing = false;
        
        // Data arrays
        this.dataArray = null;
        this.timeDomainData = null;
        
        // Settings
        this.fftSize = 2048;
        this.smoothingTimeConstant = 0.8;
        this.silenceThreshold = -50; // dB
        
        // Stats
        this.stats = {
            currentVolume: 0,
            peakVolume: 0,
            avgVolume: 0,
            currentDb: -100,
            pitch: 0,
            isSpeaking: false,
            speakingDuration: 0,
            silenceDuration: 0,
            pauseCount: 0,
            totalEnergy: 0,
            frameCount: 0
        };
        
        this.volumeSum = 0;
        this.lastSpeakingState = false;
        this.lastFrameTime = 0;
    }
    
    init(stream) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        
        this.analyser.fftSize = this.fftSize;
        this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
        
        this.source = this.audioContext.createMediaStreamSource(stream);
        this.source.connect(this.analyser);
        
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.timeDomainData = new Float32Array(this.analyser.fftSize);
        
        this.resetStats();
        this.isProcessing = true;
        this.lastFrameTime = performance.now();
    }
    
    resetStats() {
        this.stats = {
            currentVolume: 0,
            peakVolume: 0,
            avgVolume: 0,
            currentDb: -100,
            pitch: 0,
            isSpeaking: false,
            speakingDuration: 0,
            silenceDuration: 0,
            pauseCount: 0,
            totalEnergy: 0,
            frameCount: 0
        };
        this.volumeSum = 0;
        this.lastSpeakingState = false;
        this.lastFrameTime = performance.now();
    }
    
    process() {
        if (!this.isProcessing) return;
        
        const now = performance.now();
        const dt = (now - this.lastFrameTime) / 1000; // Delta time in seconds
        this.lastFrameTime = now;
        
        this.analyser.getByteFrequencyData(this.dataArray);
        this.analyser.getFloatTimeDomainData(this.timeDomainData);
        
        // Calculate volume and dB
        let rms = 0;
        for (let i = 0; i < this.timeDomainData.length; i++) {
            rms += this.timeDomainData[i] * this.timeDomainData[i];
        }
        rms = Math.sqrt(rms / this.timeDomainData.length);
        
        const db = 20 * Math.log10(Math.max(rms, 0.00001));
        const volumePercent = Math.max(0, Math.min(100, (db + 60) * (100/60))); // Map -60dB -> 0dB to 0% -> 100%
        
        this.stats.currentDb = db;
        this.stats.currentVolume = volumePercent;
        this.stats.totalEnergy += rms;
        
        if (volumePercent > this.stats.peakVolume) {
            this.stats.peakVolume = volumePercent;
        }
        
        this.volumeSum += volumePercent;
        this.stats.frameCount++;
        this.stats.avgVolume = this.volumeSum / this.stats.frameCount;
        
        // Speaking vs Silence detection
        this.stats.isSpeaking = db > this.silenceThreshold;
        
        if (this.stats.isSpeaking) {
            this.stats.speakingDuration += dt;
            if (!this.lastSpeakingState) {
                // Transitioned from silence to speaking, doesn't count as a pause just ending silence
            }
        } else {
            this.stats.silenceDuration += dt;
            if (this.lastSpeakingState) {
                // Transitioned from speaking to silence
                this.stats.pauseCount++;
            }
        }
        this.lastSpeakingState = this.stats.isSpeaking;
        
        // Pitch Estimation (Zero-Crossing Rate approx)
        if (this.stats.isSpeaking) {
            this.stats.pitch = this.autoCorrelate(this.timeDomainData, this.audioContext.sampleRate);
        } else {
            this.stats.pitch = 0;
        }
    }
    
    // Autocorrelation algorithm for pitch detection
    autoCorrelate(buf, sampleRate) {
        let size = buf.length;
        let rms = 0;

        for (let i = 0; i < size; i++) {
            let val = buf[i];
            rms += val * val;
        }
        rms = Math.sqrt(rms / size);
        if (rms < 0.01) return 0; // Not enough signal

        let r1 = 0, r2 = size - 1, thres = 0.2;
        for (let i = 0; i < size / 2; i++)
            if (Math.abs(buf[i]) < thres) { r1 = i; break; }
        for (let i = 1; i < size / 2; i++)
            if (Math.abs(buf[size - i]) < thres) { r2 = size - i; break; }

        buf = buf.slice(r1, r2);
        size = buf.length;

        let c = new Array(size).fill(0);
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size - i; j++) {
                c[i] = c[i] + buf[j] * buf[j + i];
            }
        }

        let d = 0;
        while (c[d] > c[d + 1]) d++;
        let maxval = -1, maxpos = -1;
        for (let i = d; i < size; i++) {
            if (c[i] > maxval) {
                maxval = c[i];
                maxpos = i;
            }
        }
        let T0 = maxpos;

        // Interpolation
        let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
        let a = (x1 + x3 - 2 * x2) / 2;
        let b = (x3 - x1) / 2;
        if (a) T0 = T0 - b / (2 * a);

        let pitch = sampleRate / T0;
        if (pitch < 50 || pitch > 500) return 0; // Human voice range constraint
        return pitch;
    }
    
    getStats() {
        return this.stats;
    }
    
    getFrequencyData() {
        if (!this.analyser) return new Uint8Array(0);
        const data = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(data);
        return data;
    }
    
    getTimeDomainData() {
        if (!this.analyser) return new Uint8Array(0);
        const data = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteTimeDomainData(data);
        return data;
    }
    
    stop() {
        this.isProcessing = false;
        if (this.source) {
            this.source.disconnect();
        }
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}
