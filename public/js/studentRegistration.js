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

  // residesInHostel.addEventListener("change", () => {
  //   const show = residesInHostel.value === "true";
  //   hostelNameField.style.display = show ? "flex" : "none";
  //   hostelNameInput.required = show;
  //   if (!show) hostelNameInput.value = "";
  // });
      residesInHostel.addEventListener("change", () => {
    const show = residesInHostel.value === "true";
    hostelNameField.style.display = show ? "flex" : "none";
    hostelNameInput.required = show;
    if (!show) hostelNameInput.value = "";
  });

  /* ============ NATIONALITY TOGGLE ============ */

  const nationalityType = document.getElementById("nationalityType");

  const nationalityField = document.getElementById("nationalityField");
  const nationalityInput = document.getElementById("nationality");

  const passportNumberField = document.getElementById("passportNumberField");
  const passportNumber = document.getElementById("passportNumber");

  const categoryField = document.getElementById("categoryField");
  const casteField = document.getElementById("casteField");
  const abcField = document.getElementById("abcField");
  const aadhaarField = document.getElementById("aadhaarField");

  const educationSection = document.getElementById("educationSection");
  const internationalEducation = document.getElementById("internationalEducation");

  const indianDocuments = document.getElementById("indianDocuments");
  const internationalDocuments = document.getElementById("internationalDocuments");
  function toggleNationalityFields() {

      const isIndian = nationalityType.value === "Indian";

      // ---------------------------
      // Nationality textbox
      // ---------------------------

      nationalityField.style.display = isIndian ? "none" : "flex";

      nationalityInput.required = !isIndian;

      if (isIndian)
          nationalityInput.value = "Indian";
      else 
          nationalityInput.value = "";



      // ---------------------------
      // Passport Number
      // ---------------------------

      passportNumberField.style.display = isIndian ? "none" : "flex";

      passportNumber.required = !isIndian;

      if (isIndian)
          passportNumber.value = "";

      // ---------------------------
      // Indian-only fields
      // ---------------------------

      categoryField.style.display = isIndian ? "flex" : "none";
      casteField.style.display = isIndian ? "flex" : "none";
      abcField.style.display = isIndian ? "flex" : "none";
      aadhaarField.style.display = isIndian ? "flex" : "none";

      // ---------------------------
      // Education
      // ---------------------------

      educationSection.style.display = isIndian ? "block" : "none";
      internationalEducation.style.display = isIndian ? "none" : "block";

      // ---------------------------
      // Documents
      // ---------------------------

      indianDocuments.style.display = isIndian ? "grid" : "none";
      internationalDocuments.style.display = isIndian ? "none" : "grid";
  }
  nationalityType.addEventListener("change", toggleNationalityFields);

  /* ============ NATIONALITY TOGGLE (INTERNATIONAL DOCUMENTS) ============ */
  const nationality = document.getElementById("nationality");
  const internationalDocsSection = document.getElementById("internationalDocsSection");
  const aoLevelCertificateInput = document.getElementById("aoLevelCertificate");
  const puOfferLetterInput = document.getElementById("puOfferLetter");
  const passportInput = document.getElementById("passport");

  function toggleInternationalDocs() {
    const show = nationality.value === "Other";
    internationalDocsSection.style.display = show ? "block" : "none";
    [aoLevelCertificateInput, puOfferLetterInput, passportInput].forEach((input) => {
      input.required = show;
      if (!show) input.value = ""; // clear any previously selected file
    });
  }

  nationality.addEventListener("change", toggleInternationalDocs);
  /* ============ SAME AS PRESENT ADDRESS ============ */
  // const sameAsPresent = document.getElementById("sameAsPresent");

  // const addressPairs = [
  //   ["presAddress1", "permAddress1"],
  //   ["presAddress2", "permAddress2"],
  //   ["presCity",     "permCity"],
  //   ["presDistrict", "permDistrict"],
  //   ["presState",    "permState"],
  //   ["presCountry",  "permCountry"],
  //   ["presPincode",  "permPincode"],
  // ];

  // sameAsPresent.addEventListener("change", () => {
  //   const permInputs = addressPairs.map(([, permId]) => document.getElementById(permId));
  //   if (sameAsPresent.checked) {
  //     addressPairs.forEach(([presId, permId]) => {
  //       document.getElementById(permId).value = document.getElementById(presId).value;
  //     });
  //     permInputs.forEach((el) => (el.disabled = true));
  //   } else {
  //     permInputs.forEach((el) => (el.disabled = false));
  //   }
  // });

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

  function toggleCountry(prefix) {

    const country = document.getElementById(prefix + "Country");

    const stateSelect = document.getElementById(prefix + "State");
    const districtSelect = document.getElementById(prefix + "District");

    const stateText = document.getElementById(prefix + "StateText");
    const districtText = document.getElementById(prefix + "DistrictText");
    const countryText = document.getElementById(prefix + "CountryText");

    function update() {

        if (country.value === "India") {

            stateSelect.style.display = "";
            districtSelect.style.display = "";

            stateText.style.display = "none";
            districtText.style.display = "none";
            countryText.style.display = "none";

            stateText.removeAttribute("name");
            districtText.removeAttribute("name");
            countryText.removeAttribute("name");

            stateSelect.name = prefix === "pres"
                ? "presentAddress[state]"
                : "permanentAddress[state]";

            districtSelect.name = prefix === "pres"
                ? "presentAddress[district]"
                : "permanentAddress[district]";

            country.name = prefix === "pres"
                ? "presentAddress[country]"
                : "permanentAddress[country]";
        }
        else {

            stateSelect.style.display = "none";
            districtSelect.style.display = "none";

            stateText.style.display = "";
            districtText.style.display = "";
            countryText.style.display = "";

            stateSelect.removeAttribute("name");
            districtSelect.removeAttribute("name");
            // The select's job here is just to pick "Other"; the actual
            // country name is submitted from countryText instead, so it
            // can't also carry the presentAddress[country]/permanentAddress[country] name.
            country.removeAttribute("name");

            stateText.name = prefix === "pres"
                ? "presentAddress[state]"
                : "permanentAddress[state]";

            districtText.name = prefix === "pres"
                ? "presentAddress[district]"
                : "permanentAddress[district]";

            countryText.name = prefix === "pres"
                ? "presentAddress[country]"
                : "permanentAddress[country]";
        }
    }

    country.addEventListener("change", update);

    update();
}
toggleCountry("pres");
toggleCountry("perm");

