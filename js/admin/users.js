// js/admin/users.js
const API = "http://localhost:4000/api";

async function loadUsers() {
  const table = document.getElementById("usersTable");
  if (!table) return;

  try {
    const res = await adminFetch(`${API}/admin/users`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`
      }
    });

    const users = await res.json();

    if (!users.length) {
      table.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center">
            No registered users
          </td>
        </tr>
      `;
      return;
    }

    table.innerHTML = users.map(u => `
      <tr>
        <td class="d-flex align-items-center gap-2">
          ${
            u.avatar
              ? `<img src="${u.avatar}" width="36" height="36" style="border-radius:50%;object-fit:cover;">`
              : `<div class="avatar-initial">${u.name.charAt(0).toUpperCase()}</div>`
          }
          ${u.name}
        </td>
        <td>${u.email}</td>
        <td>${u.mobile || "-"}</td>
        <td>${u.birthday ? new Date(u.birthday).toLocaleDateString() : "-"}</td>
        <td>${new Date(u.createdAt).toLocaleDateString()}</td>
      </tr>
    `).join("");
  } catch (err) {
    console.error(err);
    showToast("Failed to load users");
  }
}

if (document.getElementById("usersTable")) {
  loadUsers();
}