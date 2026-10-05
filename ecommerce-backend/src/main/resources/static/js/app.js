// ============================================================
// Ledger & Co. — frontend for the e-commerce backend
// Vanilla JS, no build step. Served by Spring Boot as a static
// resource, so all API calls are same-origin relative paths.
// ============================================================

const API = ""; // same origin — Spring Boot serves this file too
const PAGE_SIZE = 8;

const state = {
  token: localStorage.getItem("token") || null,
  username: localStorage.getItem("username") || null,
  role: localStorage.getItem("role") || null,
  cart: null,
  authMode: "login", // 'login' | 'register'
  products: { page: 0, totalPages: 1, category: "", search: "" },
};

// ---------- tiny helpers ----------

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const app = $("#app");

function fmtMoney(n) {
  return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function toast(message, type = "") {
  const el = $("#toast");
  el.textContent = message;
  el.className = "toast show " + type;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.className = "toast " + type), 2600);
}

function isAuthed() { return !!state.token; }
function isAdmin() { return state.role === "ADMIN"; }

async function api(path, { method = "GET", body, params } = {}) {
  let url = API + path;
  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }

  const headers = { "Content-Type": "application/json" };
  if (state.token) headers["Authorization"] = "Bearer " + state.token;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 || res.status === 403) {
    if (path !== "/api/auth/login" && path !== "/api/auth/register") {
      // token expired/invalid mid-session
      handleAuthExpired();
    }
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function handleAuthExpired() {
  if (!state.token) return;
  logout(false);
  toast("Your session expired — please sign in again.", "error");
  navigate("#/login");
}

// ---------- auth session ----------

function setSession({ token, username, role }) {
  state.token = token; state.username = username; state.role = role;
  localStorage.setItem("token", token);
  localStorage.setItem("username", username);
  localStorage.setItem("role", role);
  reflectAuthUI();
}

function logout(showToast = true) {
  state.token = null; state.username = null; state.role = null; state.cart = null;
  localStorage.removeItem("token"); localStorage.removeItem("username"); localStorage.removeItem("role");
  reflectAuthUI();
  updateCartCount();
  if (showToast) toast("Logged out.");
}

function reflectAuthUI() {
  document.body.classList.toggle("is-authed", isAuthed());
  document.body.classList.toggle("is-admin", isAdmin());
  $("#userChip").textContent = state.username ? "@" + state.username + (isAdmin() ? " · admin" : "") : "";
}

// ---------- router ----------

function navigate(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

window.addEventListener("hashchange", render);

function currentRoute() {
  const hash = location.hash || "#/products";
  const [path, query] = hash.slice(1).split("?");
  return { path: path || "/products", query: new URLSearchParams(query || "") };
}

async function render() {
  const { path } = currentRoute();

  // route guards
  if ((path === "/cart" || path === "/orders") && !isAuthed()) {
    toast("Please sign in first.", "error");
    location.hash = "#/login";
    return;
  }
  if (path === "/admin" && !isAdmin()) {
    toast("Admins only.", "error");
    location.hash = "#/products";
    return;
  }

  $$(".main-nav a, .cart-link").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === "#" + path);
  });

  try {
    if (path === "/login") return renderAuth();
    if (path === "/cart") return renderCart();
    if (path === "/orders") return renderOrders();
    if (path === "/admin") return renderAdmin();
    return renderProducts();
  } catch (err) {
    app.innerHTML = `<div class="empty-state"><p class="serif">Something went wrong</p><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- AUTH view ----------

function renderAuth() {
  app.innerHTML = "";
  app.appendChild($("#tpl-auth").content.cloneNode(true));
  applyAuthMode();

  $("#authSwitchBtn").addEventListener("click", () => {
    state.authMode = state.authMode === "login" ? "register" : "login";
    applyAuthMode();
  });

  $("#authForm").addEventListener("submit", onAuthSubmit);
}

function applyAuthMode() {
  const isLogin = state.authMode === "login";
  $("#authTitle").textContent = isLogin ? "Welcome back" : "Open an account";
  $("#authSub").textContent = isLogin
    ? "Sign in to browse the catalog and place orders."
    : "Takes a few seconds. You'll get a cart right away.";
  $("#fieldEmail").hidden = isLogin;
  $("#authEmail").required = !isLogin;
  $("#authSubmit").textContent = isLogin ? "Sign in" : "Create account";
  $("#authSwitchText").textContent = isLogin ? "New here?" : "Already have an account?";
  $("#authSwitchBtn").textContent = isLogin ? "Create an account" : "Sign in instead";
  $("#authError").hidden = true;
  $("#authForm").reset();
}

async function onAuthSubmit(e) {
  e.preventDefault();
  const isLogin = state.authMode === "login";
  const username = $("#authUsername").value.trim();
  const password = $("#authPassword").value;
  const email = $("#authEmail").value.trim();
  const btn = $("#authSubmit");
  const errEl = $("#authError");
  errEl.hidden = true;
  btn.disabled = true;
  btn.textContent = isLogin ? "Signing in…" : "Creating…";

  try {
    const data = isLogin
      ? await api("/api/auth/login", { method: "POST", body: { username, password } })
      : await api("/api/auth/register", { method: "POST", body: { username, email, password } });

    setSession(data);
    toast(isLogin ? `Welcome back, ${data.username}.` : `Account created — welcome, ${data.username}.`, "success");
    await refreshCart();
    navigate("#/products");
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
  } finally {
    btn.disabled = false;
    applyAuthModeLabelOnly();
  }
}

function applyAuthModeLabelOnly() {
  $("#authSubmit").textContent = state.authMode === "login" ? "Sign in" : "Create account";
}

// ---------- PRODUCTS view ----------

async function renderProducts() {
  app.innerHTML = "";
  app.appendChild($("#tpl-products").content.cloneNode(true));

  $("#searchInput").value = state.products.search;
  $("#searchInput").addEventListener("input", debounce((e) => {
    state.products.search = e.target.value.trim();
    state.products.page = 0;
    loadProducts();
  }, 350));

  $("#categoryFilter").addEventListener("change", (e) => {
    state.products.category = e.target.value;
    state.products.page = 0;
    loadProducts();
  });

  await populateCategories();
  await loadProducts();
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

async function populateCategories() {
  // Pull one large page just to derive the distinct category list for the filter.
  try {
    const data = await api("/api/products", { params: { page: 0, size: 100 } });
    const cats = Array.from(new Set((data.content || []).map((p) => p.category))).sort();
    const sel = $("#categoryFilter");
    if (!sel) return;
    cats.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c; opt.textContent = c;
      sel.appendChild(opt);
    });
    sel.value = state.products.category;
  } catch { /* non-fatal */ }
}

async function loadProducts() {
  const grid = $("#productGrid");
  const pager = $("#pager");
  if (!grid) return;
  grid.innerHTML = `<div class="empty-state">Loading the shelf…</div>`;

  const { page, category, search } = state.products;
  let data;
  try {
    if (search) {
      data = await api("/api/products/search", { params: { name: search, page, size: PAGE_SIZE } });
    } else if (category) {
      data = await api(`/api/products/category/${encodeURIComponent(category)}`, { params: { page, size: PAGE_SIZE } });
    } else {
      data = await api("/api/products", { params: { page, size: PAGE_SIZE } });
    }
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">Couldn't load products — ${escapeHtml(err.message)}</div>`;
    return;
  }

  const items = data.content || [];
  state.products.totalPages = data.totalPages ?? 1;

  if (items.length === 0) {
    grid.innerHTML = `<div class="empty-state"><p class="serif">Nothing on this shelf</p><p>Try a different search or category.</p></div>`;
    pager.innerHTML = "";
    return;
  }

  grid.innerHTML = items.map(productCardHtml).join("");
  $$(".add-to-cart-btn", grid).forEach((btn) => {
    btn.addEventListener("click", () => addToCart(Number(btn.dataset.id)));
  });

  renderPager(pager);
}

