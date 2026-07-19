# MOD-092 Logistics — Implementation Readiness Report

| Field | Value |
| --- | --- |
| **Status** | **APPROVED** |
| **Module** | MOD-092 Logistics |
| **FDR** | [FDR-MOD-092-LOGISTICS.md](./FDR-MOD-092-LOGISTICS.md) (**APPROVED** · Architecture **COMPLETE** · **FROZEN**) |
| **Companion** | [MOD-092-PRE-IMPLEMENTATION-REVIEWS.md](./MOD-092-PRE-IMPLEMENTATION-REVIEWS.md) (**APPROVED** — authoritative) |
| **PRM-003** | [PRM-003-PLATFORM-INTEGRATIONS.md](./PRM-003-PLATFORM-INTEGRATIONS.md) (**APPROVED**) |
| **Go-Live** | **READY** |
| **Architecture sign-off** | 2026-07-19 |
| **Implementation** | **Not authorised by readiness or sign-off alone** |
| **Date** | 2026-07-19 |

---

## Governing assessment

This review verifies whether development can begin **without major architectural decisions remaining**.

**Canonical inputs (must be read together):**

1. FDR-MOD-092 (binding §§A–G, §M, **Implementation Guardrails**, phases, acceptance)  
2. Pre-implementation reviews §4 (Shipment data model — **APPROVED**)  
3. PRM-003 (Integration Framework)  
4. [Implementation Readiness](./MOD-092-IMPLEMENTATION-READINESS.md)  

### Implementation Guardrails (mandatory — FDR)

Any Phase 1 build **must** obey FDR **Implementation Guardrails**: Manual-first · workspace-agnostic registry · PRM-003 only · Shipment-first · provider optional · canonical lifecycle · no duplicate masters · permanent `SHP-######` · Phase 1 scope only · shared design system.

The FDR object table (§3) still lists a **short** object set; the **full** Phase 1 entity set is defined in the approved companion data model. That is a **documentation consolidation** gap, not an open product architecture question — provided implementers treat companion §4 as binding (recommended below).

---

# 1. Data Model Readiness

## 1.1 Required business objects

| Object | Defined where | Phase 1 | Ready? |
| --- | --- | --- | --- |
| **Shipment** | FDR §B + companion §4.10 | Yes | **Yes** |
| **ShipmentLine** | FDR §B + companion §4.3 | Yes | **Yes** |
| **ShipmentPackage** | Companion §4.4 | Yes | **Yes** |
| **ShipmentDocument** | Companion §4.7 | Yes | **Yes** |
| **ShipmentBusinessRef** | Companion §4.5 | Yes | **Yes** |
| **ShipmentTrackingNumber** | Companion §4.6 | Yes | **Yes** |
| **ShipmentParty** | Companion §4.1 | Yes | **Yes** |
| **ShipmentAddressRef** | Companion §4.2 | Yes | **Yes** |
| **CustodyEvent** | FDR §C | Yes | **Yes** |
| **ProofOfDelivery** | FDR §D | Yes | **Yes** |
| **ShippingProvider** (registry) | FDR registry + PRM-003 | Yes | **Yes** |
| **WorkspaceShippingConnection** | FDR §G/§M + PRM-003 | Yes | **Yes** |
| **Manual Provider** | FDR §M | Yes (system) | **Yes** |
| **Logistics onboarding state** | FDR §M | Yes | **Yes** |
| **Consignment** | Companion §4.6 / FDR §F | **No** (future) | N/A |

## 1.2 Missing entities?

| Candidate | Verdict |
| --- | --- |
| CollectionRequest | **Not required** Phase 1 — Shipment type Collection |
| TrackingSnapshot | **Not required** — derive from CustodyEvent + tracking numbers |
| ExceptionRecord | **Not required** — alternative §A statuses + custody |
| Platform Address master | **Not required** Phase 1 — polymorphic `ShipmentAddressRef` |
| Consignment | **Deferred** — architecture reserved; no Phase 1 entity |

**No missing Phase 1 entities** when FDR + approved companion §4 are combined.

**Hygiene:** Fold companion §4 into FDR as binding **§L** in a future doc-only amendment so the FDR object list matches reality (non-blocking).

---

# 2. API Readiness

Do **not** implement. Catalogue of endpoints required for Phase 1 (REST shape illustrative; exact paths may follow existing `/api/...` conventions).

