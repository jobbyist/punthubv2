# Good Sport merchandise: production pack

PuntPoints rewards (Admin > Rewards): `merch-cap`, `merch-tee`, `merch-socks`, `merch-mug`.
Store photos: `public/rewards/merch/good-sport-*.jpg` (1200 x 1200, 3D renders of these specs).

## Colours

| Role                  | Hex     | Pantone (nearest, confirm with supplier) |
| --------------------- | ------- | ---------------------------------------- |
| Green (flat versions) | #16A34A | 7740 C                                   |
| Ink outline           | #020617 | Black 6 C                                |
| Sticker border        | #FFFFFF | White                                    |

The full-colour artwork keeps the original grey-to-green gradient and soft drop shadow. The flat versions drop
the shadow and use solid green, which is what embroidery, jacquard knit and screen print need.

## Master artwork

| File                                  | Use                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `goodsport-thick-fullcolour.png`      | Thick ink outline, gradient, transparent, 300 dpi (about 10.8 x 9.3 in) |
| `goodsport-sticker-fullcolour.png`    | Thin outline + white sticker border, gradient, transparent, 300 dpi     |
| `goodsport-thick-flat.svg` / `.png`   | 2 colours (green, ink), vector                                          |
| `goodsport-sticker-flat.svg` / `.png` | 3 colours (green, ink, white), vector                                   |

Use the sticker version on dark products (cap, T-shirt) and the thick version on light products (socks, mug).

## Product specs

| Product | Blank                                                                | Method                                                              | Print file                                                                                          | Size on product                                |
| ------- | -------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Cap     | Black 6-panel structured cotton twill, curved brim, adjustable strap | Flat embroidery, 3 thread colours                                   | `cap-front-embroidery-4.25x2.5in-300dpi.png` + `goodsport-sticker-flat.svg` (digitise from the SVG) | About 4 x 2.25 in, centred on the front panels |
| T-shirt | Black heavyweight cotton crew neck, S to XXL                         | DTF (keeps the gradient) or 4-colour screen print from the flat SVG | `tee-front-dtf-12x14in-300dpi.png`                                                                  | 10 in wide, top 3 in below the collar          |
| Socks   | White cotton crew sports sock, black cuff, two green stripes         | Jacquard knit (flat colours)                                        | `socks-calf-jacquard-3x3in-300dpi.png` + `goodsport-thick-flat.svg`                                 | About 2.5 to 3 in, outer calf                  |
| Mug     | White ceramic 11 oz (330 ml), black handle and inside                | Sublimation, full colour                                            | `mug-11oz-sublimation-wrap-8.5x3.5in-300dpi.png`                                                    | Logo on both sides, about 3 in tall            |

Ask each supplier for a physical proof before the first run, and check the green against a printed #16A34A swatch.

## Regenerating

`render/art.py` builds the print files from the two source wordmarks. `render/scene.js` is the three.js scene
behind the store photos (`node render/shot.js mug,cap,socks,tee 1600` with `three@0.170.0` and Playwright
installed beside it). Swap in supplier photos when samples arrive.
