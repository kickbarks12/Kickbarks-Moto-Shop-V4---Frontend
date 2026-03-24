let refundModal = null;
let currentPage = 1;
let currentSearch = "";

document.addEventListener("DOMContentLoaded", initProfile);

function initProfile() {
  initRefundModal();
  checkAuthAndLoadProfile();

  const searchInput = document.getElementById("orderSearch");
  searchInput?.addEventListener("input", searchOrders);
}

function showProfileLoading(show) {
  document.getElementById("profileLoading")?.classList.toggle("d-none", !show);
}

async function checkAuthAndLoadProfile() {
  showProfileLoading(true);

  try {
    const res = await fetch(`${window.API_BASE}/api/users/me`, {
      credentials: "include"
    });

    if (!res.ok) {
      window.location.href = "/login.html";
      return;
    }

    const user = await res.json();

    renderProfile(user);
    await Promise.all([
      loadWishlist(),
      loadOrders(),
      loadVouchers()
    ]);
  } catch (err) {
    console.error("Profile load failed:", err);
    showToast("Failed to load profile", "error");
  } finally {
    showProfileLoading(false);
  }
}

function initRefundModal() {
  const modalEl = document.getElementById("refundModal");

  if (!modalEl || !window.bootstrap?.Modal) return;

  refundModal = new bootstrap.Modal(modalEl, {
    backdrop: true,
    keyboard: true
  });
}

async function logout() {
  try {
    await fetch(`${window.API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include"
    });
  } catch (err) {
    console.error("Logout failed:", err);
  }

  localStorage.removeItem("cart");
  localStorage.removeItem("appliedVoucher");
  sessionStorage.removeItem("voucher");

  if (window.updateCartCount) {
    window.updateCartCount();
  }

  window.location.href = "/index.html";
}

function getTrackingHTML(status) {
  const steps = [
    "Pending",
    "Preparing",
    "Ship out",
    "Out for delivery",
    "Delivered"
  ];

  if (status === "Cancelled") {
    return `
      <div style="padding:12px;color:red;font-weight:600;">
        ❌ Order Cancelled
      </div>
    `;
  }

  let html = `
    <div class="track-bar" style="display:flex;justify-content:space-between;margin-top:8px;position:relative;">
      <div style="position:absolute;top:10px;left:0;right:0;height:4px;background:#e5e7eb;z-index:0;"></div>
  `;

  steps.forEach(step => {
    const active = steps.indexOf(status) >= steps.indexOf(step);

    html += `
      <div style="flex:1;text-align:center;position:relative;z-index:1;">
        <div style="
          width:18px;
          height:18px;
          margin:auto;
          border-radius:50%;
          background:${active ? "#16a34a" : "#d1d5db"};
        "></div>

        <span style="
          font-size:12px;
          display:block;
          margin-top:4px;
          color:${active ? "#16a34a" : "#999"};
          font-weight:${active ? "600" : "400"};
        ">
          ${step}
        </span>
      </div>
    `;
  });

  html += `</div>`;
  return html;
}

function formatOrderDate(date) {
  if (!date) return "";

  return new Date(date).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function loadWishlist() {
  try {
    const res = await fetch(`${window.API_BASE}/api/users/wishlist`, {
      credentials: "include"
    });

    const items = await res.json();
    const wishlistEl = document.getElementById("wishlist");
    if (!wishlistEl) return;

    if (!Array.isArray(items) || items.length === 0) {
      wishlistEl.innerHTML = `
        <li class="list-group-item text-center">
          No wishlist items
        </li>
      `;
      return;
    }

    wishlistEl.innerHTML = items.map(p => `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <span>${p.name}</span>
        <div>
          <button class="btn btn-sm btn-primary" onclick='addWishlistToCart(${JSON.stringify(p)})'>
            Add to Cart
          </button>
          <button class="btn btn-sm btn-danger ms-2" onclick="removeWishlist('${p._id}')">
            ✕
          </button>
        </div>
      </li>
    `).join("");
  } catch (err) {
    console.error("Wishlist load failed:", err);
  }
}

function addWishlistToCart(product) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const found = cart.find(i => i.productId === product._id);

  if (found) {
    found.qty += 1;
  } else {
    cart.push({
      productId: product._id,
      name: product.name,
      price: product.price?.mio || product.price || 0,
      qty: 1,
      image: product.images?.[0] || ""
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart));

  fetch(`${window.API_BASE}/api/cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ items: cart })
  }).catch(err => console.error("Cart sync failed:", err));

  if (window.updateCartCount) {
    window.updateCartCount();
  }

  showToast("Added to cart");
}

