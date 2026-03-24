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

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("featuredProducts");
  if (!container) return;

  try {
    const res = await fetch(`${window.API_BASE}/api/products?featured=true`);
    const products = await res.json();

    if (!res.ok || !Array.isArray(products) || !products.length) {
      container.innerHTML = `
        <div class="col-12 text-center text-muted py-4">
          No featured products available.
        </div>
      `;
      return;
    }

    container.innerHTML = products.slice(0, 6).map(product => `
      <div class="col-12 col-sm-6 col-md-4">
        <div class="card product-card h-100 shadow-sm">
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

            <div class="product-price mb-2">
              ${formatShopPrice(product.price)}
            </div>

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
  } catch (err) {
    console.error("Featured products failed:", err);
    container.innerHTML = `
      <div class="col-12 text-center text-muted py-4">
        Failed to load featured products.
      </div>
    `;
  }
});