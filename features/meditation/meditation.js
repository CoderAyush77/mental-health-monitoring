document.addEventListener('DOMContentLoaded', () => {
    // Select HTML Elements
    const durationSelect = document.getElementById('durationSelect');
    const trackCards = document.querySelectorAll('.track-card');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const countdownLabel = document.getElementById('countdownLabel');
    const trackStatus = document.getElementById('trackStatus');
    const volumeSlider = document.getElementById('volumeSlider');
    const visualizer = document.getElementById('visualizer');
    const completionBanner = document.getElementById('completionBanner');
    const playIcon = document.getElementById('playIcon');

    // State variables
    let totalSeconds = parseInt(durationSelect.value, 10);
    let secondsLeft = totalSeconds;
    let isPlaying = false;
    let selectedTrack = 'serenity'; // Default track matching HTML active card
    
    // Timer intervals
    let countdownInterval = null;

    // Web Audio API variables
    let audioCtx = null;
    let mainGain = null;
    let activeNodes = [];
    let noiseBuffer = null;

    // Format timer display
    const updateTimerDisplay = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        countdownLabel.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Update session duration from selector dropdown
    durationSelect.addEventListener('change', () => {
        totalSeconds = parseInt(durationSelect.value, 10);
        secondsLeft = totalSeconds;
        updateTimerDisplay(secondsLeft);
    });

    // Track card selection handler
    trackCards.forEach(card => {
        card.addEventListener('click', () => {
            if (isPlaying) {
                // Ignore click if playing (or let user know they must stop first)
                alert("Please pause or stop the current session to switch tracks.");
                return;
            }

            // Remove active class from all cards
            trackCards.forEach(c => c.classList.remove('active'));
            // Add active class to clicked card
            card.classList.add('active');
            
            // Set selected track details
            selectedTrack = card.dataset.track;
            const title = card.querySelector('h3').textContent;
            trackStatus.textContent = `Selected: ${title}. Press Play to begin.`;
        });
    });

    // Lazy noise buffer creator (for Ocean Waves)
    const getNoiseBuffer = (ctx) => {
        if (noiseBuffer) return noiseBuffer;
        
        const bufferSize = ctx.sampleRate * 2; // 2 seconds of loop
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        noiseBuffer = buffer;
        return noiseBuffer;
    };

    // Initialize Web Audio API
    const initAudioContext = () => {
        if (audioCtx) return;

        // Standard context
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContextClass();
        
        // Output master volume gain node
        mainGain = audioCtx.createGain();
        mainGain.gain.value = parseFloat(volumeSlider.value);
        mainGain.connect(audioCtx.destination);
    };

    // Synthesize ambient sounds in real time
    const startAudioSynthesis = () => {
        initAudioContext();

        // Resume context if browser suspended it (standard security)
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;

        if (selectedTrack === 'serenity') {
            // Track 1: Morning Serenity (warm ambient drone with slow LFO sweep)
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            const filter = audioCtx.createBiquadFilter();
            
            // Frequencies (A2 and E3 perfect fifth)
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(110, now);
            
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(165, now);

            // Mixer gain nodes for oscs
            const osc1Gain = audioCtx.createGain();
            const osc2Gain = audioCtx.createGain();
            osc1Gain.gain.setValueAtTime(0.4, now);
            osc2Gain.gain.setValueAtTime(0.15, now);

            // Lowpass filter settings
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(220, now);
            
            // Slow LFO to modulate filter cutoff
            const lfo = audioCtx.createOscillator();
            const lfoGain = audioCtx.createGain();
            lfo.frequency.setValueAtTime(0.08, now); // 12s sweep
            lfoGain.gain.setValueAtTime(80, now);    // swing frequency +-80Hz

            // Connections
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);

            osc1.connect(osc1Gain);
            osc2.connect(osc2Gain);
            osc1Gain.connect(filter);
            osc2Gain.connect(filter);
            filter.connect(mainGain);

            // Play oscillators
            osc1.start(now);
            osc2.start(now);
            lfo.start(now);

            // Store nodes to stop later
            activeNodes.push(osc1, osc2, lfo, osc1Gain, osc2Gain, lfoGain, filter);

        } else if (selectedTrack === 'ocean') {
            // Track 2: Ocean Waves (modulated brownian-like noise with 12s wave breathing cycle)
            const buffer = getNoiseBuffer(audioCtx);
            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;
            noise.loop = true;

            const noiseFilter = audioCtx.createBiquadFilter();
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.setValueAtTime(250, now);

            // Gain node to shape waves volume
            const waveGain = audioCtx.createGain();
            waveGain.gain.setValueAtTime(0.15, now);

            // Modulating waves volume
            const waveLfo = audioCtx.createOscillator();
            const waveLfoGain = audioCtx.createGain();
            waveLfo.frequency.setValueAtTime(0.08, now);     // 12s wave cycles
            waveLfoGain.gain.setValueAtTime(0.12, now);      // Volume swing range

            // Connections
            waveLfo.connect(waveLfoGain);
            waveLfoGain.connect(waveGain.gain);

            noise.connect(noiseFilter);
            noiseFilter.connect(waveGain);
            waveGain.connect(mainGain);

            // Start wave
            noise.start(now);
            waveLfo.start(now);

            activeNodes.push(noise, waveLfo, noiseFilter, waveGain, waveLfoGain);

        } else if (selectedTrack === 'binaural') {
            // Track 3: Deep Mind Scan (binaural beat theta waves 100Hz Left / 106Hz Right + 55Hz grounding hum)
            const oscL = audioCtx.createOscillator();
            const oscR = audioCtx.createOscillator();
            const oscHum = audioCtx.createOscillator();

            oscL.type = 'sine';
            oscL.frequency.setValueAtTime(100, now); // Left ear 100Hz

            oscR.type = 'sine';
            oscR.frequency.setValueAtTime(106, now); // Right ear 106Hz (6Hz theta difference)

            oscHum.type = 'sine';
            oscHum. HumFreq = 50;
            oscHum.frequency.setValueAtTime(50, now); // 50Hz deep grounding drone

            const gainL = audioCtx.createGain();
            const gainR = audioCtx.createGain();
            const gainHum = audioCtx.createGain();

            gainL.gain.setValueAtTime(0.25, now);
            gainR.gain.setValueAtTime(0.25, now);
            gainHum.gain.setValueAtTime(0.15, now);

            // Setup Stereo Panners for Binaural beat experience
            if (audioCtx.createStereoPanner) {
                const panL = audioCtx.createStereoPanner();
                const panR = audioCtx.createStereoPanner();
                panL.pan.setValueAtTime(-1, now);
                panR.pan.setValueAtTime(1, now);

                oscL.connect(gainL).connect(panL).connect(mainGain);
                oscR.connect(gainR).connect(panR).connect(mainGain);
            } else {
                // Fallback panner mixing
                oscL.connect(gainL).connect(mainGain);
                oscR.connect(gainR).connect(mainGain);
            }

            oscHum.connect(gainHum).connect(mainGain);

            oscL.start(now);
            oscR.start(now);
            oscHum.start(now);

            activeNodes.push(oscL, oscR, oscHum, gainL, gainR, gainHum);
        } else if (selectedTrack === 'soothing') {
            // Track 4: Soothing Melodies (Zen ambient music chord generator)
            // Define ambient chord progression notes (A minor 9, F maj 9, C maj 7, G 6)
            const chords = [
                [220, 261.63, 329.63, 392, 493.88], // Am9 (A3, C4, E4, G4, B4)
                [174.61, 220, 261.63, 329.63, 392], // Fmaj9 (F3, A3, C4, E4, G4)
                [130.81, 196, 261.63, 329.63, 493.88], // Cmaj7 (C3, G3, C4, E4, B4)
                [196, 246.94, 293.66, 392, 440]       // G6 (G3, B3, D4, G4, A4)
            ];

            let chordIndex = 0;

            const playAmbientChord = () => {
                // Ensure audio context is running when chord triggers
                if (!audioCtx || audioCtx.state === 'suspended') return;
                
                const chord = chords[chordIndex];
                const startTime = audioCtx.currentTime;

                // Schedule notes of the chord to arpeggiate gently
                chord.forEach((freq, idx) => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, startTime + idx * 0.3); // arpeggiate notes

                    // Smooth volume envelope (fade in and out like a wind chime)
                    gain.gain.setValueAtTime(0, startTime + idx * 0.3);
                    gain.gain.linearRampToValueAtTime(0.05, startTime + idx * 0.3 + 0.6); // attack
                    gain.gain.exponentialRampToValueAtTime(0.001, startTime + idx * 0.3 + 4.5); // long decay

                    osc.connect(gain).connect(mainGain);
                    osc.start(startTime + idx * 0.3);
                    osc.stop(startTime + idx * 0.3 + 5.0);

                    activeNodes.push(osc, gain);
                });

                // Cycle to the next chord arpeggio
                chordIndex = (chordIndex + 1) % chords.length;
            };

            // Trigger arpeggio immediately
            playAmbientChord();

            // Loop arpeggiations every 6 seconds
            const chordLoop = setInterval(playAmbientChord, 6000);
            
            // Push an interface to stop the interval loop during cleanup
            activeNodes.push({
                stop: () => clearInterval(chordLoop),
                disconnect: () => {}
            });
        }
    };

    // Stop ambient sound synthesis
    const stopAudioSynthesis = () => {
        activeNodes.forEach(node => {
            try {
                node.stop();
            } catch (e) {}
            try {
                node.disconnect();
            } catch (e) {}
        });
        activeNodes = [];
    };

    // Adjust master volume gain
    volumeSlider.addEventListener('input', () => {
        const val = parseFloat(volumeSlider.value);
        if (mainGain) {
            mainGain.gain.setValueAtTime(val, audioCtx.currentTime);
        }
    });

    // Handle session timer countdown ticks
    const tickSessionSeconds = () => {
        secondsLeft--;
        updateTimerDisplay(secondsLeft);

        if (secondsLeft <= 0) {
            completeMeditationSession();
        }
    };

    // Start playing meditation
    const startMeditation = () => {
        isPlaying = true;
        durationSelect.disabled = true;
        stopBtn.disabled = false;

        // Update track labels
        const activeCardName = document.querySelector('.track-card.active h3').textContent;
        trackStatus.textContent = `Playing: ${activeCardName}... Breathe gently.`;

        // Start countdown timer ticks
        countdownInterval = setInterval(tickSessionSeconds, 1000);

        // Turn on real-time audio synthesis
        startAudioSynthesis();

        // Enable visualizer wave animation
        visualizer.classList.add('playing');

        // Play/Pause button updates
        playPauseBtn.innerHTML = '<i class="fa-solid fa-pause" id="playIcon"></i> Pause';
    };

    // Pause meditation session
    const pauseMeditation = () => {
        isPlaying = false;
        clearInterval(countdownInterval);
        
        // Pause audio
        stopAudioSynthesis();

        // Halt wave animations
        visualizer.classList.remove('playing');

        trackStatus.textContent = 'Session paused. Click Play to resume.';
        playPauseBtn.innerHTML = '<i class="fa-solid fa-play" id="playIcon"></i> Resume';
    };

    // Complete meditation session
    const completeMeditationSession = () => {
        isPlaying = false;
        clearInterval(countdownInterval);
        stopAudioSynthesis();
        visualizer.classList.remove('playing');

        // Show completion overlay card
        completionBanner.classList.add('active');
    };

    // Full stop session resets controls
    const stopMeditation = () => {
        isPlaying = false;
        clearInterval(countdownInterval);
        stopAudioSynthesis();
        visualizer.classList.remove('playing');

        secondsLeft = totalSeconds;
        updateTimerDisplay(secondsLeft);

        durationSelect.disabled = false;
        stopBtn.disabled = true;

        trackStatus.textContent = 'Select a track and press play';
        playPauseBtn.innerHTML = '<i class="fa-solid fa-play" id="playIcon"></i> Play';
        completionBanner.classList.remove('active');
    };

    // Play/Pause trigger handler
    playPauseBtn.addEventListener('click', () => {
        if (isPlaying) {
            pauseMeditation();
        } else {
            startMeditation();
        }
    });

    // Stop trigger handler
    stopBtn.addEventListener('click', stopMeditation);

    // Initial display sync on load
    updateTimerDisplay(secondsLeft);
});
