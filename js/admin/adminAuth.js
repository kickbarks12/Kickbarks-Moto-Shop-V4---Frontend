// js/admin/adminAuth.js
const adminToken = localStorage.getItem("adminToken");
const isLoginPage = window.location.pathname.includes("login.html");

if (!adminToken && !isLoginPage) {
  window.location.href = "/admin/login.html";
}

async function adminFetch(url, options = {}) {
  const token = localStorage.getItem("adminToken");

  if (!options.headers) options.headers = {};
  options.headers["Authorization"] = "Bearer " + token;

  return fetch(url, options);
}

function adminLogout() {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminUser");
  window.location.href = "/admin/login.html";
}