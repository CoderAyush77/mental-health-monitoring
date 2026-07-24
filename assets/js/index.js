document.addEventListener('DOMContentLoaded', () => {
    // 1. Interactive Mood Selector & Dynamic Feedback
    const moods = document.querySelectorAll('.mood');
    const feedbackBox = document.querySelector('.feedback-box');

    const feedbacks = {
        'Sad': { 
            emoji: '🌿 Take it easy... 💚', 
            text: "It's okay to have low days. Try taking a deep breath, listening to relaxing music, or writing in your journal." 
        },
        'Neutral': { 
            emoji: '✨ Finding balance. ⚖️', 
            text: 'A calm and steady day is a great foundation for mindfulness. What is one small thing you are grateful for today?' 
        },
        'Calm': { 
            emoji: '🌊 Peace of mind. 🧘', 
            text: 'You are in a peaceful state. Enjoy this serenity, carry it with you, and remember to take a deep breath.' 
        },
        'Happy': { 
            emoji: '🌿 Great choice! 😉', 
            text: 'Your positive mindset can make today amazing. Keep smiling and sharing your good vibes!' 
        },
        'Very Happy': { 
            emoji: '☀️ Radiating energy! 🔥', 
            text: 'Keep shining! Your high spirits are contagious and wonderful. It is a perfect day to accomplish your goals!' 
        }
    };

    // Day Selection & Local Storage Logs Setup
    const daySelect = document.getElementById('daySelect');

    const getDateStr = (daysAgo) => {
        const d = new Date();
        d.setDate(d.getDate() - daysAgo);
        return d.toLocaleDateString('en-CA'); // "YYYY-MM-DD" local format
    };

    const loadCheckinForDay = async () => {
        const daysAgo = parseInt(daySelect ? daySelect.value : '0');
        if (daysAgo !== 0) {
            // Backend currently only supports today's checkin status.
            if (feedbackBox) {
                feedbackBox.innerHTML = `<h4>🌿 History</h4><p>Viewing history is currently supported via Analytics page.</p>`;
            }
            moods.forEach(mood => mood.classList.remove('selected'));
            return;
        }

        const currentUserStr = localStorage.getItem('currentUser');
        if (!currentUserStr) return;
        const email = JSON.parse(currentUserStr).email;

        try {
            const response = await fetch(`http://localhost:5000/api/dashboard/checkin/status/${encodeURIComponent(email)}`);
            const data = await response.json();
            
            if (response.ok) {
                if (feedbackBox) {
                    feedbackBox.innerHTML = `<h4>🌿 ${data.button_action}</h4><p>${data.message}</p>`;
                }
                
                if (data.button_action === 'COMPLETED' || data.button_action === 'LOCKED') {
                    // Lock UI or show completed state
                    moods.forEach(mood => mood.style.pointerEvents = 'none');
                } else {
                    moods.forEach(mood => mood.style.pointerEvents = 'auto');
                }
            }
        } catch (error) {
            console.error('Error fetching checkin status:', error);
            if (feedbackBox) {
                feedbackBox.innerHTML = `<h4>🌿 Offline</h4><p>Could not connect to backend.</p>`;
            }
        }
    };

    moods.forEach(mood => {
        mood.addEventListener('click', () => {
            // Remove 'selected' class from all moods
            moods.forEach(m => m.classList.remove('selected'));
            
            // Add 'selected' class to the clicked mood
            mood.classList.add('selected');
            
            // Update feedback box dynamically
            const moodNameElement = mood.querySelector('p');
            if (moodNameElement) {
                const moodName = moodNameElement.textContent.trim();
                const feedback = feedbacks[moodName];
                if (feedback && feedbackBox) {
                    feedbackBox.innerHTML = `<h4>${feedback.emoji}</h4><p>${feedback.text}</p>`;
                }
            }

            // Immediately save to storage/DB
            const daysAgo = parseInt(daySelect ? daySelect.value : '0');
            if (daysAgo === 0) {
                const currentUserStr = localStorage.getItem('currentUser');
                if (currentUserStr) {
                    const email = JSON.parse(currentUserStr).email;
                    fetch('http://localhost:5000/api/dashboard/checkin/confirm', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (feedbackBox) {
                            feedbackBox.innerHTML += `<p style="margin-top: 8px; font-weight: bold; color: var(--primary);">Streak: ${data.new_streak || 0} days!</p>`;
                        }
                    })
                    .catch(error => console.error('Error confirming checkin:', error));
                }
            }
        });
    });

    if (daySelect) {
        daySelect.addEventListener('change', loadCheckinForDay);
    }

    // Load initial checkin state for today
    loadCheckinForDay();

    // 3. Logout Redirect Handlers
    const logoutBtns = document.querySelectorAll('.logout-btn, .logout');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'pages/login.html';
        });
    });

    // 4. Load and Render Journal History
    const journalHistoryList = document.getElementById('journalHistoryList');
    if (journalHistoryList) {
        const renderJournalHistory = async () => {
            const currentUserStr = localStorage.getItem('currentUser');
            if (!currentUserStr) return;
            const email = JSON.parse(currentUserStr).email;

            try {
                const response = await fetch(`http://localhost:5000/api/journal/${encodeURIComponent(email)}`);
                const data = await response.json();
                
                const entries = data.journals || [];
                
                if (entries.length === 0) {
                    journalHistoryList.innerHTML = `
                        <div class="no-history">
                            <div class="no-history-icon">📖</div>
                            <p>No journal entries logged yet.</p>
                            <a href="pages/journal.html" class="no-history-btn">
                                <i class="fa-solid fa-pen-to-square"></i> Write Your First Entry
                            </a>
                        </div>
                    `;
                } else {
                    // Show up to 3 most recent entries
                    const recentEntries = [...entries].reverse().slice(0, 3);
                    journalHistoryList.innerHTML = recentEntries.map(entry => {
                        const escapeHtml = (str) => {
                            if (!str) return '';
                            return str.replace(/&/g, '&amp;')
                                      .replace(/</g, '&lt;')
                                      .replace(/>/g, '&gt;')
                                      .replace(/"/g, '&quot;')
                                      .replace(/'/g, '&#039;');
                        };
                        const title = escapeHtml(entry.title || 'Untitled Reflection');
                        const cleanContent = entry.content || '';
                        const snippet = escapeHtml(cleanContent.length > 110 ? cleanContent.substring(0, 110) + '...' : cleanContent);
                        const date = escapeHtml(entry.date || 'Today');
                        
                        return `
                            <a href="pages/journal.html" class="history-card-link">
                                <div class="history-item">
                                    <div class="history-header">
                                        <h4 class="history-title">${title}</h4>
                                        <span class="history-date">${date}</span>
                                    </div>
                                    <p class="history-content">${snippet}</p>
                                </div>
                            </a>
                        `;
                    }).join('');
                }
            } catch (error) {
                console.error('Error fetching journal history:', error);
                journalHistoryList.innerHTML = `<p>Failed to load journal history.</p>`;
            }
        };

        renderJournalHistory();
    }

    // 5. Render Dashboard Stress Trend Line Chart (Last 7 Days)
    const dashboardCtx = document.getElementById('dashboardStressTrendLine');
    if (dashboardCtx) {
        const days = ["Jul 16", "Jul 17", "Jul 18", "Jul 19", "Jul 20", "Jul 21", "Jul 22"];
        const textData = [1, null, 4, null, 2, null, 2];
        const voiceData = [null, 1, null, 3, null, 1, null]; 

        new Chart(dashboardCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: days,
                datasets: [
                    {
                        label: "Voice",
                        data: voiceData,
                        borderColor: '#38a169',
                        backgroundColor: '#38a169',
                        pointBackgroundColor: '#38a169',
                        borderWidth: 2,
                        tension: 0,
                        spanGaps: true
                    },
                    {
                        label: "Text",
                        data: textData,
                        borderColor: '#805ad5',
                        backgroundColor: '#805ad5',
                        pointBackgroundColor: '#805ad5',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0,
                        spanGaps: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { bottom: 20 } },
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        min: 0.5,
                        max: 4.5,
                        ticks: {
                            stepSize: 1,
                            callback: function (value) {
                                if (value === 1) return 'Low';
                                if (value === 2) return 'Medium';
                                if (value === 3) return 'High';
                                if (value === 4) return 'Extreme';
                                return '';
                            },
                            color: function (context) {
                                if (context.tick.value === 1) return '#38a169'; 
                                if (context.tick.value === 2) return '#dd6b20'; 
                                if (context.tick.value === 3) return '#e53e3e'; 
                                if (context.tick.value === 4) return '#e53e3e'; 
                                return '#718096';
                            },
                            font: { weight: 'bold' }
                        },
                        grid: { color: '#edf2f7', drawBorder: false }
                    },
                    x: {
                        grid: { display: false, drawBorder: true, borderColor: '#cbd5e1' },
                        ticks: { color: '#718096' }
                    }
                }
            },
            plugins: [{
                id: 'customXAxisLabelDashboard',
                afterDraw: (chart) => {
                    const ctx = chart.ctx;
                    ctx.save();
                    ctx.font = '11px Poppins, sans-serif';
                    ctx.textAlign = 'center';

                    const xAxis = chart.scales.x;
                    const yAxis = chart.scales.y;
                    const textY = yAxis.bottom + 35;
                    const textX = (xAxis.left + xAxis.right) / 2;

                    const part0 = "Extreme = 4 (Text), ";
                    const part1 = "High = 3, ";
                    const part2 = "Medium = 2, ";
                    const part3 = "Low = 1";

                    let currentX = textX - 140; 
                    
                    ctx.fillStyle = '#c53030'; 
                    ctx.fillText(part0, currentX + ctx.measureText(part0).width / 2, textY);
                    currentX += ctx.measureText(part0).width;

                    ctx.fillStyle = '#e53e3e'; 
                    ctx.fillText(part1, currentX + ctx.measureText(part1).width / 2, textY);
                    currentX += ctx.measureText(part1).width;

                    ctx.fillStyle = '#dd6b20'; 
                    ctx.fillText(part2, currentX + ctx.measureText(part2).width / 2, textY);
                    currentX += ctx.measureText(part2).width;

                    ctx.fillStyle = '#38a169'; 
                    ctx.fillText(part3, currentX + ctx.measureText(part3).width / 2, textY);
                    ctx.restore();
                }
            }]
        });
    }

});
    // 5. Sidebar Nav Toggle
    const navParent = document.querySelector(".nav-item-parent");
    const navSubmenu = document.querySelector(".nav-submenu");
    if (navParent && navSubmenu) {
        navParent.addEventListener("click", (e) => {
            e.preventDefault();
            const isHidden = navSubmenu.style.display === "none";
            navSubmenu.style.display = isHidden ? "flex" : "none";
            const icon = navParent.querySelector(".parent-icon");
            if (icon) {
                icon.style.transform = isHidden ? "rotate(180deg)" : "rotate(0deg)";
                icon.style.transition = "transform 0.2s";
            }
        });
    }

