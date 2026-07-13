document.querySelectorAll('.toggle-password').forEach(icon => {
            icon.addEventListener('click', function() {
                const input = this.previousElementSibling;
                if (input.type === 'password') {
                    input.type = 'text';
                    this.classList.remove('ph-eye');
                    this.classList.add('ph-eye-slash');
                } else {
                    input.type = 'password';
                    this.classList.remove('ph-eye-slash');
                    this.classList.add('ph-eye');
                }
            });
        });

// Dark Mode Toggle Logic
const darkModeToggle = document.getElementById('darkModeToggle');
if (darkModeToggle) {
    if (localStorage.getItem('darkMode') === 'enabled') {
        darkModeToggle.checked = true;
    }
    darkModeToggle.addEventListener('change', () => {
        if (darkModeToggle.checked) {
            document.documentElement.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'enabled');
        } else {
            document.documentElement.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'disabled');
        }
    });
}

// Reminder Frequency Persistence
const reminderFrequency = document.getElementById('reminderFrequency');
if (reminderFrequency) {
    const savedFreq = localStorage.getItem('reminderFrequency');
    if (savedFreq) {
        reminderFrequency.value = savedFreq;
    }
    reminderFrequency.addEventListener('change', () => {
        localStorage.setItem('reminderFrequency', reminderFrequency.value);
    });
}

// Save all changes when Save button is clicked
const saveBtn = document.querySelector('.btn-save');
if (saveBtn) {
    saveBtn.addEventListener('click', () => {
        // Show a brief alert to confirm save
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="ph ph-check-circle"></i> Saved!';
        setTimeout(() => {
            saveBtn.innerHTML = originalText;
        }, 2000);
    });
}