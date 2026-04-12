# Decision Framework - Examples

## Example 1: Decision Matrix

**Input:**
```
/clearthought decision_framework framework=decision_matrix Choose deployment platform: AWS vs GCP vs Azure
```

**Output:**
```json
{
  "toolOperation": "decision_framework",
  "framework": "decision_matrix",
  "decision": "Deployment platform selection",
  "options": [
    {"name": "AWS", "description": "Amazon Web Services"},
    {"name": "GCP", "description": "Google Cloud Platform"},
    {"name": "Azure", "description": "Microsoft Azure"}
  ],
  "criteria": [
    {"name": "Cost", "weight": 0.3},
    {"name": "Performance", "weight": 0.25},
    {"name": "Ease of use", "weight": 0.2},
    {"name": "Ecosystem", "weight": 0.15},
    {"name": "Support", "weight": 0.1}
  ],
  "evaluations": [
    {
      "option": "AWS",
      "scores": {
        "Cost": 7,
        "Performance": 9,
        "Ease of use": 7,
        "Ecosystem": 10,
        "Support": 9
      },
      "weightedTotal": 8.15
    },
    {
      "option": "GCP",
      "scores": {
        "Cost": 8,
        "Performance": 9,
        "Ease of use": 9,
        "Ecosystem": 7,
        "Support": 8
      },
      "weightedTotal": 8.25
    },
    {
      "option": "Azure",
      "scores": {
        "Cost": 7,
        "Performance": 8,
        "Ease of use": 8,
        "Ecosystem": 8,
        "Support": 9
      },
      "weightedTotal": 7.85
    }
  ],
  "recommended": "GCP",
  "confidence": 0.87,
  "rationale": "GCP scores highest on weighted criteria with best ease of use and strong performance",
  "tradeOffs": "Smaller ecosystem vs AWS but better developer experience",
  "nextSteps": [
    "Create GCP project and set up billing",
    "Provision Kubernetes cluster",
    "Configure CI/CD pipeline"
  ],
  "sessionContext": {
    "sessionId": "conversation"
  }
}
```

---

## Example 2: Cost-Benefit Analysis

**Input:**
```
/clearthought decision_framework framework=cost_benefit Should we migrate to microservices?
```

**Output:**
```json
{
  "toolOperation": "decision_framework",
  "framework": "cost_benefit",
  "decision": "Microservices migration",
  "options": [
    {"name": "Migrate to microservices", "description": "Break monolith into services"},
    {"name": "Keep monolith", "description": "Improve existing architecture"}
  ],
  "costBenefitAnalysis": {
    "Migrate to microservices": {
      "costs": [
        {"item": "Development time", "value": 6, "unit": "person-months"},
        {"item": "Infrastructure complexity", "value": "High"},
        {"item": "Learning curve", "value": "Medium"},
        {"item": "Initial performance overhead", "value": "Medium"}
      ],
      "benefits": [
        {"item": "Independent scaling", "value": "High"},
        {"item": "Team autonomy", "value": "High"},
        {"item": "Technology flexibility", "value": "High"},
        {"item": "Fault isolation", "value": "Medium"}
      ],
      "netBenefit": 0.65,
      "roi": "Positive after 12 months"
    },
    "Keep monolith": {
      "costs": [
        {"item": "Scaling limitations", "value": "High"},
        {"item": "Deployment coupling", "value": "High"},
        {"item": "Technology lock-in", "value": "Medium"}
      ],
      "benefits": [
        {"item": "Lower complexity", "value": "High"},
        {"item": "Faster development", "value": "Medium"},
        {"item": "Easier debugging", "value": "Medium"}
      ],
      "netBenefit": 0.45,
      "roi": "Immediate"
    }
  },
  "recommended": "Migrate to microservices",
  "confidence": 0.72,
  "rationale": "Long-term benefits outweigh migration costs for growing teams",
  "tradeOffs": "Higher complexity vs better scalability",
  "conditions": [
    "Team size > 10 engineers",
    "Clear service boundaries exist",
    "Have DevOps expertise"
  ],
  "sessionContext": {
    "sessionId": "conversation"
  }
}
```

---

## Example 3: Risk Assessment

