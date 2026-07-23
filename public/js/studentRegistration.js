document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("studentForm");

  /* ============ CASCADING DROPDOWNS ============ */
  // Hierarchy: faculty → institute → course → branch → specialization
  // "course" is bound to the #department select (id kept as-is; it posts
  // to req.body.course, not a department field — see registrationController.js).
  const faculty = document.getElementById("faculty");
  const institute = document.getElementById("institute");
  const course = document.getElementById("department");
  const branch = document.getElementById("branch");
  const specialization = document.getElementById("specialization");

  const INSTITUTE_OPTIONS = {
    FET: [
      {
        value: "Parul Institute of Engineering and Technology",
        label: "Parul Institute of Engineering and Technology (PIET)",
      },
    ],
  };

  const COURSE_OPTIONS = {
    "Parul Institute of Engineering and Technology": [
      { value: "Bachelor of Technology", label: "Bachelor of Technology (B.Tech.)" },
    ],
  };

  const BRANCH_OPTIONS = {
    "Bachelor of Technology": [
      { value: "CSE", label: "Computer Science and Engineering (CSE)" },
    ],
  };

  const SPECIALIZATION_OPTIONS = {
    CSE: [
      { value: "AIML", label: "Artificial Intelligence and Machine Learning (AIML)" },
      { value: "AIRO", label: "Artificial Intelligence and Robotics (AIRO)" },
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

  faculty.addEventListener("change", () => {
    const opts = INSTITUTE_OPTIONS[faculty.value];
    opts
      ? populateSelect(institute, opts, "Select Institute")
      : resetSelect(institute, "Select Faculty First", true);
    resetSelect(course, "Select Institute First", true);
    resetSelect(branch, "Select Course First", true);
    resetSelect(specialization, "Select Branch First", true);
  });

  institute.addEventListener("change", () => {
    const opts = COURSE_OPTIONS[institute.value];
    opts
      ? populateSelect(course, opts, "Select Course")
      : resetSelect(course, "Select Institute First", true);
    resetSelect(branch, "Select Course First", true);
    resetSelect(specialization, "Select Branch First", true);
  });

  course.addEventListener("change", () => {
    const opts = BRANCH_OPTIONS[course.value];
    opts
      ? populateSelect(branch, opts, "Select Branch")
      : resetSelect(branch, "Select Course First", true);
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

      // Category
      document.getElementById("category").required = isIndian;
      categoryField.style.display = isIndian ? "flex" : "none";

      // Caste
      document.getElementById("caste").required = isIndian;
      casteField.style.display = isIndian ? "flex" : "none";

      // ABC
      document.getElementById("abcId").required = isIndian;
      abcField.style.display = isIndian ? "flex" : "none";

      // Aadhaar
      document.getElementById("aadhaarNumber").required = isIndian;
      aadhaarField.style.display = isIndian ? "flex" : "none";

      // ---------------------------
      // Education
      // ---------------------------

      educationSection.style.display = isIndian ? "block" : "none";
      const educationRequired = isIndian;

      document.getElementById("tenthSchool").required = educationRequired;
      document.getElementById("tenthPercentage").required = educationRequired;

      document.getElementById("twelfthSchool").required = educationRequired;
      document.getElementById("twelfthPercentage").required = educationRequired;
      internationalEducation.style.display = isIndian ? "none" : "block";
      document.getElementById("aoLevelCertificate").required = !isIndian;
      document.getElementById("aadhaarProof").required = false;

      document.getElementById("leavingCertificate").required = false;

      document.getElementById("passportUpload").required = false;

      document.getElementById("puAdmissionLetter").required = false;
      // ---------------------------
      // Documents
      // ---------------------------
//       const category = document.getElementById("category");
//       const casteProof = document.getElementById("casteProof");

//       document.getElementById("casteProof").required = isIndian && category.value !== "General";
//       function updateCasteProofRequirement() {

//         const isIndian = nationalityType.value === "Indian";
          
//         if (!isIndian) {
//             casteProof.required = false;
//             return;
//         }
      
//         casteProof.required = category.value !== "General";
//     }

// category.addEventListener("change", updateCasteProofRequirement);
// nationalityType.addEventListener("change", updateCasteProofRequirement);

// updateCasteProofRequirement();
      indianDocuments.style.display = isIndian ? "grid" : "none";
      internationalDocuments.style.display = isIndian ? "none" : "grid";

      updateCategoryDocuments();
  }
  nationalityType.addEventListener("change", toggleNationalityFields);

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
        twelfthMarksheetLabel.innerHTML = 'Upload Diploma Marksheet (PDF/JPG/PNG)<span class="req">*</span>';
      } else {
        twelfthBlockTitle.textContent = "12th Standard";
        twelfthSchoolLabel.innerHTML  = 'School / College Name<span class="req">*</span>';
        twelfthMarksheetLabel.innerHTML = 'Upload 12th Marksheet (PDF/JPG/PNG)<span class="req">*</span>';
      }
    });
  });

  /* ============ RESET FORM ============ */
  function resetForm() {
    form.reset();

    resetSelect(institute, "Select Faculty First", true);
    resetSelect(course, "Select Institute First", true);
    resetSelect(branch, "Select Course First", true);
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
    twelfthMarksheetLabel.innerHTML = 'Upload 12th Marksheet (PDF/JPG/PNG)<span class="req">*</span>';
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
          
        const isIndia = country.value === "India";
        
        if (isIndia) {
            countryText.required = false;
            // Show dropdowns
            stateSelect.style.display = "";
            districtSelect.style.display = "";
        
            // Hide textboxes
            stateText.style.display = "none";
            districtText.style.display = "none";
            countryText.style.display = "none";
        
            // Names
            stateSelect.name = prefix === "pres"
                ? "presentAddress[state]"
                : "permanentAddress[state]";
        
            districtSelect.name = prefix === "pres"
                ? "presentAddress[district]"
                : "permanentAddress[district]";
        
            country.name = prefix === "pres"
                ? "presentAddress[country]"
                : "permanentAddress[country]";
        
            stateText.removeAttribute("name");
            districtText.removeAttribute("name");
            countryText.removeAttribute("name");
        
            // Required
            stateSelect.required = true;
            districtSelect.required = true;
            country.required = true;
        
            stateText.required = false;
            districtText.required = false;
            countryText.required = false;
        
        }
        else {
            countryText.required = true;
            // Hide dropdowns
            stateSelect.style.display = "none";
            districtSelect.style.display = "none";
        
            // Show textboxes
            stateText.style.display = "";
            districtText.style.display = "";
            countryText.style.display = "";
        
            // Remove dropdown names
            stateSelect.removeAttribute("name");
            districtSelect.removeAttribute("name");
            country.removeAttribute("name");
        
            // Textbox names
            stateText.name = prefix === "pres"
                ? "presentAddress[state]"
                : "permanentAddress[state]";
        
            districtText.name = prefix === "pres"
                ? "presentAddress[district]"
                : "permanentAddress[district]";
        
            countryText.name = prefix === "pres"
                ? "presentAddress[country]"
                : "permanentAddress[country]";
        
            // Required
            stateSelect.required = false;
            districtSelect.required = false;
            country.required = false;
        
            stateText.required = true;
            districtText.required = true;
            countryText.required = true;
        }

    }

    country.addEventListener("change", update);

    update();
}
// toggleCountry("pres");
toggleCountry("perm");

