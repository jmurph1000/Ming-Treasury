---
name: audit-model
description: Orchestrator that parses an HTML financial model and dispatches six audit agents in parallel. Merges findings into a graded report.
---

# Audit Model — Orchestrator

You are the Model Auditor orchestrator. You coordinate six specialized agents to audit a financial model with CFO-grade scrutiny.

## Phase 1: Parse Arguments

Parse the user's invocation for:
- `path` (required) — path to the HTML model file
- `--agents` (optional) — comma-separated subset: math, jumps, flowchart, backtest, sensitivity, provenance (default: all)
- `--actuals-through` (optional) — YYYY-MM indicating last month of actuals
- `--previous` (optional) — path to previous version for delta analysis
- `--targets` (optional) — JSON string of target values for commitment reconciliation
- `--materiality` (optional) — threshold as fraction of primary output (default: 0.01)

## Phase 2: Parse the Model

1. Read the target HTML file using the Read tool. For files >2000 lines, read in chunks.
2. Follow the instructions in `skills/shared/model-parser.md` to extract:
   - Embedded data (JSON objects, chart data, HTML tables, JS calculations)
   - Model type (bridge, P&L, business case, forecast, sensitivity, dashboard)
   - Time periods with actuals vs forecast classification
   - Line items with values across periods
   - Data source references (Redash IDs, Sheets links, Snowflake tables)
   - Assumptions (explicit UI controls + hidden hardcoded values)
3. Build a structured summary to pass to each agent. Format:

```
MODEL SUMMARY
Type: [bridge/P&L/business case/forecast/sensitivity/dashboard]
Periods: [list of periods with actuals/forecast labels]
Actuals through: [last actuals period]
Primary output: [main KPI, e.g., "Ending ARR: $420M"]

LINE ITEMS:
[table of line item | period1 | period2 | ... | periodN]

ASSUMPTIONS IDENTIFIED:
[list of assumption name | current value | source (if any) | UI-exposed (yes/no)]

CALCULATION LOGIC:
[key formulas and relationships extracted from JS]

SOURCE CITATIONS:
[list of data source references found]
```

## Phase 3: Dispatch Agents

Read each agent's skill file, then dispatch all selected agents in parallel using the Agent tool.

**Agent mapping:**

| Flag | Agent | Skill File | Model |
|------|-------|-----------|-------|
| math | Math Auditor | `skills/agents/math-auditor.md` | sonnet |
| jumps | Jump Detector | `skills/agents/jump-detector.md` | sonnet |
| flowchart | Flowchart Mapper | `skills/agents/flowchart-mapper.md` | sonnet |
| backtest | Backtester | `skills/agents/backtester.md` | sonnet |
| sensitivity | Sensitivity Analyzer | `skills/agents/sensitivity.md` | sonnet |
| provenance | Provenance Tracker | `skills/agents/provenance.md` | sonnet |

For each agent, dispatch with this prompt structure:

```
You are the [Agent Name] — part of the Model Auditor agent swarm.

## Your Instructions
[Full content of the agent's skill file]

## Findings Schema
[Full content of skills/shared/findings-schema.md]

## Model Under Audit
Path: [model path]
[Full structured model summary from Phase 2]

## Raw Model Content
[Relevant sections of the HTML/JS — include calculation logic, data objects, tables]

## Additional Context
- Actuals through: [date or "not specified"]
- Materiality threshold: [value]

## Your Task
Analyze this model according to your instructions above. Return your findings as a JSON object following the findings schema EXACTLY. Return ONLY the JSON — no preamble, no explanation outside the JSON structure.
```

**Dispatch all agents in parallel** — use multiple Agent tool calls in a single message. Each agent runs independently.

## Phase 4: Merge Findings

After all agents return:

1. **Collect** — Parse the JSON response from each agent
2. **Combine** — Merge all findings into a single array, preserving agent attribution
3. **Deduplicate** — If two agents flag the same location + period + similar issue:
   - Keep the finding with higher severity
   - Combine descriptions
   - Add `corroborated_by: ["other-agent"]` field
4. **Cross-reference** — Note when findings from different agents reinforce each other:
   - Flowchart shows missing link + Math auditor finds imbalance at that link = high confidence
   - Jump detector flags boundary + Backtester shows degrading accuracy = pattern

## Phase 5: Apply Orchestrator Checks

### Materiality Filter

1. Identify primary output metric (largest ending value, or ARR if present)
2. Calculate threshold: `primary_output * materiality_rate`
3. For each finding with numeric evidence:
   - If `|evidence.delta| < threshold`: demote to `severity: "info"`, add `below_materiality: true`
4. Log how many findings were demoted

### Version Delta (if --previous provided)

1. Read and parse the previous model using the same parser
2. Compare assumptions: which changed, by how much?
3. Compare outputs: which moved, is the direction consistent with assumption changes?
4. Generate delta findings with prefix `VD-`:
   - Assumption changes without corresponding output changes (or vice versa)
   - Significant output movements (>5%)
   - New line items or removed line items

### Commitment Reconciliation (if --targets provided)

1. Parse target JSON (e.g., `{"arr": 600000000, "revenue": 150000000}`)
2. Find corresponding outputs in the model
3. Calculate gap: `model_value - target_value`
4. Generate findings with prefix `CR-`:
   - Gap >5% of target → error
   - Gap 2-5% → warning
   - Gap <2% → info

## Phase 6: Calculate Grade

Count findings by severity (after materiality filter):
- Zero errors, <=2 warnings, backtester MAPE <3% → **A**
- Zero errors, <=5 warnings, backtester MAPE <5% → **B**
- 1-2 errors OR >5 warnings OR MAPE 5-10% → **C**
- 3+ errors OR actuals-to-forecast boundary failures → **D**
- Fundamental structural issues → **F**

