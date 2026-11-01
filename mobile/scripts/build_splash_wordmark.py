"""
Generate splash-icon.png with Q emblem + "Quorum" wordmark below.
The splash screen uses resizeMode: "contain" on a #060B18 background,
so we render emblem + text together as a single transparent RGBA image.
"""
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FOREGROUND_PATH = r"d:\IDB Mini Project\mobile\assets\android-icon-foreground.png"
OUTPUT_PATH     = r"d:\IDB Mini Project\mobile\assets\splash-icon.png"
SCALE = 4  # supersampling for crisp text

# ── Load the Q emblem (RGBA transparent) ────────────────────────────────────
emblem = Image.open(FOREGROUND_PATH).convert("RGBA")  # 1024x1024

# ── Canvas dimensions ───────────────────────────────────────────────────────
# Final output: 1024-wide × 1400-tall (extra 376px below for wordmark + breathing room)
# We'll render at SCALE× then downscale.
OUT_W, OUT_H = 1024, 1400
dim_w, dim_h = OUT_W * SCALE, OUT_H * SCALE

canvas = Image.new("RGBA", (dim_w, dim_h), (0, 0, 0, 0))

# ── Place the Q emblem (scaled up, top-center) ──────────────────────────────
emblem_scaled = emblem.resize((OUT_W * SCALE, OUT_W * SCALE), Image.Resampling.LANCZOS)
# Center the emblem horizontally; sit it in the top 1024 rows
emblem_x = 0
emblem_y = 0   # slight extra top padding baked into 1300 height
canvas.paste(emblem_scaled, (emblem_x, emblem_y), emblem_scaled)

# ── Render "Quorum" wordmark ─────────────────────────────────────────────────
draw = ImageDraw.Draw(canvas)

# Font: Segoe UI Light gives a clean, modern, premium feel
FONT_PATH = r"C:\Windows\Fonts\segoeuil.ttf"
font_size = 155 * SCALE   # ~155px at final resolution
font = ImageFont.truetype(FONT_PATH, font_size)

text = "Quorum"
bbox = draw.textbbox((0, 0), text, font=font)
text_w = bbox[2] - bbox[0]
text_h = bbox[3] - bbox[1]

# Horizontal center; vertically: right below emblem with 20px gap
text_x = (dim_w - text_w) // 2
text_y = OUT_W * SCALE + 55 * SCALE  # 55px gap below emblem

# ── Letter spacing: render each letter manually for premium look ─────────────
# Pillow doesn't support letter-spacing natively, so we space them manually.
LETTER_SPACING = 14 * SCALE  # 14px extra between characters

letters = list(text)
letter_widths = []
for ch in letters:
    lb = draw.textbbox((0, 0), ch, font=font)
    letter_widths.append(lb[2] - lb[0])

total_w = sum(letter_widths) + LETTER_SPACING * (len(letters) - 1)
x_start = (dim_w - total_w) // 2

# ── Soft glow shadow layer for depth ────────────────────────────────────────
shadow_layer = Image.new("RGBA", (dim_w, dim_h), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow_layer)
x_pos = x_start
for ch, cw in zip(letters, letter_widths):
    lb = sd.textbbox((0, 0), ch, font=font)
    ch_h = lb[3] - lb[1]
    # Draw shadow slightly lower
    sd.text((x_pos, text_y + 12 * SCALE), ch, font=font, fill=(0, 0, 0, 140))
    x_pos += cw + LETTER_SPACING

shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=18 * SCALE))
canvas = Image.alpha_composite(canvas, shadow_layer)
draw = ImageDraw.Draw(canvas)

# ── Main text: electric sapphire gradient ───────────────────────────────────
# Each letter transitions from bright electric cyan to sapphire blue
text_gradient = Image.new("RGBA", (dim_w, dim_h), (0, 0, 0, 0))

# Gradient mask layer
grad_mask = Image.new("L", (dim_w, dim_h), 0)
gd = ImageDraw.Draw(grad_mask)
x_pos = x_start
for ch, cw in zip(letters, letter_widths):
    gd.text((x_pos, text_y), ch, font=font, fill=255)
    x_pos += cw + LETTER_SPACING

# Color gradient: left = Electric Cyan (#38BDF8), right = Sapphire (#2563EB), slight hint of violet
tg_pix = text_gradient.load()
for y in range(dim_h):
    for x in range(dim_w):
        a = grad_mask.getpixel((x, y))
        if a == 0:
            continue
        # Normalize x within the text block
        t = max(0.0, min(1.0, (x - x_start) / float(total_w)))
        if t < 0.5:
            st = t * 2.0
            # Bright cyan (56, 189, 248) -> Sapphire (37, 99, 235)
            r = int(56  * (1 - st) + 37  * st)
            g = int(189 * (1 - st) + 99  * st)
            b = int(248 * (1 - st) + 235 * st)
        else:
            st = (t - 0.5) * 2.0
            # Sapphire (37, 99, 235) -> Soft Indigo (99, 102, 241)
            r = int(37  * (1 - st) + 99  * st)
            g = int(99  * (1 - st) + 102 * st)
            b = int(235 * (1 - st) + 241 * st)
        tg_pix[x, y] = (r, g, b, a)

canvas = Image.alpha_composite(canvas, text_gradient)

# ── Subtle letter-spacing white shimmer on top row of letters ───────────────
shimmer = Image.new("RGBA", (dim_w, dim_h), (0, 0, 0, 0))
sh_draw = ImageDraw.Draw(shimmer)
x_pos = x_start
for ch, cw in zip(letters, letter_widths):
    lb = sh_draw.textbbox((0, 0), ch, font=font)
    ch_h = lb[3] - lb[1]
    # Thin white stroke only along the top 20% of each letter = shimmer highlight
    sh_draw.text((x_pos, text_y), ch, font=font, fill=(255, 255, 255, 80))
    x_pos += cw + LETTER_SPACING
shimmer = shimmer.filter(ImageFilter.GaussianBlur(radius=2 * SCALE))
canvas = Image.alpha_composite(canvas, shimmer)

# ── Downscale to final resolution ───────────────────────────────────────────
final = canvas.resize((OUT_W, OUT_H), Image.Resampling.LANCZOS)
final.save(OUTPUT_PATH, "PNG")
print(f"Saved: {OUTPUT_PATH} ({OUT_W}x{OUT_H})")
