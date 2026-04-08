const API = "https://kickbarks-moto-shop.onrender.com/api";
let salesChartInstance = null;

function formatPeso(value) {
  return `₱${Number(value || 0).toLocaleString("en-PH")}`;
}

function getStatusBadgeClass(status) {
  const s = String(status || "").toLowerCase();

  if (s === "pending") return "bg-warning text-dark";
  if (s === "preparing") return "bg-info text-dark";
  if (s === "ship out") return "bg-primary";
  if (s === "out for delivery") return "bg-secondary";
  if (s === "delivered") return "bg-success";
  if (s === "cancelled") return "bg-danger";

  return "bg-light text-dark";
}

function setDashboardLoading(loading = true) {
  const ids = [
    "totalSales",
    "totalOrders",
    "pendingOrders",
    "totalProducts",
    "activeVouchers",
    "todaySales",
    "ordersToday",
    "productsSold"
  ];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el && loading) el.textContent = "...";
  });

  const recentOrders = document.getElementById("recentOrders");
  const topProducts = document.getElementById("topProducts");

  if (loading && recentOrders) {
    recentOrders.innerHTML = `<li class="list-group-item text-muted">Loading recent orders...</li>`;
  }

  if (loading && topProducts) {
    topProducts.innerHTML = `<li class="list-group-item text-muted">Loading top products...</li>`;
  }
}

function updateChartTitle(range) {
  const chartTitle = document.getElementById("chartTitle");
  if (!chartTitle) return;
  chartTitle.textContent = range === "month" ? "Sales – Last 30 Days" : "Sales – Last 7 Days";
}

function updateRangeButtons(range) {
  const weekBtn = document.getElementById("rangeWeek");
  const monthBtn = document.getElementById("rangeMonth");

  weekBtn?.classList.remove("btn-primary", "btn-outline-primary");
  monthBtn?.classList.remove("btn-secondary", "btn-outline-secondary");

  if (weekBtn) {
    weekBtn.classList.add(range === "week" ? "btn-primary" : "btn-outline-primary");
  }

  if (monthBtn) {
    monthBtn.classList.add(range === "month" ? "btn-secondary" : "btn-outline-secondary");
  }
}

async function loadDashboard(range = "week") {
  const chartEl = document.getElementById("salesChart");
  if (!chartEl) return;

  try {
    setDashboardLoading(true);
    updateChartTitle(range);
    updateRangeButtons(range);

    const res = await adminFetch(`${API}/admin/dashboard?range=${range}`);
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || "Failed to load dashboard", "error");
      return;
    }

    document.getElementById("totalSales").innerText = Number(data.totalSales || 0).toLocaleString("en-PH");
    document.getElementById("totalOrders").innerText = data.totalOrders || 0;
    document.getElementById("pendingOrders").innerText = data.pendingOrders || 0;
    document.getElementById("cancelledOrders").innerText =
  data.cancelledOrders || 0;
    document.getElementById("totalProducts").innerText = data.totalProducts || 0;
    document.getElementById("activeVouchers").innerText = data.activeVouchers || 0;
    document.getElementById("todaySales").textContent = Number(data.todaySales || 0).toLocaleString("en-PH");
    document.getElementById("ordersToday").textContent = data.ordersToday || 0;
    document.getElementById("productsSold").textContent = data.productsSold || 0;

    const completedEl = document.getElementById("completedOrders");
    if (completedEl) completedEl.innerText = data.completedOrders || 0;

    const ordersList = document.getElementById("recentOrders");
    if (ordersList) {
      ordersList.innerHTML = (data.recentOrders && data.recentOrders.length)
        ? data.recentOrders.map(o => `
            <li class="list-group-item d-flex justify-content-between align-items-start flex-column flex-md-row gap-2">
              <div>
                <div class="fw-semibold">${o.orderNumber || "No order number"}</div>
                <small class="text-muted">${o.customerName || "Customer"}</small>
              </div>
              <div class="text-md-end">
                <div class="fw-bold">${formatPeso(o.total)}</div>
                <span class="badge ${getStatusBadgeClass(o.status)}">${o.status || "Unknown"}</span>
              </div>
            </li>
          `).join("")
        : `<li class="list-group-item text-muted">No recent orders</li>`;
    }

    const topList = document.getElementById("topProducts");
    if (topList) {
      topList.innerHTML = (data.topProducts && data.topProducts.length)
        ? data.topProducts.map((p, index) => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <span class="fw-semibold">#${index + 1}</span>
                <span class="ms-2">${p._id || "Unnamed Product"}</span>
              </div>
              <span class="badge bg-dark">${p.sold || 0} sold</span>
            </li>
          `).join("")
        : `<li class="list-group-item text-muted">No data</li>`;
    }

    if (salesChartInstance) {
      salesChartInstance.destroy();
    }

    salesChartInstance = new Chart(chartEl.getContext("2d"), {
      type: "line",
      data: {
        labels: (data.salesByDay || []).map(d => `${d._id.month}/${d._id.day}`),
        datasets: [{
          label: "Sales",
          data: (data.salesByDay || []).map(d => d.total),
          tension: 0.35,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true
          }
        },
        scales: {
          y: {
            ticks: {
              callback: function(value) {
                return "₱" + Number(value).toLocaleString("en-PH");
              }
            }
          }
        }
      }
    });
  } catch (err) {
    console.error(err);
    showToast("Failed to load dashboard", "error");
  }
}

document.getElementById("rangeWeek")?.addEventListener("click", () => loadDashboard("week"));
document.getElementById("rangeMonth")?.addEventListener("click", () => loadDashboard("month"));

if (document.getElementById("salesChart")) {
  loadDashboard();
}