/**
 * Apple launch (splash) images for the installed PWA, one per iPhone and iPad screen, light and dark.
 * iOS has no manifest splash, so each size needs its own <link rel="apple-touch-startup-image">. Generated from
 * public/brand/puntr-wordmark*.png at the same size and position as the in-app splash (`<Preloader />`), so the
 * hand-over from the system image to the animated splash is seamless.
 */
const SIZES: ReadonlyArray<readonly [number, number, number]> = [
  [430, 932, 3],
  [393, 852, 3],
  [440, 956, 3],
  [402, 874, 3],
  [428, 926, 3],
  [390, 844, 3],
  [375, 812, 3],
  [414, 896, 3],
  [414, 896, 2],
  [360, 780, 3],
  [375, 667, 2],
  [414, 736, 3],
  [320, 568, 2],
  [1024, 1366, 2],
  [834, 1194, 2],
  [820, 1180, 2],
  [834, 1112, 2],
  [810, 1080, 2],
  [768, 1024, 2],
  [744, 1133, 2],
  [1032, 1376, 2],
  [834, 1210, 2],
];

export const APPLE_SPLASH_LINKS = SIZES.flatMap(([w, h, dpr]) =>
  (["light", "dark"] as const).map((scheme) => ({
    rel: "apple-touch-startup-image",
    href: `/splash/apple-splash-${w * dpr}x${h * dpr}-${scheme}.png`,
    media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait) and (prefers-color-scheme: ${scheme})`,
  })),
);
