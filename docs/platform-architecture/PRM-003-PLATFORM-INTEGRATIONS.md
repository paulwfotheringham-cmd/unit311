# Platform Reference Model 003 – Platform Integrations

| Field | Value |
| --- | --- |
| **ID** | PRM-003 |
| **Title** | Platform Reference Model 003 – Platform Integrations |
| **Status** | **APPROVED** |
| **Approved** | 2026-07-19 |
| **Depends on** | [PRM-002 – Workspace](./PRM-002-WORKSPACE.md) (**LOCKED**) · [PRM-001 – Client](./PRM-001-CLIENT.md) (**LOCKED**) |
| **Canonical business object** | Integration Provider · Workspace Integration Connection |
| **Owning capability** | Platform Integration Framework |
| **Canonical store (current)** | None (to be designed at implementation) |
| **Referenced by** | All future module FDRs that connect to third parties (e.g. [FDR-MOD-092 Logistics](./FDR-MOD-092-LOGISTICS.md) §G) |
| **Date** | 2026-07-19 |

---

## Governing statement

**PRM-003 defines the standard architecture for all third-party integrations used anywhere in Unit311 Central.**

This PRM is the **canonical integration specification**. Every future module FDR that connects to an external service **must conform** to PRM-003 and cite it explicitly.

The architecture is **completely workspace-agnostic**:

- Every workspace may enable **different** providers.  
- Every provider follows the **same lifecycle**.  
- **No module** invents its own connection process, credential store, or health model.

This PRM is **APPROVED**. It becomes platform policy for integration design. Prefer **LOCK** after a short settlement period with no material amendments. Do not implement the Integration Framework until an explicit implementation phase is authorised. Conflicts with this document must be called out in FDRs.

---

## 1. Objectives

Create a reusable **Integration Framework** usable by (non-exhaustive):

| Category | Examples |
| --- | --- |
| Shipping Providers | Couriers / parcel carriers |
| Payment Providers | Cards, wallets, payment gateways |
| Accounting Providers | Ledgers, bookkeeping suites |
| Banking Providers | Banks, treasury / open banking |
| Identity Providers | SSO, IdP, MFA vendors |
| Communication Providers | Messaging platforms |
| SMS Providers | SMS gateways |
| Email Providers | SMTP / IMAP / ESP APIs |
| Calendar Providers | External calendars |
| AI Providers | Model / agent APIs |
| Website Providers | CMS, DNS, hosting control planes |
| Social Media Providers | Social network APIs |
| Telemetry Providers | Device / fleet telemetry ingress |
| Future integrations | Any external service |

**Rule:** Modules own **business logic**. The Integration Framework owns **provider connectivity**.

---

## 2. Integration model

```
Provider
  → Workspace Connection
    → Authentication
      → Capability Discovery
        → Health Check
          → Operational Usage
```

| Stage | Meaning |
| --- | --- |
| **Provider** | Platform-level definition in the Provider Registry (what exists and what it can do) |
| **Workspace Connection** | A workspace’s enabled instance of a provider (credentials, defaults, status) |
| **Authentication** | How this connection proves identity to the provider |
| **Capability Discovery** | What this connection can currently perform |
| **Health Check** | Ongoing / on-demand connectivity and error state |
| **Operational Usage** | Module business operations calling the framework (send email, create shipment, …) |

---

## 3. Definition

### What a Provider is

A **Provider** is a first-class platform catalogue entry describing an external service that Unit311 Central may connect to. Providers are **not** workspace-specific. They declare supported countries/regions (when relevant), authentication methods, and capability types.

### What a Workspace Connection is

A **Workspace Connection** is the workspace-scoped binding of a Provider to a tenant (PRM-002). It holds enablement, credentials, defaults, health, sync timestamps, and notes. Connections never redefine customer identity (PRM-001) or replace Workspace runtime (PRM-002).

### Distinctions

