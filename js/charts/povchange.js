// Yearly change in the number of people in extreme poverty ($3.00/day, 2021 PPP),
// or the number itself (fig_povchange). 2025-26 are nowcasts.

Deck.register("povchange", {
  data: () => d3.csvParse(Deck.csv.povchange, d3.autoType),

  table: (rows) => ({
    columns: [
      { label: "Year", value: (d) => (d.nowcast ? `${d.year} (nowcast)` : d.year) },
      { label: "Millions in extreme poverty", value: (d) => d.poorpop },
      { label: "Change on the year (millions)", value: (d) => d.dpoor },
    ],
    rows,
  }),

  render(rows, { view }) {
    const { color, fmt } = Deck;
    const fill = (d) => (d.nowcast ? color.sky : d.dpoor >= 0 ? color.vermillion : color.sea);
    const millions = (v) => `${fmt.int(Math.abs(v))} million`;
    const title = (d) =>
      [
        `${d.year}${d.nowcast ? " (nowcast)" : ""}`,
        `${millions(d.poorpop)} poor`,
        `${d.dpoor >= 0 ? "+" : "−"}${millions(d.dpoor)} on the year`,
      ].join("\n");
    const x = {
      type: "band",
      domain: rows.map((d) => d.year),
      tickFormat: (y) => (y % 5 === 0 ? String(y) : ""),
      tickSize: 0,
      label: null,
      padding: 0.2,
    };

    if (view === "level") {
      return Deck.plot({
        x,
        y: { domain: [0, 2400], label: "Millions in extreme poverty", grid: true },
        marks: [
          Plot.lineY(rows, { x: "year", y: "poorpop", stroke: color.sea, strokeWidth: 2.5 }),
          Plot.dot(rows, { x: "year", y: "poorpop", fill, r: 4 }),
          Plot.tip(rows, Plot.pointerX({ x: "year", y: "poorpop", title })),
        ],
      });
    }
    return Deck.plot({
      x,
      y: { domain: [-155, 70], label: "Yearly change, millions of poor" },
      marks: [
        Plot.barY(rows, { x: "year", y: "dpoor", fill }),
        Plot.ruleY([0]),
        Plot.tip(rows, Plot.pointerX({ x: "year", y: "dpoor", title })),
      ],
    });
  },
});
