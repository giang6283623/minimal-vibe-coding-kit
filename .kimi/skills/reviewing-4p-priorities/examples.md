# 4P Priority Classification: Detailed Examples

Concrete scenarios for each priority level based on real-world software development situations.

## P0 Priority Examples

### Example 1: Messaging App Crash (from Fibery article)

**Scenario:** Just released an update for a popular messaging app. A critical bug causes the app to crash immediately upon opening. Every single user is affected.

**Why P0:**
- **Impact:** All users completely blocked
- **Urgency:** Immediate (24/7 response)
- **Scope:** Complete service disruption
- **Response:** All hands on deck, pause all other work

**Classification rationale:** This is the epitome of P0. No user can access any functionality. Revenue impact is severe. Reputation damage accumulates by the minute.

**Key indicator:** "Would I wake up the entire team at 3 AM?" → YES, absolutely.

---

### Example 2: System Outage

**Scenario:** Production database goes down. Website shows error pages. No users can access the platform.

**Why P0:**
- **Impact:** 100% of users blocked
- **Urgency:** Every minute of downtime costs revenue
- **Scope:** Complete business stoppage
- **Response:** Drop everything, immediate escalation

**Not P1 because:** This cannot wait until morning. Every minute matters.

---

## P1 Priority Examples

### Example 1: E-commerce Review Display (from Fibery article)

**Scenario:** Online shopping platform has a glitch where user reviews are not displaying correctly on product pages. Customers can still browse products, add to cart, and check out.

**Why P1:**
- **Impact:** Reviews influence buying decisions (revenue impact)
- **Urgency:** Needs quick fix but not catastrophic
- **Scope:** Major functionality degraded but not broken
- **Response:** Queue after P0 issues, swift resolution needed

**Key distinction from P0:** The platform still functions. Users can complete purchases. But reviews are "bread and butter of e-shopping" so high priority.

**Classification rationale:** Many users affected, revenue at risk, but service is operational. Can wait until business hours if discovered at midnight.

---

### Example 2: Payment Processing Slowdown

**Scenario:** Payment processing takes 30 seconds instead of 3 seconds. Users are completing transactions but abandonment rate is increasing.

**Why P1:**
- **Impact:** High - affects conversion rate
- **Urgency:** High - measurable business impact
- **Scope:** Core functionality degraded
- **Response:** Immediate attention during business hours

**Not P0 because:** Payments still process. Not a complete outage.

**Not P2 because:** Affects many users immediately with direct revenue impact.

---

## P2 Priority Examples

### Example 1: Social Media Feed Filter (from Fibery article)

**Scenario:** Planning to introduce a new feature that allows users to filter their social media feeds based on interests. Currently, the app works well, but this would enhance user experience.

**Why P2:**
- **Impact:** Moderate - improves but doesn't fix broken functionality
- **Urgency:** Moderate - important for growth but not immediate
- **Scope:** Enhancement, not fix
- **Response:** Strategic timing, fit into roadmap

**Classification rationale:** "Like adding a chocolate drizzle on top – great to have, but your ice cream sundae is still good without it."

**Not P1 because:** Current app is fully functional. No users are blocked.

**Not P3 because:** Significant feature for user retention and engagement.

---

### Example 2: Search Results Relevance

**Scenario:** Search results are sometimes showing less relevant items higher in the list. Users can find what they need with a bit more scrolling.

**Why P2:**
- **Impact:** Moderate user friction
- **Urgency:** Should be fixed but not urgent
- **Scope:** Quality improvement
- **Response:** Prioritize against other P2 items

**Key question answered:** "Can this be deprioritized depending on its scale?" → YES

---

## P3 Priority Examples

### Example 1: Fitness App Themes (from Fibery article)

**Scenario:** Developing a fitness-tracking app. A P3 task is adding new aesthetic themes for the app's interface. The themes make the app look better and give users personalization options.

**Why P3:**
- **Impact:** Low - doesn't improve core functionality (workout tracking, health data)
- **Urgency:** Low - nice to have when time permits
- **Scope:** Polish and aesthetics
- **Response:** Part of routine work, tackle after higher priorities

**Classification rationale:** "Jazz up the user experience" but doesn't jump the queue ahead of functional improvements.

**Not P2 because:** Doesn't significantly impact user retention or engagement.

**Not P4 because:** Will eventually be implemented as part of ongoing improvements.

---

### Example 2: Error Message Clarity

**Scenario:** Error messages are functional but could be more user-friendly. Users understand there's an error but messages could be clearer about what action to take.

**Why P3:**
- **Impact:** Minor UX improvement
- **Urgency:** Low
- **Scope:** Quality of life
- **Response:** Include in routine improvement cycle

---

## P4 Priority Examples

### Example 1: AI Assistant Suggestion Feature (from Fibery article)

**Scenario:** Developing a project management tool. A P4 task is integrating an experimental AI assistant feature to suggest task prioritization. This is innovative but not necessary for current operation.

**Why P4:**
- **Impact:** Negligible current impact
- **Urgency:** None - experimental
- **Scope:** Wishlist / innovation
- **Response:** Backlog placement, evaluate later

**Classification rationale:** "Could add value in the long run but isn't necessary or urgent." Development can be indefinitely postponed without impact.

**Not P3 because:** No commitment to ever build this. Purely speculative.

---

### Example 2: Easter Egg Features

