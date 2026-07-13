import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const btnRecord = document.getElementById('btnRecord');
    const btnPause = document.getElementById('btnPause');
    const btnResume = document.getElementById('btnResume');
    const btnStop = document.getElementById('btnStop');
    const btnCancel = document.getElementById('btnCancel');
    
    const statusIndicator = document.getElementById('voiceStatusIndicator');
    const statusText = document.getElementById('voiceStatusText');
    const timerDisplay = document.getElementById('voiceTimer');
    
    const playbackControls = document.getElementById('playbackControls');
    const audioPlayback = document.getElementById('audioPlayback');
    const btnDownload = document.getElementById('btnDownload');
    
    const liveGraphsPanel = document.getElementById('liveGraphsPanel');
    const toneAnalysisPanel = document.getElementById('toneAnalysisPanel');
    const voiceSummaryCard = document.getElementById('voiceSummaryCard');
    
    // Action buttons
    const btnAutofillJournal = document.getElementById('btnAutofillJournal');
    const btnSaveToDatabase = document.getElementById('btnSaveToDatabase');
    
    // Stats elements
    const statActivity = document.getElementById('statActivity');
    const statCurrVol = document.getElementById('statCurrVol');
    const statPeakVol = document.getElementById('statPeakVol');
    const statPitch = document.getElementById('statPitch');
    const statLoudness = document.getElementById('statLoudness');
    const statSpeakTime = document.getElementById('statSpeakTime');
    const statSilentTime = document.getElementById('statSilentTime');
    const statPauses = document.getElementById('statPauses');
    
    // Classes
    const audioAnalyzer = new AudioAnalyzer();
    const toneAnalyzer = new ToneAnalyzer('toneGrid');
    const visualizer = new WaveformVisualizer();
    
    // State
    let mediaRecorder = null;
    let audioChunks = [];
    let audioBlob = null;
    let audioUrl = null;
    let stream = null;
    
    let timerInterval = null;
    let secondsElapsed = 0;
    
    let statsInterval = null;

    // Web Speech API
    let recognition = null;
    let currentTranscript = "";

    // Chart instances
    let voiceChartInst = null;
    let textChartInst = null;
    
    // Initialization
    function init() {
        btnRecord.addEventListener('click', startRecording);
        btnPause.addEventListener('click', pauseRecording);
        btnResume.addEventListener('click', resumeRecording);
        btnStop.addEventListener('click', stopRecording);
        btnCancel.addEventListener('click', cancelRecording);
        btnDownload.addEventListener('click', downloadRecording);

        if (btnAutofillJournal) btnAutofillJournal.addEventListener('click', handleAutofillJournal);
        if (btnSaveToDatabase) btnSaveToDatabase.addEventListener('click', handleSaveToDatabase);

        // Init Speech Recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';
            
            recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    currentTranscript += finalTranscript + ' ';
                }
            };
        } else {
            console.warn("Web Speech API not supported in this browser.");
        }
    }
    
    async function startRecording() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Setup MediaRecorder
            let options = { mimeType: 'audio/webm;codecs=opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = { mimeType: 'audio/webm' };
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options = { mimeType: '' }; // Fallback to browser default
                }
            }
            
            mediaRecorder = new MediaRecorder(stream, options);
            audioChunks = [];
            currentTranscript = "";
            
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunks.push(e.data);
                }
            };
            
            mediaRecorder.onstop = handleRecordingStop;
            
            // Start analysis
            audioAnalyzer.init(stream);
            toneAnalyzer.reset();
            visualizer.start(audioAnalyzer);
            
            if (recognition) {
                try { recognition.start(); } catch(e) { console.error("Could not start recognition", e); }
            }

            mediaRecorder.start(100); // Collect data every 100ms
            
            // Update UI
            updateUIState('recording');
            startTimer();
            startStatsUpdater();
            
            // Show live panels, hide summary
            liveGraphsPanel.style.display = 'grid';
            toneAnalysisPanel.style.display = 'block';
            voiceSummaryCard.style.display = 'none';
            playbackControls.style.display = 'none';
            
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
                audioUrl = null;
            }
            
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Could not access the microphone. Please ensure permissions are granted.');
        }
    }
    
    function pauseRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.pause();
            audioAnalyzer.isProcessing = false;
            updateUIState('paused');
            clearInterval(timerInterval);
            if (recognition) recognition.stop();
        }
    }
    
    function resumeRecording() {
        if (mediaRecorder && mediaRecorder.state === 'paused') {
            mediaRecorder.resume();
            audioAnalyzer.isProcessing = true;
            audioAnalyzer.lastFrameTime = performance.now();
            updateUIState('recording');
            startTimer();
            if (recognition) {
                try { recognition.start(); } catch(e) {}
            }
        }
    }
    
    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            audioAnalyzer.stop();
            visualizer.stop();
            stopStream();
            
            updateUIState('finished');
            stopTimer();
            stopStatsUpdater();
            if (recognition) recognition.stop();
            
            updateLiveStats();
        }
    }
    
    function cancelRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        audioAnalyzer.stop();
        visualizer.stop();
        stopStream();
        if (recognition) recognition.stop();
        
        audioChunks = [];
        updateUIState('ready');
        stopTimer();
        secondsElapsed = 0;
        updateTimerDisplay();
        stopStatsUpdater();
        
        liveGraphsPanel.style.display = 'none';
        toneAnalysisPanel.style.display = 'none';
        voiceSummaryCard.style.display = 'none';
        playbackControls.style.display = 'none';
    }
    
    function stopStream() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    }
    
    function handleRecordingStop() {
        if (audioChunks.length === 0) return; // Cancelled
        
        const type = mediaRecorder.mimeType || 'audio/webm';
        audioBlob = new Blob(audioChunks, { type: type });
        audioUrl = URL.createObjectURL(audioBlob);
        
        audioPlayback.src = audioUrl;
        playbackControls.style.display = 'flex';
        
        showSummaryCard();
        runClientSideAnalysis();
    }
    
    function downloadRecording() {
        if (!audioUrl) return;
        
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = audioUrl;
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        
        let ext = 'webm';
        if (audioBlob.type.includes('mp4')) ext = 'mp4';
        else if (audioBlob.type.includes('ogg')) ext = 'ogg';
        
        a.download = `voice-journal-${dateStr}-${timeStr}.${ext}`;
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
        }, 100);
    }
    
    function handleAutofillJournal() {
        const titleInput = document.getElementById('entryTitle');
        const contentInput = document.getElementById('entryContent');
        
        if (titleInput && contentInput) {
            if (titleInput.disabled) {
                alert("You've already written a journal entry today!");
                return;
            }

            const emotion = document.getElementById('finalEmotion').textContent || 'Reflection';
            const transcript = document.getElementById('transcriptBox').textContent.replace(/"/g, '').trim();
            const reason = document.getElementById('reasonText').textContent.replace(/"/g, '').trim();

            const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            titleInput.value = `Voice Reflection - ${dateStr} (${emotion})`;
            contentInput.value = `Transcript:\n"${transcript}"\n\nAI Analysis:\n${reason}`;

            // Scroll to the top reflection card to see the autofilled content
            document.querySelector('.reflection-card').scrollIntoView({ behavior: 'smooth' });
        }
    }

    function handleSaveToDatabase() {
        // Use the autofill logic if the fields are empty
        const titleInput = document.getElementById('entryTitle');
        const contentInput = document.getElementById('entryContent');
        
        if (titleInput && contentInput && (!titleInput.value || !contentInput.value) && !titleInput.disabled) {
            handleAutofillJournal();
        }

        const titleVal = titleInput ? titleInput.value.trim() : '';
        const contentVal = contentInput ? contentInput.value.trim() : '';

        if (!titleVal || !contentVal) {
            alert('Cannot save. The journal entry is empty.');
            return;
        }

        const today = new Date();
        const formattedDate = today.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
        const formattedTime = today.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        const entries = JSON.parse(localStorage.getItem('journalEntries') || '[]');
        
        // Prevent duplicate saving for the same day (similar to the journal.js logic)
        const hasWrittenToday = entries.some(entry => entry.date === formattedDate);
        if (hasWrittenToday) {
            alert('You have already saved a journal entry for today!');
            return;
        }

        const newEntry = {
            id: Date.now(),
            title: titleVal,
            content: contentVal,
            date: formattedDate,
            time: formattedTime,
            source: 'voice'
        };
        
        entries.push(newEntry);
        localStorage.setItem('journalEntries', JSON.stringify(entries));

        // Clear form and disable it
        if (titleInput) {
            titleInput.value = 'Daily Check-in Complete';
            titleInput.disabled = true;
        }
        if (contentInput) {
            contentInput.value = 'You have already written your journal entry for today! Great job staying consistent with your mindfulness routine. Come back tomorrow to write again.';
            contentInput.disabled = true;
        }

        // Disable save button and change text
        if (btnSaveToDatabase) {
            btnSaveToDatabase.disabled = true;
            btnSaveToDatabase.innerHTML = '<i class="fa-solid fa-check"></i> Saved successfully';
            btnSaveToDatabase.style.background = 'linear-gradient(135deg, #a0aec0, #718096)';
        }

        alert('Your voice reflection has been saved to the database (simulated with local storage)!');
        window.location.href = '../index.html';
    }
    
    // --- UI Helpers ---
    
    function updateUIState(state) {
        statusIndicator.className = 'status-indicator';
        btnRecord.disabled = true;
        btnPause.disabled = true;
        btnResume.style.display = 'none';
        btnPause.style.display = 'flex';
        btnStop.disabled = true;
        btnCancel.disabled = true;
        
        switch (state) {
            case 'ready':
                statusIndicator.classList.add('ready');
                statusText.textContent = 'Ready';
                btnRecord.disabled = false;
                break;
            case 'recording':
                statusIndicator.classList.add('recording');
                statusText.textContent = 'Recording...';
                btnPause.disabled = false;
                btnStop.disabled = false;
                btnCancel.disabled = false;
                break;
            case 'paused':
                statusIndicator.classList.add('paused');
                statusText.textContent = 'Paused';
                btnPause.style.display = 'none';
                btnResume.style.display = 'flex';
                btnStop.disabled = false;
                btnCancel.disabled = false;
                break;
            case 'finished':
                statusIndicator.classList.add('finished');
                statusText.textContent = 'Finished';
                btnRecord.disabled = false;
                break;
        }
    }
    
    function startTimer() {
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            secondsElapsed++;
            updateTimerDisplay();
        }, 1000);
    }
    
    function stopTimer() {
        clearInterval(timerInterval);
    }
    
    function updateTimerDisplay() {
        const hrs = Math.floor(secondsElapsed / 3600);
        const mins = Math.floor((secondsElapsed % 3600) / 60);
        const secs = secondsElapsed % 60;
        
        timerDisplay.textContent = 
            `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    function startStatsUpdater() {
        stopStatsUpdater();
        statsInterval = setInterval(() => {
            updateLiveStats();
        }, 100);
    }
    
    function stopStatsUpdater() {
        clearInterval(statsInterval);
    }
    
    function updateLiveStats() {
        if (!audioAnalyzer) return;
        
        audioAnalyzer.process();
        const stats = audioAnalyzer.getStats();
        
        toneAnalyzer.update(stats);
        
        statActivity.textContent = stats.isSpeaking ? 'Speaking' : 'Silent';
        statActivity.style.color = stats.isSpeaking ? '#48bb78' : '#a0aec0';
        
        statPitch.textContent = `${Math.round(stats.pitch)} Hz`;
        statLoudness.textContent = `${Math.round(stats.currentDb)} dB`;
        
        statCurrVol.textContent = `${Math.round(stats.currentVolume)}%`;
        statPeakVol.textContent = `${Math.round(stats.peakVolume)}%`;
        
        statSpeakTime.textContent = `${stats.speakingDuration.toFixed(1)}s`;
        statSilentTime.textContent = `${stats.silenceDuration.toFixed(1)}s`;
        statPauses.textContent = stats.pauseCount;
    }
    
    function showSummaryCard() {
        liveGraphsPanel.style.display = 'none';
        toneAnalysisPanel.style.display = 'none';
        
        voiceSummaryCard.style.display = 'block';
        document.getElementById('aiLoadingOverlay').style.display = 'flex';
        document.getElementById('aiResultsContainer').style.display = 'none';
        document.getElementById('aiLoadingSubtext').textContent = "Initializing Transformers.js models (may take a moment on first run)...";
    }

    // AI Pipeline & Fusion logic
    let emotionPipeline = null;

    async function runClientSideAnalysis() {
        try {
            // 1. Get Text Emotion via Transformers.js
            let nlpResult = null;
            const textToAnalyze = currentTranscript.trim() || "I am feeling okay.";
            
            if (!emotionPipeline) {
                // Initialize the sentiment analysis pipeline
                emotionPipeline = await pipeline('text-classification', 'Xenova/bert-base-uncased-emotion');
            }
            
            document.getElementById('aiLoadingSubtext').textContent = "Analyzing speech patterns...";
            
            // Run prediction
            // The model outputs an array of objects e.g. [{label: 'sadness', score: 0.8}, ...]
            // By default top_k=1, but we can request all by passing { topk: null } to return all classes
            const out = await emotionPipeline(textToAnalyze, { topk: null });
            
            // Map Xenova classes to our basic classes
            // Xenova emotions: anger, fear, joy, sadness, surprise, love
            let textEmotion = { Sad: 0, Happy: 0, Angry: 0, Fear: 0, Neutral: 0.1 };
            
            out.forEach(pred => {
                if (pred.label === 'sadness') textEmotion.Sad = pred.score;
                if (pred.label === 'joy' || pred.label === 'love') textEmotion.Happy += pred.score;
                if (pred.label === 'anger') textEmotion.Angry = pred.score;
                if (pred.label === 'fear' || pred.label === 'surprise') textEmotion.Fear += pred.score;
            });

            // Normalize text emotions
            const sumText = Object.values(textEmotion).reduce((a, b) => a + b, 0);
            for (let k in textEmotion) textEmotion[k] = textEmotion[k] / sumText;

            // 2. Get Voice Emotion from ToneAnalyzer
            const voiceEmotion = toneAnalyzer.getEmotionProbabilities();

            // 3. FUSION ENGINE
            // Weighted combination: 65% Text, 35% Voice
            const W_TEXT = 0.65;
            const W_VOICE = 0.35;

            const fusedEmotion = {
                Sad: (textEmotion.Sad * W_TEXT) + (voiceEmotion.Sad * W_VOICE),
                Happy: (textEmotion.Happy * W_TEXT) + (voiceEmotion.Happy * W_VOICE),
                Angry: (textEmotion.Angry * W_TEXT) + (voiceEmotion.Angry * W_VOICE),
                Fear: (textEmotion.Fear * W_TEXT) + (voiceEmotion.Fear * W_VOICE),
                Neutral: (textEmotion.Neutral * W_TEXT) + (voiceEmotion.Neutral * W_VOICE)
            };

            // Find Dominant
            let dominantLabel = 'Neutral';
            let maxScore = 0;
            for (const [emo, score] of Object.entries(fusedEmotion)) {
                if (score > maxScore) {
                    maxScore = score;
                    dominantLabel = emo;
                }
            }

            // Determine Risk
            let riskLevel = "Low";
            let recommendation = "You seem to be doing well. Keep tracking your mood.";
            let reason = `Speech and transcript indicate a ${dominantLabel} emotional state.`;

            if (fusedEmotion.Sad > 0.4 || fusedEmotion.Fear > 0.4 || fusedEmotion.Angry > 0.5) {
                riskLevel = "Moderate";
                recommendation = "Consider taking a break, trying a breathing exercise, or reaching out to a friend.";
                reason = `High levels of ${dominantLabel.toLowerCase()} detected in both vocal tone and vocabulary.`;
            }
            if (fusedEmotion.Sad > 0.7 || fusedEmotion.Fear > 0.7) {
                riskLevel = "High Emotional Distress";
                recommendation = "Please consider reaching out to a professional or someone you trust. Your mental health is important.";
                reason = "Severe distress indicators found. Lexical choice and acoustic pauses point to significant emotional burden.";
            }

            const finalData = {
                emotion: dominantLabel,
                confidence: maxScore,
                voice_emotion: voiceEmotion,
                text_emotion: textEmotion,
                mental_health_risk: riskLevel,
                reason: reason,
                recommendation: recommendation,
                transcript: textToAnalyze
            };

            renderEmotionAnalysis(finalData);

        } catch (error) {
            console.error('Error in ML Pipeline:', error);
            document.getElementById('aiLoadingOverlay').innerHTML = `<h3>Error in AI Analysis</h3><p>${error.message}</p>`;
        }
    }

    function renderEmotionAnalysis(data) {
        document.getElementById('aiLoadingOverlay').style.display = 'none';
        document.getElementById('aiResultsContainer').style.display = 'block';

        // 1. Emotion & Confidence
        const finalEmotionEl = document.getElementById('finalEmotion');
        finalEmotionEl.textContent = data.emotion;
        
        let color = '#4299e1'; 
        if (data.emotion === 'Sad') color = '#667eea';
        if (data.emotion === 'Happy') color = '#48bb78';
        if (data.emotion === 'Angry') color = '#f56565';
        if (data.emotion === 'Fear') color = '#9f7aea';
        finalEmotionEl.style.color = color;
        
        document.getElementById('finalConfidence').textContent = `Confidence: ${(data.confidence * 100).toFixed(0)}%`;

        // 2. Risk Meter
        const riskLevelText = document.getElementById('riskLevelText');
        const riskBar = document.getElementById('riskBar');
        riskLevelText.textContent = data.mental_health_risk;
        
        let riskColor = '#48bb78';
        let riskWidth = '20%';
        if (data.mental_health_risk === 'Moderate') {
            riskColor = '#ed8936';
            riskWidth = '60%';
        } else if (data.mental_health_risk === 'High' || data.mental_health_risk === 'High Emotional Distress') {
            riskColor = '#e53e3e';
            riskWidth = '95%';
        }
        
        riskLevelText.style.color = riskColor;
        riskBar.style.backgroundColor = riskColor;
        setTimeout(() => {
            riskBar.style.width = riskWidth;
        }, 100);

        document.getElementById('recommendationText').textContent = data.recommendation;
        document.getElementById('reasonText').textContent = `"${data.reason}"`;
        document.getElementById('transcriptBox').textContent = `"${data.transcript}"`;

        // 3. Render Charts
        renderCharts(data);
    }

    function renderCharts(data) {
        if (voiceChartInst) voiceChartInst.destroy();
        if (textChartInst) textChartInst.destroy();

        const radarOptions = {
            responsive: true,
            maintainAspectRatio: false,
            scales: { r: { min: 0, max: 1, ticks: { display: false } } },
            plugins: { legend: { display: false } }
        };

        const ctxVoice = document.getElementById('voiceEmotionChart').getContext('2d');
        const voiceKeys = Object.keys(data.voice_emotion);
        const voiceVals = Object.values(data.voice_emotion);
        voiceChartInst = new Chart(ctxVoice, {
            type: 'radar',
            data: {
                labels: voiceKeys,
                datasets: [{
                    label: 'Acoustic Features (Voice)',
                    data: voiceVals,
                    backgroundColor: 'rgba(66, 153, 225, 0.3)',
                    borderColor: 'rgba(66, 153, 225, 1)',
                    pointBackgroundColor: 'rgba(66, 153, 225, 1)'
                }]
            },
            options: radarOptions
        });

        const ctxText = document.getElementById('textEmotionChart').getContext('2d');
        const textKeys = Object.keys(data.text_emotion);
        const textVals = Object.values(data.text_emotion);
        textChartInst = new Chart(ctxText, {
            type: 'radar',
            data: {
                labels: textKeys,
                datasets: [{
                    label: 'Linguistic Features (Text)',
                    data: textVals,
                    backgroundColor: 'rgba(159, 122, 234, 0.3)',
                    borderColor: 'rgba(159, 122, 234, 1)',
                    pointBackgroundColor: 'rgba(159, 122, 234, 1)'
                }]
            },
            options: radarOptions
        });
    }

    // Run Init
    init();
});
