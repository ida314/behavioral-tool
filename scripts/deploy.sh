#!/usr/bin/env bash
# Put the working tree live as the tailnet service svc:behavioral-tool.
#
#   scripts/deploy.sh
#
# Idempotent — this is the only thing that should ever restart the service. Running the
# build by hand and forgetting the two copy steps below leaves a live app serving no CSS.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNIT=behavioral-tool.service
SERVICE=svc:behavioral-tool
ENV_FILE="$ROOT/deploy/.env.production"
PORT=3400

cd "$ROOT"

[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE — see deploy/README.md" >&2; exit 1; }

# The build imports src/lib/db.ts, which throws without DATABASE_URL, so the production
# environment has to be present for the build and not only at runtime.
set -a; . "$ENV_FILE"; set +a

# .env.production sets NODE_ENV=production, which would make npm ci skip the dev
# dependencies the typecheck, lint, migrate and build steps below need.
npm ci --include=dev
npm run typecheck
npm run lint

# Migrations before the build, so a deploy that cannot reach its database fails here
# rather than after the new code is already serving.
npx prisma migrate deploy

npm run build

# `output: "standalone"` leaves these two out, assuming a CDN serves them. There is no CDN
# here, so copy them in and let server.js serve them.
cp -r public .next/standalone/
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/

install -D -m 644 "deploy/$UNIT" "$HOME/.config/systemd/user/$UNIT"
systemctl --user daemon-reload
systemctl --user enable "$UNIT"
systemctl --user restart "$UNIT"

# Serve config lives in tailscaled and survives restarts on its own; re-applying it just
# makes this script enough on a fresh machine.
tailscale serve --service="$SERVICE" --bg "$PORT" >/dev/null

for _ in $(seq 1 30); do
  code=$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/practice" || true)
  [ "$code" = 200 ] && break
  sleep 1
done
echo "GET /practice -> ${code:-no answer}"
[ "${code:-}" = 200 ] || { journalctl --user -u "$UNIT" -n 30 --no-pager; exit 1; }
echo "live: https://behavioral-tool.tail2e282c.ts.net"
