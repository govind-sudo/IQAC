document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("studentForm");

  /* ============ CASCADING DROPDOWNS ============ */
  // FIXED: institute → faculty → department → branch → specialization
  // Previously the "department" dropdown was holding Faculty values (FET),
  // which is wrong per the schema's Faculty > Department hierarchy.
  const institute = document.getElementById("institute");
  const faculty = document.getElementById("faculty");
  const department = document.getElementById("department");
  const branch = document.getElementById("branch");
  const specialization = document.getElementById("specialization");

  const FACULTY_OPTIONS = {
    "Parul Institute of Engineering and Technology": [
      { value: "FET", label: "FET — Faculty of Engineering and Technology" },
    ],
  };

  const DEPARTMENT_OPTIONS = {
    FET: [
      { value: "Bachelor of Technology", label: "Bachelor of Technology" },
    ],
  };

  const BRANCH_OPTIONS = {
    "Bachelor of Technology": [
      { value: "CSE", label: "Computer Science and Engineering (CSE)" },
    ],
  };

  const SPECIALIZATION_OPTIONS = {
    CSE: [
      { value: "AIML", label: "AI/ML — Artificial Intelligence and Machine Learning" },
      { value: "AIRO", label: "AIRO — Artificial Intelligence and Robotics" },
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
    const opts = FACULTY_OPTIONS[institute.value];
    opts
      ? populateSelect(faculty, opts, "Select Faculty")
      : resetSelect(faculty, "Select Institute First", true);
    resetSelect(department, "Select Faculty First", true);
    resetSelect(branch, "Select Department First", true);
    resetSelect(specialization, "Select Branch First", true);
  });

  faculty.addEventListener("change", () => {
    const opts = DEPARTMENT_OPTIONS[faculty.value];
    opts
      ? populateSelect(department, opts, "Select Department")
      : resetSelect(department, "Select Faculty First", true);
    resetSelect(branch, "Select Department First", true);
    resetSelect(specialization, "Select Branch First", true);
  });

  department.addEventListener("change", () => {
    const opts = BRANCH_OPTIONS[department.value];
    opts
      ? populateSelect(branch, opts, "Select Branch")
      : resetSelect(branch, "Select Department First", true);
    resetSelect(specialization, "Select Branch First", true);
  });

  branch.addEventListener("change", () => {
    const opts = SPECIALIZATION_OPTIONS[branch.value];
    opts
      ? populateSelect(specialization, opts, "Select Specialization")
      : resetSelect(specialization, "Select Branch First", true);
  });

  /* ============ HOSTEL TOGGLE ============ */
  const residesInHostel = document.getElementById("residesInHostel");
  const hostelNameField = document.getElementById("hostelNameField");
  const hostelNameInput = document.getElementById("hostelName");

  residesInHostel.addEventListener("change", () => {
    const show = residesInHostel.value === "true";
    hostelNameField.style.display = show ? "flex" : "none";
    hostelNameInput.required = show;
    if (!show) hostelNameInput.value = "";
  });

  /* ============ SAME AS PRESENT ADDRESS ============ */
  const sameAsPresent = document.getElementById("sameAsPresent");

  const addressPairs = [
    ["presAddress1", "permAddress1"],
    ["presAddress2", "permAddress2"],
    ["presCity",     "permCity"],
    ["presDistrict", "permDistrict"],
    ["presState",    "permState"],
    ["presCountry",  "permCountry"],
    ["presPincode",  "permPincode"],
  ];

  sameAsPresent.addEventListener("change", () => {
    const permInputs = addressPairs.map(([, permId]) => document.getElementById(permId));
    if (sameAsPresent.checked) {
      addressPairs.forEach(([presId, permId]) => {
        document.getElementById(permId).value = document.getElementById(presId).value;
      });
      permInputs.forEach((el) => (el.disabled = true));
    } else {
      permInputs.forEach((el) => (el.disabled = false));
    }
  });

  /* ============ PERCENTAGE / CGPA TOGGLE — 10th ============ */


  const tenthPercentageInput = document.getElementById("tenthPercentage");

  const twelfthPercentageInput = document.getElementById("twelfthPercentage");

  /* ============ 12th vs DIPLOMA TOGGLE ============ */
  const qualificationRadios = document.querySelectorAll('input[name="qualificationType"]');
  const twelfthBlockTitle = document.getElementById("twelfthBlockTitle");
  const twelfthSchoolLabel = document.getElementById("twelfthSchoolLabel");
  const twelfthMarksheetLabel = document.getElementById("twelfthMarksheetLabel");
  const twelfthSchool = document.getElementById("twelfthSchool");
  const twelfthMarksheet = document.getElementById("twelfthMarksheet");

  qualificationRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      const key = radio.value; // "twelfth" or "diploma"

      twelfthSchool.name           = `education[${key}][schoolName]`;
      twelfthPercentageInput.name = `education[${key}][percentage]`;
      twelfthMarksheet.name        = `education[${key}][marksheet]`;

      if (key === "diploma") {
        twelfthBlockTitle.textContent = "Diploma";
        twelfthSchoolLabel.innerHTML  = 'Diploma Institute Name<span class="req">*</span>';
        twelfthMarksheetLabel.innerHTML = 'Upload Diploma Marksheet (PDF)<span class="req">*</span>';
      } else {
        twelfthBlockTitle.textContent = "12th Standard";
        twelfthSchoolLabel.innerHTML  = 'School / College Name<span class="req">*</span>';
        twelfthMarksheetLabel.innerHTML = 'Upload 12th Marksheet (PDF)<span class="req">*</span>';
      }
    });
  });

  /* ============ RESET FORM ============ */
  function resetForm() {
    form.reset();

    resetSelect(faculty, "Select Institute First", true);
    resetSelect(department, "Select Faculty First", true);
    resetSelect(branch, "Select Department First", true);
    resetSelect(specialization, "Select Branch First", true);

    hostelNameField.style.display = "none";
    hostelNameInput.required = false;

    addressPairs.map(([, permId]) => document.getElementById(permId))
      .forEach((el) => (el.disabled = false));

    // applyGradeLabel("percentage", tenthValueInput, tenthValueLabel);
    // tenthGradeTypeHidden.value = "percentage";

    // applyGradeLabel("percentage", twelfthValueInput, twelfthValueLabel);
    // twelfthGradeTypeHidden.value = "percentage";

    twelfthBlockTitle.textContent   = "12th Standard";
    twelfthSchoolLabel.innerHTML    = 'School / College Name<span class="req">*</span>';
    twelfthMarksheetLabel.innerHTML = 'Upload 12th Marksheet (PDF)<span class="req">*</span>';
    twelfthSchool.name              = "education[twelfth][schoolName]";
    // twelfthGradeTypeHidden.name     = "education[twelfth][gradeType]";
    // twelfthValueInput.name          = "education[twelfth][gradeValue]";
    twelfthPercentageInput.name = "education[twelfth][percentage]";
    twelfthMarksheet.name           = "education[twelfth][marksheet]";
  }

  document.getElementById("resetTopBtn").addEventListener("click", resetForm);
  document.getElementById("resetBottomBtn").addEventListener("click", resetForm);
});