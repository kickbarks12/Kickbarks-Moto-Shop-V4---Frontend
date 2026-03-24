document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  const msg = document.getElementById("contactMsg");

  if (!form || !msg) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = document.getElementById("contactName")?.value.trim();
    const email = document.getElementById("contactEmail")?.value.trim();
    const message = document.getElementById("contactMessage")?.value.trim();

    if (!name || !email || !message) {
      msg.className = "text-danger mt-3";
      msg.innerText = "Please complete all fields.";
      return;
    }

    try {
      const res = await fetch(`${window.API_BASE}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, message })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send message.");
      }

      msg.className = "text-success mt-3";
      msg.innerText = "Message sent successfully!";
      form.reset();
      showToast("Message sent successfully");
    } catch (err) {
      console.error("CONTACT ERROR:", err);
      msg.className = "text-danger mt-3";
      msg.innerText = err.message || "Server connection error.";
      showToast("Failed to send message", "error");
    }
  });
});