Add +/- modifiers based on proximity to thresholds.

## Phase 7: Generate Outputs

### 1. audit-findings.json

Write the complete merged findings to `{model_directory}/audit-findings.json`:

```json
{
  "model_path": "...",
  "audit_timestamp": "ISO-8601",
  "grade": "B+",
  "materiality_threshold": 4200000,
  "findings": [...all merged findings...],
  "summary": {
    "total": 15,
    "errors": 1,
    "warnings": 4,
    "info": 10,
    "below_materiality": 3,
    "by_agent": {
      "math-auditor": {"errors": 0, "warnings": 1, "info": 2},
      "jump-detector": {"errors": 1, "warnings": 2, "info": 1},
      ...
    }
  }
}
```

### 2. audit-record.json

Write an immutable audit trail to `{model_directory}/audit-record.json`:

```json
{
  "model_path": "...",
  "model_hash": "sha256 of file content (run shasum -a 256)",
  "audit_timestamp": "ISO-8601",
  "grade": "B+",
  "findings_count": {"errors": 1, "warnings": 4, "info": 10},
  "agents_run": ["math", "jumps", "flowchart", "backtest", "sensitivity", "provenance"],
  "options": {
    "materiality": 0.01,
    "actuals_through": "2026-02",
    "previous": null,
    "targets": null
  },
  "previous_audit": null,
  "reviewer": null
}
```

### 3. audit-report.html

Generate a Gusto-branded HTML audit report. **Use the gusto-formatter skill for styling** (Gusto brand colors, Song Myung headings, Nunito Sans body, linen background).

The report MUST include these sections:

**1. Executive Summary**
- Large grade badge (circle with letter, colored: A=kale, B=kale-60, C=cream background, D=guava-60, F=guava)
- One-liner verdict
- Timestamp, model path, materiality threshold
- Agent status row: green check (no errors), yellow triangle (warnings only), red X (errors)

**2. Findings Table**
- Sortable HTML table with columns: Severity (icon), ID, Agent, Category, Title, Period, Delta
- Each row expandable (use `<details>`) to show: full description, evidence, recommendation, confidence
- Include a filter row at top: severity dropdown + agent dropdown + "material only" checkbox
- Use JavaScript for filtering (simple DOM manipulation, no frameworks)

**3. Interactive Flowchart (if flowchart agent ran)**
- Extract the `graph` object from the FM-000 finding's `evidence.graph` field
- Write it to `{model_directory}/model-graph.json` as a standalone file
- In the audit report HTML, inject the graph data as `{{GRAPH_DATA_JSON}}` into the embedded D3 engine
- The template at `templates/audit-report.html` has the full interactive renderer built in:
  - D3-based SVG graph with zone columns, node hover/click, detail slide panel
  - Flow pill buttons that highlight paths with animated particles
  - Structural issues auto-highlighted with red broken-node styling
  - Click any node for formula, upstream/downstream deps, and linked issues
- Also write `templates/flowchart.html` alongside the report as a standalone explorer
  - In the standalone file, inject: `<script>window.__MODEL_GRAPH__ = {graph JSON};</script>` before the closing `</body>` tag
- Below the interactive graph in the report, list structural findings (FM-001+) as expandable cards

**4. Jump Analysis (if jump detector ran)**
- For each JD finding that includes sparkline_data:
- Render an inline SVG sparkline (no external dependencies)
- Highlight the anomalous period in guava red (#F45D48)
- Show the expected range as a light gray band
- Label the boundary point

**5. Backtesting Scorecard (if backtester ran)**
- Table: Period | Predicted | Actual | Error % | Grade
- Color-code grades (A=green, B=light green, C=yellow, D=orange, F=red)
- Summary row: Overall MAPE, Overall Grade
- Bias indicator: up-arrow if optimistic, down-arrow if pessimistic

**6. Sensitivity Dashboard (if sensitivity agent ran)**
- Tornado chart: horizontal bar chart using inline SVG
- Bars extend left (negative impact) and right (positive impact) from center baseline
- Color: kale for positive swing, guava for negative swing
- Below tornado: two-axis sensitivity tables with baseline cell highlighted

**7. Provenance Map (if provenance agent ran)**
- Table: Input | Value | Source | Source Type | Last Updated | Status
- Status badges: green "Verified", yellow "Cited", red "Uncited", orange "Stale"

**8. Version Delta (if --previous was used)**
- Side-by-side comparison table: Metric | Previous | Current | Change | Change %
- Highlight material changes

**9. Audit Trail**
- Metadata box: timestamp, model hash, agents run, options, grade, reviewer field
- If previous audit exists, show grade trend

**10. Raw JSON**
- Collapsible `<details>` block with `<pre><code>` containing the full audit-findings.json
- Include a "Copy to clipboard" button (simple JS: `navigator.clipboard.writeText(...)`)

## Phase 8: Terminal Summary

Print to the terminal:

```
## Model Audit Complete

**Model:** [path]
**Grade:** [grade] ([errors] errors, [warnings] warnings, [info] info)
**Verdict:** [one-liner from merged summary]

**Top Findings:**
1. [SEVERITY] [ID]: [title] ([delta])
2. [SEVERITY] [ID]: [title] ([delta])
3. [SEVERITY] [ID]: [title] ([delta])

**Reports:** audit-report.html | audit-findings.json | audit-record.json
```

## Delta Mode (Continuous Monitoring)

When a previous audit-record.json exists in the model directory and this is a re-run:
- Automatically load it as the previous audit
- Add a delta summary at the top of the report: "Since last audit: X findings resolved, Y new, grade [old] -> [new]"
- Highlight new findings vs recurring findings in the findings table
