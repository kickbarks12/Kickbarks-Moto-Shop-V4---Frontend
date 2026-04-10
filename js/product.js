let isUserLoggedIn = false;
let product = null;
let currentStock = 0;

const params = new URLSearchParams(window.location.search);
const id = params.get("id");
function setProductLoadingState(loading) {
  const name = document.getElementById("name");
  const desc = document.getElementById("desc");
  const price = document.getElementById("price");

  if (loading) {
    if (name) name.innerText = "Loading product...";
    if (desc) desc.innerText = "Please wait while product details load.";
    if (price) price.innerText = "...";
  }
}

function getAvailableBikeModels(productObj) {
  const keys = new Set([
    ...Object.keys(productObj?.price || {}),
    ...Object.keys(productObj?.stock || {})
  ]);

  return [...keys]
    .filter(key =>
      Number(productObj?.price?.[key] || 0) > 0 ||
      Number(productObj?.stock?.[key] || 0) > 0
    )
    .map(key => formatBikeLabel(key));
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
    ? `₱${min.toLocaleString("en-PH")}`
    : `₱${min.toLocaleString("en-PH")} - ₱${max.toLocaleString("en-PH")}`;
}

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

function normalizeBikeKey(bike) {
  return String(bike || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function formatBikeLabel(key) {
  return String(key || "")
    .replace(/([a-z])([0-9])/gi, "$1 $2")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function getBikePrice(productObj, bike) {
  const key = normalizeBikeKey(bike);
  return Number(productObj?.price?.[key] || 0);
}

function getBikeStock(productObj, bike) {
  const key = normalizeBikeKey(bike);
  return Number(productObj?.stock?.[key] || 0);
}

function isFlashSaleProduct(product) {
  return product?.flashSale?.active === true;
}

function getFlashSalePrice(productObj, bike) {
  const key = normalizeBikeKey(bike);
  return Number(productObj?.flashSale?.salePrice?.[key] || 0);
}

function formatCountdown(endTime) {
  if (!endTime) return "Flash Sale Ended";

  const diff = new Date(endTime).getTime() - Date.now();

  if (diff <= 0) return "Flash Sale Ended";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `Flash ends in ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

let flashCountdownTimer = null;


function startProductFlashCountdown(endTime) {
  const timerEl = document.getElementById("flashSaleTimer");
  if (!timerEl) return;

  if (flashCountdownTimer) {
    clearInterval(flashCountdownTimer);
  }

  function updateTimer() {
    const diff = new Date(endTime).getTime() - Date.now();

    if (diff <= 0) {
      clearInterval(flashCountdownTimer);
      timerEl.textContent = "Flash Sale Ended";
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    timerEl.textContent =
      `Ends in ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  updateTimer();
  flashCountdownTimer = setInterval(updateTimer, 1000);
}

function updateStickyBar() {
  const price = document.getElementById("price")?.innerText || "";
  const stock = document.getElementById("stockInfo")?.innerText || "";

  const stickyPrice = document.getElementById("stickyPrice");
  const stickyStock = document.getElementById("stickyStock");

  if (stickyPrice) stickyPrice.innerText = price;
  if (stickyStock) stickyStock.innerText = stock;
}

function validateButtonState() {
  const btn = document.querySelector(".product-actions button");
  const qty = Number(document.getElementById("qty")?.value || 1);

  if (!btn) return;

  if (!isUserLoggedIn) {
    btn.disabled = true;
    btn.innerText = "Login to Add";
    btn.style.opacity = "0.6";
    return;
  }

  if (!document.getElementById("bikeModel")?.value.trim()) {
    btn.disabled = true;
    btn.innerText = "Choose Motorcycle Model";
    btn.style.opacity = "0.6";
    return;
  }

  if (currentStock <= 0) {
    btn.disabled = true;
    btn.innerText = "Out of Stock";
    btn.style.opacity = "0.6";
    return;
  }

  if (qty > currentStock) {
    btn.disabled = true;
    btn.innerText = "Exceeds stock";
    btn.style.opacity = "0.6";
    return;
  }

  btn.disabled = false;
  btn.innerText = isFlashSaleProduct(product) ? "Buy Now" : "Add to Cart";
  btn.style.opacity = "1";
}

function renderProduct(p) {
  product = p;

  const nameEl = document.getElementById("name");
  const descEl = document.getElementById("desc");
  const imageEl = document.getElementById("image");
  const priceEl = document.getElementById("price");
  const stockInfo = document.getElementById("stockInfo");
  const bikeSelect = document.getElementById("bikeModel");
  const flashTimerEl = document.getElementById("flashSaleTimer");

  if (nameEl) {
    nameEl.innerHTML = isFlashSaleProduct(p)
      ? `${p.name} <span class="badge bg-danger ms-2">FLASH SALE</span>`
      : (p.name || "");
  }

  if (descEl) descEl.innerText = p.description || "";

  if (imageEl) {
    imageEl.src = p.images?.[0]
      ? (p.images[0].startsWith("http")
          ? p.images[0]
          : window.API_BASE + p.images[0])
      : "./images/logo.png";
  }

  if (flashTimerEl) {
    if (isFlashSaleProduct(p)) {
      startProductFlashCountdown(p.flashSale?.endsAt);
    } else {
      flashTimerEl.textContent = "";
    }
  }

  const bikeOptions = getAvailableBikeModels(p);
  const defaultBike = bikeOptions[0] || "";

  if (bikeSelect) {
    bikeSelect.innerHTML = `
  ${bikeOptions.map(model => `
    <option value="${model}" ${model === defaultBike ? "selected" : ""}>
      ${model}
    </option>
  `).join("")}
`;
  }
if (defaultBike) {
  const isFlash = isFlashSaleProduct(p);

  const originalPrice = getBikePrice(p, defaultBike);
  const flashPrice = getFlashSalePrice(p, defaultBike);
  const priceToShow = (isFlash && flashPrice > 0) ? flashPrice : originalPrice;

  const stock = getBikeStock(p, defaultBike);
  currentStock = stock;

  if (priceEl) {
    if (isFlash) {
      priceEl.innerHTML = `
        <div class="text-danger fw-bold">₱${Number(priceToShow).toLocaleString("en-PH")}</div>
        <div class="small text-muted text-decoration-line-through">
          ₱${Number(originalPrice).toLocaleString("en-PH")}
        </div>
        <div class="small text-danger">
          Save ₱${Number(p.flashSale?.discountAmount || 0).toLocaleString("en-PH")}
        </div>
      `;
    } else {
      priceEl.innerText = `₱${Number(priceToShow).toLocaleString("en-PH")}`;
    }
  }

  if (stockInfo) {
    if (stock > 0) {
      stockInfo.innerText = `Available Stocks: ${stock}`;
      stockInfo.style.color = "green";
    } else {
      stockInfo.innerText = `Out of stock for ${defaultBike}`;
      stockInfo.style.color = "red";
    }
  }
}
  updateStickyBar();
  validateButtonState();
}

async function loadProduct() {
  if (!id) {
    showToast("Product not found", "error");
    return;
  }

  try {
    setProductLoadingState(true);

    const data = await window.fetchJSONCached(
      `${window.API_BASE}/api/products/${id}`,
      {},
      30000
    );

    renderProduct(data);
    await Promise.all([loadRatingSummary(), loadReviews()]);
  } catch (err) {
    console.error(err);
    showToast(err.message || "Failed to load product", "error");
  }
}

function add() {
  if (!isUserLoggedIn) {
    showToast("Please login first", "error");
    window.location.href = "/login.html";
    return;
  }

  if (!product) return;

  const bike = document.getElementById("bikeModel")?.value.trim();
  const qty = Number(document.getElementById("qty")?.value || 1);

  if (!bike) {
    showToast("Please select motorcycle model", "error");
    return;
  }

  const isFlash = isFlashSaleProduct(product);

const originalPrice = getBikePrice(product, bike);
const selectedPrice = isFlash
  ? getFlashSalePrice(product, bike)
  : originalPrice;
  const selectedStock = getBikeStock(product, bike);

  if (selectedStock <= 0) {
    showToast("Out of stock for selected motorcycle", "error");
    return;
  }

  if (qty > selectedStock) {
    showToast("Quantity exceeds stock", "error");
    return;
  }

  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const found = cart.find(i => i.productId === product._id && i.bike === bike);

  if (found) {
  found.qty += qty;

  if (isFlash) {
    found.price = selectedPrice;
    found.originalPrice = originalPrice;
    found.flashSale = true;
  }
} else {
   cart.push({
  productId: product._id,
  name: product.name,

  price: selectedPrice,
  originalPrice: originalPrice,

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

  showToast("Added to cart");
}

function handleBikeChange() {
  if (!product) return;

  const bikeRaw = document.getElementById("bikeModel")?.value.trim();
  const stockBox = document.getElementById("stockInfo");
  const priceEl = document.getElementById("price");

  if (!bikeRaw) {
    currentStock = 0;

    if (priceEl) {
      priceEl.innerHTML = isFlashSaleProduct(product)
        ? `
          <div class="text-danger fw-bold">${formatShopPrice(product.flashSale?.salePrice || {})}</div>
          <div class="small text-muted text-decoration-line-through">
            ${formatShopPrice(product.price || {})}
          </div>
          <div class="small text-danger">
            Save ₱${Number(product.flashSale?.discountAmount || 0).toLocaleString("en-PH")}
          </div>
        `
        : formatShopPrice(product.price || {});
    }

    if (stockBox) {
      stockBox.innerText = "Select a motorcycle model to see stock";
      stockBox.style.color = "#666";
    }

    updateStickyBar();
    validateButtonState();
    return;
  }

  const isFlash = isFlashSaleProduct(product);
  const originalPrice = getBikePrice(product, bikeRaw);
  const flashPrice = getFlashSalePrice(product, bikeRaw);
  const newPrice = (isFlash && flashPrice > 0) ? flashPrice : originalPrice;
  const stock = getBikeStock(product, bikeRaw);

  currentStock = stock;

  if (priceEl) {
    if (isFlash) {
      priceEl.innerHTML = `
        <div class="text-danger fw-bold">₱${Number(newPrice).toLocaleString("en-PH")}</div>
        <div class="small text-muted text-decoration-line-through">
          ₱${Number(originalPrice).toLocaleString("en-PH")}
        </div>
        <div class="small text-danger">
          Save ₱${Number(product.flashSale?.discountAmount || 0).toLocaleString("en-PH")}
        </div>
      `;
    } else {
      priceEl.innerText = `₱${Number(newPrice).toLocaleString("en-PH")}`;
    }
  }

  if (stockBox) {
    if (stock > 0) {
      stockBox.innerText = `Available Stocks: ${stock}`;
      stockBox.style.color = "green";
    } else {
      stockBox.innerText = `Out of stock for ${bikeRaw}`;
      stockBox.style.color = "red";
    }
  }

  updateStickyBar();
  validateButtonState();
}

function initImageZoom() {
  const zoomModal = document.getElementById("imageZoom");
  const zoomedImage = document.getElementById("zoomedImage");
  const trigger = document.getElementById("zoomTrigger");
  const closeBtn = document.querySelector(".zoom-close");
  const image = document.getElementById("image");

  trigger?.addEventListener("click", () => {
    if (!zoomModal || !zoomedImage || !image) return;
    zoomedImage.src = image.src;
    zoomModal.style.display = "flex";
  });

  closeBtn?.addEventListener("click", () => {
    if (zoomModal) zoomModal.style.display = "none";
  });

  zoomModal?.addEventListener("click", e => {
    if (e.target === zoomModal) {
      zoomModal.style.display = "none";
    }
  });
}

function initStickyCart() {
  let ticking = false;

  function updateSticky() {
    const sticky = document.getElementById("stickyCart");
    if (!sticky) return;

    if (window.scrollY > 300) {
      sticky.classList.add("show");
    } else {
      sticky.classList.remove("show");
    }
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateSticky();
        ticking = false;
      });
      ticking = true;
    }
  });

  updateSticky();
}

async function loadRatingSummary() {
  try {
    const res = await fetch(`${window.API_BASE}/api/reviews-summary/${id}`);
    const data = await res.json();

    const stars = "⭐".repeat(Math.round(data.avgRating || 0));

    document.getElementById("avgStars").innerText =
      `${stars} ${Number(data.avgRating || 0).toFixed(1)}`;

    document.getElementById("reviewCount").innerText =
      `(${Number(data.totalReviews || 0)} reviews)`;
  } catch (err) {
    console.error("Rating summary failed:", err);
  }
}

async function loadReviews() {
  try {
    const res = await fetch(`${window.API_BASE}/api/reviews/${id}`);
    const reviews = await res.json();

    const container = document.getElementById("reviewList");
    if (!container) return;

    if (!Array.isArray(reviews) || reviews.length === 0) {
      container.innerHTML = `
        <div class="text-muted">No reviews yet.</div>
      `;
      return;
    }

    container.innerHTML = "";

    reviews.forEach(r => {
      const imagesHTML = (r.images || []).map(img => `
        <img
          src="${img.startsWith("http") ? img : window.API_BASE + img}"
          style="width:80px;height:80px;object-fit:cover;border-radius:6px;margin:4px;"
        >
      `).join("");

      container.innerHTML += `
        <div class="card mb-2 p-3">
          <strong>${r.userId?.name || "Customer"}</strong>
          <div>${"⭐".repeat(Number(r.rating || 0))}</div>
          <p>${r.comment || ""}</p>
          <div>${imagesHTML}</div>
        </div>
      `;
    });
  } catch (err) {
    console.error("Reviews load failed:", err);
  }
}

async function submitReview() {
  if (!isUserLoggedIn) {
    showToast("Please login to review", "error");
    window.location.href = "/login.html";
    return;
  }

  const rating = document.getElementById("reviewRating")?.value;
  const comment = document.getElementById("reviewComment")?.value.trim();
  const files = document.getElementById("reviewImages")?.files;

  if (!comment) {
    showToast("Write a review first", "error");
    return;
  }

  const formData = new FormData();
  formData.append("productId", id);
  formData.append("rating", rating);
  formData.append("comment", comment);

  for (let i = 0; i < (files?.length || 0); i++) {
    formData.append("images", files[i]);
  }

  try {
    const res = await fetch(`${window.API_BASE}/api/reviews`, {
      method: "POST",
      credentials: "include",
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to submit review");
    }

    showToast("Review submitted");
    document.getElementById("reviewComment").value = "";
    document.getElementById("reviewImages").value = "";

    await loadReviews();
    await loadRatingSummary();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Failed to submit review", "error");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await checkLoginStatus();
  initImageZoom();
  initStickyCart();

  document.getElementById("bikeModel")?.addEventListener("change", handleBikeChange);
  document.getElementById("qty")?.addEventListener("input", validateButtonState);

  await loadProduct();
  validateButtonState();
  updateStickyBar();
});

window.add = add;
window.submitReview = submitReview;