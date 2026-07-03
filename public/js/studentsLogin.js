document.addEventListener("DOMContentLoaded", () => {
  const roleRadios = document.querySelectorAll('input[name="role"]');
  const studentFields = document.getElementById("studentFields");
  const adminFields = document.getElementById("adminFields");
  const registerLink = document.getElementById("registerLink");

  const ugNumber = document.getElementById("ugNumber");
  const googleSection = document.getElementById("googleSection");
  const googleSignInBtn = document.getElementById("googleSignInBtn");

  function applyRole(role) {
    const isAdmin = role === "admin";

    studentFields.hidden = isAdmin;
    adminFields.hidden = !isAdmin;

    // Admins cannot self-register
    registerLink.style.display = isAdmin ? "none" : "inline-block";

    // Reset the Google prompt when switching away from Student
    if (isAdmin) {
      googleSection.classList.remove("visible");
    }
  }

  roleRadios.forEach((radio) => {
    radio.addEventListener("change", () => applyRole(radio.value));
  });

  // Set initial state based on whichever radio is checked by default
  const checkedRole = document.querySelector('input[name="role"]:checked');
  applyRole(checkedRole ? checkedRole.value : "student");

  // Show the Google sign-in button once the student starts typing their UG Number
  ugNumber.addEventListener("input", () => {
    const hasValue = ugNumber.value.trim().length > 0;
    googleSection.classList.toggle("visible", hasValue);
  });

  googleSignInBtn.addEventListener("click", () => {
    // Redirect to your Google OAuth route, e.g. Passport's /auth/google
    window.location.href = "/auth/google";
  });
});