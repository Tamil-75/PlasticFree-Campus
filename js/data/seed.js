/* =============================================================
   PlasticFree Campus — Seed data generator
   Deterministic (seeded PRNG) so the first launch always builds
   the same realistic dataset. Persisted to LocalStorage on init.
   NOTE: all generated audits, auditors and figures are FICTIONAL
   SAMPLE DATA created for demonstration purposes only.
   ============================================================= */
(function () {
  "use strict";

  /* ---------------- Campus zones ---------------- */
  const ZONES = [
    { id: "z_canteen",  name: "Main Canteen",        icon: "i-coffee",    type: "Food & Beverage", scale: 1.35 },
    { id: "z_cafeteria",name: "Block B Cafeteria",   icon: "i-utensils",  type: "Food & Beverage", scale: 1.0 },
    { id: "z_hostel",   name: "Hostel Blocks",       icon: "i-bed",       type: "Residential",     scale: 1.15 },
    { id: "z_library",  name: "Central Library",     icon: "i-book",      type: "Academic",        scale: 0.7 },
    { id: "z_lab",      name: "Science Laboratories",icon: "i-flask",     type: "Academic",        scale: 0.65 },
    { id: "z_admin",    name: "Administrative Block",icon: "i-briefcase", type: "Office",          scale: 0.6 },
    { id: "z_sports",   name: "Sports Complex",      icon: "i-activity",  type: "Recreation",      scale: 0.8 },
    { id: "z_events",   name: "Events & Fests Ground",icon: "i-flag",     type: "Events",          scale: 1.25 },
    { id: "z_store",    name: "Parking & Stores",    icon: "i-package",   type: "Logistics",       scale: 0.55 }
  ];

  /* ---------------- Item catalog ----------------
     cost  = ₹ per unit      weight = grams per unit
     eco   = impact severity (1 low → 10 high)
     base  = typical units per audit               */
  const CATALOG = [
    { id: "b1", name: "PET Water Bottle",    cat: "Beverage",          icon: "i-bottle",   cost: 8,   weight: 20,  singleUse: true,  eco: 7, base: 70,  alt: "Refill stations + steel bottles" },
    { id: "b2", name: "Disposable Cup",      cat: "Beverage",          icon: "i-cup",      cost: 4,   weight: 12,  singleUse: true,  eco: 6, base: 150, alt: "Steel / ceramic tumblers" },
    { id: "b3", name: "Waxed Tea Cup",       cat: "Beverage",          icon: "i-cup",      cost: 5,   weight: 15,  singleUse: true,  eco: 7, base: 120, alt: "Ceramic mugs (returnable)" },
    { id: "b4", name: "Plastic Lid",         cat: "Beverage",          icon: "i-lid",      cost: 2,   weight: 4,   singleUse: true,  eco: 5, base: 130, alt: "Silicone reusable lids" },
    { id: "b5", name: "HDPE Cleaning Bottle",cat: "Cleaning & Misc",   icon: "i-bottle",   cost: 25,  weight: 45,  singleUse: false, eco: 4, base: 12,  alt: "Refill concentrate drums" },
    { id: "s1", name: "Drinking Straw",      cat: "Straws & Stirrers", icon: "i-straw",    cost: 0.5, weight: 1.5, singleUse: true,  eco: 6, base: 160, alt: "Paper / steel straws" },
    { id: "s2", name: "Stirrer Stick",       cat: "Straws & Stirrers", icon: "i-cutlery",  cost: 0.2, weight: 1,   singleUse: true,  eco: 4, base: 90,  alt: "Wooden stirrers" },
    { id: "g1", name: "Carry Bag (thin)",    cat: "Bags",              icon: "i-bag",      cost: 3,   weight: 8,   singleUse: true,  eco: 8, base: 90,  alt: "Cloth / jute bags" },
    { id: "g2", name: "Garbage Bag",         cat: "Bags",              icon: "i-bag",      cost: 4,   weight: 25,  singleUse: true,  eco: 7, base: 45,  alt: "Compostable liners" },
    { id: "f1", name: "Clamshell Container", cat: "Food Container",    icon: "i-box",      cost: 12,  weight: 28,  singleUse: true,  eco: 8, base: 55,  alt: "Steel tiffin / banana leaf" },
    { id: "f2", name: "Thermocol Plate",     cat: "Food Container",    icon: "i-plate",    cost: 6,   weight: 22,  singleUse: true,  eco: 9, base: 45,  alt: "Steel plates" },
    { id: "f3", name: "Plastic Plate",       cat: "Food Container",    icon: "i-plate",    cost: 5,   weight: 30,  singleUse: true,  eco: 7, base: 35,  alt: "Steel / bamboo plates" },
    { id: "c1", name: "Plastic Spoon",       cat: "Cutlery",           icon: "i-cutlery",  cost: 0.8, weight: 3.5, singleUse: true,  eco: 5, base: 170, alt: "Steel cutlery" },
    { id: "c2", name: "Plastic Fork",        cat: "Cutlery",           icon: "i-cutlery",  cost: 1,   weight: 4,   singleUse: true,  eco: 5, base: 120, alt: "Steel cutlery" },
    { id: "c3", name: "Plastic Knife",       cat: "Cutlery",           icon: "i-cutlery",  cost: 1,   weight: 3,   singleUse: true,  eco: 5, base: 80,  alt: "Steel cutlery" },
    { id: "w1", name: "Chips Wrapper",       cat: "Wrappers & Film",   icon: "i-packet",   cost: 1,   weight: 3,   singleUse: true,  eco: 9, base: 130, alt: "Bulk dispensers / refill" },
    { id: "w2", name: "Sugar Sachet",        cat: "Wrappers & Film",   icon: "i-packet",   cost: 0.5, weight: 1.5, singleUse: true,  eco: 8, base: 110, alt: "Sugar bowls" },
    { id: "w3", name: "Cling Film Roll",     cat: "Wrappers & Film",   icon: "i-packet",   cost: 2,   weight: 5,   singleUse: true,  eco: 7, base: 40,  alt: "Beeswax / silicone wraps" },
    { id: "p1", name: "Packaging Tape",      cat: "Packaging",         icon: "i-box",      cost: 3,   weight: 6,   singleUse: true,  eco: 6, base: 28,  alt: "Paper gummed tape" },
    { id: "p2", name: "Bubble Wrap Sheet",   cat: "Packaging",         icon: "i-box",      cost: 5,   weight: 10,  singleUse: true,  eco: 7, base: 22,  alt: "Corrugated paper padding" },
    { id: "p3", name: "Polythene Sheet",     cat: "Packaging",         icon: "i-package",  cost: 6,   weight: 18,  singleUse: true,  eco: 8, base: 25,  alt: "Reusable tarpaulin" },
    { id: "p4", name: "Storage Box (PP)",    cat: "Packaging",         icon: "i-box",      cost: 40,  weight: 120, singleUse: false, eco: 4, base: 8,   alt: "Steel crates" },
    { id: "m1", name: "Disposable Gloves",   cat: "Cleaning & Misc",   icon: "i-package",  cost: 2,   weight: 4,   singleUse: true,  eco: 6, base: 60,  alt: "Washable reusable gloves" },
    { id: "m2", name: "Plastic Dustpan",     cat: "Cleaning & Misc",   icon: "i-package",  cost: 35,  weight: 90,  singleUse: false, eco: 3, base: 6,   alt: "Steel dustpan" }
  ];

  /* Zones → likely item pools (adds realism to the audit trail) */
  const POOLS = {
    z_canteen:   ["b2","b3","b4","c1","c2","c3","f1","f2","f3","s1","s2","w2","g1"],
    z_cafeteria: ["b2","b4","c1","c2","f1","f3","s1","w2","g1","b1"],
    z_hostel:    ["b1","b2","f1","w1","g1","g2","w3","c1","b4"],
    z_library:   ["b1","b2","w1","w2","s1","b4"],
    z_lab:       ["m1","b5","w3","p1","p4","b1","m2"],
    z_admin:     ["b1","b2","g1","p1","p4","w1","b4"],
    z_sports:    ["b1","b2","s1","g1","w1","b4"],
    z_events:    ["b2","s1","g1","f1","f2","c1","w1","w2","b4"],
    z_store:     ["g1","p1","p2","p3","p4","m2","g2"]
  };

  const AUDITORS = ["A. Sharma", "R. Mehta", "K. Iyer", "S. Nair", "P. Verma", "M. Das", "T. Krishnan"];

  const NOTES = {
    z_canteen:   ["Peak lunch rush sampling, 12:30–13:15.", "Substituted steel trays at 2 counters — lower cup count.", "Counter 3 still serving waxed cups."],
    z_cafeteria: ["Evening snack window audit.", "New paper-straw pilot noticed on counters."],
    z_hostel:    ["Mess + corridor bins sampled.", "Block vending machines audited separately."],
    z_library:   ["Reading hall and café kiosk.", "Quiet hours — light sampling."],
    z_lab:       ["Two chemistry labs + prep room.", "PPE disposal bin verified."],
    z_admin:     ["Reception, print room and canteenette.", "Stationery store inventory checked."],
    z_sports:    ["Post-match ground sweep.", "Hydration station refill counters working."],
    z_events:    ["Post-event cleanup audit (cultural fest).", "Stall-by-stall segregation check."],
    z_store:     ["Inbound packaging waste measured.", "Dispatch area bubble-wrap usage logged."]
  };

  /* ---------------- Deterministic PRNG ----------------
     Re-seeded on every generateAudits() call so "Reload demo
     data" always reproduces the exact same showcase dataset.  */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const SEED = 20260611;
  let rnd = mulberry32(SEED);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const between = (min, max) => min + rnd() * (max - min);

  /* Month plan: Jun 2026 → Nov 2026 (today = 11 Nov 2026)
     Audit cadence holds steady while per-audit volume declines —
     the campus reduction programme visibly working.            */
  const MONTH_PLAN = [
    { y: 2026, m: 5,  count: 12, factor: 1.16 },  // Jun
    { y: 2026, m: 6,  count: 11, factor: 1.10 },  // Jul
    { y: 2026, m: 7,  count: 11, factor: 1.02 },  // Aug
    { y: 2026, m: 8,  count: 10, factor: 0.95 },  // Sep
    { y: 2026, m: 9,  count: 10, factor: 0.88 },  // Oct
    { y: 2026, m: 10, count: 6,  factor: 0.84 }   // Nov (partial month)
  ];

  const zoneIds = ZONES.map((z) => z.id);

  function generateAudits() {
    rnd = mulberry32(SEED); // deterministic replay
    const audits = [];
    const groups = [];
    let n = 0;

    MONTH_PLAN.forEach((plan) => {
      const group = [];
      groups.push(group);
      const daysInMonth = new Date(plan.y, plan.m + 1, 0).getDate();
      const maxDay = plan.m === 10 ? 11 : daysInMonth; // Nov: only up to today
      const usedDays = new Set();

      for (let i = 0; i < plan.count; i++) {
        // unique-ish day within the month
        let day = 1 + Math.floor(rnd() * (maxDay - 1) + 1);
        let guard = 0;
        while (usedDays.has(day) && guard++ < 8) day = 1 + Math.floor(rnd() * (maxDay - 1) + 1);
        usedDays.add(day);

        // canteen/events audited more often
        const zoneId = rnd() < 0.22 ? "z_canteen" : pick(zoneIds);
        const zone = ZONES.find((z) => z.id === zoneId);
        const pool = POOLS[zoneId];

        const entryCount = 3 + Math.floor(rnd() * 5); // 3–7 items
        const chosen = new Set();
        while (chosen.size < entryCount && chosen.size < pool.length) chosen.add(pick(pool));

        const entries = [];
        chosen.forEach((itemId) => {
          const item = CATALOG.find((c) => c.id === itemId);
          const qty = Math.max(2, Math.round(item.base * zone.scale * plan.factor * between(0.6, 1.45)));
          const variance = between(0.88, 1.14);
          entries.push({
            itemId,
            qty,
            weightKg: +((qty * item.weight * variance) / 1000).toFixed(3)
          });
        });

        // sort biggest contributors first
        entries.sort((a, b) => b.weightKg - a.weightKg);

        const date = `${plan.y}-${String(plan.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const isDraft = rnd() < 0.07 && plan.m === 10 ? true : rnd() < 0.04;
        const notePool = NOTES[zoneId];

        n += 1;
        const record = {
          id: "aud_" + String(n).padStart(3, "0"),
          code: "PFC-" + String(1000 + n),
          date,
          zoneId,
          auditor: pick(AUDITORS),
          notes: rnd() < 0.55 ? pick(notePool) : "",
          status: isDraft ? "draft" : "completed",
          entries,
          createdAt: new Date(plan.y, plan.m, day, 9 + Math.floor(rnd() * 9), Math.floor(rnd() * 60)).toISOString()
        };
        audits.push(record);
        group.push(record);
      }
    });

    /* --- normalise each month to the planned decline curve ---
       Random zone/item mixes add ±25% noise per month, so scale
       every month to count × factor — the published trend stays
       honest while individual audits keep realistic variance.   */
    const idx = MONTH_PLAN.map((p) => p.count * p.factor);
    const idxSum = idx.reduce((a, b) => a + b, 0);
    const actuals = groups.map((g) =>
      g.reduce((s, a) => s + a.entries.reduce((x, e) => x + e.weightKg, 0), 0)
    );
    const k = actuals.reduce((a, b) => a + b, 0) / idxSum;

    groups.forEach((group, gi) => {
      const scale = (idx[gi] * k) / (actuals[gi] || 1);
      if (Math.abs(scale - 1) < 0.004) return;
      group.forEach((a) => {
        a.entries.forEach((e) => {
          const newQty = Math.max(1, Math.round(e.qty * scale));
          e.weightKg = +(e.weightKg * (newQty / (e.qty || 1))).toFixed(3);
          e.qty = newQty;
        });
        a.entries.sort((x, y) => y.weightKg - x.weightKg);
      });
    });

    // chronological order
    audits.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return audits;
  }

  /* ---------------- Default settings ---------------- */
  const SETTINGS = {
    campusName: "iGEN Green Campus",
    programLine: "iGEN Green Day 2026 · Section C · Project 9",
    targetReduction: 40,          // % reduction vs baseline
    baselineMonths: 2,            // months used as baseline
    expectedAuditsPerMonth: 12,
    defaultAuditor: "A. Sharma",
    currency: "₹",
    co2PerKg: 2.6,                // kg CO₂e per kg of plastic
    theme: "dark",
    reportAuthor: "Sustainability Cell",
    reportSignatory: "Dr. N. Raghavan — Green Officer",
    onboarded: false
  };

  window.PFC_SEED = { ZONES, CATALOG, SETTINGS, generateAudits };
})();
