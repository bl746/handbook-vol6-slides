// Literacy rate against GDP per capita, first observation in the 1950s, 1990s and
// 2020s (fig11).

Deck.register("literacy", {
  data: () => d3.csvParse(Deck.csv.literacy, d3.autoType),

  table: (rows) => Deck.incomeTable(rows, { name: "entity", y: "lr", yLabel: "Literacy rate (%)" }),

  render: (rows) =>
    Deck.incomeScatter(rows, {
      name: "entity",
      period: "decade",
      y: "lr",
      fit: "lrhat",
      yLabel: "Literacy rate",
      yAxis: { domain: [-19, 100], ticks: [0, 50, 100], tickFormat: (d) => `${d}%` },
      tipY: (d) => `Literacy rate: ${Deck.fmt.int(d.lr)}%`,
      periodLabel: (d) => `${d}s`,
      incomeLabelY: -10,
    }),
});
