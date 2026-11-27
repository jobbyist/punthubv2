import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { openSiteSearch } from "@/lib/search-index";

/** Header search: an icon button on phones, a search field look-alike from lg up. Opens the site search dialog. */
export function SearchTrigger() {
  const { t } = useTranslation("nav");
  return (
    <>
      <button
        type="button"
        onClick={() => openSiteSearch()}
        aria-label={t("search.open")}
        aria-haspopup="dialog"
        className="grid size-10 shrink-0 place-items-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary xl:hidden"
      >
        <Search className="size-[18px]" />
      </button>
      <button
        type="button"
        onClick={() => openSiteSearch()}
        aria-haspopup="dialog"
        className="hidden h-10 w-60 shrink-0 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary xl:flex 2xl:w-64"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 truncate">{t("search.trigger")}</span>
        <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold">
          ⌘K
        </kbd>
      </button>
    </>
  );
}
