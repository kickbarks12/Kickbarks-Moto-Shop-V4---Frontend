document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const btn = document.getElementById("resetBtn");
  const msg = document.getElementById("msg");
  const passwordInput = document.getElementById("password");
  const confirmInput = document.getElementById("confirmPassword");

  if (!btn || !msg || !passwordInput || !confirmInput) return;

  if (!token) {
    msg.innerText = "Invalid or expired reset link.";
    btn.disabled = true;
    return;
  }

  btn.addEventListener("click", resetPassword);

  async function resetPassword() {
    const password = passwordInput.value.trim();
    const confirm = confirmInput.value.trim();

    if (!password) {
      msg.innerText = "Please enter a new password.";
      return;
    }

    if (password !== confirm) {
      msg.innerText = "Passwords do not match.";
      return;
    }

    if (password.length < 6) {
      msg.innerText = "Password must be at least 6 characters.";
      return;
    }

    btn.disabled = true;
    btn.innerText = "Updating...";

    try {
      const res = await fetch(
        `${window.API_BASE}/api/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token, password })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        msg.innerText = data.error || "Reset failed. The link may be expired.";
        return;
      }

      if (data.success) {
        msg.innerText = "✅ Password updated! Redirecting to login...";

        setTimeout(() => {
          window.location.href = "/login.html";
        }, 1800);
      } else {
        msg.innerText = data.error || "Reset failed. The link may be expired.";
      }
    } catch (err) {
      console.error(err);
      msg.innerText = "Server error. Please try again.";
    } finally {
      btn.disabled = false;
      btn.innerText = "Update Password";
    }
  }
});