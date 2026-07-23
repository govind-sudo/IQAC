// public/js/registerSubmit.js
//
// Intercepts the final "Register Student" submit and sends it via
// fetch() instead of a native form POST.

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

    // FIX: e.preventDefault() above also silently disables the browser's
    // native required-field validation, since that only fires as part
    // of a genuine native submit event. Trigger it manually here so
    // blank/invalid required fields are still caught client-side with
    // the browser's normal red validation bubble, instead of only
    // being caught later by the server (which produced a confusing
    // "click register, get an error" experience).
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (submitting) return;
    submitting = true;

    clearError();

    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : null;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = "Registering...";
    }

    try {
      const formData = new FormData(form);

      const resp = await fetch("/register", {
        method: "POST",
        body: formData,
      });

      const contentType = resp.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Unexpected server response. Please try again.");
      }

      const data = await resp.json();

      if (resp.ok && data.success) {
        window.location.href = data.redirectTo || "/students/registerSuccess";
        return;
      }

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