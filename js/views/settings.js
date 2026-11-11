/* =============================================================
   PlasticFree Campus — Settings view
   campus profile · targets · appearance · data management · about
   ============================================================= */
(function () {
  "use strict";
  const ui = window.PFC.ui;
  const store = window.PFC.store;
  const { $, $$, esc, icon } = ui;

  function storageBytes() {
    let total = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("pfc:")) total += (k.length + (localStorage.getItem(k) || "").length) * 2;
      }
    } catch (e) {}
    return total;
  }

  const fmtBytes = (b) => (b / 1024).toFixed(b > 1024 * 100 ? 0 : 1) + " KB";

  function render(root) {
    const s = store.getSettings();
    const audits = store.audits;
    const bytes = storageBytes();

    root.innerHTML = `
      <div class="view-enter">
        <div class="pagehead no-print">
          <div>
            <h2 class="pagehead__title">Settings</h2>
            <p class="pagehead__sub">Configure the platform for your campus, manage targets and control local data.</p>
          </div>
        </div>

        <div class="settings-grid">
          <!-- CAMPUS PROFILE -->
          <div class="card">
            <div class="card__head"><div class="card__title">${icon("i-pin")} Campus profile</div></div>
            <div class="card__body" style="display:flex;flex-direction:column;gap:var(--sp-4)">
              <div class="field">
                <label class="field__label" for="st-name">Campus / institution name</label>
                <input class="input" id="st-name" value="${esc(s.campusName)}">
              </div>
              <div class="field">
                <label class="field__label" for="st-program">Program line</label>
                <input class="input" id="st-program" value="${esc(s.programLine)}">
                <div class="field__hint">Shown in the sidebar crumb and report masthead.</div>
              </div>
              <div class="field">
                <label class="field__label" for="st-auditor">Default auditor</label>
                <input class="input" id="st-auditor" value="${esc(s.defaultAuditor)}">
              </div>
              <div class="field">
                <label class="field__label" for="st-author">Report prepared by</label>
                <input class="input" id="st-author" value="${esc(s.reportAuthor)}">
              </div>
              <div class="field">
                <label class="field__label" for="st-sign">Report signatory</label>
                <input class="input" id="st-sign" value="${esc(s.reportSignatory)}">
              </div>
            </div>
          </div>

          <!-- TARGETS -->
          <div class="card">
            <div class="card__head"><div class="card__title">${icon("i-target")} Targets & measurement</div></div>
            <div class="card__body" style="display:flex;flex-direction:column;gap:var(--sp-4)">
              <div class="grid grid--2" style="gap:var(--sp-3)">
                <div class="field">
                  <label class="field__label" for="st-target">Reduction target %</label>
                  <input class="input" type="number" id="st-target" min="0" max="95" value="${s.targetReduction}">
                  <div class="field__hint">vs baseline monthly weight</div>
                </div>
                <div class="field">
                  <label class="field__label" for="st-base">Baseline months</label>
                  <input class="input" type="number" id="st-base" min="1" max="6" value="${s.baselineMonths}">
                  <div class="field__hint">months averaged for baseline</div>
                </div>
                <div class="field">
                  <label class="field__label" for="st-expected">Audits expected / month</label>
                  <input class="input" type="number" id="st-expected" min="1" max="60" value="${s.expectedAuditsPerMonth}">
                </div>
                <div class="field">
                  <label class="field__label" for="st-co2">kg CO₂e per kg plastic</label>
                  <input class="input" type="number" id="st-co2" min="0.1" max="10" step="0.1" value="${s.co2PerKg}">
                  <div class="field__hint">emission factor</div>
                </div>
              </div>

              <hr class="divider">

              <div class="setting-row">
                <div>
                  <div class="setting-row__label">Campus eco score</div>
                  <div class="setting-row__desc">Live composite of reduction progress, reusable share and audit cadence.</div>
                </div>
                <span class="badge badge--brand badge--dot">${store.ecoScore().score}/100</span>
              </div>
              <div class="setting-row">
                <div>
                  <div class="setting-row__label">Audit streak</div>
                  <div class="setting-row__desc">Consecutive days with at least one logged audit.</div>
                </div>
                <span class="badge badge--sky badge--dot">${store.auditStreak()} days</span>
              </div>
            </div>
          </div>

          <!-- APPEARANCE -->
          <div class="card">
            <div class="card__head"><div class="card__title">${icon("i-sun")} Appearance</div></div>
            <div class="card__body">
              <div class="theme-cards" id="st-theme">
                <button class="theme-card ${s.theme === "dark" ? "is-on" : ""}" data-theme-val="dark">
                  <div class="theme-card__prev">
                    <span style="background:#080d16"></span>
                    <span style="background:#0d1522"></span>
                    <span style="background:#10b981"></span>
                  </div>
                  <div class="theme-card__name">Eco glass</div>
                </button>
                <button class="theme-card ${s.theme === "light" ? "is-on" : ""}" data-theme-val="light">
                  <div class="theme-card__prev">
                    <span style="background:#f8faf9"></span>
                    <span style="background:#ffffff"></span>
                    <span style="background:#059669"></span>
                  </div>
                  <div class="theme-card__name">Light airy</div>
                </button>
              </div>
              <div class="field__hint mt-4">Theme is stored locally and applied instantly across the app.</div>

              <hr class="divider" style="margin-top:var(--sp-5)">

              <div class="setting-row">
                <div>
                  <div class="setting-row__label">Animations & motion</div>
                  <div class="setting-row__desc">Respects your system “reduce motion” preference automatically.</div>
                </div>
                <span class="badge badge--brand badge--dot">Enabled</span>
              </div>
            </div>
          </div>

          <!-- DATA -->
          <div class="card">
            <div class="card__head">
              <div class="card__title">${icon("i-database")} Data management</div>
              <span class="badge badge--sky">${fmtBytes(bytes)}</span>
            </div>
            <div class="card__body" style="display:flex;flex-direction:column;gap:var(--sp-3)">
              <div class="setting-row">
                <div>
                  <div class="setting-row__label">Export backup</div>
                  <div class="setting-row__desc">Download every audit, zone and setting as JSON.</div>
                </div>
                <button class="btn btn--secondary btn--sm" id="st-export">${icon("i-download")} Export</button>
              </div>
              <div class="setting-row">
                <div>
                  <div class="setting-row__label">Import backup</div>
                  <div class="setting-row__desc">Restore from a previously exported JSON file.</div>
                </div>
                <button class="btn btn--secondary btn--sm" id="st-import">${icon("i-upload")} Import</button>
                <input type="file" id="st-file" accept="application/json,.json" hidden>
              </div>
              <div class="setting-row">
                <div>
                  <div class="setting-row__label">Reload demo dataset</div>
                  <div class="setting-row__desc">Replaces all records with the original ${audits.length}-audit showcase dataset.</div>
                </div>
                <button class="btn btn--secondary btn--sm" id="st-reseed">${icon("i-refresh")} Reload</button>
              </div>
              <div class="setting-row">
                <div>
                  <div class="setting-row__label">Export all data as CSV</div>
                  <div class="setting-row__desc">Line-item level dump for spreadsheets.</div>
                </div>
                <button class="btn btn--secondary btn--sm" id="st-csv">${icon("i-file")} CSV</button>
              </div>

              <hr class="divider">

              <div class="setting-row">
                <div>
                  <div class="setting-row__label coral">Clear all audits</div>
                  <div class="setting-row__desc">Deletes every audit record. Zones, catalog and settings are kept.</div>
                </div>
                <button class="btn btn--danger btn--sm" id="st-wipe">${icon("i-trash")} Clear</button>
              </div>
            </div>
          </div>

          <!-- ABOUT -->
          <div class="card" style="grid-column:1/-1">
            <div class="card__head"><div class="card__title">${icon("i-info")} About this platform</div></div>
            <div class="card__body">
              <div class="grid grid--3" style="gap:var(--sp-5)">
                <div>
                  <div class="field__label mb-2">Project</div>
                  <div style="font-size:var(--fs-sm);line-height:1.7" class="muted">
                    <b class="brand">PlasticFree Campus</b> — Smart Campus Plastic Usage Audit & Reduction Platform.<br>
                    Built for <b class="brand">iGEN Green Day 2026</b>, Section C, Project 9.<br>
                    All audit records are <b class="brand">fictional sample data</b> generated for demonstration.
                  </div>
                </div>
                <div>
                  <div class="field__label mb-2">Technology</div>
                  <div style="font-size:var(--fs-sm);line-height:1.7" class="muted">
                    Hand-crafted HTML, CSS and vanilla JavaScript —
                    <b class="brand">zero dependencies</b>, no build step, no CDNs.
                    Every chart is hand-rolled SVG.
                  </div>
                </div>
                <div>
                  <div class="field__label mb-2">Privacy & offline</div>
                  <div style="font-size:var(--fs-sm);line-height:1.7" class="muted">
                    All data lives in your browser's LocalStorage.
                    Nothing is transmitted anywhere — the platform is fully
                    <b class="brand">functional offline</b>.
                  </div>
                </div>
              </div>

              <div class="totals mt-6">
                <div class="totals__cell"><div class="totals__val">${audits.length}</div><div class="totals__lbl">Audits stored</div></div>
                <div class="totals__cell"><div class="totals__val">${store.zones.length}</div><div class="totals__lbl">Campus zones</div></div>
                <div class="totals__cell"><div class="totals__val">${store.catalog.length}</div><div class="totals__lbl">Catalog items</div></div>
                <div class="totals__cell"><div class="totals__val">${fmtBytes(bytes)}</div><div class="totals__lbl">Storage used</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    /* ---------- profile fields ---------- */
    const bindText = (id, key) => {
      const node = $(id, root);
      if (!node) return;
      node.addEventListener("change", () => {
        store.updateSettings({ [key]: node.value.trim() || s[key] });
        ui.toast({ title: "Saved", desc: "Campus profile updated", duration: 2000 });
        window.PFC.app.refreshChrome();
      });
    };
    bindText("#st-name", "campusName");
    bindText("#st-program", "programLine");
    bindText("#st-auditor", "defaultAuditor");
    bindText("#st-author", "reportAuthor");
    bindText("#st-sign", "reportSignatory");

    const bindNum = (id, key) => {
      const node = $(id, root);
      if (!node) return;
      node.addEventListener("change", () => {
        const v = Number(node.value);
        if (Number.isNaN(v)) { node.value = s[key]; return; }
        store.updateSettings({ [key]: v });
        ui.toast({ title: "Target updated", desc: "Insights recalculated", duration: 2200 });
        window.PFC.app.refreshChrome();
      });
    };
    bindNum("#st-target", "targetReduction");
    bindNum("#st-base", "baselineMonths");
    bindNum("#st-expected", "expectedAuditsPerMonth");
    bindNum("#st-co2", "co2PerKg");

    /* ---------- theme ---------- */
    $$("#st-theme .theme-card", root).forEach((b) => b.addEventListener("click", () => {
      window.PFC.app.setTheme(b.dataset.themeVal);
      $$("#st-theme .theme-card", root).forEach((x) => x.classList.toggle("is-on", x === b));
      ui.toast({ title: "Theme applied", desc: b.dataset.themeVal === "dark" ? "Eco glass" : "Light airy", duration: 2000 });
    }));

    /* ---------- data actions ---------- */
    $("#st-export", root).addEventListener("click", () => {
      ui.download(`plasticfree-backup-${new Date().toISOString().slice(0, 10)}.json`,
        store.exportJSON(), "application/json");
      ui.toast({ title: "Backup exported" });
    });

    const fileInput = $("#st-file", root);
    $("#st-import", root).addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const ok = await ui.confirm({
          title: "Import this backup?",
          message: `The file contains <b>${(parsed.audits || []).length}</b> audits and will replace all current records.`,
          confirmText: "Import"
        });
        if (!ok) return;
        store.importJSON(text);
        ui.toast({ title: "Backup restored", desc: (parsed.audits || []).length + " audits imported" });
        window.PFC.app.refreshChrome();
        render(root);
      } catch (e) {
        ui.toast({ type: "error", title: "Import failed", desc: "That file isn't a valid PlasticFree backup." });
      }
      fileInput.value = "";
    });

    $("#st-reseed", root).addEventListener("click", async () => {
      const ok = await ui.confirm({
        title: "Reload the demo dataset?",
        message: "All current records are replaced with the original showcase dataset (66+ audits, 9 zones, 24 catalog items).",
        confirmText: "Reload demo data"
      });
      if (!ok) return;
      store.resetToSeed();
      ui.toast({ title: "Demo data reloaded" });
      window.PFC.app.refreshChrome();
      render(root);
    });

    $("#st-csv", root).addEventListener("click", () => {
      if (!store.audits.length) { ui.toast({ type: "warn", title: "No audits to export" }); return; }
      window.PFC.views.audits.exportCSV(store.audits);
    });

    $("#st-wipe", root).addEventListener("click", async () => {
      const ok = await ui.confirm({
        title: "Clear every audit?",
        message: "This permanently removes <b>all audit records</b> from this browser. Zones, catalog and settings are preserved.",
        detail: `Records to delete: <b>${store.audits.length}</b>`,
        confirmText: "Delete everything",
        danger: true
      });
      if (!ok) return;
      store.wipe();
      ui.toast({ type: "warn", title: "All audits cleared", desc: "The dashboard is now empty — start a fresh audit." });
      window.PFC.app.refreshChrome();
      render(root);
    });
  }

  window.PFC.views = window.PFC.views || {};
  window.PFC.views.settings = { title: "Settings", crumb: "System", render };
})();
