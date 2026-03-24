// js/admin/orders.js
const API = "http://localhost:4000/api";

function formatOrderDate(date) {
  if (!date) return "-";

  const d = new Date(date);
  return d.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function updateOrderStatus(id, status) {
  try {
    const res = await adminFetch(`${API}/admin/orders/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || "Failed to update");
      return;
    }

    loadAdminOrders();
  } catch (err) {
    console.error(err);
    showToast("Server error updating status");
  }
}

async function loadAdminOrders() {
  const table = document.getElementById("ordersTable");
  if (!table) return;

  const status = document.getElementById("statusFilter")?.value || "";
  const search = document.getElementById("searchOrder")?.value || "";

  try {
    const res = await adminFetch(`${API}/admin/orders`);
    let orders = await res.json();

    if (status) {
      orders = orders.filter(o =>
        (o.status || "").toLowerCase() === status.toLowerCase()
      );
    }

    if (search) {
      orders = orders.filter(o =>
        (o.orderNumber || "").includes(search)
      );
    }

    table.innerHTML = orders.map(o => {
      const itemsHtml = (o.items || []).map(i => `
        <div style="margin-bottom:6px">
          <div style="font-weight:600">${i.name} × ${i.qty}</div>
          ${i.bike ? `<div style="font-size:12px;color:#777">Bike: ${i.bike}</div>` : ""}
        </div>
      `).join("");

      return `
        <tr>
          <td>
            ${o.orderNumber}<br>
            <small style="color:#888">${formatOrderDate(o.date)}</small>
          </td>
          <td>${o.customerName}</td>
          <td style="min-width:180px">${itemsHtml}</td>
          <td>₱${(o.total || 0).toLocaleString()}</td>
          <td>
            <span class="badge ${
              o.paymentMethod === "PAYPAL" ? "bg-primary" : "bg-warning text-dark"
            }">
              ${o.paymentMethod || "COD"}
            </span>
          </td>
          <td>
            <span class="status ${String(o.status || "").toLowerCase()}">
              ${o.status || "-"}
            </span>
          </td>
          <td>
            <select
              onchange="updateOrderStatus('${o._id}', this.value)"
              style="padding:6px 10px;border-radius:8px;border:1px solid #ddd;font-weight:600;cursor:pointer;"
            >
              <option value="Pending" ${o.status==="Pending"?"selected":""}>Pending</option>
              <option value="Preparing" ${o.status==="Preparing"?"selected":""}>Preparing</option>
              <option value="Ship out" ${o.status==="Ship out"?"selected":""}>Ship out</option>
              <option value="Out for delivery" ${o.status==="Out for delivery"?"selected":""}>Out for delivery</option>
              <option value="Delivered" ${o.status==="Delivered"?"selected":""}>Delivered</option>
              <option value="Cancelled" ${o.status==="Cancelled"?"selected":""}>Cancelled</option>
            </select>
          </td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    console.error(err);
    showToast("Failed to load orders");
  }
}

async function exportOrdersCSV() {
  try {
    const res = await adminFetch(`${API}/admin/orders/export/csv`);

    if (!res.ok) {
      showToast("Failed to export CSV");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "orders.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    showToast("Export failed");
  }
}

document.getElementById("statusFilter")?.addEventListener("change", loadAdminOrders);
document.getElementById("searchOrder")?.addEventListener("input", loadAdminOrders);
document.getElementById("exportCsvBtn")?.addEventListener("click", exportOrdersCSV);

if (document.getElementById("ordersTable")) {
  loadAdminOrders();
}