| Term | System of record | Is a Provider? |
| --- | --- | --- |
| Provider | Integration Framework registry | **Yes** |
| Workspace Connection | Integration Framework (per workspace) | **No** — instance of a Provider |
| Module business object (Shipment, Payment, Message, …) | Owning module | **No** — consumes connection |
| Manual fallback | Framework + module UX | Not a separate provider type required, but every category must support manual operation |

---

## 4. Workspace-agnostic rules

1. The framework **must not** assume which providers a workspace uses.  
2. Workspaces may enable **zero, one, or many** providers per category.  
3. A workspace may designate a **Default Provider** within a category (policy details per category FDR).  
4. Provider lists and connection UIs are **data-driven** from the registry — not hard-coded per module.  
5. Adding a provider must not require redesigning consuming modules — only registry + adapter registration.

---

## 5. Connection configuration (required fields)

Each Workspace Connection supports at least:

| Field | Purpose |
| --- | --- |
| Enabled / Disabled | Soft switch without deleting the connection |
| Default Provider | Category default for the workspace (when applicable) |
| Authentication Method | Selected method for this connection |
| Connection Wizard | Guided setup (mandatory pattern) |
| Test Connection | Explicit validation action |
| Connection Status | e.g. Not Connected · Connected · Manual · Error |
| Health Status | Healthy · Degraded · Failed · Unknown |
| Last Successful Sync | Timestamp of last successful operational/sync call |
| Last Error | Last failure message / code (non-secret) |
| Supported Capabilities | Discovered / declared capability set |
| Notes | Operator notes |

---

## 6. Authentication

Support **multiple** authentication methods. The framework must **not** assume a single model.

Examples:

- OAuth  
- API Key  
- Username / Password  
- Token  
- Certificate  
- Manual  
- Future methods  

Provider registry entries declare which methods they support. The Connection Wizard requests **only** credentials required for the selected method.

---

## 7. Connection Wizard (standard pattern)

Every provider uses the **same wizard pattern**:

```
Select Provider
  → Authentication Method
    → Credentials
      → Validate Connection
        → Discover Capabilities
          → Save Configuration
```

Category-specific wizards (e.g. Shipping: Country → Recommended Providers) may **precede** “Select Provider” as optional prefix steps, but must still terminate in this standard sequence. They must not invent a parallel credential lifecycle.

---

## 8. Capability Discovery

Each provider advertises **capabilities**. The platform **adapts** UI and API usage to what the connection supports.

### Examples

| Category | Example capabilities |
| --- | --- |
| Shipping | Create Shipment · Labels · Tracking · POD |
| Payments | Charges · Refunds · Invoices · Bank Transfers |
| Email | Send · Receive · Templates |
| Calendar | Events · Availability |
| SMS | Send · Delivery receipts |
| Accounting | Push journals · Pull balances |
| Identity | SSO login · User provisioning |
| AI | Chat · Embeddings · Tool calling |

Capabilities are declared at Provider level and confirmed/narrowed at Connection level after discovery or manual configuration.

Modules must **feature-detect** (capability flags), not assume every connection supports every operation.

---

## 9. Manual Mode

**Every integration category must have a manual fallback.**

The platform must continue working when:

- no API exists  
- authentication fails  
- provider is unavailable  
- workspace chooses not to connect a provider  

Manual mode is a first-class connection posture (or equivalent module path) — not an afterthought. Operational records (shipments, payments recorded offline, messages logged, etc.) remain valid.

---

## 10. Credential storage

**Credentials must never be stored in module-specific tables.**

Recommend a **central Integration configuration model** owned by the Integration Framework:

- Encrypted secrets at rest  
- Access only via framework services  
- Modules receive **connection ids** and invoke framework operations — they do not read raw secrets  
- Rotation / revoke supported without rewriting module schemas  

---

## 11. Audit

Every connection records at least:

