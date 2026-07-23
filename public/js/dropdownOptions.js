// public/js/data/dropdownOptions.js
//
// Single source of truth for every dropdown option list shared between
// the registration form (register.ejs) and the admin edit form
// (editStudent.ejs). Change a list here — both forms update
// automatically, nothing needs editing in two places.
//
// Loaded as a plain global (not a module import) so it works
// identically in both EJS pages without needing a bundler.

const DROPDOWN_OPTIONS = {
  title: [
    { value: "Mr", label: "Mr." },
    { value: "Ms", label: "Ms." },
    { value: "Mrs", label: "Mrs." },
  ],

  gender: [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" },
  ],

  bloodGroup: [
    { value: "A+", label: "A+" },
    { value: "A-", label: "A-" },
    { value: "B+", label: "B+" },
    { value: "B-", label: "B-" },
    { value: "AB+", label: "AB+" },
    { value: "AB-", label: "AB-" },
    { value: "O+", label: "O+" },
    { value: "O-", label: "O-" },
  ],

  category: [
    { value: "General", label: "General" },
    { value: "OBC", label: "OBC" },
    { value: "SC", label: "SC" },
    { value: "ST", label: "ST" },
    { value: "EWS", label: "EWS" },
    { value: "PWD", label: "PWD" },
  ],

  admissionType: [
    { value: "Regular", label: "Regular" },
    { value: "Lateral Entry", label: "Lateral Entry" },
    { value: "Transfer", label: "Transfer" },
  ],

  studentStatus: [
    { value: "active", label: "Active" },
    { value: "graduated", label: "Graduated" },
    { value: "dropped", label: "Dropped" },
    { value: "suspended", label: "Suspended" },
  ],

  profileStatus: [
    { value: "incomplete", label: "Incomplete" },
    { value: "pending", label: "Pending" },
    { value: "verified", label: "Verified" },
    { value: "rejected", label: "Rejected" },
  ],
};

// Renders a <select>'s <option> list from DROPDOWN_OPTIONS, marking
// whichever value matches `currentValue` as selected. Adds a blank
// placeholder option only if includeBlank is true (registration form
// typically wants one; admin edit form usually doesn't, since a value
// should already exist).
function renderDropdownOptions(select, key, currentValue, opts = {}) {
  const { includeBlank = false, blankLabel = "Select" } = opts;
  const list = DROPDOWN_OPTIONS[key] || [];

  let html = includeBlank
    ? `<option value="" ${!currentValue ? "selected disabled" : ""}>${blankLabel}</option>`
    : "";

  html += list
    .map(
      (opt) =>
        `<option value="${opt.value}" ${opt.value === currentValue ? "selected" : ""}>${opt.label}</option>`
    )
    .join("");

  select.innerHTML = html;
}