// Real yearly change in DAC members' net official development assistance, excluding
// debt relief and in-donor refugee costs (fig_aid_growth). 2025 is preliminary.

Deck.register("aid", {
  data: () => d3.csvParse(Deck.csv.aid, d3.autoType),

  table: (rows) => ({
    columns: [
      { label: "Year", value: (d) => (d.year === 2025 ? "2025 (preliminary)" : d.year) },
      { label: "Real change in net ODA (%)", value: (d) => d.g },
    ],
    rows,
  }),

  render(rows) {
    const { color, fmt } = Deck;
    const prelim = (d) => d.year === 2025;
    const title = (d) => `${d.year}${prelim(d) ? " (preliminary)" : ""}\n${d.g >= 0 ? "+" : "−"}${fmt.one(Math.abs(d.g))}%`;
    return Deck.plot({
      x: {
        type: "band",
        domain: rows.map((d) => d.year),
        tickFormat: (y) => (y % 5 === 0 ? String(y) : ""),
        tickSize: 0,
        tickPadding: 12,
        label: null,
        padding: 0.2,
      },
      y: { domain: [-25, 15], ticks: d3.range(-25, 16, 5), label: "DAC net ODA, real change, %" },
      marks: [
        Plot.barY(rows, {
          x: "year",
          y: "g",
          fill: (d) => (d.g >= 0 ? color.sea : color.vermillion),
          fillOpacity: (d) => (prelim(d) ? 0.5 : 1),
        }),
        Plot.ruleY([0]),
        Plot.tip(rows, Plot.pointerX({ x: "year", y: "g", title })),
      ],
    });
  },
});
