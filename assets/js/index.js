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

    const loadCheckinForDay = () => {
        const daysAgo = parseInt(daySelect ? daySelect.value : '0');
        const dateStr = getDateStr(daysAgo);
        const history = JSON.parse(localStorage.getItem('moodHistory') || '[]');
        const entry = history.find(e => e.date === dateStr);

        if (entry) {
            // Select mood in UI
            moods.forEach(mood => {
                const name = mood.querySelector('p').textContent.trim();
                if (name === entry.mood) {
                    mood.classList.add('selected');
                } else {
                    mood.classList.remove('selected');
                }
            });
            // Update feedback box
            const feedback = feedbacks[entry.mood];
            if (feedback && feedbackBox) {
                feedbackBox.innerHTML = `<h4>${feedback.emoji}</h4><p>${feedback.text}</p>`;
            }
            if (checkBtn) {
                checkBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Check-in Logged`;
                checkBtn.style.opacity = '0.85';
            }
        } else {
            // No log for this day
            moods.forEach(mood => mood.classList.remove('selected'));
            if (feedbackBox) {
                const dayLabel = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;
                feedbackBox.innerHTML = `<h4>🌿 No record found</h4><p>Select a mood above and click Check-in to log how you felt ${dayLabel}.</p>`;
            }
            if (checkBtn) {
                checkBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Check-in`;
                checkBtn.style.opacity = '1';
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
                const dateStr = getDateStr(daysAgo);

                const history = JSON.parse(localStorage.getItem('moodHistory') || '[]');
                const existingIndex = history.findIndex(e => e.date === dateStr);
                if (existingIndex !== -1) {
                    history[existingIndex].mood = moodName;
                    history[existingIndex].timestamp = new Date().toISOString();
                } else {
                    history.push({
                        date: dateStr,
                        mood: moodName,
                        timestamp: new Date().toISOString()
                    });
                }
                localStorage.setItem('moodHistory', JSON.stringify(history));

                if (daysAgo === 0) {
                    localStorage.setItem('lastCheckedMood', moodName);
                    localStorage.setItem('lastCheckedTime', new Date().toISOString());
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
        const renderJournalHistory = () => {
            const entries = JSON.parse(localStorage.getItem('journalEntries') || '[]');
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
        };

        renderJournalHistory();
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

