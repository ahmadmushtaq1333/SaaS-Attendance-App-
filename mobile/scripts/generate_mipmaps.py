import os
from PIL import Image, ImageDraw

ASSETS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'assets'))
RES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'android', 'app', 'src', 'main', 'res'))

# Load base 1024x1024 images
icon_full = Image.open(os.path.join(ASSETS_DIR, 'icon.png')).convert('RGBA')
icon_fg = Image.open(os.path.join(ASSETS_DIR, 'android-icon-foreground.png')).convert('RGBA')
icon_bg = Image.open(os.path.join(ASSETS_DIR, 'android-icon-background.png')).convert('RGBA')
icon_mono = Image.open(os.path.join(ASSETS_DIR, 'android-icon-monochrome.png')).convert('RGBA')
icon_splash = Image.open(os.path.join(ASSETS_DIR, 'splash-icon.png')).convert('RGBA')

# Generate favicon.png (48x48)
favicon = icon_full.resize((48, 48), Image.Resampling.LANCZOS)
favicon.save(os.path.join(ASSETS_DIR, 'favicon.png'))
print("SUCCESS: Generated favicon.png (48x48)")

# Density map: (launcher_size, adaptive_fg_size, splash_logo_size)
DENSITIES = {
    'mdpi': (48, 108, 128),
    'hdpi': (72, 162, 192),
    'xhdpi': (96, 216, 256),
    'xxhdpi': (144, 324, 384),
    'xxxhdpi': (192, 432, 512),
}

for density, (l_sz, fg_sz, sp_sz) in DENSITIES.items():
    mipmap_dir = os.path.join(RES_DIR, f'mipmap-{density}')
    drawable_dir = os.path.join(RES_DIR, f'drawable-{density}')
    os.makedirs(mipmap_dir, exist_ok=True)
    os.makedirs(drawable_dir, exist_ok=True)

    # 1. Standard Square Launcher
    l_img = icon_full.resize((l_sz, l_sz), Image.Resampling.LANCZOS)
    l_img.save(os.path.join(mipmap_dir, 'ic_launcher.png'))

    # 2. Round Launcher (with circular alpha mask)
    mask = Image.new('L', (l_sz, l_sz), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, l_sz - 1, l_sz - 1), fill=255)
    r_img = Image.new('RGBA', (l_sz, l_sz), (0, 0, 0, 0))
    r_img.paste(l_img, (0, 0), mask)
    r_img.save(os.path.join(mipmap_dir, 'ic_launcher_round.png'))

    # 3. Adaptive Foreground
    fg_img = icon_fg.resize((fg_sz, fg_sz), Image.Resampling.LANCZOS)
    fg_img.save(os.path.join(mipmap_dir, 'ic_launcher_foreground.png'))

    # 3b. Adaptive Background
    bg_img = icon_bg.resize((fg_sz, fg_sz), Image.Resampling.LANCZOS)
    bg_img.save(os.path.join(mipmap_dir, 'ic_launcher_background.png'))

    # 4. Adaptive Themed Monochrome
    mono_img = icon_mono.resize((fg_sz, fg_sz), Image.Resampling.LANCZOS)
    mono_img.save(os.path.join(mipmap_dir, 'ic_launcher_monochrome.png'))

    # 5. Splashscreen Logo
    sp_img = icon_splash.resize((sp_sz, sp_sz), Image.Resampling.LANCZOS)
    sp_img.save(os.path.join(drawable_dir, 'splashscreen_logo.png'))

    print(f"SUCCESS: Generated mipmaps and drawables for {density}")

print("SUCCESS: All Android mipmaps and drawables generated from Three.js WebGL master assets!")
