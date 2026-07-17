document.addEventListener('DOMContentLoaded', () => {
    const toggleEditBtn = document.getElementById('toggle-edit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editBar = document.getElementById('edit-controls-bar');
    const inputs = document.querySelectorAll('#personal-info-form .form-control');

    toggleEditBtn.addEventListener('click', () => {
        // Enable editable inputs (exclude fields auto-generated or calculated by DB)
        inputs.forEach(input => {
            if (!input.hasAttribute('readonly')) {
                input.removeAttribute('disabled');
            }
        });
        
        // Open the sticky control bar
        editBar.classList.add('show');
    });

    cancelEditBtn.addEventListener('click', () => {
        // Lock inputs back up
        inputs.forEach(input => {
            input.setAttribute('disabled', 'true');
        });
        
        // Hide the sticky control bar
        editBar.classList.remove('show');
    });
});