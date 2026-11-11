/* =============================================================
   PlasticFree Campus — Audits view
   list + filters + detail drawer + 3-step audit wizard
   ============================================================= */
(function () {
  "use strict";
  const ui = window.PFC.ui;
  const store = window.PFC.store;
  const { $, $$, esc, icon } = ui;

  /* ---------------- list state ---------------- */
  const listState = { q: "", zone: "all", status: "all", page: 1, per: 9, sort: "date", dir: "desc" };

  const todayISO = () => {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };

  /* =============================================================
     WIZARD
     ============================================================= */
  function openWizard(opts) {
    const o = opts || {};
    const editing = o.audit || null;

    const presetZone = !editing && o.zoneId ? o.zoneId : null;

    const w = {
      step: presetZone ? 2 : 1,
      zoneId: editing ? editing.zoneId : presetZone,
      date: editing ? editing.date : todayISO(),
      auditor: editing ? editing.auditor : store.getSettings().defaultAuditor,
      notes: editing ? editing.notes || "" : "",
      entries: editing ? editing.entries.map((e) => ({ itemId: e.itemId, qty: e.qty, weightKg: e.weightKg, manual: true })) : [],
      editId: editing ? editing.id : null,
      cat: "All",
      q: ""
    };

    const modal = ui.openModal({
      title: editing ? "Edit audit" + (editing.code ? " · " + editing.code : "") : "New plastic audit",
      icon: "i-clipboard",
      size: "lg",
      persistent: true,
      body: `<div id="wiz"></div>`,
      footer: `<div id="wiz-foot" class="w-full"></div>`,
      onClose: () => { if (o.onClose) o.onClose(); }
    });

    const body = $("#wiz", modal.el);
    const foot = $("#wiz-foot", modal.el);

    /* ---------- helpers ---------- */
    const item = (id) => store.getItem(id);
    const zone = (id) => store.getZone(id);

    function autoWeight(entry) {
      const it = item(entry.itemId);
      return +(((Number(entry.qty) || 0) * (Number(it.weight) || 0)) / 1000).toFixed(3);
    }

    function totals() {
      let qty = 0, kg = 0, cost = 0;
      w.entries.forEach((e) => {
        const it = item(e.itemId);
        qty += Number(e.qty) || 0;
        kg += Number(e.weightKg) || 0;
        cost += (Number(e.qty) || 0) * (it.cost || 0);
      });
      return { qty, kg, cost, types: w.entries.length };
    }

    /* ---------- step 1: zone & info ---------- */
    function step1() {
      return `
        <div class="wizard-pane">
          <div class="field mb-4">
            <label class="field__label">1 · Select the zone being audited</label>
            <div class="zonegrid mt-2">
              ${store.zones.map((z) => `
                <button class="zonepick ${w.zoneId === z.id ? "is-on" : ""}" data-zone="${z.id}">
                  <span class="zonepick__check">${icon("i-check")}</span>
                  ${icon(z.icon)}
                  <span class="zonepick__name">${esc(z.name)}</span>
                  <span class="zonepick__meta">${esc(z.type)}</span>
                </button>`).join("")}
            </div>
          </div>

          <div class="grid grid--2 mt-4">
            <div class="field">
              <label class="field__label" for="wz-date">Audit date</label>
              <input class="input" type="date" id="wz-date" value="${esc(w.date)}" max="${todayISO()}">
            </div>
            <div class="field">
              <label class="field__label" for="wz-auditor">Auditor</label>
              <input class="input" id="wz-auditor" list="auditors-list" value="${esc(w.auditor)}" placeholder="Name of the auditor">
              <datalist id="auditors-list">
                ${["A. Sharma", "R. Mehta", "K. Iyer", "S. Nair", "P. Verma", "M. Das", "T. Krishnan"]
                  .map((a) => `<option value="${esc(a)}">`).join("")}
              </datalist>
            </div>
          </div>

          <div class="field mt-4">
            <label class="field__label" for="wz-notes">Observations <span class="faint" style="text-transform:none;letter-spacing:0">(optional)</span></label>
            <textarea class="textarea" id="wz-notes" placeholder="e.g. Peak lunch rush sampling, 12:30–13:15. Counter 3 still serving waxed cups.">${esc(w.notes)}</textarea>
          </div>

          ${w.zoneId ? `
          <div class="card card--pad mt-4" style="background:var(--brand-soft);border-color:rgba(52,211,153,.3)">
            <div class="flex items-center gap-3">
              <div class="iconbubble">${icon(zone(w.zoneId).icon)}</div>
              <div>
                <strong>${esc(zone(w.zoneId).name)}</strong>
                <div class="faint" style="font-size:var(--fs-xs)">${esc(zone(w.zoneId).type)} · ready for item entry</div>
              </div>
            </div>
          </div>` : `
          <div class="mt-4 faint flex items-center gap-2" style="font-size:var(--fs-sm)">
            ${icon("i-info")} Choose a zone to continue
          </div>`}
        </div>`;
    }

    /* ---------- step 2: items ---------- */
    function step2() {
      const cats = ["All"].concat(Array.from(new Set(store.catalog.map((c) => c.cat))));
      const filtered = store.catalog.filter((c) => {
        const okCat = w.cat === "All" || c.cat === w.cat;
        const okQ = !w.q || c.name.toLowerCase().includes(w.q.toLowerCase()) || c.cat.toLowerCase().includes(w.q.toLowerCase());
        return okCat && okQ;
      });
      const t = totals();

      return `
        <div class="wizard-pane">
          <div class="flex items-center gap-3" style="flex-wrap:wrap">
            <div class="search" style="flex:1;min-width:200px">
              ${icon("i-search")}
              <input class="input" id="wz-search" placeholder="Search item catalog…" value="${esc(w.q)}">
            </div>
          </div>

          <div class="flex gap-2 mt-3" style="flex-wrap:wrap" id="wz-cats">
            ${cats.map((c) => `<button class="chip ${w.cat === c ? "is-on" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}
          </div>

          <label class="field__label mt-4" style="display:block">2 · Tap items found during the audit</label>
          <div class="itemgrid mt-2" id="wz-items">
            ${filtered.map((c) => {
              const on = w.entries.some((e) => e.itemId === c.id);
              return `
                <button class="itempick ${on ? "is-on" : ""}" data-item="${c.id}">
                  <span class="itempick__ico">${icon(c.icon)}</span>
                  <span class="itempick__info">
                    <span class="itempick__name">${esc(c.name)}</span>
                    <span class="itempick__meta">${esc(c.cat)} · ${ui.n0(c.weight)} g · ₹${c.cost}</span>
                  </span>
                </button>`;
            }).join("") || `<div class="faint" style="font-size:var(--fs-sm);padding:10px">No items match that search.</div>`}
          </div>

          <label class="field__label mt-6" style="display:block">Audit entries (${w.entries.length})</label>
          <div class="mt-2" id="wz-entries">
            ${w.entries.length ? w.entries.map((e, i) => {
              const it = item(e.itemId);
              return `
                <div class="entry" data-idx="${i}">
                  <div style="min-width:0">
                    <div class="entry__name truncate">${esc(it.name)}</div>
                    <div class="entry__meta">${esc(it.cat)} · ₹${it.cost}/pc · ${ui.n0(it.weight)} g</div>
                  </div>
                  <input class="input" type="number" min="0" step="1" data-qty="${i}" value="${e.qty}" aria-label="Quantity">
                  <input class="input" type="number" min="0" step="0.001" data-kg="${i}" value="${e.weightKg}" aria-label="Weight in kg">
                  <button class="btn btn--icon" data-del="${i}" data-tip="Remove">${icon("i-trash")}</button>
                </div>`;
            }).join("") : `
              <div class="empty" style="padding:26px 10px">
                <div class="empty__art">${icon("i-package")}</div>
                <div class="empty__title">No entries yet</div>
                <div class="empty__desc">Search above and tap the plastic items you observed.</div>
              </div>`}
          </div>

          <div class="totals" id="wz-totals">
            <div class="totals__cell"><div class="totals__val">${ui.n0(t.qty)}</div><div class="totals__lbl">Items</div></div>
            <div class="totals__cell"><div class="totals__val">${ui.n1(t.kg)}</div><div class="totals__lbl">Kilograms</div></div>
            <div class="totals__cell"><div class="totals__val">₹${ui.n0(t.cost)}</div><div class="totals__lbl">Est. cost</div></div>
            <div class="totals__cell"><div class="totals__val">${t.types}</div><div class="totals__lbl">Item types</div></div>
          </div>
        </div>`;
    }

    /* ---------- step 3: review ---------- */
    function step3() {
      const t = totals();
      const z = zone(w.zoneId);
      const rows = w.entries.slice().sort((a, b) => b.weightKg - a.weightKg);

      return `
        <div class="wizard-pane">
          <div class="card card--pad" style="background:linear-gradient(120deg,rgba(16,185,129,.12),transparent);border-color:rgba(52,211,153,.3)">
            <div class="flex items-center gap-3">
              <div class="iconbubble">${icon(z.icon)}</div>
              <div style="flex:1">
                <strong style="font-size:var(--fs-md)">${esc(z.name)}</strong>
                <div class="faint" style="font-size:var(--fs-xs)">${esc(z.type)}</div>
              </div>
              <div style="text-align:right">
                <div class="mono" style="font-size:var(--fs-sm)">${esc(ui.dateShort(w.date))}</div>
                <div class="faint" style="font-size:var(--fs-xs)">${esc(w.auditor)}</div>
              </div>
            </div>
          </div>

          <div class="totals mt-4">
            <div class="totals__cell"><div class="totals__val">${ui.n0(t.qty)}</div><div class="totals__lbl">Items</div></div>
            <div class="totals__cell"><div class="totals__val">${ui.n1(t.kg)}</div><div class="totals__lbl">Kilograms</div></div>
            <div class="totals__cell"><div class="totals__val">₹${ui.n0(t.cost)}</div><div class="totals__lbl">Est. cost</div></div>
            <div class="totals__cell"><div class="totals__val">${(t.kg * (store.getSettings().co2PerKg || 2.6)).toFixed(1)}</div><div class="totals__lbl">kg CO₂e</div></div>
          </div>

          <label class="field__label mt-6" style="display:block">Entries (${rows.length})</label>
          <div class="tablewrap mt-2" style="border:1px solid var(--border);border-radius:var(--r-md)">
            <table class="table" style="min-width:auto">
              <thead>
                <tr><th>Item</th><th class="ta-r">Qty</th><th class="ta-r">Weight</th><th class="ta-r">Cost</th></tr>
              </thead>
              <tbody>
                ${rows.map((e) => {
                  const it = item(e.itemId);
                  return `<tr>
                    <td><strong>${esc(it.name)}</strong><br><span class="faint" style="font-size:var(--fs-xs)">${esc(it.cat)}</span></td>
                    <td class="ta-r mono">${ui.n0(e.qty)}</td>
                    <td class="ta-r mono">${ui.n2(e.weightKg)} kg</td>
                    <td class="ta-r mono">${ui.rupees(e.qty * it.cost)}</td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table>
          </div>

          ${w.notes ? `
            <div class="card card--pad mt-4" style="font-size:var(--fs-sm)">
              <div class="field__label mb-2">Observations</div>
              <div class="muted">${esc(w.notes)}</div>
            </div>` : ""}
        </div>`;
    }

    /* ---------- footer ---------- */
    function renderFoot() {
      const t = totals();
      const canNext = w.step === 1 ? !!w.zoneId : w.step === 2 ? w.entries.length > 0 : false;

      foot.innerHTML = `
        <div class="flex items-center justify-between w-full gap-3">
          <div class="faint" style="font-size:var(--fs-xs)">
            ${w.step < 3
              ? `Step ${w.step} of 3`
              : `<b class="brand">${ui.n0(t.qty)} items</b> · <b class="brand">${ui.n1(t.kg)} kg</b> · <b class="brand">${ui.rupees(t.cost)}</b>`}
          </div>
          <div class="flex gap-2">
            ${w.step > 1 ? `<button class="btn btn--ghost" data-w-back>${icon("i-chev-down")} Back</button>` : `<button class="btn btn--ghost" data-close>Cancel</button>`}
            ${w.step < 3
              ? `<button class="btn btn--primary" data-w-next ${canNext ? "" : "disabled"}>Continue ${icon("i-chev-right")}</button>`
              : `<button class="btn btn--primary" data-w-save>${icon("i-save")} ${w.editId ? "Save changes" : "Save audit"}</button>`}
          </div>
        </div>`;

      const back = $("[data-w-back]", foot);
      if (back) back.addEventListener("click", () => { w.step -= 1; renderAll(); });

      const next = $("[data-w-next]", foot);
      if (next) next.addEventListener("click", () => {
        if (w.step === 1 && !w.zoneId) return;
        if (w.step === 2 && !w.entries.length) return;
        w.step += 1;
        renderAll();
      });

      const save = $("[data-w-save]", foot);
      if (save) save.addEventListener("click", doSave);
    }

    function syncInputs() {
      const d = $("#wz-date", modal.el);
      if (d) d.addEventListener("change", () => (w.date = d.value || todayISO()));
      const a = $("#wz-auditor", modal.el);
      if (a) a.addEventListener("input", () => (w.auditor = a.value));
      const n = $("#wz-notes", modal.el);
      if (n) n.addEventListener("input", () => (w.notes = n.value));
    }

    /* ---------- render ---------- */
    function renderAll() {
      body.innerHTML = w.step === 1 ? step1() : w.step === 2 ? step2() : step3();
      renderFoot();
      wireBody();
    }

    function wireBody() {
      // step 1
      $$("[data-zone]", modal.el).forEach((b) => b.addEventListener("click", () => {
        w.zoneId = b.dataset.zone;
        renderAll();
      }));
      syncInputs();

      // step 2
      const search = $("#wz-search", modal.el);
      if (search) search.addEventListener("input", ui.debounce(() => {
        w.q = search.value;
        const focusBack = () => { const s2 = $("#wz-search", modal.el); if (s2) { s2.focus(); s2.setSelectionRange(s2.value.length, s2.value.length); } };
        body.innerHTML = step2(); wireBody(); renderFoot(); focusBack();
      }, 180));

      $$("[data-cat]", modal.el).forEach((b) => b.addEventListener("click", () => {
        w.cat = b.dataset.cat;
        body.innerHTML = step2(); wireBody(); renderFoot();
      }));

      $$("[data-item]", modal.el).forEach((b) => b.addEventListener("click", () => {
        const id = b.dataset.item;
        const existing = w.entries.find((e) => e.itemId === id);
        if (existing) {
          existing.qty = (Number(existing.qty) || 0) + 5;
          if (!existing.manual) existing.weightKg = autoWeight(existing);
          ui.toast({ title: "Quantity bumped", desc: store.getItem(id).name + " → " + existing.qty, type: "info", duration: 2200 });
        } else {
          const it = store.getItem(id);
          const qty = Math.max(5, Math.round((it.base || 20) / 3));
          w.entries.push({ itemId: id, qty, weightKg: +((qty * it.weight) / 1000).toFixed(3), manual: false });
        }
        body.innerHTML = step2(); wireBody(); renderFoot();
      }));

      $$("[data-qty]", modal.el).forEach((inp) => inp.addEventListener("input", () => {
        const i = +inp.dataset.qty;
        w.entries[i].qty = Math.max(0, Number(inp.value) || 0);
        if (!w.entries[i].manual) {
          w.entries[i].weightKg = autoWeight(w.entries[i]);
          const kgInp = $(`[data-kg="${i}"]`, modal.el);
          if (kgInp) kgInp.value = w.entries[i].weightKg;
        }
        updateTotals();
      }));

      $$("[data-kg]", modal.el).forEach((inp) => inp.addEventListener("input", () => {
        const i = +inp.dataset.kg;
        w.entries[i].weightKg = Math.max(0, Number(inp.value) || 0);
        w.entries[i].manual = true;
        updateTotals();
      }));

      $$("[data-del]", modal.el).forEach((b) => b.addEventListener("click", () => {
        w.entries.splice(+b.dataset.del, 1);
        body.innerHTML = step2(); wireBody(); renderFoot();
      }));
    }

    function updateTotals() {
      const t = totals();
      const box = $("#wz-totals", modal.el);
      if (box) {
        const vals = $$(".totals__val", box);
        if (vals[0]) ui.countUp(vals[0], t.qty, { duration: 350 });
        if (vals[1]) ui.countUp(vals[1], t.kg, { duration: 350, decimals: 1, format: (v) => ui.n1(v) });
        if (vals[2]) vals[2].textContent = "₹" + ui.n0(t.cost);
        if (vals[3]) vals[3].textContent = t.types;
      }
      renderFoot();
    }

    /* ---------- save ---------- */
    function doSave() {
      if (!w.zoneId) { ui.toast({ type: "warn", title: "Select a zone first" }); return; }
      if (!w.entries.length) { ui.toast({ type: "warn", title: "Add at least one item entry" }); return; }

      const entries = w.entries
        .filter((e) => Number(e.qty) > 0)
        .map((e) => ({ itemId: e.itemId, qty: Number(e.qty), weightKg: +(Number(e.weightKg) || 0).toFixed(3) }));

      if (!entries.length) { ui.toast({ type: "warn", title: "Entries need a quantity > 0" }); return; }

      const payload = {
        date: w.date,
        zoneId: w.zoneId,
        auditor: w.auditor.trim() || "Unknown",
        notes: w.notes.trim(),
        entries,
        status: "completed"
      };

      let rec;
      if (w.editId) {
        rec = store.updateAudit(w.editId, payload);
        ui.toast({ title: "Audit updated", desc: rec.code + " · " + store.getZone(rec.zoneId).name });
      } else {
        rec = store.addAudit(payload);
        ui.toast({ title: "Audit saved", desc: rec.code + " · " + ui.n0(entries.length) + " item types logged" });
      }

      modal.close();
      if (o.onDone) o.onDone(rec);
    }

    renderAll();
    return modal;
  }

  /* =============================================================
     DETAIL DRAWER
     ============================================================= */
  function openDetail(audit, onEdit) {
    const z = store.getZone(audit.zoneId);
    const m = store.metrics([audit]);
    const rows = audit.entries.slice().sort((a, b) => b.weightKg - a.weightKg);

    const modal = ui.openModal({
      drawer: true,
      title: audit.code || "Audit detail",
      icon: z.icon,
      body: `
        <div class="flex items-center gap-3 flex-wrap">
          <span class="badge ${audit.status === "draft" ? "badge--amber" : "badge--brand"} badge--dot">
            ${audit.status === "draft" ? "Draft" : "Completed"}
          </span>
          <span class="muted" style="font-size:var(--fs-sm)">${esc(ui.dateShort(audit.date))}</span>
          <span class="faint dot-sep" style="font-size:var(--fs-sm)">${esc(audit.auditor)}</span>
        </div>

        <div class="card card--pad mt-4">
          <div class="flex items-center gap-3">
            <div class="iconbubble">${icon(z.icon)}</div>
            <div>
              <strong>${esc(z.name)}</strong>
              <div class="faint" style="font-size:var(--fs-xs)">${esc(z.type)}</div>
            </div>
          </div>
        </div>

        <div class="totals">
          <div class="totals__cell"><div class="totals__val">${ui.n0(m.items)}</div><div class="totals__lbl">Items</div></div>
          <div class="totals__cell"><div class="totals__val">${ui.n1(m.weightKg)}</div><div class="totals__lbl">Kilograms</div></div>
          <div class="totals__cell"><div class="totals__val">₹${ui.n0(m.cost)}</div><div class="totals__lbl">Cost</div></div>
        </div>

        <label class="field__label mt-6" style="display:block">Entries (${rows.length})</label>
        <div class="mt-2">
          ${rows.map((e, i) => {
            const it = store.getItem(e.itemId);
            const share = m.weightKg > 0 ? (e.weightKg / m.weightKg) * 100 : 0;
            return `
              <div class="entry row-enter" style="animation-delay:${i * 45}ms;grid-template-columns:minmax(0,1fr) auto">
                <div style="min-width:0">
                  <div class="entry__name truncate">${esc(it.name)}</div>
                  <div class="entry__meta">${ui.n0(e.qty)} pcs · ${ui.n2(e.weightKg)} kg · ${ui.rupees(e.qty * it.cost)}</div>
                  <div class="board__bar" style="margin-top:7px">
                    <div class="board__fill" style="width:0%" data-w="${share.toFixed(1)}"></div>
                  </div>
                </div>
                <span class="badge ${it.singleUse ? "badge--coral" : "badge--brand"}">${it.singleUse ? "Single-use" : "Reusable"}</span>
              </div>`;
          }).join("")}
        </div>

        ${audit.notes ? `
          <div class="card card--pad mt-4">
            <div class="field__label mb-2">Observations</div>
            <div class="muted" style="font-size:var(--fs-sm);line-height:1.6">${esc(audit.notes)}</div>
          </div>` : ""}

        <div class="faint mt-6" style="font-size:var(--fs-xs)">
          Recorded ${esc(ui.timeAgo(audit.createdAt))} · ${audit.entries.length} catalog item types
        </div>`,
      footer: `
        <button class="btn btn--ghost" data-close>Close</button>
        <div style="flex:1"></div>
        <button class="btn btn--danger" data-del>${icon("i-trash")} Delete</button>
        <button class="btn btn--secondary" data-edit>${icon("i-edit")} Edit</button>`
    });

    requestAnimationFrame(() => {
      $$(".board__fill[data-w]", modal.el).forEach((f, i) => {
        setTimeout(() => (f.style.width = f.dataset.w + "%"), 120 + i * 50);
      });
    });

    $("[data-edit]", modal.el).addEventListener("click", () => {
      modal.close();
      openWizard({ audit, onDone: () => { if (onEdit) onEdit(); } });
    });

    $("[data-del]", modal.el).addEventListener("click", async () => {
      const ok = await ui.confirm({
        title: "Delete this audit?",
        message: `${audit.code} from ${esc(z.name)} will be permanently removed.`,
        confirmText: "Delete",
        danger: true
      });
      if (ok) {
        store.removeAudit(audit.id);
        modal.close();
        ui.toast({ type: "warn", title: "Audit deleted", desc: audit.code });
        if (onEdit) onEdit();
      }
    });

    return modal;
  }

  /* =============================================================
     LIST VIEW
     ============================================================= */
  function filtered() {
    let rows = store.audits.slice();

    if (listState.zone !== "all") rows = rows.filter((a) => a.zoneId === listState.zone);
    if (listState.status !== "all") rows = rows.filter((a) => a.status === listState.status);
    if (listState.q) {
      const q = listState.q.toLowerCase();
      rows = rows.filter((a) => {
        const z = store.getZone(a.zoneId);
        return (a.code || "").toLowerCase().includes(q) ||
          z.name.toLowerCase().includes(q) ||
          (a.auditor || "").toLowerCase().includes(q) ||
          (a.notes || "").toLowerCase().includes(q) ||
          a.date.includes(q);
      });
    }

    const dir = listState.dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      if (listState.sort === "weight") {
        return (store.metrics([a]).weightKg - store.metrics([b]).weightKg) * dir;
      }
      if (listState.sort === "items") {
        return (store.metrics([a]).items - store.metrics([b]).items) * dir;
      }
      return (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) * dir;
    });
    return rows;
  }

  function render(root) {
    root.innerHTML = `
      <div class="view-enter">
        <div class="pagehead no-print">
          <div>
            <h2 class="pagehead__title">Audit records</h2>
            <p class="pagehead__sub">Every field submission across campus — search, inspect, edit and export.</p>
          </div>
          <div class="pagehead__actions">
            <button class="btn btn--secondary" id="a-export">${icon("i-download")} Export CSV</button>
            <button class="btn btn--primary" id="a-new">${icon("i-plus")} New audit</button>
          </div>
        </div>

        <div class="toolbar no-print">
          <div class="search">
            ${icon("i-search")}
            <input class="input" id="a-q" placeholder="Search code, zone, auditor, notes…" value="${esc(listState.q)}">
          </div>
          <select class="filter-select" id="a-zone">
            <option value="all">All zones</option>
            ${store.zones.map((z) => `<option value="${z.id}" ${listState.zone === z.id ? "selected" : ""}>${esc(z.name)}</option>`).join("")}
          </select>
          <select class="filter-select" id="a-status">
            <option value="all">All statuses</option>
            <option value="completed" ${listState.status === "completed" ? "selected" : ""}>Completed</option>
            <option value="draft" ${listState.status === "draft" ? "selected" : ""}>Draft</option>
          </select>
          <div class="toolbar__spacer"></div>
          <span class="faint" id="a-count" style="font-size:var(--fs-xs)"></span>
        </div>

        <div class="card" id="a-card"></div>
      </div>`;

    $("#a-new", root).addEventListener("click", () => openWizard({ onDone: () => render(root) }));
    $("#a-export", root).addEventListener("click", () => exportCSV(filtered()));

    $("#a-q", root).addEventListener("input", ui.debounce((e) => {
      listState.q = e.target.value;
      listState.page = 1;
      drawTable(root);
    }, 200));

    $("#a-zone", root).addEventListener("change", (e) => {
      listState.zone = e.target.value; listState.page = 1; drawTable(root);
    });
    $("#a-status", root).addEventListener("change", (e) => {
      listState.status = e.target.value; listState.page = 1; drawTable(root);
    });

    drawTable(root);
  }

  function drawTable(root) {
    const card = $("#a-card", root);
    const rows = filtered();
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / listState.per));
    if (listState.page > pages) listState.page = pages;
    const slice = rows.slice((listState.page - 1) * listState.per, listState.page * listState.per);
    const m = store.metrics(rows);

    const count = $("#a-count", root);
    if (count) count.textContent = `${total} audit${total === 1 ? "" : "s"} · ${ui.n0(m.items)} items · ${ui.kg(m.weightKg)} kg`;

    if (!total) {
      card.innerHTML = ui.emptyState("i-clipboard", "No audits match your filters",
        "Adjust the search or filters, or create a new audit.",
        `<button class="btn btn--primary mt-2" id="a-empty-new">${icon("i-plus")} New audit</button>`);
      const b = $("#a-empty-new", card);
      if (b) b.addEventListener("click", () => openWizard({ onDone: () => render(root) }));
      return;
    }

    const sortHead = (key, label, cls) => {
      const on = listState.sort === key;
      return `<th class="${cls || ""}" data-sort="${key}" style="cursor:pointer;user-select:none">
        ${label} <span style="opacity:${on ? 1 : 0.3}">${on && listState.dir === "asc" ? "▲" : "▼"}</span>
      </th>`;
    };

    card.innerHTML = `
      <div class="tablewrap">
        <table class="table">
          <thead>
            <tr>
              ${sortHead("date", "Date")}
              <th>Code</th>
              <th>Zone</th>
              <th>Auditor</th>
              ${sortHead("items", "Items", "ta-r")}
              ${sortHead("weight", "Weight", "ta-r")}
              <th class="ta-r">Cost</th>
              <th>Status</th>
              <th class="ta-r no-print">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${slice.map((a, i) => {
              const z = store.getZone(a.zoneId);
              const am = store.metrics([a]);
              return `
                <tr class="row-enter" style="animation-delay:${i * 35}ms" data-open="${a.id}">
                  <td><strong>${esc(ui.dateTiny(a.date))}</strong><br><span class="faint" style="font-size:var(--fs-xs)">${a.date.slice(0, 4)}</span></td>
                  <td class="mono" style="font-size:var(--fs-xs)">${esc(a.code)}</td>
                  <td>
                    <div class="flex items-center gap-2">
                      <span style="color:var(--brand-400);display:inline-flex">${icon(z.icon)}</span>
                      <strong>${esc(z.name)}</strong>
                    </div>
                  </td>
                  <td>${esc(a.auditor)}</td>
                  <td class="ta-r mono">${ui.n0(am.items)}</td>
                  <td class="ta-r mono"><strong>${ui.kg(am.weightKg)}</strong> kg</td>
                  <td class="ta-r mono">${ui.rupees(am.cost)}</td>
                  <td><span class="badge ${a.status === "draft" ? "badge--amber" : "badge--brand"} badge--dot">${a.status === "draft" ? "Draft" : "Done"}</span></td>
                  <td class="ta-r no-print">
                    <div class="flex gap-1" style="justify-content:flex-end">
                      <button class="btn btn--icon btn--sm" data-view="${a.id}" data-tip="View">${icon("i-eye")}</button>
                      <button class="btn btn--icon btn--sm" data-edit="${a.id}" data-tip="Edit">${icon("i-edit")}</button>
                      <button class="btn btn--icon btn--sm" data-del="${a.id}" data-tip="Delete">${icon("i-trash")}</button>
                    </div>
                  </td>
                </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
      <div class="card__foot no-print">
        <span>Showing ${(listState.page - 1) * listState.per + 1}–${Math.min(listState.page * listState.per, total)} of ${total}</span>
        <div class="flex gap-2">
          <button class="btn btn--ghost btn--sm" id="a-prev" ${listState.page <= 1 ? "disabled" : ""}>${icon("i-chev-down")} Prev</button>
          <span class="faint" style="font-size:var(--fs-xs);align-self:center">Page ${listState.page} / ${pages}</span>
          <button class="btn btn--ghost btn--sm" id="a-next" ${listState.page >= pages ? "disabled" : ""}>Next ${icon("i-chev-right")}</button>
        </div>
      </div>`;

    // wiring
    $$("[data-sort]", card).forEach((th) => th.addEventListener("click", () => {
      const k = th.dataset.sort;
      if (listState.sort === k) listState.dir = listState.dir === "asc" ? "desc" : "asc";
      else { listState.sort = k; listState.dir = "desc"; }
      drawTable(root);
    }));

    $$("[data-open]", card).forEach((tr) => tr.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      openDetail(store.audits.find((a) => a.id === tr.dataset.open), () => drawTable(root));
    }));
    $$("[data-view]", card).forEach((b) => b.addEventListener("click", () => {
      openDetail(store.audits.find((a) => a.id === b.dataset.view), () => drawTable(root));
    }));
    $$("[data-edit]", card).forEach((b) => b.addEventListener("click", () => {
      openWizard({ audit: store.audits.find((a) => a.id === b.dataset.edit), onDone: () => drawTable(root) });
    }));
    $$("[data-del]", card).forEach((b) => b.addEventListener("click", async () => {
      const a = store.audits.find((x) => x.id === b.dataset.del);
      const ok = await ui.confirm({
        title: "Delete audit " + (a.code || "") + "?",
        message: "This record and its entries will be permanently removed.",
        confirmText: "Delete", danger: true
      });
      if (ok) {
        store.removeAudit(a.id);
        ui.toast({ type: "warn", title: "Audit deleted", desc: a.code });
        drawTable(root);
      }
    }));

    const prev = $("#a-prev", card), next = $("#a-next", card);
    if (prev) prev.addEventListener("click", () => { listState.page--; drawTable(root); window.scrollTo({ top: 0, behavior: "smooth" }); });
    if (next) next.addEventListener("click", () => { listState.page++; drawTable(root); window.scrollTo({ top: 0, behavior: "smooth" }); });
  }

  /* ---------------- CSV export ---------------- */
  function exportCSV(rows) {
    if (!rows.length) { ui.toast({ type: "warn", title: "Nothing to export" }); return; }
    const head = ["Code", "Date", "Zone", "Zone Type", "Auditor", "Status", "Item", "Category", "Quantity", "Weight (kg)", "Unit Cost (INR)", "Line Cost (INR)", "Notes"];
    const body = [];
    rows.forEach((a) => {
      const z = store.getZone(a.zoneId);
      a.entries.forEach((e) => {
        const it = store.getItem(e.itemId);
        body.push([
          a.code, a.date, z.name, z.type, a.auditor, a.status,
          it.name, it.cat, e.qty, e.weightKg, it.cost, (e.qty * it.cost).toFixed(2), a.notes || ""
        ]);
      });
    });
    const csv = ui.toCSV([head].concat(body));
    const stamp = todayISO();
    ui.download(`plasticfree-audits-${stamp}.csv`, "\uFEFF" + csv, "text/csv;charset=utf-8");
    ui.toast({ title: "CSV exported", desc: `${rows.length} audits · ${body.length} line items` });
  }

  window.PFC.views = window.PFC.views || {};
  window.PFC.views.audits = {
    title: "Audits",
    crumb: "Workspace",
    render,
    openWizard,
    openDetail,
    exportCSV
  };
})();
