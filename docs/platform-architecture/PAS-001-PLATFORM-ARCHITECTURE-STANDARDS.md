# PAS-001 — Platform Architecture Standards

| Field | Value |
| --- | --- |
| **ID** | PAS-001 |
| **Title** | Platform Architecture Standards |
| **Status** | **DRAFT** |
| **Applies to** | Every module FDR and all subsequent architecture / implementation work |
| **Related** | [PRM-001](./PRM-001-CLIENT.md) · [PRM-002](./PRM-002-WORKSPACE.md) · [PRM-003](./PRM-003-PLATFORM-INTEGRATIONS.md) · [Platform Module Register](./PLATFORM_MODULE_REGISTER.md) |
| **Date** | 2026-07-19 |

---

## Purpose

Capture the architectural rules that **every module** must follow.

When this document is **APPROVED**, it becomes **mandatory** for every future Functional Design Review (FDR). Conflicts with PAS-001 must be called out explicitly in the FDR — never silently accepted.

This document does **not** authorise implementation.

---

## 1. Module Lifecycle

Every module follows this sequence before build:

```
Review
  ↓
FDR
  ↓
Pre-Implementation Review
  ↓
Implementation Readiness
  ↓
Architecture Sign-Off
  ↓
Ready
  ↓
Implementation
```

| Stage | Meaning |
| --- | --- |
| **Review** | Scope and fit against PRMs / navigation / Go-Live register |
| **FDR** | Canonical functional and architectural design for the module |
| **Pre-Implementation Review** | Operational, data model, UI/UX, and related readiness depth |
| **Implementation Readiness** | Verify architecture is sufficient to begin development |
| **Architecture Sign-Off** | Architecture complete; freeze Phase 1 design |
| **Ready** | Module Go-Live / register reflects architecture ready (not “built”) |
| **Implementation** | Only after **explicit** implement authorisation |

Architecture Sign-Off does **not** itself authorise implementation, UI changes, or navigation changes.

---

## 2. Ownership Rules

1. Each business object has a **single owner** module.  
2. Other modules **reference** that object (by stable id).  
3. **No duplicated business data** as a second source of truth (no parallel masters of the same entity).  
4. Display/snapshot fields for labels or historical printouts are allowed when explicitly justified; masters remain with the owner.

---

## 3. Integration Rules

1. All third-party connectivity conforms to **[PRM-003 – Platform Integrations](./PRM-003-PLATFORM-INTEGRATIONS.md)**.  
2. **Never** build module-specific integration frameworks, credential stores, or connection wizards that bypass PRM-003.  
3. Modules own **business** behaviour; the Integration Framework owns **connectivity**, credentials, health, and capability discovery.

---

## 4. Numbering Standards

Human-readable business numbers are **permanent** and **never reused**.

| Prefix (examples) | Domain |
| --- | --- |
| `EMP-000001` | Employees |
| `CLI-000001` | Clients |
| `PRJ-000001` | Projects |
| `SHP-000001` | Shipments |
| `PO-000001` | Purchase / procurement documents |
| `INV-000001` | Invoices (or inventory docs — define per FDR) |

**Rules**

- Format: prefix + zero-padded sequence (padding length defined per module FDR; six digits is the default target).  
- Scope: typically **per workspace** unless the FDR states otherwise (e.g. platform-global).  
- Internal primary keys remain UUIDs (or platform standard); the business number is the durable operator-facing id.  
- Cancelled, completed, and archived records **retain** their numbers forever.

---

## 5. Status Mapping

1. External provider statuses must **map into** canonical **platform** statuses owned by the module.  
2. Modules **own** platform statuses (lifecycle enums).  
3. Providers **never** define platform statuses.  
4. Provider-native codes may be stored as secondary/raw fields for audit and diagnostics only.

---

## 6. Manual First

1. Every **operational** module should function **without requiring external integrations**, unless the business purpose makes that impossible.  
2. Manual / internal paths remain available even after providers are connected, unless an FDR explicitly justifies otherwise.  
3. Onboarding must not force a third-party connection before basic use (where Manual First applies).

---

## 7. Workspace Agnostic

No module may **hard-code** or assume as system of record:

- Country  
- Currency  
- Courier  
- Bank  
- Accounting package  
- Identity provider  

These come from **workspace configuration**, Provider Registry / Integration Framework connections, or other approved configuration surfaces — not from module source constants.

Illustrative vendor names in documentation are **examples only**, never product SoT.

---

## 8. Shared Components

Use shared platform building blocks:

- Tables  
- Status badges  
- Wizards  
- Forms  
- Cards  
- Master–detail layouts  

**No duplicate implementations** where a shared component already exists. Module-specific UI is allowed only when no shared component covers the interaction — and should be promoted to shared when reused.

---

## 9. Audit

1. Business objects are **archived** (or equivalent soft-retire) — not hard-deleted as the normal path.  
2. **Do not hard delete** durable business records.  
3. Maintain **audit history** (timeline / custody / change log as appropriate to the domain).  
4. Historical references and numbering remain valid after archival.

---

## 10. Future Phases

1. Future capabilities belong in the FDR’s **Future Scope** (or equivalent).  
2. They must **not** alter the **approved Phase 1 architecture** after Architecture Sign-Off / freeze.  
3. Extensions require a **separate** amendment or future-phase document — not silent edits to frozen Phase 1 design.

---

## Compliance

| When | Requirement |
| --- | --- |
| Writing an FDR | Cite PAS-001 (once APPROVED) and conform, or list explicit conflicts |
| Implementation | Obey PAS-001 + module FDR + relevant PRMs |
| Architecture freeze | Phase 1 changes only under blocker / cross-platform / explicit future-phase rules |

---

## Approval path

| Status | Meaning |
| --- | --- |
| **DRAFT** | **Current** — under review |
| **APPROVED** | Mandatory for all future FDRs |
| **LOCKED** | Immutable platform standard (same bar as locked PRMs) |

**Next step:** review → **APPROVE** → apply as mandatory baseline for new FDRs.  
**Do not implement** product features from this document alone.

---

## Decision log

| Decision | Outcome |
| --- | --- |
| PAS status | **DRAFT** 2026-07-19 |
| Scope | Platform-wide module architecture standards |
| Relationship to PRMs | Complements PRM-001 / PRM-002 / PRM-003; does not replace them |

---

**End of PAS-001 — Platform Architecture Standards.**  
**Status: DRAFT. No implementation authorised.**
