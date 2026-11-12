// Share of countries (population over 1 million) with an ongoing civil conflict,
// and with a civil war (fig5).

Deck.register("conflict", {
  data: () =>
    Deck.long(d3.csvParse(Deck.csv.conflict, d3.autoType), "year", {
      conflict: "Any civil conflict",
      war: "Civil war",
    }),

  table: (rows) => Deck.pivot(rows, { key: "year", keyLabel: "Year (% of countries)" }),

  render(rows) {
    const { color, fmt } = Deck;
    const series = [
      { name: "Any civil conflict", color: color.sky, labelY: 14 },
      { name: "Civil war", color: color.reddish, labelY: 7.7 },
    ];
    const lastYear = d3.max(rows, (d) => d.year);
    return Deck.plot({
      x: { tickFormat: "d", ticks: [1990, 2000, 2010, 2020], label: null },
      y: { domain: [0, 25], ticks: [0, 10, 20], tickFormat: (d) => `${d}%`, label: "Countries in conflict" },
      color: { domain: series.map((s) => s.name), range: series.map((s) => s.color) },
      marks: [
        Plot.ruleY([0], { stroke: color.gray }),
        Plot.lineY(rows, { x: "year", y: "value", stroke: "series", strokeWidth: 2.5 }),
        Plot.dot(rows.filter((d) => d.year === lastYear), { x: "year", y: "value", fill: "series", r: 4 }),
        Plot.text(series, { x: 2007, y: "labelY", text: "name", fill: "name" }),
        Plot.tip(
          rows,
          Plot.pointer({
            x: "year",
            y: "value",
            stroke: "series",
            title: (d) => `${d.series}, ${d.year}\n${fmt.one(d.value)}% of countries`,
          })
        ),
      ],
    });
  },
});
