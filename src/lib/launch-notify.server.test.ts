import { describe, expect, it, vi } from "vitest";

import { runLaunchNotify, type LaunchStore } from "./launch-notify.server";

function fakeStore(people: { email: string; name: string }[] = []) {
  const logged: { email: string; wave: number; status: string }[] = [];
  const store: LaunchStore = {
    recipients: async () => people,
    logSend: async (r) => void logged.push(r),
    createNotification: vi.fn(async () => true),
    adminEmails: async () => ["admin@example.invalid"],
  };
  return { store, logged };
}
const ok = async (_p: Record<string, unknown>) => ({ ok: true, status: 200, body: "" });
const base = {
  launchDateEnv: "2026-11-02",
  unsubscribeUrl: (e: string) => `https://x/u?e=${e}`,
  replyTo: "support@puntr.co.za",
};
// 06:00 UTC is 08:00 in Johannesburg
const at = (iso: string) => new Date(`${iso}T06:00:00Z`);

describe("runLaunchNotify", () => {
  it("does nothing on a day that is not a wave date", async () => {
    const { store } = fakeStore([{ email: "a@x.com", name: "A" }]);
    const send = vi.fn(ok);
    const r = await runLaunchNotify({ ...base, now: at("2026-11-03"), enabled: true, store, send });
    expect(r).toEqual({ ok: true, wave: null });
    expect(send).not.toHaveBeenCalled();
  });

  it("sends nothing while the switch is off", async () => {
    const { store } = fakeStore([{ email: "a@x.com", name: "A" }]);
    const send = vi.fn(ok);
    const r = await runLaunchNotify({
      ...base,
      now: at("2026-11-02"),
      enabled: false,
      store,
      send,
    });
    expect(r).toEqual({ ok: true, wave: 1, enabled: false });
    expect(send).not.toHaveBeenCalled();
    expect(store.createNotification).not.toHaveBeenCalled();
  });

  it("launch day: notifies the admin once and emails every recipient, logging each send", async () => {
    const { store, logged } = fakeStore([
      { email: "a@x.com", name: "Ann Lee" },
      { email: "b@x.com", name: "Bo" },
    ]);
    const send = vi.fn(ok);
    const r = await runLaunchNotify({ ...base, now: at("2026-11-02"), enabled: true, store, send });
    expect(r).toMatchObject({ wave: 1, sent: 2, failed: 0, remaining: 0, adminNotified: true });
    expect(store.createNotification).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(3); // one admin reminder + two members
    expect(logged.map((l) => l.email).sort()).toEqual(["a@x.com", "b@x.com"]);
    const member = send.mock.calls
      .map((c) => c[0] as Record<string, unknown>)
      .find((p) => (p["to"] as string[])[0] === "a@x.com")!;
    expect(member["subject"]).toBe("Puntr is live: your Founding spot is reserved");
    expect(String(member["text"])).toContain("0800 006 008");
    expect(member["headers"]).toEqual({ "List-Unsubscribe": "<https://x/u?e=a@x.com>" });
  });

  it("does not email the admin again when the notification already exists", async () => {
    const { store } = fakeStore();
    (store.createNotification as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
    const send = vi.fn(ok);
    const r = await runLaunchNotify({ ...base, now: at("2026-11-02"), enabled: true, store, send });
    expect(r).toMatchObject({ adminNotified: false });
    expect(send).not.toHaveBeenCalled();
  });

  it("follow-up waves skip the admin reminder and use the reminder wording", async () => {
    const { store } = fakeStore([{ email: "a@x.com", name: "A" }]);
    const send = vi.fn(ok);
    await runLaunchNotify({ ...base, now: at("2026-11-05"), enabled: true, store, send });
    await runLaunchNotify({ ...base, now: at("2026-11-09"), enabled: true, store, send });
    expect(store.createNotification).not.toHaveBeenCalled();
    const subjects = send.mock.calls.map((c) => (c[0] as Record<string, string>)["subject"]);
    expect(subjects).toEqual([
      "Your Puntr Founding spot is still reserved",
      "Last note about your Puntr Founding spot",
    ]);
  });

  it("records failures and keeps going", async () => {
    const { store, logged } = fakeStore([
      { email: "a@x.com", name: "A" },
      { email: "b@x.com", name: "B" },
    ]);
    const send = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, body: "" }) // admin
      .mockResolvedValueOnce({ ok: false, status: 422, body: "bad address" })
      .mockResolvedValue({ ok: true, status: 200, body: "" });
    const r = await runLaunchNotify({ ...base, now: at("2026-11-02"), enabled: true, store, send });
    expect(r).toMatchObject({ sent: 1, failed: 1 });
    expect(logged.filter((l) => l.status === "failed")).toHaveLength(1);
  });
});
