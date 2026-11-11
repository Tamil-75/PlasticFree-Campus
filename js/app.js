/* =============================================================
   PlasticFree Campus — App bootstrap, hash router, chrome
   ============================================================= */
(function () {
  "use strict";
  const ui = window.PFC.ui;
  const store = window.PFC.store;
  const { $, $$, esc, icon } = ui;

  const ROUTES = ["dashboard", "audits", "analytics", "insights", "reports", "settings"];
  const TITLES = {
    dashboard: ["Dashboard", "Workspace"],
    audits: ["Audit records", "Workspace"],
    analytics: ["Analytics", "Workspace"],
    insights: ["Insights & recommendations", "Intelligence"],
    reports: ["Report studio", "Intelligence"],
    settings: ["Settings", "System"]
  };

  let current = null;

  /* -------------------------------------------------------------
     Theme
     ------------------------------------------------------------- */
  function setTheme(theme, persist) {
    const t = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", t);
    const use = $("#theme-icon use");
    if (use) use.setAttribute("href", t === "light" ? "#i-moon" : "#i-sun");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "light" ? "#f8faf9" : "#080d16");
    if (persist !== false) {
      const s = store.getSettings();
      if (s && s.theme !== t) store.updateSettings({ theme: t });
    }
  }

  /* -------------------------------------------------------------
     Chrome (sidebar + topbar) refresh
     ------------------------------------------------------------- */
  function refreshChrome() {
    const s = store.getSettings();

    // today chip
    const now = new Date();
    const today = now.toLocaleDateString("en-GB", {
      weekday: "short", day: "2-digit", month: "short", year: "numeric"
    });
    const tl = $("#today-label");
    if (tl) tl.textContent = today;

    // crumb follows campus name
    const crumb = document.querySelector(".topbar__crumb");
    if (crumb && s) crumb.innerHTML = `${esc(s.programLine)} <span>/</span> Project 9`;

    // audit badge (last 30 days)
    const cut = new Date(); cut.setDate(cut.getDate() - 30);
    const recentCount = store.audits.filter((a) => store.parseDate(a.date) >= cut).length;
    const badge = $("#nav-audit-count");
    if (badge) {
      badge.textContent = recentCount;
      badge.hidden = recentCount === 0;
    }

    // insights badge
    const insBadge = $("#nav-insight-count");
    if (insBadge && window.PFC.views.insights) {
      const dismissed = (store.getSettings().dismissed || []);
      const active = window.PFC.views.insights.buildInsights()
        .filter((i) => !dismissed.includes(i.id)).length;
      insBadge.textContent = active;
      insBadge.hidden = active === 0;
    }

    // eco score
    const eco = store.ecoScore();
    const scoreEl = $("#eco-score");
    if (scoreEl) ui.countUp(scoreEl, eco.score, { duration: 900 });
    const fill = $("#eco-score-fill");
    if (fill) setTimeout(() => (fill.style.width = eco.score + "%"), 120);
    const hint = $("#eco-hint");
    if (hint) hint.textContent = store.ecoHint(eco.score);
  }

  /* -------------------------------------------------------------
     Router
     ------------------------------------------------------------- */
  function parseHash() {
    const raw = (location.hash || "").replace(/^#\/?/, "");
    const name = raw.split("/")[0] || "dashboard";
    return ROUTES.includes(name) ? name : "dashboard";
  }

  function setActiveNav(name) {
    $$("[data-route]").forEach((a) => a.classList.toggle("is-active", a.dataset.route === name));
  }

  function render() {
    const name = parseHash();
    const view = window.PFC.views[name];
    if (!view) { location.hash = "#/dashboard"; return; }

    current = name;
    setActiveNav(name);

    const [title, crumb] = TITLES[name] || [view.title, ""];
    $("#page-title").textContent = title;
    document.title = title + " · PlasticFree Campus";
    const crumbEl = document.querySelector(".topbar__crumb");
    if (crumbEl && store.getSettings()) {
      crumbEl.innerHTML = `${esc(store.getSettings().programLine)} <span>/</span> ${esc(crumb)}`;
    }

    const root = $("#view-root");
    root.style.opacity = "0";
    root.style.transform = "translateY(10px)";

    requestAnimationFrame(() => {
      try {
        view.render(root);
      } catch (err) {
        console.error("[render]", err);
        root.innerHTML = `<div class="card">${ui.emptyState("i-alert", "Something went wrong",
          "The view failed to render. Check the console for details.")}</div>`;
      }
      root.style.transition = "opacity .42s var(--ease-out), transform .42s var(--ease-out)";
      root.style.opacity = "1";
      root.style.transform = "translateY(0)";
      refreshChrome();
    });

    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    root.focus({ preventScroll: true });
  }

  function refresh() {
    if (current) render();
    refreshChrome();
  }

  /* -------------------------------------------------------------
     Boot
     ------------------------------------------------------------- */
  function boot() {
    const mode = store.init();
    const s = store.getSettings();

    setTheme(s.theme || "dark", false);
    refreshChrome();

    // nav wiring
    $$("[data-route]").forEach((a) => {
      a.addEventListener("click", (e) => {
        const href = a.getAttribute("href");
        if (location.hash === href) { e.preventDefault(); render(); }
      });
    });

    // theme toggle
    $("#theme-btn").addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      setTheme(next);
      refresh(); // re-render so charts pick up new palette
      ui.toast({ type: "info", title: next === "dark" ? "Eco glass theme" : "Light airy theme", duration: 1900 });
    });

    // global new audit
    $("#new-audit-btn").addEventListener("click", openNewAudit);

    window.addEventListener("hashchange", render);

    // keyboard: "n" → new audit, "g then d/a/i/r/s" style nav is overkill — keep "n" + "?"
    document.addEventListener("keydown", (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "n") { e.preventDefault(); openNewAudit(); }
      if (e.key === "/") {
        const search = $("#a-q");
        if (search) { e.preventDefault(); search.focus(); }
      }
    });

    // first-run welcome
    if (mode === "seeded") {
      setTimeout(() => ui.toast({
        title: "Welcome to PlasticFree Campus",
        desc: "A 66-audit showcase dataset has been loaded — explore freely.",
        duration: 5200
      }), 700);
    }

    // initial route
    if (!location.hash) location.hash = "#/dashboard";
    render();

    // live chrome tick (clock only)
    setInterval(refreshChrome, 60000);
  }

  function openNewAudit() {
    window.PFC.views.audits.openWizard({ onDone: () => refresh() });
  }

  window.PFC.app = { setTheme, refreshChrome, refresh, render, openNewAudit };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
