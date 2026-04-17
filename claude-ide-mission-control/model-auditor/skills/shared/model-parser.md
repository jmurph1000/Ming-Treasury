---
name: model-parser
description: Instructions for extracting structured data from arbitrary HTML financial models. Read this before parsing any model.
---

# Model Parser

How to extract structured data from an arbitrary HTML financial model so agents can analyze it.

## Parsing Steps

### 1. Read the Raw File

Use the Read tool to get the full HTML content. For large files (>2000 lines), read in chunks using offset/limit.

### 2. Identify Embedded Data

Look for data in these locations (priority order):

1. **JSON data objects** — `const data = {...}`, `var forecastData = [...]`, `window.__DATA__ = ...`, `__DATA_PLACEHOLDER__` patterns
2. **Chart.js / D3 data arrays** — datasets embedded in chart configurations (`datasets: [{data: [...]}]`)
3. **HTML tables** — `<table>` elements with numeric content, especially those with period headers
4. **JavaScript calculations** — functions that compute values from inputs (`function calcARR()`, arrow functions)
5. **Inline values** — hardcoded numbers in HTML text, KPI tiles, summary boxes

### 3. Extract Structured Representation

Build a structured summary with these components:

**Periods:** What time periods does the model cover? Monthly, quarterly, annual? Label each as actuals or forecast.

**Line items:** What metrics/rows does the model track? (ARR, revenue, customers, churn rate, etc.)

**Values:** For each line item x period, what is the value? Capture in a table format.

**Relationships:** Which values are inputs (assumptions) vs calculated (derived)? What formulas connect them?

**Sources:** Are data sources cited? (Redash queries, Sheets references, Snowflake tables, comments in code)

### 4. Identify Model Type

| Type | Indicators |
|------|-----------|
| Bridge model | Beginning + components = ending pattern, "bridge" in title/labels |
| P&L / Income statement | Revenue - costs = income hierarchy, "P&L" or "income" labels |
| Business case | Investment + returns over time, NPV/IRR calculations |
| Forecast | Historical actuals + forward projections, date-labeled columns |
| Sensitivity | Input variables with output matrices, slider controls |
| Dashboard | Multiple views/tabs, KPI tiles, mixed chart types |

### 5. Detect Actuals vs Forecast Boundary

Look for:
- Explicit labels: "Actual", "Forecast", "Budget", "Plan"
- Visual cues: different background colors, solid vs dashed borders, bold vs regular text
- Data precision: actuals often have irregular values (cents), forecasts are round numbers
- CSS classes: `.actual`, `.forecast`, `.projected`
- The `--actuals-through` flag if provided by the user

### 6. Pass to Agents

Provide each agent with:
- The raw HTML/JS (agents may need to trace specific calculations)
- The structured data summary (periods, line items, values matrix)
- The model type classification
- The actuals-vs-forecast boundary (if identified)
- Any source citations found
