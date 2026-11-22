import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity,
  ArrowUpRight,
  CalendarClock,
  ClipboardList,
  Handshake,
  Plus,
  RefreshCw,
  Search,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  adminAddFoundingHqActivity,
  adminDeleteFoundingHqLead,
  adminFoundingHqOverview,
  adminSaveFoundingHqLead,
  type FoundingHqLead,
} from "@/lib/founding-hq.functions";

const panel = "card-surface border border-border/70 p-4 sm:p-5";
const selectClass =
  "h-10 w-full border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";
const stages = [
  ["new", "New"],
  ["engaged", "Engaged"],
  ["contacted", "Contacted"],
  ["replied", "Replied"],
  ["interested", "Interested"],
  ["link_sent", "Link sent"],
  ["follow_up", "Follow-up"],
  ["registered", "Registered"],
  ["not_interested", "Not interested"],
  ["do_not_contact", "Do not contact"],
] as const;
const segments = [
  ["punter", "Punter"],
  ["tipster", "Tipster"],
  ["hybrid", "Both / hybrid"],
  ["community_admin", "Community admin"],
] as const;
const ambassadorStages = [
  ["not_approached", "Not approached"],
  ["identified", "Identified"],
  ["approached", "Approached"],
  ["in_discussion", "In discu¶»§q«^