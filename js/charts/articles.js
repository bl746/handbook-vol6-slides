// Development economics articles published per year in leading journals, with the
// publication years of the Handbook's volumes (fig1).

Deck.register("articles", {
  data: () =>
    d3.csvParse(Deck.csv.articles, d3.autoType)
      .filter((d) => d.year <= 2024)
      .map((d) => ({ year: d.year, n: d._freq })),

  table: (rows) => ({
    columns: [
      { label: "Year", value: (d) => d.year },
      { label: "Articles", value: (d) => d.n },
    ],
    rows,
  }),

  render(rows) {
    const { color } = Deck;
    const volumes = [
      { year: 1987, top: 75, label: "I", anchor: "end" },
      { year: 1988, top: 75, label: "II", anchor: "start" },
      { year: 1995, top: 78, label: "III", anchor: "start" },
      { year: 2007, top: 150, label: "IV", anchor: "end" },
      { year: 2010, top: 188, label: "V", anchor: "start" },
      { year: 2026, top: 380, label: "Vol. VI", anchor: "end" },
    ];
    const volume = { stroke: color.vermillion, strokeDasharray: "4,3", strokeWidth: 1.5 };
    return Deck.plot({
      x: { domain: [1985, 2027], ticks: [1985, 1995, 2005, 2015, 2025], tickFormat: "d", label: null },
      y: { domain: [0, 400], label: "Dev econ articles published" },
      marks: [
        Plot.ruleY([0], { stroke: color.gray }),
        Plot.ruleX(volumes, { x: "year", y1: 3, y2: "top", ...volume }),
        ...["start", "end"].map((anchor) =>
          Plot.text(
            volumes.filter((d) => d.anchor === anchor),
            { x: "year", y: 20, text: "label", textAnchor: anchor, dx: anchor === "start" ? 5 : -5, fill: color.vermillion }
          )
        ),
        Plot.lineY(rows, { x: "year", y: "n", stroke: color.sea, strokeWidth: 2.5 }),
        ...Deck.lineTip(rows, { x: "year", y: "n", pointer: Plot.pointerX, title: (d) => `${d.year}\n${d.n} articles` }),
      ],
    });
  },
});
