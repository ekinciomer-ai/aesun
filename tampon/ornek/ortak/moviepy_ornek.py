import os
from moviepy import ImageClip, TextClip, CompositeVideoClip, concatenate_videoclips, vfx
G, C = os.environ["GIRDI"], os.environ["CIKTI"]
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
W, H = 720, 1280
def sahne(img, yazi, sure=3):
    a = ImageClip(f"{G}/{img}").resized(height=H)
    a = a.with_position(("center", "center")).with_duration(sure).with_effects([vfx.Resize(lambda t: 1 + 0.06 * t)])
    t = TextClip(font=F, text=yazi, font_size=60, color="white", stroke_color="black", stroke_width=3,
                 size=(W - 80, None), method="caption").with_duration(sure).with_position(("center", H * 0.72))
    return CompositeVideoClip([a, t], size=(W, H)).with_effects([vfx.CrossFadeIn(0.4)])
v = concatenate_videoclips([sahne("uydu.jpg", "Hoover Barajı · uydu"), sahne("astronot.jpg", "Ay, 1969"),
                            sahne("kare.jpg", "Rüzgârın devi")], method="compose", padding=-0.4)
v.write_videofile(f"{C}/moviepy_ornek.mp4", fps=25, codec="libx264", preset="veryfast", audio=False, logger=None)
print("tamam", v.duration)