// ---------- category art ----------
// No external image CDN is reliable enough to depend on for a portfolio demo
// (Unsplash Source is dead, LoremFlickr is throttled to one stock photo since
// Flickr cut off its API). So categories get a small hand-drawn SVG mark
// instead — it always renders, and it always matches the product.
// A product can still override this with a real photo via its imageUrl field.

const CATEGORY_ICONS = {
  electronics: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="14" y="10" width="36" height="24" rx="2"/><path d="M26 34v6M38 34v6M20 46h24M24 46v6M40 46v6" stroke-linecap="round"/><circle cx="32" cy="22" r="5"/></svg>`,
  footwear: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M10 40c0-8 4-10 10-14 4-2.5 6-6 8-9 1.5 3 4 5 7 5h5c6 0 12 3 16 8 2 2.5 3 5.5 3 9v4H10v-3z"/><path d="M10 40h44M22 23c1.5 2 4 3 7 3"/></svg>`,
  apparel: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M24 12l8 6 8-6 10 6-6 9-4-2v27H26V25l-4 2-6-9 8-6z"/></svg>`,
  books: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M32 16c-4-3-11-4-18-3v33c7-1 14 0 18 3 4-3 11-4 18-3V13c-7-1-14 0-18 3z"/><path d="M32 16v33"/></svg>`,
  default: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 22l20-10 20 10-20 10-20-10z"/><path d="M12 22v20l20 10 20-10V22M32 32v20"/></svg>`,
};

