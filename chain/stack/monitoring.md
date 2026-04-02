# Layer 4: Monitoring & Observability

**Question:** *Is the chain healthy right now?*

> Monitoring is the eyes and ears of the chain operator. Without it, you only discover problems when users report them — or when you check the dashboard and see stale data.

## Why This Is Layer 4

You can only monitor what the network layer (Layer 3) exposes. Monitoring drives operational decisions at the deployment layer (Layer 5) — when to restart, scale, or investigate.

## Current State

| Component | Status | Details |
|-----------|--------|---------|
| zkagentic.ai dashboard | Deployed | Cloudflare Pages, reads Supabase `chain_status` + `agents` |
| Live/stale/offline indicator | Working | Based on `chain_status.updated_at` vs current time |
| Block height display | Working | Hero metric on dashboard |
| Structured logging | None | `print()` statements only |
| Alerting | None | No notifications on failure |
| Metrics collection | None | No Prometheus/StatsD/custom metrics |
| Uptime monitoring | None | No external health checks |

### What the Monitor Dashboard Shows

The testnet monitor at zkagentic.ai displays:
- Hero block count
- Mining stats (hashrate, difficulty, rewards)
- Network stats (nodes, claims, connections)
- Block production timing
- Staking overview
- Epoch info
- Live/stale/offline status badge

### What It Doesn't Show

- Historical trends (block time drift, reward rate over time)
- Error rates or API latency
- Process resource usage (CPU, memory, disk)
- Supabase sync lag
- Auto-miner health (running vs. crashed)

## Key Metrics to Track

### Chain Health (Critical)
| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| `block_height` | `/api/status` | Stale if no change in 2 x BLOCK_TIME_S |
| `last_block_age_s` | Computed | > 120s = stale, > 300s = offline |
| `auto_miner_alive` | Internal flag | `false` = critical |
| `epoch_ring` | `/api/epoch` | Unexpected regression = critical |

### API Health
| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| `api_response_time_ms` | Request middleware | p99 > 500ms |
| `api_error_rate` | Request middleware | > 5% of requests |
| `ws_active_connections` | ConnectionManager | > 100 = investigate |
| `supabase_sync_lag_s` | Compare timestamps | > 60s = degraded |

### Resource Health
| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| `process_rss_mb` | `psutil` or `/proc` | > 512MB = investigate (pure Python shouldn't need much) |
| `disk_usage_pct` | OS | > 80% = warning |
| `sqlite_db_size_mb` | File stat | Informational (growth tracking) |

## Implementation Approaches

### Phase 1: Minimal (No External Dependencies)
- Add `GET /health` endpoint (chain liveness + basic metrics)
- Structured JSON logging (replace `print()` with `structlog` or manual JSON)
- External cron job (or UptimeRobot free tier) hitting `/health` every 60s
- Simple Slack/Telegram webhook on failure

### Phase 2: Dashboard-Integrated
- Monitor dashboard polls `/health` and shows historical chart (last 24h)
- Block time chart (actual vs expected)
- Reward rate over time
- Supabase sync lag indicator

### Phase 3: Production-Grade (Future)
- Prometheus metrics endpoint (`/metrics`)
- Grafana dashboard
- PagerDuty/OpsGenie alerting
- Distributed tracing if multi-node

## Implementation Checklist

- [ ] **`/health` endpoint** — uptime, block height, last block age, auto-miner status
- [ ] **Structured logging** — JSON format, log level, timestamp, request context
- [ ] **External uptime check** — UptimeRobot or cron hitting `/health`
- [ ] **Slack/Telegram alert** — webhook notification when chain goes stale
- [ ] **Monitor dashboard upgrade** — add block time chart and sync lag indicator

## Failure Mode

**Blind operation.** The chain runs, blocks are produced, but nobody is watching. The auto-miner crashes at 3 AM. The Supabase sync starts failing silently (wrong URL, expired token, RLS change). The monitor dashboard shows "offline" but nobody sees it until morning. By then, 8 hours of block production is lost (because persistence, Layer 1, isn't implemented yet either).

## Success Criteria

- Operator knows within 5 minutes if block production has stopped
- Historical metrics available for last 24 hours minimum
- Supabase sync failures are logged and visible (not silently swallowed)
- Resource usage trends are trackable (memory leaks, disk growth)
