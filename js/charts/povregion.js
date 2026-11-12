// People in extreme poverty ($3.00/day, 2021 PPP) by region, stacked (fig2).

Deck.register("povregion", {
  data: () => d3.csvParse(Deck.csv.povregion, d3.autoType),

  table: (rows) =>
    Deck.pivot(rows, {
      key: "year",
      keyLabel: "Year (millions in extreme poverty)",
      series: "region",
      value: "poorpop",
      order: ["East Asia & Pacific", "South Asia", "Sub-Saharan Africa", "MENAAP", "Rest of world"],
    }),

  render(rows) {
    const { color, fmt } = Deck;
    // Bottom to top
    const regions = [
      { name: "Rest of world", label: "Rest of world", color: color.sky },
      { name: "MENAAP", label: "MENAAP", color: color.vermillion },
      { name: "Sub-Saharan Africa", label: "SSA", color: color.turquoise },
      { name: "South Asia", label: "South Asia", color: color.reddish },
      { name: "East Asia & Pacific", label: "East Asia", color: color.sea },
    ];
    const value = (year, region) => rows.find((d) => d.year === year && d.region === region).poorpop;
    const years = d3.groups(rows, (d) => d.year).map(([year, group]) => ({
      year,
      total: d3.sum(group, (d) => d.poorpop),
      title: [
        String(year),
        ...regions
          .slice()
          .reverse()
          .map((r) => `${r.name}: ${fmt.int(group.find((d) => d.region === r.name).poorpop)} million`),
      ].join("\n"),
    }));
    const stackedBelow = (year, region) =>
      d3.sum(regions.slice(0, regions.findIndex((r) => r.name === region)), (r) => value(year, r.name));
    const labels = [
      { x: 1997, y: 1750, text: "East Asia" },
      { x: 1997, y: 900, text: "South Asia" },
      { x: 1997, y: 420, text: "SSA" },
      { x: 1997, y: stackedBelow(1997, "Rest of world") + value(1997, "Rest of world") / 2, text: "Rest of world" },
      { x: 2008, y: stackedBelow(2008, "MENAAP") + value(2008, "MENAAP") / 2, text: "MENAAP" },
    ];
    return Deck.plot({
      x: { tickFormat: "d", ticks: [1990, 2000, 2010, 2020], label: null },
      y: { domain: [0, 2500], label: "Millions in extreme poverty" },
      color: { domain: regions.map((r) => r.name), range: regions.map((r) => r.color) },
      marks: [
        Plot.areaY(rows, {
          x: "year",
          y: "poorpop",
          fill: "region",
          order: regions.map((r) => r.name),
          stroke: "white",
          strokeWidth: 0.5,
        }),
        Plot.text(labels, { x: "x", y: "y", text: "text", fill: "white", stroke: "#333", strokeWidth: 2.5 }),
        Plot.ruleX(years, Plot.pointerX({ x: "year", stroke: "#333" })),
        Plot.tip(years, Plot.pointerX({ x: "year", y: "total", title: "title" })),
      ],
    });
  },
});