async function removeWishlist(productId) {
  try {
    await fetch(`${window.API_BASE}/api/users/wishlist/${productId}`, {
      method: "POST",
      credentials: "include"
    });

    await loadWishlist();
    showToast("Removed from wishlist");
  } catch (err) {
    console.error("Wishlist remove failed:", err);
    showToast("Failed to update wishlist", "error");
  }
}

function searchOrders() {
  currentSearch = document.getElementById("orderSearch")?.value || "";
  loadOrders(1);
}

async function loadOrders(page = 1) {
  currentPage = page;

  const params = new URLSearchParams({
    page,
    search: currentSearch
  });

  try {
    const res = await fetch(`${window.API_BASE}/api/orders?${params.toString()}`, {
      credentials: "include",
      cache: "no-store"
    });

    const data = await res.json();
    renderOrders(data.orders || []);
    renderPagination(data.currentPage || 1, data.totalPages || 1);
  } catch (err) {
    console.error("Order load error:", err);
  }
}

function renderOrders(orders = []) {
  const list = document.getElementById("orders");
  if (!list) return;

  list.innerHTML = "";

  if (!orders.length) {
    list.innerHTML = `
      <li class="list-group-item text-muted text-center">
        No orders found.
      </li>
    `;
    return;
  }

  orders.forEach(order => {
    const canCancel = order.status === "Pending";
    const canRefund =
      (order.status === "Cancelled" || order.status === "Completed" || order.status === "Delivered") &&
      order.refundStatus !== "Refunded";

    list.insertAdjacentHTML("beforeend", `
      <li class="list-group-item">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <strong>Order #${order.orderNumber}</strong><br>
            <small style="color:#666;">${formatOrderDate(order.createdAt)}</small><br>
            <small>Total: ₱${Number(order.total || 0).toLocaleString("en-PH")}</small>

            ${
              order.refundStatus && order.refundStatus !== "None"
                ? `<small class="d-block text-muted">Refund: ${order.refundStatus}</small>`
                : ""
            }
          </div>

          <div class="text-end">
            <span class="badge ${
              order.status === "Pending"
                ? "bg-warning text-dark"
                : order.status === "Cancelled"
                ? "bg-danger"
                : "bg-success"
            }">
              ${order.status}
            </span>

            ${
              canCancel
                ? `<button class="btn btn-sm btn-outline-danger mt-2" onclick="cancelOrder('${order._id}')">
                     Cancel
                   </button>`
                : ""
            }

            ${
              canRefund
                ? `<button class="btn btn-sm btn-outline-warning mt-2 ms-1" onclick="openRefundModal('${order._id}')">
                     Request Refund
                   </button>`
                : ""
            }
          </div>
        </div>

        <div style="margin-top:14px;">
          ${getTrackingHTML(order.status)}
        </div>
      </li>
    `);
  });
}

function renderPagination(current, total) {
  const pagination = document.getElementById("pagination");
  if (!pagination) return;

  pagination.innerHTML = "";

  if (total <= 1) return;

  if (current > 1) {
    pagination.innerHTML += `
      <li class="page-item">
        <a class="page-link" href="#" onclick="loadOrders(${current - 1}); return false;">Prev</a>
      </li>
    `;
  }

  for (let i = 1; i <= total; i++) {
    pagination.innerHTML += `
      <li class="page-item ${i === current ? "active" : ""}">
        <a class="page-link" href="#" onclick="loadOrders(${i}); return false;">${i}</a>
      </li>
    `;
  }

  if (current < total) {
    pagination.innerHTML += `
      <li class="page-item">
        <a class="page-link" href="#" onclick="loadOrders(${current + 1}); return false;">Next</a>
      </li>
    `;
  }
}

async function cancelOrder(orderId) {
  if (!confirm("Are you sure you want to cancel this order?")) return;

  try {
    const res = await fetch(`${window.API_BASE}/api/orders/${orderId}/cancel`, {
      method: "PATCH",
      credentials: "include"
    });

    const data = await res.json();

    if (!data.success) {
      showToast(data.error || "Unable to cancel order", "error");
      return;
    }

    showToast("Order cancelled");
    loadOrders(currentPage);
  } catch (err) {
    console.error("Cancel error:", err);
    showToast("Something went wrong", "error");
  }
}

