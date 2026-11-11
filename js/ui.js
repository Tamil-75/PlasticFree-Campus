/* =============================================================
   PlasticFree Campus — UI kit
   formatting · toasts · modals · confirm · count-up · ripple ·
   dropdowns · clipboard · file downloads
   ============================================================= */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* -------------------------------------------------------------
     Formatting
     ------------------------------------------------------------- */
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  function n0(v) { return Math.round(Number(v) || 0).toLocaleString("en-IN"); }

  function n1(v) {
    const x = Number(v) || 0;
    return x.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  function n2(v) {
    const x = Number(v) || 0;
    return x.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /** 12500 → "12.5k" */
  function compact(v) {
    const x = Number(v) || 0;
    const a = Math.abs(x);
    if (a >= 1e7) return (x / 1e7).toFixed(a >= 1e8 ? 0 : 1).replace(/\.0$/, "") + "Cr";
    if (a >= 1e5) return (x / 1e5).toFixed(a >= 1e6 ? 0 : 1).replace(/\.0$/, "") + "L";
    if (a >= 1e3) return (x / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "k";
    return String(Math.round(x));
  }

  function kg(v) {
    const x = Number(v) || 0;
    if (x >= 1000) return n1(x / 1000) + " t";
    if (x >= 100) return n0(x);
    return n2(x);
  }

  function rupees(v, opts) {
    const x = Math.round(Number(v) || 0);
    const sym = (window.PFC.store.getSettings() || {}).currency || "₹";
    if (opts && opts.compact) return sym + compact(x);
    return sym + x.toLocaleString("en-IN");
  }

  function pct(v, digits) {
    const x = (Number(v) || 0) * 100;
    return (digits === 0 ? Math.round(x) : x.toFixed(digits == null ? 1 : digits)) + "%";
  }

  function signed(v, digits) {
    const x = Number(v) || 0;
    return (x > 0 ? "+" : "") + x.toFixed(digits == null ? 1 : digits) + "%";
  }

  const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function dateShort(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
  }

  function dateTiny(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return `${d} ${MONTHS_SHORT[m - 1]}`;
  }

  function timeAgo(iso) {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    const days = Math.floor(hrs / 24);
    if (days < 30) return days + "d ago";
    return Math.floor(days / 30) + "mo ago";
  }

  function initials(name) {
    return String(name || "?").split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  }

  /* -------------------------------------------------------------
     DOM helpers
     ------------------------------------------------------------- */
  function icon(id, cls) {
    return `<svg class="${cls || ""}" aria-hidden="true"><use href="#${id}"></use></svg>`;
  }

  function el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function emptyState(iconId, title, desc, actionHtml) {
    return `
      <div class="empty">
        <div class="empty__art">${icon(iconId)}</div>
        <div class="empty__title">${esc(title)}</div>
        <div class="empty__desc">${esc(desc)}</div>
        ${actionHtml || ""}
      </div>`;
  }

  /** delta chip — `good: 'down'` when a decrease is positive news */
  function delta(value, opts) {
    const o = opts || {};
    const v = Number(value) || 0;
    const flat = Math.abs(v) < 0.05;
    const up = v > 0;
    let cls;
    if (flat) cls = "delta delta--flat";
    else if (o.good === "down") cls = up ? "delta delta--down" : "delta delta--good-down";
    else if (o.good === "up") cls = up ? "delta delta--good-up" : "delta delta--down";
    else cls = up ? "delta delta--up" : "delta delta--down";

    const ic = flat ? "i-chev-down" : up ? "i-arrow-up" : "i-arrow-down";
    const label = flat ? "0%" : signed(v, o.digits);
    return `<span class="${cls}">${icon(ic)}${label}</span>`;
  }

  /* -------------------------------------------------------------
     Count-up animation
     ------------------------------------------------------------- */
  function countUp(node, to, opts) {
    if (!node) return;
    const o = opts || {};
    const from = o.from != null ? o.from : Number(String(node.dataset.count || 0)) || 0;
    const dur = o.duration || 1100;
    const dec = o.decimals == null ? 0 : o.decimals;
    const prefix = o.prefix || "";
    const suffix = o.suffix || "";
    const formatter = o.format || ((v) => v.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ","));
    const start = performance.now();

    if (node._raf) cancelAnimationFrame(node._raf);

    function frame(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 4); // easeOutQuart
      const val = from + (to - from) * eased;
      node.textContent = prefix + formatter(val) + suffix;
      if (t < 1) node._raf = requestAnimationFrame(frame);
      else {
        node.textContent = prefix + formatter(to) + suffix;
        node.dataset.count = to;
        if (o.pulse) {
          node.style.animation = "none";
          void node.offsetWidth;
          node.style.animation = "numPulse 420ms var(--ease-spring)";
        }
      }
    }
    node._raf = requestAnimationFrame(frame);
  }

  /* -------------------------------------------------------------
     Toasts
     ------------------------------------------------------------- */
  const TOAST_ICONS = {
    success: "i-check",
    error: "i-alert",
    warn: "i-alert",
    info: "i-info"
  };

  function toast(opts) {
    const o = typeof opts === "string" ? { title: opts } : opts || {};
    const root = $("#toasts");
    if (!root) return;
    const type = o.type || "success";
    const node = el(`
      <div class="toast toast--${type}">
        <div class="toast__icon">${icon(TOAST_ICONS[type] || "i-check")}</div>
        <div class="toast__msg">
          <div class="toast__title">${esc(o.title || "Done")}</div>
          ${o.desc ? `<div class="toast__desc">${esc(o.desc)}</div>` : ""}
        </div>
        <div class="toast__bar" style="animation-duration:${o.duration || 3600}ms"></div>
      </div>`);

    root.appendChild(node);
    while (root.children.length > 4) root.removeChild(root.firstElementChild);

    const life = o.duration || 3600;
    setTimeout(() => {
      node.classList.add("is-out");
      setTimeout(() => node.remove(), 280);
    }, life);
    return node;
  }

  /* -------------------------------------------------------------
     Modal / drawer
     ------------------------------------------------------------- */
  let openModals = 0;

  function openModal(opts) {
    const o = opts || {};
    const root = $("#modal-root");
    const sizeCls = o.size === "lg" ? " modal--lg" : o.size === "xl" ? " modal--xl" : "";
    const isDrawer = !!o.drawer;

    const overlay = el(`
      <div class="overlay${isDrawer ? " overlay--drawer" : ""}" role="dialog" aria-modal="true" aria-label="${esc(o.title || "Dialog")}">
        <div class="${isDrawer ? "drawer" : "modal" + sizeCls}">
          <div class="modal__head">
            <div class="modal__title">${o.icon ? icon(o.icon) : ""}${esc(o.title || "")}</div>
            <button class="btn btn--icon" data-close aria-label="Close">${icon("i-x")}</button>
          </div>
          <div class="modal__body"></div>
          ${o.footer === false ? "" : `<div class="modal__foot"></div>`}
        </div>
      </div>`);

    const body = $(".modal__body", overlay);
    if (typeof o.body === "string") body.innerHTML = o.body;
    else if (o.body instanceof Node) body.appendChild(o.body);

    const foot = $(".modal__foot", overlay);
    if (foot && o.footer) {
      if (typeof o.footer === "string") foot.innerHTML = o.footer;
      else if (o.footer instanceof Node) foot.appendChild(o.footer);
    }

    function close(result) {
      overlay.style.animation = "fadeIn var(--dur-base) var(--ease-in-out) reverse";
      setTimeout(() => overlay.remove(), 170);
      document.removeEventListener("keydown", onKey);
      openModals = Math.max(0, openModals - 1);
      if (openModals === 0) document.body.style.overflow = "";
      if (o.onClose) o.onClose(result);
    }

    function onKey(e) {
      if (e.key === "Escape" && !o.persistent) { e.stopPropagation(); close(); }
    }

    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay && !o.persistent) close();
    });
    $$("[data-close]", overlay).forEach((b) => b.addEventListener("click", () => close()));
    document.addEventListener("keydown", onKey);

    root.appendChild(overlay);
    openModals += 1;
    document.body.style.overflow = "hidden";

    const focusable = $("input, textarea, select, button:not([data-close])", body);
    if (focusable) setTimeout(() => focusable.focus(), 60);

    if (o.onMount) o.onMount(overlay, { close });
    return { el: overlay, body, foot, close };
  }

  function confirm(opts) {
    const o = opts || {};
    return new Promise((resolve) => {
      let answered = false;
      const m = openModal({
        title: o.title || "Are you sure?",
        icon: o.icon || "i-alert",
        body: `
          <p class="muted" style="font-size:var(--fs-base);line-height:1.6">
            ${o.message || "This action cannot be undone."}
          </p>
          ${o.detail ? `<div class="card card--pad mt-4" style="font-size:var(--fs-sm)">${o.detail}</div>` : ""}`,
        footer: `
          <button class="btn btn--ghost" data-close>Cancel</button>
          <button class="btn ${o.danger ? "btn--danger" : "btn--primary"}" data-ok>
            ${o.confirmText || "Confirm"}
          </button>`,
        onClose: () => { if (!answered) resolve(false); }
      });
      $("[data-ok]", m.el).addEventListener("click", () => {
        answered = true;
        m.close();
        resolve(true);
      });
    });
  }

  /* -------------------------------------------------------------
     Ripple (delegated)
     ------------------------------------------------------------- */
  document.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest(".btn, .nav__item, .chip, .zonepick, .itempick, .theme-card");
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 0.9;
    const r = document.createElement("span");
    r.className = "ripple";
    r.style.width = r.style.height = size + "px";
    r.style.left = e.clientX - rect.left - size / 2 + "px";
    r.style.top = e.clientY - rect.top - size / 2 + "px";
    if (getComputedStyle(btn).position === "static") btn.style.position = "relative";
    btn.appendChild(r);
    setTimeout(() => r.remove(), 640);
  }, { passive: true });

  /* -------------------------------------------------------------
     Dropdown menu
     ------------------------------------------------------------- */
  let activeMenu = null;

  function closeMenu() {
    if (activeMenu) { activeMenu.remove(); activeMenu = null; }
  }

  document.addEventListener("click", (e) => {
    if (activeMenu && !activeMenu.contains(e.target) && !e.target.closest("[data-menu-anchor]")) closeMenu();
  });
  window.addEventListener("resize", closeMenu);
  window.addEventListener("scroll", closeMenu, true);

  function menu(anchor, items) {
    closeMenu();
    const rect = anchor.getBoundingClientRect();
    const node = el(`<div class="menu"></div>`);
    node.innerHTML = items.map((it) => {
      if (it.sep) return `<div class="menu__sep"></div>`;
      return `<button class="menu__item ${it.danger ? "menu__item--danger" : ""}" data-idx="${it._i}">
        ${it.icon ? icon(it.icon) : ""}<span>${esc(it.label)}</span>
      </button>`;
    }).join("");

    document.body.appendChild(node);
    const w = node.offsetWidth, h = node.offsetHeight;
    let left = rect.right - w;
    let top = rect.bottom + 7;
    if (left < 8) left = 8;
    if (top + h > window.innerHeight - 8) top = rect.top - h - 7;
    node.style.left = left + "px";
    node.style.top = top + "px";
    node.style.position = "fixed";

    $$(".menu__item", node).forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = +btn.dataset.idx;
        closeMenu();
        const item = items.filter((i) => !i.sep)[idx];
        if (item && item.onSelect) item.onSelect();
      });
    });

    activeMenu = node;
    return node;
  }

  function menuItems(arr) {
    let i = 0;
    return arr.map((it) => (it.sep ? it : Object.assign({}, it, { _i: i++ })));
  }

  /* -------------------------------------------------------------
     Clipboard / downloads
     ------------------------------------------------------------- */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // file:// fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (_) {}
      ta.remove();
      return ok;
    }
  }

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 300);
  }

  function csvEscape(v) {
    const s = String(v == null ? "" : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCSV(rows) {
    return rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  }

  /* -------------------------------------------------------------
     Misc
     ------------------------------------------------------------- */
  function debounce(fn, ms) {
    let t;
    return function () {
      const args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(ctx, args), ms || 200);
    };
  }

  function uid(prefix) {
    return (prefix || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function skeletonGrid(count, cls) {
    let out = "";
    for (let i = 0; i < (count || 4); i++) out += `<div class="skel ${cls || "skel--kpi"}"></div>`;
    return out;
  }

  window.PFC = window.PFC || {};
  window.PFC.ui = {
    $, $$, esc, el, icon,
    n0, n1, n2, compact, kg, rupees, pct, signed,
    dateShort, dateTiny, timeAgo, initials,
    emptyState, delta, countUp, skeletonGrid,
    toast, openModal, confirm,
    menu, menuItems, closeMenu,
    copyText, download, toCSV,
    debounce, uid
  };
})();
