"""
Build production assets for Quorum mobile app:
- mobile/assets/icon.png (1024x1024)
- mobile/assets/android-icon-foreground.png (1024x1024)
- mobile/assets/android-icon-background.png (1024x1024)
- mobile/assets/android-icon-monochrome.png (1024x1024)
- mobile/assets/splash-icon.png (1024x1024)
- mobile/assets/favicon.png (48x48)
"""
import math
import os
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

MASTER_PATH = r"C:\Users\Ahmad Mushtaq\.gemini\antigravity\brain\da928782-6d67-4820-a4d7-4bfad76a2db1\quorum_app_icon_1792614964565.jpg"
TARGET_DIR = r"d:\IDB Mini Project\mobile\assets"

master = Image.open(MASTER_PATH).convert("RGB")
w, h = master.size # 1024, 1024
cx, cy = 514.0, 510.0

# -------------------------------------------------------------------------
# 1. GENERATE ADAPTIVE BACKGROUND (1024x1024)
# -------------------------------------------------------------------------
print("Generating android-icon-background.png...")
bg_img = Image.new("RGBA", (1024, 1024), (6, 11, 24, 255)) # #060B18
bg_glow = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
bg_draw = ImageDraw.Draw(bg_glow)
# Ambient sapphire aura
bg_draw.ellipse([cx - 380, cy - 380, cx + 380, cy + 380], fill=(29, 78, 216, 75))
# Inner cyan presence glow
bg_draw.ellipse([cx - 200, cy - 200, cx + 200, cy + 200], fill=(6, 182, 212, 45))
bg_glow = bg_glow.filter(ImageFilter.GaussianBlur(radius=100))
bg_img = Image.alpha_composite(bg_img, bg_glow)

bg_path = os.path.join(TARGET_DIR, "android-icon-background.png")
bg_img.save(bg_path, "PNG")
print(f"Saved: {bg_path}")

# -------------------------------------------------------------------------
# 2. GENERATE FOREGROUND (1024x1024 Transparent RGBA)
# -------------------------------------------------------------------------
print("Generating android-icon-foreground.png...")
# Mask that isolates the Q glyph cleanly
alpha_mask = Image.new("L", (w, h), 0)
alpha_pix = alpha_mask.load()
src_pix = master.load()

# Emblem bounds: ring radius is ~275px, tail reaches to ~315px at angle ~55 deg
for y in range(h):
    for x in range(w):
        dx = x - cx
        dy = y - cy
        dist = math.hypot(dx, dy)
        angle = math.degrees(math.atan2(dy, dx)) # -180 to 180
        
        # Max radius allowed depends on angle:
        # Lower-right quadrant (tail area: 20 deg to 75 deg) extends up to 320px
        # Everywhere else, ring extends to 285px
        if 20 <= angle <= 75:
            max_r = 320.0
        else:
            max_r = 282.0
            
        if dist > max_r:
            alpha_pix[x, y] = 0
            continue
            
        r, g, b = src_pix[x, y]
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        
        # Check if inside glyph
        diff = max(0, lum - 35)
        neon_factor = max(0, b - 70) * 1.5 + max(0, g - 55) * 1.2
        strength = max(diff * 4.2, neon_factor * 2.6)
        
        # Smooth edge transition
        edge_t = max(0.0, min(1.0, (max_r - dist) / 12.0))
        val = int(min(255, strength) * edge_t)
        
        if val < 20:
            val = 0
        elif val < 70:
            val = int(val * (val / 70.0))
            
        alpha_pix[x, y] = val

# Smooth alpha slightly
alpha_mask = alpha_mask.filter(ImageFilter.GaussianBlur(radius=1.0))

foreground_img = master.convert("RGBA")
foreground_img.putalpha(alpha_mask)

fg_path = os.path.join(TARGET_DIR, "android-icon-foreground.png")
foreground_img.save(fg_path, "PNG")
print(f"Saved: {fg_path}")

# -------------------------------------------------------------------------
# 3. GENERATE MONOCHROME THEMED ICON (1024x1024 Transparent RGBA)
# -------------------------------------------------------------------------
print("Generating android-icon-monochrome.png...")
# Android 13+ material themed icon: Crisp solid white silhouette
# We construct a clean geometric mask matching the Q monogram + beacon
mono_mask = Image.new("L", (1024 * 2, 1024 * 2), 0)
mm_draw = ImageDraw.Draw(mono_mask)
m_cx, m_cy = cx * 2, cy * 2

