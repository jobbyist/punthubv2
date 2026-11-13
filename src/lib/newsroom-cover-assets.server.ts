// Fonts and logo embedded into the cover SVG as data URIs (an <img>-rendered SVG cannot load external files).
import inter400 from "@fontsource/inter/files/inter-latin-400-normal.woff2?inline";
import montserrat800 from "@fontsource/montserrat/files/montserrat-latin-800-normal.woff2?inline";

import logo from "@/assets/cover-logo.png?inline";

import type { CoverAssets } from "./newsroom-cover";

export function coverAssets(): CoverAssets {
  return { logo, montserrat800, inter400 };
}
