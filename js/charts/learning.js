// Harmonized test scores by World Bank region, 2010 and 2020, averaging the countries
// with scores in both years (fig12).

Deck.register("learning", {
  data: () => d3.csvParse(Deck.csv.learning, d3.autoType),

  table: (rows) => {
    const names = { SSF: "Sub-Saharan Africa", EAS: "East Asia & Pacific", LCN: "Latin America & Caribbean",
      MEA: "MENAAP", ECS: "Europe & Central Asia", NAC: "North America" };
    return Deck.pivot(
      rows.map((d) => ({ region: names[d.wb_region], year: String(d.year), score: d.learning })),
      { key: "region", keyLabel: "Region (harmonized test score)", series: "year", value: "score", order: ["2010", "2020"] }
    );
  },

  render(rows) {
    const { color, fmt } = Deck;
    const regions = [
      { code: "SSF", name: "SSA", color: color.turquoise, labelY: 388 },
      { code: "EAS", name: "E. Asia", color: color.sea, labelY: 500 },
      { code: "LCN", name: "LatAm", color: color.orangebrown, labelY: 430 },
      { code: "MEA", name: "MENAAP", color: color.vermillion, labelY: 410 },
      { code: "ECS", name: "ECA", color: color.sky, labelY: 480 },
      { code: "NAC", name: "N. America", color: color.gray, labelY: 526 },
    ];
    const byCode = new Map(regions.map((r) => [r.code, r]));
    const data = rows.map((d) => ({ ...d, region: byCode.get(d.wb_region).name }));
    const benchmarks = [
      { y: 300, text: "“Basic”" },
      { y: 625, text: "“Advanced”" },
    ];
    return Deck.plot({
      marginRight: 130,
      x: { domain: [2010, 2020], ticks: [2010, 2020], tickFormat: "d", label: null, inset: 10 },
      y: { domain: [290, 640], ticks: [300, 400, 500, 600], label: "Harmonized test scores" },
      color: { domain: regions.map((r) => r.name), range: regions.map((r) => r.color) },
      marks: [
        Plot.ruleY(benchmarks, { y: "y", stroke: color.reddish, strokeDasharray: "4,3", strokeWidth: 1.5 }),
        Plot.text(benchmarks, { x: 2020, y: "y", text: "text", fill: color.reddish, textAnchor: "start", dx: 18 }),
        Plot.lineY(data, { x: "year", y: "learning", stroke: "region", strokeWidth: 2.5 }),
        Plot.dot(data, { x: "year", y: "learning", fill: "region", r: 4 }),
        Plot.text(regions, { x: 2020, y: "labelY", text: "name", fill: "name", textAnchor: "start", dx: 18 }),
        Plot.tip(
          data,
          Plot.pointer({ x: "year", y: "learning", title: (d) => `${d.region}, ${d.year}\nScore: ${fmt.int(d.learning)}` })
        ),
      ],
    });
  },
});