**Input:**
```
/clearthought decision_framework framework=risk_assessment Launch new feature without full test coverage
```

**Output:**
```json
{
  "toolOperation": "decision_framework",
  "framework": "risk_assessment",
  "decision": "Launch feature with incomplete tests",
  "options": [
    {"name": "Launch now", "description": "Release with current 60% coverage"},
    {"name": "Delay for tests", "description": "Achieve 90% coverage first"}
  ],
  "riskAnalysis": {
    "Launch now": {
      "risks": [
        {
          "risk": "Production bugs",
          "probability": 4,
          "impact": 4,
          "score": 16,
          "mitigation": "Feature flag + gradual rollout"
        },
        {
          "risk": "User frustration",
          "probability": 3,
          "impact": 3,
          "score": 9,
          "mitigation": "Support team on standby"
        },
        {
          "risk": "Reputation damage",
          "probability": 2,
          "impact": 5,
          "score": 10,
          "mitigation": "Clear beta labeling"
        }
      ],
      "totalRisk": 35,
      "acceptableRisk": false
    },
    "Delay for tests": {
      "risks": [
        {
          "risk": "Market opportunity loss",
          "probability": 4,
          "impact": 3,
          "score": 12,
          "mitigation": "Communicate timeline to stakeholders"
        },
        {
          "risk": "Competitor advantage",
          "probability": 3,
          "impact": 2,
          "score": 6,
          "mitigation": "Monitor competitor launches"
        }
      ],
      "totalRisk": 18,
      "acceptableRisk": true
    }
  },
  "recommended": "Delay for tests",
  "confidence": 0.82,
  "rationale": "Risk of production issues (score 35) outweighs market timing risks (score 18)",
  "mitigationPlan": [
    "Prioritize critical path test coverage",
    "Set up staging environment for testing",
    "Use 2-week sprint for test completion"
  ],
  "sessionContext": {
    "sessionId": "conversation"
  }
}
```

---

## Example 4: Stakeholder Framework

**Input:**
```
/clearthought decision_framework framework=stakeholder Pricing model change: subscription vs usage-based
```

**Output:**
```json
{
  "toolOperation": "decision_framework",
  "framework": "stakeholder",
  "decision": "Pricing model selection",
  "options": [
    {"name": "Subscription", "description": "Fixed monthly fee"},
    {"name": "Usage-based", "description": "Pay per API call"}
  ],
  "stakeholders": ["Users", "Sales", "Engineering", "Finance", "Support"],
  "stakeholderImpact": [
    {
      "stakeholder": "Users",
      "Subscription": {"impact": "Predictable costs", "sentiment": "positive"},
      "Usage-based": {"impact": "Cost varies with usage", "sentiment": "mixed"}
    },
    {
      "stakeholder": "Sales",
      "Subscription": {"impact": "Easier to sell", "sentiment": "positive"},
      "Usage-based": {"impact": "Requires usage forecasting", "sentiment": "negative"}
    },
    {
      "stakeholder": "Engineering",
      "Subscription": {"impact": "Simple billing", "sentiment": "positive"},
      "Usage-based": {"impact": "Complex metering system", "sentiment": "negative"}
    },
    {
      "stakeholder": "Finance",
      "Subscription": {"impact": "Predictable revenue", "sentiment": "positive"},
      "Usage-based": {"impact": "Variable revenue", "sentiment": "mixed"}
    },
    {
      "stakeholder": "Support",
      "Subscription": {"impact": "Fewer billing questions", "sentiment": "positive"},
      "Usage-based": {"impact": "More complex inquiries", "sentiment": "negative"}
    }
  ],
  "recommended": "Subscription",
  "confidence": 0.88,
  "rationale": "4 of 5 stakeholders prefer subscription; usage-based adds engineering complexity",
  "compromises": [
    "Offer usage-based tier for enterprise",
    "Include usage limits in subscription tiers"
  ],
  "sessionContext": {
    "sessionId": "conversation"
  }
}
```

---

## Example 5: Multi-Criteria Decision

**Input:**
```
/clearthought decision_framework framework=multi_criteria Select JavaScript framework for new project
```