function categoryIconKey(category) {
  const c = (category || "").toLowerCase();
  if (c.includes("electronic")) return "electronics";
  if (c.includes("shoe") || c.includes("footwear") || c.includes("sneaker")) return "footwear";
  if (c.includes("apparel") || c.includes("cloth") || c.includes("shirt") || c.includes("wear")) return "apparel";
  if (c.includes("book")) return "books";
  return "default";
}

function productMediaHtml(p) {
  if (p.imageUrl) {
    return `<div class="product-media"><img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.name)}" loading="lazy"
      onerror="this.closest('.product-media').innerHTML = ${JSON.stringify(categoryIconFallbackHtml(p.category))}"></div>`;
  }
  return categoryIconFallbackHtml(p.category, true);
}

function categoryIconFallbackHtml(category, wrapped) {
  const key = categoryIconKey(category);
  const icon = `<div class="product-icon cat-${key}">${CATEGORY_ICONS[key]}</div>`;
  return wrapped ? `<div class="product-media">${icon}</div>` : icon;
}

function productCardHtml(p) {
  const low = p.stockQuantity <= 5 && p.stockQuantity > 0;
  const out = p.stockQuantity <= 0;
  return `
    <article class="product-card">
      ${productMediaHtml(p)}
      <span class="cat-tag">${escapeHtml(p.category)}</span>
      <h3>${escapeHtml(p.name)}</h3>
      <p class="desc">${escapeHtml(p.description || "No description provided.")}</p>
      <div class="row">
        <span class="price">${fmtMoney(p.price)}</span>
        <span class="stock-note ${low ? "low" : ""}">${out ? "Out of stock" : low ? `Only ${p.stockQuantity} left` : `${p.stockQuantity} in stock`}</span>
      </div>
      <button class="btn btn-primary btn-block add-to-cart-btn" data-id="${p.id}" ${out ? "disabled" : ""}>
        ${out ? "Out of stock" : "Add to cart"}
      </button>
    </article>`;
}

