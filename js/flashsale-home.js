function isFlashSaleProduct(product) {
  return product?.flashSale?.active === true;
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

function formatCountdown(endTime) {
  if (!endTime) return "Flash Sale Ended";

  const diff = new Date(endTime).getTime() - Date.now();

  if (diff <= 0) return "Flash Sale Ended";

  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);

  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

let flashTimer = null;

function startFlashTimer(endAt) {
  const el = document.getElementById("homeFlashSaleTimer");
  if (!el) return;

  if (flashTimer) clearInterval(flashTimer);

  function update() {
    const t = formatCountdown(endAt);
    el.textContent = t === "Flash Sale Ended" ? t : `Ends in ${t}`;
  }

  update();
  flashTimer = setInterval(update, 1000);
}

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("flashSaleProducts");
  if (!container) return;

  try {
    const products = await window.fetchJSONCached(
      `${window.API_BASE}/api/products`,
      {},
      30000
    );

    const flash = (Array.isArray(products) ? products : [])
      .filter(p => p.flashSale?.active);

    if (!flash.length) {
      container.innerHTML = `
        <div class="col-12 text-center text-muted py-4">
          No flash sale products right now.
        </div>
      `;
      return;
    }

    startFlashTimer(flash[0].flashSale?.endsAt);

container.innerHTML = flash.map(p => `
  <div class="swiper-slide">
    <div class="card product-card h-100 shadow-sm position-relative">

      <span class="badge bg-danger position-absolute top-0 start-0 m-2">
        FLASH SALE
      </span>

      <img
        src="${
          p.images?.[0]
            ? (p.images[0].startsWith("http")
                ? p.images[0]
                : window.API_BASE + p.images[0])
            : "/images/placeholder.png"
        }"
        class="card-img-top"
      />

      <div class="card-body d-flex flex-column">
        <h5>${p.name}</h5>

        <div class="text-danger fw-bold">
          ${formatShopPrice(p.flashSale?.salePrice)}
        </div>

        <div class="small text-muted text-decoration-line-through">
          ${formatShopPrice(p.price)}
        </div>

        <div class="small text-danger mb-2">
          Save up to ₱${Number(p.flashSale?.discountAmount || 0).toLocaleString("en-PH")}
        </div>

        <a href="/product.html?id=${p._id}" class="btn btn-dark btn-sm mt-auto">
          View Product
        </a>
      </div>
    </div>
  </div>
`).join("");
new Swiper(".flashSaleSwiper", {
  slidesPerView: 1.2,
  spaceBetween: 16,
  loop: false,
  pagination: {
    el: ".swiper-pagination",
    clickable: true
  },
  navigation: {
    nextEl: ".swiper-button-next",
    prevEl: ".swiper-button-prev"
  },
  breakpoints: {
    576: {
      slidesPerView: 2
    },
    992: {
      slidesPerView: 3
    }
  }
});
  } catch (err) {
    console.error(err);
  }
});