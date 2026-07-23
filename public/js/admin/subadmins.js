document.addEventListener('DOMContentLoaded', () => {
    // 1. Debounced Server Search
    const searchInput = document.getElementById('subadminSearchInput');
    const searchForm = document.getElementById('searchForm');
    let debounceTimer;

    if (searchInput && searchForm) {
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                searchForm.submit();
            }, 400); // Waits 400ms after user stops typing before searching
        });
    }

    // 2. Delete Confirmation Modal Logic
    const deleteModal = document.getElementById('deleteConfirmModal');
    const deleteTriggers = document.querySelectorAll('.btn-delete-trigger');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const deleteSubadminForm = document.getElementById('deleteSubadminForm');
    const deleteSubadminName = document.getElementById('deleteSubadminName');

    if (deleteModal) {
        deleteTriggers.forEach(button => {
            button.addEventListener('click', () => {
                const id = button.getAttribute('data-id');
                const name = button.getAttribute('data-name');

                deleteSubadminName.textContent = name;
                deleteSubadminForm.action = `/admin/subadmins/${id}?_method=DELETE`;
                deleteModal.classList.add('active');
            });
        });

        const closeModal = () => deleteModal.classList.remove('active');

        if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeModal);

        window.addEventListener('click', (e) => {
            if (e.target === deleteModal) closeModal();
        });
    }
});



document.addEventListener('DOMContentLoaded', () => {
    const deleteModal = document.getElementById('deleteConfirmModal');
    const deleteTriggers = document.querySelectorAll('.btn-delete-trigger');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const deleteSubadminForm = document.getElementById('deleteSubadminForm');
    const deleteSubadminName = document.getElementById('deleteSubadminName');

    if (deleteModal) {
        deleteTriggers.forEach(button => {
            button.addEventListener('click', () => {
                const id = button.getAttribute('data-id');
                const name = button.getAttribute('data-name');

                deleteSubadminName.textContent = name;
                
                // Form action using method-override parameter ?_method=DELETE
                deleteSubadminForm.action = `/admin/subadmins/${id}?_method=DELETE`;
                
                deleteModal.classList.add('active');
            });
        });

        const closeModal = () => deleteModal.classList.remove('active');

        if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeModal);

        window.addEventListener('click', (e) => {
            if (e.target === deleteModal) closeModal();
        });
    }
});