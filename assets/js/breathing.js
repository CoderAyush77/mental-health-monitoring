document.addEventListener('DOMContentLoaded', () => {
    // Select HTML elements
    const durationSelect = document.getElementById('durationSelect');
    const startPauseBtn = document.getElementById('startPauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const timeRemaining = document.getElementById('timeRemaining');
    const instructionLabel = document.getElementById('instructionLabel');
    const ringWrapper = document.querySelector('.breathing-ring-wrapper');
    const completionBanner = document.getElementById('completionBanner');
    const playIcon = document.getElementById('playIcon');
    const btnText = document.getElementById('btnText');

    // State variables
    let totalSeconds = parseInt(durationSelect.value, 10);
    let secondsLeft = totalSeconds;
    let isRunning = false;
    let countdownInterval = null;
    let breathInterval = null;
    let breathTime = 0; // Tracks 0-11 seconds of the 12-second cycle

    // Format seconds as MM:SS
    const updateTimerDisplay = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        timeRemaining.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Update session duration from select dropdown
    durationSelect.addEventListener('change', () => {
        totalSeconds = parseInt(durationSelect.value, 10);
        secondsLeft = totalSeconds;
        updateTimerDisplay(secondsLeft);
    });

    // Main countdown tick
    const tickSeconds = () => {
        secondsLeft--;
        updateTimerDisplay(secondsLeft);

        if (secondsLeft <= 0) {
            completeSession();
        }
    };

    // Synthesize a soothing healing chime using Web Audio API
    const playSoothingChime = (pitch = 528) => {
        try {
            const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtxClass) return;
            
            const audioCtx = new AudioCtxClass();
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc1.type = 'sine';
            osc2.type = 'sine';
            
            // Major third chord harmony for a pleasant healing chime
            osc1.frequency.setValueAtTime(pitch, audioCtx.currentTime);
            osc2.frequency.setValueAtTime(pitch * 1.25, audioCtx.currentTime);
            
            // Gentle linear volume decay
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
            
            osc1.start(audioCtx.currentTime);
            osc2.start(audioCtx.currentTime);
            
            osc1.stop(audioCtx.currentTime + 1.2);
            osc2.stop(audioCtx.currentTime + 1.2);
        } catch (e) {
            console.warn("Audio chime play blocked:", e);
        }
    };

    // Soothing text-to-speech voice cue
    const speakInstruction = (text) => {
        try {
            if ('speechSynthesis' in window) {
                // Cancel active speech to avoid overlaps
                window.speechSynthesis.cancel();
                
                const utterance = new SpeechSynthesisUtterance(text);
                
                // Fine-tune rate and pitch for a calm, soothing tone
                utterance.rate = 0.8;   // Slow, relaxing speech rate
                utterance.pitch = 1.0;  // Standard warm pitch
                utterance.volume = 0.55; // Gentle volume
                
                window.speechSynthesis.speak(utterance);
            }
        } catch (e) {
            console.warn("Speech synthesis blocked or not supported:", e);
        }
    };

    // Breathing phase timing (4s inhale, 4s hold, 4s exhale)
    const tickBreathing = () => {
        // Increment breath time (loops every 12 seconds)
        breathTime = (breathTime + 1) % 12;

        if (breathTime === 0) {
            // Start Inhale (0-3s)
            ringWrapper.className = 'breathing-ring-wrapper inhale';
            instructionLabel.textContent = 'Breathe In';
            playSoothingChime(528); // Solfeggio Love/Peace frequency
            speakInstruction('Breathe In');
        } else if (breathTime === 4) {
            // Start Hold (4-7s)
            ringWrapper.className = 'breathing-ring-wrapper hold';
            instructionLabel.textContent = 'Hold';
            playSoothingChime(396); // Grounding/Liberation frequency
            speakInstruction('Hold');
        } else if (breathTime === 8) {
            // Start Exhale (8-11s)
            ringWrapper.className = 'breathing-ring-wrapper exhale';
            instructionLabel.textContent = 'Breathe Out';
            playSoothingChime(417); // Easing stress frequency
            speakInstruction('Breathe Out');
        }
    };

    // Start breathing cycle initial phase
    const startBreathingCycle = () => {
        // Initial setup matching the current breathTime
        if (breathTime < 4) {
            ringWrapper.className = 'breathing-ring-wrapper inhale';
            instructionLabel.textContent = 'Breathe In';
            playSoothingChime(528);
            speakInstruction('Breathe In');
        } else if (breathTime < 8) {
            ringWrapper.className = 'breathing-ring-wrapper hold';
            instructionLabel.textContent = 'Hold';
            playSoothingChime(396);
            speakInstruction('Hold');
        } else {
            ringWrapper.className = 'breathing-ring-wrapper exhale';
            instructionLabel.textContent = 'Breathe Out';
            playSoothingChime(417);
            speakInstruction('Breathe Out');
        }

        // Tick every 1000ms
        breathInterval = setInterval(tickBreathing, 1000);
    };

    // Start exercise
    const startExercise = () => {
        isRunning = true;
        durationSelect.disabled = true;
        resetBtn.disabled = false;

        // Start countdown timer
        countdownInterval = setInterval(tickSeconds, 1000);

        // Start breathing cycle
        startBreathingCycle();

        // UI modifications
        btnText.textContent = 'Pause';
        playIcon.className = 'fa-solid fa-pause';
    };

    // Pause exercise
    const pauseExercise = () => {
        isRunning = false;
        clearInterval(countdownInterval);
        clearInterval(breathInterval);

        // Pause animation in place (keep current classes)
        btnText.textContent = 'Resume';
        playIcon.className = 'fa-solid fa-play';
    };

    // Reset session
    const resetSession = () => {
        isRunning = false;
        clearInterval(countdownInterval);
        clearInterval(breathInterval);
        
        // Reset states
        secondsLeft = totalSeconds;
        breathTime = 0;
        updateTimerDisplay(secondsLeft);
        
        // Reset Ring Classes & Text
        ringWrapper.className = 'breathing-ring-wrapper';
        instructionLabel.textContent = 'Ready';
        
        // Reset Controls UI
        durationSelect.disabled = false;
        resetBtn.disabled = true;
        btnText.textContent = 'Start';
        playIcon.className = 'fa-solid fa-play';

        // Hide completion banner
        completionBanner.classList.remove('active');
    };

    // Complete session
    const completeSession = () => {
        isRunning = false;
        clearInterval(countdownInterval);
        clearInterval(breathInterval);

        // Display completion overlay card
        completionBanner.classList.add('active');
    };

    // Start/Pause button click handler
    startPauseBtn.addEventListener('click', () => {
        if (isRunning) {
            pauseExercise();
        } else {
            startExercise();
        }
    });

    // Reset button click handler
    resetBtn.addEventListener('click', resetSession);

    // Instructions Modal logic
    const instructionsModal = document.getElementById('instructionsModal');
    const showInstructionsBtn = document.getElementById('showInstructionsBtn');
    const closeInstructionsModal = document.getElementById('closeInstructionsModal');
    const gotItBtn = document.getElementById('gotItBtn');

    const openInstructions = () => {
        instructionsModal.classList.add('active');
    };

    const closeInstructions = () => {
        instructionsModal.classList.remove('active');
    };

    showInstructionsBtn.addEventListener('click', openInstructions);
    closeInstructionsModal.addEventListener('click', closeInstructions);
    gotItBtn.addEventListener('click', closeInstructions);

    // Close modal when clicking outside the card
    instructionsModal.addEventListener('click', (e) => {
        if (e.target === instructionsModal) {
            closeInstructions();
        }
    });

    // Show instructions on load
    openInstructions();

    // Initialize timer text display on load
    updateTimerDisplay(secondsLeft);
});
