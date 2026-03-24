fetch(`${window.API_BASE}/api/users/me`, {
  credentials: "include"
})
  .then(res => {
    if (!res.ok) {
      window.location.href = "/login.html";
    }
  });
