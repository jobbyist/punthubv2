import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PersonaRow = {
  persona_key: string;
  persona: Record<string, unknown>;
  active: boolean;
  profile_id: string | null;
};

export interface AiMemberProvisionResult {
  ok: boolean;
  created: number;
  alreadyProvisioned: number;
  failed: number;
  members: { personaKey: string; username: string; foundingNumber: number | null }[];
  errors: { personaKey: string; message: string }[];
}

function personaNumber(key: string): string {
  return key.slice(-2);
}

/**
 * Creates the 50 labelled AI founding profiles using Supabase Auth Admin.
 * This is an idempotent, admin-only operation. The generated .invalid addresses cannot receive mail,
 * the generated passwords are never returned, and the accounts are operated only by server-side jobs.
 */
export const adminProvisionAiFoundingMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AiMemberProvisionResult> => {
    const { data: allowed, error: permissionError } = await context.supabase.rpc("is_admin");
    if (permissionError || allowed !== true) {
      return {
        ok: false,
        created: 0,
        alreadyProvisioned: 0,
        failed: 0,
        members: [],
        errors: [{ personaKey: "all", message: "Administrator access is required." }],
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as SupabaseClient;
    const { data: personaData, error: personaError } = await db
      .from("synthetic_personas")
      .select("persona_key, persona, active, profile_id")
      .eq("active", true)
      .order("persona_key");
    if (personaError) throw new Error(`Could not load AI personas: ${personaError.message}`);

    const personas = (personaData ?? []) as unknown as PersonaRow[];
    if (personas.length !== 50) {
      return {
        ok: false,
        created: 0,
        alreadyProvisioned: 0,
        failed: 0,
        members: [],
        errors: [{ personaKey: "all", message: `Expected exactly 50 active personas; found ${personas.length}. No accounts were created.` }],
      };
    }

    const pending = personas.filter((p) => !p.profile_id);
    const { data: taken, error: countError } = await db.rpc("founding_spots_taken");
    if (countError) throw new Error(`Could not verify founding capacity: ${countError.message}`);
    if (Number(taken) + pending.length > 100) {
      return {
        ok: false,
        created: 0,
        alreadyProvisioned: personas.length - pending.length,
        failed: 0,
        members: [],
        errors: [{ personaKey: "all", message: "There are not enough remaining founding places for all unprovisioned AI participants." }],
      };
    }

    const { data: authData, error: authListError } = await db.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (authListError) throw new Error(`Could not inspect existing synthetic identities: ${authListError.message}`);
    const byEmail = new Map((authData.users ?? []).map((u) => [u.email?.toLowerCase() ?? "", u]));

    const result: AiMemberProvisionResult = {
      ok: true,
      created: 0,
      alreadyProvisioned: 0,
      failed: 0,
      members: [],
      errors: [],
    };

    for (const persona of personas) {
      const suffix = personaNumber(persona.persona_key);
      const username = `puntr_ai_${suffix}`;
      const displayName = `Puntr AI ${suffix}`;
      const email = `${persona.persona_key}@ai.puntr.invalid`;
      try {
        let user = byEmail.get(email);
        if (!user) {
          const password = `AiMember!${crypto.randomUUID()}`;
          const { data: created, error: createError } = await db.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            app_metadata: {
              is_ai_participant: true,
              synthetic_persona_key: persona.persona_key,
            },
            user_metadata: {
              is_ai_participant: true,
              synthetic_persona_key: persona.persona_key,
              account_label: "AI participant",
            },
          });
          if (createError || !created.user) throw new Error(createError?.message ?? "Auth user creation failed.");
          user = created.user;
          byEmail.set(email, user);
        } else if (user.app_metadata?.["is_ai_participant"] !== true
          || user.app_metadata?.["synthetic_persona_key"] !== persona.persona_key) {
          throw new Error("The reserved synthetic email already belongs to a non-AI account.");
        }

        const { data: foundingNumber, error: provisionError } = await db.rpc(
          "provision_ai_community_member",
          {
            p_persona_key: persona.persona_key,
            p_user_id: user.id,
            p_username: username,
            p_display_name: displayName,
          },
        );
        if (provisionError) throw new Error(provisionError.message);

        if (persona.profile_id) result.alreadyProvisioned += 1;
        else result.created += 1;
        result.members.push({
          personaKey: persona.persona_key,
          username,
          foundingNumber: typeof foundingNumber === "number" ? foundingNumber : null,
        });
      } catch (error) {
        result.failed += 1;
        result.ok = false;
        result.errors.push({
          personaKey: persona.persona_key,
          message: error instanceof Error ? error.message.slice(0, 240) : "Unknown provisioning error.",
        });
      }
    }

    const { error: auditError } = await db.from("admin_actions").insert({
      admin_id: context.userId,
      action: "ai_founding_members.provision",
      target: "synthetic_personas",
      detail: {
        created: result.created,
        already_provisioned: result.alreadyProvisioned,
        failed: result.failed,
        founding_numbers: result.members.map((m) => m.foundingNumber),
      },
    });
    if (auditError) console.error("AI founding member provisioning audit failed", auditError.message);

    return result;
  });