function openRefundModal(orderId) {
  if (!refundModal) {
    showToast("Refund modal not ready", "error");
    return;
  }

  document.getElementById("refundOrderId").value = orderId;
  document.getElementById("refundReason").value = "";
  refundModal.show();
}

async function submitRefund() {
  const orderId = document.getElementById("refundOrderId").value;
  const reason = document.getElementById("refundReason").value.trim();

  if (!reason) {
    showToast("Please enter a refund reason", "error");
    return;
  }

  try {
    const res = await fetch(`${window.API_BASE}/api/orders/${orderId}/refund`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });

    const data = await res.json();

    if (!data.success) {
      showToast(data.error || "Refund failed", "error");
      return;
    }

    refundModal?.hide();
    showToast("Refund request submitted");
    loadOrders(currentPage);
  } catch (err) {
    console.error("Refund error:", err);
    showToast("Something went wrong", "error");
  }
}

function renderProfile(user) {
  document.getElementById("welcomeName").innerText = user.name || "User";

  const nameEl = document.getElementById("profileName");
  const emailEl = document.getElementById("profileEmail");
  const mobileEl = document.getElementById("profileMobile");
  const birthdayEl = document.getElementById("profileBirthday");

  if (nameEl) nameEl.innerText = user.name || "—";
  if (emailEl) emailEl.innerText = user.email || "—";
  if (mobileEl) mobileEl.innerText = user.mobile || "—";
  if (birthdayEl) {
    birthdayEl.innerText = user.birthday
      ? new Date(user.birthday).toLocaleDateString()
      : "—";
  }

  const avatar = document.getElementById("profileAvatar");
  const initials = document.getElementById("profileInitial");

  if (user.avatar && avatar && initials) {
    avatar.src = user.avatar;
    avatar.style.display = "block";
    initials.style.display = "none";
  } else if (initials) {
    const letters = (user.name || "U")
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase();

    initials.textContent = letters;
    initials.style.display = "inline-flex";
    if (avatar) avatar.style.display = "none";
  }
}

function copyVoucher(code) {
  navigator.clipboard.writeText(code);
  showToast(`Voucher ${code} copied`);
}

async function loadVouchers() {
  try {
    const res = await fetch(`${window.API_BASE}/api/vouchers/my`, {
      credentials: "include"
    });

    const vouchers = await res.json();
    const list = document.getElementById("voucherList");
    if (!list) return;

    if (!Array.isArray(vouchers) || !vouchers.length) {
      list.innerHTML = "<li>No available vouchers</li>";
      return;
    }

    list.innerHTML = vouchers.map(v => `
      <li class="list-group-item d-flex justify-content-between">
        <div>
          <strong>${v.code}</strong><br>
          <small>₱${Number(v.amount || 0).toLocaleString("en-PH")} OFF ${v.minSpend ? `• Min ₱${Number(v.minSpend).toLocaleString("en-PH")}` : ""}</small>
        </div>
        <button class="btn btn-sm btn-outline-primary" onclick="copyVoucher('${v.code}')">
          Copy
        </button>
      </li>
    `).join("");
  } catch (err) {
    console.error("Voucher load failed:", err);
  }
}

async function uploadAvatar() {
  const input = document.getElementById("avatarUpload");
  const file = input?.files?.[0];

  if (!file) {
    showToast("Please select an image", "error");
    return;
  }

  const formData = new FormData();
  formData.append("avatar", file);

  try {
    const res = await fetch(`${window.API_BASE}/api/users/avatar`, {
      method: "POST",
      credentials: "include",
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to upload avatar");
    }

    showToast("Avatar updated");
    checkAuthAndLoadProfile();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Failed to upload avatar", "error");
  }
}

window.logout = logout;
window.addWishlistToCart = addWishlistToCart;
window.removeWishlist = removeWishlist;
window.loadOrders = loadOrders;
window.cancelOrder = cancelOrder;
window.openRefundModal = openRefundModal;
window.submitRefund = submitRefund;
window.copyVoucher = copyVoucher;
window.uploadAvatar = uploadAvatar;