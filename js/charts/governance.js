// Electoral democracy (V-Dem polyarchy) in OECD and non-OECD countries, and state
// capacity (BTI) in non-OECD countries, each indexed to 2006 = 100 (fig6).
// Non-OECD means the countries the BTI covers.

Deck.register("governance", {
  data: () => {
    const rows = d3.csvParse(Deck.csv.governance, d3.autoType);
    const nonOecd = rows.filter((d) => d.bti_country === 1);
    const oecd = rows.filter((d) => d.oecd1989 === 1);
    return [
      ...nonOecd.map((d) => ({ year: d.year, series: "Democracy, non-OECD", value: d.v2x_polyarchy })),
      ...oecd.map((d) => ({ year: d.year, series: "Democracy, OECD", value: d.v2x_polyarchy })),
      ...nonOecd.map((d) => ({ year: d.year, series: "State capacity, non-OECD", value: d.state_capacity })),
    ].filter((d) => d.value != null);
  },

  table: (rows) => Deck.pivot(rows, { key: "year", keyLabel: "Year (index, 2006 = 100)" }),

  render(rows) {
    const { color, fmt } = Deck;
    const series = [
      { name: "Democracy, non-OECD", color: color.reddish, x: 2021.8, y: 92.3, anchor: "end" },
      { name: "Democracy, OECD", color: color.orangebrown, x: 2010, y: 98.3, anchor: "start" },
      { name: "State capacity, non-OECD", color: color.sky, x: 2016, y: 104.3, anchor: "start" },
    ];
    const last = rows.filter((d) => d.year === 2024);
    return Deck.plot({
      marginRight: 50,
      x: { ticks: [2006, 2015, 2024], tickFormat: "d", label: null },
      y: { domain: [89, 106], ticks: [90, 95, 100, 105], label: "Index (2006 = 100)" },
      color: { domain: series.map((s) => s.name), range: series.map((s) => s.color) },
      marks: [
        Plot.ruleY([100], { stroke: color.gray }),
        Plot.lineY(rows, { x: "year", y: "value", stroke: "series", strokeWidth: 2.5 }),
        Plot.dot([{ year: 2006, value: 100 }], { x: "year", y: "value", fill: "black", r: 4 }),
        Plot.dot(last, { x: "year", y: "value", fill: "series", r: 4 }),
        Plot.text(last, { x: "year", y: "value", text: (d) => fmt.one(d.value), fill: "series", textAnchor: "start", dx: 8 }),
        ...["start", "end"].map((anchor) =>
          Plot.text(
            series.filter((s) => s.anchor === anchor),
            { x: "x", y: "y", text: (s) => s.name.replace(", ", ",\n"), fill: "name", textAnchor: anchor }
          )
        ),
        ...Deck.lineTip(rows, {
          x: "year",
          y: "value",
          fill: "series",
          title: (d) => `${d.series}, ${d.year}\n${fmt.one(d.value)}`,
        }),
      ],
    });
  },
});
