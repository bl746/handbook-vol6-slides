// Real income growth by global income percentile, 1980-2016: the elephant curve (fig9).
// The percentiles are unevenly spaced (10, 11, ..., 99, 99.1, ..., 99.999), so the x
// axis is the row's position, labeled with its percentile.

Deck.register("elephant", {
  data: () =>
    d3.csvParse(Deck.csv.elephant, d3.autoType).map((d, i) => ({
      x: i + 1,
      percentile: String(d.incomegroup),
      growth: d.cumulativegrowthrate,
    })),

  table: (rows) => ({
    columns: [
      { label: "Income percentile", value: (d) => d.percentile },
      { label: "Real income growth, 1980–2016 (%)", value: (d) => d.growth },
    ],
    rows,
  }),

  render(rows) {
    const { color } = Deck;
    const tickLabel = { 1: "10", 41: "50", 81: "90", 90: "99", 99: "", 108: "", 117: "99.999" };
    const note = { fill: color.vermillion, lineAnchor: "top" };
    const group = { fill: color.gray, lineAnchor: "top" };
    return Deck.plot({
      marginRight: 30,
      x: {
        domain: [1, 117],
        ticks: Object.keys(tickLabel).map(Number),
        tickFormat: (d) => tickLabel[d],
        label: "Income percentile",
        labelAnchor: "center",
        labelArrow: "none",
      },
      y: { domain: [0, 250], label: "Real income growth (%)" },
      marks: [
        Plot.ruleY([0], { stroke: color.gray }),
        Plot.ruleX([41, 90], { y1: 0, y2: 225, stroke: color.vermillion, strokeDasharray: "2,3", strokeWidth: 1.5 }),
        Plot.text([{ x: 39, y: 225, text: "Bottom 50%\n12% of\ngrowth" }], { x: "x", y: "y", text: "text", textAnchor: "end", ...note }),
        Plot.text([{ x: 92, y: 225, text: "Top 1%\n27% of\ngrowth" }], { x: "x", y: "y", text: "text", textAnchor: "start", ...note }),
        Plot.text(
          [
            { x: 19, y: 52, text: "Emerging\ncountries" },
            { x: 67, y: 91, text: "Squeezed\nmiddle" },
            { x: 105, y: 52, text: "Global\nrich" },
          ],
          { x: "x", y: "y", text: "text", ...group }
        ),
        Plot.lineY(rows, { x: "x", y: "growth", stroke: color.sea, strokeWidth: 2.5 }),
        Plot.tip(
          rows,
          Plot.pointerX({ x: "x", y: "growth", title: (d) => `Percentile ${d.percentile}\n+${d.growth}% real income growth` })
        ),
      ],
    });
  },
});
