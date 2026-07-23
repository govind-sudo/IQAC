document.addEventListener('DOMContentLoaded', () => {
    // 1. Set cursor at the end of search input on page load (No live input request listeners)
    const searchInput = document.getElementById('studentSearchInput');
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
    const deleteStudentForm = document.getElementById('deleteStudentForm');
    const deleteStudentName = document.getElementById('deleteStudentName');

    if (deleteTriggers.length > 0 && deleteModal) {
        deleteTriggers.forEach(button => {
            button.addEventListener('click', () => {
                const studentId = button.getAttribute('data-id');
                const studentName = button.getAttribute('data-name');

                if (deleteStudentName) deleteStudentName.textContent = studentName;
                if (deleteStudentForm) deleteStudentForm.action = `/admin/students/${studentId}?_method=DELETE`;

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