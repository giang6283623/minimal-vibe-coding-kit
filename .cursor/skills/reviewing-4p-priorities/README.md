# 4P Priority Classification Skill

A Claude Agent Skill for classifying software issues and tasks using the P0-P4 (4P) priority framework from Fibery.

## Overview

This skill helps product managers, engineers, and teams consistently classify issues and tasks into five priority levels (P0-P4) based on urgency and impact. It prevents common pitfalls like alert fatigue and provides structured decision-making frameworks.

## When to Use

This skill is automatically activated when:
- User asks "What priority should this be?"
- User mentions P0, P1, P2, P3, or P4 explicitly
- Bug triage or incident response scenarios
- Backlog grooming discussions
- Priority classification questions

## What This Skill Does

1. **Decision Tree Guidance**: Walks through a systematic classification process
2. **Critical Distinctions**: Emphasizes the most important boundaries (P0 vs P1, P1 vs P2)
3. **Validation Checks**: Prevents over-escalation and alert fatigue
4. **Structured Output**: Provides consistent priority assessment template
5. **Detailed Examples**: References real-world scenarios for edge cases

## Priority Levels Quick Reference

| Level | Summary | Example | Response Time |
|-------|---------|---------|---------------|
| **P0** | Critical system-wide failure | App crashes on launch | Immediate (24/7) |
| **P1** | Major feature broken, many users | Reviews not displaying | Urgent (business hours) |
| **P2** | Important but schedulable | New filter feature | Strategic timing |
| **P3** | Enhancement and polish | UI themes | Routine work |
| **P4** | Nice-to-have wishlist | Easter eggs | Backlog |

## Key Concepts

### The Most Important Question
**"Would I wake up the team at 3 AM for this?"**
- YES → P0
- NO → Check if P1 or lower

### Alert Fatigue Prevention
Healthy priority distribution:
- ~5% P0 (true emergencies only)
- ~15% P1 (urgent and high impact)
- ~30% P2 (important work)
- ~30% P3 (improvements)
- ~20% P4 (wishlist)

If >20% of your issues are P0, you're likely over-escalating.

## File Structure

```
reviewing-4p-priorities/
├── SKILL.md           # Main decision tree and workflow (150 lines)
├── examples.md        # Detailed scenarios and edge cases (350 lines)
└── README.md          # This file
```

## Usage Examples

### Basic Classification
```
User: "We have a bug where some users can't login. What priority is this?"

Claude: [Loads skill, applies decision tree]
- Assesses impact (some users vs all users)
- Checks urgency (can they work around it?)
- Classifies as P1 (high priority, not emergency)
- Provides structured rationale
```

### Edge Case Resolution
```
User: "Security vulnerability found but not being exploited. P0 or P1?"

Claude: [References examples.md]
- Not actively causing damage → P1
- High impact potential but not current → P1
- Recommends urgent fix during business hours
```

### Alert Fatigue Check
```
User: "Everything feels urgent. How do we fix our priority process?"

Claude: [Uses validation checklist]
- Analyzes priority distribution
- Identifies over-escalation pattern
- Provides recalibration guidance
```

## Design Principles

This skill follows Claude Agent Skills best practices:

### 1. Concise Content
- Assumes Claude knows project management basics
- Focuses on the specific 4P framework
- No unnecessary explanations
- Main SKILL.md is ~150 lines (under 500-line recommendation)

### 2. Progressive Disclosure
- Quick decision tree in SKILL.md
- Detailed examples in examples.md (loaded only when needed)
- Separates common cases from edge cases

### 3. Appropriate Degrees of Freedom
- **Low freedom** for P0 identification (critical to get right)
- **Medium freedom** for P1/P2 boundary (context-dependent)
- **High freedom** for P3/P4 (less critical if misclassified)

### 4. Workflows and Validation
- Clear step-by-step classification workflow
- Built-in validation checks
- Template for structured output

### 5. Real-World Examples
- Based on Fibery blog article scenarios
- Concrete situations (not abstract)
- Covers common confusion points

## Validation and Testing

### Tested Scenarios
- [x] Basic P0 classification (system outage)
- [x] P0 vs P1 distinction (most critical boundary)
- [x] P1 vs P2 distinction (impact and urgency balance)
- [x] Edge cases (security vulnerabilities, partial outages)
- [x] Alert fatigue detection

### Expected Behavior
Claude should:
1. Load SKILL.md when priority classification is mentioned
2. Apply decision tree systematically
3. Reference examples.md for edge cases
4. Provide structured output using template
5. Include validation checks in rationale

## Extending This Skill

### Adding Organization-Specific Examples
Edit `examples.md` and add new scenarios under appropriate sections:

```markdown
### Example N: [Your Scenario]

**Scenario:** [Description]

**Why P[0-4]:**
- **Impact:** [User impact details]
- **Urgency:** [Time sensitivity]
- **Scope:** [How widespread]
- **Response:** [Expected action]

**Classification rationale:** [Why this level and not others]
```

### Adding Custom Criteria
Edit the decision tree in `SKILL.md` if your organization has specific criteria:
- SLA requirements
- Contract obligations
- Compliance requirements
- Revenue thresholds

### Integration with Tools
This skill works well with:
- Issue tracking systems (Jira, Linear, GitHub Issues)
- Incident management (PagerDuty, Opsgenie)
- Project management (Fibery, Asana, etc.)

## Troubleshooting

### Issue: Claude doesn't trigger the skill
**Solution:** Mention "priority" or "P0/P1/P2/P3/P4" explicitly in your query.

### Issue: Classification feels wrong
**Solution:** Check the validation section and examples.md for similar scenarios.

### Issue: Team disagrees on classification
**Solution:** Use the structured output template to document rationale and discuss specific criteria.

## Source Material

This skill is based on:
- **Fibery Blog**: [P1, P2, P3, and P4 Priority Levels Explained](https://fibery.com/blog/product-management/p0-p1-p2-p3-p4/)
- **Claude Skills Best Practices**: [Official Documentation](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

## Version History

- **v1.0.0** (2026-04-15): Initial release
  - Decision tree workflow
  - Detailed examples from Fibery article
  - Validation checks and templates
  - Progressive disclosure structure

## License

This skill is provided as-is for use with Claude Agent Skills. Modify and adapt as needed for your organization.

## Contributing

To improve this skill:
1. Test with real-world priority classification scenarios
2. Document edge cases that aren't covered
3. Share examples that helped your team
4. Refine decision tree based on usage patterns

## Questions?

Common questions answered in SKILL.md:
- "What's the difference between P0 and P1?" → See Critical Distinctions section
- "How do I avoid alert fatigue?" → See Common Pitfalls section
- "Where can I find detailed examples?" → See examples.md

For complex scenarios, reference examples.md directly for edge cases and cross-reference matrices.
