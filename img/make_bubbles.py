"""Round headshot images for the authors slide.

Each square photo in img/headshots/ becomes img/bubbles/<name>.webp: the photo cut to
a circle inside a white ring, on a transparent background, with antialiased edges.
Baking the circle and ring into the image means the browser only scales a bitmap, which
stays smooth while the bubbles move; Firefox shimmers on clip and outline edges drawn
at a changing scale.

    uv run --with pillow python3 img/make_bubbles.py      (from webslides/)
"""

from pathlib import Path

from PIL import Image, ImageDraw

SIZE = 480        # px; the enlarged bubble is 277 CSS px, so this is sharp at 2x
RING = 4          # px of white ring at SIZE, 1 CSS px on a resting 123 px bubble
SUPERSAMPLE = 4   # masks are drawn this much larger, then reduced, for smooth edges

here = Path(__file__).parent
out = here / "bubbles"
out.mkdir(exist_ok=True)


def disc(radius):
    """An antialiased disc mask of the given radius, centred in a SIZE square."""
    big = SIZE * SUPERSAMPLE
    mask = Image.new("L", (big, big), 0)
    c, r = big / 2, radius * SUPERSAMPLE
    ImageDraw.Draw(mask).ellipse((c - r, c - r, c + r, c + r), fill=255)
    return mask.resize((SIZE, SIZE), Image.LANCZOS)


outer = disc(SIZE / 2)
inner = disc(SIZE / 2 - RING)

sources = sorted(here.glob("headshots/*.jpg"))
assert sources, "no photos in img/headshots/"
for src in sources:
    photo = Image.open(src).convert("RGB")
    assert photo.width == photo.height, f"{src.name} is not square"
    photo = photo.resize((SIZE, SIZE), Image.LANCZOS)
    bubble = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 0))
    bubble.paste((255, 255, 255, 255), mask=outer)
    bubble.paste(photo, mask=inner)
    bubble.save(out / f"{src.stem}.webp", quality=85, method=6)
print(f"{len(sources)} bubbles written to {out}")
