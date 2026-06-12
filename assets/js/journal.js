document.addEventListener('DOMContentLoaded', () => {
    const titleInput = document.getElementById('entryTitle');
    const contentInput = document.getElementById('entryContent');
    const createBtn = document.getElementById('createEntryBtn');

    if (createBtn) {
        createBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            const titleVal = titleInput ? titleInput.value.trim() : '';
            const contentVal = contentInput ? contentInput.value.trim() : '';

            if (!titleVal || !contentVal) {
                alert('Please enter both a title and some reflections for your journal entry.');
                return;
            }

            // Formulate entry object
            const today = new Date();
            const formattedDate = today.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            });
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

            // Load existing entries
            const entries = JSON.parse(localStorage.getItem('journalEntries') || '[]');
            
            // Add new entry to the array
            entries.push(newEntry);

            // Save back to localStorage
            localStorage.setItem('journalEntries', JSON.stringify(entries));

            // Clear form
            if (titleInput) titleInput.value = '';
            if (contentInput) contentInput.value = '';

            // Notify user and redirect
            alert('Your journal entry has been created successfully!');
            window.location.href = '../index.html';
        });
    }
});