**Output:**
```json
{
  "toolOperation": "decision_framework",
  "framework": "multi_criteria",
  "decision": "JavaScript framework selection",
  "options": [
    {"name": "React", "description": "Component-based library"},
    {"name": "Vue", "description": "Progressive framework"},
    {"name": "Svelte", "description": "Compiler-based framework"}
  ],
  "criteria": [
    {"name": "Learning curve", "weight": 0.25, "type": "lower_better"},
    {"name": "Performance", "weight": 0.2, "type": "higher_better"},
    {"name": "Ecosystem", "weight": 0.2, "type": "higher_better"},
    {"name": "Developer experience", "weight": 0.15, "type": "higher_better"},
    {"name": "Community size", "weight": 0.1, "type": "higher_better"},
    {"name": "Job market", "weight": 0.1, "type": "higher_better"}
  ],
  "evaluations": [
    {
      "option": "React",
      "scores": {
        "Learning curve": 6,
        "Performance": 8,
        "Ecosystem": 10,
        "Developer experience": 7,
        "Community size": 10,
        "Job market": 10
      },
      "weightedTotal": 8.15,
      "rank": 1
    },
    {
      "option": "Vue",
      "scores": {
        "Learning curve": 9,
        "Performance": 8,
        "Ecosystem": 7,
        "Developer experience": 9,
        "Community size": 7,
        "Job market": 7
      },
      "weightedTotal": 7.95,
      "rank": 2
    },
    {
      "option": "Svelte",
      "scores": {
        "Learning curve": 8,
        "Performance": 10,
        "Ecosystem": 6,
        "Developer experience": 9,
        "Community size": 5,
        "Job market": 6
      },
      "weightedTotal": 7.55,
      "rank": 3
    }
  ],
  "riskAnalysis": {
    "React": {"risk": "Complexity for large apps", "mitigation": "Use state management"},
    "Vue": {"risk": "Smaller ecosystem", "mitigation": "Growing rapidly"},
    "Svelte": {"risk": "Limited job market", "mitigation": "Great for personal projects"}
  },
  "costBenefit": {
    "React": {"development": "Medium", "maintenance": "Low", "hiring": "Easy"},
    "Vue": {"development": "Fast", "maintenance": "Low", "hiring": "Medium"},
    "Svelte": {"development": "Fast", "maintenance": "Low", "hiring": "Hard"}
  },
  "recommended": "React",
  "confidence": 0.85,
  "rationale": "Highest weighted score, best ecosystem and job market despite steeper learning curve",
  "runner_up": "Vue",
  "sensitivity": "If team experience heavily valued (weight > 0.3), Vue becomes optimal",
  "sessionContext": {
    "sessionId": "conversation"
  }
}
```

---

## Example 6: Pros-Cons (Simple)

**Input:**
```
/clearthought decision_framework framework=pros_cons Should we add dark mode?
```

**Output:**
```json
{
  "toolOperation": "decision_framework",
  "framework": "pros_cons",
  "decision": "Add dark mode feature",
  "options": [
    {"name": "Add dark mode", "description": "Implement dark theme"},
    {"name": "Skip for now", "description": "Keep light theme only"}
  ],
  "analysis": {
    "Add dark mode": {
      "pros": [
        "User request #1 feature (45% of feedback)",
        "Better accessibility for light-sensitive users",
        "Modern UI expectation",
        "Reduces eye strain for night usage"
      ],
      "cons": [
        "2-3 weeks development time",
        "Maintenance of two themes",
        "Color contrast validation needed",
        "Potential new bugs"
      ],
      "score": 4
    },
    "Skip for now": {
      "pros": [
        "Zero development time",
        "Simpler codebase",
        "No new bugs",
        "Focus on core features"
      ],
      "cons": [
        "User dissatisfaction",
        "Competitive disadvantage",
        "Accessibility gaps",
        "Will need to add eventually"
      ],
      "score": 0
    }
  },
  "recommended": "Add dark mode",
  "confidence": 0.9,
  "rationale": "High user demand (45% feedback) and accessibility benefits justify development time",
  "timing": "Implement in next sprint",
  "sessionContext": {
    "sessionId": "conversation"
  }
}
```

---

**For more decision examples, see:**
- `../reference/parameter-reference.md`
- [metagame-examples.md](metagame-examples.md)
