const SHIPPING_FEE = 150;

let cart = JSON.parse(localStorage.getItem("cart")) || [];
let savedVoucher = JSON.parse(sessionStorage.getItem("voucher")) || null;
let voucherDiscount = savedVoucher ? Number(savedVoucher.discount || 0) : 0;
let voucherCode = savedVoucher ? savedVoucher.code : null;
let subtotal = 0;
let finalTotal = 0;

const checkoutItems = document.getElementById("checkoutItems");
const subtotalEl = document.getElementById("subtotal");
const shippingEl = document.getElementById("shipping");
const discountEl = document.getElementById("discount");
const finalTotalEl = document.getElementById("finalTotal");
const mobileCheckoutTotal = document.getElementById("mobileCheckoutTotal");

const nameInput = document.getElementById("custName");
const emailInput = document.getElementById("custEmail");
const phoneInput = document.getElementById("custPhone");
const addressInput = document.getElementById("custAddress");

const placeOrderBtnDesktop = document.getElementById("placeOrderBtn");
const placeOrderBtnMobile = document.getElementById("placeOrderBtnMobile");

const codOption = document.getElementById("codOption");
const paypalOption = document.getElementById("paypalOption");
const paypalContainer = document.getElementById("paypal-button-container");

function calculateSubtotal() {
  return cart.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.qty) || 0;
    return sum + price * qty;
  }, 0);
}

function renderCheckoutItems() {
  if (!checkoutItems) return;

  if (!cart.length) {
    checkoutItems.innerHTML = `
      <div class="text-muted">Your cart is empty.</div>
    `;
    return;
  }

  checkoutItems.innerHTML = cart.map(item => {
    const price = Number(item.price) || 0;
    const qty = Number(item.qty) || 0;
    const lineTotal = price * qty;

    return `
      <li class="list-group-item">
        <div style="font-weight:600">${item.name || ""}</div>
        ${item.bike ? `<div style="font-size:13px;color:#777">Bike: ${item.bike}</div>` : ""}
        <div>${qty} × ₱${price.toLocaleString("en-PH")} = ₱${lineTotal.toLocaleString("en-PH")}</div>
      </li>
    `;
  }).join("");
}

function updateTotals() {
  subtotal = calculateSubtotal();
  finalTotal = subtotal + (cart.length ? SHIPPING_FEE : 0) - voucherDiscount;

  if (finalTotal < 0) finalTotal = 0;

  if (subtotalEl) subtotalEl.innerText = subtotal.toLocaleString("en-PH");
  if (shippingEl) shippingEl.innerText = (cart.length ? SHIPPING_FEE : 0).toLocaleString("en-PH");
  if (discountEl) discountEl.innerText = voucherDiscount.toLocaleString("en-PH");
  if (finalTotalEl) finalTotalEl.innerText = finalTotal.toLocaleString("en-PH");

  if (mobileCheckoutTotal) {
    mobileCheckoutTotal.innerText = `₱${finalTotal.toLocaleString("en-PH")}`;
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^09\d{9}$/.test(phone);
}

function isCheckoutFormValid() {
  return (
    nameInput?.value.trim().length >= 3 &&
    isValidEmail(emailInput?.value.trim() || "") &&
    isValidPhone(phoneInput?.value.trim() || "") &&
    addressInput?.value.trim().length >= 10 &&
    cart.length > 0
  );
}

function updatePlaceOrderState() {
  const valid = isCheckoutFormValid();

  if (placeOrderBtnDesktop) placeOrderBtnDesktop.disabled = !valid;
  if (placeOrderBtnMobile) placeOrderBtnMobile.disabled = !valid;
}

function setOrderButtonsLoading(loading, text = "Processing...") {
  if (placeOrderBtnDesktop) {
    placeOrderBtnDesktop.disabled = loading;
    placeOrderBtnDesktop.innerText = loading ? text : "Place Order";
  }

  if (placeOrderBtnMobile) {
    placeOrderBtnMobile.disabled = loading;
    placeOrderBtnMobile.innerText = loading ? text : "Place Order";
  }
}

function getCustomerDetails() {
  return {
    name: nameInput?.value.trim(),
    email: emailInput?.value.trim(),
    phone: phoneInput?.value.trim(),
    address: addressInput?.value.trim()
  };
}

async function placeOrder(paymentSource = "COD") {
  if (!cart.length) {
    showToast("Cart is empty", "error");
    return;
  }

  const customer = getCustomerDetails();

  if (!customer.name || !customer.email || !customer.phone || !customer.address) {
    showToast("Please complete customer details", "error");
    return;
  }

  if (!isValidEmail(customer.email)) {
    showToast("Enter a valid email", "error");
    return;
  }

  if (!isValidPhone(customer.phone)) {
    showToast("Phone must be 11 digits and start with 09", "error");
    return;
  }

  setOrderButtonsLoading(true);

  try {
    const res = await fetch(`${window.API_BASE}/api/orders`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: cart,
        customer,
        voucher: voucherCode,
        paymentMethod: paymentSource
      })
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.error || "Failed to place order");
    }

    localStorage.removeItem("cart");
    sessionStorage.removeItem("voucher");
    localStorage.removeItem("appliedVoucher");

    try {
      await fetch(`${window.API_BASE}/api/cart`, {
        method: "DELETE",
        credentials: "include"
      });
    } catch (err) {
      console.warn("Server cart delete failed:", err);
    }

    if (window.updateCartCount) {
      window.updateCartCount();
    }

    showToast("Order placed successfully");

    setTimeout(() => {
      window.location.href = `/order-success.html?id=${data.orderId}`;
    }, 1200);
  } catch (err) {
    console.error(err);
    showToast(err.message || "Failed to place order", "error");
    setOrderButtonsLoading(false);
  }
}

function initFormValidation() {
  [nameInput, emailInput, phoneInput, addressInput].forEach(input => {
    input?.addEventListener("input", updatePlaceOrderState);
  });

  updatePlaceOrderState();
}

function initPaymentToggle() {
  codOption?.addEventListener("change", () => {
    if (paypalContainer) paypalContainer.style.display = "none";
  });

  paypalOption?.addEventListener("change", () => {
    if (paypalContainer) paypalContainer.style.display = "block";
  });
}

function initPayPal() {
  if (!window.paypal || !paypalContainer) return;

  window.paypal.Buttons({
    createOrder: function (data, actions) {
      return actions.order.create({
        purchase_units: [{
          amount: {
            currency_code: "PHP",
            value: finalTotal.toFixed(2)
          }
        }]
      });
    },

    onApprove: function (data, actions) {
      return actions.order.capture().then(function () {
        showToast("Payment successful via PayPal");
        return placeOrder("PayPal");
      });
    },

    onError: function (err) {
      console.error("PayPal error:", err);
      showToast("PayPal payment failed", "error");
    }
  }).render("#paypal-button-container");
}

document.addEventListener("DOMContentLoaded", () => {
  renderCheckoutItems();
  updateTotals();
  initFormValidation();
  initPaymentToggle();
  initPayPal();
});

window.placeOrder = placeOrder;