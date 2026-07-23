// public/js/fileVerification.js
//
// Wires every <input type="file"> on the registration form to:
//   1. An instant AJAX signature check on selection (⏳ -> ✅ / ❌).
//   2. An OCR + AI semantic check against the form fields already typed
//      in (name / Aadhaar / passport / percentage), run right after the
//      signature check passes.
// The "Register Student" button stays disabled until every REQUIRED
// file field currently visible on the form has passed BOTH checks.
//
// Cancelling: clicking Reset (top or bottom button) aborts every
// in-flight validate/verify request immediately, so a student who
// changes their mind mid-upload doesn't burn OCR/AI tokens on a file
// that's about to be cleared anyway.
//
// Include this script AFTER studentRegistration.js on register.ejs:
//   <script src="/js/studentRegistration.js"></script>
//   <script src="/js/fileVerification.js"></script>

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("studentForm");
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const resetButtons = [
    document.getElementById("resetTopBtn"),
    document.getElementById("resetBottomBtn"),
  ].filter(Boolean);

  const fileInputs = Array.from(form.querySelectorAll('input[type="file"]'));

  // fieldName -> { status: 'idle'|'scanning'|'valid'|'invalid'|'verifying'|'verified'|'mismatch',
  //                controller: AbortController|null }
  const fileState = new Map();

  // ---------- Status pill UI (injected, no EJS changes needed) ----------
  function ensureStatusEl(input) {
    let el = input.parentElement.querySelector(".file-verify-status");
    if (!el) {
      el = document.createElement("div");
      el.className = "file-verify-status";
      el.style.fontSize = "12px";
      el.style.marginTop = "4px";
      input.insertAdjacentElement("afterend", el);
    }
    return el;
  }

  function paintStatus(input, status, message) {
    const el = ensureStatusEl(input);
    const icons = {
        loading: `
          <svg class="status-icon spin" viewBox="0 0 24 24" width="18" height="18" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" opacity="0.25"/>
            <path d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"/>
          </svg>
        `,

        success: `
          <svg class="status-icon" viewBox="0 0 24 24" width="18" height="18" fill="none">
            <circle cx="12" cy="12" r="10" fill="currentColor" opacity=".15"/>
            <path d="M7 12.5l3.2 3.2L17 9"
                  stroke="currentColor"
                  stroke-width="2.3"
                  stroke-linecap="round"
                  stroke-linejoin="round"/>
          </svg>
        `,

        error: `
          <svg class="status-icon" viewBox="0 0 24 24" width="18" height="18" fill="none">
            <circle cx="12" cy="12" r="10" fill="currentColor" opacity=".15"/>
            <path d="M8 8l8 8M16 8l-8 8"
                  stroke="currentColor"
                  stroke-width="2.3"
                  stroke-linecap="round"/>
          </svg>
        `,

        warning: `
          <svg class="status-icon" viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path d="M12 3L2.8 19a2 2 0 001.8 3h14.8a2 2 0 001.8-3L12 3z"
                  fill="currentColor"
                  opacity=".15"/>
            <path d="M12 8v6M12 17h.01"
                  stroke="currentColor"
                  stroke-width="2.3"
                  stroke-linecap="round"/>
          </svg>
        `
      };

      const map = {
        idle: {
          text: "",
          icon: "",
          color: "#8b929c",
        },
      
        scanning: {
          text: "Scanning...",
          icon: icons.loading,
          color: "#b5680a",
        },
      
        invalid: {
          text: message || "Invalid file",
          icon: icons.error,
          color: "#e0433c",
        },
      
        valid: {
          text: "File format OK — checking details...",
          icon: icons.success,
          color: "#1d6fe0",
        },
      
        verifying: {
          text: "Verifying details (OCR/AI)...",
          icon: icons.loading,
          color: "#b5680a",
        },
      
        verified: {
          text: "Verified",
          icon: icons.success,
          color: "#1a9c4c",
        },
      
        mismatch: {
          text: message || "Details don't match the form",
          icon: icons.warning,
          color: "#e0433c",
        },
      };

    const cfg = map[status] || map.idle;

    el.innerHTML = `
        ${cfg.icon}
        <span>${cfg.text}</span>
    `;
        
    el.style.color = cfg.color;
  }

  function fieldNameFor(input) {
    return input.name; // e.g. "documents[aadhaarProof]"
  }

  function isRequiredNow(input) {
    // Respect whatever studentRegistration.js has toggled .required to,
    // and skip fields hidden by display:none sections entirely.
    if (input.closest('[style*="display: none"]')) return false;
    const field = input.closest(".form-field");
    if (field && field.offsetParent === null) return false; // hidden via CSS
    return input.required;
  }

  // ---------- Form snapshot sent alongside the file for semantic checks ----------
  function buildFormSnapshot() {
  const val = (id) => (document.getElementById(id)?.value || "").trim();
  const fullName = [val("firstName"), val("middleName"), val("lastName")]
    .filter(Boolean)
    .join(" ");

  return {
    fullName,
    dob: val("dob"),
    aadhaarNumber: val("aadhaarNumber"),
    passportNumber: val("passportNumber"),
    abcId: val("abcId"),
  };
}


  // marksheet fields need the *matching* percentage, not a generic one
  function percentageFor(fieldName, snapshot) {
    if (fieldName.includes("[tenth]")) return snapshot.tenthPercentage;
    if (fieldName.includes("[twelfth]") || fieldName.includes("[diploma]")) {
      return snapshot.twelfthPercentage;
    }
    return undefined;
  }

  function updateSubmitState() {
    const requiredInputs = fileInputs.filter((i) => isRequiredNow(i) && i.files.length);
    const stillRequiredButEmpty = fileInputs.some((i) => isRequiredNow(i) && !i.files.length);

    const allFilesVerified =
      !stillRequiredButEmpty &&
      requiredInputs.every((i) => fileState.get(fieldNameFor(i))?.status === "verified");

    const anyFileInFlight = fileInputs.some((i) => {
      const status = fileState.get(fieldNameFor(i))?.status;
      return status === "scanning" || status === "verifying";
    });

    const allFieldsValid = form.checkValidity();
    const formReady = allFilesVerified && allFieldsValid;

    if (submitBtn) {
      // Only truly disable (blocking clicks) while a file check is
      // actively in progress — clicking during that window genuinely
      // shouldn't submit. Otherwise, keep the button clickable even
      // when the form isn't ready yet, so clicking it still triggers
      // the browser's native validity warnings (registerSubmit.js
      // calls checkValidity()/reportValidity() on click) instead of
      // silently doing nothing.
      submitBtn.disabled = anyFileInFlight;
      submitBtn.classList.toggle("btn-not-ready", !formReady && !anyFileInFlight);
    }
}

  function abortInFlight(fieldName) {
    const state = fileState.get(fieldName);
    if (state?.controller) {
      state.controller.abort();
      state.controller = null;
    }
  }

  function abortAll() {
    fileState.forEach((state, fieldName) => abortInFlight(fieldName));
  }

  async function runValidationPipeline(input) {
    const fieldName = fieldNameFor(input);
    const file = input.files[0];

    abortInFlight(fieldName); // cancel any previous check still running for this field

    if (!file) {
      fileState.set(fieldName, { status: "idle", controller: null });
      paintStatus(input, "idle");
      updateSubmitState();
      return;
    }

    const controller = new AbortController();
    fileState.set(fieldName, { status: "scanning", controller });
    paintStatus(input, "scanning");
    updateSubmitState();

    // ---- Step 1: signature check ----
    let sigResult;
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("fieldName", fieldName);
      const resp = await fetch("/register/validate-file", {
        method: "POST",
        body: fd,
        signal: controller.signal,
      });
      sigResult = await resp.json();
    } catch (err) {
      if (err.name === "AbortError") return; // cancelled, e.g. by reset
      fileState.set(fieldName, { status: "invalid", controller: null });
      paintStatus(input, "invalid", "Could not reach the server. Try again.");
      updateSubmitState();
      return;
    }

    if (!sigResult.valid) {
      fileState.set(fieldName, { status: "invalid", controller: null });
      paintStatus(input, "invalid", sigResult.reason);
      updateSubmitState();
      return;
    }

    paintStatus(input, "valid");

    // ---- Step 2: OCR + AI semantic verification ----
    const snapshot = buildFormSnapshot();
    const percentage = percentageFor(fieldName, snapshot);

    // Block BEFORE calling the server at all if the required matching
    // number isn't filled in yet — no point burning OCR/AI compute (or
    // the network round-trip) on a document that can't be verified
    // regardless of what it actually contains. Mirrors the same rule
    // enforced server-side in documentVerifier.js, but catches it
    // instantly here instead of after a full OCR pass.
    if (!snapshot.fullName) {
      fileState.set(fieldName, { status: "mismatch", controller: null });
      paintStatus(input, "mismatch", "Please enter your name on the form first.");
      updateSubmitState();
      return;
    }
    if (fieldName === "documents[aadhaarProof]" && !snapshot.aadhaarNumber) {
      fileState.set(fieldName, { status: "mismatch", controller: null });
      paintStatus(input, "mismatch", "Please enter your Aadhaar number on the form first.");
      updateSubmitState();
      return;
    }
    if (fieldName === "documents[abcIdProof]" && !snapshot.abcId) {
      fileState.set(fieldName, { status: "mismatch", controller: null });
      paintStatus(input, "mismatch", "Please enter your ABC/APAAR ID on the form first.");
      updateSubmitState();
      return;
    }
    if (fieldName === "documents[passportUpload]" && !snapshot.passportNumber) {
      fileState.set(fieldName, { status: "mismatch", controller: null });
      paintStatus(input, "mismatch", "Please enter your Passport number on the form first.");
      updateSubmitState();
      return;
    }

    const formSnapshot = {
      fullName: snapshot.fullName,
      dob: snapshot.dob,
      aadhaarNumber: snapshot.aadhaarNumber,
      passportNumber: snapshot.passportNumber,
      abcId: snapshot.abcId,
    };

    const controller2 = new AbortController();
    fileState.set(fieldName, { status: "verifying", controller: controller2 });
    paintStatus(input, "verifying");

    let verifyResult;
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("fieldName", fieldName);
      fd.append("formSnapshot", JSON.stringify(formSnapshot));
      const resp = await fetch("/register/verify-document", {
        method: "POST",
        body: fd,
        signal: controller2.signal,
      });
      verifyResult = await resp.json();
    } catch (err) {
      if (err.name === "AbortError") return; // cancelled
      fileState.set(fieldName, { status: "mismatch", controller: null });
      paintStatus(input, "mismatch", "Verification failed. Try again.");
      updateSubmitState();
      return;
    }

    if (verifyResult.verified) {
      fileState.set(fieldName, { status: "verified", controller: null });
      paintStatus(input, "verified");
    } else {
      const first = verifyResult.mismatches?.[0]?.message || "Details don't match the form";
      fileState.set(fieldName, { status: "mismatch", controller: null });
      paintStatus(input, "mismatch", first);
    }
    updateSubmitState();
  }

  fileInputs.forEach((input) => {
    fileState.set(fieldNameFor(input), { status: "idle", controller: null });
    input.addEventListener("change", () => runValidationPipeline(input));
  });

  // Re-check "required" driven states (e.g. nationality/category toggles)
  // whenever the form changes shape, so the button doesn't stay disabled
  // waiting on a field that's no longer required, or stay enabled once a
  // newly-required field appears.
  form.addEventListener("change", updateSubmitState);
  form.addEventListener("input", updateSubmitState);

  // ---------- Cancel everything on Reset ----------
  resetButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      abortAll();
      fileInputs.forEach((input) => {
        fileState.set(fieldNameFor(input), { status: "idle", controller: null });
        paintStatus(input, "idle");
      });
      updateSubmitState();
    });
  });

  // Belt-and-braces: native form reset (if anything ever triggers it)
  form.addEventListener("reset", () => {
    abortAll();
    fileInputs.forEach((input) => {
      fileState.set(fieldNameFor(input), { status: "idle", controller: null });
      paintStatus(input, "idle");
    });
    updateSubmitState();
  });

  // Also abort everything if the student navigates away mid-check.
  window.addEventListener("beforeunload", abortAll);

  updateSubmitState();
});
