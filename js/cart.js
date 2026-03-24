let appliedVoucher = null;
let voucherDiscount = 0;
let cart = [];

const cartList = document.getElementById("cartList");
const subtotalEl = document.getElementById("subtotal");
const shippingEl = document.getElementById("shipping");
const discountEl = document.getElementById("discount");
const totalEl = document.getElementById("total");
const cartItemCountEl = document.getElementById("cartItemCount");
const emptyCartEl = document.getElementById("emptyCart");
const voucherInput = document.getElementById("voucherInput");
const voucherMessage = document.getElementById("voucherMessage");
const mobileCartTotal = document.getElementById("mobileCartTotal");

function syncCartToServer(cartItems) {
  fetch(`${window.API_BASE}/api/cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ items: cartItems })
  }).catch(err => console.error("Cart sync failed", err));
}

async function loadCart() {
  try {
    const res = await fetch(`${window.API_BASE}/api/cart`, {
      credentials: "include"
    });

    if (!res.ok) {
      throw new Error("Failed to load server cart");
    }

    const data = await res.json();
    cart = Array.isArray(data) ? data : [];
    localStorage.setItem("cart", JSON.stringify(cart));
  } catch (err) {
    console.warn("Using local cart fallback:", err);
    cart = JSON.parse(localStorage.getItem("cart")) || [];
  }

  restoreVoucher();
  renderCart();
}

function restoreVoucher() {
  const savedVoucher = JSON.parse(sessionStorage.getItem("voucher"));

  if (savedVoucher) {
    appliedVoucher = savedVoucher.code;
    voucherDiscount = Number(savedVoucher.discount || 0);

    if (voucherMessage) {
      voucherMessage.innerText = `Voucher applied: -₱${voucherDiscount.toLocaleString("en-PH")}`;
    }
  } else {
    appliedVoucher = null;
    voucherDiscount = 0;
    if (voucherMessage) voucherMessage.innerText = "";
  }
}

function calculateSubtotal() {
  return cart.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.qty) || 0;
    return sum + price * qty;
  }, 0);
}

function getShippingFee() {
  return cart.length > 0 ? 150 : 0;
}

function getFinalTotal() {
  const subtotal = calculateSubtotal();
  const shipping = getShippingFee();
  let total = subtotal + shipping - voucherDiscount;

  if (total < 0) total = 0;
  return total;
}

function renderCart() {
  if (!cartList) return;

  if (!cart.length) {
    cartList.innerHTML = "";
    if (emptyCartEl) emptyCartEl.classList.remove("d-none");

    appliedVoucher = null;
    voucherDiscount = 0;
    sessionStorage.removeItem("voucher");
    localStorage.removeItem("appliedVoucher");

    updateSummary();
    if (window.updateCartCount) window.updateCartCount();
    return;
  }

  if (emptyCartEl) emptyCartEl.classList.add("d-none");

  cartList.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <div class="cart-img">
        <img
          src="${
            item.image
              ? (item.image.startsWith("http")
                  ? item.image
                  : window.API_BASE + item.image)
              : "/images/placeholder.png"
          }"
          loading="lazy"
          alt="${item.name || "Cart item"}"
        >
      </div>

      <div class="cart-info">
        <div class="cart-item-title">${item.name || ""}</div>
        ${item.bike ? `<div class="cart-bike">Bike: ${item.bike}</div>` : ""}
      </div>

      <div class="cart-price">
        ₱${Number(item.price || 0).toLocaleString("en-PH")}
      </div>

      <div class="cart-qty">
        <input
          type="number"
          min="1"
          value="${Number(item.qty || 1)}"
          onchange="setQty(${index}, this.value)"
        />
      </div>

      <div class="cart-remove">
        <button onclick="removeItem(${index})">Remove</button>
      </div>
    </div>
  `).join("");

  updateSummary();

  if (window.updateCartCount) {
    window.updateCartCount();
  }
}

function updateSummary() {
  const subtotal = calculateSubtotal();
  const shipping = getShippingFee();
  const total = getFinalTotal();
  const itemCount = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

  if (subtotalEl) subtotalEl.innerText = subtotal.toLocaleString("en-PH");
  if (shippingEl) shippingEl.innerText = shipping.toLocaleString("en-PH");
  if (discountEl) discountEl.innerText = voucherDiscount.toLocaleString("en-PH");
  if (totalEl) totalEl.innerText = total.toLocaleString("en-PH");

  if (cartItemCountEl) {
    cartItemCountEl.innerText = `${itemCount} item${itemCount === 1 ? "" : "s"}`;
  }

  if (mobileCartTotal) {
    mobileCartTotal.innerText = `₱${total.toLocaleString("en-PH")}`;
  }
}

function persistCart() {
  localStorage.setItem("cart", JSON.stringify(cart));

  if (!cart.length) {
    fetch(`${window.API_BASE}/api/cart`, {
      method: "DELETE",
      credentials: "include"
    }).catch(err => console.error("Delete cart failed", err));
  } else {
    syncCartToServer(cart);
  }

  if (window.updateCartCount) {
    window.updateCartCount();
  }
}

function setQty(index, value) {
  const qty = Number(value);

  if (!Number.isFinite(qty) || qty < 1) {
    renderCart();
    return;
  }

  cart[index].qty = qty;
  persistCart();
  renderCart();
}

function removeItem(index) {
  cart.splice(index, 1);
  persistCart();
  renderCart();
}

async function applyVoucher() {
  const code = voucherInput?.value.trim();

  if (!code) {
    if (voucherMessage) voucherMessage.innerText = "Please enter a voucher code";
    return;
  }

  try {
    const res = await fetch(`${window.API_BASE}/api/vouchers/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        code,
        subtotal: calculateSubtotal()
      })
    });

    const data = await res.json();

    if (!res.ok || !data.valid) {
      appliedVoucher = null;
      voucherDiscount = 0;
      sessionStorage.removeItem("voucher");
      localStorage.removeItem("appliedVoucher");
      updateSummary();

      if (voucherMessage) {
        voucherMessage.innerText = data.message || "Invalid voucher";
      }
      return;
    }

    appliedVoucher = data.code;
    voucherDiscount = Number(data.discount || 0);

    localStorage.setItem("appliedVoucher", data.code);
    sessionStorage.setItem(
      "voucher",
      JSON.stringify({
        code: data.code,
        discount: data.discount
      })
    );

    if (voucherMessage) {
      voucherMessage.innerText = `Voucher applied: -₱${voucherDiscount.toLocaleString("en-PH")}`;
    }

    updateSummary();
    showToast("Voucher applied");
  } catch (err) {
    console.error(err);
    if (voucherMessage) voucherMessage.innerText = "Failed to apply voucher";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadCart();

  document.getElementById("applyVoucherBtn")?.addEventListener("click", applyVoucher);
});

window.setQty = setQty;
window.removeItem = removeItem;