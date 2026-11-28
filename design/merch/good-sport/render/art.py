from PIL import Image
import numpy as np
DPI=(300,300)
INK=(2,6,23); GREEN=(22,163,74); WHITE=(255,255,255)
def crop(im,pad=40):
    b=im.getbbox(); 
    im=im.crop(b); out=Image.new('RGBA',(im.width+2*pad,im.height+2*pad),(0,0,0,0)); out.paste(im,(pad,pad)); return out
def flat(im, has_white):
    a=np.array(im).astype(np.float32); rgb=a[...,:3]; al=a[...,3]
    lum=rgb@[0.299,0.587,0.114]
    sat=rgb.max(-1)-rgb.min(-1)
    out=np.zeros_like(a)
    ink=lum<70
    white=(lum>235)&(sat<20)
    green=~ink&~white
    out[ink,:3]=INK; out[green,:3]=GREEN; out[white,:3]=WHITE
    # drop soft drop-shadow (low alpha), keep antialiasing edges of solid areas
    keep=al>=160
    out[...,3]=np.where(keep,255,0)
    return Image.fromarray(out.astype(np.uint8))
for name in ['thick','sticker']:
    im=crop(Image.open(f'{name}.png').convert('RGBA'))
    im.save(f'print/goodsport-{name}-fullcolour.png',dpi=DPI)
    f=flat(im,name=='sticker'); f.save(f'print/goodsport-{name}-flat.png',dpi=DPI)
    print(name, im.size)
def place(canvas_px, logo, box, bg=(0,0,0,0)):
    W,H=canvas_px; c=Image.new('RGBA',(W,H),bg)
    bw,bh,cx,cy=box
    s=min(bw/logo.width,bh/logo.height); l=logo.resize((round(logo.width*s),round(logo.height*s)),Image.LANCZOS)
    c.alpha_composite(l,(round(cx-l.width/2),round(cy-l.height/2))); return c
th=Image.open('print/goodsport-thick-fullcolour.png'); st=Image.open('print/goodsport-sticker-fullcolour.png')
thf=Image.open('print/goodsport-thick-flat.png'); stf=Image.open('print/goodsport-sticker-flat.png')
# T-shirt: DTF front print, 12x14in canvas, artwork 10in wide, 1in below top
place((3600,4200),st,(3000,3000,1800,300+1500)).save('print/tee-front-dtf-12x14in-300dpi.png',dpi=DPI)
# Cap: front-panel embroidery, 4.25x2.5in area, flat 3-colour
place((1275,750),stf,(1200,690,637,375)).save('print/cap-front-embroidery-4.25x2.5in-300dpi.png',dpi=DPI)
# Socks: jacquard knit outer-calf motif 3x3in, flat colours on white
place((900,900),thf,(840,840,450,450)).save('print/socks-calf-jacquard-3x3in-300dpi.png',dpi=DPI)
# Mug: 11oz sublimation wrap 8.5x3.5in, logo on both faces
m=Image.new('RGBA',(2550,1050),(255,255,255,255))
for cx in (2550*0.25,2550*0.75):
    m.alpha_composite(place((2550,1050),th,(1050,900,cx,525)))
m.convert('RGB').save('print/mug-11oz-sublimation-wrap-8.5x3.5in-300dpi.png',dpi=DPI)
