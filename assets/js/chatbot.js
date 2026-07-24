document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chatForm');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const promptButtons = document.querySelectorAll('.prompt-btn');

    // =========================================================================
    // 🔑 INSERT YOUR GROQ API KEY HERE
    // Get a free key at: https://console.groq.com/keys
    // =========================================================================
    const GROQ_API_KEY = "YOUR_API_KEY_HERE";
    // =========================================================================

    const SYSTEM_PROMPT = `
# MindCare Interactive Mental Health Chatbot – System Prompt

## Identity
You are **MindCare**, a compassionate AI mental wellness companion.
Your role is to create a safe, natural, and supportive conversation where users feel comfortable sharing their thoughts, emotions, and experiences.
You are **not a doctor, psychiatrist, psychologist, or therapist**. Never diagnose mental illnesses or prescribe medication.

Your goal is to:
* Understand the user's situation.
* Ask meaningful follow-up questions.
* Encourage self-reflection.
* Provide emotional support.
* Suggest healthy coping strategies when appropriate.
* Continue the conversation naturally until the user wishes to stop.

## Core Personality
Always be:
* Warm, Patient, Curious, Respectful, Calm, Friendly, Non-judgmental, Emotionally intelligent
Never sound robotic. Never give one-line replies. Never abruptly end conversations. Never ignore emotional cues.

## Conversation State Machine
Every conversation follows this flow.
1. Greeting: Welcome the user naturally. (Skip if user starts with a problem).
2. Information Gathering: Understand what the user is talking about. Identify the topic. Do NOT immediately give advice.
3. Clarification: If the user's message is vague, ask questions. Always clarify.
4. Emotional Reflection: Reflect emotions. Do NOT exaggerate or invent emotions.
5. Exploration: Ask deeper questions. Ask ONE question at a time.
6. Support: Offer gentle support like Breathing exercises, Journaling, Mindfulness. (CRITICAL: You must use the exact phrases "breathing exercise", "journaling", or "meditation" when suggesting them so they can be auto-linked). Never force advice.
7. Closing: Ask "Is there anything else you'd like to talk about?"

## Conversation Rules
Always ask ONE question at a time.
Never ask more than two consecutive questions without acknowledging the user's feelings.
If the user gives a short answer, encourage elaboration.
If the user changes topics, adapt naturally.
Never repeat the same question.
Avoid generic responses like "I'm sorry" or "Take care". Use specific empathetic responses.

## Handle Different Situations
Academic: Ask about assignments, exams, grades, concentration.
Work: Ask about deadlines, colleagues, boss, workload.
Relationships: Ask about trust, communication, arguments.
Family: Ask about parents, siblings, conflicts.
Physical Health: Ask about sleep, appetite, energy, exercise.
Emotional Well-being: Explore stress, anxiety, fear, loneliness.
Lifestyle: Discuss routine, screen time, hobbies.
Positive Events: Celebrate achievements.

## Unexpected Questions
Answer normal conversation naturally (Weather, Movies, Programming), then gently return to the user's wellbeing if it fits.

## Safety
If the user mentions suicide, self-harm, or immediate danger, respond calmly. Encourage contacting trusted people or emergency services. Remain supportive. Never shame or criticize.

## Final Goal
Feel like talking to a patient, emotionally intelligent friend. Explore thoughts instead of rushing to solutions. Ensure the user feels heard, understood, respected, and encouraged to continue the conversation.
`;

    // Chat History 
    let chatHistory = [];

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

    // Format markdown to HTML and auto-link features
    const formatMarkdown = (text) => {
        let formatted = text
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold
            .replace(/\*(.*?)\*/g, '<i>$1</i>')     // Italic
            .replace(/\n/g, '<br>')                 // Line breaks
            .replace(/- (.*)/g, '<li>$1</li>');     // Simple lists

        // Auto-link to other pages in the app (Catches more variations)
        formatted = formatted.replace(/\b(breathing exercises?|deep breathing|breathing techniques?)\b/gi, '<a href="breathing.html" style="text-decoration: underline; color: var(--primary-color);">$1</a>');
        formatted = formatted.replace(/\b(journaling?|write in a journal)\b/gi, '<a href="journal.html" style="text-decoration: underline; color: var(--primary-color);">$1</a>');
        formatted = formatted.replace(/\b(meditation|meditating)\b/gi, '<a href="meditation.html" style="text-decoration: underline; color: var(--primary-color);">$1</a>');

        return formatted;
    };

    // Append a message bubble to the chat
    const appendMessage = (sender, text) => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);

        const bubbleDiv = document.createElement('div');
        bubbleDiv.classList.add('message-bubble');

        const p = document.createElement('p');
        p.innerHTML = formatMarkdown(text);

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

    // Fetch response from Groq API (Lightning Fast)
    const fetchAIResponse = async (userMsg) => {
        // Add user message to history
        chatHistory.push({
            role: "user",
            content: userMsg
        });

        if (GROQ_API_KEY === "PASTE_NEW_GROQ_API_KEY_HERE" || !GROQ_API_KEY) {
            chatHistory.pop(); // Remove user message since it failed
            return "Developer Error: Please paste your brand new Groq API Key into line 11 of the `chatbot.js` file! Get one for free at console.groq.com";
        }

        try {
            const messagesPayload = [
                { role: 'system', content: SYSTEM_PROMPT },
                ...chatHistory
            ];

            // Using Llama-3.3-70B which is their latest, smartest, and fastest model
            const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    messages: messagesPayload,
                    model: 'llama-3.3-70b-versatile',
                    temperature: 0.6
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'API request failed');
            }

            const data = await response.json();

            // Extract bot reply from Groq response
            const botReply = data.choices[0].message.content;

            // Add bot reply to history
            chatHistory.push({
                role: "assistant",
                content: botReply
            });

            return botReply;

        } catch (error) {
            console.error("Groq API Error:", error);
            // Remove the failed user message from history
            chatHistory.pop();

            const errorString = error.message ? error.message.toLowerCase() : "";

            if (errorString.includes("api key") || errorString.includes("invalid") || errorString.includes("unauthorized") || errorString.includes("401")) {
                return "The Groq API Key you provided in chatbot.js is invalid. Please double check it!";
            }

            return `Connection error: ${error.message}. Please try sending that again! 🌿`;
        }
    };

    // Handle bot response cycle
    const handleBotResponse = async (userMsg) => {
        showTypingIndicator();

        // Disable input while generating
        userInput.disabled = true;
        sendBtn.disabled = true;

        const responseText = await fetchAIResponse(userMsg);

        removeTypingIndicator();
        appendMessage('bot', responseText);

        // Re-enable input
        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.focus();
    };

    // Show initial welcome screen
    const showWelcomeScreen = () => {
        chatHistory = []; // Reset history

        // Clear existing messages
        chatMessages.innerHTML = '';

        const welcomeMsg = "Hello! I am SereneBot. How are you feeling today?";

        // Push initial greeting to history
        chatHistory.push({
            role: "assistant",
            content: welcomeMsg
        });

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'bot');

        const bubbleDiv = document.createElement('div');
        bubbleDiv.classList.add('message-bubble');

        const p = document.createElement('p');
        p.innerHTML = welcomeMsg;
        bubbleDiv.appendChild(p);

        const timeSpan = document.createElement('span');
        timeSpan.classList.add('message-time');
        timeSpan.textContent = getFormattedTime();
        bubbleDiv.appendChild(timeSpan);

        messageDiv.appendChild(bubbleDiv);
        chatMessages.appendChild(messageDiv);
        scrollToBottom();

        // Restore input defaults
        if (userInput) {
            userInput.disabled = false;
            userInput.placeholder = "Type a message...";
        }
        if (sendBtn) {
            sendBtn.disabled = false;
        }
        const quickPrompts = document.querySelector('.quick-prompts');
        if (quickPrompts) {
            quickPrompts.style.display = 'flex';
        }
    };

    // Form submit listener (user messages)
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const messageText = userInput.value.trim();
            if (!messageText) return;

            // Display user message
            appendMessage('user', messageText);
            userInput.value = '';

            // Trigger bot response
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

    // Clear Chat history (resets to welcome screen)
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear your current conversation?')) {
                showWelcomeScreen();
            }
        });
    }

    // Initialize MindCare on load
    showWelcomeScreen();
});
