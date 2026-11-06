/** Official Puntr social channels. Single source for the footer, the header menu and the mobile menu. */
export const SOCIAL_LINKS = [
  {
    key: "facebook",
    href: "https://www.facebook.com/share/19yV1eSk71/?mibextid=wwXIfr",
  },
  { key: "instagram", href: "https://instagram.com/puntrza" },
  { key: "tiktok", href: "https://tiktok.com/@puntrza" },
  { key: "x", href: "https://x.com/puntrza" },
  { key: "telegram", href: "https://t.me/puntrza" },
  { key: "whatsapp", href: "https://chat.whatsapp.com/F7wPY6NrXSc7OPrqq3os7w" },
] as const;

export type SocialKey = (typeof SOCIAL_LINKS)[number]["key"];
