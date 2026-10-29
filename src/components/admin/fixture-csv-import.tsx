import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { importFixturesCsv, type ImportResult } from "@/lib/admin.functions";

/** Admin fallback import. Mounted on /admin/fixtures now and in the admin Fixtures tab in P11. */
export function FixtureCsvImport() {
  const { t } = useTranslation("admin");
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const submit = async () => {
    setBusy(true);
    setResult(null);
    const out = await importFixturesCsv({ data: { csv } }).catch((): ImportResult => ({
      ok: false,
      code: "error",
    }));
    setBusy(false);
    setResult(out);
    if (out.ok) setCsv("");
  };

  return (
    <section className="card-surface p-5">
      <h2 className="text-lg">{t("csv.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("csv.body")}</p>
      <pre className="mt-3 overflow-x-auto border border-border bg-muted/40 p-3 text-xs">
        {t("csv.example")}
      </pre>
      <div className="mt-4 space-y-1.5">
        <Label htmlFor="csv">{t("csv.label")}</Label>
        <Textarea
          id="csv"
          rows={8}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          className="font-mono text-xs"
        />
      </div>
      <Button className="mt-4" disabled={busy || csv.trim() === ""} onClick={() => void submit()}>
        {busy ? t("csv.importing") : t("csv.import")}
      </Button>

      {result?.ok && (
        <p role="status" className="mt-4 text-sm text-primary">
          {t("csv.done", { count: result.imported })}
        </p>
      )}
      {result && !result.ok && (
        <div role="alert" className="mt-4 text-sm text-destructive">
          <p>{t(`csv.error.${result.code}`)}</p>
          {result.errors && (
            <ul className="mt-2 list-disc pl-5">
              {result.errors.slice(0, 20).map((e) => (
                <li key={`${e.line}-${e.message}`}>
                  {t("csv.line", { line: e.line })}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
