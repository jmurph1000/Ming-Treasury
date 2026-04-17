---
name: sensitivity
description: Build sensitivity tables and tornado charts from model assumptions. Detects which assumptions drive outputs, identifies non-linearities, cliff effects, and dead assumptions that have no impact.
---

# Sensitivity Analyzer

You analyze how model outputs respond to changes in input assumptions. Your job is to answer: **which assumptions matter most, and are there any hidden thresholds or non-linearities?**

ID prefix: **SA**
Category: **sensitivity**

## Step 1: Identify Assumptions and Outputs

### Assumptions

Scan the model for three types of assumptions:

1. **UI controls** — sliders, number inputs, dropdowns, toggles that the user can change
2. **Named constants in JS** — growth rates, churn rates, pricing tiers, conversion rates, discount rates, expansion rates, margin assumptions
3. **Hardcoded assumption values** — numbers embedded in calculation logic that represent business assumptions (e.g., `* 0.15` for a 15% churn rate, `+ 50000` for a fixed cost assumption)

**NOT assumptions** (do not include):
- Structural constants: 12 months/year, 4 quarters/year, 52 weeks/year, 100 for percentage conversion
- Array indices, loop counters, pixel dimensions, CSS values
- Date arithmetic constants

For each assumption, record:
- `name`: human-readable label (from UI label, variable name, or inferred purpose)
- `current_value`: the baseline value in the model
- `source`: "ui_control", "named_constant", or "hardcoded"
- `unit`: percentage, currency, count, ratio, months, etc.

### Primary Output

Identify the **primary output** — the main KPI the model is designed to produce. Priority order:
1. Ending ARR (if present)
2. Total revenue (cumulative)
3. NPV or IRR (for business cases)
4. Largest dollar-denominated output

Record the primary output name and its baseline value.

## Step 2: One-at-a-Time Sensitivity (Tornado Chart)

For each assumption identified in Step 1:

1. Record the baseline output value (primary output with all assumptions at current values)
2. Mentally trace the calculation logic to determine the output at each variation:
   - Assumption at **-20%** of current value
   - Assumption at **-10%** of current value
   - Assumption at **+10%** of current value
   - Assumption at **+20%** of current value
3. Calculate **swing** = (output at +20%) - (output at -20%)
4. Rank assumptions by absolute swing, descending

Return finding **SA-001** as the tornado chart data:

```json
{
  "id": "SA-001",
  "severity": "info",
  "category": "sensitivity",
  "title": "Tornado chart: assumption impact ranking",
  "description": "One-at-a-time sensitivity analysis across N assumptions. [Top assumption] dominates with $X swing.",
  "evidence": {
    "tornado": [
      {
        "assumption": "Growth Rate",
        "baseline_value": 0.25,
        "low_20_output": 380000000,
        "low_10_output": 395000000,
        "baseline_output": 410000000,
        "high_10_output": 425000000,
        "high_20_output": 442000000,
        "swing": 62000000
      }
    ],
    "primary_output_name": "Ending ARR",
    "primary_output_baseline": 410000000
  },
  "recommendation": "Focus model review on top 3 assumptions: [list them]. These drive [X]% of total output variability.",
  "confidence": 0.0
}
```

**Confidence scoring:** Since you are analyzing HTML (not executing it), you must trace JS calculation logic mentally. Set confidence based on:
- **0.9+** — Simple arithmetic chain, formula is explicit and linear (e.g., `revenue = customers * price`)
- **0.7-0.9** — Multiple intermediate steps but logic is traceable
- **0.5-0.7** — Complex model with conditional logic, loops, or chart library transformations
- **<0.5** — Cannot fully trace the calculation; describe expected sensitivity with explicit caveats

For complex models where you cannot fully trace every calculation path, state your confidence level explicitly and describe what you expect the sensitivity to be, noting which parts of the logic you could not verify.

## Step 3: Two-Axis Sensitivity Tables

For the **top 2-3 most impactful assumptions** (by swing from Step 2), create pairwise two-axis sensitivity matrices.

For each pair, vary both assumptions across 5 levels: -20%, -10%, baseline, +10%, +20%.

This produces a 5x5 matrix of output values.

Return as additional findings (SA-002, SA-003, etc.):

```json
{
  "id": "SA-002",
  "severity": "info",
  "category": "sensitivity",
  "title": "Two-axis sensitivity: [Assumption A] x [Assumption B]",
  "description": "Combined impact of [A] and [B] on [primary output]. Worst case: $X, best case: $Y.",
  "evidence": {
    "two_axis": {
      "row_assumption": "Growth Rate",
      "col_assumption": "Churn Rate",
      "row_values": [0.20, 0.225, 0.25, 0.275, 0.30],
      "col_values": [0.12, 0.135, 0.15, 0.165, 0.18],
      "matrix": [
        [350, 360, 370, 380, 390],
        [365, 376, 387, 398, 409],
        [380, 392, 404, 416, 428],
        [396, 409, 422, 435, 448],
        [412, 426, 440, 454, 468]
      ],
      "baseline_row": 2,
      "baseline_col": 2
    }
  },
  "recommendation": "Scenario range spans $X to $Y. [Describe interaction effects if any.]",
  "confidence": 0.0
}
```

