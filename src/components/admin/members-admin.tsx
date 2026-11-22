import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAsync } from "@/hooks/use-async";
import {
  adminBroadcast,
  adminListMembers,
  adminMemberAction,
  type AdminMember,
} from "@/lib/admin-platform.functions";
import { formatDate, formatDateTime } from "@/lib/format";

const panel = "card-surface p-5";
const FILTERS = ["all", "founding", "banned", "suspended", "admins"] as const;
const ENTITLEMENTS = ["early_access", "pro", "tools", "beta_tester"] as const;
type Panel = "message" | "warn" | "restrict" | "account" | "credits" | null;

/** /admin > Users: every member, their account state and the controls an admin needs. */
export function MembersTab() {
  const { t } = useTranslation("admin");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [nonce, setNonce] = useState(0);
  const list = useAsync(() => adminListMembers({ data: { query, filter } }), [filter, nonce]);
  const [open, setOpen] = useState<string | null>(null);
  const rows = list.data ?? [];

  return (
    <div className="space-y-5">
      <section className={panel}>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setNonce((n) => n + 1¶»§q«^