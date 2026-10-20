# KNB – Kitchen 3D Design Platform

## What is running now

```
Intent (HTTP POST /intent  or  NATS knb.intent.>)
  → validate
  → skill lookup
  → Entitlement Gate
  → Model Router (open-weight)
  → Skill execution (timeout)
  → Result
```

## Quick start (self-hosted)

```bash
# 1. Infrastructure
cd infra && docker compose up -d

# 2. Core
cd ../core
npm install
npm run schema          # apply Postgres tables
npm run dev             # start gateway on :3100
```

### Test an Intent

```bash
# Mint a bootstrap token (designer tier)
TOKEN=$(node -e "
const c={userId:'00000000-0000-4000-8000-000000000001',tier:'designer',creditsRemaining:100};
console.log(Buffer.from(JSON.stringify(c)).toString('base64url'))
")

curl -s -X POST http://localhost:3100/intent \
  -H 'Content-Type: application/json' \
  -d "{
    \"id\": \"$(uuidgen)\",
    \"type\": \"cabinetry.place-base-cabinet\",
    \"projectId\": \"00000000-0000-4000-8000-000000000010\",
    \"userId\": \"00000000-0000-4000-8000-000000000001\",
    \"entitlementToken\": \"$TOKEN\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"payload\": {
      \"roomId\": \"00000000-0000-4000-8000-000000000020\",
      \"type\": \"base\",
      \"position\": { \"x\": 0, \"y\": 0, \"z\": 0 },
      \"width\": 600,
      \"height\": 720,
      \"depth\": 560,
      \"constructionMethodId\": \"frameless\"
    }
  }" | jq .
```

## File map

### Core
- `src/models/index.ts` – central domain models
- `src/bus/schemas.ts` – Intent / Result / SkillManifest
- `src/auth/entitlement.ts` – entitlement gate
- `src/agent/model-router.ts` – open-weight model routing
- `src/agent/orchestrator.ts` – central orchestrator
- `src/persistence/postgres.ts` + `clients.ts` – real pg client + schema
- `src/persistence/minio.ts` + `clients.ts` – real MinIO client
- `src/gateway/http.ts` – REST gateway
- `src/gateway/nats.ts` – NATS gateway
- `src/startup/index.ts` – main entry
- `src/startup/register-skills.ts` – skill discovery + registration

### Plugins
- `canvas-3d/` – client 3D canvas
- `cabinetry-parametric/` – place-base-cabinet + expanded part generator
- `room-capture/` – ingest-lidar-scan skeleton

### Infra
- `docker-compose.yml` – Postgres, Redis, MinIO, NATS
