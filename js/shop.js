let isUserLoggedIn = false;
let selectedProductForCart = null;
let wishlistIds = [];
let allProducts = [];
let activeCategory = "";
let popupCurrentStock = 0;
let selectedBikeModel = "";
const bikeButtonsWrap = document.getElementById("bikeButtons");
const productList = document.getElementById("productList");
const searchInput = document.getElementById("searchInput");
const priceFilter = document.getElementById("priceFilter");
const bikeModal = document.getElementById("bikeModal");

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
function isFlashSaleProduct(product) {
  return product?.flashSale?.active === true;
}

function getFlashSalePrice(product, bike) {
  const key = bike.toLowerCase();

  if (key.includes("mio")) return Number(product.flashSale?.salePrice?.mio || 0);
  if (key.includes("aerox")) return Number(product.flashSale?.salePrice?.aerox || 0);
  if (key.includes("click")) return Number(product.flashSale?.salePrice?.click || 0);
  if (key.includes("adv")) return Number(product.flashSale?.salePrice?.adv || 0);

  return 0;
}
function formatCountdown(endTime) {
  if (!endTime) return "Flash Sale Ended";

  const diff = new Date(endTime).getTime() - Date.now();

  if (diff <= 0) return "Flash Sale Ended";

  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);

  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

let shopTimer = null;


