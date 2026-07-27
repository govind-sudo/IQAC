document.addEventListener('DOMContentLoaded', () => {
    // 1. Set cursor at the end of search input on page load
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

    // 3. Excel Bulk Upload Modal Logic
    const excelModal = document.getElementById('excelUploadModal');
    const openExcelModalBtn = document.getElementById('openExcelModalBtn');
    const cancelExcelModalBtn = document.getElementById('cancelExcelModalBtn');
    const excelUploadForm = document.getElementById('excelUploadForm');
    const excelFileInput = document.getElementById('excelFileInput');
    const fileDropArea = document.querySelector('.file-drop-area');
    const selectedFileName = document.getElementById('selectedFileName');
    const uploadStatusMessage = document.getElementById('uploadStatusMessage');
    const submitExcelBtn = document.getElementById('submitExcelBtn');

    if (excelModal && openExcelModalBtn) {
        // Open Modal
        openExcelModalBtn.addEventListener('click', () => {
            excelModal.style.display = 'flex';
            excelModal.classList.add('active');
        });

        // Close Modal Helper
        const closeExcelModal = () => {
            excelModal.style.display = 'none';
            excelModal.classList.remove('active');
            excelUploadForm.reset();
            selectedFileName.textContent = '';
            uploadStatusMessage.style.display = 'none';
            uploadStatusMessage.textContent = '';
            submitExcelBtn.disabled = false;
            submitExcelBtn.textContent = 'Upload & Update';
        };

        if (cancelExcelModalBtn) cancelExcelModalBtn.addEventListener('click', closeExcelModal);

        window.addEventListener('click', (e) => {
            if (e.target === excelModal) closeExcelModal();
        });

        // File Selection Trigger
        if (fileDropArea && excelFileInput) {
            fileDropArea.addEventListener('click', () => excelFileInput.click());

            excelFileInput.addEventListener('change', () => {
                if (excelFileInput.files.length > 0) {
                    selectedFileName.textContent = `Selected: ${excelFileInput.files[0].name}`;
                } else {
                    selectedFileName.textContent = '';
                }
            });

            // Drag and Drop Handling
            ['dragenter', 'dragover'].forEach(eventName => {
                fileDropArea.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    fileDropArea.style.borderColor = '#16a34a';
                    fileDropArea.style.backgroundColor = '#f0fdf4';
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                fileDropArea.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    fileDropArea.style.borderColor = '#cbd5e1';
                    fileDropArea.style.backgroundColor = '#f8fafc';
                }, false);
            });

            fileDropArea.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const files = dt.files;

                if (files.length > 0) {
                    excelFileInput.files = files;
                    selectedFileName.textContent = `Selected: ${files[0].name}`;
                }
            });
        }

        // Form Submit via AJAX
        if (excelUploadForm) {
            excelUploadForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                if (!excelFileInput.files || excelFileInput.files.length === 0) {
                    uploadStatusMessage.style.display = 'block';
                    uploadStatusMessage.style.color = '#dc2626';
                    uploadStatusMessage.textContent = 'Please select an Excel file first.';
                    return;
                }

                const formData = new FormData();
                formData.append('excelFile', excelFileInput.files[0]);

                submitExcelBtn.disabled = true;
                submitExcelBtn.textContent = 'Uploading...';
                uploadStatusMessage.style.display = 'block';
                uploadStatusMessage.style.color = '#2563eb';
                uploadStatusMessage.textContent = 'Processing file and updating student records...';

                try {
                    const response = await fetch('/admin/students/upload-enrollments', {
                        method: 'POST',
                        body: formData,
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        uploadStatusMessage.style.color = '#16a34a';
                        uploadStatusMessage.textContent = `Success! Updated ${data.stats.updatedStudents} students. Reloading page...`;

                        setTimeout(() => {
                            window.location.reload();
                        }, 1200);
                    } else {
                        submitExcelBtn.disabled = false;
                        submitExcelBtn.textContent = 'Upload & Update';
                        uploadStatusMessage.style.color = '#dc2626';
                        uploadStatusMessage.textContent = data.error || 'Failed to update enrollment numbers.';
                    }
                } catch (err) {
                    console.error('Upload Error:', err);
                    submitExcelBtn.disabled = false;
                    submitExcelBtn.textContent = 'Upload & Update';
                    uploadStatusMessage.style.color = '#dc2626';
                    uploadStatusMessage.textContent = 'An unexpected error occurred during upload.';
                }
            });
        }
    }
});