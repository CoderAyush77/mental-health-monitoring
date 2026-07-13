class WaveformVisualizer {
    constructor() {
        this.canvas = document.getElementById('waveformCanvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.micIcon = document.getElementById('micActivity');
        
        // Live graph canvases
        this.pitchCanvas = document.getElementById('pitchGraphCanvas');
        this.pitchCtx = this.pitchCanvas ? this.pitchCanvas.getContext('2d') : null;
        
        this.loudnessCanvas = document.getElementById('loudnessGraphCanvas');
        this.loudnessCtx = this.loudnessCanvas ? this.loudnessCanvas.getContext('2d') : null;
        
        this.timelineCanvas = document.getElementById('speechTimelineCanvas');
        this.timelineCtx = this.timelineCanvas ? this.timelineCanvas.getContext('2d') : null;
        
        this.animationId = null;
        this.analyzer = null;
        
        // History for graphs
        this.historySize = 200;
        this.pitchHistory = new Array(this.historySize).fill(0);
        this.loudnessHistory = new Array(this.historySize).fill(-100);
        this.speechHistory = new Array(this.historySize).fill(0);
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        if (this.canvas) {
            this.canvas.width = this.canvas.parentElement.clientWidth;
            this.canvas.height = this.canvas.parentElement.clientHeight;
        }
        
        const resizeGraph = (canvas) => {
            if (canvas && canvas.parentElement) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight - 20; // account for label
            }
        };
        
        resizeGraph(this.pitchCanvas);
        resizeGraph(this.loudnessCanvas);
        resizeGraph(this.timelineCanvas);
    }
    
    start(analyzerInstance) {
        this.analyzer = analyzerInstance;
        this.resize(); // Ensure sizes are correct before drawing
        this.draw();
    }
    
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        // Reset mic icon
        if (this.micIcon) {
            this.micIcon.style.transform = `scale(1)`;
            this.micIcon.style.backgroundColor = `rgba(255,255,255,0.1)`;
        }
        this.clearAll();
    }
    
    clearAll() {
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        if (this.pitchCtx && this.pitchCanvas) {
            this.pitchCtx.clearRect(0, 0, this.pitchCanvas.width, this.pitchCanvas.height);
        }
        if (this.loudnessCtx && this.loudnessCanvas) {
            this.loudnessCtx.clearRect(0, 0, this.loudnessCanvas.width, this.loudnessCanvas.height);
        }
        if (this.timelineCtx && this.timelineCanvas) {
            this.timelineCtx.clearRect(0, 0, this.timelineCanvas.width, this.timelineCanvas.height);
        }
    }
    
    resetHistory() {
        this.pitchHistory.fill(0);
        this.loudnessHistory.fill(-100);
        this.speechHistory.fill(0);
    }
    
    draw() {
        if (!this.analyzer || !this.analyzer.isProcessing) return;
        
        this.animationId = requestAnimationFrame(() => this.draw());
        
        const timeData = this.analyzer.getTimeDomainData();
        const freqData = this.analyzer.getFrequencyData();
        const stats = this.analyzer.getStats();
        
        this.drawWaveform(timeData);
        this.updateMicActivity(stats.currentVolume);
        
        // Update history
        this.pitchHistory.push(stats.pitch);
        this.pitchHistory.shift();
        
        this.loudnessHistory.push(stats.currentDb);
        this.loudnessHistory.shift();
        
        this.speechHistory.push(stats.isSpeaking ? 1 : 0);
        this.speechHistory.shift();
        
        this.drawPitchGraph();
        this.drawLoudnessGraph();
        this.drawTimelineGraph();
    }
    
    drawWaveform(data) {
        if (!this.ctx || !this.canvas) return;
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        this.ctx.clearRect(0, 0, width, height);
        
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#638666'; // Using brand color
        
        this.ctx.beginPath();
        
        const sliceWidth = width * 1.0 / data.length;
        let x = 0;
        
        for (let i = 0; i < data.length; i++) {
            const v = data[i] / 128.0;
            const y = v * height / 2;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }
        
        this.ctx.lineTo(width, height / 2);
        this.ctx.stroke();
    }
    
    updateMicActivity(volume) {
        if (!this.micIcon) return;
        
        // Scale from 1 to 1.5 based on volume percent
        const scale = 1 + (volume / 100) * 0.5;
        this.micIcon.style.transform = `scale(${scale})`;
        
        // Change color intensity based on volume
        const alpha = Math.min(0.8, 0.1 + (volume / 100) * 0.7);
        this.micIcon.style.backgroundColor = `rgba(99, 134, 102, ${alpha})`;
    }
    
    drawPitchGraph() {
        if (!this.pitchCtx || !this.pitchCanvas) return;
        
        const ctx = this.pitchCtx;
        const width = this.pitchCanvas.width;
        const height = this.pitchCanvas.height;
        
        ctx.clearRect(0, 0, width, height);
        ctx.beginPath();
        ctx.strokeStyle = '#4299e1';
        ctx.lineWidth = 1.5;
        
        const slice = width / this.historySize;
        let x = 0;
        
        for (let i = 0; i < this.historySize; i++) {
            // Pitch range typically 50 to 500 Hz for human voice
            let val = this.pitchHistory[i];
            let y = height;
            if (val > 0) {
                let normalized = Math.max(0, Math.min(1, (val - 50) / 450));
                y = height - (normalized * height);
            }
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            
            x += slice;
        }
        ctx.stroke();
    }
    
    drawLoudnessGraph() {
        if (!this.loudnessCtx || !this.loudnessCanvas) return;
        
        const ctx = this.loudnessCtx;
        const width = this.loudnessCanvas.width;
        const height = this.loudnessCanvas.height;
        
        ctx.clearRect(0, 0, width, height);
        ctx.beginPath();
        ctx.strokeStyle = '#f56565';
        ctx.lineWidth = 1.5;
        
        const slice = width / this.historySize;
        let x = 0;
        
        for (let i = 0; i < this.historySize; i++) {
            // dB range usually -100 to 0
            let val = this.loudnessHistory[i];
            let normalized = Math.max(0, Math.min(1, (val + 100) / 100));
            let y = height - (normalized * height);
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            
            x += slice;
        }
        ctx.stroke();
    }
    
    drawTimelineGraph() {
        if (!this.timelineCtx || !this.timelineCanvas) return;
        
        const ctx = this.timelineCtx;
        const width = this.timelineCanvas.width;
        const height = this.timelineCanvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        const slice = width / this.historySize;
        let x = 0;
        
        for (let i = 0; i < this.historySize; i++) {
            if (this.speechHistory[i] === 1) {
                ctx.fillStyle = '#48bb78';
                ctx.fillRect(x, 0, Math.ceil(slice), height);
            }
            x += slice;
        }
    }
}