function renderPager(pager) {
  const { page, totalPages } = state.products;
  if (totalPages <= 1) { pager.innerHTML = ""; return; }
  let html = "";
  html += `<button class="btn btn-ghost btn-sm" ${page === 0 ? "disabled" : ""} id="prevPage">← Prev</button>`;
  html += `<span class="stock-note" style="align-self:center">Page ${page + 1} of ${totalPages}</span>`;
  html += `<button class="btn btn-ghost btn-sm" ${page >= totalPages - 1 ? "disabled" : ""} id="nextPage">Next →</button>`;
  pager.innerHTML = html;
  $("#prevPage")?.addEventListener("click", () => { state.products.page--; loadProducts(); });
  $("#nextPage")?.addEventListener("click", () => { state.products.page++; loadProducts(); });
}

async function addToCart(productId) {
  if (!isAuthed()) { toast("Sign in to add items to your cart.", "error"); navigate("#/login"); return; }
  try {
    state.cart = await api("/api/cart/items", { method: "POST", body: { productId, quantity: 1 } });
    updateCartCount();
    toast("Added to cart.", "success");
  } catch (err) {
    toast(err.message, "error");
  }
}

// ---------- CART view (the "receipt") ----------

async function renderCart() {
  app.innerHTML = "";
  app.appendChild($("#tpl-cart").content.cloneNode(true));
  await refreshCart();
  paintReceipt();
}

async function refreshCart() {
  if (!isAuthed()) { state.cart = null; updateCartCount(); return; }
  try {
    state.cart = await api("/api/cart");
  } catch {
    state.cart = null;
  }
  updateCartCount();
}

function updateCartCount() {
  const count = (state.cart?.items || []).reduce((sum, i) => sum + i.quantity, 0);
  const badge = $("#cartCount");
  if (badge) badge.textContent = count;
}

function paintReceipt() {
  const el = $("#cartReceipt");
  if (!el) return;
  const items = state.cart?.items || [];

  if (items.length === 0) {
    el.innerHTML = `<div class="empty-state"><p class="serif">Your basket is empty</p><p>Head back to the catalog and add something to the shelf.</p></div>
      <div class="receipt-actions"><a href="#/products" class="btn btn-primary btn-block">Browse the catalog</a></div>`;
    return;
  }

  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  el.innerHTML =
    items.map((i) => `
      <div class="receipt-row">
        <div class="receipt-thumb">${productMediaHtml(i.product)}</div>
        <div>
          <div class="item-name">${escapeHtml(i.product.name)}</div>
          <div class="item-meta">
            <span class="qty-stepper">
              <button data-action="dec" data-item="${i.id}" aria-label="Decrease quantity">−</button>
              <span>${i.quantity}</span>
              <button data-action="inc" data-item="${i.id}" aria-label="Increase quantity">+</button>
            </span>
            · ${fmtMoney(i.product.price)} each
          </div>
        </div>
        <span class="leader"></span>
        <span class="item-price">${fmtMoney(i.product.price * i.quantity)}</span>
        <button class="btn btn-danger btn-sm" data-action="remove" data-item="${i.id}" aria-label="Remove item">✕</button>
      </div>
    `).join("") +
    `<div class="receipt-total"><span class="label">Total</span><span class="amount">${fmtMoney(total)}</span></div>`;

  $("#cartReceipt").insertAdjacentHTML("afterend", `
    <div class="receipt-actions">
      <button class="btn btn-primary btn-block" id="checkoutBtn">Place order</button>
      <button class="btn btn-ghost btn-block" id="clearCartBtn">Clear cart</button>
    </div>
  `);

  $$('[data-action="inc"]', el).forEach((b) => b.addEventListener("click", () => stepQuantity(b.dataset.item, +1)));
  $$('[data-action="dec"]', el).forEach((b) => b.addEventListener("click", () => stepQuantity(b.dataset.item, -1)));
  $$('[data-action="remove"]', el).forEach((b) => b.addEventListener("click", () => removeCartItem(b.dataset.item)));
  $("#checkoutBtn")?.addEventListener("click", placeOrder);
  $("#clearCartBtn")?.addEventListener("click", clearCart);
}

