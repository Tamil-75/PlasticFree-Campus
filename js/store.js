/* =============================================================
   PlasticFree Campus — Store
   LocalStorage persistence · pub/sub · derived analytics
   ============================================================= */
(function () {
  "use strict";

  const NS = "pfc:v1";
  const KEYS = {
    settings: NS + ":settings",
    zones: NS + ":zones",
    catalog: NS + ":catalog",
    audits: NS + ":audits",
    meta: NS + ":meta"
  };

  let state = { settings: null, zones: [], catalog: [], audits: [] };
  const listeners = new Set();

  /* ---------------- persistence ---------------- */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn("[store] read failed", key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error("[store] write failed", key, e);
      return false;
    }
  }

  function persistAll() {
    write(KEYS.settings, state.settings);
    write(KEYS.zones, state.zones);
    write(KEYS.catalog, state.catalog);
    write(KEYS.audits, state.audits);
    write(KEYS.meta, { savedAt: new Date().toISOString(), version: 1 });
  }

  function emit(type) {
    listeners.forEach((fn) => {
      try { fn(type, state); } catch (e) { console.error(e); }
    });
  }

  /* ---------------- lifecycle ---------------- */
  function init() {
    const zones = read(KEYS.zones, null);
    const catalog = read(KEYS.catalog, null);
    const audits = read(KEYS.audits, null);
    const settings = read(KEYS.settings, null);

    if (!zones || !catalog || !audits || !settings) {
      // first launch → build from seed
      state = {
        settings: Object.assign({}, window.PFC_SEED.SETTINGS),
        zones: window.PFC_SEED.ZONES.map((z) => Object.assign({}, z)),
        catalog: window.PFC_SEED.CATALOG.map((c) => Object.assign({}, c)),
        audits: window.PFC_SEED.generateAudits()
      };
      persistAll();
      return "seeded";
    }

    state = { settings, zones, catalog, audits };
    return "loaded";
  }

  function resetToSeed() {
    state = {
      settings: Object.assign({}, window.PFC_SEED.SETTINGS),
      zones: window.PFC_SEED.ZONES.map((z) => Object.assign({}, z)),
      catalog: window.PFC_SEED.CATALOG.map((c) => Object.assign({}, c)),
      audits: window.PFC_SEED.generateAudits()
    };
    persistAll();
    emit("reset");
  }

  function wipe() {
    state = {
      settings: Object.assign({}, window.PFC_SEED.SETTINGS, { onboarded: true }),
      zones: state.zones.slice(),
      catalog: state.catalog.slice(),
      audits: []
    };
    persistAll();
    emit("wipe");
  }

  function exportJSON() {
    return JSON.stringify({
      app: "PlasticFree Campus",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: state.settings,
      zones: state.zones,
      catalog: state.catalog,
      audits: state.audits
    }, null, 2);
  }

  function importJSON(text) {
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.audits)) throw new Error("Invalid backup file");
    state = {
      settings: Object.assign({}, window.PFC_SEED.SETTINGS, data.settings || {}),
      zones: Array.isArray(data.zones) && data.zones.length ? data.zones : state.zones,
      catalog: Array.isArray(data.catalog) && data.catalog.length ? data.catalog : state.catalog,
      audits: data.audits
    };
    persistAll();
    emit("import");
  }

  /* ---------------- subscriptions ---------------- */
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  /* ---------------- lookups ---------------- */
  const getZone = (id) => state.zones.find((z) => z.id === id) || { name: "Unknown zone", icon: "i-pin", type: "—" };
  const getItem = (id) => state.catalog.find((c) => c.id === id) || { name: "Unknown item", cost: 0, weight: 0, cat: "—", icon: "i-package", singleUse: true, eco: 5 };

  /* ---------------- audits CRUD ---------------- */
  function addAudit(audit) {
    const maxN = state.audits.reduce((m, a) => {
      const n = parseInt(String(a.id).replace(/\D/g, ""), 10);
      return Number.isNaN(n) ? m : Math.max(m, n);
    }, 0);
    const id = "aud_" + String(maxN + 1).padStart(3, "0");
    const record = Object.assign({
      id,
      code: "PFC-" + String(1001 + maxN),
      status: "completed",
      entries: [],
      notes: "",
      createdAt: new Date().toISOString()
    }, audit, { id });

    state.audits.push(record);
    persistAll();
    emit("audits");
    return record;
  }

  function updateAudit(id, patch) {
    const a = state.audits.find((x) => x.id === id);
    if (!a) return null;
    Object.assign(a, patch);
    persistAll();
    emit("audits");
    return a;
  }

  function removeAudit(id) {
    state.audits = state.audits.filter((a) => a.id !== id);
    persistAll();
    emit("audits");
  }

  /* ---------------- settings ---------------- */
  function getSettings() { return state.settings; }
  function updateSettings(patch) {
    Object.assign(state.settings, patch);
    persistAll();
    emit("settings");
    return state.settings;
  }

  /* ---------------- date helpers ---------------- */
  const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function parseDate(iso) { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); }
  function monthKey(iso) { return iso.slice(0, 7); }
  function monthLabel(key) { const [y, m] = key.split("-").map(Number); return MONTHS_SHORT[m - 1]; }
  function monthLong(key) { const [y, m] = key.split("-").map(Number); return MONTHS_SHORT[m - 1] + " " + y; }

  const PERIODS = {
    "7d":  { label: "Last 7 days",  days: 7 },
    "30d": { label: "Last 30 days", days: 30 },
    "90d": { label: "Last 90 days", days: 90 },
    "6m":  { label: "Last 6 months", days: 183 },
    "all": { label: "All time",     days: null }
  };

  function filterByPeriod(period) {
    if (!period || period === "all") return state.audits.slice();
    if (PERIODS[period] && PERIODS[period].days) {
      const cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0);
      cutoff.setDate(cutoff.getDate() - PERIODS[period].days);
      return state.audits.filter((a) => parseDate(a.date) >= cutoff);
    }
    return state.audits.slice();
  }

  /* ---------------- metrics ---------------- */
  function metrics(audits) {
    let items = 0, weightKg = 0, cost = 0, singleWeight = 0, reusableWeight = 0;
    let entryCount = 0;
    const itemMap = new Map();

    audits.forEach((a) => {
      (a.entries || []).forEach((e) => {
        const it = getItem(e.itemId);
        const qty = Number(e.qty) || 0;
        const kg = Number(e.weightKg) || 0;
        items += qty;
        weightKg += kg;
        cost += qty * (it.cost || 0);
        if (it.singleUse) singleWeight += kg; else reusableWeight += kg;
        entryCount += 1;

        const cur = itemMap.get(e.itemId) || { itemId: e.itemId, qty: 0, kg: 0, cost: 0 };
        cur.qty += qty; cur.kg += kg; cur.cost += qty * (it.cost || 0);
        itemMap.set(e.itemId, cur);
      });
    });

    const co2 = weightKg * (state.settings.co2PerKg || 2.6);
    return {
      audits: audits.length,
      completed: audits.filter((a) => a.status === "completed").length,
      drafts: audits.filter((a) => a.status === "draft").length,
      items: Math.round(items),
      weightKg: +weightKg.toFixed(2),
      cost: Math.round(cost),
      co2: +co2.toFixed(2),
      singleWeight: +singleWeight.toFixed(2),
      reusableWeight: +reusableWeight.toFixed(2),
      singleShare: weightKg > 0 ? singleWeight / weightKg : 0,
      reuseShare: weightKg > 0 ? reusableWeight / weightKg : 0,
      entryCount,
      itemsMap: itemMap
    };
  }

  /* ---------------- grouping ---------------- */
  function byMonth(audits) {
    const map = new Map();
    audits.forEach((a) => {
      const key = monthKey(a.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    });
    return Array.from(map.entries())
      .sort((x, y) => (x[0] < y[0] ? -1 : 1))
      .map(([key, list]) => {
        const m = metrics(list);
        return { key, label: monthLabel(key), long: monthLong(key), audits: list.length, ...m };
      });
  }

  function byZone(audits) {
    const map = new Map();
    audits.forEach((a) => {
      if (!map.has(a.zoneId)) map.set(a.zoneId, []);
      map.get(a.zoneId).push(a);
    });
    return state.zones.map((z) => {
      const list = map.get(z.id) || [];
      return Object.assign({ zone: z, audits: list.length }, metrics(list));
    }).sort((a, b) => b.weightKg - a.weightKg);
  }

  function byCategory(audits) {
    const map = new Map();
    audits.forEach((a) => {
      (a.entries || []).forEach((e) => {
        const it = getItem(e.itemId);
        const key = it.cat;
        const cur = map.get(key) || { cat: key, qty: 0, kg: 0, cost: 0, audits: 0 };
        cur.qty += Number(e.qty) || 0;
        cur.kg += Number(e.weightKg) || 0;
        cur.cost += (Number(e.qty) || 0) * (it.cost || 0);
        map.set(key, cur);
      });
    });
    return Array.from(map.values()).map((c) => ({ ...c, kg: +c.kg.toFixed(2) })).sort((a, b) => b.kg - a.kg);
  }

  function topItems(audits, n) {
    const m = metrics(audits);
    return Array.from(m.itemsMap.values())
      .map((row) => Object.assign({}, row, { item: getItem(row.itemId) }))
      .sort((a, b) => b.kg - a.kg)
      .slice(0, n || 8);
  }

  function heatmap(audits, monthsBack) {
    const months = [];
    const now = new Date();
    for (let i = (monthsBack || 6) - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"));
    }
    const rows = state.zones.map((z) => ({
      zone: z,
      cells: months.map((mk) => {
        const list = audits.filter((a) => a.zoneId === z.id && monthKey(a.date) === mk);
        return { key: mk, weightKg: +metrics(list).weightKg.toFixed(1), audits: list.length };
      })
    }));
    return { months: months.map((m) => ({ key: m, label: monthLabel(m) })), rows };
  }

  /* ---------------- comparisons ---------------- */
  function periodComparison(period) {
    const days = (PERIODS[period] && PERIODS[period].days) || 30;
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - days + 1);
    const prevEnd = new Date(start); prevEnd.setMilliseconds(-1);
    const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - days);

    const cur = state.audits.filter((a) => { const d = parseDate(a.date); return d >= start && d <= end; });
    const prev = state.audits.filter((a) => { const d = parseDate(a.date); return d >= prevStart && d <= prevEnd; });

    return {
      current: { label: PERIODS[period] ? PERIODS[period].label : "Current period", range: fmtRange(start, end), ...metrics(cur) },
      previous: { label: "Previous period", range: fmtRange(prevStart, prevEnd), ...metrics(prev) }
    };
  }

  function fmtRange(a, b) {
    const f = (d) => d.getDate() + " " + MONTHS_SHORT[d.getMonth()] + " " + d.getFullYear();
    return f(a) + " – " + f(b);
  }

  function pctDelta(cur, prev) {
    if (!prev) return cur > 0 ? 100 : 0;
    return ((cur - prev) / prev) * 100;
  }

  /* ---------------- eco score ----------------
     60 pts · reduction vs baseline toward target
     25 pts · share of audited weight that is NOT single-use
     15 pts · audit cadence consistency (last 30 days)          */
  function ecoScore() {
    const s = state.settings;

    // reduction progress (uses complete months only — no partial-month distortion)
    let progressPts = 0;
    const base = baselineVsRecent();
    if (base) {
      const target = (s.targetReduction || 40) / 100;
      progressPts = Math.max(0, Math.min(60, (base.reduction / target) * 60));
    }

    // reuse share
    const m = metrics(state.audits);
    const reusePts = (m.reuseShare || 0) * 25;

    // cadence — audits logged in the last 30 days vs expectation
    const cut = new Date(); cut.setDate(cut.getDate() - 30);
    const recentCount = new Set(
      state.audits.filter((a) => parseDate(a.date) >= cut).map((a) => a.id)
    ).size;
    const expected = s.expectedAuditsPerMonth || 12;
    const cadencePts = Math.min(15, (recentCount / expected) * 15);

    const score = Math.round(Math.max(0, Math.min(100, progressPts + reusePts + cadencePts)));
    return { score, progressPts: Math.round(progressPts), reusePts: Math.round(reusePts), cadencePts: Math.round(cadencePts) };
  }

  function ecoHint(score) {
    if (score >= 85) return "Excellent — campus is on track ✦";
    if (score >= 70) return "Strong progress, keep the momentum";
    if (score >= 50) return "Fair — focus on high-impact zones";
    if (score >= 30) return "Needs attention — audit more often";
    return "Critical — start reducing single-use plastic";
  }

  /* ---------------- insight engine inputs ---------------- */
  function baselineVsRecent() {
    const all = byMonth(state.audits.filter((a) => a.status === "completed"));
    if (all.length < 2) return null;

    // Exclude the in-progress calendar month so a partial month
    // never masquerades as a dramatic reduction.
    const now = new Date();
    const nowKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    const complete = all.filter((m) => m.key !== nowKey);
    const months = complete.length >= 2 ? complete : all;

    const n = Math.min(state.settings.baselineMonths || 2, months.length - 1);
    const baseline = months.slice(0, n).reduce((s, m) => s + m.weightKg, 0) / n;
    const recent = months[months.length - 1].weightKg;
    const reduction = baseline > 0 ? (baseline - recent) / baseline : 0;
    return { baseline, recent, reduction, months, usingCompleteMonths: months !== all };
  }

  function monthSeries(metricKey, count) {
    const months = byMonth(state.audits);
    const tail = months.slice(-(count || 6));
    return tail.map((m) => ({ label: m.label, value: m[metricKey] || 0, key: m.key }));
  }

  function auditStreak() {
    const dates = Array.from(new Set(state.audits.map((a) => a.date))).sort().reverse();
    if (!dates.length) return 0;
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    // allow today to be empty (audit may happen later in the day)
    if (dates[0] !== cursor.toISOString().slice(0, 10)) cursor.setDate(cursor.getDate() - 1);
    for (const d of dates) {
      if (d === cursor.toISOString().slice(0, 10)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else if (d < cursor.toISOString().slice(0, 10)) break;
    }
    return streak;
  }

  /* ---------------- public API ---------------- */
  window.PFC = window.PFC || {};
  window.PFC.store = {
    init, subscribe, resetToSeed, wipe, exportJSON, importJSON,
    get state() { return state; },
    get zones() { return state.zones; },
    get catalog() { return state.catalog; },
    get audits() { return state.audits; },
    getSettings, updateSettings,
    getZone, getItem,
    addAudit, updateAudit, removeAudit,
    filterByPeriod, metrics, byMonth, byZone, byCategory, topItems,
    heatmap, periodComparison, pctDelta, ecoScore, ecoHint,
    baselineVsRecent, monthSeries, auditStreak,
    parseDate, monthKey, monthLabel, monthLong, PERIODS, MONTHS_SHORT
  };
})();
