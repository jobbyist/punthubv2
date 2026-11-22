import { useCallback, useEffect, useState } from "react";
import { BellRing, LoaderCircle, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { pushApiRequest } from "@/lib/push-notifications";

type Campaign = {
  id: string;
  title: string;
  body: string;
  audience: string;
  status: string;
  attempted_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
};
type Overview = {
  activeSubscriptions: number;
  sent30d: number;
  failed30d: number;
  campaigns: Campaign[];
};
type Audience = "all" | "founding" | "member";

const panel = "card-surface p-5";

export function PushNotificationsAdmin() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetUrl, setTargetUrl] = useState("/predictions");
  const [audience, setAudience] = useState<Audience>("all");
  const [username, setUsername] = useState("");

  const refresh = useCallback(async () => {
    const data = await pushApiRequest<Overview>({ action: "overview" });
    setOverview(data);
  }, []);

  useEffect(() => {
    let active = true;
    void refresh()
      .catch((error) => {
        if (active)
      ¶»§q«^