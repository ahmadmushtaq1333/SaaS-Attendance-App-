"""
Render the 3D Quorum Emblem matching the animation:
- 1024x1024 production assets:
  - mobile/assets/icon.png (with dark background #000308 + aura)
  - mobile/assets/android-icon-foreground.png (transparent foreground)
  - mobile/assets/android-icon-background.png (#000308 + sapphire aura)
  - mobile/assets/android-icon-monochrome.png (monochrome icon)
  - mobile/assets/splash-icon.png (splash icon)
  - mobile/assets/favicon.png (48x48)
- Also updates Android res/mipmap and drawable folders!
"""
import math
import os
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

SIZE = 1024
SCALE = 2  # Supersample 2x for ultra-sharp edges (2048x2048)
DIM = SIZE * SCALE

# ---------------------------------------------------------------------------
# Coordinate grid in range [-1.5, 1.5]
# ---------------------------------------------------------------------------
y_coords, x_coords = np.mgrid[0:DIM, 0:DIM]

# Normalize to [-1.45, 1.45] centered, with aspect 1:1
# Shift y slightly (+0.08) because Q's center of mass is slightly lower due to tail
x = (x_coords - DIM / 2.0) / (DIM * 0.38)
y = -(y_coords - DIM / 2.0) / (DIM * 0.38) + 0.08

# ---------------------------------------------------------------------------
# 2D Signed Distance Field of Q
# ---------------------------------------------------------------------------
# 1. Ring (O): outer radius 1.0, inner hole radius 0.63
r_center = (1.0 + 0.63) / 2.0   # 0.815
half_w   = (1.0 - 0.63) / 2.0   # 0.185
dist_from_origin = np.sqrt(x**2 + y**2)
d_ring = np.abs(dist_from_origin - r_center) - half_w

# 2. Tail (diagonal slash)
# Segment from A(0.385, -0.46) to B(0.75, -1.26), width 0.25
ax, ay = 0.385, -0.46
bx, by = 0.75, -1.26
bax, bay = bx - ax, by - ay
ba_len_sq = bax**2 + bay**2

pax = x - ax
pay = y - ay
dot = pax * bax + pay * bay
h = np.clip(dot / ba_len_sq, 0.0, 1.0)
dx = pax - bax * h
dy = pay - bay * h
d_tail = np.sqrt(dx**2 + dy**2) - 0.125

# Combined SDF with smooth blending at junction
k = 0.05
h_blend = np.clip(0.5 + 0.5 * (d_tail - d_ring) / k, 0.0, 1.0)
d_q = (1.0 - h_blend) * d_tail + h_blend * d_ring - k * h_blend * (1.0 - h_blend)

# ---------------------------------------------------------------------------
# Extrusion & Bevel Heightmap
# ---------------------------------------------------------------------------
bevel_r = 0.08
depth = 0.28

inside = d_q < 0
on_bevel = (d_q >= -bevel_r) & (d_q <= 0)
on_flat  = d_q < -bevel_r

# Height z (0 to depth/2)
z = np.zeros_like(d_q)
# Flat face
z[on_flat] = depth / 2.0
# Beveled edge (circular profile)
bevel_dist = d_q[on_bevel] + bevel_r
z[on_bevel] = depth / 2.0 - (bevel_r - np.sqrt(np.maximum(0.0, bevel_r**2 - (bevel_r - bevel_dist)**2)))

# ---------------------------------------------------------------------------
# Surface Normals
# ---------------------------------------------------------------------------
dz_dy, dz_dx = np.gradient(z, 2.9 / DIM)

# Subtle Y-rotation (7 deg) to match heroic 3D pose in animation
theta_y = np.radians(10.0)
cos_t = np.cos(theta_y)
sin_t = np.sin(theta_y)

nx = -dz_dx
ny = -dz_dy
nz = np.ones_like(nx)
mag = np.sqrt(nx**2 + ny**2 + nz**2)
nx /= mag
ny /= mag
nz /= mag

# Apply 3D rotation to normal
nx_rot = nx * cos_t + nz * sin_t
ny_rot = ny
nz_rot = -nx * sin_t + nz * cos_t

