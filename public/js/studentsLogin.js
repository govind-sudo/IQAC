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
    const value = ugNumber.value.trim();
    if (!value) return;

    // FIXED: this used to jump straight to /auth/google, skipping the
    // enrollment number check entirely. Now it does a real POST to
    // /auth/enrollment-check first (full page navigation, not fetch,
    // so the server can render an error page directly if the number
    // isn't recognized). The server redirects to /auth/google itself
    // once the enrollment number is confirmed valid.
    //
    // Field name is "enrollmentNo" here, matching what the backend
    // route reads via req.body.enrollmentNo - NOT "ugNumber", even
    // though the visible input's id/name on the page is ugNumber.
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/auth/enrollment-check";

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "enrollmentNo";
    input.value = value;

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  });
});