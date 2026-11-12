// Mean years of education (ages 15-64) against GDP per capita, 1950, 1990 and 2020 (fig10).

Deck.register("schooling", {
  data: () => d3.csvParse(Deck.csv.schooling, d3.autoType),

  table: (rows) => Deck.incomeTable(rows, { name: "entity", y: "yrsedu", yLabel: "Years of education" }),

  render: (rows) =>
    Deck.incomeScatter(rows, {
      name: "entity",
      period: "year",
      y: "yrsedu",
      fit: "yrseduhat",
      yLabel: "Years of education",
      yAxis: { domain: [-3, 15], ticks: [0, 5, 10, 15] },
      tipY: (d) => `Years of education: ${Deck.fmt.one(d.yrsedu)}`,
      periodLabel: String,
      incomeLabelY: -1.5,
    }),
});
