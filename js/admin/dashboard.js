// js/admin/dashboard.js
const API = "https://kickbarks-moto-shop.onrender.com/api";
let salesChartInstance = null;

async function loadDashboard(range = "week") {
  const chartEl = document.getElementById("salesChart");
  if (!chartEl) return;

  try {
    const res = await adminFetch(`${API}/admin/dashboard?range=${range}`);
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || "Failed to load dashboard");
      return;
    }

    document.getElementById("totalSales").innerText = data.totalSales || 0;
    document.getElementById("totalOrders").innerText = data.totalOrders || 0;
    document.getElementById("pendingOrders").innerText = data.pendingOrders || 0;
    document.getElementById("totalProducts").innerText = data.totalProducts || 0;
    document.getElementById("activeVouchers").innerText = data.activeVouchers || 0;
    document.getElementById("todaySales").textContent = (data.todaySales || 0).toLocaleString();
    document.getElementById("ordersToday").textContent = data.ordersToday || 0;
    document.getElementById("productsSold").textContent = data.productsSold || 0;

    const completedEl = document.getElementById("completedOrders");
    if (completedEl) completedEl.innerText = data.completedOrders || 0;

    const ordersList = document.getElementById("recentOrders");
    ordersList.innerHTML = (data.recentOrders && data.recentOrders.length)
      ? data.recentOrders.map(o =>
          `<li class="list-group-item">${o.orderNumber} — ₱${o.total} — ${o.status}</li>`
        ).join("")
      : `<li class="list-group-item">No recent orders</li>`;

    const topList = document.getElementById("topProducts");
    topList.innerHTML = (data.topProducts && data.topProducts.length)
      ? data.topProducts.map(p =>
          `<li class="list-group-item">${p._id} — ${p.sold} sold</li>`
        ).join("")
      : `<li class="list-group-item">No data</li>`;

    if (salesChartInstance) {
      salesChartInstance.destroy();
    }

    salesChartInstance = new Chart(chartEl.getContext("2d"), {
      type: "line",
      data: {
        labels: (data.salesByDay || []).map(d => `${d._id.month}/${d._id.day}`),
        datasets: [{
          label: "Sales",
          data: (data.salesByDay || []).map(d => d.total)
        }]
      }
    });
  } catch (err) {
    console.error(err);
    showToast("Failed to load dashboard");
  }
}

if (document.getElementById("salesChart")) {
  loadDashboard();
}