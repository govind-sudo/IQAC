document.addEventListener('DOMContentLoaded', () => {
    // 1. Live Client-Side Search Filter
    const searchInput = document.getElementById('studentSearchInput');
    const studentRows = document.querySelectorAll('.student-row');
    const studentCountEl = document.getElementById('studentCount');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            let visibleCount = 0;

            studentRows.forEach(row => {
                const searchData = row.getAttribute('data-search') || '';
                if (searchData.includes(query)) {
                    row.style.display = '';
                    visibleCount++;
                } else {
                    row.style.display = 'none';
                }
            });

            if (studentCountEl) {
                studentCountEl.textContent = visibleCount;
            }
        });
    }

    // 2. Modal Confirmation for Deletion
    const deleteModal = document.getElementById('deleteConfirmModal');
    const deleteTriggers = document.querySelectorAll('.btn-delete-trigger');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const deleteStudentForm = document.getElementById('deleteStudentForm');
    const deleteStudentName = document.getElementById('deleteStudentName');

    deleteTriggers.forEach(button => {
        button.addEventListener('click', () => {
            const studentId = button.getAttribute('data-id');
            const studentName = button.getAttribute('data-name');

            // Set student name in modal
            deleteStudentName.textContent = studentName;

            // Set dynamic form action for submission
            deleteStudentForm.action = `/admin/students/${studentId}?_method=DELETE`;

            // Display modal
            deleteModal.classList.add('active');
        });
    });

    const closeModal = () => {
        deleteModal.classList.remove('active');
    };

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', closeModal);
    }

    // Close modal when clicking outside box
    window.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            closeModal();
        }
    });
});