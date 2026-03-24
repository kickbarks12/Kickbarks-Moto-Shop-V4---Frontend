// js/admin/admin.js
const API = "https://kickbarks-moto-shop.onrender.com/api";

async function adminLogin() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const res = await fetch(`${API}/auth/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.token) {
      localStorage.setItem("adminToken", data.token);

      if (data.user) {
        localStorage.setItem("adminUser", JSON.stringify(data.user));
      }

      window.location.href = "/admin/dashboard.html";
      return;
    }

    document.getElementById("error").innerText =
      data.error || "Login failed";
  } catch (err) {
    console.error(err);
    document.getElementById("error").innerText = "Server error";
  }
}