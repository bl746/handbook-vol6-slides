// Share of workers in informal employment by UN SDG region (fig8).

Deck.register("informal", {
  data: () =>
    Deck.long(d3.csvParse(Deck.csv.informal, d3.autoType), "year", {
      informalSSA: "Sub-Saharan Africa",
      informalCSA: "Central & South Asia",
      informalESEA: "East & SE Asia",
      informalLAC: "LatAm",
      informalNAWA: "N. Africa & W. Asia",
      informalENA: "Europe & N. America",
    }).filter((d) => d.value != null),

  table: (rows) => Deck.pivot(rows, { key: "year", keyLabel: "Year (% of workers informal)" }),

  render(rows) {
    const { color, fmt } = Deck;
    // Label heights are spread apart where the lines end close together
    const series = [
      { name: "Sub-Saharan Africa", color: color.turquoise, labelY: 91 },
      { name: "Central & South Asia", color: color.reddish, labelY: 82 },
      { name: "East & SE Asia", color: color.sea, labelY: 58 },
      { name: "LatAm", color: color.orangebrown, labelY: 51.3 },
      { name: "N. Africa & W. Asia", color: color.vermillion, labelY: 44.5 },
      { name: "Europe & N. America", color: color.sky, labelY: 7.7 },
    ];
    const lastYear = d3.max(rows, (d) => d.year);
    return Deck.plot({
      marginRight: 200,
      x: { ticks: [2005, 2015, 2024], tickFormat: "d", label: null },
      y: { domain: [0, 100], ticks: [0, 20, 40, 60, 80, 100], tickFormat: (d) => `${d}%`, label: "Informal employment" },
      color: { domain: series.map((s) => s.name), range: series.map((s) => s.color) },
      marks: [
        Plot.ruleY([0, 100], { stroke: color.gray }),
        Plot.lineY(rows, { x: "year", y: "value", stroke: "series", strokeWidth: 2.5 }),
        Plot.dot(rows.filter((d) => d.year === lastYear), { x: "year", y: "value", fill: "series", r: 4 }),
        Plot.text(series, { x: lastYear, y: "labelY", text: "name", fill: "name", textAnchor: "start", dx: 8 }),
        Plot.tip(
          rows,
          Plot.pointer({
            x: "year",
            y: "value",
            stroke: "series",
            title: (d) => `${d.series}, ${d.year}\n${fmt.one(d.value)}% of workers informal`,
          })
        ),
      ],
    });
  },
});