async function stepQuantity(itemId, delta) {
  const item = state.cart.items.find((i) => String(i.id) === String(itemId));
  if (!item) return;
  const newQty = item.quantity + delta;
  try {
    state.cart = await api(`/api/cart/items/${itemId}`, { method: "PUT", params: { quantity: newQty } });
    updateCartCount();
    paintReceipt();
  } catch (err) {
    toast(err.message, "error");
  }
}

async function removeCartItem(itemId) {
  try {
    state.cart = await api(`/api/cart/items/${itemId}`, { method: "DELETE" });
    updateCartCount();
    paintReceipt();
    toast("Removed.");
  } catch (err) {
    toast(err.message, "error");
  }
}

async function clearCart() {
  try {
    await api("/api/cart", { method: "DELETE" });
    await refreshCart();
    paintReceipt();
    toast("Cart cleared.");
  } catch (err) {
    toast(err.message, "error");
  }
}

async function placeOrder() {
  const btn = $("#checkoutBtn");
  btn.disabled = true; btn.textContent = "Placing order…";
  try {
    await api("/api/orders", { method: "POST" });
    await refreshCart();
    toast("Order placed. Find it under Orders.", "success");
    navigate("#/orders");
  } catch (err) {
    toast(err.message, "error");
    btn.disabled = false; btn.textContent = "Place order";
  }
}

// ---------- ORDERS view ----------

async function renderOrders() {
  app.innerHTML = "";
  app.appendChild($("#tpl-orders").content.cloneNode(true));
  const list = $("#orderList");
  list.innerHTML = `<div class="empty-state">Loading your orders…</div>`;

  try {
    const orders = await api("/api/orders");
    if (!orders.length) {
      list.innerHTML = `<div class="empty-state"><p class="serif">No orders yet</p><p>Once you check out, they'll show up here.</p></div>`;
      return;
    }
    list.innerHTML = orders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(orderCardHtml).join("");
  } catch (err) {
    list.innerHTML = `<div class="empty-state">Couldn't load orders — ${escapeHtml(err.message)}</div>`;
  }
}

function orderCardHtml(o) {
  const itemsLine = (o.items || [])
    .map((i) => `${i.quantity}× ${escapeHtml(i.product.name)}`)
    .join(", ");
  return `
    <div class="order-card">
      <div class="order-head">
        <span class="order-id">Order #${o.id}</span>
        <span class="status-pill status-${o.status}">${o.status}</span>
      </div>
      <div class="order-items">${itemsLine}</div>
      <div class="order-date">${fmtDate(o.createdAt)}</div>
      <div class="order-total">${fmtMoney(o.totalAmount)}</div>
    </div>`;
}

// ---------- ADMIN view ----------

async function renderAdmin() {
  app.innerHTML = "";
  app.appendChild($("#tpl-admin").content.cloneNode(true));

  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.tab;
      $("#panel-inventory").hidden = target !== "inventory";
      $("#panel-all-orders").hidden = target !== "all-orders";
      if (target === "all-orders") loadAdminOrders();
    });
  });

  $("#productForm").addEventListener("submit", onProductFormSubmit);
  $("#cancelEditBtn").addEventListener("click", resetProductForm);

  await loadAdminProducts();
}

async function loadAdminProducts() {
  const tbody = $("#adminProductTable tbody");
  tbody.innerHTML = `<tr><td colspan="6">Loading…</td></tr>`;
  try {
    const data = await api("/api/products", { params: { page: 0, size: 100 } });
    const items = data.content || [];
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="6">No products yet — add your first one above.</td></tr>`;
      return;
    }
    tbody.innerHTML = items.map((p) => `
      <tr>
        <td class="admin-thumb-cell">${productMediaHtml(p)}</td>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.category)}</td>
        <td class="price-cell">${fmtMoney(p.price)}</td>
        <td>${p.stockQuantity}</td>
        <td>
          <div class="cell-actions">
            <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${p.id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-action="delete" data-id="${p.id}">Delete</button>
          </div>
        </td>
      </tr>`).join("");

    $$('[data-action="edit"]', tbody).forEach((b) => b.addEventListener("click", () => editProduct(items.find(p => p.id === Number(b.dataset.id)))));
    $$('[data-action="delete"]', tbody).forEach((b) => b.addEventListener("click", () => deleteProduct(Number(b.dataset.id))));
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6">Couldn't load products — ${escapeHtml(err.message)}</td></tr>`;
  }
}

