document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chatForm');
    const userInput = document.getElementById('userInput');
    const chatMessages = document.getElementById('chatMessages');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const promptButtons = document.querySelectorAll('.prompt-btn');

    // Empathy response data structures
    const botReplies = {
        stress: [
            "I hear you. Feeling stressed and overwhelmed can really take a toll. 🌿 Let's take a quick moment to pause. Would you like to try our <a href='breathing.html' style='color: var(--primary); font-weight: 600; text-decoration: underline;'>Breathing Exercise</a>? It only takes a minute to help settle your nervous system.",
            "Stress is a heavy weight to carry. Remember to be gentle with yourself. If you'd like, you can explore some calming soundscapes in <a href='meditation.html' style='color: var(--primary); font-weight: 600; text-decoration: underline;'>Guided Meditation</a> to help ground your thoughts."
        ],
        breathing: [
            "Absolutely! Grounding your breath is one of the fastest ways to calm your mind. 🍃 Click here to start our interactive <a href='breathing.html' style='color: var(--primary); font-weight: 600; text-decoration: underline;'>Breathing Exercise</a> page. Try following the 'Inhale, Hold, Exhale' rhythm for a few cycles."
        ],
        sad: [
            "I'm so sorry you're feeling down. 😔 Please know that it's completely okay to not be okay. Your feelings are valid. Would it help to write down what's on your mind? You can log a private reflection in your <a href='journal.html' style='color: var(--primary); font-weight: 600; text-decoration: underline;'>Mindfulness Journal</a>.",
            "I'm here for you. When everything feels heavy, it can help to focus on one tiny comforting thing—a warm cup of tea, a cozy blanket, or a favorite song. What is something gentle you can do for yourself today?"
        ],
        journal: [
            "Journaling is a beautiful way to process emotions. ✍️ Here is a gentle prompt to get you started: *'What is one small thing that made you feel safe or comfortable today?'* You can write your thoughts on the <a href='journal.html' style='color: var(--primary); font-weight: 600; text-decoration: underline;'>Journal Page</a>.",
            "Writing things down helps declutter our minds. Try opening a new page on your <a href='journal.html' style='color: var(--primary); font-weight: 600; text-decoration: underline;'>Journal</a> and write continuously for 3 minutes without worrying about grammar or structure. Just let it flow."
        ],
        happy: [
            "I'm so glad to hear that! ☀️ Carrying positive energy is wonderful. Remember to take a snapshot of this feeling. You can note down what made today great in your <a href='journal.html' style='color: var(--primary); font-weight: 600; text-decoration: underline;'>Journal</a> so you can look back on it on lower days.",
            "That's lovely! 🌿 Enjoy this beautiful state of mind, and thank you for sharing your positive vibes with me."
        ],
        gratitude: [
            "Practicing gratitude is a powerful mindfulness tool. ✨ Try reflecting on three small things you are thankful for today—no matter how small, like a good cup of coffee or a kind message. You can log them in your <a href='journal.html' style='color: var(--primary); font-weight: 600; text-decoration: underline;'>Journal</a>."
        ],
        default: [
            "Thank you for sharing that with me. I'm listening. 🌿 Can you tell me a little more about how that makes you feel?",
            "I understand. SereneMind is here to support you. Would you like to write a reflection in your <a href='journal.html' style='color: var(--primary); font-weight: 600; text-decoration: underline;'>Journal</a>, or try a calming <a href='breathing.html' style='color: var(--primary); font-weight: 600; text-decoration: underline;'>Breathing Exercise</a>?",
            "That sounds like a lot to reflect on. Take a deep breath. 🍃 Remember that mindfulness is a journey, and you are taking it one step at a time."
        ]
    };

    // Helper to format timestamps
    const getFormattedTime = () => {
        return new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Scroll chat window to bottom
    const scrollToBottom = () => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    // Append a message bubble to the chat
    const appendMessage = (sender, text) => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);

        const bubbleDiv = document.createElement('div');
        bubbleDiv.classList.add('message-bubble');

        const p = document.createElement('p');
        p.innerHTML = text; // Allow HTML links
        
        const timeSpan = document.createElement('span');
        timeSpan.classList.add('message-time');
        timeSpan.textContent = getFormattedTime();

        bubbleDiv.appendChild(p);
        bubbleDiv.appendChild(timeSpan);
        messageDiv.appendChild(bubbleDiv);
        chatMessages.appendChild(messageDiv);
        
        scrollToBottom();
    };

    // Append typing indicator bubble
    const showTypingIndicator = () => {
        const indicatorDiv = document.createElement('div');
        indicatorDiv.classList.add('message', 'bot', 'typing-container');
        indicatorDiv.id = 'typingIndicator';

        const bubbleDiv = document.createElement('div');
        bubbleDiv.classList.add('message-bubble');

        const typingDiv = document.createElement('div');
        typingDiv.classList.add('typing-indicator');
        typingDiv.innerHTML = `
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        `;

        bubbleDiv.appendChild(typingDiv);
        indicatorDiv.appendChild(bubbleDiv);
        chatMessages.appendChild(indicatorDiv);
        
        scrollToBottom();
    };

    // Remove typing indicator bubble
    const removeTypingIndicator = () => {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    };

    // Match keywords to find appropriate replies
    const getBotResponse = (msg) => {
        const text = msg.toLowerCase();
        
        if (text.includes('stress') || text.includes('overwhelmed') || text.includes('anxious') || text.includes('anxiety')) {
            const list = botReplies.stress;
            return list[Math.floor(Math.random() * list.length)];
        }
        if (text.includes('breath') || text.includes('inhale') || text.includes('exhale')) {
            return botReplies.breathing[0];
        }
        if (text.includes('sad') || text.includes('lonely') || text.includes('depress') || text.includes('cry') || text.includes('down')) {
            const list = botReplies.sad;
            return list[Math.floor(Math.random() * list.length)];
        }
        if (text.includes('journal') || text.includes('write') || text.includes('reflect')) {
            const list = botReplies.journal;
            return list[Math.floor(Math.random() * list.length)];
        }
        if (text.includes('happy') || text.includes('good') || text.includes('glad') || text.includes('excited')) {
            const list = botReplies.happy;
            return list[Math.floor(Math.random() * list.length)];
        }
        if (text.includes('gratitude') || text.includes('thankful') || text.includes('grate')) {
            return botReplies.gratitude[0];
        }
        
        // Default fallbacks
        const list = botReplies.default;
        return list[Math.floor(Math.random() * list.length)];
    };

    // Handle bot response cycle
    const handleBotResponse = (userMsg) => {
        showTypingIndicator();
        
        // Empathetic delay (800ms - 1500ms)
        const delay = 800 + Math.random() * 700;
        
        setTimeout(() => {
            removeTypingIndicator();
            const responseText = getBotResponse(userMsg);
            appendMessage('bot', responseText);
        }, delay);
    };

    // Form submit listener
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const messageText = userInput.value.trim();
            if (!messageText) return;

            // Display user message
            appendMessage('user', messageText);
            userInput.value = '';

            // Trigger bot reaction
            handleBotResponse(messageText);
        });
    }

    // Quick prompts click listeners
    promptButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const promptText = btn.getAttribute('data-text');
            if (promptText) {
                appendMessage('user', promptText);
                handleBotResponse(promptText);
            }
        });
    });

    // Clear Chat history
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear your current conversation?')) {
                chatMessages.innerHTML = `
                    <div class="message bot">
                        <div class="message-bubble">
                            <p>Hello! 🌿 I'm SereneBot, your mindfulness companion. If you're feeling stressed, anxious, down, or just want to share a reflection, I'm here to listen without judgment. How are you feeling today?</p>
                            <span class="message-time">Just now</span>
                        </div>
                    </div>
                `;
            }
        });
    }
});
