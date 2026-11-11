/* =============================================================
   PlasticFree Campus — Reports view
   scoped builder · live preview · print/PDF · CSV · backup
   ============================================================= */
(function () {
  "use strict";
  const ui = window.PFC.ui;
  const store = window.PFC.store;
  const charts = window.PFC.charts;
  const { $, $$, esc, icon } = ui;

  const state = {
    period: "6m",
    zones: [],                       // [] = all zones
    title: "Campus Plastic Usage & Reduction Report",
    sections: { summary: true, trend: true, zones: true, cats: true, offenders: true, recs: true, sign: true }
  };

  const SECTION_META = [
    ["summary", "Executive summary", "Headline KPIs and deltas"],
    ["trend", "Monthly trend", "Weight by month chart"],
    ["zones", "Zone ranking", "Which zones emit most"],
    ["cats", "Category breakdown", "Weight & spend by category"],
    ["offenders", "Top offenders", "Heaviest individual items"],
    ["recs", "Recommendations", "Top 3 generated insights"],
    ["sign", "Sign-off block", "Officer signature lines"]
  ];

  function scopedAudits() {
    let rows = store.filterByPeriod(state.period);
    if (state.zones.length) rows = rows.filter((a) => state.zones.includes(a.zoneId));
    return rows;
  }

  /* =============================================================
     PREVIEW
     ============================================================= */
  function renderPreview(root) {
    const wrap = $("#rp-wrap", root);
    const rows = scopedAudits();
    const m = store.metrics(rows);
    const cmp = store.periodComparison(state.period === "all" ? "90d" : state.period);
    const s = store.getSettings();
    const months = store.byMonth(rows);
    const zones = store.byZone(rows).filter((z) => z.audits > 0);
    const cats = store.byCategory(rows);
    const top = store.topItems(rows, 6);
    const now = new Date();
    const generated = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const rangeLabel = rows.length
      ? ui.dateShort(rows.map((a) => a.date).sort()[0]) + " – " + ui.dateShort(rows.map((a) => a.date).sort().slice(-1)[0])
      : "No records";

    const dWeight = store.pctDelta(cmp.current.weightKg, cmp.previous.weightKg);
    const dItems = store.pctDelta(cmp.current.items, cmp.previous.items);
    const maxZone = Math.max(...zones.map((z) => z.weightKg), 0.001);
    const maxCat = Math.max(...cats.map((c) => c.kg), 0.001);
    const scopeLabel = state.zones.length
      ? state.zones.map((id) => store.getZone(id).name).join(", ")
      : "All campus zones";

    const recs = (window.PFC.views.insights.buildInsights() || []).slice(0, 3);

    wrap.innerHTML = `
      <div class="report-preview">
        <div class="rp">
          <!-- masthead -->
          <div class="rp__mast">
            <div class="rp__brand">
              <div class="rp__logo">${icon("i-leaf")}</div>
              <div>
                <div class="rp__h1">${esc(state.title)}</div>
                <div class="rp__h2">${esc(s.campusName)} · ${esc(s.programLine)}</div>
              </div>
            </div>
            <div class="rp__meta">
              <div>Generated <b>${esc(generated)}</b></div>
              <div>Period <b>${esc(store.PERIODS[state.period].label)}</b></div>
              <div>Scope <b>${esc(scopeLabel)}</b></div>
              <div>Prepared by <b>${esc(s.reportAuthor)}</b></div>
            </div>
          </div>

          ${!rows.length ? `
            <div class="rp__section">
              <div class="rp__notes">No audits fall inside the selected scope. Widen the period or re-include zones to build this report.</div>
            </div>` : `

          <!-- summary -->
          ${state.sections.summary ? `
          <div class="rp__section">
            <div class="rp__stitle">Executive summary</div>
            <div class="rp__kpis">
              <div class="rp__kpi"><div class="rp__kpi-l">Audits</div><div class="rp__kpi-v">${m.audits}</div></div>
              <div class="rp__kpi"><div class="rp__kpi-l">Plastic items</div><div class="rp__kpi-v">${ui.n0(m.items)}</div></div>
              <div class="rp__kpi"><div class="rp__kpi-l">Total weight</div><div class="rp__kpi-v">${ui.kg(m.weightKg)} <span>kg</span></div></div>
              <div class="rp__kpi"><div class="rp__kpi-l">Est. spend</div><div class="rp__kpi-v">${ui.rupees(m.cost, { compact: true })}</div></div>
              <div class="rp__kpi"><div class="rp__kpi-l">CO₂e</div><div class="rp__kpi-v">${ui.kg(m.co2)} <span>kg</span></div></div>
              <div class="rp__kpi"><div class="rp__kpi-l">Single-use</div><div class="rp__kpi-v">${(m.singleShare * 100).toFixed(0)} <span>%</span></div></div>
            </div>
            <div class="rp__notes" style="margin-top:12px">
              Across <b>${m.completed}</b> completed audits (${rangeLabel}), the campus recorded
              <b>${ui.n0(m.items)}</b> plastic items weighing <b>${ui.kg(m.weightKg)} kg</b>, worth an estimated
              <b>${ui.rupees(m.cost)}</b> in procurement and <b>${ui.kg(m.co2)} kg</b> of CO₂e.
              Compared with the previous equivalent period, total plastic weight moved
              <b>${ui.signed(dWeight)}</b> and item count <b>${ui.signed(dItems)}</b>.
              ${m.singleShare > 0.85 ? `<b>${(m.singleShare * 100).toFixed(0)}% of measured weight is single-use</b> — the primary target for substitution.` : ""}
            </div>
          </div>` : ""}

          <!-- trend -->
          ${state.sections.trend && months.length > 1 ? `
          <div class="rp__section">
            <div class="rp__stitle">Monthly trend</div>
            <div id="rp-trend" class="chartbox"></div>
          </div>` : ""}

          <!-- zones -->
          ${state.sections.zones && zones.length ? `
          <div class="rp__section">
            <div class="rp__stitle">Zone ranking</div>
            <div class="rp__bars">
              ${zones.slice(0, 8).map((z) => `
                <div class="rp__bar-row">
                  <div class="rp__bar-name truncate">${esc(z.zone.name)}</div>
                  <div class="rp__bar-track"><div class="rp__bar-fill" style="width:${((z.weightKg / maxZone) * 100).toFixed(1)}%"></div></div>
                  <div class="rp__bar-val">${ui.kg(z.weightKg)} kg</div>
                </div>`).join("")}
            </div>
          </div>` : ""}

          <!-- categories -->
          ${state.sections.cats && cats.length ? `
          <div class="rp__section">
            <div class="rp__stitle">Category breakdown</div>
            <table>
              <thead>
                <tr><th>Category</th><th class="ta-r">Items</th><th class="ta-r">Weight (kg)</th><th class="ta-r">Share</th><th class="ta-r">Spend</th></tr>
              </thead>
              <tbody>
                ${cats.map((c) => `
                  <tr>
                    <td><strong>${esc(c.cat)}</strong></td>
                    <td class="ta-r">${ui.n0(c.qty)}</td>
                    <td class="ta-r">${ui.n2(c.kg)}</td>
                    <td class="ta-r">${((c.kg / (m.weightKg || 1)) * 100).toFixed(1)}%</td>
                    <td class="ta-r">${ui.rupees(c.cost)}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>` : ""}

          <!-- offenders -->
          ${state.sections.offenders && top.length ? `
          <div class="rp__section">
            <div class="rp__stitle">Top offenders</div>
            <table>
              <thead>
                <tr><th>#</th><th>Item</th><th>Category</th><th class="ta-r">Quantity</th><th class="ta-r">Weight (kg)</th><th class="ta-r">Spend</th></tr>
              </thead>
              <tbody>
                ${top.map((t, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td><strong>${esc(t.item.name)}</strong></td>
                    <td>${esc(t.item.cat)}</td>
                    <td class="ta-r">${ui.n0(t.qty)}</td>
                    <td class="ta-r">${ui.n2(t.kg)}</td>
                    <td class="ta-r">${ui.rupees(t.cost)}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>` : ""}

          <!-- recommendations -->
          ${state.sections.recs && recs.length ? `
          <div class="rp__section">
            <div class="rp__stitle">Recommendations</div>
            <ol style="padding-left:18px;font-size:var(--fs-xs);color:var(--text-2);line-height:1.75;display:flex;flex-direction:column;gap:7px">
              ${recs.map((r) => `
                <li><strong style="color:var(--text-1)">${esc(r.title)}.</strong> ${r.text.replace(/<[^>]+>/g, "")}</li>`).join("")}
            </ol>
          </div>` : ""}
        `}

          <!-- sign-off -->
          ${state.sections.sign ? `
          <div class="rp__section">
            <div class="rp__stitle">Prepared & verified</div>
            <div class="rp__sign">
              <div class="rp__signbox">
                <div class="rp__signline"></div>
                <div class="rp__signcap">${esc(s.reportAuthor)} — Data & Analysis</div>
              </div>
              <div class="rp__signbox">
                <div class="rp__signline"></div>
                <div class="rp__signcap">${esc(s.reportSignatory)}</div>
              </div>
            </div>
          </div>` : ""}

          <div class="rp__foot">
            <span>PlasticFree Campus · Smart Plastic Usage Audit & Reduction Platform</span>
            <span>Ref ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(rows.length).padStart(3, "0")} · Offline-generated</span>
          </div>
        </div>
      </div>`;

    // trend chart inside preview
    const trendBox = $("#rp-trend", wrap);
    if (trendBox && months.length > 1) {
      charts.area(trendBox, {
        labels: months.map((mo) => mo.label),
        series: [{ name: "Plastic weight", values: months.map((mo) => mo.weightKg) }],
        fmt: "kg",
        unit: "kg",
        height: 210,
        width: 720,
        yTicks: 3,
        aria: "Monthly plastic weight trend"
      });
    }

    const badge = $("#rp-badge", root);
    if (badge) badge.textContent = `${m.audits} audits · ${ui.n0(m.items)} items · ${ui.kg(m.weightKg)} kg`;
  }

  /* =============================================================
     VIEW
     ============================================================= */
  function render(root) {
    root.innerHTML = `
      <div class="view-enter">
        <div class="pagehead no-print">
          <div>
            <h2 class="pagehead__title">Report studio</h2>
            <p class="pagehead__sub">Compose a board-ready report, then print to PDF or export the raw data.</p>
          </div>
          <div class="pagehead__actions">
            <span class="faint" id="rp-badge" style="font-size:var(--fs-xs);align-self:center"></span>
            <button class="btn btn--secondary" id="r-csv">${icon("i-download")} CSV</button>
            <button class="btn btn--secondary" id="r-json">${icon("i-database")} Backup</button>
            <button class="btn btn--primary" id="r-print">${icon("i-printer")} Print / PDF</button>
          </div>
        </div>

        <div class="report-layout">
          <!-- CONTROLS -->
          <div class="card no-print" style="position:sticky;top:calc(var(--topbar-h) + 16px)">
            <div class="card__head">
              <div class="card__title">${icon("i-filter")} Report settings</div>
            </div>
            <div class="card__body" style="display:flex;flex-direction:column;gap:var(--sp-5)">

              <div class="field">
                <label class="field__label" for="r-title">Report title</label>
                <input class="input" id="r-title" value="${esc(state.title)}">
              </div>

              <div class="field">
                <label class="field__label">Reporting period</label>
                <div class="seg" id="r-period" style="display:flex;flex-wrap:wrap">
                  ${Object.keys(store.PERIODS).map((p) => `
                    <button class="seg__btn ${p === state.period ? "is-on" : ""}" data-p="${p}">${esc(store.PERIODS[p].label)}</button>`).join("")}
                </div>
              </div>

              <div class="field">
                <label class="field__label">Zones in scope</label>
                <div class="flex gap-2" style="flex-wrap:wrap" id="r-zones">
                  <button class="chip ${state.zones.length === 0 ? "is-on" : ""}" data-z="all">${icon("i-check")} All zones</button>
                  ${store.zones.map((z) => `
                    <button class="chip ${state.zones.includes(z.id) ? "is-on" : ""}" data-z="${z.id}">${esc(z.name)}</button>`).join("")}
                </div>
              </div>

              <div class="field">
                <label class="field__label">Sections</label>
                <div style="display:flex;flex-direction:column;gap:11px" id="r-sections">
                  ${SECTION_META.map(([key, label, desc]) => `
                    <label class="check" style="align-items:flex-start">
                      <input type="checkbox" data-sec="${key}" ${state.sections[key] ? "checked" : ""}>
                      <span class="check__box" style="margin-top:2px">${icon("i-check")}</span>
                      <span>
                        <span style="display:block;color:var(--text-1);font-weight:var(--fw-semibold);font-size:var(--fs-sm)">${esc(label)}</span>
                        <span class="faint" style="font-size:var(--fs-xs)">${esc(desc)}</span>
                      </span>
                    </label>`).join("")}
                </div>
              </div>

              <hr class="divider">

              <div class="field">
                <label class="field__label">Quick actions</label>
                <div class="flex gap-2" style="flex-wrap:wrap">
                  <button class="btn btn--secondary btn--sm" id="r-copy">${icon("i-copy")} Copy summary</button>
                  <button class="btn btn--secondary btn--sm" id="r-full">${icon("i-file")} All-time report</button>
                </div>
                <div class="field__hint mt-2">Printing opens your browser's Print dialog — choose “Save as PDF”.</div>
              </div>
            </div>
          </div>

          <!-- PREVIEW -->
          <div id="rp-wrap"></div>
        </div>
      </div>`;

    /* ---------- wiring ---------- */
    $("#r-title", root).addEventListener("input", ui.debounce((e) => {
      state.title = e.target.value || "Campus Plastic Usage & Reduction Report";
      renderPreview(root);
    }, 250));

    $$("#r-period .seg__btn", root).forEach((b) => b.addEventListener("click", () => {
      state.period = b.dataset.p;
      $$("#r-period .seg__btn", root).forEach((x) => x.classList.toggle("is-on", x === b));
      renderPreview(root);
    }));

    $$("#r-zones .chip", root).forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.z;
      if (id === "all") state.zones = [];
      else {
        const i = state.zones.indexOf(id);
        if (i >= 0) state.zones.splice(i, 1);
        else state.zones.push(id);
      }
      $$("#r-zones .chip", root).forEach((x) => {
        const zid = x.dataset.z;
        x.classList.toggle("is-on", zid === "all" ? state.zones.length === 0 : state.zones.includes(zid));
      });
      renderPreview(root);
    }));

    $$("#r-sections input[type=checkbox]", root).forEach((cb) => cb.addEventListener("change", () => {
      state.sections[cb.dataset.sec] = cb.checked;
      renderPreview(root);
    }));

    $("#r-print", root).addEventListener("click", () => {
      ui.toast({ type: "info", title: "Preparing print view…", duration: 1600 });
      setTimeout(() => window.print(), 650);
    });

    $("#r-csv", root).addEventListener("click", () => {
      const rows = scopedAudits();
      if (!rows.length) { ui.toast({ type: "warn", title: "Nothing in scope to export" }); return; }
      window.PFC.views.audits.exportCSV(rows);
    });

    $("#r-json", root).addEventListener("click", () => {
      ui.download(`plasticfree-backup-${new Date().toISOString().slice(0, 10)}.json`,
        store.exportJSON(), "application/json");
      ui.toast({ title: "Backup downloaded", desc: "Restore it any time from Settings" });
    });

    $("#r-copy", root).addEventListener("click", async () => {
      const rows = scopedAudits();
      const m = store.metrics(rows);
      const text = [
        `PLASTICFREE CAMPUS — ${state.title}`,
        `Scope: ${state.zones.length ? state.zones.map((z) => store.getZone(z).name).join(", ") : "All campus zones"}`,
        `Period: ${store.PERIODS[state.period].label}`,
        ``,
        `• Audits: ${m.audits} (${m.completed} completed)`,
        `• Plastic items: ${ui.n0(m.items)}`,
        `• Total weight: ${ui.kg(m.weightKg)} kg`,
        `• Estimated spend: ${ui.rupees(m.cost)}`,
        `• CO₂e: ${ui.kg(m.co2)} kg`,
        `• Single-use share: ${(m.singleShare * 100).toFixed(1)}%`,
        ``,
        `Generated offline with PlasticFree Campus.`
      ].join("\n");
      const ok = await ui.copyText(text);
      ui.toast(ok ? { title: "Summary copied" } : { type: "error", title: "Copy failed" });
    });

    $("#r-full", root).addEventListener("click", () => {
      state.period = "all";
      state.zones = [];
      render(root);
      ui.toast({ type: "info", title: "Switched to all-time scope", duration: 2400 });
    });

    renderPreview(root);
  }

  window.PFC.views = window.PFC.views || {};
  window.PFC.views.reports = { title: "Reports", crumb: "Intelligence", render };
})();
