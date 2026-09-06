import math
from PIL import Image, ImageDraw, ImageFilter

S = 800  # square canvas; note crops profile images to a circle
img = Image.new("RGB", (S, S), (13, 22, 38))
draw = ImageDraw.Draw(img, "RGBA")

NAVY_TOP = (16, 27, 45)
NAVY_BOTTOM = (26, 42, 66)
LINE_CALM = (137, 196, 214)
LINE_DROP = (224, 122, 92)
RULE_COLOR = (223, 178, 98)

# vertical gradient background
for y in range(S):
    t = y / S
    r = int(NAVY_TOP[0] + (NAVY_BOTTOM[0] - NAVY_TOP[0]) * t)
    g = int(NAVY_TOP[1] + (NAVY_BOTTOM[1] - NAVY_TOP[1]) * t)
    b = int(NAVY_TOP[2] + (NAVY_BOTTOM[2] - NAVY_TOP[2]) * t)
    draw.line([(0, y), (S, y)], fill=(r, g, b))

# note crops to a circle; keep all content inside the safe circle (~92% of canvas)
cx, cy = S / 2, S / 2
safe_r = S * 0.46

# subtle outer ring
draw.ellipse([cx - safe_r, cy - safe_r, cx + safe_r, cy + safe_r],
             outline=(255, 255, 255, 25), width=3)

# --- icon: one bold hump that eases down through a dashed "rule" line at the center ---
rule_y = cy

# dashed rule line across the safe circle width at rule_y
half_w = safe_r * 0.74
dash_len, gap_len = 20, 14
x = cx - half_w
while x < cx + half_w:
    x_end = min(x + dash_len, cx + half_w)
    draw.line([(x, rule_y), (x_end, rule_y)], fill=RULE_COLOR, width=8)
    x += dash_len + gap_len

# price path: single smooth hump above the line, then a clean descent below it
pts = []
n = 32
x0, x1 = cx - half_w, cx + half_w
y_base = cy - safe_r * 0.06
amplitude = safe_r * 0.34
y_final = cy + safe_r * 0.42
for i in range(n + 1):
    t = i / n
    x = x0 + (x1 - x0) * t
    if t <= 0.5:
        y = y_base - amplitude * math.sin(math.pi * (t / 0.5))
    else:
        t2 = (t - 0.5) / 0.5
        y = y_base + (y_final - y_base) * (t2 ** 1.15)
    pts.append((x, y))

split = int(n * 0.5)
calm_pts = pts[: split + 1]
drop_pts = pts[split:]

# soft glow
glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
gdraw = ImageDraw.Draw(glow)
for i in range(len(calm_pts) - 1):
    gdraw.line([calm_pts[i], calm_pts[i + 1]], fill=LINE_CALM + (120,), width=26)
for i in range(len(drop_pts) - 1):
    gdraw.line([drop_pts[i], drop_pts[i + 1]], fill=LINE_DROP + (120,), width=26)
glow = glow.filter(ImageFilter.GaussianBlur(16))
img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
draw = ImageDraw.Draw(img, "RGBA")

for i in range(len(calm_pts) - 1):
    draw.line([calm_pts[i], calm_pts[i + 1]], fill=LINE_CALM, width=14, joint="curve")
for i in range(len(drop_pts) - 1):
    draw.line([drop_pts[i], drop_pts[i + 1]], fill=LINE_DROP, width=14, joint="curve")

# marker dot where the falling line actually crosses the rule line
cross_pt = None
for i in range(len(drop_pts) - 1):
    (xa, ya), (xb, yb) = drop_pts[i], drop_pts[i + 1]
    if (ya - rule_y) * (yb - rule_y) <= 0 and yb != ya:
        t = (rule_y - ya) / (yb - ya)
        cross_pt = (xa + (xb - xa) * t, rule_y)
        break
if cross_pt:
    r = 17
    draw.ellipse([cross_pt[0] - r, cross_pt[1] - r, cross_pt[0] + r, cross_pt[1] + r],
                 outline=RULE_COLOR, width=5)
    draw.ellipse([cross_pt[0] - 5, cross_pt[1] - 5, cross_pt[0] + 5, cross_pt[1] + 5], fill=RULE_COLOR)

img.save("/home/user/-/note販売/assets/profile_icon.png", "PNG")
print("saved", img.size)

# also export a circle-cropped preview so it's easy to check how it will actually look
preview = Image.new("RGBA", (S, S), (0, 0, 0, 0))
mask = Image.new("L", (S, S), 0)
mdraw = ImageDraw.Draw(mask)
mdraw.ellipse([0, 0, S, S], fill=255)
preview.paste(img, (0, 0), mask)
preview.save("/home/user/-/note販売/assets/profile_icon_circle_preview.png", "PNG")
print("saved circle preview")