# ---------------------------------------------------------------------------
# Lighting Calculation (MeshPhongMaterial)
# ---------------------------------------------------------------------------
# Key light: (4, 5, 5), cool blue #88aaff, intensity 9
# Fill light: (-4, 1, 3), deep blue #3355ff, intensity 3
# Rim light: (1, -4, -2), purple #aa33ff, intensity 7
# Top light: (0, 7, 4), white #ffffff, intensity 4.5
# Ambient: (10, 16, 64) * 0.6

diffuse_col = np.array([26, 68, 221], dtype=np.float32) / 255.0     # #1a44dd
specular_col = np.array([170, 204, 255], dtype=np.float32) / 255.0  # #aaccff
emissive_col = np.array([4, 16, 46], dtype=np.float32) / 255.0      # #04102e

lights = [
    {'pos': np.array([ 4.0,  5.0,  5.0]), 'col': np.array([136, 170, 255]) / 255.0, 'int': 8.5},
    {'pos': np.array([-4.0,  1.0,  3.0]), 'col': np.array([ 51,  85, 255]) / 255.0, 'int': 3.0},
    {'pos': np.array([ 1.0, -4.0, -2.0]), 'col': np.array([170,  51, 255]) / 255.0, 'int': 6.5},
    {'pos': np.array([ 0.0,  7.0,  4.0]), 'col': np.array([255, 255, 255]) / 255.0, 'int': 4.5},
]

total_rgb = np.zeros((DIM, DIM, 3), dtype=np.float32)
# Add ambient + emissive
total_rgb += (0.6 * np.array([10, 16, 64]) / 255.0 + emissive_col)

view_dir = np.array([0.0, 0.0, 1.0])

for l in lights:
    l_dir = l['pos'] / np.linalg.norm(l['pos'])
    l_int = l['int'] * 0.18
    l_col = l['col']

    # Diffuse N . L
    n_dot_l = np.maximum(0.0, nx_rot * l_dir[0] + ny_rot * l_dir[1] + nz_rot * l_dir[2])
    diff = n_dot_l[:, :, None] * diffuse_col * l_col * l_int

    # Specular (Phong)
    # Reflected vector R = 2*(N.L)*N - L
    rx = 2.0 * n_dot_l * nx_rot - l_dir[0]
    ry = 2.0 * n_dot_l * ny_rot - l_dir[1]
    rz = 2.0 * n_dot_l * nz_rot - l_dir[2]
    r_dot_v = np.maximum(0.0, rx * view_dir[0] + ry * view_dir[1] + rz * view_dir[2])
    spec = (r_dot_v ** 45.0)[:, :, None] * specular_col * l_col * l_int * 2.2

    total_rgb += diff + spec

# Rim glow on the beveled perimeter
rim_factor = (1.0 - np.maximum(0.0, nz_rot)) ** 2.5
total_rgb += rim_factor[:, :, None] * np.array([170, 51, 255]) / 255.0 * 1.8

# Edge antialiasing alpha mask
pixel_dist = d_q / (2.9 / DIM)
alpha = np.clip(0.5 - pixel_dist, 0.0, 1.0)

# Clamp RGB
total_rgb = np.clip(total_rgb, 0.0, 1.0)

# Compose RGBA image
rgba_data = np.zeros((DIM, DIM, 4), dtype=np.uint8)
rgba_data[:, :, 0] = (total_rgb[:, :, 0] * 255.0).astype(np.uint8)
rgba_data[:, :, 1] = (total_rgb[:, :, 1] * 255.0).astype(np.uint8)
rgba_data[:, :, 2] = (total_rgb[:, :, 2] * 255.0).astype(np.uint8)
rgba_data[:, :, 3] = (alpha * 255.0).astype(np.uint8)

q_img = Image.fromarray(rgba_data)
# Downsample with Lanczos to final 1024x1024
q_img = q_img.resize((SIZE, SIZE), Image.Resampling.LANCZOS)

# ---------------------------------------------------------------------------
# Background with Radial Aura (#000308 matching Three.js scene)
# ---------------------------------------------------------------------------
bg_base = Image.new("RGBA", (SIZE, SIZE), (0, 3, 8, 255))  # #000308
aura = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw_aura = ImageDraw.Draw(aura)

