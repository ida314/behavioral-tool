# Deploying

The app runs on `gx10` and is reached over the tailnet at
**https://behavioral-tool.tail2e282c.ts.net**. Nothing is published to the public internet;
this is the Phase 5 "deploy" item, resolved as self-hosting rather than the Vercel + hosted
Postgres sketched in `docs/IMPLEMENTATION_PLAN.md` — a tailnet service needs no hosted
database, and `AttemptAudio` bytes and a local whisper.cpp both want to stay on this box.

## Deploy

```bash
scripts/deploy.sh
```

Typecheck, lint, `prisma migrate deploy`, build, restart, and a health check. It is the
only thing that should restart the service.

## The parts

**Process.** `next build` with `output: "standalone"` (see `next.config.ts`) produces a
self-contained tree at `.next/standalone`; `public/` and `.next/static/` are copied in by
hand, because standalone omits them assuming a CDN and there is no CDN here.
`behavioral-tool.service`, a systemd **user** unit, runs `node server.js` from that tree on
`127.0.0.1:3400`. Loopback only — Tailscale Serve is the sole way in.

**Database.** The same Postgres container as development (`npm run db:up`, host port 5433),
but a **separate database**: `behavioral_prep_prod`. One box, one container, two databases,
so `npm run db:reset` on a dev branch cannot take real practice history with it. It is
created once by hand:

```bash
docker exec behavioral-prep-db createdb -U behavioral behavioral_prep_prod
```

The container carries `restart: unless-stopped`, so Docker brings it back at boot.

**Environment.** `deploy/.env.production`, read by the unit as an `EnvironmentFile` — the
production `DATABASE_URL`, the dev-stub identity, and the whisper paths. Gitignored: it
holds the database password. `scripts/deploy.sh` also sources it, because the build imports
`src/lib/db.ts` and that throws without `DATABASE_URL`.

**Transcription.** `WHISPER_BIN` and `WHISPER_MODEL` must be **absolute** in that file.
`src/lib/transcription.ts` defaults them to `process.cwd()/.whisper`, and the unit's working
directory is `.next/standalone`, not the repo. `ffmpeg` comes from the system PATH.

**Tailnet.** `tailscale serve --service=svc:behavioral-tool --bg 3400`. Already applied and
stored in tailscaled; the deploy script re-applies it so it is enough on a fresh machine.
That needs `sudo tailscale set --operator=$USER` once per machine, and `svc:behavioral-tool`
must exist in the tailnet policy file with this node in `autoApprovers`.

## Known limitation

**Auth is still the ADR-003 dev stub.** `requireUser()` returns one fixed user, so every
request that reaches this service is the same person. The tailnet is the only access
control. That is fine while the tailnet is one person's own devices and nothing else —
it stops being fine the moment the service is shared with another user, and Phase 5 item 6
is what to fix before that.

## Operating

```bash
systemctl --user status behavioral-tool
journalctl --user -u behavioral-tool -f
tailscale serve status
docker exec behavioral-prep-db psql -U behavioral -d behavioral_prep_prod
```

User lingering is already enabled, so the unit starts at boot without a login.
