import type { ImgHTMLAttributes } from "react";

// Logos are transparent PNGs. Light mode: greyscale until hovered, then full colour. Dark mode: white silhouette
// (brightness-0 invert) that brightens on hover; the colour reveal is skipped there because several marks are
// near-black and would disappear on a dark background.
const LOGO_IMAGE_CLASSES = [
  "max-h-8 max-w-full object-contain grayscale opacity-60 transition-all duration-300 sm:max-h-10",
  "dark:brightness-0 dark:invert dark:opacity-70",
  "hover:scale-105 hover:grayscale-0 hover:opacity-100 dark:hover:opacity-100",
  "focus-visible:scale-105 focus-visible:grayscale-0 focus-visible:opacity-100 dark:focus-visible:opacity-100",
  "active:scale-105 active:grayscale-0 active:opacity-100 dark:active:opacity-100",
  "group-hover:scale-105 group-hover:grayscale-0 group-hover:opacity-100 dark:group-hover:opacity-100",
  "group-focus-within:scale-105 group-focus-within:grayscale-0 group-focus-within:opacity-100 dark:group-focus-within:opacity-100",
  "group-active:scale-105 group-active:grayscale-0 group-active:opacity-100 dark:group-active:opacity-100",
].join(" ");

type PartnerLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "className"> & {
  className?: string;
};

/** Shared monochrome treatment for bookmaker and partner logo tiles. */
export function PartnerLogo({ className = "", ...props }: PartnerLogoProps) {
  return <img {...props} className={`${LOGO_IMAGE_CLASSES} ${className}`.trim()} />;
}
