// Life expectancy against GDP per capita, 1950, 1990 and 2020 (fig3).

Deck.register("lifeexp", {
  data: () => d3.csvParse(Deck.csv.lifeexp, d3.autoType),

  table: (rows) => Deck.incomeTable(rows, { name: "location", y: "lex", yLabel: "Life expectancy (years)" }),

  render: (rows) =>
    Deck.incomeScatter(rows, {
      name: "location",
      period: "time",
      y: "lex",
      fit: "lexhat",
      yLabel: "Life expectancy",
      yAxis: { domain: [15, 85], ticks: [20, 40, 60, 80] },
      tipY: (d) => `Life expectancy: ${Deck.fmt.one(d.lex)} years`,
      periodLabel: String,
      incomeLabelY: 18,
    }),
});
