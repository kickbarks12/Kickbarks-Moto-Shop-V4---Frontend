function signup(e) {
  e.preventDefault();

  const name = document.getElementById("name")?.value.trim();
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value;
  const mobile = document.getElementById("mobile")?.value.trim();
  const birthday = document.getElementById("birthday")?.value;

  if (!name || !email || !password || !mobile || !birthday) {
    showToast("Please complete all fields", "error");
    return;
  }

  const birthDate = new Date(birthday);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  const btn = e.target.querySelector("button");
  setButtonLoading(btn, true);

  fetch(`${window.API_BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      name,
      email,
      password,
      mobile,
      birthday,
      age
    })
  })
    .then(async res => {
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.msg || "Signup failed");
      }

      return data;
    })
    .then(() => {
      showToast("Account created successfully!");
      window.location.href = "/login.html";
    })
    .catch(err => {
      console.error(err);
      showToast(err.message || "Signup failed", "error");
    })
    .finally(() => {
      setButtonLoading(btn, false);
    });
}

function login(e) {
  e.preventDefault();

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const remember = document.getElementById("rememberMe")?.checked;

  if (!emailInput?.value.trim() || !passwordInput?.value) {
    showToast("Enter email and password", "error");
    return;
  }

  const btn = e.target.querySelector("button");
  setButtonLoading(btn, true);

  fetch(`${window.API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      email: emailInput.value.trim(),
      password: passwordInput.value,
      remember
    })
  })
    .then(async res => {
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid email or password");
      }

      return data;
    })
    .then(() => {
      if (remember) {
        localStorage.setItem("rememberEmail", emailInput.value.trim());
      } else {
        localStorage.removeItem("rememberEmail");
      }

      return fetch(`${window.API_BASE}/api/cart`, {
        credentials: "include"
      });
    })
    .then(async res => {
  const data = await res.json().catch(() => ({}));
  return data;
})
    .then(cart => {
      localStorage.setItem("cart", JSON.stringify(cart || []));

      if (window.updateCartCount) {
        window.updateCartCount();
      }

      window.location.href = "/index.html";
    })
    .catch(err => {
      console.error(err);
      showToast(err.message || "Login failed", "error");
    })
    .finally(() => {
      setButtonLoading(btn, false);
    });
}

document.addEventListener("DOMContentLoaded", () => {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const rememberBox = document.getElementById("rememberMe");

  const savedEmail = localStorage.getItem("rememberEmail");

  if (emailInput && savedEmail) emailInput.value = savedEmail;
  if (rememberBox && savedEmail && savedPass) rememberBox.checked = true;
});