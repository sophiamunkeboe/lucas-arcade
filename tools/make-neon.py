#!/usr/bin/env python3
"""Lucas's Arcade - turns the family business logos (art/logos/*.png) into glowing NEON SIGNS for the casino walls
in Blackjack and Poker.  Run:  python3 tools/make-neon.py   (needs Pillow + numpy)

For each logo:
  1. build a shape mask (alpha, or for SEL - which has no alpha - the white lettering/frame on its maroon banner,
     so its background is removed), trimmed and scaled to fit WITHOUT changing proportions;
  2. turn shapes into neon TUBES: thick parts (big bold letters) become outlined tubes, thin parts (script, serif,
     small text) stay as single tubes;
  3. color the tubes (one neon color per sign, plus an accent color where the original logo had a 2nd color),
     add a wide outer glow + tight glow + white-hot inner highlight, on a dark mounting plate with standoff bolts.
Exports art/neon/<id>-on.webp (lit) and <id>-off.webp (unlit glass, used for the flicker) + a preview PNG."""
import os, sys
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, OUT = os.path.join(ROOT, 'art', 'logos'), os.path.join(ROOT, 'art', 'neon')
W_MAX, H_MAX = 520, 150          # logo area inside the plate
PAD, GLOW = 26, 34               # plate padding, glow margin outside the plate

def hexrgb(h): return np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)])
NEON = {'pink': '#ff3fd2', 'cyan': '#2ff3ff', 'gold': '#ffc93a', 'purple': '#b45cff', 'green': '#4dff7a', 'orange': '#ff7a2f'}

# id: main color, accent color, how to find the accent pixels in the original
SIGNS = {
    'aer':      dict(color='pink',   accent='cyan', accent_fn=lambda a: (a[..., 2] > a[..., 0] + 40)),        # blue glass + EVENT RENTALS
    'munkeboe': dict(color='purple', accent=None),
    'sel':      dict(color='cyan',   accent=None, edge=5),
    'taylor':   dict(color='gold',   accent=None),
    'thankq':   dict(color='green',  accent='pink', edge=7, accent_fn=lambda a: (a[..., 0] > 170) & (a[..., 1] < 90)),  # the red Q
}

def shape_mask(name, a):
    """a = RGBA uint8 array -> float mask 0..1 of the logo shapes"""
    rgb = a[..., :3].astype(int); alpha = a[..., 3].astype(float) / 255
    if name == 'sel':                       # no alpha: keep only the white lettering + frame lines
        lo, hi = rgb.min(-1), rgb.max(-1)
        m = np.clip((lo - 200) / 40, 0, 1) * (hi - lo < 40)
        m[:16, :] = 0; m[-16:, :] = 0; m[:, :16] = 0; m[:, -16:] = 0      # drop the noisy cream frame...
        m[0, 0] = m[-1, -1] = 1                                            # ...but keep the full banner size for trimming
        return m
    if name in ('munkeboe', 'taylor'):      # faint thin strokes: boost
        return np.clip(alpha * 1.6, 0, 1)
    return alpha

def morph(m, size, op):
    im = Image.fromarray((m * 255).astype(np.uint8))
    f = ImageFilter.MaxFilter(size) if op == 'dilate' else ImageFilter.MinFilter(size)
    return np.array(im.filter(f)).astype(float) / 255

def blur(x, r):
    """separable gaussian blur (float arrays, 2D or HxWxC), edges padded with zeros"""
    n = int(np.ceil(r * 3)); t = np.arange(-n, n + 1)
    k = np.exp(-t * t / (2 * r * r)); k /= k.sum()
    def conv(a, axis):
        a = np.moveaxis(a, axis, -1)
        out = np.zeros_like(a)
        pad = np.pad(a, [(0, 0)] * (a.ndim - 1) + [(n, n)])
        for i, kv in enumerate(k):
            out += kv * pad[..., i:i + a.shape[-1]]
        return np.moveaxis(out, -1, axis)
    return conv(conv(x.astype(float), 0), 1)

