import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
  "Outside South Africa",
] as const;

type Details = {
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth: string;
  province: string;
};
const EMPTY: Details = {
  first_name: "",
  last_name: "",
  phone: "",
  date_of_birth: "",
  province: "",
};

// member_details is new; this loose view avoids a types.ts dependency until it is regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => (supabase as any).from("member_details");

/** Optional personal details, saved to the member's own private row. Used on the account page. */
export function MemberDetailsForm({ userId }: { userId: string }) {
  const { t } = useTranslation("account");
  const [v, setV] = useState<Details>(EMPTY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void table()
      .select("first_name,last_name,phone,date_of_birth,province")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }: { data: Partial<Record<keyof Details, string | null>> | null }) => {
        if (data)
          setV({
            first_name: data.first_name ?? "",
            last_name: data.last_name ?? "",
            phone: data.phone ?? "",
            date_of_birth: data.date_of_birth ?? "",
            province: data.province ?? "",
          });
      });
  }, [userId]);

  const set = (k: keyof Details) => (e: { target: { value: string } }) =>
    setV((p) => ({ ...p, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (v.date_of_birth) {
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 18);
      if (new Date(v.date_of_birth) > cutoff) {
        toast.error(t("details.under18"));
        return;
      }
    }
    setBusy(true);
    const orNull = (s: string) => (s.trim() === "" ? null : s.trim());
    const { error } = await table().upsert({
      user_id: userId,
      first_name: orNull(v.first_name),
      last_name: orNull(v.last_name),
      phone: orNull(v.phone),
      date_of_birth: orNull(v.date_of_birth),
      province: orNull(v.province),
    });
    setBusy(false);
    if (error) toast.error(t("details.error"));
    else {
      toast.success(t("details.saved"));
      window.dispatchEvent(new Event("puntr:details-saved"));
    }
  };

  return (
    <form id="details" onSubmit={save} className="card-surface mt-6 grid gap-4 p-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <h2 className="text-lg">{t("details.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("details.body")}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="md-first">{t("details.firstName")}</Label>
        <Input
          id="md-first"
          autoComplete="given-name"
          maxLength={80}
          value={v.first_name}
          onChange={set("first_name")}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="md-last">{t("details.lastName")}</Label>
        <Input
          id="md-last"
          autoComplete="family-name"
          maxLength={80}
          value={v.last_name}
          onChange={set("last_name")}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="md-phone">{t("details.phone")}</Label>
        <Input
          id="md-phone"
          type="tel"
          autoComplete="tel"
          placeholder="+27 82 123 4567"
          value={v.phone}
          onChange={set("phone")}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="md-dob">{t("details.dob")}</Label>
        <Input
          id="md-dob"
          type="date"
          autoComplete="bday"
          value={v.date_of_birth}
          onChange={set("date_of_birth")}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="md-prov">{t("details.province")}</Label>
        <select
          id="md-prov"
          value={v.province}
          onChange={set("province")}
          className="h-10 w-full border border-input bg-background px-3 text-sm"
        >
          <option value="">{t("details.provinceNone")}</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={busy} className="sm:w-fit">
        {t("details.save")}
      </Button>
    </form>
  );
}