## 2.1 Shipments

| Endpoint (logical) | Method | Purpose |
| --- | --- | --- |
| List Shipments | GET | Register + search/filters |
| Get Shipment | GET | Detail |
| Create Shipment | POST | Draft create → allocate `SHP-######` |
| Update Shipment | PATCH | Header, parties, addresses, packages, refs |
| Transition Status | POST | Enforce §A (+ recommended transition rules) |
| Cancel Shipment | POST | → Cancelled |
| Archive Shipment | POST | Soft-archive (searchable; no delete) — see §3.5 |
| Add / Update / Remove Line | POST/PATCH/DELETE | ShipmentLine |
| Add / Update / Remove Package | POST/PATCH/DELETE | ShipmentPackage |
| Add Business Ref | POST | ShipmentBusinessRef |
| Remove Business Ref | DELETE | |
| Add Tracking Number | POST | ShipmentTrackingNumber |
| Set Primary Tracking | PATCH | |
| List Custody Events | GET | Timeline |
| Add Custody Event | POST | Manual tracking / status notes |
| Get / Upsert POD | GET/PUT | Proof of Delivery |
| Upload POD artefact | POST | File → POD / document |
| List / Upload / Delete Documents | GET/POST/DELETE | ShipmentDocument |
| Search Shipments | GET | Canonical search fields (companion §4.8) |

## 2.2 Providers / Integration (PRM-003 + §M)

| Endpoint (logical) | Method | Purpose |
| --- | --- | --- |
| Get Onboarding State | GET | First-open flags |
| Complete Onboarding | POST | Manual path or post-connect |
| List Providers (Marketplace) | GET | Registry-backed cards; never hard-coded |
| Get Provider Detail | GET | Detail panel |
| List Workspace Connections | GET | Provider Management |
| Create Provider Connection | POST | Wizard finish |
| Update Provider Connection | PATCH | Credentials, enable/disable, default |
| Test Provider Connection | POST | Health test + diagnostics |
| Discover Capabilities | POST/GET | Capability discovery persist |
| Reconnect Provider | POST | |
| Disconnect / Remove Provider | POST/DELETE | External only; Manual forbidden |
| Set Default Provider | POST | Incl. Manual |
| Get Connection Health | GET | Health panel |

## 2.3 Reference pickers (soft dependency)

| Endpoint | Purpose |
| --- | --- |
| Resolve Client / Project / Asset / Inventory / Employee / Office | Address & party pickers — existing module APIs preferred |

## 2.4 API readiness verdict

| Item | Status |
| --- | --- |
| Endpoint inventory | **Defined by this report** (was not listed in FDR body) |
| Open architecture decisions | **None** for Phase 1 Manual path |
| Live carrier create/label/track APIs | Phase 3 — not required to start |

**Ready** to design/OpenAPI against this catalogue; no major API architecture questions remain for Phase 1.

---

# 3. Database Readiness

## 3.1 Required tables (Phase 1)

| Table | Notes |
| --- | --- |
| `shipping_providers` | Registry (may be platform Integration Framework shared) |
| `workspace_shipping_connections` | Incl. Manual system connection row |
| `workspace_logistics_settings` | Onboarding completed, default connection id |
| `logistics_shipments` | Root; `shipment_number`, type, status, mode, FKs |
| `logistics_shipment_parties` | |
| `logistics_shipment_address_refs` | |
| `logistics_shipment_lines` | |
| `logistics_shipment_packages` | |
| `logistics_shipment_business_refs` | |
| `logistics_shipment_tracking_numbers` | |
| `logistics_shipment_documents` | Metadata + file id |
| `logistics_custody_events` | Append-only |
| `logistics_proof_of_delivery` | |
| Sequence / counter | Workspace-scoped `SHP` allocator |

*(Exact naming may follow Integration Framework shared schema for provider tables — Phase 0.)*

## 3.2 Relationships

```
workspace
  ├─ workspace_logistics_settings
  ├─ workspace_shipping_connections → shipping_providers
  └─ logistics_shipments
        ├─ parties / address_refs / lines / packages
        ├─ business_refs / tracking_numbers / documents
        ├─ custody_events (append-only)
        └─ proof_of_delivery (0..1)
```

All shipment children: `shipment_id` FK, `ON DELETE` **restrict** (no hard delete of shipments).

