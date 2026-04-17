---
name: findings-schema
description: Shared finding format that all model auditor agents must emit. Read this before writing any agent findings.
---

# Findings Schema

Every agent MUST return findings in this exact JSON structure. The orchestrator merges all agent outputs into a single findings array.

## Finding Object

```json
{
  "agent": "agent-name",
  "model_path": "path/to/model.html",
  "timestamp": "ISO-8601",
  "findings": [
    {
      "id": "PREFIX-NNN",
      "severity": "error | warning | info",
      "category": "see categories below",
      "title": "Short human-readable title",
      "description": "Detailed explanation with specific numbers",
      "location": {
        "section": "Section or tab name in the model",
        "period": "Time period affected (e.g., FY27-Q2, 2026-03)",
        "elements": ["CSS selectors, data labels, or JS variable names"]
      },
      "evidence": {
        "expected": "number or value",
        "actual": "number or value",
        "delta": "absolute difference",
        "delta_pct": "percentage difference"
      },
      "recommendation": "Specific actionable fix suggestion",
      "confidence": 0.0
    }
  ],
  "summary": {
    "errors": 0,
    "warnings": 0,
    "info": 0,
    "overall_grade": "A|B|C|D|F with optional +/-",
    "one_liner": "One sentence summary of findings"
  }
}
```

## ID Prefixes by Agent

| Agent | Prefix | Example |
|-------|--------|---------|
| Math Auditor | MA | MA-001 |
| Jump Detector | JD | JD-001 |
| Flowchart Mapper | FM | FM-001 |
| Backtester | BT | BT-001 |
| Sensitivity Analyzer | SA | SA-001 |
| Provenance Tracker | PT | PT-001 |

## Categories

| Category | Used By | Description |
|----------|---------|-------------|
| arithmetic | Math Auditor | Sum/multiplication errors |
| balance | Math Auditor | Bridge or reconciliation imbalances |
| boundary | Jump Detector | Actuals-to-forecast transition anomaly |
| trend | Jump Detector | Unexpected trend break |
| seasonality | Jump Detector | Seasonal pattern violation |
| structural | Flowchart Mapper | Missing links, dead ends, circular refs |
| accuracy | Backtester | Prediction vs actual mismatch |
| bias | Backtester | Systematic over/under-prediction |
| sensitivity | Sensitivity Analyzer | Assumption impact finding |
| provenance | Provenance Tracker | Missing source, stale data, unverified input |

## Severity Rules

- **error** — Math is wrong, bridge doesn't balance, structural break. Must fix before trusting model.
- **warning** — Suspicious pattern, stale data, large jump that may be intentional. Needs human judgment.
- **info** — Observation, minor rounding, suggestion. No action required.

## Grading Rubric

| Grade | Criteria |
|-------|----------|
| A | Zero errors, <=2 warnings, backtesting MAPE <3% |
| B | Zero errors, <=5 warnings, backtesting MAPE <5% |
| C | 1-2 errors OR >5 warnings OR backtesting MAPE 5-10% |
| D | 3+ errors OR actuals-to-forecast boundary failures |
| F | Fundamental structural issues (missing links, broken bridges, circular refs) |

## Materiality

The orchestrator applies a materiality filter after merging. Findings where |delta| < (primary_output * materiality_rate) are demoted to `info` with `below_materiality: true`. Default materiality rate: 1%.
