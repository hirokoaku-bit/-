import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1280, 670

# ---- colors ----
NAVY_TOP = (13, 22, 38)
NAVY_BOTTOM = (23, 38, 61)
GRID = (255, 255, 255, 14)
LINE_CALM = (137, 196, 214)     # muted teal-blue for the calm/early part of the price line
LINE_DROP = (224, 122, 92)      # muted warm coral for the falling part
RULE_COLOR = (223, 178, 98)     # muted gold for the "rule line"
TEXT_MAIN = (245, 247, 250)
TEXT_SUB = (176, 190, 208)
TAG_BG = (223, 178, 98)
TAG_TEXT = (23, 27, 33)

FONT_DIR = "/usr/share/fonts/opentype/ipafont-gothic/"
FONT_REGULAR = FONT_DIR + "ipag.ttf"

img = Image.new("RGB", (W, H), NAVY_TOP)
draw = ImageDraw.Draw(img, "RGBA")

# ---- vertical gradient background ----
for y in range(H):
    t = y / H
    r = int(NAVY_TOP[0] + (NAVY_BOTTOM[0] - NAVY_TOP[0]) * t)
    g = int(NAVY_TOP[1] + (NAVY_BOTTOM[1] - NAVY_TOP[1]) * t)
    b = int(NAVY_TOP[2] + (NAVY_BOTTOM[2] - NAVY_TOP[2]) * t)
    draw.line([(0, y), (W, y)], fill=(r, g, b))

# ---- subtle grid ----
grid_overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gdraw = ImageDraw.Draw(grid_overlay)
for x in range(0, W, 64):
    gdraw.line([(x, 0), (x, H)], fill=GRID, width=1)
for y in range(0, H, 64):
    gdraw.line([(0, y), (W, y)], fill=GRID, width=1)
img = Image.alpha_composite(img.convert("RGBA"), grid_overlay)
draw = ImageDraw.Draw(img, "RGBA")

# ---- price line: calm/volatile section, then a falling section ----
random.seed(7)
chart_left, chart_right = 60, W - 60
chart_top, chart_bottom = 260, 560
baseline = 430

pts = []
n_calm = 14
x0, x1 = chart_left, chart_left + int((chart_right - chart_left) * 0.62)
for i in range(n_calm + 1):
    t = i / n_calm
    x = x0 + (x1 - x0) * t
    wobble = math.sin(t * 9.0) * 26 + math.sin(t * 3.3 + 1.0) * 14
    y = baseline - 10 + wobble
    pts.append((x, y))

# falling section
n_drop = 10
x2 = chart_right - 40
drop_start = pts[-1]
for i in range(1, n_drop + 1):
    t = i / n_drop
    x = x1 + (x2 - x1) * t
    y = drop_start[1] + (chart_bottom - 60 - drop_start[1]) * (t ** 1.4)
    y += math.sin(t * 6.0) * 8
    pts.append((x, y))

# draw calm segment
calm_pts = pts[: n_calm + 1]
for i in range(len(calm_pts) - 1):
    draw.line([calm_pts[i], calm_pts[i + 1]], fill=LINE_CALM, width=5, joint="curve")

# draw drop segment (including the joint point)
drop_pts = pts[n_calm:]
for i in range(len(drop_pts) - 1):
    draw.line([drop_pts[i], drop_pts[i + 1]], fill=LINE_DROP, width=5, joint="curve")

# soft glow under the line via blurred copy
glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow_layer)
for i in range(len(pts) - 1):
    color = LINE_CALM if i < n_calm else LINE_DROP
    glow_draw.line([pts[i], pts[i + 1]], fill=color + (90,), width=14)
glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(10))
img = Image.alpha_composite(img, glow_layer)
draw = ImageDraw.Draw(img, "RGBA")
for i in range(len(calm_pts) - 1):
    draw.line([calm_pts[i], calm_pts[i + 1]], fill=LINE_CALM, width=5, joint="curve")
for i in range(len(drop_pts) - 1):
    draw.line([drop_pts[i], drop_pts[i + 1]], fill=LINE_DROP, width=5, joint="curve")

# ---- the "rule line" (dashed horizontal) the reader decided in advance ----
rule_y = drop_start[1] + 46
dash_len, gap_len = 14, 10
x = chart_left
while x < chart_right:
    x_end = min(x + dash_len, chart_right)
    draw.line([(x, rule_y), (x_end, rule_y)], fill=RULE_COLOR, width=3)
    x += dash_len + gap_len

# marker circle where the falling price crosses the rule line
cross_x = None
for i in range(len(drop_pts) - 1):
    (xa, ya), (xb, yb) = drop_pts[i], drop_pts[i + 1]
    if (ya - rule_y) * (yb - rule_y) <= 0 and yb != ya:
        t = (rule_y - ya) / (yb - ya)
        cross_x = xa + (xb - xa) * t
        break
if cross_x is not None:
    r = 9
    draw.ellipse([cross_x - r, rule_y - r, cross_x + r, rule_y + r], outline=RULE_COLOR, width=3)
    draw.ellipse([cross_x - 3, rule_y - 3, cross_x + 3, rule_y + 3], fill=RULE_COLOR)

# small label near the rule line (placed in open space, away from the price line)
label_font = ImageFont.truetype(FONT_REGULAR, 20)
label_x = chart_right - 230
label_y = rule_y - 60
draw.text((label_x, label_y), "自分で決めたルール", font=label_font, fill=RULE_COLOR)
draw.line([(label_x + 20, label_y + 30), (chart_right - 30, rule_y - 6)], fill=RULE_COLOR + (140,), width=2)

# ---- top tag ----
tag_font = ImageFont.truetype(FONT_REGULAR, 22)
tag_text = "投資 ／ リスク管理"
tb = draw.textbbox((0, 0), tag_text, font=tag_font)
tag_w, tag_h = tb[2] - tb[0] + 36, tb[3] - tb[1] + 18
draw.rounded_rectangle([60, 56, 60 + tag_w, 56 + tag_h], radius=tag_h // 2, fill=TAG_BG)
draw.text((60 + 18, 56 + 8), tag_text, font=tag_font, fill=TAG_TEXT)

# ---- title text (faux bold via multi-draw offset) ----
def draw_bold(xy, text, font, fill):
    x0, y0 = xy
    for dx, dy in [(0, 0), (1, 0), (0, 1), (1, 1)]:
        draw.text((x0 + dx, y0 + dy), text, font=font, fill=fill)

title_font = ImageFont.truetype(FONT_REGULAR, 58)
line1 = "頭では分かっているのに、"
line2 = "なぜ損切りできないのか"
draw_bold((60, 122), line1, title_font, TEXT_MAIN)
draw_bold((60, 190), line2, title_font, TEXT_MAIN)

sub_font = ImageFont.truetype(FONT_REGULAR, 26)
sub_text = "投資で失敗しやすい人・回避できる人の分かれ目"
draw.text((62, 262), sub_text, font=sub_font, fill=TEXT_SUB)

img = img.convert("RGB")
out_path = "/home/user/-/note販売/assets/03_投資リスク管理_eyecatch.png"
import os
os.makedirs(os.path.dirname(out_path), exist_ok=True)
img.save(out_path, "PNG")
print("saved:", out_path, img.size)
