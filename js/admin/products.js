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

    const modalHtml = `
      <div class="modal fade" id="editProductModal" tabindex="-1">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Edit Product</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>

            <form id="editProductForm" enctype="multipart/form-data">
              <div class="modal-body">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label">Product Name</label>
                    <input name="name" class="form-control" value="${p.name || ""}" required>
                  </div>

                  <div class="col-md-6">
                    <label class="form-label">Category</label>
                    <input name="category" class="form-control" value="${p.category || ""}" required>
                  </div>

                  <div class="col-md-3">
                    <label class="form-label">Mio Price</label>
                    <input name="price_mio" type="number" class="form-control" value="${p.price?.mio || 0}" required>
                  </div>

                  <div class="col-md-3">
                    <label class="form-label">Aerox Price</label>
                    <input name="price_aerox" type="number" class="form-control" value="${p.price?.aerox || 0}" required>
                  </div>

                  <div class="col-md-3">
                    <label class="form-label">Click Price</label>
                    <input name="price_click" type="number" class="form-control" value="${p.price?.click || 0}" required>
                  </div>

                  <div class="col-md-3">
                    <label class="form-label">ADV Price</label>
                    <input name="price_adv" type="number" class="form-control" value="${p.price?.adv || 0}" required>
                  </div>

                  <div class="col-md-3">
                    <label class="form-label">Mio Stock</label>
                    <input name="stock_mio" type="number" class="form-control" value="${p.stock?.mio || 0}" required>
                  </div>

                  <div class="col-md-3">
                    <label class="form-label">Aerox Stock</label>
                    <input name="stock_aerox" type="number" class="form-control" value="${p.stock?.aerox || 0}" required>
                  </div>

                  <div class="col-md-3">
                    <label class="form-label">Click Stock</label>
                    <input name="stock_click" type="number" class="form-control" value="${p.stock?.click || 0}" required>
                  </div>

                  <div class="col-md-3">
                    <label class="form-label">ADV Stock</label>
                    <input name="stock_adv" type="number" class="form-control" value="${p.stock?.adv || 0}" required>
                  </div>

                  <div class="col-12">
                    <label class="form-label">Description</label>
                    <textarea name="description" class="form-control" rows="3">${p.description || ""}</textarea>
                  </div>

                  <div class="col-12">
                    <label class="form-label">Current Images</label>
                    <div class="d-flex flex-wrap gap-2 mb-2">
                      ${(p.images && p.images.length)
                        ? p.images.map(img => `
                          <img src="${img}"
                               style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid #ddd"
                               onerror="this.src='https://via.placeholder.com/80?text=No+Image'">
                        `).join("")
                        : `<span class="text-muted">No images</span>`
                      }
                    </div>
                  </div>

                  <div class="col-12">
                    <label class="form-label">Upload New Images</label>
                    <input id="editImages" name="images" type="file" multiple accept="image/*" class="form-control">
                    <small class="text-muted">Uploading new images will replace the current images.</small>
                  </div>
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn btn-dark">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    const existingModal = document.getElementById("editProductModal");
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    const modalEl = document.getElementById("editProductModal");
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    document.getElementById("editProductForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(e.target);

      const update = await adminFetch(`${API}/products/${id}`, {
        method: "PUT",
        body: formData
      });

      const result = await update.json();

      if (result.success) {
        showToast("Product updated");
        modal.hide();
        loadProducts();
      } else {
        showToast(result.error || "Update failed");
      }
    });

    modalEl.addEventListener("hidden.bs.modal", () => {
      modalEl.remove();
    });

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