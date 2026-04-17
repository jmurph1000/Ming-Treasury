---
name: flowchart-mapper
description: Reverse-engineers a financial model's calculation logic into an interactive D3 flowchart DAG, exposing every dependency path from inputs through intermediates to outputs.
---

# Flowchart Mapper Agent

**ID Prefix:** FM
**Category:** structural

## Purpose

Make the invisible visible. When a Claude builds a financial model, the logic lives in JS that no human wrote. The Flowchart Mapper reverse-engineers that calculation graph so finance people can trace every path from assumption to output — and spot what's missing, hidden, or broken.

The output is a `model-graph.json` that powers an interactive D3 explorer (see `templates/flowchart.html`). Users can click nodes for detail, trace flow paths with animated particles, and see structural issues highlighted inline.

---

## Output Format: model-graph.json

The agent produces a single JSON object with this schema. The orchestrator writes it to `model-graph.json` alongside the audit report.

```json
{
  "meta": {
    "model_path": "path/to/model.html",
    "model_name": "FY27 Revenue Model",
    "generated": "ISO-8601 timestamp"
  },
  "zones": [
    {
      "id": "inputs",
      "label": "Inputs & Assumptions",
      "labelX": 25,
      "labelY": 22,
      "separatorX": 280
    }
  ],
  "nodes": [
    {
      "id": "unique_node_id",
      "label": "Human-Readable Name",
      "code_name": "variableNameInCode",
      "type": "input | calc | output | hidden",
      "zone": "zone_id",
      "color": "#0A8080",
      "x": 25,
      "y": 55,
      "width": 120,
      "height": 52,
      "description": "What this node represents",
      "formula": "base_arr * (1 + growth_rate)",
      "value": "$142.5M",
      "location": "model.html:L247 / calculateRevenue()",
      "prominent": false,
      "external": false,
      "crosscutting": false,
      "badge": "v2",
      "packs": ["related_component_ids"]
    }
  ],
  "edges": [
    {
      "source": "node_id_a",
      "target": "node_id_b",
      "color": "#0A8080",
      "type": "forward | feedback",
      "label": "optional edge label"
    }
  ],
  "flows": [
    {
      "id": "revenue-to-arr",
      "label": "Revenue to ARR",
      "color": "#0A8080",
      "path": ["growth_rate", "calc_new_arr", "calc_total_arr", "out_arr"],
      "description": "Traces how the growth rate assumption flows through new ARR calculation to total ARR output."
    }
  ],
  "issues": [
    {
      "id": "FM-001",
      "severity": "error | warning | info",
      "title": "Short description",
      "description": "Detailed explanation",
      "nodes_involved": ["node_id_a", "node_id_b"],
      "recommendation": "Specific fix"
    }
  ]
}
```

---

## Procedure

### Step 1 — Identify All Inputs

Scan the entire model codebase and catalog every value that enters the calculation graph. Classify each input into one of these types:

| Type | Node `type` | Definition | Examples |
|---|---|---|---|
| **Explicit Assumption** | `input` | UI-visible, user-configurable | Slider controls, input fields, dropdowns, toggles |
| **Hidden Assumption** | `hidden` | Hardcoded in JS, not surfaced to user | Magic numbers, default constants, assumed rates buried in functions |
| **External Data** | `input` | Loaded from outside source | API responses, CSV/JSON imports, spreadsheet fetches |

Be exhaustive. Check:
- All HTML input elements (sliders, number fields, selects, checkboxes)
- All `const`, `let`, `var` declarations that hold numeric/string literals used in calculations
- All data fetch calls (fetch, XMLHttpRequest, imported data files)
- Default/fallback values in functions
- Configuration objects and parameter maps

For each input, record:
- `id`: unique slug (e.g., `inp_growth_rate`)
- `label`: human-readable name (e.g., "Growth Rate")
- `code_name`: the actual JS variable/function name
- `type`: `input` or `hidden`
- `description`: what it represents
- `value`: current default value if determinable
- `location`: file path and line number
- `color`: explicit hex color (optional — overrides type-based coloring; use for zone-based coloring)
- `prominent`: true for key/central nodes (larger border radius, thicker stroke)
- `external`: true for external systems or APIs (dashed border, muted appearance)
- `crosscutting`: true for cross-cutting concerns like event buses (non-clickable)
- `badge`: custom corner label like "v2", "Beta", "Core" (overrides the default type badge)
- `packs`: array of related component IDs for drill-down grouping

### Step 2 — Trace Calculation Paths

For **each output** (any value displayed to the user — chart data points, table cells, summary metrics, KPI cards):

1. Start at the output.
2. Trace backward: what intermediate calculations produce this output?
3. For each intermediate, trace backward again: what feeds into it?
4. Continue until you reach raw inputs (from Step 1).
5. Record every edge (A feeds into B) to build the DAG.

Rules:
- Every node gets a unique short ID (e.g., `inp_revenue_growth`, `calc_arr_q2`, `out_total_arr`)
- Preserve the actual variable/function names from the code as `code_name`
- If a single input feeds multiple calculations, create all edges — do not collapse
- If a calculation combines multiple inputs, create all inbound edges
- Record the formula/expression for every calculation node

### Step 3 — Layout the Graph

Organize nodes into zones (left-to-right columns):

| Zone | Contains | Typical Position |
|---|---|---|
| `inputs` | Explicit assumptions, external data | Left |
| `hidden` | Hidden/hardcoded assumptions | Left (below inputs) |
| `calculations` | Intermediate computations | Center |
| `outputs` | Final displayed values | Right |