| Event | Purpose |
| --- | --- |
| Created | When the connection was established |
| Updated | Configuration / credential changes |
| Last Tested | Last explicit Test Connection |
| Last Successful | Last successful health or operational sync |
| Last Failure | Last failed test or operational call (sanitised) |

Audit entries must not store secret material.

---

## 12. Module ownership

| Owner | Owns |
| --- | --- |
| **Integration Framework** | Providers, Workspace Connections, authentication, capability discovery, health, credential vault, wizards, adapters |
| **Consuming module** | Business objects and workflows |

### Examples

| Module owns | Framework / Provider owns |
| --- | --- |
| Logistics → Shipments | Shipping Providers → API connectivity |
| Financials → Payments | Payment / Bank Providers → payment & banking APIs |
| Communications → Messages | Communication / SMS Providers → transport |
| Email workspace → mailbox UX / threads | Email Providers → send/receive transport |
| Calendar → internal events | Calendar Providers → external sync |
| Identity / login UX | Identity Providers → SSO/federation |

**No module duplicates another module’s business object** by storing a parallel “integration copy” of shipments, payments, or messages.

---

## 13. Lifecycle (every provider)

Providers and connections share one conceptual lifecycle:

1. **Registered** in Provider Registry  
2. **Selected** by workspace (wizard)  
3. **Authenticated**  
4. **Validated** (test connection)  
5. **Capabilities discovered**  
6. **Enabled** for operational use  
7. **Monitored** (health / last sync / last error)  
8. **Disabled** or **revoked** without deleting historical module business records  

Disabling a connection must not delete historical Shipments, Payments, Messages, etc.

---

## 14. Conflicts with current platform (explicit)

| ID | Current state | PRM-003 target |
| --- | --- | --- |
| I-01 | Module-local credential previews (e.g. Logistics/Settings courier keys) | Central Integration configuration |
| I-02 | Hard-coded courier lists in Logistics | Provider Registry + Shipping category |
| I-03 | One-off OAuth/API patterns per feature | Shared Authentication + Wizard |
| I-04 | No standard health / last-error model | Required connection fields (§5, §11) |
| I-05 | Uneven manual fallbacks | Mandatory Manual Mode (§9) |

FDRs must cite these conflicts until remediated.

---

## 15. Relationship to other PRMs and FDRs

| Artifact | Relationship |
| --- | --- |
| PRM-001 Client | Integrations must not redefine customer identity |
| PRM-002 Workspace | Connections are always workspace-scoped |
| FDR-MOD-092 Logistics | Shipping Providers are the first category instance; §G Integration Framework is aligned with this PRM |
| Future FDRs | Must cite PRM-003 for any third-party connectivity |

---

## 16. Non-goals (this PRM)

- Specifying individual provider API contracts (belong in adapters / category annexes)  
- Replacing module business schemas (Shipments, Payments, etc.)  
- Mandating that every workspace connect any particular vendor  
- Implementing the framework (separate implementation programme after LOCK)

---

## 17. Approval path

| Status | Meaning |
| --- | --- |
| **DRAFT** | Under review |
| **APPROVED** | **Current** — accepted as platform policy; amendable with change control |
| **LOCKED** | Immutable reference for subsequent FDRs (same bar as PRM-001 / PRM-002) |

**Next step:** settle amendments if any → **LOCKED**.  
**Do not implement** the Integration Framework until an explicit implementation phase is authorised.

---

## 18. Decision log

| Decision | Outcome |
| --- | --- |
| PRM status | **APPROVED** 2026-07-19 |
| Scope | All third-party integrations platform-wide |
| Tenancy | Workspace-agnostic providers; workspace-scoped connections |
| Credential storage | Central Integration model — never module tables |
| Manual mode | Mandatory for every category |
| Wizard | Standard pattern required |
| Module vs framework ownership | Modules = business logic; Framework = connectivity |

---

**End of PRM-003 – Platform Integrations.**  
**Status: APPROVED. No implementation authorised by this document alone.**