cx, cy = SIZE // 2, SIZE // 2
# Additive canvas gradient behind Q:
# inner: rgba(80, 120, 255, 0.85)
# mid:   rgba(50, 90, 255, 0.28)
# outer: 0
draw_aura.ellipse([cx - 360, cy - 360, cx + 360, cy + 360], fill=(50, 90, 255, 80))
draw_aura.ellipse([cx - 220, cy - 220, cx + 220, cy + 220], fill=(80, 120, 255, 140))
draw_aura.ellipse([cx - 100, cy - 100, cx + 100, cy + 100], fill=(120, 160, 255, 180))
aura = aura.filter(ImageFilter.GaussianBlur(radius=85))

bg_with_aura = Image.alpha_composite(bg_base, aura)

# ---------------------------------------------------------------------------
# Composite Final Full Icon (with aura & background)
# ---------------------------------------------------------------------------
full_icon = Image.alpha_composite(bg_with_aura, q_img)

# ---------------------------------------------------------------------------
# Generate Monochrome Themed Icon (white silhouette with subtle bevel depth)
# ---------------------------------------------------------------------------
mono_alpha = np.array(q_img.split()[3], dtype=np.float32) / 255.0
mono_lum   = (np.array(q_img.convert("L"), dtype=np.float32) / 255.0) * mono_alpha
mono_rgba  = np.zeros((SIZE, SIZE, 4), dtype=np.uint8)
mono_rgba[:, :, 0] = 255
mono_rgba[:, :, 1] = 255
mono_rgba[:, :, 2] = 255
mono_rgba[:, :, 3] = (np.clip(mono_lum * 1.5, 0.0, 1.0) * 255.0).astype(np.uint8)
mono_img = Image.fromarray(mono_rgba)

# ---------------------------------------------------------------------------
# Save Outputs
# ---------------------------------------------------------------------------
TARGET_ASSETS = r"d:\IDB Mini Project\mobile\assets"
TARGET_RES    = r"d:\IDB Mini Project\mobile\android\app\src\main\res"

# 1. Main Expo Assets
full_icon.save(os.path.join(TARGET_ASSETS, "icon.png"), "PNG")
q_img.save(os.path.join(TARGET_ASSETS, "android-icon-foreground.png"), "PNG")
bg_with_aura.save(os.path.join(TARGET_ASSETS, "android-icon-background.png"), "PNG")
mono_img.save(os.path.join(TARGET_ASSETS, "android-icon-monochrome.png"), "PNG")
full_icon.save(os.path.join(TARGET_ASSETS, "splash-icon.png"), "PNG")
full_icon.resize((48, 48), Image.Resampling.LANCZOS).save(os.path.join(TARGET_ASSETS, "favicon.png"), "PNG")
print("SUCCESS: Saved all assets in mobile/assets/")

# 2. Android Splash & Launcher Icons
DENSITIES = {
    'mdpi':    (48,  108, 128),
    'hdpi':    (72,  162, 192),
    'xhdpi':   (96,  216, 256),
    'xxhdpi':  (144, 324, 384),
    'xxxhdpi': (192, 432, 512),
}

for density, (icon_sz, fg_sz, splash_sz) in DENSITIES.items():
    mipmap_dir = os.path.join(TARGET_RES, f"mipmap-{density}")
    drawable_dir = os.path.join(TARGET_RES, f"drawable-{density}")
    os.makedirs(mipmap_dir, exist_ok=True)
    os.makedirs(drawable_dir, exist_ok=True)

    # Legacy launcher icons
    full_icon.resize((icon_sz, icon_sz), Image.Resampling.LANCZOS).save(os.path.join(mipmap_dir, "ic_launcher.png"))
    full_icon.resize((icon_sz, icon_sz), Image.Resampling.LANCZOS).save(os.path.join(mipmap_dir, "ic_launcher_round.png"))

    # Adaptive launcher layers
    bg_with_aura.resize((fg_sz, fg_sz), Image.Resampling.LANCZOS).save(os.path.join(mipmap_dir, "ic_launcher_background.png"))
    q_img.resize((fg_sz, fg_sz), Image.Resampling.LANCZOS).save(os.path.join(mipmap_dir, "ic_launcher_foreground.png"))
    mono_img.resize((fg_sz, fg_sz), Image.Resampling.LANCZOS).save(os.path.join(mipmap_dir, "ic_launcher_monochrome.png"))

    # Splash screen logo (centered Q)
    q_img.resize((splash_sz, splash_sz), Image.Resampling.LANCZOS).save(os.path.join(drawable_dir, "splashscreen_logo.png"))

print("SUCCESS: Saved all Android mipmap and drawable densities!")
