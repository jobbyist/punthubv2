# Puntr Cloudflare deployment fallback

## Purpose

Vercel remains Puntr's primary production host. This fallback builds the same TanStack Start application for Cloudflare Workers using Nitro's `cloudflare_module` preset. It is intended to provide an independently deployable copy if Vercel deployment quotas or service availability block a release.

The fallback workflow does **not** change production DNS or attach `puntr.co.za`. Its first deployment is available on the Worker `workers.dev` hostname for smoke testing.

## Why Cloudflare Workers

Puntr uses TanStack Start and Vite, and the repository already includes Nitro as its deployment adapter. Nitro supports the `cloudflare_module` preset and generates the Worker entry point and Wrangler deployment configuration during the build. This avoids replacing the existing Vite configuration merely to create a second build target.

## GitHub configuration

Create a GitHub Actions environment named `cloudflare-fallback` and add these environment secrets:

- `CLOUDFLARE_API_TOKEN`: scoped to the target Cloudflare account with permission to deploy Workers.
- `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account ID.

Add these repository or environment variables for the client bundle:

- `VITE_SUPABASE_URL`: the active Puntr Supabase project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: the matching Supabase publishable key.

The build job runs on pull requests and does not deploy. A manual workflow dispatch can deploy the fallback to `workers.dev`; set `deploy_fallback` to true. This does not modify the Vercel project or the production domain.

## Cloudflare runtime secrets

After the first Worker deployment, configure the server-side variables in the Cloudflare Worker settings (or with `wrangler secret put`):

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` only if the deployed server functions require privileged Supabase operations.

Never put a service-role/secret key in a `VITE_*` variable, GitHub repository variable, client bundle, or committed file. Use the same Supabase project and key pair as production.

If/when PayFast server-side functions are enabled, configure their required merchant credentials and ITN verification secrets separately as Cloudflare Worker secrets. Do not assume Vercel environment variables are shared with Cloudflare.

## Domain strategy: puntr.co.za

Cloudflare Workers supports custom domains, including an apex domain. The domain must be an active Cloudflare zone. The Worker custom domain becomes the origin for that hostname and Cloudflare provisions the DNS record and TLS certificate.

Recommended rollout:

1. Keep `puntr.co.za` on Vercel while the fallback Worker is tested on `workers.dev`.
2. If the domain's DNS is not already hosted by Cloudflare, onboard the zone and migrate the existing DNS records carefully. Preserve the current Vercel records so production continues serving from Vercel.
3. Attach a test hostname such as `fallback.puntr.co.za` to the Worker and validate authentication, SSR, static assets, Supabase reads/writes, emails and payment callbacks before considering an apex cutover.
4. Only during an approved maintenance window, attach `puntr.co.za` (and separately handle `www.puntr.co.za`) to the Worker. Do not attempt to attach a hostname while it still has a conflicting CNAME record.
5. To fail back to Vercel, remove/disable the Worker custom-domain routing and restore the verified Vercel DNS target. Keep the current Vercel production deployment available throughout.

A Cloudflare Worker custom domain and the Vercel project cannot both be the active origin for the exact same hostname at the same time. This is a controlled DNS/routing cutover, not automatic dual-host failover. No DNS changes should be made by this PR.

## Compatibility note

The current repository uses Nitro 3 beta through the Lovable TanStack config wrapper. The fallback build explicitly selects Nitro's `cloudflare_module` preset. The Wrangler compatibility date is pinned to 3 August 2026 because this Nitro generation emits its Node compatibility flags; validate the generated `.output/server/wrangler.json` and Worker runtime during the first deployment before changing the date or upgrading the adapter.

## Release checklist

- [ ] Add Cloudflare account/token secrets to the GitHub Actions environment.
- [ ] Add the matching Supabase URL and publishable key as GitHub build variables.
- [ ] Run the Cloudflare build check and review the generated Worker configuration.
- [ ] Deploy manually to `workers.dev`.
- [ ] Add Cloudflare runtime secrets and test auth, SSR, Supabase and transactional functions.
- [ ] Confirm the fallback is healthy before any custom-domain change.
- [ ] Keep Vercel as primary until a separately approved DNS cutover is completed.
