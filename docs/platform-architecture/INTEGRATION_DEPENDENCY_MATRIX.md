# Integration Dependency Matrix

| Field | Value |
| --- | --- |
| **Status** | **APPROVED** |
| **Based on** | [PRM-003 – Platform Integrations](./PRM-003-PLATFORM-INTEGRATIONS.md) (**APPROVED**) |
| **Purpose** | Platform-wide third-party integration opportunities before implementation |
| **Date** | 2026-07-19 |

---

## How to read this matrix

| Column | Meaning |
| --- | --- |
| **Integration Required** | `None` · `Optional` · `Required` — whether the module’s target architecture expects PRM-003 provider connections |
| **Potential Provider Types** | PRM-003 categories that may apply |
| **Mandatory / Optional** | Whether a live provider connection is mandatory for the module to meet its production intent, or optional (manual / internal-only still valid) |
| **Examples** | Illustrative vendors only — not an exclusive allow-list |

**Rules**

- Modules with **None** do not need PRM-003 citations in their FDR unless scope later changes.  
- **Optional** / **Required** modules must cite **PRM-003** in their FDR when written or updated.  
- Credentials always live in the Integration Framework — never in module tables (PRM-003).  
- Manual fallback remains available even when Integration Required = Required (PRM-003 §9).

---

## FDR impact assessment (existing FDRs only)

| FDR | PRM-003 posture | FDR update |
| --- | --- | --- |
| [FDR-MOD-071 Employees](./FDR-MOD-071-EMPLOYEES.md) | **Optional** — Identity Providers | Related PRMs + §E + integration map updated |
| [FDR-MOD-092 Logistics](./FDR-MOD-092-LOGISTICS.md) | **Required** — Shipping Providers | Already aligned (§G); status references set to **APPROVED** |

No other FDRs exist at this date. Future FDRs must consult this matrix and cite PRM-003 where Integration Required ≠ None.

---

## Dependency Matrix

