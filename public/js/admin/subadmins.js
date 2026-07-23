document.addEventListener('DOMContentLoaded', () => {
    // 1. Focus search input and set cursor position on page load
    const searchInput = document.getElementById('subadminSearchInput');
    if (searchInput) {
        const val = searchInput.value;
        searchInput.value = '';
        searchInput.value = val;
        if (val) searchInput.focus();
    }

    // 2. Modal Confirmation for Deletion
    const deleteModal = document.getElementById('deleteConfirmModal');
    const deleteTriggers = document.querySelectorAll('.btn-delete-trigger');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const deleteSubadminForm = document.getElementById('deleteSubadminForm');
    const deleteSubadminName = document.getElementById('deleteSubadminName');

    if (deleteTriggers.length > 0 && deleteModal) {
        deleteTriggers.forEach(button => {
            button.addEventListener('click', () => {
                const id = button.getAttribute('data-id');
                const name = button.getAttribute('data-name');

                if (deleteSubadminName) deleteSubadminName.textContent = name;
                if (deleteSubadminForm) deleteSubadminForm.action = `/admin/subadmins/${id}?_method=DELETE`;

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