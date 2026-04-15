---
name: reviewing-4p-priorities
description: Classify software issues and tasks into P0-P4 priority levels using the Fibery framework. Use when the user asks about priority classification, issue triage, bug prioritization, or mentions P0/P1/P2/P3/P4 priorities.
---

# 4P Priority Classification System

Classify software issues and tasks into P0-P4 priority levels based on urgency and impact.

## Quick Decision Tree

Answer these questions in order:

1. **Is the entire product/service unusable by all users?**
   - YES → **P0** (Critical)
   - NO → Continue

2. **Is major functionality broken for many users?**
   - YES → **P1** (High)
   - NO → Continue

3. **Is this a minor malfunction or important future enhancement?**
   - YES → **P2** (Moderate)
   - NO → Continue

4. **Is this polish, refinement, or affects very few users?**
   - YES → **P3** (Low)
   - NO → Continue

5. **Is this a wishlist item with negligible current impact?**
   - YES → **P4** (Negligible)

## Priority Levels at a Glance

| Level | Urgency | Impact | Response Time | Example |
|-------|---------|--------|---------------|---------|
| **P0** | Critical | Extensive | Immediate (24/7) | System outage, app crashes on launch |
| **P1** | High | Large | Urgent (business hours) | Major feature broken, many users affected |
| **P2** | Moderate | Moderate | Scheduled | Minor feature malfunction, strategic timing |
| **P3** | Low | Minor | Routine work | Polish, affects few users |
| **P4** | Negligible | Negligible | Backlog | Nice-to-have, no current impact |

## Critical Distinctions

### P0 vs P1: The Most Important Boundary

**P0 = Drop everything now (24/7 response)**
- Entire service is down or completely unusable
- ALL users are blocked
- Example: Messaging app crashes immediately on launch

**P1 = Urgent but during business hours**
- Major functionality broken but service still runs
- MANY users affected but not everyone
- Example: Reviews not displaying on e-commerce site

**Key question:** "Does this require waking up the team at 3 AM?"
- YES → P0
- NO → P1

### P1 vs P2: Scale and Immediacy

**P1 = Many users + immediate attention needed**
- Single high-impact issue affecting many users
- Cannot wait for normal prioritization cycle

**P2 = Strategic prioritization needed**
- Multiple moderate issues exist
- Important but can be scheduled strategically
- Example: New feature to filter social media feeds

**Key question:** "Can this be prioritized against other work?"
- NO (must do now) → P1
- YES (can schedule) → P2

## Classification Workflow

When classifying an issue:

1. **Assess Impact**
   - How many users are affected?
   - Is core functionality broken or enhancement missing?
   - What's the business impact if not fixed immediately?

2. **Assess Urgency**
   - Can users work around this?
   - Does this require immediate response?
   - What's the degradation rate if delayed?

3. **Apply Decision Tree** (see above)

4. **Validate Classification**
   - Am I over-escalating? (crying P0 for a P1)
   - Is this truly blocking users or just inconvenient?
   - Have I considered the actual user impact data?

5. **Document Rationale**
   - Use the template below

## Priority Assessment Template

Use this template for classification output:

```markdown
## Priority Assessment

**Classification:** P[0-4]

**Issue:** [Brief description]

**Impact:**
- User count: [How many users affected]
- Functionality: [What's broken or missing]
- Business impact: [Revenue, reputation, compliance]

**Urgency:**
- Response needed: [Immediate 24/7 / Business hours / Scheduled / Routine / Backlog]
- Can users work around: [Yes/No + how]
- Degradation rate: [How quickly does this get worse]

**Rationale:**
[Why this priority level and not one level up or down]

**Validation:**
- Not over-escalated: [Checked against alert fatigue]
- Evidence-based: [Based on actual data, not assumptions]
- Team-aligned: [Consistent with team criteria]
```

## Common Pitfalls

### Alert Fatigue
**Symptom:** Everything becomes P0 or P1
**Fix:** Reserve P0 for true emergencies. Ask "Would I wake someone up at 3 AM for this?"

### Context Blindness
**Symptom:** Classifying without knowing how many users are actually affected
**Fix:** Always gather impact data before classification

### Scope Creep
**Symptom:** Expanding a P2 issue into P0 by adding "what ifs"
**Fix:** Classify the actual current impact, not hypothetical scenarios

## Detailed Examples

For comprehensive scenarios and edge cases, see [examples.md](examples.md).

## When to Use This Skill

- User asks "What priority should this be?"
- Bug triage meetings
- Incident response classification
- Backlog grooming with priority discussion
- User mentions P0, P1, P2, P3, or P4 explicitly
- Confusion between priority levels

## Anti-Patterns to Avoid

**Don't:**
- Classify without impact data
- Let loudest voice determine priority
- Use P0 as "I really want this done"
- Skip validation checks
- Ignore team's priority criteria

**Do:**
- Gather evidence first
- Apply decision tree consistently
- Validate against alert fatigue
- Document rationale clearly
- Align with team standards
