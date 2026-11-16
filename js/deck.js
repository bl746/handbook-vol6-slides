// Charts and accessibility for reveal.js slides.
//
// A chart is a <figure data-chart="name" data-alt="..." data-desc="..."> holding a
// <div class="plot">. Each chart module calls Deck.register(name, {data, render, table}):
//   data()                 -> rows, parsed once from Deck.csv[name] (set by data/<name>.js)
//   render(rows, {view})   -> the plot element
//   table(rows, {view})    -> {columns: [{label, value}], rows}, the chart's data as a table
// A chart is drawn the first time its slide is shown, and again when one of the
// figure's .toggle buttons sets its data-view. data-alt and data-desc become the
// chart's accessible name and description. Every chart gets a "Data table" button,
// because hover tooltips are not reachable by keyboard.

const Deck = (() => {
  const registry = {};
  const loaded = {};
  const csv = {};

  // Placeholder palette, named after the Stata scheme colors the PDF figures use
  const color = {
    sky: "#56b4e9",
    sea: "#0072b2",
    turquoise: "#009e73",
    reddish: "#cc79a7",
    vermillion: "#d55e00",
    orangebrown: "#e69f00",
    gray: "#8c8c8c",
  };

  function register(name, spec) {
    registry[name] = spec;
  }

  function rowsOf(name) {
    return (loaded[name] ??= registry[name].data());
  }

  // The chart is exposed as one image with the figure's name and description; Plot's
  // own SVG, with its per-mark labels, is hidden from assistive technology
  function describe(fig, target, el) {
    target.setAttribute("role", "img");
    target.setAttribute("aria-label", fig.dataset.alt);
    if (fig.dataset.desc) target.setAttribute("aria-describedby", `${fig.dataset.chart}-desc`);
    el.setAttribute("aria-hidden", "true");
  }

  function undescribe(target) {
    ["role", "aria-label", "aria-describedby"].forEach((a) => target.removeAttribute(a));
  }

  function dataTable(fig, spec, rows) {
    const { columns, rows: body } = spec.table(rows, { view: fig.dataset.view });
    const format = (v) => (v == null ? "" : typeof v === "number" ? d3.format(".1~f")(v) : String(v));
    const region = document.createElement("div");
    region.className = "data-table";
    region.tabIndex = 0;
    region.setAttribute("role", "region");
    region.setAttribute("aria-label", `Data table: ${fig.dataset.alt}`);
    const table = document.createElement("table");
    table.innerHTML = `<caption class="sr-only">${fig.dataset.alt}</caption>`;
    const head = table.createTHead().insertRow();
    columns.forEach((c) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = c.label;
      head.append(th);
    });
    const tbody = table.createTBody();
    body.forEach((d) => {
      const tr = tbody.insertRow();
      columns.forEach((c, i) => {
        const cell = document.createElement(i === 0 ? "th" : "td");
        if (i === 0) cell.scope = "row";
        cell.textContent = format(c.value(d));
        tr.append(cell);
      });
    });
    region.append(table);
    return region;
  }

  function draw(fig) {
    const name = fig.dataset.chart;
    const spec = registry[name];
    if (!spec) throw new Error(`No chart registered as "${name}"`);
    const rows = rowsOf(name);
    const target = fig.querySelector(".plot");
    if (fig.dataset.table === "on") {
      undescribe(target);
      target.replaceChildren(dataTable(fig, spec, rows));
    } else {
      const el = spec.render(rows, { view: fig.dataset.view });
      target.replaceChildren(el);
      describe(fig, target, el);
    }
    fig.dataset.drawn = "";
  }

  function show(slide) {
    slide?.querySelectorAll("[data-chart]:not([data-drawn])").forEach(draw);
  }

  // Each figure gets a toolbar: its view toggle, if any, and a data-table toggle
  function buildToolbars() {
    document.querySelectorAll("[data-chart]").forEach((fig) => {
      const bar = document.createElement("div");
      bar.className = "toolbar";
      const toggle = fig.querySelector(".toggle");
      if (toggle) bar.append(toggle);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "table-toggle";
      button.textContent = "Data table";
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => {
        const on = fig.dataset.table !== "on";
        fig.dataset.table = on ? "on" : "off";
        button.setAttribute("aria-pressed", on);
        draw(fig);
      });
      bar.append(button);
      fig.prepend(bar);
      if (fig.dataset.desc) {
        const p = document.createElement("p");
        p.className = "sr-only";
        p.id = `${fig.dataset.chart}-desc`;
        p.textContent = fig.dataset.desc;
        fig.append(p);
      }
    });
    document.querySelectorAll("[data-chart] .toggle button").forEach((button) => {
      button.addEventListener("click", () => {
        const fig = button.closest("[data-chart]");
        fig.dataset.view = button.dataset.view;
        fig.querySelectorAll(".toggle button").forEach((b) =>
          b.setAttribute("aria-pressed", b === button)
        );
        draw(fig);
      });
    });
  }

  // Headshot physics. Each bubble is a circle tied to its home position by a soft,
  // underdamped spring. The active bubble swells; overlapping circles push each other
  // apart, so the swelling spreads outward through its neighbours, which also squash
  // a little under pressure. Each bubble's spring target is pulled in from the slide's
  // edges far enough for its current size to fit. Steps are per 60 Hz frame.
  const PHYSICS = {
    grow: 2.25,      // scale of the active bubble; matches .author:hover in deck.css
    home: 0.004,     // spring toward home position
    damping: 0.94,   // velocity kept per step
    push: 0.06,      // collision spring, per px of overlap
    gap: 1.5,        // px kept between circles
    scaleSpring: 0.008,
    scaleDamping: 0.91,
    squash: 0.003,   // scale lost per px of overlap, up to maxSquash
    maxSquash: 0.12,
  };

  function bubblePhysics(authors) {
    const P = PHYSICS;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    let nodes = null;
    let frame = null;
    let last = 0;

    // Home positions are read on first use, once the slide is laid out
    function init() {
      nodes ??= authors.map((el) => {
        el.style.transition = "none";
        const r = el.offsetWidth / 2;
        return { el, r, hx: el.offsetLeft + r, hy: el.offsetTop + r, x: 0, y: 0, vx: 0, vy: 0, s: 1, vs: 0, grow: 1, pressure: 0 };
      });
      render();
    }

    const room = authors[0].parentElement;
    function step() {
      const bar = document.querySelector(".reveal .dots");
      const W = room.clientWidth;
      // The slide dots' bar is drawn at screen size over the scaled slide; bubbles stay above it
      const H = room.clientHeight - (bar ? bar.offsetHeight / Reveal.getScale() : 0);
      nodes.forEach((n) => (n.pressure = 0));
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = b.hx + b.x - (a.hx + a.x);
          const dy = b.hy + b.y - (a.hy + a.y);
          const d = Math.hypot(dx, dy) || 1e-6;
          const overlap = a.r * a.s + b.r * b.s + P.gap - d;
          if (overlap <= 0) continue;
          // The active bubble holds its place under the pointer; the other one gives way
          const share = a.grow > 1 ? 0 : b.grow > 1 ? 1 : 0.5;
          const f = overlap * P.push;
          a.vx -= (dx / d) * f * share;
          a.vy -= (dy / d) * f * share;
          b.vx += (dx / d) * f * (1 - share);
          b.vy += (dy / d) * f * (1 - share);
          a.pressure += overlap;
          b.pressure += overlap;
        }
      }
      nodes.forEach((n) => {
        const target = n.grow > 1 ? n.grow : 1 - Math.min(P.maxSquash, n.pressure * P.squash);
        n.vs = (n.vs + (target - n.s) * P.scaleSpring) * P.scaleDamping;
        n.s += n.vs;
        const R = n.r * n.s;
        const tx = clamp(n.hx, R, W - R) - n.hx;
        const ty = clamp(n.hy, R, H - R) - n.hy;
        n.vx = (n.vx + (tx - n.x) * P.home) * P.damping;
        n.vy = (n.vy + (ty - n.y) * P.home) * P.damping;
        n.x += n.vx;
        n.y += n.vy;
        // A bubble pushed or overshooting past an edge stops there
        const x = clamp(n.x, R - n.hx, W - R - n.hx);
        const y = clamp(n.y, R - n.hy, H - R - n.hy);
        if (x !== n.x) n.vx = 0;
        if (y !== n.y) n.vy = 0;
        n.x = x;
        n.y = y;
      });
    }

    function render() {
      nodes.forEach((n) => {
        n.el.style.transform = `translate(${n.x.toFixed(2)}px, ${n.y.toFixed(2)}px) scale(${n.s.toFixed(4)})`;
      });
    }

    const settled = () =>
      nodes.every((n) => Math.abs(n.vx) + Math.abs(n.vy) < 0.005 && Math.abs(n.vs) < 0.0002);

    function tick(t) {
      // Off-screen slides have no layout; the bubbles resume from where they were
      if (!room.clientWidth) {
        frame = null;
        return;
      }
      const steps = clamp(Math.round((t - last) / (1000 / 60)), 1, 4);
      last = t;
      for (let i = 0; i < steps; i++) step();
      render();
      frame = settled() ? null : requestAnimationFrame(tick);
    }

    return function activate(el) {
      init();
      nodes.forEach((n) => (n.grow = n.el === el ? P.grow : 1));
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
  }

  // Author headshots: a tooltip shows on hover or focus; selecting a photo keeps it
  // open, which also serves touch screens
  function wireAuthors() {
    const authors = [...document.querySelectorAll(".author")];
    const active = () =>
      authors.find((a) => a.matches(":hover")) ??
      authors.find((a) => a.matches(":focus-visible")) ??
      authors.find((a) => a.classList.contains("pinned"));
    // With reduced motion, the stylesheet's plain enlargement is used instead
    if (authors.length && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      authors[0].parentElement.classList.add("physics");
      const activate = bubblePhysics(authors);
      const update = () => requestAnimationFrame(() => activate(active()));
      ["pointerenter", "pointerleave", "focus", "blur", "click"].forEach((type) =>
        authors.forEach((a) => a.addEventListener(type, update))
      );
    }
    authors.forEach((a) => {
      a.addEventListener("click", () => {
        const pin = !a.classList.contains("pinned");
        authors.forEach((b) => b.classList.remove("pinned"));
        a.classList.toggle("pinned", pin);
        a.classList.remove("dismissed");
      });
      const reset = () => a.classList.remove("dismissed");
      a.addEventListener("mouseleave", reset);
      a.addEventListener("blur", () => {
        reset();
        a.classList.remove("pinned");
      });
    });
  }

  // Escape closes open tooltips (WCAG 1.4.13). It runs before reveal's own Escape,
  // which opens the slide overview, and only takes the key when a tooltip is open.
  function wireEscape() {
    window.addEventListener(
      "keydown",
      (e) => {
        if (e.key !== "Escape") return;
        const authors = [...document.querySelectorAll(".author")].filter(
          (a) => !a.classList.contains("dismissed") && (a.classList.contains("pinned") || a.matches(":hover, :focus-visible"))
        );
        const chartTip = !document.body.classList.contains("tips-dismissed") &&
          document.querySelector("[data-chart] :is(g[aria-label=tip], .hover-labels) text, .dots .dot:is(:hover, :focus-visible)");
        if (!authors.length && !chartTip) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        authors.forEach((a) => a.classList.replace("pinned", "dismissed") || a.classList.add("dismissed"));
        if (chartTip) document.body.classList.add("tips-dismissed");
      },
      true
    );
    document.addEventListener("pointermove", (e) => {
      if (e.target.closest?.(".plot, .dots")) document.body.classList.remove("tips-dismissed");
    });
  }

  // Slide dots along the bottom bar, in place of reveal's progress bar: small for
  // slides, medium for section and title slides, large for the current slide. Each
  // shows its slide's title on hover and goes to it when selected. Only the current
  // dot is in the tab order; reveal's arrow keys move between slides.
  function buildDots() {
    const nav = document.createElement("nav");
    nav.className = "dots";
    nav.setAttribute("aria-label", "Slides");
    Reveal.getSlides().forEach((slide, i) => {
      const title = (slide.querySelector("h1, h2")?.textContent ?? `Slide ${i + 1}`).replace(/\s+/g, " ").trim();
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "dot";
      dot.classList.toggle("section", slide.matches(".section-slide, .title-slide"));
      dot.tabIndex = -1;
      dot.setAttribute("aria-label", `Slide ${i + 1}: ${title}`);
      const tip = document.createElement("span");
      tip.className = "dot-tip";
      tip.setAttribute("aria-hidden", "true");
      tip.textContent = title;
      dot.append(tip);
      dot.addEventListener("click", () => Reveal.slide(i));
      ["pointerenter", "focus"].forEach((type) => dot.addEventListener(type, () => requestAnimationFrame(() => keepInFrame(tip))));
      nav.append(dot);
    });
    document.querySelector(".reveal").append(nav);
  }

  // A dot's tooltip is centred on its dot, then shifted sideways to stay inside the frame
  function keepInFrame(tip, pad = 6) {
    tip.style.setProperty("--shift", "0px");
    const r = tip.getBoundingClientRect();
    const shift = r.left < pad ? pad - r.left : r.right > innerWidth - pad ? innerWidth - pad - r.right : 0;
    tip.style.setProperty("--shift", `${shift}px`);
  }

  function markCurrent(index) {
    document.querySelectorAll(".dots .dot").forEach((dot, i) => {
      const current = i === index;
      dot.classList.toggle("current", current);
      dot.tabIndex = current ? 0 : -1;
      if (current) dot.setAttribute("aria-current", "step");
      else dot.removeAttribute("aria-current");
    });
    document.body.classList.toggle("on-first-slide", index === 0);
  }

  // Only the current slide is in the tab order and the accessibility tree
  function setInert(current) {
    if (Reveal.isPrintView()) return;
    document.querySelectorAll(".reveal .slides > section").forEach((s) => (s.inert = s !== current));
  }

  function start() {
    buildToolbars();
    wireAuthors();
    wireEscape();
    Reveal.on("ready", (e) => {
      if (Reveal.isPrintView()) document.querySelectorAll("[data-chart]").forEach(draw);
      else show(e.currentSlide);
      setInert(e.currentSlide);
      if (!Reveal.isPrintView()) buildDots();
      markCurrent(e.indexh);
    });
    Reveal.on("slidechanged", (e) => {
      show(e.currentSlide);
      setInert(e.currentSlide);
      markCurrent(e.indexh);
    });
  }

  // Shared Plot defaults: every chart fills the same 5:4 box
  function plot(options) {
    return Plot.plot({
      width: 560,
      height: 448,
      marginLeft: 56,
      marginRight: 20,
      marginTop: 28,
      marginBottom: options.x?.label ? 56 : 36,
      ...options,
      style: {
        fontSize: "18px",
        fontFamily: "var(--font-sans)",
        background: "transparent",
        overflow: "visible",
        ...options.style,
      },
    });
  }

  // Wide rows to long: columns maps each column to its series name
  function long(rows, x, columns) {
    return rows.flatMap((d) =>
      Object.entries(columns).map(([column, series]) => ({ [x]: d[x], series, value: d[column] }))
    );
  }

  // Long rows to a table with one column per series
  function pivot(rows, { key, keyLabel, series = "series", value = "value", order }) {
    const names = order ?? [...new Set(rows.map((d) => d[series]))];
    const byKey = d3.groups(rows, (d) => d[key]).map(([k, g]) => ({
      key: k,
      ...Object.fromEntries(g.map((d) => [d[series], d[value]])),
    }));
    return {
      columns: [{ label: keyLabel, value: (d) => d.key }, ...names.map((n) => ({ label: n, value: (d) => d[n] }))],
      rows: byKey,
    };
  }

  // Hover markers: a dot with a white ring. A tip's arrow stops markerGap from its point.
  const marker = { r: 6, stroke: "white", strokeWidth: 2, className: "tip-marker" };
  const markerGap = marker.r + marker.strokeWidth / 2;

  // Hover tooltip for a line chart, with a marker on the line at the point it describes.
  // The marker and the tip share one pointer, so they always pick the same point. The tip
  // is moved so its arrow ends at the marker's edge, level with it or centred on it.
  // fill is a color or a channel such as "series"; pointer is Plot.pointer or Plot.pointerX.
  function lineTip(rows, { x, y, fill = color.sea, title, pointer = Plot.pointer }) {
    return [
      Plot.dot(rows, pointer({ x, y, fill, ...marker })),
      Plot.tip(rows, pointer({ x, y, title, render: offsetTip(markerGap) })),
    ];
  }

  // Hover labels for a stacked area chart: a rule at the hovered year with the year on the
  // x axis, a marker on each band's outer edge, and beside each marker a label in the
  // band's color giving its value. years has one row per year: the year,
  // edge: {band name: outer edge of that band}, and value: {band name: value}. bands are
  // {name, label, color}; format turns a value into text. Every mark points at the same
  // target (px, py), so all of them pick the same year.
  function stackTip(years, { bands, format }) {
    const target = { px: "year", py: () => 0 };
    return [
      Plot.ruleX(years, Plot.pointerX({ x: "year", stroke: "#333", className: "tip-marker", ...target })),
      ...bands.map((b) =>
        Plot.dot(years, Plot.pointerX({ x: "year", y: (d) => d.edge[b.name], fill: b.color, ...marker, ...target }))
      ),
      Plot.dot(years, Plot.pointerX({ x: "year", ...target, render: stackLabels(years, bands, format) })),
    ];
  }

  // Render function drawing stackTip's labels for the hovered year. Labels sit on the
  // side of the rule with more room, level with their markers where they fit, and are
  // spread apart vertically where markers are close, with a line back to each marker.
  function stackLabels(years, bands, format) {
    const height = 26;
    const space = 3;
    const pad = 7;
    return (index, scales, values, dimensions) => {
      const g = d3.create("svg:g").attr("class", "tip-marker hover-labels").attr("pointer-events", "none");
      if (!index.length) return g.node();
      const d = years[index[0]];
      const { width, height: plotHeight, marginLeft, marginRight, marginTop, marginBottom } = dimensions;
      const x = scales.x(d.year);
      const dir = x > (marginLeft + width - marginRight) / 2 ? -1 : 1;
      const items = bands
        .map((b) => ({ b, dotY: scales.y(d.edge[b.name]), text: `${b.label}: ${format(d.value[b.name])}` }))
        .sort((a, b) => a.dotY - b.dotY);
      spread(items, height + space, marginTop + height / 2, plotHeight - marginBottom - height / 2);
      const lx = x + dir * (markerGap + 12);
      for (const it of items) {
        const fill = it.b.color;
        // A white halo under each line keeps it visible over its own band's color
        for (const [cls, stroke, width] of [["halo", "white", 4], ["link", fill, 1.5]]) {
          g.append("line").attr("class", cls)
            .attr("x1", x + dir * markerGap).attr("y1", it.dotY)
            .attr("x2", lx).attr("y2", it.y)
            .attr("stroke", stroke).attr("stroke-width", width);
        }
        label(g, lx, it.y, it.text, fill, dir);
      }
      label(g, x, plotHeight - marginBottom + 6 + height / 2, String(d.year), "#333", 0);
      sizeLabels(g.node());
      return g.node();
    };

    // A label: white text on a box of the given fill, outlined in white to stand apart from
    // an area of the same color. dir 1 puts the box to the right of x, -1 to the left, 0
    // centred on it. The box is sized once the text can be measured.
    function label(g, x, y, text, fill, dir) {
      const anchor = dir > 0 ? "start" : dir < 0 ? "end" : "middle";
      const box = g.append("g").attr("class", "hover-label").attr("transform", `translate(${x},${y})`).attr("visibility", "hidden");
      box.append("rect").attr("fill", fill).attr("stroke", "white").attr("rx", 3).attr("y", -height / 2).attr("height", height);
      box.append("text")
        .attr("x", dir * pad).attr("dy", "0.35em").attr("text-anchor", anchor)
        .attr("fill", "white").attr("font-size", 16).text(text);
    }

    // Text can only be measured once the labels are on the page: Plot inserts them after
    // this render returns, so measuring waits a microtask, or a frame if still detached.
    function sizeLabels(node, frames = 0) {
      Promise.resolve().then(() => {
        if (!node.isConnected) {
          if (frames < 10) requestAnimationFrame(() => sizeLabels(node, frames + 1));
          return;
        }
        for (const box of node.querySelectorAll(".hover-label")) {
          const t = box.querySelector("text").getBBox();
          const rect = box.querySelector("rect");
          rect.setAttribute("x", t.x - pad);
          rect.setAttribute("width", t.width + 2 * pad);
          box.removeAttribute("visibility");
        }
      });
    }
  }

  // Positions items (sorted by dotY) at y as close to dotY as they can be while keeping
  // step apart and within lo..hi
  function spread(items, step, lo, hi) {
    items.forEach((it, i) => (it.y = Math.max(it.dotY, i ? items[i - 1].y + step : lo)));
    for (let i = items.length - 1; i >= 0; i--) {
      const max = i === items.length - 1 ? hi : items[i + 1].y - step;
      if (items[i].y > max) items[i].y = max;
    }
  }

  // Render transform for Plot.tip: places each tip's arrow gap pixels from its point, on
  // the side the tip opens. Plot's tip path starts with the arrow's first edge; the next
  // command is "v" for the "left" and "right" anchors, whose box sits beside the point,
  // and "h" for the others, whose box sits above or below it.
  // The point's position comes from the channel values, which Plot rounds to the pixel
  // for the tip's own anchor. Plot draws the tip's box and arrow after the mark renders
  // (in a microtask, or the next animation frame before the plot is on the page), and
  // picks the side then, so the shift waits until the arrow exists.
  function offsetTip(gap) {
    return (index, scales, values, dimensions, context, next) => {
      const g = next(index, scales, values, dimensions, context);
      let frames = 0;
      const shift = () => {
        const tips = [...g.children];
        if (tips.some((tip) => !tip.querySelector("path")?.getAttribute("d"))) {
          if (++frames < 10) requestAnimationFrame(shift);
          return;
        }
        tips.forEach((tip, j) => {
          const arrow = tip.querySelector("path").getAttribute("d").match(/^M0,0l(-?[\d.]+),(-?[\d.]+)([hv])/);
          const at = tip.getAttribute("transform")?.match(/translate\((-?[\d.]+),(-?[\d.]+)\)/);
          if (!arrow || !at) return;
          const [dx, dy, beside] = [+arrow[1], +arrow[2], arrow[3] === "v"];
          const x = values.x?.[index[j]] ?? +at[1];
          const y = values.y?.[index[j]] ?? +at[2];
          const [ox, oy] = beside ? [Math.sign(dx) * gap, 0] : [0, Math.sign(dy) * gap];
          tip.setAttribute("transform", `translate(${x + ox},${y + oy})`);
        });
      };
      if (index.length) Promise.resolve().then(shift);
      return g;
    };
  }

  const fmt = {
    int: d3.format(",.0f"),
    one: d3.format(",.1f"),
    year: (d) => String(d),
  };

  // Outcome against GDP per capita for three periods, with a fitted curve per period
  // (fig3, fig10, fig11). The fitted values sit in one column per period: <fit><period>.
  function incomeScatter(rows, { name, period, y, fit, yAxis, yLabel, tipY, periodLabel, incomeLabelY }) {
    const periods = [1950, 1990, 2020];
    const labels = periods.map(periodLabel);
    const fitted = rows
      .filter((d) => d[fit + d[period]] != null)
      .map((d) => ({ ...d, fitted: d[fit + d[period]] }))
      .sort((a, b) => a.gdppc - b.gdppc);
    const label = (d) => periodLabel(d[period]);
    return plot({
      height: 412,  // the color legend above takes the rest of the 448px figure height
      x: {
        type: "log",
        ticks: [1000, 3000, 10000, 30000, 100000].filter((t) => t <= d3.max(rows, (d) => d.gdppc)),
        tickFormat: (d) => `${d / 1000}k`,
        label: "GDP per capita",
        labelAnchor: "center",
        labelArrow: "none",
      },
      y: { label: yLabel, ...yAxis },
      color: { domain: labels.slice().reverse(), range: [color.turquoise, color.vermillion, color.sea], legend: true },
      symbol: { domain: labels, range: ["circle", "triangle", "diamond"] },
      marks: [
        Plot.ruleX([2500, 12000], { stroke: color.gray, strokeDasharray: "4,3" }),
        Plot.text(
          [
            { x: 1300, text: "Low" },
            { x: 5500, text: "Lower\nmiddle" },
          ],
          { x: "x", y: incomeLabelY, text: "text", fill: color.gray }
        ),
        Plot.dot(rows, { x: "gdppc", y, stroke: label, symbol: label, r: 3, strokeOpacity: 0.6 }),
        Plot.line(fitted, { x: "gdppc", y: "fitted", stroke: label, z: period, strokeWidth: 2.5 }),
        Plot.tip(
          rows,
          Plot.pointer({
            x: "gdppc",
            y,
            title: (d) =>
              [`${d[name]}, ${d.year ?? d[period]}`, `GDP per capita: $${fmt.int(d.gdppc)}`, tipY(d)].join("\n"),
          })
        ),
      ],
    });
  }

  // Table for incomeScatter charts: one row per country and year
  function incomeTable(rows, { name, y, yLabel }) {
    return {
      columns: [
        { label: "Country", value: (d) => d[name] },
        { label: "Year", value: (d) => d.year ?? d.time },
        { label: "GDP per capita (US$)", value: (d) => Math.round(d.gdppc) },
        { label: yLabel, value: (d) => d[y] },
      ],
      rows: rows.slice().sort((a, b) => d3.ascending(a[name], b[name]) || d3.ascending(a.year ?? a.time, b.year ?? b.time)),
    };
  }

  return { register, start, csv, color, plot, long, pivot, fmt, lineTip, stackTip, incomeScatter, incomeTable };
})();
