const API = "https://kickbarks-moto-shop.onrender.com/api";

document.addEventListener("DOMContentLoaded", loadAdminOrderDetails);

async function loadAdminOrderDetails() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("id");

  if (!orderId) {
    alert("No order ID found");
    return;
  }

  try {
    const res = await adminFetch(`${API}/admin/orders/${orderId}`);

    if (!res.ok) {
      throw new Error("Order not found");
    }

    const order = await res.json();
    renderOrder(order);
  } catch (err) {
    console.error(err);
    alert("Failed to load order");
  }
}

function renderOrder(order) {
  const info = document.getElementById("orderInfo");
  const items = document.getElementById("orderItems");

  info.innerHTML = `
    <p><strong>Order #:</strong> ${order.orderNumber || "-"}</p>
    <p><strong>Date:</strong> ${order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}</p>
    <p><strong>Customer:</strong> ${order.customerName || "-"}</p>
    <p><strong>Email:</strong> ${order.customerEmail || "-"}</p>
    <p><strong>Phone:</strong> ${order.customerPhone || "-"}</p>
    <p><strong>Address:</strong> ${order.customerAddress || "-"}</p>
    <p><strong>Payment:</strong> ${order.paymentMethod || "COD"}</p>
    <p><strong>Status:</strong> ${order.status || "-"}</p>
    <p><strong>Total:</strong> ₱${Number(order.total || 0).toLocaleString("en-PH")}</p>
  `;

  items.innerHTML = "";

  const orderItems = Array.isArray(order.items) ? order.items : [];

  if (!orderItems.length) {
    items.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">No products found in this order</td>
      </tr>
    `;
    return;
  }

  orderItems.forEach(item => {
    const imageSrc = item.image || "";
    const productName = item.name || "No product name";
    const bike = item.bike || "-";
    const qty = Number(item.qty || 1);
    const price = Number(item.price || 0);

    items.insertAdjacentHTML("beforeend", `
      <tr>
        <td>
          ${
            imageSrc
              ? `<img
                  src="${imageSrc}"
                  alt="${productName}"
                  onclick="openImageModal('${imageSrc}')"
                  style="width:80px; height:80px; object-fit:cover; border-radius:8px; cursor:pointer;"
                  onerror="this.outerHTML='<span class=&quot;text-muted&quot;>No image</span>';"
                >`
              : `<span class="text-muted">No image</span>`
          }
        </td>
        <td>${productName}</td>
        <td>${bike}</td>
        <td>${qty}</td>
        <td>₱${price.toLocaleString("en-PH")}</td>
      </tr>
    `);
  });
}

function openImageModal(src) {
  const modal = document.getElementById("imageModal");
  const img = document.getElementById("modalImg");
  img.src = src;
  modal.style.display = "flex";
}

document.getElementById("imageModal")?.addEventListener("click", function () {
  this.style.display = "none";
});

window.openImageModal = openImageModal;