// public/js/registerSubmit.js
//
// Intercepts the final "Register Student" submit and sends it via
// fetch() instead of a native form POST. This is the fix for: a
// server-side rejection (duplicate UG number, duplicate email, invalid
// DOB, etc.) previously caused a full page reload, which wiped every
// selected file input AND every typed field — forcing the student to
// redo the entire form, including re-uploading documents (which also
// re-triggers OCR load on the server for no reason).
//
// With fetch(), the page never reloads at all. Success -> redirect
// manually. Failure -> show the same red error banner in place,
// without touching anything else on the page — every field and every
// selected file remains exactly as the student left it.
//
// Requires controllers/registrationController.js's registerStudent to
// return JSON (not a rendered HTML page) for both success and failure
// paths. See accompanying instructions for that change.
//
// Include this AFTER studentRegistration.js and fileVerification.js:
//   <script src="/js/studentRegistration.js"></script>
//   <script src="/js/fileVerification.js"></script>
//   <script src="/js/registerSubmit.js"></script>

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("studentForm");
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');

  function ensureBanner() {
    let banner = document.querySelector(".form-error-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.className = "form-error-banner";
      banner.style.background = "#fee2e2";
      banner.style.color = "#991b1b";
      banner.style.padding = "12px 16px";
      banner.style.borderRadius = "8px";
      banner.style.marginBottom = "16px";
      banner.style.fontSize = "14px";
      form.insertBefore(banner, form.firstChild);
    }
    return banner;
  }

  function showError(message) {
    const banner = ensureBanner();
    banner.textContent = message;
    banner.style.display = "block";
    banner.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function clearError() {
    const banner = document.querySelector(".form-error-banner");
    if (banner) banner.style.display = "none";
  }

  let submitting = false;

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // stop the native POST + page reload, always

    if (submitting) return; // guard against double-click double-submit
    submitting = true;

    clearError();

    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : null;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = "Registering...";
    }

    try {
      const formData = new FormData(form); // captures every field AND every selected file, exactly as typed/selected

      const resp = await fetch("/register", {
        method: "POST",
        body: formData,
      });

      const contentType = resp.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        // Server returned something unexpected (e.g. an HTML error page
        // from a crash) — surface a generic message rather than trying
        // to parse HTML as JSON.
        throw new Error("Unexpected server response. Please try again.");
      }

      const data = await resp.json();

      if (resp.ok && data.success) {
        // Full success — safe to navigate away now, nothing left to preserve.
        window.location.href = data.redirectTo || "/students/registerSuccess";
        return;
      }

      // Server-side rejection (duplicate UG number, validation error,
      // etc.) — show it in place. Form fields and file selections are
      // untouched since we never reloaded the page.
      showError(data.error || "Registration failed. Please check the form and try again.");
    } catch (err) {
      showError(err.message || "Something went wrong. Please check your connection and try again.");
    } finally {
      submitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
      }
    }
  });
});