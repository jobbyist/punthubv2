import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

/** Lets a signed-in member flag a pick to moderators. One report per member per pick. */
export function ReportButton({ predictionId }: { predictionId: string }) {
  const { t } = useTranslation("match");
  const { profile } = useSession();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!profile) {
    return (
      <Link
        to="/join"
        className="text-xs text-muted-foreground underline"
        title={t("report.signIn")}
      >
        {t("report.cta")}
      </Link>
    );
  }

  const send = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("reports")
      .insert({ reporter_id: profile.id, prediction_id: predictionId, reason: reason.trim() });
    setBusy(false);
    if (error) {
      toast.error(error.code === "23505" ? t("report.already") : t("report.error"));
      if (error.code === "23505") setOpen(false);
      return;
    }
    toast.success(t("report.thanks"));
    setOpen(false);
    setReason("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground underline"
      >
        {t("report.cta")}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("report.title")}</DialogTitle>
            <DialogDescription>{t("report.body")}</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            maxLength={500}
            placeholder={t("report.placeholder")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("report.cancel")}
            </Button>
            <Button disabled={busy || reason.trim() === ""} onClick={() => void send()}>
              {t("report.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
