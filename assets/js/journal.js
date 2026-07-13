document.addEventListener('DOMContentLoaded', () => {
    const titleInput = document.getElementById('entryTitle');
    const contentInput = document.getElementById('entryContent');
    const createBtn = document.getElementById('createEntryBtn');

    // Enforce 1 journal entry per day limit
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });

    const entries = JSON.parse(localStorage.getItem('journalEntries') || '[]');
    const hasWrittenToday = entries.some(entry => entry.date === formattedDate);

    if (hasWrittenToday) {
        if (titleInput) {
            titleInput.disabled = true;
            titleInput.value = "Daily Check-in Complete";
        }
        if (contentInput) {
            contentInput.disabled = true;
            contentInput.value = "You have already written your journal entry for today! Great job staying consistent with your mindfulness routine. Come back tomorrow to write again.";
        }
        if (createBtn) {
            createBtn.disabled = true;
            createBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Come Back Tomorrow';
            createBtn.style.opacity = '0.6';
            createBtn.style.cursor = 'not-allowed';
        }
    } else {
        // Auto-fill from Voice Reflection if data exists
        const tempTitle = localStorage.getItem('tempJournalTitle');
        const tempContent = localStorage.getItem('tempJournalContent');
        if (tempTitle && titleInput) {
            titleInput.value = tempTitle;
            localStorage.removeItem('tempJournalTitle');
        }
        if (tempContent && contentInput) {
            contentInput.value = tempContent;
            localStorage.removeItem('tempJournalContent');
        }

        if (createBtn) {
        createBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            const titleVal = titleInput ? titleInput.value.trim() : '';
            const contentVal = contentInput ? contentInput.value.trim() : '';

            if (!titleVal || !contentVal) {
                alert('Please enter both a title and some reflections for your journal entry.');
                return;
            }

            const formattedTime = today.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            const newEntry = {
                id: Date.now(),
                title: titleVal,
                content: contentVal,
                date: formattedDate,
                time: formattedTime
            };
            
            entries.push(newEntry);
            localStorage.setItem('journalEntries', JSON.stringify(entries));

            // Clear form
            if (titleInput) titleInput.value = '';
            if (contentInput) contentInput.value = '';

            alert('Your journal entry has been created successfully!');
            window.location.href = '../index.html';
        });
    }
});
