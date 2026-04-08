function formatShopPrice(priceObj) {
  if (!priceObj) return "₱0";

  const values = Object.values(priceObj)
    .map(v => Number(v))
    .filter(v => !isNaN(v) && v > 0);

  if (!values.length) return "₱0";

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    return "₱" + min.toLocaleString("en-PH");
  }

  return `₱${min.toLocaleString("en-PH")} - ₱${max.toLocaleString("en-PH")}`;
}
function isFlashSaleProduct(product) {
  return product?.flashSale?.active === true;
}

function formatFlashSalePrice(salePriceObj) {
  if (!salePriceObj) return "₱0";

  const values = Object.values(salePriceObj)
    .map(v => Number(v))
    .filter(v => !isNaN(v) && v > 0);

  if (!values.length) return "₱0";

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    return "₱" + min.toLocaleString("en-PH");
  }

  return `₱${min.toLocaleString("en-PH")} - ₱${max.toLocaleString("en-PH")}`;
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

function startFlashSaleCountdowns() {
  const timerEls = document.querySelectorAll("[data-flash-ends-at]");

  if (!timerEls.length) return;

  function updateTimers() {
    timerEls.forEach(el => {
      const endAt = el.getAttribute("data-flash-ends-at");
      el.textContent = formatCountdown(endAt);
    });
  }

  updateTimers();
  setInterval(updateTimers, 1000);
}
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("featuredProducts");
  if (!container) return;

  try {
    const products = await window.fetchJSONCached(
      `${window.API_BASE}/api/products?featured=true`,
      {},
      30000
    );

    if (!Array.isArray(products) || !products.length) {
      container.innerHTML = `
        <div class="col-12 text-center text-muted py-4">
          No featured products available.
        </div>
      `;
      return;
    }

    container.innerHTML = products.slice(0, 6).map(product => `
  <div class="col-12 col-sm-6 col-md-4">
    <div class="card product-card h-100 shadow-sm position-relative">

      ${
        isFlashSaleProduct(product)
          ? `
            <span class="badge bg-danger position-absolute top-0 start-0 m-2">
              FLASH SALE
            </span>
          `
          : ""
      }

      <img
        src="${
          product.images?.[0]
            ? (product.images[0].startsWith("http")
                ? product.images[0]
                : window.API_BASE + product.images[0])
            : "/images/placeholder.png"
        }"
        alt="${product.name}"
        class="card-img-top"
      />

      <div class="card-body d-flex flex-column">
        <h5 class="card-title">${product.name}</h5>

        ${
          isFlashSaleProduct(product)
            ? `
              <div class="mb-2">
                <div class="text-danger fw-bold">
                  ${formatFlashSalePrice(product.flashSale.salePrice)}
                </div>
                <div class="small text-muted text-decoration-line-through">
                  ${formatShopPrice(product.price)}
                </div>
                <div class="small text-danger">
                  Save ₱${Number(product.flashSale.discountAmount || 0).toLocaleString("en-PH")}
                </div>
                <div class="small fw-semibold text-dark" data-flash-ends-at="${product.flashSale?.endsAt || ""}"></div>
              </div>
            `
            : `
              <div class="product-price mb-2">
                ${formatShopPrice(product.price)}
              </div>
            `
        }

        <a
          href="/product.html?id=${product._id}"
          class="btn btn-dark btn-sm mt-auto"
        >
          View Product
        </a>
      </div>
    </div>
  </div>
`).join("");
startFlashSaleCountdowns();
  } catch (err) {
    console.error("Featured products failed:", err);
    container.innerHTML = `
      <div class="col-12 text-center text-muted py-4">
        Failed to load featured products.
      </div>
    `;
  }
});