function editProduct(p) {
  if (!p) return;
  $("#editingProductId").value = p.id;
  $("#pName").value = p.name;
  $("#pCategory").value = p.category;
  $("#pPrice").value = p.price;
  $("#pStock").value = p.stockQuantity;
  $("#pDescription").value = p.description || "";
  $("#pImageUrl").value = p.imageUrl || "";
  $("#productFormSubmit").textContent = "Save changes";
  $("#cancelEditBtn").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetProductForm() {
  $("#productForm").reset();
  $("#editingProductId").value = "";
  $("#productFormSubmit").textContent = "Add product";
  $("#cancelEditBtn").hidden = true;
}

async function onProductFormSubmit(e) {
  e.preventDefault();
  const id = $("#editingProductId").value;
  const payload = {
    name: $("#pName").value.trim(),
    category: $("#pCategory").value.trim(),
    price: Number($("#pPrice").value),
    stockQuantity: Number($("#pStock").value),
    description: $("#pDescription").value.trim(),
    imageUrl: $("#pImageUrl").value.trim() || null,
  };
  const btn = $("#productFormSubmit");
  btn.disabled = true;

  try {
    if (id) {
      await api(`/api/admin/products/${id}`, { method: "PUT", body: payload });
      toast("Product updated.", "success");
    } else {
      await api("/api/admin/products", { method: "POST", body: payload });
      toast("Product added.", "success");
    }
    resetProductForm();
    await loadAdminProducts();
  } catch (err) {
    toast(err.message, "error");
  } finally {
    btn.disabled = false;
  }
}

async function deleteProduct(id) {
  if (!confirm("Delete this product? This can't be undone.")) return;
  try {
    await api(`/api/admin/products/${id}`, { method: "DELETE" });
    toast("Product deleted.");
    await loadAdminProducts();
  } catch (err) {
    toast(err.message, "error");
  }
}

async function loadAdminOrders() {
  const list = $("#adminOrderList");
  list.innerHTML = `<div class="empty-state">Loading orders…</div>`;
  try {
    const orders = await api("/api/admin/orders");
    if (!orders.length) {
      list.innerHTML = `<div class="empty-state">No orders placed yet.</div>`;
      return;
    }
    const statuses = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];
    list.innerHTML = orders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((o) => `
        <div class="order-card">
          <div class="order-head">
            <span class="order-id">Order #${o.id} — @${escapeHtml(o.user?.username || "unknown")}</span>
            <select class="select-input status-select" data-id="${o.id}" style="width:auto;">
              ${statuses.map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}
            </select>
          </div>
          <div class="order-items">${(o.items || []).map((i) => `${i.quantity}× ${escapeHtml(i.product.name)}`).join(", ")}</div>
          <div class="order-date">${fmtDate(o.createdAt)}</div>
          <div class="order-total">${fmtMoney(o.totalAmount)}</div>
        </div>`).join("");

    $$(".status-select", list).forEach((sel) => {
      sel.addEventListener("change", async () => {
        try {
          await api(`/api/admin/orders/${sel.dataset.id}/status`, { method: "PUT", params: { status: sel.value } });
          toast("Order status updated.", "success");
        } catch (err) {
          toast(err.message, "error");
        }
      });
    });
  } catch (err) {
    list.innerHTML = `<div class="empty-state">Couldn't load orders — ${escapeHtml(err.message)}</div>`;
  }
}

// ---------- global wiring ----------

$("#logoutBtn").addEventListener("click", () => { logout(); navigate("#/products"); });

(async function init() {
  reflectAuthUI();
  await refreshCart();
  if (!location.hash) location.hash = "#/products";
  render();
})();