def build(name, cfg):
    src = np.array(Image.open(os.path.join(SRC, name + '.png')).convert('RGBA'))
    m = shape_mask(name, src)
    acc = cfg['accent_fn'](src).astype(float) if cfg.get('accent') else np.zeros(m.shape)
    # trim to the shapes
    ys, xs = np.where(m > 0.25)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    m, acc = m[y0:y1, x0:x1], acc[y0:y1, x0:x1]
    # scale to fit (same factor both ways = proportions kept); big Taylor logo gets downscaled with LANCZOS
    k = min(W_MAX / m.shape[1], H_MAX / m.shape[0])
    size = (max(1, round(m.shape[1] * k)), max(1, round(m.shape[0] * k)))
    m = np.array(Image.fromarray((m * 255).astype(np.uint8)).resize(size, Image.LANCZOS)).astype(float) / 255
    acc = np.array(Image.fromarray((acc * 255).astype(np.uint8)).resize(size, Image.LANCZOS)).astype(float) / 255
    M = (m > 0.4).astype(float)
    if name == 'sel':   # ...and redraw the banner's double frame as clean tubes in the same place
        M[0, 0] = M[-1, -1] = 0
        fr = Image.new('L', (M.shape[1], M.shape[0]), 0); fd = ImageDraw.Draw(fr)
        fd.rectangle([2, 2, M.shape[1] - 3, M.shape[0] - 3], outline=255, width=3)
        fd.rectangle([8, 8, M.shape[1] - 9, M.shape[0] - 9], outline=255, width=2)
        M = np.maximum(M, np.array(fr) / 255)
    if cfg.get('edge'):
        # every shape becomes a tube along its edge (strokes thinner than the tube stay solid)
        tube = np.clip(M - morph(M, cfg['edge'], 'erode'), 0, 1)
    else:
        # tubes: thick regions -> outline, thin regions -> as is
        core = morph(M, 9, 'erode')
        thick = morph(core, 11, 'dilate') * M
        outline = thick - morph(thick, 5, 'erode')
        thin = np.clip(M - thick, 0, 1)
        tube = np.clip(outline + thin, 0, 1)
    if name in ('munkeboe', 'taylor'):
        tube = morph(tube, 3, 'dilate')       # hairlines -> visible tubes
    # canvas with plate + glow margin
    h, w = tube.shape
    PW, PH = w + PAD * 2, h + PAD * 2
    CW, CH = PW + GLOW * 2, PH + GLOW * 2
    T = np.zeros((CH, CW)); A = np.zeros((CH, CW))
    T[GLOW + PAD:GLOW + PAD + h, GLOW + PAD:GLOW + PAD + w] = tube
    A[GLOW + PAD:GLOW + PAD + h, GLOW + PAD:GLOW + PAD + w] = morph(acc, 5, 'dilate') if acc.any() else 0
    T = np.clip(blur(T, 0.7) * 1.15, 0, 1)
    c1 = hexrgb(NEON[cfg['color']]); c2 = hexrgb(NEON[cfg['accent']]) if cfg.get('accent') else c1
    Acol = (A > 0.3).astype(float)[..., None]
    C = c1 * (1 - Acol) + c2 * Acol
    L = T[..., None] * C
    hl = np.clip((blur(T, 0.8) - 0.55) * 2.2, 0, 1)[..., None]       # white-hot center of the tube
    light = blur(L, 16) * 2.2 + blur(L, 5) * 1.3 + L * 0.9 + hl * 0.85
    light = 1 - np.exp(-light * 1.25)                                  # soft tone map
    # plate
    plate = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); d = ImageDraw.Draw(plate)
    px0, py0, px1, py1 = GLOW, GLOW, GLOW + PW - 1, GLOW + PH - 1
    d.rounded_rectangle([px0 + 3, py0 + 5, px1 + 3, py1 + 5], 18, fill=(0, 0, 0, 120))   # drop shadow
    d.rounded_rectangle([px0, py0, px1, py1], 18, fill=(22, 14, 32, 255), outline=(58, 44, 74, 255), width=3)
    d.rounded_rectangle([px0 + 7, py0 + 7, px1 - 7, py1 - 7], 13, outline=(34, 24, 46, 255), width=2)
    for bx, by in ((px0 + 14, py0 + 14), (px1 - 14, py0 + 14), (px0 + 14, py1 - 14), (px1 - 14, py1 - 14)):
        d.ellipse([bx - 6, by - 6, bx + 6, by + 6], fill=(120, 110, 130, 255), outline=(60, 52, 70, 255), width=2)
        d.ellipse([bx - 2.5, by - 3.5, bx + 0.5, by - 0.5], fill=(220, 215, 230, 255))
    P = np.array(plate).astype(float) / 255
    pa = P[..., 3:4]
    def compose(light, strength):
        lum = light * strength
        rgb = P[..., :3] * pa + lum                       # light adds on top of the plate
        a = np.clip(pa[..., 0] + lum.max(-1) * (1 - pa[..., 0]), 0, 1)
        rgb = np.where(a[..., None] > 0, rgb / np.maximum(a[..., None], 1e-4) * np.where(pa > 0, 1, 1), 0)
        rgb = np.clip(np.where(pa > 0.5, P[..., :3] + lum, lum / np.maximum(a[..., None], 1e-4)), 0, 1)
        return Image.fromarray(np.dstack([rgb, a]).__mul__(255).round().astype(np.uint8), 'RGBA')
    on = compose(light, 1.0)
    # unlit: dim colored glass tubes, no glow
    glass = (T[..., None] * (C * 0.28 + 0.12))
    off = compose(glass, 1.0)
    return on, off

