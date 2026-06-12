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
        });
    });

    // 2. Check-in Button Interaction (Open Choice Modal)
    const checkBtn = document.querySelector('.check-btn');
    const checkinModal = document.getElementById('checkinModal');
    const closeCheckinModal = document.getElementById('closeCheckinModal');

    const openModal = () => {
        if (checkinModal) {
            checkinModal.classList.add('active');
            if (checkBtn) {
                checkBtn.classList.add('active');
            }
        }
    };

    const closeModal = () => {
        if (checkinModal) {
            checkinModal.classList.remove('active');
            if (checkBtn) {
                checkBtn.classList.remove('active');
            }
        }
    };

    if (checkBtn) {
        checkBtn.addEventListener('click', () => {
            const selectedMood = document.querySelector('.mood.selected p');
            const moodName = selectedMood ? selectedMood.textContent.trim() : 'Calm';
            localStorage.setItem('lastCheckedMood', moodName);
            localStorage.setItem('lastCheckedTime', new Date().toISOString());
            openModal();
        });
    }

    if (closeCheckinModal && checkinModal) {
        closeCheckinModal.addEventListener('click', () => {
            closeModal();
        });
        
        // Close modal when clicking outside of modal card
        checkinModal.addEventListener('click', (e) => {
            if (e.target === checkinModal) {
                closeModal();
            }
        });
    }
    if (window.location.hash === '#checkin') {
        openModal();
    }

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