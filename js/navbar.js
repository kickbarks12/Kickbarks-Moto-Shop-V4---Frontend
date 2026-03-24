function updateCartCount() {
  const navCart = Array.isArray(JSON.parse(localStorage.getItem("cart")))
  ? JSON.parse(localStorage.getItem("cart"))
  : [];
  const count = navCart.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);

  const badge = document.getElementById("cartCount");
  if (badge) badge.innerText = count;
}

window.updateCartCount = updateCartCount;

function setActiveNavLink() {
  const currentPath = window.location.pathname;

  document.querySelectorAll(".nav-link").forEach(link => {
    const href = link.getAttribute("href");
    if (!href) return;

    if (href === currentPath || (href === "/" && currentPath === "/index.html")) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

function updateNavbarScroll() {
  const nav = document.querySelector(".moto-nav");
  if (!nav) return;

  if (window.scrollY > 20) {
    nav.classList.add("scrolled");
  } else {
    nav.classList.remove("scrolled");
  }
}

async function updateAuthNav() {
  const loginNav = document.getElementById("nav-login");
  const profileNav = document.getElementById("nav-profile");

  if (!loginNav || !profileNav) return;

  try {
    const res = await fetch(`${window.API_BASE}/api/users/me`, {
      credentials: "include"
    });

    if (res.ok) {
      loginNav.classList.add("d-none");
      profileNav.classList.remove("d-none");
    } else {
      loginNav.classList.remove("d-none");
      profileNav.classList.add("d-none");
    }
  } catch (err) {
    loginNav.classList.remove("d-none");
    profileNav.classList.add("d-none");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  setActiveNavLink();
  updateAuthNav();
  updateNavbarScroll();
});

window.addEventListener("scroll", updateNavbarScroll);