| Module ID | Module Name | Integration Required | Potential Provider Types | Mandatory / Optional | Examples |
| --- | --- | --- | --- | --- | --- |
| MOD-001 | Home Dashboard | None | — | — | — |
| MOD-002 | Executive Assistant | Optional | AI Providers; Communication Providers | Optional | OpenAI, Anthropic, Microsoft Copilot |
| MOD-010 | Clients Dashboard | None | — | — | — |
| MOD-011 | Client Directory | None | — | — | — |
| MOD-012 | Client Onboarding | Optional | Payment Providers; Identity Providers | Optional | Stripe, Wise (activation); Entra ID (customer SSO later) |
| MOD-020 | CRM Pipeline | Optional | Communication Providers; Email Providers; Calendar Providers | Optional | Microsoft 365, Gmail, Twilio |
| MOD-021 | Discovery & Demo Sessions | Optional | Calendar Providers; Communication Providers; Voice / Video (Communication) | Optional | Google Calendar, Microsoft Teams, Zoom |
| MOD-022 | Potential Clients | None | — | — | — |
| MOD-030 | Partners | None | — | — | — |
| MOD-040 | Projects Dashboard | None | — | — | — |
| MOD-041 | Internal Projects | None | — | — | — |
| MOD-042 | External Projects | None | — | — | — |
| MOD-050 | Grants | Optional | Accounting Providers; Banking Providers | Optional | Xero, Sage |
| MOD-060 | Financial Overview | Required | Accounting Providers; Banking Providers; Payment Providers | Mandatory | Xero, QuickBooks, Sage, Stripe, Wise |
| MOD-061 | General Ledger | Required | Accounting Providers | Mandatory | Xero, QuickBooks, Sage |
| MOD-062 | Accounts Receivable | Required | Accounting Providers; Payment Providers; Banking Providers | Mandatory | Xero, Stripe, Wise |
| MOD-063 | Accounts Payable | Required | Accounting Providers; Banking Providers; Payment Providers | Mandatory | Xero, Sage, Wise |
| MOD-064 | Expenses | Required | Accounting Providers; Banking Providers; Payment Providers | Optional | Xero, Expensify-class, Wise |
| MOD-065 | Bank | Required | Banking Providers | Mandatory | Wise, open-banking banks |
| MOD-066 | Reports | Optional | Accounting Providers | Optional | Xero, QuickBooks (report pull) |
| MOD-070 | Human Resources Dashboard | None | — | — | — |
| MOD-071 | Employees | Optional | Identity Providers | Optional | Microsoft Entra ID, Google Workspace, Okta |
| MOD-072 | Leave | Optional | Calendar Providers | Optional | Google Calendar, Microsoft 365 |
| MOD-073 | Performance | None | — | — | — |
| MOD-074 | Recruitment | Optional | Communication Providers; Email Providers; Identity Providers | Optional | LinkedIn-class ATS later, SendGrid, Entra ID |
| MOD-080 | Corporate Information Dashboard | None | — | — | — |
| MOD-081 | Company Details | None | — | — | — |
| MOD-082 | Office Locations | None | — | — | — |
| MOD-083 | Bank Accounts | Required | Banking Providers | Optional | Wise, bank APIs (corporate account master still internal) |
| MOD-084 | Professional Advisors | None | — | — | — |
| MOD-085 | Software & Licences | Optional | Website / SaaS licence APIs (future); Identity Providers | Optional | Vendor licence portals (when available) |
| MOD-086 | Contracts | Optional | Document / e-sign providers (Communication / future Document Providers) | Optional | DocuSign, Adobe Sign |
| MOD-087 | Unit311 Details | None | — | — | — |
| MOD-090 | Assets | None | — | — | — |
| MOD-091 | Inventory Management | None | — | — | — |
| MOD-092 | Logistics | Required | Shipping Providers | Mandatory | UPS, DHL, Royal Mail, FedEx, Japan Post |
| MOD-100 | File Explorer | Optional | Cloud storage providers (future Storage Providers) | Optional | SharePoint, Google Drive, Dropbox |
| MOD-101 | Internal Files | Optional | Cloud storage providers | Optional | SharePoint, Google Drive |
| MOD-102 | External Files | Optional | Cloud storage providers | Optional | SharePoint, Google Drive |
| MOD-103 | Client Explorer | Optional | Cloud storage providers | Optional | SharePoint, Google Drive |
| MOD-110 | Calendar | Required | Calendar Providers | Mandatory | Google Calendar, Microsoft 365 |
| MOD-111 | Email | Required | Email Providers | Mandatory | Microsoft 365, Gmail, SendGrid |
| MOD-112 | Messaging | Required | Communication Providers; SMS Providers | Mandatory | Twilio, WhatsApp Business, Slack-class |
| MOD-113 | Social | Required | Social Media Providers | Mandatory | LinkedIn, X, Meta, Bluesky |
| MOD-114 | Support Desk | Optional | Communication Providers; Email Providers; SMS Providers | Optional | Twilio, SendGrid, Intercom-class |
| MOD-120 | Training Dashboard | None | — | — | — |
| MOD-121 | Staff Training | Optional | Identity Providers; Learning providers (future) | Optional | Entra ID, LMS vendors |
| MOD-122 | QMS Training | None | — | — | — |
| MOD-130 | Quality Management System | None | — | — | — |
| MOD-140 | Engineering Dashboard | None | — | — | — |
| MOD-141 | Engineer / Resource Breakdown | None | — | — | — |
| MOD-150 | Website Management | Required | Website Providers | Mandatory | Vercel, DNS/registrar, CMS hosts |
| MOD-151 | Testing | Optional | Telemetry Providers | Optional | Flight/sim telemetry feeds |
| MOD-152 | Telemetry | Required | Telemetry Providers | Mandatory | Drone / OSD / fleet telemetry vendors |
| MOD-153 | Users | Optional | Identity Providers | Optional | Microsoft Entra ID, Google Workspace, Okta |
| MOD-160 | External Client Dashboard | Optional | Identity Providers | Optional | Entra ID, Auth0-class (customer portal SSO) |
| MOD-161 | External Users | Optional | Identity Providers | Optional | Entra ID, Auth0-class |
| MOD-170 | Profile | None | — | — | — |
| MOD-171 | General | Optional | Identity Providers; Calendar Providers; Email Providers (workspace defaults) | Optional | Entra ID, Microsoft 365 |
| MOD-172 | Platform Billing | Required | Payment Providers; Accounting Providers; Banking Providers | Mandatory | Stripe, Wise, Xero |

---

## Summary counts

| Integration Required | Count |
| --- | --- |
| None | 23 |
| Optional | 22 |
| Required | 15 |
| **Total modules** | **60** |

| Mandatory / Optional (where integration applies) | Count |
| --- | --- |
| Mandatory | 13 |
| Optional | 24 |

---

## Priority integration categories (platform view)

| Priority | Provider type | Primary consuming modules |
| --- | --- | --- |
| P1 | Shipping Providers | MOD-092 |
| P1 | Email Providers | MOD-111, MOD-114, MOD-020 |
| P1 | Payment / Banking / Accounting Providers | MOD-060–066, MOD-065, MOD-172 |
| P2 | Calendar Providers | MOD-110, MOD-021, MOD-072 |
| P2 | Communication / SMS Providers | MOD-112, MOD-114 |
| P2 | Identity Providers | MOD-071, MOD-153, MOD-160–161 |
| P3 | Social Media Providers | MOD-113 |
| P3 | Website Providers | MOD-150 |
| P3 | Telemetry Providers | MOD-152, MOD-151 |
| P3 | AI Providers | MOD-002 |

---

## Notes

1. **MOD-065 Bank** is the financials bank surface (nav may still say Wise); providers are Banking Providers under PRM-003 — not a hard-coded single bank.  
2. **MOD-092** is the first approved FDR that **requires** Shipping Providers under PRM-003.  
3. **MOD-071** remains people master; Identity Providers are optional and must not duplicate Employees.  
4. Modules marked **None** may still *display* data produced via other modules’ integrations (e.g. Home showing delayed shipments) without owning a connection.  
5. This matrix is an architecture planning artefact — **not** an implementation backlog commitment.

---

**End of Integration Dependency Matrix.**  
**No implementation authorised by this document.**
