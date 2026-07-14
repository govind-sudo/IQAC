document.addEventListener("DOMContentLoaded", () => {
  const roleRadios = document.querySelectorAll('input[name="role"]');

  const studentFields = document.getElementById("studentFields");
  const adminFields = document.getElementById("adminFields");

  const registerLink = document.getElementById("registerLink");

  // Student
  const ugNumber = document.getElementById("ugNumber");
  const googleSection = document.getElementById("googleSection");
  const googleSignInBtn = document.getElementById("googleSignInBtn");

  // Admin / Subadmin
  const misCode = document.getElementById("misCode");
  const adminGoogleSection = document.getElementById("adminGoogleSection");
  const adminGoogleBtn = document.getElementById("adminGoogleSignInBtn");

  function applyRole(role) {
    const isAdmin = role === "admin";

    studentFields.hidden = isAdmin;
    adminFields.hidden = !isAdmin;

    // Only students can register
    registerLink.style.display = isAdmin ? "none" : "inline-block";

    // Hide Google sections when switching roles
    if (isAdmin) {
      googleSection.classList.remove("visible");
    } else {
      adminGoogleSection.classList.remove("visible");
    }
  }

  // Role Switch
  roleRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      applyRole(radio.value);
    });
  });

  const checkedRole = document.querySelector(
    'input[name="role"]:checked'
  );

  applyRole(checkedRole ? checkedRole.value : "student");

  // ============================
  // STUDENT FLOW
  // ============================

  ugNumber.addEventListener("input", () => {
    googleSection.classList.toggle(
      "visible",
      ugNumber.value.trim().length > 0
    );
  });

  googleSignInBtn.addEventListener("click", () => {
    const value = ugNumber.value.trim();

    if (!value) return;

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

  // ============================
  // ADMIN / SUBADMIN FLOW
  // ============================

  misCode.addEventListener("input", () => {
    adminGoogleSection.classList.toggle(
      "visible",
      misCode.value.trim().length > 0
    );
  });

adminGoogleBtn.addEventListener("click", () => {
    console.log("Admin Google button clicked");

    const value = misCode.value.trim();

    if (!value) return;

    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/auth/admin-check";

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "misCode";
    input.value = value;

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
});
});