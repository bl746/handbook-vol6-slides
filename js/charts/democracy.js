// Share of the world's extreme poor by the regime type of the country they live in
// (V-Dem Regimes of the World), stacked (fig_democracy). View "india" shows India
// as its own band (fig_democracy_india).

// Bands from bottom to top, and each band's share of the poor by year, for one view
function democracyShares(rows, view) {
  const { color } = Deck;
  const india = view === "india";
  const bands = [
    { name: "Liberal Democracy", label: "Liberal dem.", color: color.sky },
    { name: "Electoral Democracy", label: "Electoral democracy", color: color.sea },
    ...(india ? [{ name: "India", label: "India", color: color.reddish }] : []),
    { name: "Electoral Autocracy", label: "Electoral autocracy", color: color.turquoise },
    { name: "Closed Autocracy", label: "Closed autocracy", color: color.vermillion },
  ];
  const band = (d) => (india && d.india ? "India" : d.v2x_regime);
  const shares = d3
    .groups(rows, (d) => d.year)
    .flatMap(([year, group]) => {
      const total = d3.sum(group, (d) => d.poorpop);
      return bands.map((b) => ({
        year,
        band: b.name,
        share: (100 * d3.sum(group.filter((d) => band(d) === b.name), (d) => d.poorpop)) / total,
      }));
    });
  return { bands, shares };
}

Deck.register("democracy", {
  data: () => d3.csvParse(Deck.csv.democracy, d3.autoType),

  table(rows, { view }) {
    const { bands, shares } = democracyShares(rows, view);
    return Deck.pivot(shares, {
      key: "year",
      keyLabel: "Year (% of the world's extreme poor)",
      series: "band",
      value: "share",
      order: bands.map((b) => b.name).reverse(),
    });
  },

  render(rows, { view }) {
    const { color } = Deck;
    const india = view === "india";
    const { bands, shares } = democracyShares(rows, view);
    const years = d3.groups(shares, (d) => d.year).map(([year, group]) => {
      const share = (name) => group.find((d) => d.band === name).share;
      return {
        year,
        value: Object.fromEntries(bands.map((b) => [b.name, share(b.name)])),
        edge: Object.fromEntries(bands.map((b, i) => [b.name, d3.sum(bands.slice(0, i + 1), (s) => share(s.name))])),
      };
    });
    const label = { fill: "white", fontWeight: "bold", fontSize: 17 };
    const labels = india
      ? [
          { x: 1992, y: 80, text: "Closed autocracy", anchor: "start" },
          { x: 1996, y: 49, text: "Electoral autocracy", anchor: "start" },
          { x: 2006, y: 28, text: "India", anchor: "middle" },
          { x: 1993, y: 5.6, text: "Electoral democracy", anchor: "start" },
          { x: 2022, y: 5.6, text: "Liberal dem.", anchor: "end" },
        ]
      : [
          { x: 1992, y: 80, text: "Closed autocracy", anchor: "start" },
          { x: 1996, y: 49, text: "Electoral autocracy", anchor: "start" },
          { x: 1993, y: 18, text: "Electoral democracy", anchor: "start" },
          { x: 2017.1, y: 44, text: "India\nreclassified", anchor: "start", note: true },
          { x: 2022, y: 5.6, text: "Liberal dem.", anchor: "end" },
        ];
    const arrows = [
      { x1: 2022.5, y1: 6.6, x2: 2022.5, y2: 3 },
      ...(india ? [] : [{ x1: 2018.7, y1: 37.5, x2: 2017.1, y2: 37.5 }]),
    ];
    return Deck.plot({
      x: { ticks: [1990, 2000, 2010, 2020], tickFormat: "d", label: null },
      y: { domain: [0, 100], ticks: [0, 25, 50, 75, 100], tickFormat: (d) => `${d}%`, label: "Share of world's extreme poor" },
      color: { domain: bands.map((b) => b.name), range: bands.map((b) => b.color) },
      marks: [
        Plot.areaY(shares, {
          x: "year",
          y: "share",
          fill: "band",
          order: bands.map((b) => b.name),
          stroke: "white",
          strokeWidth: 0.75,
        }),
        ...["start", "middle", "end"].map((anchor) =>
          Plot.text(
            labels.filter((d) => d.anchor === anchor && !d.note),
            { x: "x", y: "y", text: "text", textAnchor: anchor, ...label }
          )
        ),
        Plot.text(labels.filter((d) => d.note), {
          x: "x", y: "y", text: "text", textAnchor: "start", ...label, fontWeight: "normal", fontSize: 15,
        }),
        Plot.arrow(arrows, { x1: "x1", y1: "y1", x2: "x2", y2: "y2", stroke: "white", headLength: 6, strokeWidth: 1.5 }),
        ...Deck.stackTip(years, { bands, format: (v) => `${Math.round(v)}%` }),
      ],
    });
  },
});
