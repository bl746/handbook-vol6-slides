// The 6.3 billion people in low- and middle-income countries, circa 2022, by whether
// their household is covered by social protection (fig_coverage). The first group
// merges adequate and inadequate benefits.

Deck.register("coverage", {
  data: () => {
    const label = {
      "Benefits, adequate": "Household receives benefits",
      "Social insurance contributor only": "Pays into social insurance only",
      "Not covered": "Not covered",
    };
    let top = 0;
    return d3.csvParse(Deck.csv.coverage, d3.autoType).map((d) => {
      const bottom = top;
      top += d.bn;
      return { label: label[d.group], bn: d.bn, bottom, top, mid: (bottom + top) / 2 };
    });
  },

  table: (rows) => ({
    columns: [
      { label: "Coverage", value: (d) => d.label },
      { label: "Billions of people", value: (d) => d.bn },
    ],
    rows,
  }),

  render(rows) {
    const { color, fmt } = Deck;
    const total = d3.sum(rows, (d) => d.bn);
    const title = (d) =>
      `${d.label}\n${fmt.one(d.bn)} billion people, ${Math.round((100 * d.bn) / total)}% of ${fmt.one(total)} billion`;
    return Deck.plot({
      marginLeft: 20,
      x: { domain: [0, 1], axis: null },
      y: { domain: [0, total], axis: null },
      color: { domain: rows.map((d) => d.label), range: [color.sea, color.turquoise, color.vermillion] },
      marks: [
        Plot.rect(rows, { x1: 0, x2: 1, y1: "bottom", y2: "top", fill: "label", stroke: "white", strokeWidth: 2 }),
        Plot.text(rows, { x: 0.5, y: "mid", text: (d) => `${d.label}\n${fmt.one(d.bn)} billion`, fill: "white", fontSize: 20 }),
        Plot.tip(rows, Plot.pointer({ x: 0.5, y: "mid", title, maxRadius: 200 })),
      ],
    });
  },
});
