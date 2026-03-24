// js/admin/products.js
const API = "https://kickbarks-moto-shop.onrender.com/api";
let currentSort = { key: null, direction: "asc" };

function formatPriceRange(product) {
  if (!product.price) return "₱0";

  const values = Object.values(product.price)
    .map(v => Number(v))
    .filter(v => !isNaN(v) && v > 0);

  if (!values.length) return "₱0";

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) return "₱" + min.toLocaleString();
  return `₱${min.toLocaleString()} - ₱${max.toLocaleString()}`;
}

document.getElementById("productForm")?.addEventListener("submit", async e => {
  e.preventDefault();

  const form = e.target;
  const data = new FormData(form);

  try {
    const res = await adminFetch(`${API}/products`, {
      method: "POST",
      body: data
    });

    const text = await res.text();
    let result;

    try {
      result = JSON.parse(text);
    } catch {
      showToast("Server error: check backend");
      return;
    }

    if (!res.ok) {
      showToast(result.error || "Failed to add product");
      return;
    }

    showToast("Product added successfully");
    form.reset();
    loadProducts();
  } catch (err) {
    console.error(err);
    showToast("Cannot connect to server");
  }
});

async function loadProducts() {
  const table = document.getElementById("productsTable");
  const emptyState = document.getElementById("emptyState");
  if (!table) return;

  try {
    const res = await adminFetch(`${API}/products`);
    let products = await res.json();

    if (!products.length) {
      table.innerHTML = "";
      emptyState?.classList.remove("d-none");
      return;
    } else {
      emptyState?.classList.add("d-none");
    }

    if (currentSort.key) {
      products.sort((a, b) => {
        const dir = currentSort.direction === "asc" ? 1 : -1;
        return a[currentSort.key] > b[currentSort.key] ? dir : -dir;
      });
    }

    table.innerHTML = "";

    products.forEach(p => {
      const img = (p.images && p.images.length > 0)
        ? p.images[0]
        : "https://via.placeholder.com/60?text=No+Image";

      const stockData = p.stock || {};
      const totalStock =
        (stockData.mio || 0) +
        (stockData.aerox || 0) +
        (stockData.click || 0) +
        (stockData.adv || 0);

      let stockClass = "out";
      let stockText = "Out of stock";

      if (totalStock > 10) {
        stockClass = "in";
        stockText = "In stock";
      } else if (totalStock > 0) {
        stockClass = "low";
        stockText = "Low stock";
      }

      table.innerHTML += `
        <tr>
          <td>
            <img src="${img}"
                 style="width:65px;height:65px;object-fit:cover;border-radius:10px;border:1px solid #eee"
                 onerror="this.src='https://via.placeholder.com/60?text=No+Image'">
          </td>
          <td>
            ${p.name}<br/>
            <span class="stock ${stockClass}">${stockText}</span>
          </td>
          <td>${formatPriceRange(p)}</td>
          <td>
            <button class="btn-edit" onclick="editProduct('${p._id}')">Edit</button>
            <button class="btn-delete" onclick="deleteProduct('${p._id}')">Delete</button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
    showToast("Failed to load products");
  }
}

async function editProduct(id) {
  try {
    const res = await adminFetch(`${API}/products/${id}`);
    const p = await res.json();

    const newName = prompt("Product name:", p.name);
    if (!newName) return;

    const newDesc = prompt("Description:", p.description || "");
    const price_mio = prompt("Price MIO:", p.price?.mio || 0);
    const price_aerox = prompt("Price AEROX:", p.price?.aerox || 0);
    const price_click = prompt("Price CLICK:", p.price?.click || 0);
    const price_adv = prompt("Price ADV:", p.price?.adv || 0);

    const stock_mio = prompt("Stock MIO:", p.stock?.mio || 0);
    const stock_aerox = prompt("Stock AEROX:", p.stock?.aerox || 0);
    const stock_click = prompt("Stock CLICK:", p.stock?.click || 0);
    const stock_adv = prompt("Stock ADV:", p.stock?.adv || 0);

    const formData = new FormData();
    formData.append("name", newName);
    formData.append("description", newDesc);
    formData.append("price_mio", price_mio);
    formData.append("price_aerox", price_aerox);
    formData.append("price_click", price_click);
    formData.append("price_adv", price_adv);
    formData.append("stock_mio", stock_mio);
    formData.append("stock_aerox", stock_aerox);
    formData.append("stock_click", stock_click);
    formData.append("stock_adv", stock_adv);

    const update = await adminFetch(`${API}/products/${id}`, {
      method: "PUT",
      body: formData
    });

    const result = await update.json();

    if (result.success) {
      showToast("Product updated");
      loadProducts();
    } else {
      showToast(result.error || "Update failed");
    }
  } catch (err) {
    console.error(err);
    showToast("Failed to update product");
  }
}

async function deleteProduct(id) {
  if (!confirm("Delete this product?")) return;

  try {
    await adminFetch(`${API}/products/${id}`, {
      method: "DELETE"
    });
    loadProducts();
  } catch (err) {
    console.error(err);
    showToast("Failed to delete product");
  }
}

if (document.getElementById("productsTable")) {
  loadProducts();
}