Layout rules (from Luke Zeller's system map guide):
- **Fixed positions, not force-directed.** Users build spatial memory when nodes stay put.
- **Left-to-right flow**: inputs on left, outputs on right, calculations in between
- **Zone separators**: vertical lines between zones at `separatorX` positions
- **Node sizing**: default `width: 120, height: 52`. Use larger for prominent/complex nodes. Use smaller (height: 36) for simple pass-through nodes
- **Spacing**: minimum 140px between nodes horizontally, 20px vertically. Leave 30px top margin for zone labels.
- **Common sizes**: 100x50, 120x60, 140x70
- **Y-ordering**: group related nodes vertically (e.g., all revenue assumptions together)
- **x/y coordinates are required** for every node — the renderer does NOT auto-layout
- **ViewBox**: 1000-1200 wide, 400-600 tall for most models. Scale up for complex models.
- **Prominent nodes**: mark 3-5 key nodes (e.g., core engine, primary output) with `prominent: true`
- **External systems**: mark data sources, APIs, external services with `external: true`

### Step 4 — Define Flow Paths

Create 3-8 flow paths that trace the most important data journeys through the model. Each flow is a named, colored path that users can click to highlight.

Good flows answer questions like:
- "How does the growth rate assumption reach the total ARR output?"
- "What inputs determine headcount cost?"
- "Where does the churn assumption impact margins?"

Each flow needs:
- `id`: slug (e.g., `revenue-to-arr`)
- `label`: short name for the pill button (e.g., "Revenue to ARR")
- `color`: a distinct hex color from the Gusto palette
- `path`: ordered array of node IDs from source to destination
- `description`: 1-2 sentence explanation shown in the narrative panel

Use these colors for flow pills (rotate through as needed):
- `#0A8080` (teal), `#F45D48` (coral), `#6CB3B3` (teal-60), `#F67D6D` (coral-80), `#3B9999` (teal-80), `#E8A735` (amber), `#F89E92` (coral-60), `#9DCCCC` (teal-40)

### Step 5 — Check for Structural Issues

Inspect the completed DAG for these five categories. Each issue becomes an entry in the `issues` array and also a separate finding in the standard findings format.

#### 5a. Dead Ends
Inputs defined (in UI or code) with **zero outbound edges** — not connected to any calculation or output.

#### 5b. Missing Links
Outputs that lack sufficient inputs to be meaningful. E.g., a revenue projection with no pricing assumption feeding it.

#### 5c. Circular References
Any cycle in the DAG: A -> B -> C -> A. In financial models, circular references are **always errors**.

#### 5d. Hidden Assumptions
Hardcoded values that **materially affect outputs** but are not surfaced as configurable in the UI.

Materiality test: if changing the hardcoded value by +/- 10% moves any output by more than 1%, it is material.

#### 5e. Orphaned Calculations
Intermediate values that are computed but **never used** by any downstream calculation or output.

For each issue found, mark the affected nodes: the renderer will automatically apply the `broken` styling (red background) and show the warning icon.

---

## Findings Output

In addition to `model-graph.json`, produce findings in the standard schema:

### Finding FM-000: Model Calculation Graph

This is always the first finding. It contains the complete graph data.

```json
{
  "id": "FM-000",
  "severity": "info",
  "category": "structural",
  "title": "Model Calculation Graph",
  "description": "Complete dependency graph: {N} inputs -> {M} calculations -> {K} outputs. {H} hidden assumptions. {F} flow paths defined.",
  "evidence": {
    "graph": { ... the full model-graph.json object ... }
  }
}
```

### Findings FM-001+: Structural Issues

One finding per issue from Step 5. Severity mapping:

| Issue Type | Default Severity |
|---|---|
| Circular reference | `error` |
| Missing link (output lacks key input) | `error` |
| Hidden assumption (material) | `warning` |
| Dead end (unused input) | `warning` |
| Orphaned calculation | `info` |

Each finding:

```json
{
  "id": "FM-{NNN}",
  "severity": "error | warning | info",
  "category": "structural",
  "title": "{Issue type}: {specific description}",
  "description": "What the issue is, where it occurs, why it matters.",
  "location": {
    "section": "Flowchart",
    "elements": ["node_id_a", "node_id_b"]
  },
  "evidence": {
    "nodes_involved": ["node_id_a", "node_id_b"],
    "impact": "What outputs are affected"
  },
  "recommendation": "Specific fix"
}
```

---

## Guidance

- **Completeness over cleanliness.** If the model has 50 intermediate calculations, the graph has 50 nodes. The whole point is to expose complexity.
- **Use the actual names from code** as `code_name`. The `label` can be human-friendly, but `code_name` must match the source for traceability.
- **x/y positions are mandatory.** The interactive renderer does not auto-layout. You must calculate sensible positions. Think of it as placing boxes on a whiteboard: inputs on the left, outputs on the right, logical grouping vertically.
- **Test the JSON.** Ensure all node IDs referenced in edges and flows actually exist in the nodes array. Ensure all edge source/target IDs exist. Validate that flow paths are contiguous (each consecutive pair of nodes has an edge between them).
- **Flow paths should be meaningful.** Don't just create random traces — pick the paths that a finance reviewer would want to follow. "How does X assumption reach Y output?" is the right framing.
- **Edge colors should match the zone** of the source node by default. Override with distinct colors for flow-highlighted paths.
