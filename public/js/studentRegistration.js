document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("studentForm");

  /* ============ CASCADING DROPDOWNS ============ */
  const institute = document.getElementById("institute");
  const department = document.getElementById("department");
  const branch = document.getElementById("branch");
  const specialization = document.getElementById("specialization");

  const DEPARTMENT_OPTIONS = {
    "Parul Institute of Engineering and Technology": [
      { value: "FET", label: "FET - Faculty of Engineering and Technology" },
    ],
  };

  const BRANCH_OPTIONS = {
    FET: [{ value: "CSE", label: "Computer Science and Engineering" }],
  };

  const SPECIALIZATION_OPTIONS = {
    CSE: [
      { value: "AIML", label: "AI/ML - Artificial Intelligence and Machine Learning" },
      { value: "AIRO", label: "AIRO - Artificial Intelligence and Robotics" },
    ],
  };

  function resetSelect(select, placeholder, disable) {
    select.innerHTML = "";
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = placeholder;
    opt.selected = true;
    select.appendChild(opt);
    select.disabled = disable;
  }

  function populateSelect(select, options, placeholder) {
    select.innerHTML = "";
    const placeholderOpt = document.createElement("option");
    placeholderOpt.value = "";
    placeholderOpt.textContent = placeholder;
    placeholderOpt.selected = true;
    placeholderOpt.disabled = true;
    select.appendChild(placeholderOpt);

    options.forEach(({ value, label }) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      select.appendChild(opt);
    });

    select.disabled = false;
  }

  institute.addEventListener("change", () => {
    const opts = DEPARTMENT_OPTIONS[institute.value];
    if (opts) {
      populateSelect(department, opts, "Select Department");
    } else {
      resetSelect(department, "Select Institute First", true);
    }
    resetSelect(branch, "Select Department First", true);
    resetSelect(specialization, "Select Branch First", true);
  });

  department.addEventListener("change", () => {
    const opts = BRANCH_OPTIONS[department.value];
    if (opts) {
      populateSelect(branch, opts, "Select Branch");
    } else {
      resetSelect(branch, "Select Department First", true);
    }
    resetSelect(specialization, "Select Branch First", true);
  });

  branch.addEventListener("change", () => {
    const opts = SPECIALIZATION_OPTIONS[branch.value];
    if (opts) {
      populateSelect(specialization, opts, "Select Specialization");
    } else {
      resetSelect(specialization, "Select Branch First", true);
    }
  });

  /* ============ PASSWORD MATCH CHECK ============ */
  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");
  const passwordMismatch = document.getElementById("passwordMismatch");

  function checkPasswordMatch() {
    const mismatch = confirmPassword.value.length > 0 && password.value !== confirmPassword.value;
    passwordMismatch.style.display = mismatch ? "block" : "none";
    confirmPassword.setCustomValidity(mismatch ? "Passwords do not match" : "");
  }

  password.addEventListener("input", checkPasswordMatch);
  confirmPassword.addEventListener("input", checkPasswordMatch);

  /* ============ PERCENTAGE / CGPA TOGGLE — 10th ============ */
  const tenthRadios = document.querySelectorAll('input[name="education[tenth][gradeType]"]');
  const tenthValueInput = document.getElementById("tenthGradeValue");
  const tenthValueLabel = document.getElementById("tenthGradeLabel");

  function applyGradeLabel(type, valueInput, valueLabel) {
    if (type === "cgpa") {
      valueLabel.innerHTML = 'CGPA (out of 10)<span class="req">*</span>';
      valueInput.max = "10";
      valueInput.placeholder = "e.g., 8.7";
    } else {
      valueLabel.innerHTML = 'Percentage (%)<span class="req">*</span>';
      valueInput.max = "100";
      valueInput.placeholder = "e.g., 92.4";
    }
    valueInput.value = "";
  }

  tenthRadios.forEach((radio) => {
    radio.addEventListener("change", () => applyGradeLabel(radio.value, tenthValueInput, tenthValueLabel));
  });

  /* ============ PERCENTAGE / CGPA TOGGLE — 12th/Diploma ============ */
  const twelfthRadiosUI = document.querySelectorAll('input[name="twelfthGradeTypeUI"]');
  const twelfthValueInput = document.getElementById("twelfthGradeValue");
  const twelfthValueLabel = document.getElementById("twelfthGradeLabel");
  const twelfthGradeTypeHidden = document.getElementById("twelfthGradeTypeHidden");

  twelfthRadiosUI.forEach((radio) => {
    radio.addEventListener("change", () => {
      applyGradeLabel(radio.value, twelfthValueInput, twelfthValueLabel);
      twelfthGradeTypeHidden.value = radio.value;
    });
  });

  /* ============ 12th vs DIPLOMA TOGGLE ============ */
  // educationSchema.js has separate `twelfth` and `diploma` objects, so when the
  // student picks Diploma we re-point the visible fields' `name` attributes at
  // education[diploma][...] instead of education[twelfth][...].
  const qualificationRadios = document.querySelectorAll('input[name="qualificationType"]');
  const twelfthBlockTitle = document.getElementById("twelfthBlockTitle");
  const twelfthSchoolLabel = document.getElementById("twelfthSchoolLabel");
  const twelfthMarksheetLabel = document.getElementById("twelfthMarksheetLabel");
  const twelfthSchool = document.getElementById("twelfthSchool");
  const twelfthMarksheet = document.getElementById("twelfthMarksheet");

  qualificationRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      const key = radio.value; // "twelfth" or "diploma"

      twelfthSchool.name = `education[${key}][schoolName]`;
      twelfthGradeTypeHidden.name = `education[${key}][gradeType]`;
      twelfthValueInput.name = `education[${key}][gradeValue]`;
      twelfthMarksheet.name = `education[${key}][marksheet]`;

      if (key === "diploma") {
        twelfthBlockTitle.textContent = "Diploma";
        twelfthSchoolLabel.innerHTML = 'Diploma Institute Name<span class="req">*</span>';
        twelfthMarksheetLabel.innerHTML = 'Upload Diploma Marksheet (PDF)<span class="req">*</span>';
      } else {
        twelfthBlockTitle.textContent = "12th Standard";
        twelfthSchoolLabel.innerHTML = 'School / College Name<span class="req">*</span>';
        twelfthMarksheetLabel.innerHTML = 'Upload 12th Marksheet (PDF)<span class="req">*</span>';
      }
    });
  });

  /* ============ RESET FORM ============ */
  function resetForm() {
    form.reset();
    resetSelect(department, "Select Institute First", true);
    resetSelect(branch, "Select Department First", true);
    resetSelect(specialization, "Select Branch First", true);
    passwordMismatch.style.display = "none";
    confirmPassword.setCustomValidity("");

    applyGradeLabel("percentage", tenthValueInput, tenthValueLabel);
    applyGradeLabel("percentage", twelfthValueInput, twelfthValueLabel);
    twelfthGradeTypeHidden.value = "percentage";

    twelfthBlockTitle.textContent = "12th Standard";
    twelfthSchoolLabel.innerHTML = 'School / College Name<span class="req">*</span>';
    twelfthMarksheetLabel.innerHTML = 'Upload 12th Marksheet (PDF)<span class="req">*</span>';
    twelfthSchool.name = "education[twelfth][schoolName]";
    twelfthGradeTypeHidden.name = "education[twelfth][gradeType]";
    twelfthValueInput.name = "education[twelfth][gradeValue]";
    twelfthMarksheet.name = "education[twelfth][marksheet]";
  }

  document.getElementById("resetTopBtn").addEventListener("click", resetForm);
  document.getElementById("resetBottomBtn").addEventListener("click", resetForm);
});