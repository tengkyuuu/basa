# Local walkthrough with Groq

Status: superseded by [ADR 0006: Public hackathon preview](0006-public-hackathon.md). This document records the earlier local-only scope; owner review remains required before shared release.

The user requested Groq and confirmed that tomorrow's delivery is a walkthrough on this computer. This supersedes the Gemini/AI Gateway choice in ADR 0002 for this delivery only.

Use Groq chat completions with structured JSON. The story model and independent verifier must differ. The generator sees levels, constraints and recent story titles. The verifier sees content and options without answer keys. Teacher notes use aggregate counts. No learner identity or audio crosses the provider boundary.

The restored Postgres scaffold needs an external database and further production orchestration. To make the walkthrough runnable without accounts at another service, use a local SQLite adapter with server-side credentials, hashed cookie sessions, revision-protected learner aggregates and transactional parent links. Restrict the running app to loopback. Keep the original Postgres schema for the production workstream.

The walkthrough uses silent reading. It records real comprehension answers and never supplies invented voice evidence. Missing reviewed placement and lesson content remains visibly unavailable. The user may explicitly skip placement and begin at the configured default with an unmeasured-level notice, as permitted by PLAN.md section 6.2.

Consequences: the core interaction can be exercised locally without paid infrastructure. This is not a production deployment or completed pilot gate. The local aggregate must be migrated to the production repository design, and owner, educator and privacy reviews still apply.
