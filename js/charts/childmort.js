// Under-five mortality per 1,000 live births by region, log scale (fig4).
// Columns are q5<UN location id>.

Deck.register("childmort", {
  data: () =>
    Deck.long(d3.csvParse(Deck.csv.childmort, d3.autoType), "time", {
      q51508: "SSA",
      q51513: "S. Asia",
      q51512: "MENAAP",
      q51511: "LatAm",
      q51509: "E. Asia",
      q51503: "HICs",
    }),

  table: (rows) => Deck.pivot(rows, { key: "time", keyLabel: "Year (deaths per 1,000 births)" }),

  render(rows) {
    const { color, fmt } = Deck;
    const series = [
      { name: "SSA", color: color.turquoise, labelY: 66.08 },
      { name: "S. Asia", color: color.reddish, labelY: 32.94 },
      { name: "MENAAP", color: color.vermillion, labelY: 21 },
      { name: "LatAm", color: color.orangebrown, labelY: 15.2 },
      { name: "E. Asia", color: color.sea, labelY: 11 },
      { name: "HICs", color: color.sky, labelY: 4.59 },
    ];
    const last = rows.filter((d) => d.time === 2025);
    return Deck.plot({
      marginRight: 80,
      x: { tickFormat: "d", ticks: [1990, 2000, 2010, 2020], label: null },
      y: { type: "log", domain: [3, 300], ticks: [3, 10, 30, 100, 300], tickFormat: "d", label: "Under-five mortality" },
      color: { domain: series.map((s) => s.name), range: series.map((s) => s.color) },
      marks: [
        Plot.lineY(rows, { x: "time", y: "value", stroke: "series", strokeWidth: 2.5 }),
        Plot.dot(last, { x: "time", y: "value", fill: "series", r: 4 }),
        Plot.text(series, { x: 2025, y: "labelY", text: "name", fill: "name", textAnchor: "start", dx: 8 }),
        Plot.tip(
          rows,
          Plot.pointer({
            x: "time",
            y: "value",
            stroke: "series",
            title: (d) => `${d.series}, ${d.time}\n${fmt.one(d.value)} deaths per 1,000 births`,
          })
        ),
      ],
    });
  },
});
