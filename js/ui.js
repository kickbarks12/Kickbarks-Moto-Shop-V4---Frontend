window.API_BASE = "https://kickbarks-moto-shop.onrender.com";

function showLoader() {
  document.getElementById("loader")?.classList.remove("d-none");
}

function hideLoader() {
  document.getElementById("loader")?.classList.add("d-none");
}

function setButtonLoading(btn, loading = true) {
  if (!btn) return;

  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `
      <span class="spinner-border spinner-border-sm me-2"></span>
      Processing...
    `;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || "Submit";
  }
}

window.showToast = function (message, type = "success", duration = 2000) {
  let toast = document.getElementById("toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";

    const span = document.createElement("span");
    span.className = "toast-message";

    toast.appendChild(span);
    document.body.appendChild(toast);
  }

  const msg = toast.querySelector(".toast-message");
  msg.textContent = message;
  toast.className = `toast ${type} show`;

  clearTimeout(toast._timer);

  toast._timer = setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
};
window.__kbCache = new Map();

window.fetchJSONCached = async function (url, options = {}, ttl = 30000) {
  const key = `${url}:${JSON.stringify(options)}`;
  const now = Date.now();

  const cached = window.__kbCache.get(key);
  if (cached && now - cached.time < ttl) {
    return cached.data;
  }

  const res = await fetch(url, options);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Request failed");
  }

  window.__kbCache.set(key, {
    time: now,
    data
  });

  return data;
};