## 3.3 Indexes (minimum)

| Index | Purpose |
| --- | --- |
| Unique `(workspace_id, shipment_number)` | Permanent numbering |
| `(workspace_id, status)`, `(workspace_id, type)` | Register filters |
| `(workspace_id, created_at)` | Date range |
| Tracking number unique/lookup per workspace | Search |
| `business_refs (ref_type, ref_id)` | Cross-module search |
| `connections (workspace_id, provider_id)` | Management |

## 3.4 Foreign keys

| FK | Target |
| --- | --- |
| `workspace_id` | Workspace (PRM-002) |
| `workspace_shipping_connection_id` | Connection (nullable for edge cases; Manual uses Manual connection id) |
| `parent_shipment_id` | Self (returns) |
| `reference_id` on lines | Soft / polymorphic — **no hard FK** to Asset/Inventory required Phase 1 |
| Party/address master ids | Soft / polymorphic — nullable |

## 3.5 Permanent numbering

| Rule | Value |
| --- | --- |
| Format | `SHP-000001` |
| Scope | Per workspace |
| Reuse | **Never** |

**Ready.**

## 3.6 Archive strategy

| Topic | Recommendation (binding for readiness) |
| --- | --- |
| Hard delete | **Forbidden** (align Employees) |
| Cancel | Status = Cancelled; retained |
| Archive | Soft flag or status **Archived** — remains searchable; excluded from default active register |
| Custody / documents | Retained with shipment |

**Unresolved in FDR body:** Archive vs Cancelled naming was not explicitly written into FDR. **Decision for readiness:** adopt soft-archive as above — **not a redesign risk**.

## 3.7 Unresolved schema decisions

| Decision | Severity | Resolution |
| --- | --- | --- |
| Shared Integration Framework tables vs logistics-prefixed provider tables | Medium | Phase 0 — prefer **shared PRM-003** tables |
| Polymorphic refs without DB FK | Low | Application-level integrity Phase 1 |
| Provider capability storage shape | Low | Follow PRM-003 connection capability JSON/columns |
| Archive column vs status enum | Low | Prefer `archived_at` + keep §A status |

None require product redesign if Phase 0 chooses shared Integration Framework tables.

**Database readiness: Ready** with Phase 0 naming alignment.

---

# 4. UI Readiness

## 4.1 Required screens / surfaces

| Screen | Source | Phase 1 |
| --- | --- | --- |
| First-open Onboarding | FDR §M | **Required** |
| Logistics Dashboard (optional KPIs) | Pre-impl UX | Recommended; may be thin strip on Register |
| Shipment Register | Pre-impl + FDR | **Required** |
| Shipment Detail | Pre-impl + FDR | **Required** |
| Shipment Create/Edit Wizard | FDR §M + companion creation | **Required** |
| Provider Marketplace | FDR §M | **Required** |
| Provider Detail | FDR §M | **Required** |
| Provider Connection Wizard (8 steps) | FDR §M | **Required** |
| Provider Management | FDR §M | **Required** |
| Connection Health panel | FDR §M | **Required** |
| Shipment Tracking / Custody Timeline | FDR §C | **Required** |
| POD capture / view | FDR §D | **Required** |
| Document list / upload | Companion §4.7 | **Required** |
| Exceptions filter preset | Pre-impl UX | Recommended (filter, not separate app) |
| Live map | Current mock | **Not required** Phase 1 |

## 4.2 Missing screens?

| Gap | Verdict |
| --- | --- |
| Separate Collections / Returns apps | **Not required** — types + filters on Register/Detail |
| Rate shop UI | §F — out of Phase 1 |
| Consignment UI | Future |

**Nothing material missing** for Phase 1 Manual + connect paths.

**UI readiness: Ready.**

---

# 5. Integration Readiness (PRM-003)

| Requirement | FDR / PRM | Ready? |
| --- | --- | --- |
| Provider Registry | FDR + PRM-003 | **Yes** |
| Capability Discovery | FDR §M Step 7 + PRM-003 | **Yes** |
| Health Checks | FDR Connection Health + PRM-003 | **Yes** |
| Manual Provider | FDR §M first-class | **Yes** |
| Multiple Providers | FDR §M | **Yes** |
| Credential vault (not module tables) | PRM-003 + FDR | **Yes** (Phase 0 vault) |
| Connection Wizard pattern | FDR §M aligns PRM-003 | **Yes** |
| No hard-coded provider SoT | FDR §M normative | **Yes** |
| Manual always available | FDR acceptance | **Yes** |

