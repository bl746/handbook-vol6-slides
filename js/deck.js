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
          document.querySelector("[data-chart] g[aria-label=tip] text, .dots .dot:is(:hover, :focus-visible)");
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

  return { register, start, csv, color, plot, long, pivot, fmt, incomeScatter, incomeTable };
})();
