# Internal Navigation — Before / After

Navigation refactor only (2026-07-19). Existing routes preserved.

## Section map

| Before | After |
| --- | --- |
| (unlabeled) Home + Executive Assistant | **HOME** → Home Dashboard · **EXECUTIVE** → Executive Assistant |
| Business Central | Business Central (restructured) |
| Inventory Management → Assets | **Assets** → Assets · Inventory Management · Logistics |
| Business Productivity (+ Logistics, Support nest, Unit311 Details in Files) | Business Productivity (no Logistics; Support Desk flat; Files without Unit311 Details) |
| Training / QMS | Unchanged structure; QMS label → Quality Management System |
| **Strategy** (Board, Strategy, Competitors, Whiteboard) | **Strategy** → Strategy · Competitors · Whiteboard · Board deck |
| Engineering (single) | Engineering → Dashboard · Engineer / Resource Breakdown |
| Tools / External Client Access / Settings | Settings Billing → **Platform Billing** |

## Key leaf changes

| Change | Before | After |
| --- | --- | --- |
| Client Onboarding | Clients child | **CRM** child (route `/client-onboarding` unchanged) |
| Discovery & Demo Sessions | “Executive Strategy Session Meetings” | Renamed |
| Unit311 Details | File Explorer | **Corporate Information** (last) |
| Logistics | Business Productivity | **Assets** |
| Projects | Single item | Dashboard · Internal · External → **same Projects module** + “Uses current implementation” |
| Inventory Management | — | Dedicated operational EAM workspace (MOD-500 / MOD-091) — no longer shares Assets UI |
| Engineering split | Single item | Dashboard / Resource Breakdown → **Engineering module** + notice |
| Insurance | Corporate child | Removed from nav (`?view=corporate-insurance` still works) |
| WhatsApp Testing | Under Support | Removed from nav (`/whatsapp/support-flow` still works) |
| Professional Advisors | “Advisers” | Spelling updated |
| Support Desk | Nested Support → Support desk | Flat **Support Desk** |
| HR order | … Recruitment, Leave, Performance | Dashboard, Employees, Leave, Performance, Recruitment |

## Placeholder notices

| Kind | Where |
| --- | --- |
| **Uses current implementation** | Projects Dashboard / Internal / External · Engineering Dashboard / Resource Breakdown |
| **Coming Soon** | Existing empty modules (HR Leave/Performance/Recruitment, Corporate placeholders, Training Dashboard, External Client Access Dashboard, etc.) |

## Intentionally still reachable outside sidebar

`?view=board-pack`, `strategy`, `competitors`, `whiteboard`, `corporate-insurance`, `projects`, `engineering`, `/whatsapp/support-flow`, and other prior deep links remain functional.