// ========== POPULATE STATE & DISTRICT FROM STATIC JSON ==========
let districtsMap = {};

// Fetch the list of states
fetch('/data/indiaStates.json')
  .then(res => res.json())
  .then(states => {
    const stateDropdowns = [
      document.getElementById('presState'),
      document.getElementById('permState')
    ];
    stateDropdowns.forEach(dropdown => {
      dropdown.innerHTML = '<option value="" selected disabled>Select State</option>';
      states.forEach(state => {
        const opt = document.createElement('option');
        opt.value = state;
        opt.textContent = state;
        dropdown.appendChild(opt);
      });
      // Enable the dropdown (it might be disabled from earlier setup)
      dropdown.disabled = false;
    });
  })
  .catch(err => console.error('Failed to load states:', err));

// Fetch the district map
fetch('/data/indiaDistricts.json')
  .then(res => res.json())
  .then(data => {
    districtsMap = data;
  })
  .catch(err => console.error('Failed to load districts:', err));

// Helper to link a State dropdown with its District dropdown
function setupDistrictPopulation(stateId, districtId) {
  const stateSelect = document.getElementById(stateId);
  const districtSelect = document.getElementById(districtId);

  stateSelect.addEventListener('change', () => {
    const state = stateSelect.value;
    // Reset district dropdown
    districtSelect.innerHTML = '<option value="" selected disabled>Select District</option>';
    if (districtsMap[state]) {
      districtsMap[state].forEach(district => {
        const opt = document.createElement('option');
        opt.value = district;
        opt.textContent = district;
        districtSelect.appendChild(opt);
      });
      districtSelect.disabled = false;
    } else {
      districtSelect.disabled = true;
    }
  });
}

// Wire up both address sections
setupDistrictPopulation('presState', 'presDistrict');
setupDistrictPopulation('permState', 'permDistrict');
toggleNationalityFields();

});