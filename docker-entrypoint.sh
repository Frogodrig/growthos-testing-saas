#!/bin/sh
# Determine which SaaS app to start based on SAAS_APP env var
APP=${SAAS_APP:-saas-booker}
echo "[Entrypoint] Starting ${APP}..."
exec node "apps/${APP}/dist/index.js"
