document.addEventListener("DOMContentLoaded", loadOrderDetails);

async function loadOrderDetails() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("id");

  if (!orderId) {
    alert("No order ID found");
    return;
  }

  try {
    const res = await fetch(`${window.API_BASE}/api/orders/${orderId}`, {
      credentials: "include"
    });

    if (!res.ok) {
      throw new Error("Order not found");
    }

    const order = await res.json();
    console.log("ORDER DETAILS:", order);

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
    <p><strong>Total:</strong> ₱${Number(order.total || 0).toLocaleString("en-PH")}</p>
  `;

  items.innerHTML = "";

  const orderItems = Array.isArray(order.items) ? order.items : [];

  if (!orderItems.length) {
    items.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted">No products found in this order</td>
      </tr>
    `;
    return;
  }

  orderItems.forEach(item => {
const productName =
  item.name ||
  item.productName ||
  item.product?.name ||
  item.product?.title ||
  "No product name";

const quantity =
  item.qty ||
  item.quantity ||
  item.count ||
  1;

const price =
  item.price ||
  item.product?.price ||
  item.amount ||
  0;

let imageSrc =
  item.image ||
  item.product?.image ||
  item.product?.images?.[0] ||
  "";

if (imageSrc) {
  if (!imageSrc.startsWith("http")) {
    imageSrc = `${window.API_BASE || ""}${imageSrc}`;
  }
} else {
  imageSrc = "./images/placeholder.png";
}

items.insertAdjacentHTML("beforeend", `
  <tr>
    <td>
      <img
        src="${imageSrc}"
        alt="${productName}"
        style="width:80px; height:80px; object-fit:cover; border-radius:8px;"
        onerror="this.onerror=null; this.src='./images/placeholder.png';"
      >
    </td>
    <td>${productName}</td>
    <td>${quantity}</td>
    <td>₱${Number(price).toLocaleString("en-PH")}</td>
  </tr>
`);
  });
}