**Scenario:** Team wants to add hidden Easter egg features that delight power users when discovered.

**Why P4:**
- **Impact:** Zero impact on core functionality
- **Urgency:** None
- **Scope:** Fun but unnecessary
- **Response:** Only if team has completely free time

---

## Edge Cases and Tricky Classifications

### Edge Case 1: Security Vulnerability (Not Actively Exploited)

**Scenario:** Discover a security vulnerability. No evidence of active exploitation. Patch available.

**Classification:** P1 (not P0)
- **Rationale:** High impact potential but not currently causing damage
- **Response:** Urgent deployment during business hours
- **Why not P0:** Not actively causing outage or data breach

---

### Edge Case 2: Security Vulnerability (Actively Exploited)

**Scenario:** Security vulnerability is being actively exploited. Data breach in progress.

**Classification:** P0
- **Rationale:** Active business disruption and damage
- **Response:** Immediate 24/7 response, stop the breach
- **Why P0:** Every minute increases damage

---

### Edge Case 3: Feature Regression Affecting 5% of Users

**Scenario:** Update broke a feature, but only affects 5% of users due to specific configuration. Those 5% are completely blocked.

**Classification:** P1 (edge case between P1 and P2)
- **Rationale:** Smaller user count but complete blockage for them
- **Response:** Urgent fix but can be scheduled
- **Why not P0:** Majority of users unaffected
- **Why not P2:** Those affected are completely blocked

**Decision factors:**
- Are those 5% high-value users? → P1
- Is there a simple workaround? → P2
- Can it wait 24 hours? → P2, otherwise P1

---

### Edge Case 4: Critical Feature for One Major Client

**Scenario:** Feature is broken, affects only one enterprise client who represents 30% of revenue.

**Classification:** P1 (potentially P0 depending on contract)
- **Rationale:** Business impact is severe despite single client
- **Response:** Immediate attention
- **Consider:** SLA agreements, contract obligations, revenue impact

**Key question:** "If we lost this client, what's the business impact?" → Drives priority

---

## Cross-Reference: P0 vs P1 Decision Matrix

| Criteria | P0 | P1 |
|----------|----|----|
| **Service status** | Completely down/unusable | Degraded but functional |
| **User impact** | All users blocked | Many users affected |
| **Response time** | Immediate (24/7) | Urgent (business hours) |
| **Team action** | Drop everything | Queue after P0 |
| **Example decision** | Wake team at 3 AM? YES | Wake team at 3 AM? NO |

## Cross-Reference: P1 vs P2 Decision Matrix

| Criteria | P1 | P2 |
|----------|----|----|
| **Number of issues** | Usually single critical issue | Can have multiple P2s |
| **Prioritization** | Cannot be deprioritized | Can be prioritized against others |
| **User blocking** | Many users blocked from key feature | Users have workarounds or minor impact |
| **Response** | Must do now | Strategic scheduling |
| **Example decision** | Can wait for sprint planning? NO | Can wait for sprint planning? YES |

## Validation Checklist

Before finalizing priority classification, check:

### For P0 Classification:
- [ ] Is EVERY user affected?
- [ ] Is the service completely unusable?
- [ ] Would I wake up the team at 3 AM for this?
- [ ] Is there zero workaround?
- [ ] Is immediate action required or damage accumulates rapidly?

**If any answer is NO, reconsider if this is truly P0.**

### For P1 Classification:
- [ ] Are MANY users affected (not just a few)?
- [ ] Is major functionality broken (not just degraded)?
- [ ] Does this require immediate attention during business hours?
- [ ] Is there measurable business impact?

**If answers are mixed, consider P2.**

### Alert Fatigue Check:
- [ ] In the past month, what % of issues did we classify as P0?
- [ ] If >20% are P0, are we over-escalating?
- [ ] Are we desensitized to "urgent" because everything is urgent?

**Healthy distribution:** ~5% P0, ~15% P1, ~30% P2, ~30% P3, ~20% P4

---

## Summary Table of All Examples

| Priority | Example | User Impact | Time to Fix |
|----------|---------|-------------|-------------|
| **P0** | App crashes on launch | All users blocked | Immediate (24/7) |
| **P0** | System outage | All users blocked | Immediate (24/7) |
| **P1** | Reviews not displaying | Many users, revenue impact | Urgent (business hours) |
| **P1** | Payment slowdown | Many users, conversion impact | Urgent (business hours) |
| **P2** | New filter feature | Enhancement, no blockage | Strategic timing |
| **P2** | Search relevance | Minor friction | Strategic timing |
| **P3** | UI themes | Polish, personalization | Routine work |
| **P3** | Error message clarity | Minor UX improvement | Routine work |
| **P4** | AI assistant experiment | Negligible current impact | Backlog |
| **P4** | Easter eggs | Fun but unnecessary | Backlog |

---

## Usage Tips

1. **Start with impact, then urgency**: Impact determines the ceiling (P0 requires extensive impact), urgency determines response time.

2. **Use examples as anchors**: When unsure, compare to these concrete examples. Is it more like "app crashes" (P0) or "reviews missing" (P1)?

3. **Validate with team**: Share classification rationale and get feedback. Consistency across team is crucial.

4. **Track over time**: Monitor priority distribution. Healthy teams don't have 50% P0/P1 issues.

5. **Update examples**: Add organization-specific examples as you encounter them.
