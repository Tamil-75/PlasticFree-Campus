/* =============================================================
   PlasticFree Campus — Chart engine (hand-rolled SVG, no deps)
   area · bars · stacked bars · donut · ring · sparkline · hbars
   All charts animate in and expose hover tooltips.
   ============================================================= */
(function () {
  "use strict";

  const { $, $$, esc } = window.PFC.ui;

  const PALETTE = ["--chart-1", "--chart-2", "--chart-3", "--chart-4",
    "--chart-5", "--chart-6", "--chart-7", "--chart-8"];

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function color(i) { return cssVar(PALETTE[i % PALETTE.length]); }

  /* ---------------- math helpers ---------------- */
  function niceMax(max) {
    if (max <= 0) return 1;
    const exp = Math.floor(Math.log10(max));
    const base = Math.pow(10, exp);
    const frac = max / base;
    let nice;
    if (frac <= 1) nice = 1;
    else if (frac <= 2) nice = 2;
    else if (frac <= 2.5) nice = 2.5;
    else if (frac <= 5) nice = 5;
    else nice = 10;
    return nice * base;
  }

  function ticks(max, count) {
    const step = niceMax(max) / (count || 4);
    const out = [];
    for (let i = 0; i <= (count || 4); i++) out.push(+(step * i).toFixed(6));
    return out;
  }

  function smoothPath(pts) {
    if (!pts.length) return "";
    if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`;
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
    }
    return d;
  }

  function fmtVal(v, fmt) {
    if (fmt === "kg") {
      const x = Number(v) || 0;
      return x >= 1000 ? (x / 1000).toFixed(1) + "t" : (Math.round(x * 10) / 10).toString();
    }
    if (fmt === "money") return "₹" + window.PFC.ui.compact(v);
    if (fmt === "int") return String(Math.round(v));
    return String(Math.round(v * 10) / 10);
  }

  /* ---------------- shared tooltip ---------------- */
  function makeTip(box) {
    const tip = document.createElement("div");
    tip.className = "chart-tip";
    tip.style.display = "none";
    box.appendChild(tip);
    return {
      show(x, y, html) {
        tip.innerHTML = html;
        tip.style.display = "block";
        tip.style.left = x + "px";
        tip.style.top = y + "px";
      },
      hide() { tip.style.display = "none"; }
    };
  }

  function svgPointToBox(svg, box, x, y) {
    const vb = svg.viewBox.baseVal;
    const r = svg.getBoundingClientRect();
    const scale = r.width / (vb.width || 1);
    return { x: (x - vb.x) * scale, y: (y - vb.y) * scale };
  }

  /* =============================================================
     AREA / LINE CHART
     cfg: { labels:[], series:[{name, values:[], color?}], height,
            fmt, fill=true, smooth=true, yTicks=4, unit }
     ============================================================= */
  function area(container, cfg) {
    const box = document.createElement("div");
    box.className = "chartbox";
    container.innerHTML = "";
    container.appendChild(box);

    const labels = cfg.labels || [];
    const series = (cfg.series || []).map((s, i) => Object.assign({ color: color(i) }, s));
    const W = cfg.width || 760;
    const H = cfg.height || 270;
    const PL = 46, PR = 14, PT = 18, PB = 30;
    const iw = W - PL - PR, ih = H - PT - PB;

    if (!labels.length || !series.length) {
      box.innerHTML = `<div class="empty" style="padding:40px 0">
        <div class="empty__art">${window.PFC.ui.icon("i-chart")}</div>
        <div class="empty__desc">No data for this period yet.</div></div>`;
      return;
    }

    const allVals = series.flatMap((s) => s.values);
    const maxV = Math.max(...allVals, 0.0001);
    const tk = ticks(maxV, cfg.yTicks || 4);
    const top = tk[tk.length - 1];
    const n = labels.length;
    const xAt = (i) => PL + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
    const yAt = (v) => PT + ih - (top ? (v / top) * ih : 0);

    let g = "";
    // grid + y labels
    tk.forEach((t) => {
      const y = yAt(t);
      g += `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="${cssVar("--grid-line")}" stroke-width="1" stroke-dasharray="${t === 0 ? "0" : "3 5"}"/>`;
      g += `<text x="${PL - 9}" y="${y + 4}" text-anchor="end" font-size="10.5" fill="${cssVar("--text-3")}" font-family="var(--font-sans)">${fmtVal(t, cfg.fmt)}</text>`;
    });

    // x labels
    const step = Math.ceil(n / 12);
    labels.forEach((lb, i) => {
      if (i % step !== 0 && i !== n - 1) return;
      g += `<text x="${xAt(i)}" y="${H - 9}" text-anchor="middle" font-size="10.5" fill="${cssVar("--text-3")}" font-family="var(--font-sans)">${esc(lb)}</text>`;
    });

    let paths = "";
    series.forEach((s, si) => {
      const pts = s.values.map((v, i) => [xAt(i), yAt(v)]);
      const line = cfg.smooth === false
        ? pts.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" ")
        : smoothPath(pts);
      const areaD = line + ` L ${pts[pts.length - 1][0]} ${PT + ih} L ${pts[0][0]} ${PT + ih} Z`;

      paths += `
        <defs>
          <linearGradient id="ag${si}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${s.color}" stop-opacity="0.36"/>
            <stop offset="100%" stop-color="${s.color}" stop-opacity="0.01"/>
          </linearGradient>
        </defs>`;
      if (cfg.fill !== false) {
        paths += `<path d="${areaD}" fill="url(#ag${si})" class="ch-area" style="animation-delay:${si * 130}ms"/>`;
      }
      paths += `<path d="${line}" fill="none" stroke="${s.color}" stroke-width="2.6"
        stroke-linecap="round" stroke-linejoin="round" class="ch-line" style="animation-delay:${si * 130}ms"/>`;
      pts.forEach((p, i) => {
        paths += `<circle cx="${p[0]}" cy="${p[1]}" r="3.4" fill="${cssVar("--bg-2")}" stroke="${s.color}" stroke-width="2.2"
          class="ch-dot" style="animation-delay:${(si * n + i) * 26}ms" data-di="${i}" data-si="${si}"/>`;
      });
    });

    // hover layer
    const guide = `<line class="ch-guide" x1="0" y1="${PT}" x2="0" y2="${PT + ih}" stroke="${cssVar("--border-strong")}" stroke-width="1" stroke-dasharray="3 4" style="opacity:0"/>`;
    const focus = series.map((s, si) =>
      `<circle class="ch-focus" data-fi="${si}" r="5.4" fill="${s.color}" stroke="${cssVar("--bg-2")}" stroke-width="2.4" style="opacity:0"/>`
    ).join("");

    box.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(cfg.aria || "Trend chart")}">
        <style>
          .ch-line{stroke-dasharray:var(--len,2000);stroke-dashoffset:var(--len,2000);animation:drawLine 1.25s cubic-bezier(.16,1,.3,1) forwards}
          .ch-area{opacity:0;animation:fadeIn .9s ease .35s forwards}
          .ch-dot{opacity:0;transform-box:fill-box;transform-origin:center;animation:scaleIn .4s cubic-bezier(.34,1.56,.64,1) forwards}
          .ch-bar{transform-box:fill-box;transform-origin:bottom;animation:growBar .8s cubic-bezier(.16,1,.3,1) both}
          .ch-seg{transition:stroke-width .18s ease, opacity .18s ease}
        </style>
        ${g}${paths}${guide}${focus}
        <rect class="ch-hit" x="${PL}" y="${PT}" width="${iw}" height="${ih}" fill="transparent"/>
      </svg>`;

    const svg = $("svg", box);
    // set dash lengths for draw animation
    $$(".ch-line", svg).forEach((p) => {
      const len = p.getTotalLength ? p.getTotalLength() : 2000;
      p.style.setProperty("--len", len);
    });

    const tip = makeTip(box);
    const guideEl = $(".ch-guide", svg);
    const focusEls = $$(".ch-focus", svg);

    const hit = $(".ch-hit", svg);
    hit.addEventListener("mousemove", (e) => {
      const r = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      const scale = r.width / vb.width;
      const mx = (e.clientX - r.left) / scale;
      let idx = n === 1 ? 0 : Math.round(((mx - PL) / iw) * (n - 1));
      idx = Math.max(0, Math.min(n - 1, idx));

      const gx = xAt(idx);
      guideEl.setAttribute("x1", gx);
      guideEl.setAttribute("x2", gx);
      guideEl.style.opacity = "1";

      focusEls.forEach((f, si) => {
        f.setAttribute("cx", gx);
        f.setAttribute("cy", yAt(series[si].values[idx]));
        f.style.opacity = "1";
      });

      const p = svgPointToBox(svg, box, gx, yAt(Math.max(...series.map((s) => s.values[idx]))));
      tip.show(p.x, p.y - 8,
        `<div class="chart-tip__title">${esc(labels[idx])}</div>` +
        series.map((s) => `
          <div class="chart-tip__row">
            <span style="width:8px;height:8px;border-radius:2px;background:${s.color};display:inline-block"></span>
            ${esc(s.name)} <b>${fmtVal(s.values[idx], cfg.fmt)}${cfg.unit ? " " + esc(cfg.unit) : ""}</b>
          </div>`).join(""));
    });

    hit.addEventListener("mouseleave", () => {
      tip.hide();
      guideEl.style.opacity = "0";
      focusEls.forEach((f) => (f.style.opacity = "0"));
    });

    return box;
  }

  /* =============================================================
     BAR CHART (vertical) + stacked variant
     cfg: { labels, values | stacks:[{name,color,values}],
            height, fmt, unit, rounded }
     ============================================================= */
  function bars(container, cfg) {
    const box = document.createElement("div");
    box.className = "chartbox";
    container.innerHTML = "";
    container.appendChild(box);

    const labels = cfg.labels || [];
    const stacked = Array.isArray(cfg.stacks) && cfg.stacks.length;
    const values = cfg.values || [];
    const W = cfg.width || 760;
    const H = cfg.height || 270;
    const PL = 46, PR = 14, PT = 20, PB = 30;
    const iw = W - PL - PR, ih = H - PT - PB;

    if (!labels.length) {
      box.innerHTML = `<div class="empty" style="padding:40px 0">
        <div class="empty__art">${window.PFC.ui.icon("i-chart")}</div>
        <div class="empty__desc">No data for this period yet.</div></div>`;
      return;
    }

    const totals = stacked
      ? labels.map((_, i) => cfg.stacks.reduce((s, st) => s + (st.values[i] || 0), 0))
      : values;
    const maxV = Math.max(...totals, 0.0001);
    const tk = ticks(maxV, cfg.yTicks || 4);
    const top = tk[tk.length - 1];
    const n = labels.length;
    const slot = iw / n;
    const bw = Math.max(6, Math.min(cfg.barWidth || 46, slot * 0.62));
    const yAt = (v) => PT + ih - (top ? (v / top) * ih : 0);

    let g = "";
    tk.forEach((t) => {
      const y = yAt(t);
      g += `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="${cssVar("--grid-line")}" stroke-width="1" stroke-dasharray="${t === 0 ? "0" : "3 5"}"/>`;
      g += `<text x="${PL - 9}" y="${y + 4}" text-anchor="end" font-size="10.5" fill="${cssVar("--text-3")}">${fmtVal(t, cfg.fmt)}</text>`;
    });

    const step = Math.ceil(n / 14);
    labels.forEach((lb, i) => {
      if (i % step !== 0 && i !== n - 1) return;
      g += `<text x="${PL + slot * i + slot / 2}" y="${H - 9}" text-anchor="middle" font-size="10.5" fill="${cssVar("--text-3")}">${esc(lb)}</text>`;
    });

    let barsSvg = "";
    labels.forEach((lb, i) => {
      const cx = PL + slot * i + slot / 2;
      const x = cx - bw / 2;
      const delay = i * 55;

      if (stacked) {
        let acc = 0;
        cfg.stacks.forEach((st, si) => {
          const v = st.values[i] || 0;
          const h = (v / top) * ih;
          const y = PT + ih - acc - h;
          if (h > 0.4) {
            barsSvg += `<rect class="ch-bar" x="${x}" y="${y}" width="${bw}" height="${Math.max(h, 1.5)}"
              fill="${st.color}" rx="${si === cfg.stacks.length - 1 ? 4 : 2}"
              style="animation-delay:${delay}ms"/>`;
          }
          acc += h;
        });
      } else {
        const v = values[i] || 0;
        const h = (v / top) * ih;
        const y = PT + ih - h;
        const c = (cfg.colors && cfg.colors[i]) || cfg.color || color(0);
        barsSvg += `<rect class="ch-bar" x="${x}" y="${y}" width="${bw}" height="${Math.max(h, 1.5)}"
          fill="${c}" rx="5" style="animation-delay:${delay}ms"/>`;
        if (cfg.showValues && n <= 14) {
          barsSvg += `<text x="${cx}" y="${y - 7}" text-anchor="middle" font-size="10.5" font-weight="700"
            fill="${cssVar("--text-2")}" class="ch-dot" style="animation-delay:${delay + 300}ms">${fmtVal(v, cfg.fmt)}</text>`;
        }
      }
      barsSvg += `<rect x="${cx - slot / 2}" y="${PT}" width="${slot}" height="${ih}" fill="transparent" data-bi="${i}"/>`;
    });

    box.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(cfg.aria || "Bar chart")}">
        <style>
          .ch-bar{transform-box:fill-box;transform-origin:bottom;animation:growBar .78s cubic-bezier(.16,1,.3,1) both}
          .ch-dot{opacity:0;animation:fadeIn .5s ease forwards}
        </style>
        ${g}${barsSvg}
      </svg>`;

    const svg = $("svg", box);
    const tip = makeTip(box);

    $$("[data-bi]", svg).forEach((hit) => {
      hit.addEventListener("mousemove", (e) => {
        const i = +hit.dataset.bi;
        const p = svgPointToBox(svg, box, e.clientX, 0);
        const rect = box.getBoundingClientRect();
        const html = stacked
          ? `<div class="chart-tip__title">${esc(labels[i])}</div>` +
            cfg.stacks.map((st) => `
              <div class="chart-tip__row">
                <span style="width:8px;height:8px;border-radius:2px;background:${st.color};display:inline-block"></span>
                ${esc(st.name)} <b>${fmtVal(st.values[i] || 0, cfg.fmt)}</b>
              </div>`).join("")
          : `<div class="chart-tip__title">${esc(labels[i])}</div>
             <div class="chart-tip__row">${esc(cfg.seriesName || "Value")} <b>${fmtVal(values[i], cfg.fmt)}${cfg.unit ? " " + esc(cfg.unit) : ""}</b></div>`;
        tip.show(e.clientX - rect.left, e.clientY - rect.top - 10, html);
      });
      hit.addEventListener("mouseleave", () => tip.hide());
    });

    return box;
  }

  /* =============================================================
     DONUT
     cfg: { data:[{label,value,color?}], centerLabel, centerValue,
            unit, thickness }
     ============================================================= */
  function donut(container, cfg) {
    const box = document.createElement("div");
    box.className = "chartbox";
    container.innerHTML = "";
    container.appendChild(box);

    const data = (cfg.data || []).filter((d) => d.value > 0);
    const size = cfg.size || 220;
    const r = size / 2 - (cfg.thickness || 26) / 2 - 4;
    const cxy = size / 2;
    const circ = 2 * Math.PI * r;

    if (!data.length) {
      box.innerHTML = `<div class="empty" style="padding:30px 0">
        <div class="empty__art">${window.PFC.ui.icon("i-chart")}</div>
        <div class="empty__desc">Nothing to show yet.</div></div>`;
      return;
    }

    const total = data.reduce((s, d) => s + d.value, 0);
    let acc = 0;
    const segs = data.map((d, i) => {
      const frac = d.value / total;
      const len = frac * circ;
      const gap = len > 12 ? 3 : 0;
      const seg = `
        <circle class="ch-seg" cx="${cxy}" cy="${cxy}" r="${r}" fill="none"
          stroke="${d.color || color(i)}" stroke-width="${cfg.thickness || 26}"
          stroke-dasharray="${Math.max(len - gap, 0.5)} ${circ}"
          stroke-dashoffset="${-acc}"
          stroke-linecap="round"
          data-si="${i}"
          style="animation:drawRing 1s cubic-bezier(.16,1,.3,1) ${i * 90}ms both"/>`;
      acc += len;
      return seg;
    }).join("");

    box.innerHTML = `
      <div style="position:relative;display:grid;place-items:center;width:100%">
        <svg viewBox="0 0 ${size} ${size}" style="max-width:${size}px;margin:0 auto" role="img" aria-label="${esc(cfg.aria || "Distribution chart")}">
          <style>
            @keyframes drawRing{from{stroke-dasharray:0 ${circ};opacity:0}to{opacity:1}}
            .ch-seg{cursor:pointer;transition:stroke-width .2s ease}
            .ch-seg:hover{stroke-width:${(cfg.thickness || 26) + 7}}
          </style>
          <circle cx="${cxy}" cy="${cxy}" r="${r}" fill="none" stroke="${cssVar("--track")}" stroke-width="${cfg.thickness || 26}"/>
          ${segs}
        </svg>
        <div style="position:absolute;text-align:center;pointer-events:none">
          <div style="font-size:var(--fs-2xl);font-weight:700;letter-spacing:-.04em;font-variant-numeric:tabular-nums">
            ${cfg.centerValue || ""}
          </div>
          <div style="font-size:var(--fs-xs);color:var(--text-3);text-transform:uppercase;letter-spacing:.07em;font-weight:600">
            ${esc(cfg.centerLabel || "")}
          </div>
        </div>
      </div>`;

    const svg = $("svg", box);
    const tip = makeTip(box);

    $$(".ch-seg", svg).forEach((seg) => {
      seg.addEventListener("mousemove", (e) => {
        const i = +seg.dataset.si;
        const d = data[i];
        const rect = box.getBoundingClientRect();
        tip.show(e.clientX - rect.left, e.clientY - rect.top - 10,
          `<div class="chart-tip__title">${esc(d.label)}</div>
           <div class="chart-tip__row">Share <b>${((d.value / total) * 100).toFixed(1)}%</b></div>
           <div class="chart-tip__row">Value <b>${fmtVal(d.value, cfg.fmt)}</b></div>`);
      });
      seg.addEventListener("mouseleave", () => tip.hide());
    });

    return box;
  }

  /* =============================================================
     PROGRESS RING — returns SVG markup string
     ============================================================= */
  function ring(value, cfg) {
    const o = cfg || {};
    const size = o.size || 110;
    const sw = o.stroke || 10;
    const r = (size - sw) / 2;
    const c = 2 * Math.PI * r;
    const v = Math.max(0, Math.min(100, value || 0));
    const col = o.color || color(0);
    const off = c - (v / 100) * c;
    return `
      <div class="ring" style="width:${size}px;height:${size}px">
        <svg width="${size}" height="${size}">
          <circle class="ring__track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${sw}"/>
          <circle class="ring__val" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none"
            stroke="${col}" stroke-width="${sw}" stroke-linecap="round"
            stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${c.toFixed(1)}"
            data-target="${off.toFixed(1)}"/>
        </svg>
        <div class="ring__label">
          <div class="ring__num">${o.display != null ? o.display : Math.round(v) + "%"}</div>
          ${o.caption ? `<div class="ring__cap">${esc(o.caption)}</div>` : ""}
        </div>
      </div>`;
  }

  function animateRings(root) {
    window.PFC.ui.$$(".ring__val", root || document).forEach((el) => {
      const target = el.dataset.target;
      requestAnimationFrame(() => {
        setTimeout(() => { el.style.strokeDashoffset = target; }, 60);
      });
    });
  }

  /* =============================================================
     SPARKLINE
     ============================================================= */
  function spark(container, values, cfg) {
    const o = cfg || {};
    const w = o.width || 92;
    const h = o.height || 30;
    const col = o.color || color(0);
    const vals = values && values.length ? values : [0, 0];
    const max = Math.max(...vals), min = Math.min(...vals);
    const span = max - min || 1;
    const pts = vals.map((v, i) => [
      (i / Math.max(1, vals.length - 1)) * (w - 2) + 1,
      h - 3 - ((v - min) / span) * (h - 8)
    ]);
    const line = smoothPath(pts);
    const areaD = line + ` L ${pts[pts.length - 1][0]} ${h} L ${pts[0][0]} ${h} Z`;
    const id = "sp" + Math.random().toString(36).slice(2, 7);

    const svg = `
      <svg class="kpi__spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">
        <defs>
          <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${col}" stop-opacity=".38"/>
            <stop offset="100%" stop-color="${col}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${areaD}" fill="url(#${id})"/>
        <path d="${line}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="2.8" fill="${col}"/>
      </svg>`;

    if (typeof container === "string") return svg;
    if (container) { container.innerHTML = svg; return svg; }
    return svg;
  }

  /* =============================================================
     HORIZONTAL BARS (DOM-based, for leaderboards)
     rows: [{name, value, label, sub, icon, color, rank}]
     ============================================================= */
  function hbars(container, rows, cfg) {
    const o = cfg || {};
    const max = Math.max(...rows.map((r) => r.value), 0.0001);
    container.innerHTML = rows.map((r, i) => `
      <div class="${o.rowClass || "board__row"} row-enter" style="animation-delay:${i * 60}ms">
        ${o.ranked !== false ? `<div class="board__rank ${i < 3 ? "board__rank--" + (i + 1) : ""}">${i + 1}</div>` : ""}
        <div class="board__info">
          <div class="board__name">
            ${r.icon ? window.PFC.ui.icon(r.icon) : ""}
            <span class="truncate">${esc(r.name)}</span>
          </div>
          <div class="board__bar">
            <div class="board__fill" style="width:0%;background:${r.color || `linear-gradient(90deg,var(--brand-500),var(--sky-400))`}"
              data-w="${((r.value / max) * 100).toFixed(1)}"></div>
          </div>
        </div>
        <div class="board__val">
          <b>${r.label}</b>
          <span>${esc(r.sub || "")}</span>
        </div>
      </div>`).join("");

    requestAnimationFrame(() => {
      window.PFC.ui.$$(".board__fill", container).forEach((f, i) => {
        setTimeout(() => { f.style.width = f.dataset.w + "%"; }, 120 + i * 60);
      });
    });
  }

  window.PFC = window.PFC || {};
  window.PFC.charts = { area, bars, donut, ring, animateRings, spark, hbars, color, cssVar, niceMax };
})();
