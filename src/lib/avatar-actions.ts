import { supabase } from "@/integrations/supabase/client";
import {
  avatarPath,
  compressAvatar,
  pathFromPublicUrl,
  sportsAvatarToken,
  type SportsAvatarKey,
} from "@/lib/avatar";

/**
 * Saving a profile picture, shared by the account page and the sign-up flow. Each call updates
 * `profiles.avatar_url` for the signed-in member (RLS: own row only) and removes the previous uploaded file.
 */

// avatar_url is not in the generated types until types.ts is regenerated.
const profiles = () =>
  supabase.from("profiles") as unknown as {
    update: (v: { avatar_url: string | null }) => {
      eq: (k: string, v: string) => Promise<{ error: unknown }>;
    };
  };

async function removeOld(current: string | null) {
  const old = pathFromPublicUrl(current);
  if (old) await supabase.storage.from("avatars").remove([old]);
}

/** Compresses and uploads a picture the member chose (already checked with `checkAvatarFile`). */
export async function uploadAvatar(userId: string, file: File, current: string | null) {
  const { blob, ext } = await compressAvatar(file);
  const path = avatarPath(userId, ext);
  const bucket = supabase.storage.from("avatars");
  const { error: upErr } = await bucket.upload(path, blob, {
    contentType: blob.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (upErr) throw upErr;
  const url = bucket.getPublicUrl(path).data.publicUrl;
  const { error } = await profiles().update({ avatar_url: url }).eq("id", userId);
  if (error) {
    await bucket.remove([path]);
    throw error;
  }
  await removeOld(current);
  return url;
}

/** Points the profile at one of the illustrated sports avatars (no upload). */
export async function chooseSportsAvatar(
  userId: string,
  key: SportsAvatarKey,
  current: string | null,
) {
  const token = sportsAvatarToken(key);
  const { error } = await profiles().update({ avatar_url: token }).eq("id", userId);
  if (error) throw error;
  await removeOld(current);
  return token;
}

/** Clears the picture. The file goes first: if that fails nothing changes and the member can retry. */
export async function removeAvatar(userId: string, current: string | null) {
  const old = pathFromPublicUrl(current);
  if (old) {
    const { error: rmErr } = await supabase.storage.from("avatars").remove([old]);
    if (rmErr) throw rmErr;
  }
  const { error } = await profiles().update({ avatar_url: null }).eq("id", userId);
  if (error) throw error;
}
