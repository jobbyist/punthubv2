import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { TeamBadgesPanel } from "@/components/admin/badges-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAsync } from "@/hooks/use-async";
import {
  adminListLogos,
  adminRemoveLogoImage,
  adminSaveLogo,
  adminUploadLogo,
} from "@/lib/logos.functions";
import { compressLogo } from "@/lib/logo-compress";
import { LOGO_KINDS, LOGO_PLACEMENTS, type BrandLogo, type LogoPlacement } from "@/lib/logos";

/** Admin > Logos/Branding. Team badges keep their own resolver; everything else is managed here. */
export function LogosTab() {
  const { t } = useTranslation("admin");
  const [tick, setTick] = useState(0);
  const { data, loading } = useAsync(() => adminListLogos(), [tick]);
  const [filter, setFilter] = useState<LogoPlacement | "all">("all");
  const [adding, setAdding] = useState(false);
  const rows = (data ?? []).filter((l) => filter === "all" || l.placements.includes(filter));
  const reload = () => setTick((n) => n + 1);

  return (
    <div className="space-y-5">
      <section className="card-surface p-5">
        <h2 className="text-lg">{t("logos.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("logos.body")}</p>
        <p className="mt-2 text-sm font-medium">{t("logos.endorsementWarning")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["all", ...LOGO_PLACEMENTS] as const).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={filter === p ? "default" : "outline"}
              onClick={() => setFilter(p)}
            >
              {t(`logos.placement.${p}`)}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => setAdding((a) => !a)}>
            {t("logos.add")}
          </Button>
        </div>
        {adding && (
          <LogoRow
            key="new"
            logo={null}
            onDone={() => {
              setAdding(false);
              reload();
            }}
          />
        )}
        {loading && !data && <p className="mt-3 text-sm text-muted-foreground">…</p>}
        <ul className="mt-4 divide-y divide-border">
          {rows.map((l) => (
            <LogoRow key={`${l.id}:${l.imageUrl ?? ""}`} logo={l} onDone={reload} />
          ))}
        </ul>
      </section>
      <div>
        <h3 className="mb-2 text-sm font-semibold">{t("logos.teamBadges")}</h3>
        <TeamBadgesPanel />
      </div>
    </div>
  );
}

function LogoRow({ logo, onDone }: { logo: BrandLogo | null; onDone: () => void }) {
  const { t } = useTranslation("admin");
  const [name, setName] = useState(logo?.name ?? "");
  const [kind, setKind] = useState<BrandLogo["kind"]>(logo?.kind ?? "partner");
  const [placements, setPlacements] = useState<LogoPlacement[]>(logo?.placements ?? ["footer"]);
  const [link, setLink] = useState(logo?.linkUrl ?? "");
  const [sort, setSort] = useState(String(logo?.sortOrder ?? 100));
  const [active, setActive] = useState(logo?.active ?? false);
  const [busy, setBusy] = useState(false);

  const toggle = (p: LogoPlacement) =>
    setPlacements((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  async function save() {
    setBusy(true);
    try {
      const r = await adminSaveLogo({
        data: {
          ...(logo ? { id: logo.id } : {}),
          name,
          kind,
          placements,
          linkUrl: link,
          active: active && !!logo?.imageUrl,
          sortOrder: Number(sort),
        },
      });
      if (r.ok) {
        toast.success(t("logos.saved"));
        onDone();
      } else toast.error(r.message);
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File | undefined) {
    if (!file || !logo) return;
    setBusy(true);
    try {
      const base64 = await compressLogo(file);
      const r = await adminUploadLogo({ data: { id: logo.id, base64 } });
      if (r.ok) {
        toast.success(t("logos.uploaded"));
        onDone();
      } else toast.error(r.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("logos.uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function removeImage() {
    if (!logo) return;
    setBusy(true);
    try {
      const r = await adminRemoveLogoImage({ data: { id: logo.id } });
      if (r.ok) onDone();
      else toast.error(r.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="grid gap-3 py-4 sm:grid-cols-[96px_1fr]">
      <div className="grid h-20 w-24 place-items-center border border-dashed border-border bg-card">
        {logo?.imageUrl ? (
          <img src={logo.imageUrl} alt={logo.name} className="max-h-16 max-w-20 object-contain" />
        ) : (
          <span className="px-1 text-center text-[10px] text-muted-foreground">
            {t("logos.noImage")}
          </span>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Input
            aria-label={t("logos.name")}
            className="min-w-48 flex-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("logos.name")}
          />
          <select
            aria-label={t("logos.kind")}
            className="h-10 border border-input bg-background px-2 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value as BrandLogo["kind"])}
          >
            {LOGO_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`logos.kindName.${k}`)}
              </option>
            ))}
          </select>
          <Input
            aria-label={t("logos.order")}
            className="w-20"
            inputMode="numeric"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          />
        </div>
        <Input
          aria-label={t("logos.link")}
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder={t("logos.linkPlaceholder")}
        />
        <div className="flex flex-wrap gap-3 text-sm">
          {LOGO_PLACEMENTS.map((p) => (
            <label key={p} className="flex items-center gap-1.5">
              <input type="checkbox" checked={placements.includes(p)} onChange={() => toggle(p)} />
              {t(`logos.placement.${p}`)}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm font-medium">
            <input
              type="checkbox"
              checked={active}
              disabled={!logo?.imageUrl}
              onChange={(e) => setActive(e.target.checked)}
            />
            {t("logos.active")}
          </label>
          {logo && (
            <label className="cursor-pointer text-sm font-semibold text-primary">
              {logo.imageUrl ? t("logos.replace") : t("logos.upload")}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                disabled={busy}
                onChange={(e) => void upload(e.target.files?.[0])}
              />
            </label>
          )}
          {logo?.imageUrl && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void removeImage()}>
              {t("logos.removeImage")}
            </Button>
          )}
          <Button size="sm" disabled={busy || !name.trim()} onClick={() => void save()}>
            {t("logos.save")}
          </Button>
        </div>
      </div>
    </li>
  );
}
