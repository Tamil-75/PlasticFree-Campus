/* =============================================================
   PlasticFree Campus — Dashboard view
   ============================================================= */
(function () {
  "use strict";
  const ui = window.PFC.ui;
  const store = window.PFC.store;
  const charts = window.PFC.charts;
  const { $, $$, esc, icon } = ui;

  let period = "30d";
  let trendMetric = "weightKg";

  const METRICS = {
    weightKg: { label: "Weight", fmt: "kg", unit: "kg", name: "Plastic weight" },
    items: { label: "Items", fmt: "int", unit: "items", name: "Items counted" },
    cost: { label: "Spend", fmt: "money", unit: "", name: "Estimated spend" }
  };

  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }

  /* ---------------- KPI card ---------------- */
  function kpiCard(o) {
    return `
      <div class="kpi" style="--kpi-accent:${o.accent};--kpi-soft:${o.soft}">
        <div class="kpi__top">
          <div class="kpi__icon">${icon(o.icon)}</div>
          ${o.deltaHtml || ""}
        </div>
        <div class="kpi__label">${esc(o.label)}</div>
        <div class="kpi__value">
          <span data-countup="${o.value}" data-dec="${o.decimals || 0}" data-prefix="${o.prefix || ""}" data-suffix="${o.suffix || ""}" data-format="${o.format || "int"}">0</span>
          ${o.unit ? `<span class="kpi__unit">${esc(o.unit)}</span>` : ""}
        </div>
        <div class="kpi__foot">
          <span class="faint" style="font-size:var(--fs-xs)">${esc(o.foot || "")}</span>
          <span class="kpi__spark" data-spark="${o.sparkKey}"></span>
        </div>
      </div>`;
  }

  /* ---------------- Trend card body ---------------- */
  function renderTrend(root) {
    const box = $("#trend-body", root);
    if (!box) return;
    const series = store.monthSeries(trendMetric, 6);
    charts.area(box, {
      labels: series.map((s) => s.label),
      series: [{ name: METRICS[trendMetric].name, values: series.map((s) => s.value) }],
      fmt: METRICS[trendMetric].fmt,
      unit: METRICS[trendMetric].unit,
      height: 262,
      aria: METRICS[trendMetric].name + " by month"
    });
  }

  /* ---------------- Main render ---------------- */
  function render(root) {
    const s = store.state;
    const audits = store.filterByPeriod(period);
    const m = store.metrics(audits);
    const cmp = store.periodComparison(period);
    const eco = store.ecoScore();
    const base = store.baselineVsRecent();
    const months = store.monthSeries("weightKg", 6);

    const dItems = store.pctDelta(cmp.current.items, cmp.previous.items);
    const dWeight = store.pctDelta(cmp.current.weightKg, cmp.previous.weightKg);
    const dCost = store.pctDelta(cmp.current.cost, cmp.previous.cost);
    const dCo2 = store.pctDelta(cmp.current.co2, cmp.previous.co2);

    const reductionPct = base ? Math.round(base.reduction * 100) : 0;
    const target = s.settings.targetReduction;
    const goalProgress = Math.max(0, Math.min(100, target > 0 ? (reductionPct / target) * 100 : 0));

    const recent = store.audits.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
    const zones = store.byZone(audits).filter((z) => z.audits > 0);
    const cats = store.byCategory(audits);

    root.innerHTML = `
      <div class="view-enter">
        <!-- HERO -->
        <section class="hero no-print">
          <div style="position:relative;z-index:1">
            <div class="hero__kicker">${icon("i-sparkle")} ${esc(s.settings.campusName)}</div>
            <h2 class="hero__title">${greeting()}, <em>Sustainability Cell</em></h2>
            <p class="hero__sub">
              ${base
                ? `Campus plastic is <b class="brand">${Math.abs(reductionPct)}% ${reductionPct >= 0 ? "below" : "above"}</b> your baseline.
                   You're <b class="brand">${Math.max(0, Math.round(goalProgress))}%</b> of the way to a ${target}% reduction target.`
                : `Log your first audit to unlock trends, insights and automated reports.`}
            </p>
          </div>
          <div class="hero__actions">
            <button class="btn btn--secondary" data-go="reports">${icon("i-file")} View report</button>
            <button class="btn btn--primary" data-new-audit>${icon("i-plus")} New audit</button>
          </div>
        </section>

        <!-- PERIOD -->
        <div class="toolbar no-print" style="margin-top:-6px">
          <div class="seg" id="dash-period">
            ${Object.keys(store.PERIODS).map((p) => `
              <button class="seg__btn ${p === period ? "is-on" : ""}" data-p="${p}">${esc(store.PERIODS[p].label)}</button>`).join("")}
          </div>
          <div class="toolbar__spacer"></div>
          <span class="faint" style="font-size:var(--fs-xs)">
            ${m.completed} completed audit${m.completed === 1 ? "" : "s"}${m.drafts ? ` · ${m.drafts} draft` : ""} in range
          </span>
        </div>

        <!-- KPIs -->
        <section class="grid grid--kpi stagger">
          ${kpiCard({
            label: "Plastic items", value: m.items, icon: "i-package",
            accent: "var(--chart-1)", soft: "var(--brand-soft)",
            deltaHtml: ui.delta(dItems, { good: "down" }),
            foot: "vs " + store.PERIODS[period].label.toLowerCase(),
            sparkKey: "items", format: "int"
          })}
          ${kpiCard({
            label: "Total weight", value: m.weightKg, unit: "kg", icon: "i-scale",
            accent: "var(--chart-3)", soft: "var(--sky-soft)",
            deltaHtml: ui.delta(dWeight, { good: "down" }),
            foot: "audited plastic mass",
            sparkKey: "weightKg", format: "kg", decimals: 1
          })}
          ${kpiCard({
            label: "Estimated spend", value: m.cost, prefix: "₹", icon: "i-tag",
            accent: "var(--chart-2)", soft: "var(--amber-soft)",
            deltaHtml: ui.delta(dCost, { good: "down" }),
            foot: "procurement cost",
            sparkKey: "cost", format: "int"
          })}
          ${kpiCard({
            label: "CO₂e footprint", value: m.co2, unit: "kg", icon: "i-cloud",
            accent: "var(--chart-4)", soft: "var(--violet-soft)",
            deltaHtml: ui.delta(dCo2, { good: "down" }),
            foot: "≈ " + ui.n0(m.co2 / 0.21) + " km driven",
            sparkKey: "co2", format: "kg", decimals: 1
          })}
        </section>

        <!-- MAIN GRID -->
        <section class="grid grid--sidebar-right">
          <div class="grid" style="gap:var(--sp-4)">
            <!-- Trend -->
            <div class="card">
              <div class="card__head">
                <div>
                  <div class="card__title">${icon("i-trend-up")} Usage trend</div>
                  <div class="card__sub">Monthly totals across all audited zones</div>
                </div>
                <div class="seg no-print" id="trend-metric">
                  ${Object.keys(METRICS).map((k) => `
                    <button class="seg__btn ${k === trendMetric ? "is-on" : ""}" data-m="${k}">${METRICS[k].label}</button>`).join("")}
                </div>
              </div>
              <div class="card__body"><div id="trend-body"></div></div>
            </div>

            <!-- Zone leaderboard -->
            <div class="card">
              <div class="card__head">
                <div>
                  <div class="card__title">${icon("i-pin")} Zone leaderboard</div>
                  <div class="card__sub">Highest plastic weight in selected period</div>
                </div>
                <button class="btn btn--ghost btn--sm no-print" data-go="analytics">Deep analytics ${icon("i-chev-right")}</button>
              </div>
              <div class="card__body">
                <div id="zone-board">${zones.length ? "" : ui.emptyState("i-pin", "No zone data", "Run an audit to populate the leaderboard.")}</div>
              </div>
            </div>
          </div>

          <div class="grid" style="gap:var(--sp-4)">
            <!-- Reduction goal -->
            <div class="card card--pad">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="card__title">${icon("i-target")} Reduction goal</div>
                  <div class="card__sub">vs ${s.settings.baselineMonths}-month baseline average</div>
                </div>
                <span class="badge ${goalProgress >= 100 ? "badge--brand" : "badge--amber"} badge--dot">
                  ${goalProgress >= 100 ? "Target met" : "In progress"}
                </span>
              </div>
              <div class="flex items-center gap-4 mt-4" style="justify-content:center">
                ${charts.ring(goalProgress, { size: 128, stroke: 12, display: Math.round(goalProgress) + "%", caption: "of target", color: goalProgress >= 100 ? "var(--chart-1)" : "var(--chart-2)" })}
                <div style="flex:1;min-width:0">
                  <div style="font-size:var(--fs-sm)" class="muted">Current reduction</div>
                  <div style="font-size:var(--fs-xl);font-weight:700;letter-spacing:-.04em" class="brand">
                    ${reductionPct >= 0 ? "−" : "+"}${Math.abs(reductionPct)}%
                  </div>
                  <div class="muted" style="font-size:var(--fs-xs);margin-top:2px">
                    Target <b class="mono">${target}%</b> · baseline ${ui.kg(base ? base.baseline : 0)} kg/mo
                  </div>
                  <div class="progress mt-2">
                    <div class="progress__fill ${goalProgress >= 100 ? "" : "progress__fill--amber"}" data-w="${goalProgress}" style="width:0%"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Category donut -->
            <div class="card">
              <div class="card__head">
                <div>
                  <div class="card__title">${icon("i-chart")} Category mix</div>
                  <div class="card__sub">Share of audited weight</div>
                </div>
              </div>
              <div class="card__body">
                <div id="cat-donut"></div>
                <div class="chart-legend" id="cat-legend"></div>
              </div>
            </div>

            <!-- Recent activity -->
            <div class="card">
              <div class="card__head">
                <div>
                  <div class="card__title">${icon("i-clock")} Recent audits</div>
                  <div class="card__sub">Latest field submissions</div>
                </div>
                <button class="btn btn--ghost btn--sm no-print" data-go="audits">All ${icon("i-chev-right")}</button>
              </div>
              <div class="card__body" style="padding-top:6px;padding-bottom:6px">
                <div class="feed" id="recent-feed"></div>
              </div>
            </div>
          </div>
        </section>
      </div>`;

    /* ---------- wire ---------- */
    $$("[data-go]", root).forEach((b) => b.addEventListener("click", () => {
      location.hash = "#/" + b.dataset.go;
    }));
    $$("[data-new-audit]", root).forEach((b) => b.addEventListener("click", () => {
      window.PFC.views.audits.openWizard({ onDone: () => render(root) });
    }));

    $$("#dash-period .seg__btn", root).forEach((b) => b.addEventListener("click", () => {
      period = b.dataset.p;
      render(root);
    }));

    $$("#trend-metric .seg__btn", root).forEach((b) => b.addEventListener("click", () => {
      trendMetric = b.dataset.m;
      $$("#trend-metric .seg__btn", root).forEach((x) => x.classList.toggle("is-on", x === b));
      renderTrend(root);
    }));

    /* ---------- data-driven widgets ---------- */
    // count-ups
    $$("[data-countup]", root).forEach((node) => {
      const to = Number(node.dataset.countup) || 0;
      const fmtName = node.dataset.format;
      const dec = Number(node.dataset.dec) || 0;
      const opts = {
        decimals: dec,
        prefix: node.dataset.prefix || "",
        suffix: node.dataset.suffix || "",
        format: fmtName === "kg" ? (v) => ui.n1(v) : fmtName === "money" ? (v) => Math.round(v).toLocaleString("en-IN") : (v) => Math.round(v).toLocaleString("en-IN")
      };
      ui.countUp(node, to, opts);
    });

    // sparklines
    $$("[data-spark]", root).forEach((node) => {
      const key = node.dataset.spark;
      const data = store.monthSeries(key, 6).map((x) => x.value);
      const cols = { items: "var(--chart-1)", weightKg: "var(--chart-3)", cost: "var(--chart-2)", co2: "var(--chart-4)" };
      charts.spark(node, data, { color: cols[key], width: 96, height: 32 });
    });

    // trend
    renderTrend(root);

    // zone board
    const board = $("#zone-board", root);
    if (board && zones.length) {
      charts.hbars(board, zones.slice(0, 6).map((z) => ({
        name: z.zone.name,
        icon: z.zone.icon,
        value: z.weightKg,
        label: ui.kg(z.weightKg) + " kg",
        sub: ui.n0(z.items) + " items · " + z.audits + " audits"
      })));
    }

    // donut
    const donutEl = $("#cat-donut", root);
    if (donutEl && cats.length) {
      charts.donut(donutEl, {
        data: cats.map((c, i) => ({ label: c.cat, value: c.kg, color: charts.color(i) })),
        centerValue: ui.kg(m.weightKg),
        centerLabel: "kg total",
        fmt: "kg",
        size: 190,
        thickness: 24
      });
      const legend = $("#cat-legend", root);
      if (legend) {
        legend.innerHTML = cats.slice(0, 6).map((c, i) => `
          <span class="chart-legend__item">
            <span class="chart-legend__swatch" style="background:${charts.color(i)}"></span>
            ${esc(c.cat)} · <b class="mono">${((c.kg / (m.weightKg || 1)) * 100).toFixed(0)}%</b>
          </span>`).join("");
      }
    }

    // recent feed
    const feed = $("#recent-feed", root);
    if (feed) {
      feed.innerHTML = recent.length ? recent.map((a, i) => {
        const z = store.getZone(a.zoneId);
        const am = store.metrics([a]);
        return `
          <div class="feed__item row-enter" style="animation-delay:${i * 55}ms">
            <div class="iconbubble ${i % 3 === 1 ? "iconbubble--sky" : i % 3 === 2 ? "iconbubble--violet" : ""}">${icon(z.icon)}</div>
            <div style="flex:1;min-width:0">
              <div class="flex items-center gap-2">
                <strong style="font-size:var(--fs-sm)" class="truncate">${esc(z.name)}</strong>
                <span class="badge ${a.status === "draft" ? "badge--amber" : "badge--brand"}">${a.status === "draft" ? "Draft" : "Done"}</span>
              </div>
              <div class="faint" style="font-size:var(--fs-xs)">
                ${esc(a.auditor)} · ${ui.n0(am.items)} items · ${ui.kg(am.weightKg)} kg
              </div>
            </div>
            <div class="feed__time">${ui.dateTiny(a.date)}</div>
          </div>`;
      }).join("") : ui.emptyState("i-clipboard", "No audits yet", "Create your first audit to see activity here.",
        `<button class="btn btn--primary mt-2" data-new-audit>${icon("i-plus")} New audit</button>`);

      $$("[data-new-audit]", feed).forEach((b) => b.addEventListener("click", () => {
        window.PFC.views.audits.openWizard({ onDone: () => render(root) });
      }));
    }

    // progress bars / rings
    requestAnimationFrame(() => {
      $$(".progress__fill[data-w]", root).forEach((f) => {
        setTimeout(() => { f.style.width = Math.min(100, Number(f.dataset.w)) + "%"; }, 150);
      });
      charts.animateRings(root);
    });
  }

  window.PFC.views = window.PFC.views || {};
  window.PFC.views.dashboard = {
    title: "Dashboard",
    crumb: "Workspace",
    render
  };
})();
