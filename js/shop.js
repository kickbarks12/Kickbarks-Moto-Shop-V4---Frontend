let isUserLoggedIn = false;
let selectedProductForCart = null;
let wishlistIds = [];
let allProducts = [];
let activeCategory = "";
let popupCurrentStock = 0;

const productList = document.getElementById("productList");
const searchInput = document.getElementById("searchInput");
const priceFilter = document.getElementById("priceFilter");
const bikeModal = document.getElementById("bikeModal");
const bikeSelect = document.getElementById("bikeSelect");
const popupQty = document.getElementById("popupQty");
const popupStock = document.getElementById("popupStock");

async function checkLoginStatus() {
  try {
    const data = await window.fetchJSONCached(
      `${window.API_BASE}/api/users/me`,
      { credentials: "include" },
      15000
    );
    isUserLoggedIn = !!data;
  } catch {
    isUserLoggedIn = false;
  }
}

function syncCartToServer(cart) {
  fetch(`${window.API_BASE}/api/cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ cart })
  }).catch(err => console.error("Cart sync failed", err));
}

function formatShopPrice(priceObj) {
  if (!priceObj) return "₱0";

  const values = Object.values(priceObj)
    .map(v => Number(v))
    .filter(v => !isNaN(v) && v > 0);

  if (!values.length) return "₱0";

  const min = Math.min(...values);
  const max = Math.max(...values);

  return min === max
    ? `₱${min.toLocaleString()}`
    : `₱${min.toLocaleString()} - ₱${max.toLocaleString()}`;
}

function getBikePrice(product, bike) {
  const key = bike.toLowerCase();

  if (key.includes("mio")) return Number(product.price?.mio || 0);
  if (key.includes("aerox")) return Number(product.price?.aerox || 0);
  if (key.includes("click")) return Number(product.price?.click || 0);
  if (key.includes("adv")) return Number(product.price?.adv || 0);

  return 0;
}

function getBikeStock(product, bike) {
  const key = bike.toLowerCase();

  if (key.includes("mio")) return Number(product.stock?.mio || 0);
  if (key.includes("aerox")) return Number(product.stock?.aerox || 0);
  if (key.includes("click")) return Number(product.stock?.click || 0);
  if (key.includes("adv")) return Number(product.stock?.adv || 0);

  return 0;
}

function getMinPrice(product) {
  const prices = [
    Number(product.price?.mio || 0),
    Number(product.price?.aerox || 0),
    Number(product.price?.click || 0),
    Number(product.price?.adv || 0)
  ].filter(v => v > 0);

  return prices.length ? Math.min(...prices) : 0;
}

async function loadWishlistIds() {
  try {
    const res = await fetch(`${window.API_BASE}/api/users/wishlist-ids`, {
      credentials: "include"
    });

    if (!res.ok) return [];
    const ids = await res.json();
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

async function loadProducts() {
  try {
    const [products, wishlist] = await Promise.all([
      window.fetchJSONCached(`${window.API_BASE}/api/products`, {}, 30000),
      loadWishlistIds()
    ]);

    allProducts = Array.isArray(products) ? products : [];
    wishlistIds = Array.isArray(wishlist) ? wishlist : [];

    applyFilters();
  } catch (err) {
    console.error("Failed to load products:", err);
    if (productList) {
      productList.innerHTML = `
        <div class="col-12 text-center text-muted py-5">
          Failed to load products.
        </div>
      `;
    }
  }
}

function renderProducts(products) {
  if (!productList) return;

  productList.innerHTML = products.map(p => {
    const img = p.images?.[0]
      ? (p.images[0].startsWith("http")
          ? p.images[0]
          : window.API_BASE + p.images[0])
      : "/images/placeholder.png";

    const isOutOfStock =
      getMinPrice(p) === 0 ||
      (
        (p.stock?.mio || 0) +
        (p.stock?.aerox || 0) +
        (p.stock?.click || 0) +
        (p.stock?.adv || 0)
      ) === 0;

    return `
      <div class="col-6 col-md-4 col-lg-4">
        <div class="product-card">

          <!-- wishlist -->
          <button
            class="wishlist ${Array.isArray(wishlistIds) && wishlistIds.includes(p._id) ? "active" : ""}"
            onclick="toggleWishlist('${p._id}')"
          >♥</button>

          <!-- image -->
          <a href="/product.html?id=${p._id}" class="product-image">
            <img src="${img}" alt="${p.name}" loading="lazy">
          </a>

          <div class="product-info">

            <!-- name -->
            <h3 class="product-title">
              <a href="/product.html?id=${p._id}">
                ${p.name}
              </a>
            </h3>

            <!-- rating -->
            <div class="product-rating" id="rating-${p._id}">
              ⭐ 0.0 (0)
            </div>

            <!-- price -->
            <div class="price fw-bold">
              ${formatShopPrice(p.price)}
            </div>
            <div class="text-muted small">
  ${p.category || "Motorcycle Part"}
</div>

            <!-- stock badge -->
            ${isOutOfStock ? `
              <span class="badge bg-danger mt-1">Out of Stock</span>
            ` : ""}

            <!-- button -->
            <button
              class="add-to-cart"
              ${!isUserLoggedIn || isOutOfStock ? "disabled" : ""}
              onclick='addCart(${JSON.stringify(p)})'
            >
              ${
                isOutOfStock
                  ? "Out of Stock"
                  : !isUserLoggedIn
                  ? "Login to Add"
                  : "Add to Cart"
              }
            </button>

          </div>
        </div>
      </div>
    `;
  }).join("");

  // products.forEach(p => loadProductRating(p._id));
}

function updateProductCount(count) {
  const counter = document.getElementById("productCount");
  if (counter) counter.textContent = `${count} products`;
}

function applyFilters() {
  let filtered = [...allProducts];

  if (activeCategory) {
    filtered = filtered.filter(p =>
      (p.category || "").toLowerCase() === activeCategory
    );
  }

  const keyword = (searchInput?.value || "").trim().toLowerCase();
  if (keyword) {
    filtered = filtered.filter(p =>
      (p.name || "").toLowerCase().includes(keyword)
    );
  }

  if (priceFilter?.value === "low") {
    filtered.sort((a, b) => getMinPrice(a) - getMinPrice(b));
  }

  if (priceFilter?.value === "high") {
    filtered.sort((a, b) => getMinPrice(b) - getMinPrice(a));
  }

  const loading = document.getElementById("productLoading");
  if (loading) loading.style.display = "none";

  renderProducts(filtered);
  updateProductCount(filtered.length);
}

async function toggleWishlist(productId) {
  try {
    const res = await fetch(`${window.API_BASE}/api/users/wishlist/${productId}`, {
      method: "POST",
      credentials: "include"
    });

    if (res.status === 401) {
      showToast("Please login to use wishlist", "error");
      window.location.href = "/login.html";
      return;
    }

    wishlistIds = await loadWishlistIds();
    applyFilters();
  } catch (err) {
    console.error(err);
    showToast("Wishlist update failed", "error");
  }
}

function addCart(product) {
  if (!isUserLoggedIn) {
    showToast("Please login first", "error");
    window.location.href = "/login.html";
    return;
  }

  selectedProductForCart = product;

  if (bikeModal) bikeModal.style.display = "flex";
  if (popupQty) popupQty.value = 1;
  popupCurrentStock = 0;

  if (bikeSelect) bikeSelect.value = "";
  if (popupStock) {
    popupStock.innerHTML = "Select motorcycle to see stock";
    popupStock.style.color = "black";
  }

  checkPopupQty();
}

function closeBikeModal() {
  if (bikeModal) bikeModal.style.display = "none";
  selectedProductForCart = null;
  popupCurrentStock = 0;
}

function confirmBike() {
  if (!isUserLoggedIn) {
    showToast("Please login first", "error");
    window.location.href = "/login.html";
    return;
  }

  const bike = bikeSelect?.value.trim();
  const qty = Number(popupQty?.value || 1);
  const product = selectedProductForCart;

  if (!bike) {
    showToast("Select motorcycle model", "error");
    return;
  }

  if (!product) return;

  const stock = getBikeStock(product, bike);
  const selectedPrice = getBikePrice(product, bike);

  if (stock <= 0) {
    showToast(`Out of stock for ${bike}`, "error");
    return;
  }

  if (qty > stock) {
    showToast("Quantity exceeds stock", "error");
    return;
  }

  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const found = cart.find(i => i.productId === product._id && i.bike === bike);

  if (found) {
    found.qty += qty;
  } else {
    cart.push({
      productId: product._id,
      name: product.name,
      price: selectedPrice,
      qty,
      bike,
      image: product.images?.[0] || ""
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  syncCartToServer(cart);

  if (window.updateCartCount) {
    window.updateCartCount();
  }

  showToast("Added to cart");
  closeBikeModal();
}

function updateBikeStockUI() {
  if (!selectedProductForCart || !bikeSelect || !popupStock) return;

  const bike = bikeSelect.value.trim();
  if (!bike) {
    popupCurrentStock = 0;
    popupStock.innerHTML = "Select motorcycle to see stock";
    popupStock.style.color = "black";
    checkPopupQty();
    return;
  }

  const stock = getBikeStock(selectedProductForCart, bike);
  popupCurrentStock = stock;

  if (stock <= 0) {
    popupStock.innerHTML = "❌ Out of stock";
    popupStock.style.color = "red";
  } else {
    popupStock.innerHTML = `Available Stocks: ${stock}`;
    popupStock.style.color = "green";
  }

  checkPopupQty();
}

function checkPopupQty() {
  const qty = Number(popupQty?.value || 1);
  const addBtn = document.querySelector("#bikeModal .btn-dark");

  if (!addBtn) return;

  if (!bikeSelect?.value.trim()) {
    addBtn.disabled = true;
    addBtn.innerText = "Select Bike First";
    addBtn.style.opacity = "0.6";
    return;
  }

  if (popupCurrentStock <= 0) {
    addBtn.disabled = true;
    addBtn.innerText = "OUT OF STOCK";
    addBtn.style.opacity = "0.6";
    return;
  }

  if (qty > popupCurrentStock) {
    addBtn.disabled = true;
    addBtn.innerText = "Exceeds stock";
    addBtn.style.opacity = "0.6";
    return;
  }

  addBtn.disabled = false;
  addBtn.innerText = "Add to Cart";
  addBtn.style.opacity = "1";
}

async function loadProductRating(productId) {
  try {
    const res = await fetch(`${window.API_BASE}/api/reviews-summary/${productId}`);
    const data = await res.json();

    const box = document.getElementById(`rating-${productId}`);
    if (!box) return;

    const avg = Number(data.avgRating || 0).toFixed(1);
    const total = Number(data.totalReviews || 0);

    box.textContent = `⭐ ${avg} (${total})`;
  } catch (err) {
    console.error("Rating load failed:", err);
  }
}

function initCategoryButtons() {
  document.querySelectorAll(".category-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".category-btn").forEach(b => {
        b.classList.remove("active");
      });

      btn.classList.add("active");
      activeCategory = btn.dataset.category || "";
      applyFilters();
    });
  });
}

function initCategoryFromURL() {
  const params = new URLSearchParams(window.location.search);
  const categoryFromURL = (params.get("category") || "").toLowerCase().trim();

  if (!categoryFromURL) return;

  activeCategory = categoryFromURL;

  document.querySelectorAll(".category-btn").forEach(btn => {
    btn.classList.remove("active");
    if ((btn.dataset.category || "").toLowerCase() === categoryFromURL) {
      btn.classList.add("active");
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await checkLoginStatus();

  initCategoryButtons();
  initCategoryFromURL();

  function debounce(fn, delay = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const debouncedApplyFilters = debounce(applyFilters, 250);
searchInput?.addEventListener("input", debouncedApplyFilters);
  priceFilter?.addEventListener("change", applyFilters);
  bikeSelect?.addEventListener("change", updateBikeStockUI);
  popupQty?.addEventListener("input", checkPopupQty);

  await loadProducts();
  checkPopupQty();
});

window.toggleWishlist = toggleWishlist;
window.addCart = addCart;
window.closeBikeModal = closeBikeModal;
window.confirmBike = confirmBike;