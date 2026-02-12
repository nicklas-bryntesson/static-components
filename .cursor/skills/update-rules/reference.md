# Rule Update Reference

## Existing Rule Files Analysis

### _project.mdc
- **Purpose**: Core architecture philosophy and mental models
- **Style**: Principle-based with concrete examples  
- **Structure**: Philosophy statements with "We optimize for:" lists
- **Tone**: Authoritative, explicit about project deviations from common conventions

### frontend/_frontend.mdc  
- **Purpose**: CSS conventions, styling approaches, data attributes
- **Style**: Technical guidelines with code examples
- **Structure**: Organized by categories (CSS conventions, data attributes, etc.)
- **Tone**: Practical, specific about what to avoid (like BEM syntax)

### frontend/patterns/_flow-states.mdc
- **Purpose**: Component state management and flow patterns
- **Style**: State-focused with explicit state definitions
- **Structure**: Pattern definitions with examples
- **Tone**: Systematic, focused on state predictability

## Common Update Patterns

### Adding New Anti-Patterns

When you identify something that should be avoided:

```markdown
## Avoid [Pattern Name]

❌ **BAD**: [Specific example with code]
```reason why this is problematic```

✅ **GOOD**: [Alternative approach with code]  
```reason why this is better```
```

### Adding New Conventions  

When codifying a successful pattern:

```markdown  
## [Pattern Name]

[Brief explanation of when to use]

✅ **PATTERN**: 
```[code example]```

**Reasoning**: [Why this approach aligns with project philosophy]
```

### Updating Existing Sections

When enhancing existing rules:
1. Find the relevant section
2. Add new examples using existing format
3. Maintain consistency with existing tone
4. Don't duplicate - extend or clarify

## File Selection Guidelines

### Choose _project.mdc when:
- The learning affects overall architecture approach
- It challenges or confirms core philosophy  
- It's about component ownership patterns
- It relates to progressive enhancement strategy

### Choose frontend/_frontend.mdc when:
- CSS techniques or conventions
- Data attribute patterns
- Styling approaches
- Frontend-specific tooling decisions

### Choose frontend/patterns/_flow-states.mdc when:
- Component state management
- User interaction flows  
- State transition patterns
- Component behavior definitions

### Create new file when:
- The pattern doesn't fit existing categories
- You have multiple related patterns for a new domain
- The existing file would become too long

## Tone Matching

Each rule file has a distinct voice:

**_project.mdc**: Philosophical but concrete
- "We build stateful UI systems, not responsive pages"
- "Components own internal layout logic" 
- Uses definitive statements with clear reasoning

**_frontend.mdc**: Technical and prescriptive  
- Direct instructions with examples
- Clear do/don't patterns
- Focused on implementation details

**_flow-states.mdc**: Systematic and state-focused
- Defines states explicitly
- Uses consistent terminology  
- Emphasizes predictability

## Integration Guidelines

When updating rules:

1. **Read first**: Always review the existing file structure and tone
2. **Extend, don't replace**: Add to existing patterns rather than rewriting
3. **Use project vocabulary**: Match terminology already established  
4. **Keep examples concrete**: This project values specific over abstract
5. **Maintain philosophy**: Ensure updates align with stated project values

## Quality Checklist

Before finalizing rule updates:

- [ ] Examples are concrete and actionable
- [ ] Tone matches the existing file
- [ ] No contradictions with existing rules
- [ ] Reasoning explains "why" not just "what"  
- [ ] Uses established project terminology
- [ ] Follows existing formatting patterns