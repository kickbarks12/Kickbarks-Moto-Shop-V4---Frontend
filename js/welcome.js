document.addEventListener("DOMContentLoaded", async () => {
  const modalEl = document.getElementById("welcomeModal");
  if (!modalEl || !window.bootstrap) return;

  const modal = new bootstrap.Modal(modalEl);
  const title = document.getElementById("welcomeTitle");
  const message = document.getElementById("welcomeMessage");
  const voucherBox = document.getElementById("voucherBox");

  try {
    const res = await fetch(`${window.API_BASE}/api/users/me`, {
      credentials: "include"
    });

    const user = res.ok ? await res.json() : null;

    if (user && !sessionStorage.getItem("welcomeUserShown")) {
      if (title) title.innerText = `Welcome back, ${user.name}!`;
      if (message) message.innerText = "Glad to see you again at Kickbarks Moto Shop 🏍️";
      if (voucherBox) voucherBox.classList.add("d-none");

      modal.show();
      sessionStorage.setItem("welcomeUserShown", "true");
      return;
    }

    if (!user && !sessionStorage.getItem("welcomeGuestShown")) {
      if (title) title.innerText = "Welcome to Kickbarks Moto Shop";
      if (message) message.innerText = "Premium motorcycle parts for real riders.";
      if (voucherBox) voucherBox.classList.remove("d-none");

      modal.show();
      sessionStorage.setItem("welcomeGuestShown", "true");
    }
  } catch (err) {
    console.error("Welcome modal failed:", err);
  }
});