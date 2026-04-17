---
name: explain-code
description: Use when the user asks to explain, understand, or break down a code snippet, function, or file
---

# Explain Code Skill

Provide clear, structured explanations of code snippets at the appropriate level of detail.

## Process

1. **Identify the code** - Get the code from user input, file path, or clipboard
2. **Detect language and context** - Identify programming language, framework, and patterns used
3. **Explain in layers**:
   - **Purpose**: What does this code do? (1-2 sentences)
   - **How it works**: Step-by-step breakdown of the logic
   - **Key concepts**: Language features, patterns, or APIs being used
   - **Potential issues**: Edge cases, bugs, or improvements (only if relevant)

## Output Format

```
## Purpose
[Brief description of what the code accomplishes]

## How It Works
1. [First step/section explanation]
2. [Second step/section explanation]
...

## Key Concepts
- **[Concept name]**: [Brief explanation of the language feature or pattern]
...

## Notes (optional)
- [Any caveats, edge cases, or suggestions]
```

## Guidelines

- Match explanation depth to code complexity
- Use plain language; avoid jargon unless explaining it
- Reference specific line numbers when helpful
- For long code, focus on the most important parts first
- If the user asks about a specific part, focus there
- Don't over-explain obvious things (variable assignments, simple loops)
