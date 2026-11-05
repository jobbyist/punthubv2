import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/hooks/use-notifications";
import { formatDateTime } from "@/lib/format";

/** Bell with an unread badge and a dropdown of recent Puntr team updates. Signed-in members only. */
export function NotificationBell() {
  const { t } = useTranslation("nav");
  const { profile } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { items, status, unread, markRead, reload } = useNotifications(profile?.id);

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) void reload();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative grid size-9 shrink-0 place-items-center rounded-full border border-border text-foreground transition-colors hover:bg-muted"
          aria-label={
            unread > 0
              ? `${t("notifications.label")}, ${t("notifications.unread", { count: unread })}`
              : t("notifications.label")
          }
        >
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground tnum">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={12}
        className="w-[min(22rem,calc(100vw-1.5rem))] p-0"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h4 className="text-sm font-bold">{t("notifications.title")}</h4>
          {unread > 0 && (
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline"
              onClick={() => void markRead(items.filter((n) => !n.read).map((n) => n.id))}
            >
              {t("notifications.markAll")}
            </button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
          {status === "loading" && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground" role="status">
              {t("notifications.loading")}
            </p>
          )}
          {status === "error" && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">{t("notifications.error")}</p>
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-primary hover:underline"
                onClick={() => void reload()}
              >
                {t("notifications.retry")}
              </button>
            </div>
          )}
          {status === "ready" && items.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {t("notifications.empty")}
            </p>
          )}
          {status === "ready" && items.length > 0 && (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted"
                    onClick={() => {
                      void markRead([n.id]);
                      setOpen(false);
                      if (n.target_url) {
                        if (n.target_url.startsWith("/")) void navigate({ to: n.target_url });
                        else window.open(n.target_url, "_blank", "noopener,noreferrer");
                      }
                    }}
                  >
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      {n.category && (
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-primary">
                          {n.category}
                        </span>
                      )}
                      <span className="block truncate text-sm font-semibold">{n.title}</span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                        {n.message}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-foreground tnum">
                        {formatDateTime(new Date(n.published_at))}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