def main():
    os.makedirs(OUT, exist_ok=True)
    made = []
    for name, cfg in SIGNS.items():
        on, off = build(name, cfg)
        on.save(os.path.join(OUT, name + '-on.webp'), 'WEBP', quality=86, method=6)
        off.save(os.path.join(OUT, name + '-off.webp'), 'WEBP', quality=80, method=6)
        made.append((name, on))
        print(name, on.size, os.path.getsize(os.path.join(OUT, name + '-on.webp')) // 1024, 'KB')
    # preview sheet on a dark casino wall
    if len(sys.argv) > 1:
        cols, gap = 2, 20
        cw = max(im.width for _, im in made); ch = max(im.height for _, im in made)
        rows = (len(made) + cols - 1) // cols
        sheet = Image.new('RGBA', (cols * cw + gap * (cols + 1), rows * ch + gap * (rows + 1) + 70), (12, 7, 20, 255))
        dd = ImageDraw.Draw(sheet)
        for x in range(0, sheet.width, 36):                      # dim wall paneling
            dd.line([(x, 0), (x, sheet.height)], fill=(18, 11, 28, 255), width=2)
        for i in range(0, sheet.width, 28):                      # gold marquee bulbs
            dd.ellipse([i + 6, 18, i + 18, 30], fill=(255, 214, 102, 255))
            dd.ellipse([i + 6, sheet.height - 30, i + 18, sheet.height - 18], fill=(255, 214, 102, 255))
        for k, (name, im) in enumerate(made):
            r, c = divmod(k, cols)
            if k == len(made) - 1 and len(made) % cols: c = 0.5       # center the last one
            x = int(gap + c * (cw + gap) + (cw - im.width) / 2); y = int(45 + gap + r * (ch + gap) + (ch - im.height) / 2)
            sheet.alpha_composite(im, (x, y))
        sheet.convert('RGB').save(sys.argv[1])
        print('preview ->', sys.argv[1])

if __name__ == '__main__':
    main()
