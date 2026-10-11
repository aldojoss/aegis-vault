import os
from PIL import Image, ImageDraw

# Create build directory
os.makedirs('build', exist_ok=True)

size = 512
img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Background circle with deep dark navy blue
margin = 24
draw.ellipse(
    [margin, margin, size - margin, size - margin],
    fill=(11, 16, 26, 255),
    outline=(6, 182, 212, 180),
    width=8
)

# Draw Shield Path
# Center is 256, 256
shield_top = 90
shield_bottom = 420
shield_left = 110
shield_right = 402

shield_points = [
    (256, shield_top),          # Top point
    (shield_right, 130),        # Top right
    (shield_right, 270),        # Mid right
    (256, shield_bottom),       # Bottom tip
    (shield_left, 270),         # Mid left
    (shield_left, 130),         # Top left
]

# Draw shield base gradient-like fill
draw.polygon(shield_points, fill=(16, 24, 40, 255))
draw.line(shield_points + [shield_points[0]], fill=(16, 185, 129, 255), width=10)

# Inner shield accent
inner_points = [
    (256, shield_top + 30),
    (shield_right - 25, 150),
    (shield_right - 25, 260),
    (256, shield_bottom - 35),
    (shield_left + 25, 260),
    (shield_left + 25, 150),
]
draw.polygon(inner_points, fill=(12, 38, 48, 230))
draw.line(inner_points + [inner_points[0]], fill=(6, 182, 212, 240), width=6)

# Keyhole / Vault Lock in center
center_x = 256
center_y = 240

# Keyhole circle
draw.ellipse(
    [center_x - 36, center_y - 40, center_x + 36, center_y + 32],
    fill=(6, 182, 212, 255)
)

# Keyhole stem
stem_points = [
    (center_x - 18, center_y + 10),
    (center_x + 18, center_y + 10),
    (center_x + 28, center_y + 80),
    (center_x - 28, center_y + 80),
]
draw.polygon(stem_points, fill=(6, 182, 212, 255))

# Center core glow
draw.ellipse(
    [center_x - 16, center_y - 20, center_x + 16, center_y + 12],
    fill=(255, 255, 255, 240)
)

# Save 512x512 PNG
img.save('build/icon.png', 'PNG')

# Save multi-size ICO
icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
img.save('build/icon.ico', format='ICO', sizes=icon_sizes)

print('Iconos generados exitosamente en build/icon.ico y build/icon.png')
