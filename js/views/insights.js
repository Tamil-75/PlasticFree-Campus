/* =============================================================
   PlasticFree Campus — Insights view
   Rule-based recommendation engine + goal tracking
   ============================================================= */
(function () {
  "use strict";
  const ui = window.PFC.ui;
  const store = window.PFC.store;
  const charts = window.PFC.charts;
  const { $, $$, esc, icon } = ui;

  /* ---------------- rule engine ---------------- */
  function buildInsights() {
    const s = store.getSettings();
    const recent = store.filterByPeriod("30d");
    const m = store.metrics(recent);
    const sixMonths = store.filterByPeriod("6m");
    const m6 = store.metrics(sixMonths);
    const base = store.baselineVsRecent();
    const zones = store.byZone(sixMonths).filter((z) => z.audits > 0 && z.weightKg > 0);
    const top = store.topItems(sixMonths, 12);
    const eco = store.ecoScore();
    const out = [];

    const add = (o) => out.push(o);

    /* 1 — single-use dominance */
    if (m6.weightKg > 0 && m6.singleShare > 0.8) {
      add({
        id: "single-use", tier: "high", icon: "i-alert", color: "var(--chart-5)",
        soft: "var(--coral-soft)",
        title: `Single-use plastic dominates ${Math.round(m6.singleShare * 100)}% of audited weight`,
        text: `Nearly everything counted in the last 6 months is thrown away after one use. Flipping default procurement to reusable or refillable formats is the single biggest lever this campus has.`,
        impact: [
          { value: ui.kg(m6.singleWeight) + " kg", label: "single-use / 6 mo" },
          { value: ui.rupees(m6.cost, { compact: true }), label: "spend / 6 mo" },
          { value: ui.kg(m6.co2) + " kg", label: "CO₂e / 6 mo" }
        ],
        action: { label: "See breakdown", route: "analytics" }
      });
    }

    /* 2 — zone hotspot */
    if (zones.length) {
      const hot = zones[0];
      const share = m6.weightKg > 0 ? (hot.weightKg / m6.weightKg) * 100 : 0;
      if (share >= 18) {
        add({
          id: "hotzone", tier: share >= 30 ? "high" : "medium", icon: hot.zone.icon, color: "var(--amber-500)",
          soft: "var(--amber-soft)",
          title: `${hot.zone.name} is your #1 plastic hotspot`,
          text: `${esc(hot.zone.name)} produced ${ui.kg(hot.weightKg)} kg across ${hot.audits} audits — ${share.toFixed(0)}% of all audited plastic. Station a refill point and switch service ware here first for maximum impact.`,
          impact: [
            { value: ui.kg(hot.weightKg) + " kg", label: "from this zone" },
            { value: ui.n0(hot.items), label: "items counted" },
            { value: hot.audits, label: "audits logged" }
          ],
          action: { label: "Audit this zone", zoneId: hot.zone.id }
        });
      }
    }

    /* 3 — top offender with a known alternative */
    const offenders = top.filter((t) => t.item.singleUse && t.item.alt);
    if (offenders.length >= 3) {
      const t3 = offenders.slice(0, 3);
      const kg = t3.reduce((a, b) => a + b.kg, 0);
      const rs = t3.reduce((a, b) => a + b.cost, 0);
      add({
        id: "swap", tier: "medium", icon: "i-leaf-2", color: "var(--chart-1)",
        soft: "var(--brand-soft)",
        title: `Swap the "Big 3" disposables`,
        text: `Start with ${t3.map((t) => t.item.name).join(", ")}. Together they account for ${ui.kg(kg)} kg of waste — substituting ${t3.map((t) => t.item.alt.split(" / ")[0].toLowerCase()).join(", ")} removes most of it.`,
        impact: [
          { value: "−" + ui.kg(kg) + " kg", label: "addressable waste" },
          { value: ui.rupees(rs, { compact: true }), label: "addressable spend" },
          { value: t3.length + " swaps", label: "procurement moves" }
        ],
        action: { label: "Open report", route: "reports" }
      });
    }

    /* 4 — reduction trajectory */
    if (base) {
      const redPct = Math.round(base.reduction * 100);
      const target = s.targetReduction;
      if (redPct >= target) {
        add({
          id: "target-hit", tier: "success", icon: "i-trophy", color: "var(--chart-1)",
          soft: "var(--brand-soft)",
          title: `Target hit — plastic down ${redPct}% vs baseline`,
          text: `Recent monthly usage is running ${redPct}% below the ${s.baselineMonths}-month baseline, beating your ${target}% target. Lock it in: publish the result and keep auditing to prove it's permanent.`,
          impact: [
            { value: "−" + redPct + "%", label: "vs baseline" },
            { value: ui.kg(base.reduction * base.baseline) + " kg", label: "avoided / month" },
            { value: ui.rupees(base.reduction * base.baseline * 40, { compact: true }), label: "saved / month" }
          ],
          action: { label: "Generate report", route: "reports" }
        });
      } else if (redPct < target) {
        const gap = target - redPct;
        add({
          id: "target-gap", tier: redPct < 0 ? "high" : "medium", icon: "i-target", color: "var(--amber-500)",
          soft: "var(--amber-soft)",
          title: `${gap} points short of the ${target}% reduction target`,
          text: `You're at ${redPct}% reduction against a ${target}% goal. Closing the gap needs roughly ${ui.kg((gap / 100) * base.baseline)} kg less plastic per month — about ${Math.max(1, Math.round((gap / 100) * base.baseline * 4))} fewer audits-worth of single-use items.`,
          impact: [
            { value: gap + " pts", label: "gap to close" },
            { value: ui.kg((gap / 100) * base.baseline) + " kg", label: "to cut / month" },
            { value: base.reduction >= 0 ? "−" + redPct + "%" : "+" + Math.abs(redPct) + "%", label: "current" }
          ],
          action: { label: "Track progress", route: "analytics" }
        });
      }
    }

    /* 5 — audit cadence */
    const last30 = new Set(store.audits.filter((a) => {
      const d = store.parseDate(a.date);
      const cut = new Date(); cut.setDate(cut.getDate() - 30);
      return d >= cut;
    }).map((a) => a.id));
    const expected = s.expectedAuditsPerMonth;
    if (last30.size < expected) {
      add({
        id: "cadence", tier: last30.size < expected * 0.5 ? "high" : "low", icon: "i-clock", color: "var(--sky-500)",
        soft: "var(--sky-soft)",
        title: `Audit cadence is below target — ${last30.size}/${expected} this month`,
        text: `Sparse audits weaken every chart on this dashboard. Aim for ${expected} zone audits per month so trends, hotspots and reports stay trustworthy.`,
        impact: [
          { value: last30.size + " audits", label: "last 30 days" },
          { value: (expected - last30.size > 0 ? expected - last30.size : 0) + " more", label: "to hit target" },
          { value: store.auditStreak() + "d", label: "current streak" }
        ],
        action: { label: "Run an audit", newAudit: true }
      });
    } else {
      add({
        id: "cadence-ok", tier: "success", icon: "i-clock", color: "var(--chart-3)",
        soft: "var(--sky-soft)",
        title: `Audit cadence on track — ${last30.size}/${expected} this month`,
        text: `Field data is flowing consistently, which keeps every metric on the dashboard statistically meaningful. Keep the rhythm through the end of term.`,
        impact: [
          { value: last30.size + " audits", label: "last 30 days" },
          { value: store.auditStreak() + "d", label: "current streak" },
          { value: eco.score + "/100", label: "eco score" }
        ],
        action: { label: "View audits", route: "audits" }
      });
    }

    /* 6 — category specific rules */
    const cats = store.byCategory(sixMonths);
    const catMap = Object.fromEntries(cats.map((c) => [c.cat, c]));

    if (catMap["Bags"] && catMap["Bags"].kg > m6.weightKg * 0.08) {
      add({
        id: "bags", tier: "medium", icon: "i-bag", color: "var(--violet-500)", soft: "var(--violet-soft)",
        title: "Carry-bag ban will pay for itself",
        text: `Bags represent ${ui.kg(catMap["Bags"].kg)} kg in the selected window. A cloth-bag deposit scheme at gates and canteens typically cuts this by 70–90% within two months.`,
        impact: [
          { value: ui.kg(catMap["Bags"].kg) + " kg", label: "bags audited" },
          { value: ui.rupees(catMap["Bags"].cost, { compact: true }), label: "procurement" },
          { value: "−70%+", label: "typical cut" }
        ],
        action: { label: "Open report", route: "reports" }
      });
    }

    if (catMap["Beverage"] && catMap["Beverage"].kg > m6.weightKg * 0.15) {
      add({
        id: "bottles", tier: "high", icon: "i-bottle", color: "var(--sky-500)", soft: "var(--sky-soft)",
        title: "Beverage plastics are the volume leader",
        text: `Bottles, cups and lids total ${ui.kg(catMap["Beverage"].kg)} kg. Every refill station installed removes roughly 8,000 PET bottles a year per unit — install beside hostels, the library and the sports complex.`,
        impact: [
          { value: ui.kg(catMap["Beverage"].kg) + " kg", label: "beverage plastics" },
          { value: ui.n0(catMap["Beverage"].qty), label: "items counted" },
          { value: ui.rupees(catMap["Beverage"].cost, { compact: true }), label: "spend" }
        ],
        action: { label: "Zone analysis", route: "analytics" }
      });
    }

    if (catMap["Wrappers & Film"] && catMap["Wrappers & Film"].kg > m6.weightKg * 0.1) {
      add({
        id: "wrappers", tier: "medium", icon: "i-packet", color: "var(--amber-500)", soft: "var(--amber-soft)",
        title: "Hidden waste: sachets & wrappers",
        text: `${ui.n0(catMap["Wrappers & Film"].qty)} wrapper units (${ui.kg(catMap["Wrappers & Film"].kg)}) slipped through — these are the hardest to segregate. Switch to bulk dispensers in canteens and vending areas.`,
        impact: [
          { value: ui.n0(catMap["Wrappers & Film"].qty), label: "units" },
          { value: ui.kg(catMap["Wrappers & Film"].kg) + " kg", label: "weight" },
          { value: "Bulk", label: "best alternative" }
        ],
        action: { label: "See offenders", route: "analytics" }
      });
    }

    /* 7 — eco score callout */
    if (eco.score < 50) {
      add({
        id: "eco-low", tier: "high", icon: "i-shield", color: "var(--coral-500)", soft: "var(--coral-soft)",
        title: `Campus eco score is ${eco.score}/100`,
        text: `The score blends reduction progress (${eco.progressPts}/60), reusable share (${eco.reusePts}/25) and audit cadence (${eco.cadencePts}/15). All three can be lifted this month with consistent logging and one procurement swap.`,
        impact: [
          { value: eco.progressPts + "/60", label: "reduction" },
          { value: eco.reusePts + "/25", label: "reuse share" },
          { value: eco.cadencePts + "/15", label: "cadence" }
        ],
        action: { label: "Go to dashboard", route: "dashboard" }
      });
    }

    /* 8 — positive reinforcement */
    if (base && base.reduction > 0.05) {
      add({
        id: "progress", tier: "success", icon: "i-trend-up", color: "var(--chart-1)", soft: "var(--brand-soft)",
        title: `Trend is moving the right way — down ${Math.round(base.reduction * 100)}%`,
        text: `Compared with your ${s.baselineMonths}-month baseline of ${ui.kg(base.baseline)} kg/month, current usage sits at ${ui.kg(base.recent)} kg/month. Share the win with residents to keep behaviours locked in.`,
        impact: [
          { value: "−" + ui.kg(base.baseline - base.recent) + " kg", label: "per month" },
          { value: ui.rupees((base.baseline - base.recent) * 40, { compact: true }), label: "saved / month" },
          { value: ui.kg((base.baseline - base.recent) * (store.getSettings().co2PerKg || 2.6)) + " kg", label: "CO₂e cut" }
        ],
        action: { label: "Generate report", route: "reports" }
      });
    }

    /* 9 — no-data nudge */
    if (!store.audits.length) {
      return [{
        id: "empty", tier: "medium", icon: "i-sparkle", color: "var(--chart-1)", soft: "var(--brand-soft)",
        title: "Your insight engine is warming up",
        text: "Log your first audit and this page will generate prioritised recommendations, savings estimates and goals automatically.",
        impact: [{ value: "0", label: "audits" }],
        action: { label: "Start first audit", newAudit: true }
      }];
    }

    const order = { high: 0, medium: 1, low: 2, success: 3 };
    return out.sort((a, b) => order[a.tier] - order[b.tier]);
  }

  const TIER = {
    high: { label: "High impact", cls: "badge--coral" },
    medium: { label: "Opportunity", cls: "badge--amber" },
    low: { label: "Maintenance", cls: "badge--sky" },
    success: { label: "On track", cls: "badge--brand" }
  };

  /* ---------------- goals ---------------- */
  function buildGoals() {
    const s = store.getSettings();
    const eco = store.ecoScore();
    const base = store.baselineVsRecent();
    const m = store.metrics(store.filterByPeriod("30d"));

    const last30 = new Set(store.audits.filter((a) => {
      const d = store.parseDate(a.date);
      const cut = new Date(); cut.setDate(cut.getDate() - 30);
      return d >= cut;
    }).map((a) => a.id));
    const cadence = Math.min(100, (last30.size / (s.expectedAuditsPerMonth || 12)) * 100);
    const reduction = base ? Math.max(0, (base.reduction / ((s.targetReduction || 40) / 100)) * 100) : 0;
    const reuse = Math.min(100, (m.reuseShare / 0.3) * 100);

    return [
      {
        title: "Reduction vs baseline",
        meta: `Target ${s.targetReduction}% less plastic per month`,
        value: reduction,
        display: (base ? Math.round(base.reduction * 100) : 0) + "%",
        caption: "reduction",
        color: reduction >= 100 ? "var(--chart-1)" : "var(--chart-2)",
        current: base ? ui.kg(base.recent) + " kg/mo" : "—",
        goal: base ? ui.kg(base.baseline) + " kg/mo" : "—"
      },
      {
        title: "Audit cadence",
        meta: `${last30.size} of ${s.expectedAuditsPerMonth} audits in the last 30 days`,
        value: cadence,
        display: last30.size + "/" + s.expectedAuditsPerMonth,
        caption: "this month",
        color: cadence >= 100 ? "var(--chart-1)" : "var(--chart-3)",
        current: last30.size + " audits",
        goal: s.expectedAuditsPerMonth + " audits"
      },
      {
        title: "Reusable share",
        meta: "Target: 30% of audited weight is reusable",
        value: reuse,
        display: Math.round(m.reuseShare * 100) + "%",
        caption: "reusable",
        color: reuse >= 100 ? "var(--chart-1)" : "var(--chart-4)",
        current: ui.kg(m.reusableWeight) + " kg",
        goal: ui.kg((m.weightKg * 0.3)) + " kg"
      },
      {
        title: "Campus eco score",
        meta: "Composite of reduction, reuse and cadence",
        value: eco.score,
        display: eco.score,
        caption: "of 100",
        color: eco.score >= 70 ? "var(--chart-1)" : eco.score >= 45 ? "var(--chart-2)" : "var(--chart-5)",
        current: eco.progressPts + eco.reusePts + eco.cadencePts + " pts",
        goal: "100 pts"
      }
    ];
  }

  /* ---------------- render ---------------- */
  function render(root) {
    const dismissed = (store.getSettings().dismissed || []);
    const all = buildInsights();
    const list = all.filter((i) => !dismissed.includes(i.id));
    const goals = buildGoals();

    // aggregate potential
    const sixMonths = store.filterByPeriod("6m");
    const m6 = store.metrics(sixMonths);
    const topSwap = store.topItems(sixMonths, 5).filter((t) => t.item.singleUse);
    const addressableKg = topSwap.reduce((a, b) => a + b.kg, 0) * 0.6;
    const addressableRs = topSwap.reduce((a, b) => a + b.cost, 0) * 0.6;

    root.innerHTML = `
      <div class="view-enter">
        <div class="pagehead no-print">
          <div>
            <h2 class="pagehead__title">Insights & recommendations</h2>
            <p class="pagehead__sub">Rules engine running live against your audit history — prioritised by impact.</p>
          </div>
          <div class="pagehead__actions">
            <span class="badge badge--brand badge--dot">${list.length} active insight${list.length === 1 ? "" : "s"}</span>
            <button class="btn btn--secondary" id="ins-refresh">${icon("i-refresh")} Re-evaluate</button>
          </div>
        </div>

        <!-- POTENTIAL STRIP -->
        <section class="hero" style="padding:var(--sp-5) var(--sp-6)">
          <div style="position:relative;z-index:1">
            <div class="hero__kicker">${icon("i-sparkle")} Addressable impact</div>
            <div class="hero__title" style="font-size:clamp(21px,2.4vw,27px)">
              <em>${ui.kg(addressableKg)} kg</em> of plastic is avoidable this term
            </div>
            <p class="hero__sub" style="font-size:var(--fs-sm)">
              Based on the top offenders in your last 6 months of audits and realistic 60% substitution.
            </p>
          </div>
          <div class="flex gap-4" style="position:relative;z-index:1;flex-wrap:wrap">
            <div style="text-align:center">
              <div style="font-size:var(--fs-xl);font-weight:700" class="brand">${ui.kg(addressableKg)}</div>
              <div class="faint" style="font-size:var(--fs-xs);text-transform:uppercase;letter-spacing:.07em">kg waste</div>
            </div>
            <div style="text-align:center">
              <div style="font-size:var(--fs-xl);font-weight:700" class="amber">${ui.rupees(addressableRs, { compact: true })}</div>
              <div class="faint" style="font-size:var(--fs-xs);text-transform:uppercase;letter-spacing:.07em">spend</div>
            </div>
            <div style="text-align:center">
              <div style="font-size:var(--fs-xl);font-weight:700" class="sky">${ui.kg(addressableKg * (store.getSettings().co2PerKg || 2.6))}</div>
              <div class="faint" style="font-size:var(--fs-xs);text-transform:uppercase;letter-spacing:.07em">kg CO₂e</div>
            </div>
          </div>
        </section>

        <!-- GOALS -->
        <section class="grid grid--kpi stagger" style="grid-template-columns:repeat(auto-fit,minmax(250px,1fr))">
          ${goals.map((g) => `
            <div class="goal">
              ${charts.ring(g.value, { size: 84, stroke: 8, display: g.display, caption: g.caption, color: g.color })}
              <div class="goal__body">
                <div class="goal__title">${esc(g.title)}</div>
                <div class="goal__meta">${esc(g.meta)}</div>
                <div class="goal__foot"><span>Current <b>${esc(g.current)}</b></span><span>Goal <b>${esc(g.goal)}</b></span></div>
              </div>
            </div>`).join("")}
        </section>

        <!-- INSIGHTS -->
        <section class="mt-4">
          <div class="flex items-center justify-between gap-3" style="margin-bottom:var(--sp-4)">
            <h3 style="font-size:var(--fs-lg);font-weight:700;letter-spacing:-.03em">Recommended actions</h3>
            ${dismissed.length ? `<button class="btn btn--ghost btn--sm" id="ins-restore">${icon("i-refresh")} Restore ${dismissed.length} dismissed</button>` : ""}
          </div>

          <div class="grid stagger" style="gap:var(--sp-4)">
            ${list.length ? list.map((ins) => `
              <article class="insight" style="--insight-color:${ins.color};--insight-soft:${ins.soft}">
                <span class="insight__stripe"></span>
                <div class="insight__ico">${icon(ins.icon)}</div>
                <div class="insight__body">
                  <div class="insight__top">
                    <span class="badge ${TIER[ins.tier].cls} badge--dot">${TIER[ins.tier].label}</span>
                    <h4 class="insight__title">${ins.title}</h4>
                  </div>
                  <p class="insight__text">${ins.text}</p>
                  <div class="insight__impact">
                    ${ins.impact.map((im) => `
                      <div class="insight__stat"><b>${im.value}</b><span>${esc(im.label)}</span></div>`).join("")}
                  </div>
                </div>
                <div class="insight__act no-print">
                  ${ins.action && ins.action.newAudit
                    ? `<button class="btn btn--soft btn--sm" data-act-audit>${icon("i-plus")} ${esc(ins.action.label)}</button>`
                    : ins.action && ins.action.zoneId
                      ? `<button class="btn btn--soft btn--sm" data-act-zone="${ins.action.zoneId}">${icon("i-clipboard")} ${esc(ins.action.label)}</button>`
                      : `<button class="btn btn--soft btn--sm" data-act-route="${esc(ins.action.route)}">${esc(ins.action.label)} ${icon("i-chev-right")}</button>`}
                  <button class="btn btn--ghost btn--sm" data-dismiss="${ins.id}" data-tip="Dismiss">${icon("i-x")}</button>
                </div>
              </article>`).join("")
            : ui.emptyState("i-sparkle", "All caught up",
                "You've dismissed every insight. Restore them any time.")
            }
          </div>
        </section>
      </div>`;

    /* ---------- wiring ---------- */
    const refresh = $("#ins-refresh", root);
    if (refresh) refresh.addEventListener("click", () => {
      refresh.querySelector("svg").style.animation = "spin .7s linear";
      setTimeout(() => {
        render(root);
        ui.toast({ title: "Insights re-evaluated", desc: "Rules ran against the latest audit data", type: "info" });
      }, 420);
    });

    const restore = $("#ins-restore", root);
    if (restore) restore.addEventListener("click", () => {
      store.updateSettings({ dismissed: [] });
      render(root);
      ui.toast({ title: "Insights restored" });
    });

    $$("[data-act-route]", root).forEach((b) => b.addEventListener("click", () => {
      location.hash = "#/" + b.dataset.actRoute;
    }));

    $$("[data-act-zone]", root).forEach((b) => b.addEventListener("click", () => {
      window.PFC.views.audits.openWizard({ zoneId: b.dataset.actZone, onDone: () => render(root) });
    }));

    $$("[data-act-audit]", root).forEach((b) => b.addEventListener("click", () => {
      window.PFC.views.audits.openWizard({ onDone: () => render(root) });
    }));

    $$("[data-dismiss]", root).forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.dismiss;
      const cur = store.getSettings().dismissed || [];
      if (!cur.includes(id)) cur.push(id);
      store.updateSettings({ dismissed: cur });
      const card = b.closest(".insight");
      card.style.transition = "all .3s var(--ease-in-out)";
      card.style.opacity = "0";
      card.style.transform = "translateX(28px)";
      setTimeout(() => render(root), 300);
      ui.toast({ type: "info", title: "Insight dismissed", duration: 2200 });
    }));

    requestAnimationFrame(() => charts.animateRings(root));
  }

  window.PFC.views = window.PFC.views || {};
  window.PFC.views.insights = { title: "Insights", crumb: "Intelligence", render, buildInsights };
})();
