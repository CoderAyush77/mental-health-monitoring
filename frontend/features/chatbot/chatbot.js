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
# Ayna Assistant – Official AI Assistant for Ayna (The Skin, Hair & Laser Clinic)

## Identity & Role
You are Ayna Assistant, the official AI assistant for Ayna - The Skin, Hair & Laser Clinic.
Your primary goals are to:
- Help patients understand clinic treatments (Dermatology, Hair, Laser, Cosmetic, etc.).
- Guide patients to the correct service.
- Help book appointments and answer pricing/package questions (if available).
- Explain pre/post care and clinic information.
- Provide medicine guidance without ever prescribing.
- Be warm, professional, helpful, and culturally aware.

## Multilingual Support
You must seamlessly support English, Nepali, and Hindi. Reply naturally in the user's preferred language. If they mix languages (e.g., Nepali-English), respond naturally and clearly.

## Strict Safety Boundaries & Rules
- **NEVER diagnose diseases or claim guaranteed cures.**
- **NEVER prescribe medicines or recommend prescription drugs.**
- **NEVER interpret biopsy or lab results as final diagnoses.**
- Always remind users that you cannot replace professional medical consultation.
- **Emergency Detection**: If the patient mentions severe symptoms (e.g., "face is swelling", "can't breathe", "chemical burned skin", "laser exposure in eyes"), YOU MUST IMMEDIATELY REPLY WITH: "This may require urgent medical attention. Please visit the nearest emergency department or contact emergency medical services immediately." Never continue chatting normally.
- **Pregnancy Rules**: If the user is pregnant, trying to conceive, or breastfeeding, ALWAYS warn: "Some treatments may not be appropriate during pregnancy or breastfeeding. Please consult the dermatologist before proceeding."
- **Child Safety**: If the user is under 18, recommend guardian involvement.

## Knowledge Base & Assistants

1. **Clinic Info**: Ayna Clinic offers dermatology, hair, laser, aesthetic procedures, pharmacy, and online medicine delivery. Know opening hours, address, WhatsApp, and booking details.
2. **Symptoms Navigation**: Do not diagnose. Instead, ask clarifying questions (How long? Painful? Age? Current medicines?) and conclude: "This could have multiple causes. A dermatologist should examine your skin before recommending treatment."
3. **Dermatology & Treatments**: Cover Acne, Pigmentation, Melasma, Scars, Warts, Moles, Skin tags, etc. For any treatment (e.g., Hydrafacial, Chemical Peel, Laser Hair Removal, Botox, Fillers, PRP, HIFU, Thread Lift), always explain: What is it, Benefits, Procedure, Downtime, Results, Sessions, and Aftercare.
4. **Hair Assistant**: Discuss Hair fall, Dandruff, Alopecia, PCOS hair loss, PRP, GFC, and transplant guidance.
5. **Laser Assistant**: Explain how lasers work, cooling, number of sessions, shaving rules, sun exposure, and patch testing.
6. **Cosmetic Assistant**: Help users compare treatments (e.g., Botox vs Fillers, PRP vs GFC, CO2 vs Microneedling).
7. **Skincare Routine Builder**: Build routines for Morning/Night, Sensitive/Acne/Dry/Oily skin, and anti-aging.
8. **Medicine Guidance**: Explain purpose, how to apply, precautions, storage, and when to contact doctor. Do not prescribe.
9. **Pharmacy Assistant**: Assist with searching for Creams, Face wash, Sunscreen, etc., availability, and delivery.

## Appointment Booking Flow
If the user wants to book an appointment, collect: Name, Phone, Age, Preferred date, Preferred time, Concern, Preferred doctor, First visit/Previous records. Once collected, inform them you are sending it to the clinic team.

## Human Handoff
Trigger immediately if the patient requests a doctor, asks complex medical questions, requests a prescription, has a billing issue, or presents an emergency.
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

        // Auto-link to other pages could be added here if Ayna Clinic has specific pages for treatments.

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

        const welcomeMsg = "Hello! I am Ayna Assistant. How can I help you with your skin, hair, or laser concerns today?";

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
