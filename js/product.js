let isUserLoggedIn = false;
let product = null;
let currentStock = 0;

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

async function checkLoginStatus() {
  try {
    const res = await fetch(`${window.API_BASE}/api/users/me`, {
      credentials: "include"
    });
    isUserLoggedIn = res.ok;
  } catch {
    isUserLoggedIn = false;
  }
}

function syncCartToServer(cart) {
  fetch(`${window.API_BASE}/api/cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ items: cart })
  }).catch(err => console.error("Cart sync failed", err));
}

function getBikePrice(productObj, bike) {
  const key = bike.toLowerCase();

  if (key.includes("mio")) return Number(productObj.price?.mio || 0);
  if (key.includes("aerox")) return Number(productObj.price?.aerox || 0);
  if (key.includes("click")) return Number(productObj.price?.click || 0);
  if (key.includes("adv")) return Number(productObj.price?.adv || 0);

  return 0;
}

function getBikeStock(productObj, bike) {
  const key = bike.toLowerCase();

  if (key.includes("mio")) return Number(productObj.stock?.mio || 0);
  if (key.includes("aerox")) return Number(productObj.stock?.aerox || 0);
  if (key.includes("click")) return Number(productObj.stock?.click || 0);
  if (key.includes("adv")) return Number(productObj.stock?.adv || 0);

  return 0;
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
  btn.innerText = "Add to Cart";
  btn.style.opacity = "1";
}

function renderProduct(p) {
  product = p;

  document.getElementById("name").innerText = p.name || "";
  document.getElementById("desc").innerText = p.description || "";

  document.getElementById("image").src =
    p.images?.[0]
      ? (p.images[0].startsWith("http")
          ? p.images[0]
          : window.API_BASE + p.images[0])
      : "/images/placeholder.png";

  document.getElementById("price").innerText = Number(p.price?.mio || 0).toLocaleString("en-PH");

  const stockInfo = document.getElementById("stockInfo");
  if (stockInfo) {
    stockInfo.innerText = "Select a motorcycle model to see stock";
    stockInfo.style.color = "#666";
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
    const res = await fetch(`${window.API_BASE}/api/products/${id}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to load product");
    }

    renderProduct(data);
    await loadRatingSummary();
    await loadReviews();
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

  const selectedPrice = getBikePrice(product, bike);
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
}

function handleBikeChange() {
  if (!product) return;

  const bikeRaw = document.getElementById("bikeModel")?.value.trim();
  const stockBox = document.getElementById("stockInfo");

  if (!bikeRaw) {
    currentStock = 0;
    document.getElementById("price").innerText = Number(product.price?.mio || 0).toLocaleString("en-PH");
    if (stockBox) {
      stockBox.innerText = "Select a motorcycle model to see stock";
      stockBox.style.color = "#666";
    }
    updateStickyBar();
    validateButtonState();
    return;
  }

  const newPrice = getBikePrice(product, bikeRaw);
  const stock = getBikeStock(product, bikeRaw);
  currentStock = stock;

  document.getElementById("price").innerText = Number(newPrice).toLocaleString("en-PH");

  if (stockBox) {
    stockBox.innerText = `Available Stocks: ${stock}`;
    stockBox.style.color = stock > 0 ? "green" : "red";

    if (stock <= 0) {
      stockBox.innerText = `Out of stock for ${bikeRaw}`;
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
  window.addEventListener("scroll", () => {
    const sticky = document.getElementById("stickyCart");
    if (!sticky) return;

    if (window.scrollY > 300) {
      sticky.classList.add("show");
    } else {
      sticky.classList.remove("show");
    }
  });
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