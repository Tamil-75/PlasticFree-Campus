/* =============================================================
   PlasticFree Campus — Analytics view
   period comparison · stacked composition · heatmap · offenders
   ============================================================= */
(function () {
  "use strict";
  const ui = window.PFC.ui;
  const store = window.PFC.store;
  const charts = window.PFC.charts;
  const { $, $$, esc, icon } = ui;

  let period = "6m";

  /* ---------------- color mixing for heatmap ---------------- */
  function hex2rgb(h) {
    h = h.trim().replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function heatColor(t) {
    // 0 → soft green, 0.5 → amber, 1 → coral
    const stops = [
      [0, [22, 101, 82]],
      [0.5, [217, 119, 6]],
      [1, [225, 29, 72]]
    ];
    let a = stops[0], b = stops[1];
    if (t > 0.5) { a = stops[1]; b = stops[2]; }
    const local = (t - a[0]) / (b[0] - a[0] || 1);
    const rgb = a[1].map((v, i) => Math.round(v + (b[1][i] - v) * Math.max(0, Math.min(1, local))));
    const alpha = 0.28 + t * 0.72;
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha.toFixed(2)})`;
  }

  /* ---------------- monthly × category matrix ---------------- */
  function categoryByMonth(audits, catList) {
    const monthSet = new Set(audits.map((a) => a.date.slice(0, 7)));
    const months = Array.from(monthSet).sort();
    const matrix = catList.map(() => months.map(() => 0));

    audits.forEach((a) => {
      const mi = months.indexOf(a.date.slice(0, 7));
      if (mi < 0) return;
      a.entries.forEach((e) => {
        const it = store.getItem(e.itemId);
        const ci = catList.indexOf(it.cat);
        if (ci >= 0) matrix[ci][mi] += Number(e.weightKg) || 0;
      });
    });
    return { months, matrix };
  }

  /* ============================================================= */
  function render(root) {
    const audits = store.filterByPeriod(period);
    const cmp = store.periodComparison(period === "all" ? "90d" : period);
    const m = cmp.current;
    const prev = cmp.previous;

    const months = store.byMonth(audits);
    const zones = store.byZone(audits);
    const cats = store.byCategory(audits);
    const top = store.topItems(audits, 8);
    const heat = store.heatmap(store.filterByPeriod("6m"), 6);

    // top categories for stacked chart
    const topCats = cats.slice(0, 4).map((c) => c.cat);
    const { months: mKeys, matrix } = categoryByMonth(audits, topCats);
    const stacks = topCats.map((c, i) => ({
      name: c,
      color: charts.color(i),
      values: matrix[i].map((v) => +v.toFixed(1))
    }));
    const otherVals = mKeys.map((_, mi) => {
      let total = 0;
      audits.forEach((a) => {
        if (a.date.slice(0, 7) !== mKeys[mi]) return;
        a.entries.forEach((e) => {
          const it = store.getItem(e.itemId);
          if (!topCats.includes(it.cat)) total += Number(e.weightKg) || 0;
        });
      });
      return +total.toFixed(1);
    });
    if (otherVals.some((v) => v > 0)) {
      stacks.push({ name: "Other", color: charts.color(4), values: otherVals });
    }

    const maxHeat = Math.max(1, ...heat.rows.flatMap((r) => r.cells.map((c) => c.weightKg)));

    const d = (k) => store.pctDelta(m[k], prev[k]);

    root.innerHTML = `
      <div class="view-enter">
        <div class="pagehead no-print">
          <div>
            <h2 class="pagehead__title">Analytics</h2>
            <p class="pagehead__sub">Where the plastic is, where it's falling, and where to act next.</p>
          </div>
          <div class="pagehead__actions">
            <div class="seg" id="an-period">
              ${Object.keys(store.PERIODS).map((p) => `
                <button class="seg__btn ${p === period ? "is-on" : ""}" data-p="${p}">${esc(store.PERIODS[p].label)}</button>`).join("")}
            </div>
          </div>
        </div>

        ${m.audits === 0 ? `
          <div class="card">${ui.emptyState("i-chart", "No data in this period",
            "Choose a wider range or run more audits to see analytics.",
            `<button class="btn btn--primary mt-2" id="an-new">${icon("i-plus")} New audit</button>`)}</div>
        ` : `
        <!-- COMPARE -->
        <section class="compare stagger">
          <div class="compare__col is-highlight">
            <div class="compare__label">${esc(cmp.current.label)}</div>
            <div class="compare__big">${ui.kg(m.weightKg)} <span style="font-size:var(--fs-sm);color:var(--text-3)">kg</span></div>
            <div class="compare__row"><span>Range</span><b>${esc(cmp.current.range)}</b></div>
            <div class="compare__row"><span>Audits</span><b>${m.audits}</b></div>
            <div class="compare__row"><span>Items</span><b>${ui.n0(m.items)}</b></div>
            <div class="compare__row"><span>Spend</span><b>${ui.rupees(m.cost)}</b></div>
          </div>
          <div class="compare__col">
            <div class="compare__label">${esc(cmp.previous.label)}</div>
            <div class="compare__big" style="color:var(--text-2)">${ui.kg(prev.weightKg)} <span style="font-size:var(--fs-sm);color:var(--text-3)">kg</span></div>
            <div class="compare__row"><span>Range</span><b>${esc(cmp.previous.range)}</b></div>
            <div class="compare__row"><span>Audits</span><b>${prev.audits}</b></div>
            <div class="compare__row"><span>Items</span><b>${ui.n0(prev.items)}</b></div>
            <div class="compare__row"><span>Spend</span><b>${ui.rupees(prev.cost)}</b></div>
          </div>
          <div class="compare__col">
            <div class="compare__label">Change</div>
            <div class="compare__big ${d("weightKg") <= 0 ? "brand" : "coral"}">${ui.signed(d("weightKg"))}</div>
            <div class="compare__row"><span>Weight</span><b>${ui.delta(d("weightKg"), { good: "down" })}</b></div>
            <div class="compare__row"><span>Items</span><b>${ui.delta(d("items"), { good: "down" })}</b></div>
            <div class="compare__row"><span>Spend</span><b>${ui.delta(d("cost"), { good: "down" })}</b></div>
            <div class="compare__row"><span>CO₂e</span><b>${ui.delta(d("co2"), { good: "down" })}</b></div>
          </div>
        </section>

        <!-- COMPOSITION + SINGLE-USE -->
        <section class="grid grid--2 mt-4">
          <div class="card">
            <div class="card__head">
              <div>
                <div class="card__title">${icon("i-chart")} Composition by month</div>
                <div class="card__sub">Plastic weight (kg) split by category</div>
              </div>
            </div>
            <div class="card__body">
              <div id="an-stacked"></div>
              <div class="chart-legend" id="an-stack-legend"></div>
            </div>
          </div>

          <div class="card">
            <div class="card__head">
              <div>
                <div class="card__title">${icon("i-alert")} Single-use ratio</div>
                <div class="card__sub">Share of audited weight</div>
              </div>
              <span class="badge ${m.singleShare > 0.9 ? "badge--coral" : "badge--amber"} badge--dot">
                ${(m.singleShare * 100).toFixed(0)}% single-use
              </span>
            </div>
            <div class="card__body">
              <div class="gauge-wrap">
                <div id="an-gauge" style="flex:none"></div>
                <div class="gauge-legend">
                  <div class="gauge-legend__row">
                    <span class="chart-legend__swatch" style="background:var(--chart-5)"></span>
                    Single-use plastic
                    <b>${ui.kg(m.singleWeight)} kg</b>
                  </div>
                  <div class="gauge-legend__row">
                    <span class="chart-legend__swatch" style="background:var(--chart-1)"></span>
                    Reusable / durable
                    <b>${ui.kg(m.reusableWeight)} kg</b>
                  </div>
                  <div class="gauge-legend__row">
                    <span class="chart-legend__swatch" style="background:var(--chart-3)"></span>
                    Est. spend in period
                    <b>${ui.rupees(m.cost)}</b>
                  </div>
                  <div class="gauge-legend__row">
                    <span class="chart-legend__swatch" style="background:var(--chart-4)"></span>
                    CO₂e footprint
                    <b>${ui.kg(m.co2)} kg</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- HEATMAP -->
        <section class="card mt-4">
          <div class="card__head">
            <div>
              <div class="card__title">${icon("i-pin")} Zone × month hotspot map</div>
              <div class="card__sub">Last 6 months of audited weight (kg) — darker/warmer = worse</div>
            </div>
            <div class="heat-scale no-print">
              <span>low</span><span class="heat-scale__bar"></span><span>high</span>
            </div>
          </div>
          <div class="card__body">
            <div class="heatmap">
              <div class="heatmap__grid" style="grid-template-columns:170px repeat(${heat.months.length}, minmax(56px,1fr))">
                <div class="heatmap__head"></div>
                ${heat.months.map((mo) => `<div class="heatmap__head">${esc(mo.label)}</div>`).join("")}
                ${heat.rows.map((row, ri) => `
                  <div class="heatmap__rowhead">${esc(row.zone.name)}</div>
                  ${row.cells.map((c, ci) => {
                    if (!c.weightKg) return `<div class="heatmap__cell heatmap__cell--empty" style="animation-delay:${(ri * 6 + ci) * 22}ms">·</div>`;
                    const t = c.weightKg / maxHeat;
                    return `<div class="heatmap__cell" title="${esc(row.zone.name)} · ${esc(heat.months[ci].label)}: ${c.weightKg} kg (${c.audits} audits)"
                      style="background:${heatColor(t)};animation-delay:${(ri * 6 + ci) * 22}ms">${c.weightKg}</div>`;
                  }).join("")}`).join("")}
              </div>
            </div>
          </div>
        </section>

        <!-- OFFENDERS + CATEGORIES -->
        <section class="grid grid--2 mt-4">
          <div class="card">
            <div class="card__head">
              <div>
                <div class="card__title">${icon("i-trophy")} Top plastic offenders</div>
                <div class="card__sub">Heaviest items in the selected period</div>
              </div>
            </div>
            <div class="card__body">
              <div id="an-offenders"></div>
            </div>
          </div>

          <div class="card">
            <div class="card__head">
              <div>
                <div class="card__title">${icon("i-filter")} Category breakdown</div>
                <div class="card__sub">Weight, volume and spend by category</div>
              </div>
            </div>
            <div class="card__body" style="padding-top:var(--sp-3)">
              <div class="tablewrap">
                <table class="table" style="min-width:auto">
                  <thead>
                    <tr><th>Category</th><th class="ta-r">Items</th><th class="ta-r">Weight</th><th class="ta-r">Spend</th></tr>
                  </thead>
                  <tbody>
                    ${cats.map((c, i) => `
                      <tr class="row-enter" style="animation-delay:${i * 45}ms">
                        <td>
                          <div class="flex items-center gap-2">
                            <span class="chart-legend__swatch" style="background:${charts.color(i)}"></span>
                            <strong>${esc(c.cat)}</strong>
                          </div>
                          <div class="board__bar" style="margin-top:7px;max-width:190px">
                            <div class="board__fill" data-w="${((c.kg / (m.weightKg || 1)) * 100).toFixed(1)}"
                              style="width:0%;background:${charts.color(i)}"></div>
                          </div>
                        </td>
                        <td class="ta-r mono">${ui.n0(c.qty)}</td>
                        <td class="ta-r mono"><strong>${ui.kg(c.kg)}</strong> kg</td>
                        <td class="ta-r mono">${ui.rupees(c.cost)}</td>
                      </tr>`).join("")}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
        `}
      </div>`;

    /* ---------- wiring ---------- */
    $$("#an-period .seg__btn", root).forEach((b) => b.addEventListener("click", () => {
      period = b.dataset.p;
      render(root);
    }));
    const newBtn = $("#an-new", root);
    if (newBtn) newBtn.addEventListener("click", () => window.PFC.views.audits.openWizard({ onDone: () => render(root) }));

    if (!m.audits) return;

    // stacked chart
    charts.bars($("#an-stacked", root), {
      labels: mKeys.map((k) => store.monthLabel(k)),
      stacks,
      fmt: "kg",
      height: 258,
      aria: "Plastic weight by category per month"
    });
    $("#an-stack-legend", root).innerHTML = stacks.map((s) => `
      <span class="chart-legend__item">
        <span class="chart-legend__swatch" style="background:${s.color}"></span>${esc(s.name)}
      </span>`).join("");

    // single-use donut
    charts.donut($("#an-gauge", root), {
      data: [
        { label: "Single-use", value: +m.singleWeight.toFixed(1), color: "var(--chart-5)" },
        { label: "Reusable", value: +m.reusableWeight.toFixed(1), color: "var(--chart-1)" }
      ],
      centerValue: (m.singleShare * 100).toFixed(0) + "%",
      centerLabel: "single-use",
      fmt: "kg",
      size: 190,
      thickness: 26
    });

    // offenders
    const off = $("#an-offenders", root);
    if (off && top.length) {
      const max = top[0].kg || 1;
      off.innerHTML = top.map((t, i) => {
        const sev = t.item.eco >= 8 ? "var(--chart-5)" : t.item.eco >= 6 ? "var(--chart-2)" : "var(--chart-1)";
        return `
          <div class="offender row-enter" style="animation-delay:${i * 55}ms">
            <div class="offender__pos">${i + 1}</div>
            <div class="offender__body">
              <div class="offender__name">${esc(t.item.name)}</div>
              <div class="offender__track">
                <div class="offender__fill" data-w="${((t.kg / max) * 100).toFixed(1)}" style="width:0%;background:${sev}"></div>
              </div>
            </div>
            <div class="offender__val">${ui.kg(t.kg)}<span>${ui.n0(t.qty)} pcs</span></div>
          </div>`;
      }).join("");
    } else if (off) {
      off.innerHTML = ui.emptyState("i-package", "No item data", "Add entries to your audits to rank offenders.");
    }

    requestAnimationFrame(() => {
      $$(".board__fill[data-w], .offender__fill[data-w]", root).forEach((f, i) => {
        setTimeout(() => (f.style.width = f.dataset.w + "%"), 130 + i * 45);
      });
    });
  }

  window.PFC.views = window.PFC.views || {};
  window.PFC.views.analytics = { title: "Analytics", crumb: "Workspace", render };
})();