**Integration readiness: Ready.** Live adapter implementations are Phase 3; Manual path unblocks Phase 1.

---

# 6. Security Review

| Area | Requirement | Status |
| --- | --- | --- |
| **Role-based permissions** | Logistics view / create / transition / admin providers / manage credentials | **Principles clear; role matrix not enumerated in FDR** |
| **Credential storage** | Integration Framework vault only; never shipment tables | **Specified** (PRM-003 / FDR) |
| **Audit logging** | Custody append-only; connection config changes; onboarding | **Custody yes; admin audit trail should follow platform standard** |
| **File permissions** | Workspace-scoped shipment documents / POD; least privilege | **Pattern specified; ACL detail = platform files pattern** |
| **API secrets** | Server-side only; no client exposure of provider secrets | **Specified** |
| **Employee home address** | Privacy when used as address kind | **Called out in companion** — enforce permission gate |

### Recommended Phase 1 permission capabilities (for implementers)

| Capability | Typical roles |
| --- | --- |
| `logistics.read` | All ops users as policy allows |
| `logistics.shipment.write` | Logistics operators |
| `logistics.shipment.transition` | Operators / leads |
| `logistics.providers.manage` | Workspace admins |
| `logistics.credentials.edit` | Workspace admins (sensitive) |
| `logistics.archive` | Leads / admins |

**Security readiness: Ready to implement** with the capability list above; full RBAC matrix can live in the Phase 1 implementation plan without redesigning Logistics.

---

# 7. Implementation Risks

| ID | Risk | Redesign risk? | Mitigation |
| --- | --- | --- | --- |
| R-01 | FDR §3 object list omits companion entities | **No** (docs) | Treat companion §4 as binding; optional FDR §L fold-in |
| R-02 | Status transition matrix not in FDR body | **Low** | Derive allow-list from §A + Completed/POD policy in companion; document in Phase 1 plan |
| R-03 | Integration Framework shared schema not built yet | **Medium** | Phase 0: create PRM-003 tables first or temporary Logistics-owned connection tables with migration path |
| R-04 | Soft polymorphic FKs to Assets/Clients | **Low** | Nullable refs; validate in service layer |
| R-05 | Live carrier APIs vary wildly | **No** for Phase 1 | Manual path; adapters Phase 3 behind capabilities |
| R-06 | Current UI mock hard-codes carriers | **No** | Replace per FDR conflicts L-01/L-10 |
| R-07 | Archive semantics lightly specified | **Low** | Soft `archived_at` per §3.6 this report |
| R-08 | RBAC not named in FDR | **Low** | Use capability list §6 |

**No risk identified that forces redesign of Shipment, Manual provider, Marketplace, or PRM-003 alignment** if Phase 1 follows Manual-first + registry-driven connections.

---

# Deliverables summary

## 1. Implementation Readiness Report

This document.

## 2. Outstanding Risks

| Priority | Items |
| --- | --- |
| Address before/during Phase 0 | R-03 Integration Framework table ownership |
| Address in Phase 1 plan (non-blocking) | R-01 doc fold-in, R-02 transition allow-list, R-07 archive column, R-08 RBAC capabilities |
| Non-blocking | R-04, R-05, R-06 |

**No outstanding architectural blockers.**

## 3. Final recommendation

# Ready for Implementation

**Verdict: Ready for Implementation**

Architecture is complete enough to begin development **without major architectural decisions remaining**, provided:

1. Implementers treat **FDR-MOD-092 + approved Pre-Implementation Reviews §4 + PRM-003** as the combined canonical set.  
2. Phase 1 delivers **Manual-first** Logistics (onboarding, shipments, custody, POD, marketplace connect) before live carrier adapters (Phase 3).  
3. Phase 0 resolves Integration Framework / vault table placement (R-03) without changing the Logistics domain model.

This report does **not** authorise implementation. Architecture Sign-Off (2026-07-19) confirms **Ready for Implementation**; an **explicit implement request** is still required. No UI or navigation changes are authorised by readiness or sign-off alone.

---

**End of Implementation Readiness Report.**  
**No implementation performed.**