## Step 4: Non-Linearity Detection

For each assumption from the tornado chart, check whether the output responds proportionally to input changes.

**Test:** If +10% input causes +X% output change, then +20% input should cause approximately +2X% output change (within 10% tolerance).

Example of non-linearity:
- +10% growth rate -> +5% output change
- +20% growth rate -> +15% output change (expected ~10%, got 15%)

This indicates a compounding effect, exponential relationship, or conditional logic that amplifies at higher values.

Flag as a finding when detected:

```json
{
  "id": "SA-00N",
  "severity": "warning",
  "category": "sensitivity",
  "title": "Non-linear response: [Assumption]",
  "description": "+10% causes [X]% output change but +20% causes [Y]% (expected ~[2X]%). Indicates [compounding/threshold/conditional] behavior.",
  "evidence": {
    "assumption": "Growth Rate",
    "response_at_10pct": 0.05,
    "response_at_20pct": 0.15,
    "expected_at_20pct": 0.10,
    "linearity_ratio": 1.5
  },
  "recommendation": "Review the calculation logic for [assumption]. Non-linear responses mean small forecasting errors compound disproportionately.",
  "confidence": 0.0
}
```

## Step 5: Dead Assumptions

Flag any assumption where varying by +/-20% changes the primary output by **less than 0.1%**.

These are assumptions that appear in the model but have negligible impact on the primary output. They may indicate:
- Vestigial inputs from an earlier model version
- Assumptions that only affect secondary outputs
- Broken calculation chains where the assumption is never actually used

```json
{
  "id": "SA-00N",
  "severity": "warning",
  "category": "sensitivity",
  "title": "Dead assumption: [Assumption]",
  "description": "[Assumption] at +/-20% changes [primary output] by only [X]% (<0.1% threshold). This input has negligible impact on the primary output.",
  "evidence": {
    "assumption": "Implementation Fee",
    "baseline_value": 5000,
    "max_output_change_pct": 0.03
  },
  "recommendation": "Verify this assumption is connected to the calculation chain. If intentionally minor, consider removing from the UI to reduce cognitive load.",
  "confidence": 0.0
}
```

## Step 6: Cliff Effects

Scan for **discontinuous jumps** — points where a small input change (<1% of assumption value) causes a disproportionately large output change (>5% of output).

Cliff effects typically come from:
- `if/else` threshold logic (e.g., `if (customers > 1000) discount = 0.20`)
- `Math.max`, `Math.min`, `Math.floor`, `Math.ceil` boundaries
- Tier-based pricing or stepped cost structures
- Conditional formatting that masks calculation changes

When detected, report the **exact threshold value** where the cliff occurs:

```json
{
  "id": "SA-00N",
  "severity": "warning",
  "category": "sensitivity",
  "title": "Cliff effect: [Assumption] at [threshold]",
  "description": "Output jumps [X]% when [Assumption] crosses [threshold]. A [Z]% input change causes a [X]% output change at this boundary.",
  "evidence": {
    "assumption": "Customer Count",
    "threshold_value": 1000,
    "output_below": 50000000,
    "output_above": 55000000,
    "output_jump_pct": 10.0,
    "input_change_pct": 0.5
  },
  "recommendation": "This threshold at [value] creates a discontinuity. Verify this is intentional business logic (e.g., volume discount tier). If presenting to stakeholders, explicitly call out this threshold.",
  "confidence": 0.0
}
```

## Output Assembly

Combine all findings into the standard findings schema:

1. **SA-001** — Tornado chart data (always first, always present)
2. **SA-002, SA-003, ...** — Two-axis sensitivity tables
3. **Subsequent IDs** — Dead assumptions, cliff effects, non-linearity warnings

Set the summary `overall_grade` based on:
- **A** — All assumptions traced with high confidence, no cliff effects, no dead assumptions
- **B** — Minor non-linearities or 1-2 dead assumptions, high trace confidence
- **C** — Multiple dead assumptions, cliff effects, or medium trace confidence
- **D** — Cannot trace key calculation paths, or major cliff effects on critical assumptions
- **F** — Model assumptions are disconnected from outputs, or calculation logic is opaque

The `one_liner` should state the single most important sensitivity finding (e.g., "Growth rate drives 65% of output variability; churn rate cliff at 18% creates $40M discontinuity").
