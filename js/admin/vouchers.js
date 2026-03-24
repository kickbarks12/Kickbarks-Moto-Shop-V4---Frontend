// js/admin/vouchers.js
const API = "http://localhost:4000/api";

async function loadVouchers() {
  const table = document.getElementById("voucherTable");
  if (!table) return;

  try {
    const res = await adminFetch(`${API}/vouchers/admin`);
    const vouchers = await res.json();

    if (!vouchers.length) {
      table.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;opacity:.6">
            No vouchers created
          </td>
        </tr>
      `;
      return;
    }

    table.innerHTML = vouchers.map(v => `
      <tr>
        <td><b>${v.code}</b></td>
        <td>₱${v.amount}</td>
        <td>${v.minSpend || "-"}</td>
        <td>
          <span class="status ${v.active ? "active" : "inactive"}">
            ${v.active ? "Active" : "Inactive"}
          </span>
        </td>
        <td>
          <button class="btn-sm" onclick="toggleVoucher('${v._id}')">Toggle</button>
          <button class="btn-delete btn-sm" onclick="deleteVoucher('${v._id}')">Delete</button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    console.error(err);
    showToast("Failed to load vouchers");
  }
}

async function toggleVoucher(id) {
  try {
    await adminFetch(`${API}/vouchers/admin/${id}/toggle`, {
      method: "PUT"
    });
    loadVouchers();
  } catch (err) {
    console.error(err);
    showToast("Failed to update voucher");
  }
}

async function deleteVoucher(id) {
  if (!confirm("Delete this voucher?")) return;

  try {
    const res = await adminFetch(`${API}/vouchers/admin/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || "Delete failed");
      return;
    }

    showToast("Voucher deleted successfully");
    loadVouchers();
  } catch (err) {
    console.error(err);
    showToast("Server error deleting voucher");
  }
}

async function createVoucher() {
  const code = document.getElementById("code").value;
  const amount = document.getElementById("amount").value;
  const minSpend = document.getElementById("minSpend").value;

  if (!code || !amount) {
    showToast("Code and amount are required");
    return;
  }

  try {
    const res = await adminFetch(`${API}/vouchers/admin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ code, amount, minSpend })
    });

    const data = await res.json();

    if (data._id) {
      showToast("Voucher created");
      loadVouchers();
    } else {
      showToast(data.error || "Failed to create voucher");
    }
  } catch (err) {
    console.error(err);
    showToast("Failed to create voucher");
  }
}

async function loadUsersForVoucherAssign() {
  const select = document.getElementById("assignUserSelect");
  if (!select) return;

  try {
    const res = await adminFetch(`${API}/admin/users`);

    if (!res.ok) {
      showToast("Failed to load users");
      return;
    }

    const users = await res.json();

    select.innerHTML = `<option value="">Select user</option>` +
      users.map(u => `<option value="${u._id}">${u.name} (${u.email})</option>`).join("");
  } catch (err) {
    console.error(err);
    showToast("Failed to load users");
  }
}

async function loadVouchersForAssign() {
  const select = document.getElementById("assignVoucherSelect");
  if (!select) return;

  try {
    const res = await adminFetch(`${API}/vouchers/admin`);
    const vouchers = await res.json();

    select.innerHTML = `<option value="">Select voucher</option>` +
      vouchers
        .filter(v => v.active)
        .map(v => `<option value="${v._id}">${v.code} – ₱${v.amount}</option>`)
        .join("");
  } catch (err) {
    console.error(err);
    showToast("Failed to load vouchers");
  }
}

async function assignVoucherToUser() {
  const userId = document.getElementById("assignUserSelect").value;
  const voucherId = document.getElementById("assignVoucherSelect").value;

  if (!userId || !voucherId) {
    showToast("Please select both user and voucher");
    return;
  }

  try {
    const res = await adminFetch(`${API}/vouchers/admin/assign-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userId, voucherId })
    });

    const data = await res.json();

    if (res.ok) {
      showToast("Voucher assigned successfully");
    } else {
      showToast(data.error || "Failed to assign voucher");
    }
  } catch (err) {
    console.error(err);
    showToast("Failed to assign voucher");
  }
}

if (document.getElementById("voucherTable")) {
  loadVouchers();
}

if (document.getElementById("assignUserSelect")) {
  loadUsersForVoucherAssign();
  loadVouchersForAssign();
}