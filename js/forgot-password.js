document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("sendBtn");
  const msg = document.getElementById("msg");
  const emailInput = document.getElementById("email");

  if (!btn || !msg || !emailInput) return;

  btn.addEventListener("click", sendReset);

  async function sendReset() {
    const email = emailInput.value.trim();

    if (!email) {
      showToast("Enter your email", "error");
      return;
    }

    btn.disabled = true;
    btn.innerText = "Sending...";

    try {
      const res = await fetch(
        `${window.API_BASE}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        msg.innerText = data.error || "Failed to send reset link.";
        return;
      }

      msg.innerText = "✅ If the email exists, a reset link was sent.";
    } catch (err) {
      console.error(err);
      msg.innerText = "Server error.";
    } finally {
      btn.disabled = false;
      btn.innerText = "Send Reset Link";
    }
  }
});