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

    renderOrder(order);

  } catch (err) {
    console.error(err);
    alert("Failed to load order");
  }
}

function renderOrder(order) {
  const info = document.getElementById("orderInfo");
  const items = document.getElementById("orderItems");

  // Top info
  info.innerHTML = `
    <p><strong>Order #:</strong> ${order.orderNumber}</p>
    <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
    <p><strong>Total:</strong> ₱${order.total}</p>
  `;

  // Items
  items.innerHTML = "";

  order.items.forEach(item => {
    items.insertAdjacentHTML("beforeend", `
      <tr>
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>₱${item.price}</td>
      </tr>
    `);
  });
}