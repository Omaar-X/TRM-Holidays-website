#!/usr/bin/env python3
"""
Regenerate the favicon / app icons from assets/images/logo.jpeg.

    python tools/make-icons.py

Takes the swoosh emblem out of the logo, cleans its edges, and writes white-on-navy
icons into the site root: favicon.ico, favicon-16x16.png, favicon-32x32.png,
apple-touch-icon.png, android-chrome-192x192.png, android-chrome-512x512.png,
mstile-150x150.png. Needs Pillow and numpy.
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAVY = (26, 43, 107, 255)

src = Image.open(os.path.join(ROOT, "assets", "images", "logo.jpeg")).convert("L")
a = np.asarray(src).astype(float)
ink = np.clip((185 - a) / (185 - 120), 0, 1)

# the emblem sits left of the "trm" letters; rows 650-700 are empty paper above the tagline
x0, x1, y0, y1 = 90, 372, 455, 675
ys, xs = np.where(ink[y0:y1, x0:x1] > 0.5)
bx0, bx1, by0, by1 = xs.min() + x0, xs.max() + x0 + 1, ys.min() + y0, ys.max() + y0 + 1
mask = Image.fromarray((ink[by0:by1, bx0:bx1] * 255).astype("uint8"), "L")

# the logo is only ~240px wide, so rebuild crisp edges: upscale, soften, then re-sharpen the edge
mask = mask.resize((mask.width * 4, mask.height * 4), Image.LANCZOS).filter(ImageFilter.GaussianBlur(3.2))
m = np.asarray(mask).astype(float) / 255.0
m = np.clip((m - 0.5) * 7.0 + 0.5, 0, 1)
emblem = Image.fromarray((m * 255).astype("uint8"), "L")


def make(size, ratio, rounded):
    S = 1024
    bg = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(bg)
    if rounded:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=NAVY)
    else:
        d.rectangle([0, 0, S, S], fill=NAVY)
    w = int(S * ratio)
    h = int(w * emblem.height / emblem.width)
    em = emblem.resize((w, h), Image.LANCZOS)
    white = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    white.putalpha(em)
    bg.alpha_composite(white, ((S - w) // 2, (S - h) // 2))
    return bg.resize((size, size), Image.LANCZOS)


def save(img, name, **kw):
    img.save(os.path.join(ROOT, name), **kw)


save(make(16, .80, True), "favicon-16x16.png")
save(make(32, .80, True), "favicon-32x32.png")
save(make(256, .80, True), "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
save(make(180, .70, False), "apple-touch-icon.png")             # iOS rounds the corners itself
save(make(192, .56, False), "android-chrome-192x192.png")       # full-bleed, safe for maskable icons
save(make(512, .56, False), "android-chrome-512x512.png")
save(make(150, .62, False), "mstile-150x150.png")
print("icons written to", ROOT)