function startShopCountdowns() {
  const els = document.querySelectorAll("[data-flash-end]");

  if (!els.length) return;

  if (shopTimer) clearInterval(shopTimer);

  function update() {
    els.forEach(el => {
      const end = el.getAttribute("data-flash-end");
      const diff = new Date(end).getTime() - Date.now();

      if (diff <= 0) {
        el.textContent = "Flash Sale Ended";
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      el.textContent = `Ends in ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    });
  }

  update();
  shopTimer = setInterval(update, 1000);
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
        <div class="product-card position-relative">

          <!-- wishlist -->
          <button
            class="wishlist ${Array.isArray(wishlistIds) && wishlistIds.includes(p._id) ? "active" : ""}"
            onclick="toggleWishlist('${p._id}')"
          >♥</button>
          ${
  isFlashSaleProduct(p)
    ? `
      <span class="badge bg-danger position-absolute top-0 start-0 m-2">
        FLASH SALE
      </span>
    `
    : ""
}

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
            ${
  isFlashSaleProduct(p)
    ? `
      <div class="price fw-bold text-danger">
        ${formatShopPrice(p.flashSale?.salePrice)}
      </div>

      <div class="small text-muted text-decoration-line-through">
        ${formatShopPrice(p.price)}
      </div>

      <div class="small text-danger fw-semibold">
        Save ₱${Number(p.flashSale?.discountAmount || 0).toLocaleString()}
      </div>

      <div class="small fw-semibold" data-flash-end="${p.flashSale?.endsAt || ""}"></div>
    `
    : `
      <div class="price fw-bold">
        ${formatShopPrice(p.price)}
      </div>
    `
}
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
  onclick='${
    isFlashSaleProduct(p)
      ? `buyNow(${JSON.stringify(p)})`
      : `addCart(${JSON.stringify(p)})`
  }'
>
  ${
    isOutOfStock
      ? "Out of Stock"
      : !isUserLoggedIn
      ? "Login to Add"
      : isFlashSaleProduct(p)
      ? "Buy Now"
      : "Add to Cart"
  }
</button>
              

          </div>
        </div>
      </div>
    `;
  }).join("");

  // products.forEach(p => loadProductRating(p._id));
  startShopCountdowns();
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
  selectedBikeModel = "";
  popupCurrentStock = 0;

  bikeModal.style.display = "flex";
  if (popupQty) popupQty.value = 1;

  document.getElementById("popupProductName").innerText = product.name;
  document.getElementById("popupProductPrice").innerText = formatShopPrice(product.price);

  document.getElementById("popupProductImage").src =
    product.images?.[0]
      ? (product.images[0].startsWith("http")
          ? product.images[0]
          : window.API_BASE + product.images[0])
      : "/images/placeholder.png";

  if (popupStock) {
    popupStock.innerText = "Select bike";
    popupStock.style.color = "black";
  }

  renderBikeButtons(product);
  checkPopupQty();

  const btn = document.querySelector(".btn-bike-confirm");
  if (btn) btn.innerText = "Add to Cart";
}
function buyNow(product) {
  if (!isUserLoggedIn) {
    showToast("Please login first", "error");
    window.location.href = "/login.html";
    return;
  }

  selectedProductForCart = product;
  selectedBikeModel = "";
  popupCurrentStock = 0;

  if (bikeModal) bikeModal.style.display = "flex";
  if (popupQty) popupQty.value = 1;

  document.getElementById("popupProductName").innerText = product.name;
  document.getElementById("popupProductPrice").innerText = isFlashSaleProduct(product)
    ? formatShopPrice(product.flashSale?.salePrice || product.price)
    : formatShopPrice(product.price);

  document.getElementById("popupProductImage").src =
    product.images?.[0]
      ? (product.images[0].startsWith("http")
          ? product.images[0]
          : window.API_BASE + product.images[0])
      : "/images/placeholder.png";

  if (popupStock) {
    popupStock.innerText = "Select bike";
    popupStock.style.color = "black";
  }

  renderBikeButtons(product);
  checkPopupQty();

  const btn = document.querySelector(".btn-bike-confirm");
  if (btn) btn.innerText = "Buy Now";
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

  const bike = selectedBikeModel.trim();
  const qty = Number(popupQty?.value || 1);
  const product = selectedProductForCart;

  if (!bike) {
    showToast("Select motorcycle model", "error");
    return;
  }

  if (!product) return;

  const stock = getBikeStock(product, bike);
  const isFlash = isFlashSaleProduct(product);

const originalPrice = getBikePrice(product, bike);
const selectedPrice = isFlash
  ? getFlashSalePrice(product, bike)
  : originalPrice;

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

  // 🔥 update flash sale info if needed
  if (isFlash) {
    found.price = selectedPrice;
    found.originalPrice = originalPrice;
    found.flashSale = true;
  }
} else {
    cart.push({
  productId: product._id,
  name: product.name,
  originalPrice: originalPrice,
  price: selectedPrice,
  flashSale: isFlash,
  flashSaleDiscount: isFlash ? product.flashSale?.discountAmount || 0 : 0,
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

if (isFlash) {
  window.location.href = "/cart.html";
} else {
  showToast("Added to cart");
  closeBikeModal();
}
}

function updateBikeStockUI() {
  if (!selectedBikeModel) {
    popupStock.innerText = "Select bike";
    popupStock.style.color = "black";
    return;
  }

  const stock = getBikeStock(selectedProductForCart, selectedBikeModel);
  popupCurrentStock = stock;

  if (stock > 0) {
    popupStock.innerText = stock;
    popupStock.style.color = "green";
  } else {
    popupStock.innerText = "Out of stock";
    popupStock.style.color = "red";
  }
}

function checkPopupQty() {
  const qty = Number(popupQty?.value || 1);
  const addBtn = document.querySelector(".btn-bike-confirm");

  if (!addBtn) return;

  if (!selectedBikeModel.trim()) {
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
  addBtn.innerText = isFlashSaleProduct(selectedProductForCart) ? "Buy Now" : "Add to Cart";
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
  popupQty?.addEventListener("input", checkPopupQty);

  await loadProducts();
  checkPopupQty();
});
function getAvailableBikeModels(product) {
  const models = [
    { key: "mio", label: "Mio I 125" },
    { key: "aerox", label: "Aerox 155" },
    { key: "click", label: "Click 125i" },
    { key: "adv", label: "ADV 160" }
  ];

  return models
    .filter(model =>
      Number(product?.price?.[model.key] || 0) > 0 ||
      Number(product?.stock?.[model.key] || 0) > 0
    )
    .map(model => model.label);
}

function renderBikeButtons(product) {
  bikeButtonsWrap.innerHTML = getAvailableBikeModels(product).map(model => `
    <button class="bike-option-btn ${selectedBikeModel === model ? "active":""}"
      onclick="selectBikeModel('${model}')">
      ${model}
    </button>
  `).join("");
}

function selectBikeModel(model) {
  selectedBikeModel = model;
  renderBikeButtons(selectedProductForCart);
  updateBikeStockUI();
  checkPopupQty();
}
window.toggleWishlist = toggleWishlist;
window.addCart = addCart;
window.buyNow = buyNow;
window.closeBikeModal = closeBikeModal;
window.confirmBike = confirmBike;
window.selectBikeModel = selectBikeModel;