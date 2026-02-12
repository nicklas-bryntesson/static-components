---
name: update-rules
description: Update project rules based on development learnings and insights. Use when the user asks to capture patterns, update rules, codify learnings, or says things like "make sure the rules reflect this" or "update the rules based on this work".
---

# Update Rules

## Instructions

When the user asks you to update rules based on recent work or learnings, follow this process:

1. **Analyze the Context**: Review the current conversation, recent changes, and any patterns that emerged
2. **Identify Key Learnings**: Extract specific insights, patterns, or conventions that should be preserved
3. **Map to Rule Categories**: Determine which rule file(s) should be updated or if a new rule is needed
4. **Update or Create Rules**: Modify existing rules or create new ones to capture the learnings

## Rule File Structure

The project uses this rule organization:

- `_project.mdc` - Core project philosophy and architecture patterns
- `frontend/_frontend.mdc` - CSS, styling, and frontend conventions  
- `frontend/patterns/_flow-states.mdc` - Component state and flow patterns
- Other pattern-specific files as needed

## When to Update Rules

Update rules when you encounter:

- **New patterns** that work well and should be repeated
- **Anti-patterns** that should be avoided
- **Architectural decisions** that clarify the project philosophy
- **Coding conventions** that improve consistency
- **Component patterns** that emerge from successful implementations
- **State management** approaches that prove effective
- **CSS/styling** techniques that align with project goals

## Update Process

### 1. Analyze Current Work

Look at:
- Recent file changes and implementations
- Patterns that worked well or poorly
- Decisions made and their reasoning
- Any deviations from existing rules and why

### 2. Extract Actionable Insights

Focus on:
- **Concrete patterns** (not abstract principles)
- **Specific examples** of good/bad practices  
- **Decision criteria** for choosing approaches
- **Implementation details** that matter

### 3. Choose the Right Rule File

- **Core philosophy/architecture** → `_project.mdc`
- **CSS/styling/frontend** → `frontend/_frontend.mdc`
- **Component states/flows** → `frontend/patterns/_flow-states.mdc`
- **New pattern category** → Create new file in appropriate folder

### 4. Update Format

When updating rules:
- Add concrete examples with ✅ GOOD / ❌ BAD patterns
- Include reasoning for the pattern
- Keep entries concise but specific
- Maintain the existing tone and style of the rule file

## Example Triggers

The user might say:
- "This accordion pattern worked really well, make sure we capture this approach"
- "We should avoid that CSS-in-JS pattern, update the rules"
- "The way we handled component states here is perfect, codify it"
- "This was super good work, make sure the rules reflect these learnings"

## Execution Steps

1. Read relevant existing rule files to understand current conventions
2. Identify what specific insights should be captured
3. Determine if this is an update to existing rules or a new rule needed
4. Make the changes with clear examples and reasoning
5. Confirm the update preserves the project's philosophy and tone

## Output

After updating rules, provide a brief summary of:
- Which rule file(s) were updated
- What specific patterns/insights were captured
- How this will help future development