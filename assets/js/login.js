// Existing Password Toggle Logic
        const togglePassword = document.querySelector('#togglePassword');
        const password = document.querySelector('#password');
        togglePassword.addEventListener('click', function () {
            const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
            password.setAttribute('type', type);
            this.style.fill = type === 'text' ? 'var(--primary)' : '#94a3b8';
        });

        // Existing Standard Login Submit with Frontend LocalStorage Integration
        const loginForm = document.querySelector('#loginForm');
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.querySelector('#email').value.trim();
            const passValue = document.querySelector('#password').value;

            // 1. Try checking frontend localStorage users (Offline-first experience)
            const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            const matchingUser = registeredUsers.find(u => u.email === email && u.password === passValue);

            if (matchingUser) {
                alert(`Login successful! Welcome back, ${matchingUser.name}.`);
                localStorage.setItem('currentUser', JSON.stringify({
                    name: matchingUser.name,
                    email: matchingUser.email
                }));
                window.location.href = '../index.html';
                return;
            }

            // 2. Fallback to API if not in local storage
            try {
                const response = await fetch('http://localhost:5000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password: passValue }),
                });

                const data = await response.json();
                if (response.ok) {
                    alert('Login successful!');
                    localStorage.setItem('currentUser', JSON.stringify({
                        name: data.user?.name || 'User',
                        email
                    }));
                    window.location.href = '../index.html';
                } else {
                    alert('Login failed: ' + (data.message || 'Invalid credentials'));
                }
            } catch (error) {
                console.error('Error:', error);
                // For direct demo purposes, allow demo log in if user enters any credentials when offline
                alert('Backend server offline. Logging you in as a guest for testing purposes.');
                localStorage.setItem('currentUser', JSON.stringify({
                    name: 'Guest User',
                    email
                }));
                window.location.href = '../index.html';
            }
        });

        // --- New Modal & Offline Demo Mechanism ---
        const triggerGoogleModalBtn = document.getElementById('triggerGoogleModal');
        const googleDemoModal = document.getElementById('googleDemoModal');
        const submitDemoEmailBtn = document.getElementById('submitDemoEmail');
        const demoEmailInput = document.getElementById('demoEmailInput');

        // Open Modal
        triggerGoogleModalBtn.addEventListener('click', () => {
            googleDemoModal.classList.add('active');
            // Auto-focus input for convenience
            setTimeout(() => demoEmailInput.focus(), 100);
        });

        // Close Modal if clicking outside the card
        googleDemoModal.addEventListener('click', (e) => {
            if (e.target === googleDemoModal) {
                googleDemoModal.classList.remove('active');
            }
        });

        // Handle Submit Demo Action (Matches Video Behavior)
        submitDemoEmailBtn.addEventListener('click', () => {
            const email = demoEmailInput.value.trim();
            
            if (email === "") {
                alert("Please enter an email address.");
                return;
            }

            
            alert(`JSON Output Generated:\n\n{\n  "email": "${email}",\n  "status": "Verified"\n}\n\nProceeding to Dashboard...`);
            
            googleDemoModal.classList.remove('active');
            
            
             window.location.href = '../index.html';
        });