# Outer ring: R_out ~ 272 * 2, R_in ~ 188 * 2
r_out = 272 * 2
r_in = 186 * 2
mm_draw.ellipse([m_cx - r_out, m_cy - r_out, m_cx + r_out, m_cy + r_out], fill=255)
mm_draw.ellipse([m_cx - r_in, m_cy - r_in, m_cx + r_in, m_cy + r_in], fill=0)

# Sweeping tail polygon / bezier:
# Matches the brushed metallic wave in the lower-right quadrant
tail_pts = [
    (m_cx - 20 * 2, m_cy + 105 * 2),
    (m_cx + 80 * 2, m_cy + 75 * 2),
    (m_cx + 175 * 2, m_cy + 130 * 2),
    (m_cx + 250 * 2, m_cy + 225 * 2),
    (m_cx + 280 * 2, m_cy + 220 * 2),
    (m_cx + 240 * 2, m_cy + 265 * 2),
    (m_cx + 170 * 2, m_cy + 250 * 2),
    (m_cx + 90 * 2, m_cy + 185 * 2),
    (m_cx + 50 * 2, m_cy + 160 * 2),
]
mm_draw.polygon(tail_pts, fill=255)

# Center beacon circle
b_x, b_y = (m_cx + 155 * 2), (m_cy + 152 * 2)
b_r = 34 * 2
mm_draw.ellipse([b_x - b_r, b_y - b_r, b_x + b_r, b_y + b_r], fill=255)

# Cut the inner aperture again to keep it crisp
mm_draw.ellipse([m_cx - r_in, m_cy - r_in, m_cx + r_in, m_cy + r_in], fill=0)

# Re-draw the inner wave inside the aperture
inner_wave = [
    (m_cx - 20 * 2, m_cy + 105 * 2),
    (m_cx + 80 * 2, m_cy + 75 * 2),
    (m_cx + 155 * 2, m_cy + 120 * 2),
    (m_cx + 120 * 2, m_cy + 160 * 2),
    (m_cx + 40 * 2, m_cy + 160 * 2),
]
mm_draw.polygon(inner_wave, fill=255)

# Beacon in center again (on top of wave)
mm_draw.ellipse([b_x - b_r, b_y - b_r, b_x + b_r, b_y + b_r], fill=255)

# Downscale to 1024x1024 with antialiasing
mono_mask_1024 = mono_mask.resize((1024, 1024), Image.Resampling.LANCZOS)
mono_img = Image.new("RGBA", (1024, 1024), (255, 255, 255, 0))
mono_img.putalpha(mono_mask_1024)

mono_path = os.path.join(TARGET_DIR, "android-icon-monochrome.png")
mono_img.save(mono_path, "PNG")
print(f"Saved: {mono_path}")

# -------------------------------------------------------------------------
# 4. GENERATE SPLASH ICON (1024x1024 Transparent RGBA)
# -------------------------------------------------------------------------
print("Generating splash-icon.png...")
# Splash icon is the centered glowing emblem on transparent background
splash_path = os.path.join(TARGET_DIR, "splash-icon.png")
foreground_img.save(splash_path, "PNG")
print(f"Saved: {splash_path}")

# -------------------------------------------------------------------------
# 5. GENERATE MAIN APP ICON (1024x1024 RGB)
# -------------------------------------------------------------------------
print("Generating icon.png...")
# For the primary app icon (iOS & general store listing), composite:
# Rich dark background + Q emblem + subtle outer squircle rim
icon_img = Image.alpha_composite(bg_img, foreground_img)
rim = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
rd = ImageDraw.Draw(rim)
rd.rounded_rectangle([24, 24, 1000, 1000], radius=220, outline=(255, 255, 255, 25), width=2)
icon_img = Image.alpha_composite(icon_img, rim)
icon_rgb = icon_img.convert("RGB")

icon_path = os.path.join(TARGET_DIR, "icon.png")
icon_rgb.save(icon_path, "PNG")
print(f"Saved: {icon_path}")

# -------------------------------------------------------------------------
# 6. GENERATE FAVICON (48x48 RGBA)
# -------------------------------------------------------------------------
print("Generating favicon.png...")
favicon_img = icon_img.resize((48, 48), Image.Resampling.LANCZOS)
# Enhance sharpness slightly for high visibility at tiny 48px
enhancer = ImageEnhance.Sharpness(favicon_img)
favicon_img = enhancer.enhance(1.4)

fav_path = os.path.join(TARGET_DIR, "favicon.png")
favicon_img.save(fav_path, "PNG")
print(f"Saved: {fav_path}")

print("\nAll assets successfully generated in mobile/assets!")
