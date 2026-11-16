// People in extreme poverty in middle-income countries (up) and low-income countries
// (down), by the country's World Bank income group that year (fig7). Low-income counts
// are negated here so that they plot below zero.

Deck.register("povincome", {
  data: () =>
    d3.csvParse(Deck.csv.povincome, d3.autoType).map((d) =>
      d.income_group === "Low income" ? { ...d, poorpop: -d.poorpop } : d
    ),

  table: (rows) =>
    Deck.pivot(
      rows.map((d) => ({ ...d, poorpop: Math.abs(d.poorpop) })),
      { key: "year", keyLabel: "Year (millions in extreme poverty)", series: "income_group", value: "poorpop",
        order: ["Middle income", "Low income"] }
    ),

  render(rows) {
    const { color, fmt } = Deck;
    const group = (name) => rows.filter((d) => d.income_group === name);
    const years = d3.groups(rows, (d) => d.year).map(([year, g]) => {
      const mid = g.find((d) => d.income_group === "Middle income")?.poorpop ?? 0;
      const low = -(g.find((d) => d.income_group === "Low income")?.poorpop ?? 0);
      return {
        year,
        value: { "Middle income": mid, "Low income": low },
        edge: { "Middle income": mid, "Low income": -low },
      };
    });
    const bands = [
      { name: "Middle income", label: "Middle-income", color: color.sea },
      { name: "Low income", label: "Low-income", color: color.turquoise },
    ];
    const notes = [
      { from: 2001.1, to: 1999.5, y: -1590, textY: -1650, text: "China becomes\nmiddle-income" },
      { from: 2009.1, to: 2007.5, y: -590, textY: -650, text: "India becomes\nmiddle-income" },
    ];
    return Deck.plot({
      x: { tickFormat: "d", ticks: [1990, 2000, 2010, 2020], label: null },
      y: {
        domain: [-2200, 1100],
        ticks: [-2000, -1000, 0, 1000],
        tickFormat: (d) => fmt.int(Math.abs(d)),
        label: "Millions in extreme poverty",
      },
      marks: [
        ...bands.map((b) => Plot.areaY(group(b.name), { x: "year", y: "poorpop", fill: b.color })),
        Plot.ruleY([0], { stroke: "white" }),
        Plot.text([{ x: 2024, y: 150, text: "Middle-income" }], {
          x: "x", y: "y", text: "text", fill: "white", fontWeight: "bold", textAnchor: "end",
        }),
        Plot.text([{ x: 1990, y: -150, text: "Low-income" }], {
          x: "x", y: "y", text: "text", fill: "white", fontWeight: "bold", textAnchor: "start",
        }),
        Plot.arrow(notes, { x1: "from", x2: "to", y1: "y", y2: "y", stroke: "#555", headLength: 6 }),
        Plot.text(notes, { x: (d) => d.from + 0.3, y: "textY", text: "text", fill: "#555", textAnchor: "start", fontSize: 16 }),
        ...Deck.stackTip(years, { bands, format: (v) => `${fmt.int(v)} million` }),
      ],
    });
  },
});
