# Web slides

Interactive version of the deck, built to be embedded in an iframe on egc.yale.edu.
It is a static site: upload this folder as it is. There is no build step.
The text follows the Overleaf deck (`Apps/Overleaf/Handbook of Development Economics Introduction Slides/main.tex`),
with each `\pause` as a reveal fragment; edits there need copying here by hand.

- `index.html` — the slides (reveal.js 5.1.0)
- `js/deck.js` — draws each chart when its slide is first shown; shared colors and Plot defaults
- `js/charts/*.js` — one file per chart (Observable Plot 0.6.16, D3 7.9.0)
- `data/*.js` — chart data as CSV text, written by the do-files in `slides/` (via `slides/webdata.do`)
- `fonts/` — Mallory and YaleNew web fonts, taken from egc.yale.edu's stylesheet
- `img/` — the climate map (`slides/fig_cdd.py` with a `.png` output) and author headshots:
  square photos in `img/headshots/`, made round with their white ring into `img/bubbles/` by
  `uv run --with pillow python3 img/make_bubbles.py` (run from `webslides/`; rerun after adding a photo)
- `lib/` — copies of the libraries, so the deck never depends on a CDN
- `embed-test.html` — a stand-in host page for testing the iframe

## Updating

Browsers, Safari especially inside an iframe, keep old copies of the stylesheet and script.
After changing `css/deck.css` or `js/deck.js`, change the `?v=` date on their links in
`index.html` (and on the iframe's `src` in `embed-test.html`) so viewers get the new files.

## Viewing locally

Open `index.html` or `embed-test.html` in a browser. The chart data comes in through `<script>` tags,
which browsers allow for pages opened from disk.
Press `S` to open the speaker notes and `?` to list the keyboard shortcuts.
Adding `?print-pdf` to the URL gives a printable view.

## Data

Each slide figure's do-file also writes the data its web chart reads, e.g.
`slides/fig_povchange.do` → `data/povchange.js`, through `do slides/webdata.do <name> <varlist> [if]`.
Rerun the do-file to update both the PDF figure and the web chart.

| Slide figure | Web chart |
|---|---|
| `fig1` | `articles` |
| `fig2` | `povregion` |
| `fig3` | `lifeexp` |
| `fig4` | `childmort` |
| `fig5` | `conflict` |
| `fig6` | `governance` |
| `fig7` | `povincome` |
| `fig8` | `informal` |
| `fig9` | `elephant` |
| `fig10` | `schooling` |
| `fig11` | `literacy` |
| `fig12` | `learning` |
| `fig_democracy`, `fig_democracy_india` | `democracy` (toggle) |
| `fig_coverage` | `coverage` |
| `fig_aid_growth` | `aid` |
| `fig_povchange` | `povchange` (toggle) |
| `fig_cdd` | `img/cdd.png`, a raster from the chapter PDF |

## Adding a chart

1. In the do-file, `do slides/webdata.do <name> <varlist>` to write `webslides/data/<name>.js`.
2. Write `js/charts/<name>.js` calling `Deck.register("<name>", {data, render})` (see `aid.js`).
   `data` parses `Deck.csv.<name>`; `render(rows, {view})` returns the plot.
3. In `index.html`, add `<figure data-chart="<name>"><div class="plot"></div></figure>` to a slide,
   and `<script>` tags for the data and chart files. For alternative views, add a `.toggle` group of
   buttons with `data-view` values, as on the democracy slide.

## Yale identity and accessibility

The styling follows yaleidentity.yale.edu (Yale Blue `#00356b` as the base color; the Yale
typeface, YaleNew, for headings and Mallory for text) and Yale's WCAG 2.1 AA checklist
(usability.yale.edu). The WOFF2 files in `fonts/` are the web fonts egc.yale.edu embeds in its
own stylesheet. They are licensed for Yale websites, so the deck should be hosted only on one.
Georgia and Calibri, the fallbacks Yale names for its presentation template, cover the moment
before they load. Chart colors are in `js/deck.js`.

- Each chart has a short accessible name (`data-alt`) and a longer description (`data-desc`) on
  its `<figure>`, and a "Data table" button that shows its data, so the values in the hover
  tooltips are also available by keyboard and screen reader. Update `data-desc` if the data change.
- Escape closes an open tooltip; with none open it opens reveal's slide overview as usual.
- The dots along the bottom replace reveal's progress bar (`buildDots` in `js/deck.js`): small for
  slides, medium for section and title slides (`.section-slide`, `.title-slide`), large for the
  current slide. Each names its slide, from the slide's first heading, on hover and to screen readers.
- The headshots are moved by a small spring simulation (`bubblePhysics` in `js/deck.js`, tuned by
  `PHYSICS`). Bubbles stay within the slide and above the dots.
- Only the current slide is in the tab order. Safari tabs to buttons only with Option-Tab, or
  with "Press Tab to highlight each item" turned on in its settings.
- With "reduce motion" set in the operating system, slide transitions, the title slide's breathing
  arrow, and the headshot simulation are off; a hovered headshot simply enlarges.

Not yet compliant: several chart text labels and lines use the original chart colors, which
fall below 4.5:1 (text) or 3:1 (graphics) against white, e.g. sky `#56b4e9`, orange-brown
`#e69f00`, and gray `#8c8c8c`. Slides are a fixed 16:9 canvas that scales down rather than
reflowing at 320px wide (WCAG 1.4.10).

## Embedding

Paste into the host page:

```html
<div style="position:relative;width:100%;aspect-ratio:16/9">
  <iframe src="https://<deck URL>/index.html" title="Slides"
          style="position:absolute;inset:0;width:100%;height:100%;border:0"
          allow="fullscreen" allowfullscreen loading="lazy"></iframe>
</div>
```

- The arrow keys only work once the viewer has clicked inside the deck. The arrows drawn on the slides work without that.
- To link to a particular slide, add its number to the URL: `index.html#/1` is the second slide.
- The host page can drive the deck through reveal's postMessage API, as `embed-test.html` shows.