let countryCodes = [];

function populatePhoneCodeDropdown(select) {

    select.innerHTML = "";

    countryCodes.forEach(country => {

        const option = document.createElement("option");

        option.value = country.dialCode;

        option.textContent = `${country.name} (${country.dialCode})`;

        if (country.dialCode === "+91") {
            option.selected = true;
        }

        select.appendChild(option);

    });

}

fetch("/data/countryCodes.json")
    .then(res => res.json())
    .then(data => {

        countryCodes = data;

        populatePhoneCodeDropdown(document.getElementById("phoneCode"));
        populatePhoneCodeDropdown(document.getElementById("fatherPhoneCode"));
        populatePhoneCodeDropdown(document.getElementById("motherPhoneCode"));
        populatePhoneCodeDropdown(document.getElementById("emergencyPhoneCode"));

    })
    .catch(err => console.error(err));

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
function updateCategoryDocuments() {

    const isIndian = nationalityType.value === "Indian";

    const category = document.getElementById("category").value;

    const casteField = document.getElementById("casteProofField");
    const casteInput = document.getElementById("casteProof");

    const pwdField = document.getElementById("pwdProofField");
    const pwdInput = document.getElementById("pwdProof");

    casteField.style.display = "none";
    pwdField.style.display = "none";

    casteInput.required = false;
    pwdInput.required = false;

    if (!isIndian) {
        return;
    }

    if (category === "General") {
        return;
    }

    if (category === "PWD") {
        pwdField.style.display = "flex";
        pwdInput.required = true;
        return;
    }

    casteField.style.display = "flex";
    casteInput.required = true;
}

// Wire up both address sections
setupDistrictPopulation('presState', 'presDistrict');
setupDistrictPopulation('permState', 'permDistrict');
toggleNationalityFields();

document
    .getElementById("category")
    .addEventListener("change", updateCategoryDocuments);

nationalityType.addEventListener(
    "change",
    updateCategoryDocuments
);

updateCategoryDocuments();

});