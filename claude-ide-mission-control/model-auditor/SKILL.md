---
name: audit-model
description: Audit any HTML financial model for math errors, period-over-period anomalies, structural issues, backtesting accuracy, assumption sensitivity, and data provenance. Dispatches six specialized agents in parallel and produces a graded audit report. Use when reviewing, validating, or quality-checking any financial model, dashboard, or business case built in HTML.
user_invocable: true
args: "<path> [--agents math,jumps,flowchart,backtest,sensitivity,provenance] [--actuals-through YYYY-MM] [--previous path] [--targets JSON] [--materiality 0.01]"
---

# Model Auditor

Audit any HTML financial model with CFO-grade scrutiny.

## Quick Start

```
/audit-model path/to/model.html
```

## What It Checks

| Agent | What It Does |
|-------|-------------|
| Math Auditor | Arithmetic consistency, bridge balances, cross-tab reconciliation |
| Jump Detector | Period-over-period anomalies, actuals-to-forecast boundary breaks |
| Flowchart Mapper | Calculation DAG visualization, structural gaps, hidden assumptions |
| Backtester | Prediction accuracy vs actuals, bias detection, error trends |
| Sensitivity Analyzer | Tornado charts, two-axis tables, cliff effects, dead assumptions |
| Provenance Tracker | Data lineage, source verification, staleness detection |

## Options

- `--agents <list>` — Run subset (comma-separated: math, jumps, flowchart, backtest, sensitivity, provenance)
- `--actuals-through YYYY-MM` — Tell the backtester which months have actuals
- `--previous path/to/old.html` — Enable version-over-version delta analysis
- `--targets '{"arr": 600000000}'` — Check outputs against external commitments
- `--materiality 0.01` — Materiality threshold as fraction of primary output (default: 1%)

## Outputs

1. `audit-report.html` — Human-readable Gusto-branded dashboard
2. `audit-findings.json` — Machine-actionable findings for the building agent
3. `audit-record.json` — Immutable audit trail with timestamp and model hash

## Continuous Monitoring

```
/loop 1d /audit-model path/to/model.html
```

## Workflow

The orchestrator skill at `skills/audit-model.md` handles the full workflow: parse model, dispatch agents, merge findings, apply materiality, generate reports.
