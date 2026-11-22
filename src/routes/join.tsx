import { PageArt } from "@/components/motion/page-art";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Trans, useTranslation } from "react-i18next";

import { MfaChallenge } from "@/components/mfa-challenge";
import { RgNotice } from "@/components/rg-notice";
import { AnnualPassClaim } from "@/components/annual-pass-claim";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  completeSignup,
  discardUnderageSignup,
  signInWithUsername,
} from "@/lib/accounts.functions";
import { analytics } from "@/lib/analytics";
import { parseIdentifier } from "@/lib/identifier";
import { mfaRequired } from "@/lib/mfa";
import { validatePassword } from "@/lib/password";
import { FoundingCounter } from "@/components/founding-counter";
import { QuestsChecklist } from "@/components/quests-checklist";
import { forgetRef, rememberRef, storedRef } from "@/lib/ref-store";
import { FOUNDING_CAP } from "@/lib/flags";
import { safeNext } from "@/lib/email/auth-emails";
import { AUTH_RETURN_STORAGE_KEY } from "@/components/auth-return-tracker";
import {¶»§q«^