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

    // Breathing phase timing (4s inhale, 4s hold, 4s exhale)
    const tickBreathing = () => {
        // Increment breath time (loops every 12 seconds)
        breathTime = (breathTime + 1) % 12;

        if (breathTime === 0) {
            // Start Inhale (0-3s)
            ringWrapper.className = 'breathing-ring-wrapper inhale';
            instructionLabel.textContent = 'Breathe In';
        } else if (breathTime === 4) {
            // Start Hold (4-7s)
            ringWrapper.className = 'breathing-ring-wrapper hold';
            instructionLabel.textContent = 'Hold';
        } else if (breathTime === 8) {
            // Start Exhale (8-11s)
            ringWrapper.className = 'breathing-ring-wrapper exhale';
            instructionLabel.textContent = 'Breathe Out';
        }
    };

    // Start breathing cycle initial phase
    const startBreathingCycle = () => {
        // Initial setup matching the current breathTime
        if (breathTime < 4) {
            ringWrapper.className = 'breathing-ring-wrapper inhale';
            instructionLabel.textContent = 'Breathe In';
        } else if (breathTime < 8) {
            ringWrapper.className = 'breathing-ring-wrapper hold';
            instructionLabel.textContent = 'Hold';
        } else {
            ringWrapper.className = 'breathing-ring-wrapper exhale';
            instructionLabel.textContent = 'Breathe Out';
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

    // Initialize timer text display on load
    updateTimerDisplay(secondsLeft);
});
