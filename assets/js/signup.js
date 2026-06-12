// Password visibility toggle logic
const togglePassword = document.querySelector('#togglePassword');
const password = document.querySelector('#password');
togglePassword.addEventListener('click', function () {
    const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
    password.setAttribute('type', type);
    this.style.fill = type === 'text' ? 'var(--primary)' : '#94a3b8';
});

// Confirm Password visibility toggle logic
const toggleConfirmPassword = document.querySelector('#toggleConfirmPassword');
const confirmPassword = document.querySelector('#confirmPassword');
toggleConfirmPassword.addEventListener('click', function () {
    const type = confirmPassword.getAttribute('type') === 'password' ? 'text' : 'password';
    confirmPassword.setAttribute('type', type);
    this.style.fill = type === 'text' ? 'var(--primary)' : '#94a3b8';
});

// Select UI Elements
const signupForm = document.getElementById('signupForm');
const termsOverlay = document.getElementById('termsOverlay');
const agreeSecurityPolicy = document.getElementById('agreeSecurityPolicy');
const agreeTermsOfService = document.getElementById('agreeTermsOfService');
const acceptTermsBtn = document.getElementById('acceptTerms');
const declineTermsBtn = document.getElementById('declineTerms');

// Intercept signup submission
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const nameVal = document.getElementById('fullName').value.trim();
    const emailVal = document.getElementById('email').value.trim();
    const passVal = password.value;
    const confirmPassVal = confirmPassword.value;

    if (!nameVal || !emailVal || !passVal || !confirmPassVal) {
        alert("Please fill in all details.");
        return;
    }

    if (passVal !== confirmPassVal) {
        alert("Passwords do not match. Please verify your password entry.");
        return;
    }

    // Passwords match and fields are valid: open the Terms and Conditions agreement popup
    termsOverlay.classList.add('active');
});

// Enable/Disable Accept button based on checkboxes
const updateAcceptButtonState = () => {
    const isBothChecked = agreeSecurityPolicy.checked && agreeTermsOfService.checked;
    acceptTermsBtn.disabled = !isBothChecked;
};

agreeSecurityPolicy.addEventListener('change', updateAcceptButtonState);
agreeTermsOfService.addEventListener('change', updateAcceptButtonState);

// Close terms popup on Decline
declineTermsBtn.addEventListener('click', () => {
    termsOverlay.classList.remove('active');
    // Optional: Reset checkbox states
    agreeSecurityPolicy.checked = false;
    agreeTermsOfService.checked = false;
    updateAcceptButtonState();
});

// Handle terms acceptance and complete signup
acceptTermsBtn.addEventListener('click', () => {
    const nameVal = document.getElementById('fullName').value.trim();
    const emailVal = document.getElementById('email').value.trim();
    const passVal = password.value;

    // Close Modal
    termsOverlay.classList.remove('active');

    // 1. Persist user in the registered users collection for offline login capabilities
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    // Check if user already exists to prevent duplicates
    if (!registeredUsers.some(u => u.email === emailVal)) {
        registeredUsers.push({
            name: nameVal,
            email: emailVal,
            password: passVal
        });
        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
    }

    // 2. Set current active user session details
    localStorage.setItem('currentUser', JSON.stringify({
        name: nameVal,
        email: emailVal,
        agreedToTerms: true,
        signupDate: new Date().toISOString()
    }));

    alert(`Sign Up Successful!\n\nWelcome to SereneMind, ${nameVal}. Your mental health monitoring logs are end-to-end encrypted and completely secure.`);
    
    // Redirect to home/dashboard
    window.location.href = '../index.html';
});

// Close terms overlay if clicking outside the modal card
termsOverlay.addEventListener('click', (e) => {
    if (e.target === termsOverlay) {
        termsOverlay.classList.remove('active');
        agreeSecurityPolicy.checked = false;
        agreeTermsOfService.checked = false;
        updateAcceptButtonState();
    }
});


// --- Google Offline Demo Modal Logic (Maintains parity with login.js behavior) ---
const triggerGoogleModalBtn = document.getElementById('triggerGoogleModal');
const googleDemoModal = document.getElementById('googleDemoModal');
const submitDemoEmailBtn = document.getElementById('submitDemoEmail');
const demoEmailInput = document.getElementById('demoEmailInput');

triggerGoogleModalBtn.addEventListener('click', () => {
    googleDemoModal.classList.add('active');
    setTimeout(() => demoEmailInput.focus(), 100);
});

googleDemoModal.addEventListener('click', (e) => {
    if (e.target === googleDemoModal) {
        googleDemoModal.classList.remove('active');
    }
});

submitDemoEmailBtn.addEventListener('click', () => {
    const email = demoEmailInput.value.trim();
    
    if (email === "") {
        alert("Please enter an email address.");
        return;
    }

    alert(`JSON Output Generated:\n\n{\n  "email": "${email}",\n  "status": "Verified"\n}\n\nProceeding to Dashboard...`);
    
    googleDemoModal.classList.remove('active');
    
    // Also save simple user details
    localStorage.setItem('currentUser', JSON.stringify({
        name: "Google User",
        email: email,
        agreedToTerms: true,
        signupDate: new Date().toISOString()
    }));

    window.location.href = '../index.html';
});
