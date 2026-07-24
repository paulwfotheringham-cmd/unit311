import { resolveExecutiveAssistantContext } from "@/lib/executive-assistant-ui";
import { getOrganisationForUser } from "@/lib/organisation-service";
import type { PlatformSession } from "@/lib/platform-auth";
import { STAFF_HIDDEN_VIEWS, type InternalRoleView } from "@/lib/internal-role-views";
import type { InternalOperationsView } from "@/lib/internal-operations-data";
import { isInternalOperationsView } from "@/lib/internal-operations-data";

import type { AssistantBusinessContext, AssistantPageSelection } from "./types";

function asRoleView(value: string | null | undefined): InternalRoleView {
  if (value === "admin" || value === "c-suite" || value === "manager" || value === "staff") {
    return value;
  }
  return "c-suite";
}

function permissionFlags(roleView: InternalRoleView) {
  const hidden = roleView === "staff" ? STAFF_HIDDEN_VIEWS : null;
  return {
    roleView,
    canAccessFinancials: !hidden?.has("financials"),
    canAccessUsers: !hidden?.has("users"),
    canAccessStrategy: !hidden?.has("strategy"),
    canAccessHr: !hidden?.has("hr"),
  };
}

export type BuildBusinessContextInput = {
  session: PlatformSession;
  activeView?: string | null;
  pathname?: string | null;
  selection?: AssistantPageSelection;
  roleView?: string | null;
  workspaceId?: string | null;
  workspaceName?: string | null;
  workspaceSlug?: string | null;
};

/**
 * Assembles authoritative runtime context for every assistant turn.
 * Context Service owns this — do not duplicate in route handlers.
 */
export async function buildBusinessContext(
  input: BuildBusinessContextInput,
): Promise<AssistantBusinessContext> {
  const activeView = input.activeView?.trim() || "home";
  const pageMeta = resolveExecutiveAssistantContext(activeView, "internal");
  const roleView = asRoleView(input.roleView);

  let organisationId: string | null = null;
  let organisationName: string | null = null;

  try {
    const org = await getOrganisationForUser(input.session.sub);
    if (org) {
      organisationId = org.id;
      organisationName = org.name;
    }
  } catch {
    // Organisation lookup is optional until onboarding tables are live.
  }

  return {
    user: {
      id: input.session.sub,
      username: input.session.username,
      displayName: input.session.displayName,
      userType: input.session.userType,
    },
    organisation: {
      id: organisationId,
      name: organisationName,
    },
    workspace: {
      id: input.workspaceId ?? organisationId ?? input.session.workspaceId ?? null,
      name:
        input.workspaceName ??
        organisationName ??
        input.session.workspaceName ??
        "Unit311 Central",
      slug: input.workspaceSlug ?? input.session.workspaceSlug ?? null,
    },
    page: {
      activeView,
      label: pageMeta.label,
      pathname: input.pathname ?? null,
    },
    selection: {
      clientId: input.selection?.clientId ?? null,
      clientName: input.selection?.clientName ?? null,
      projectId: input.selection?.projectId ?? null,
      projectName: input.selection?.projectName ?? null,
      employeeId: input.selection?.employeeId ?? null,
      employeeName: input.selection?.employeeName ?? null,
      contractId: input.selection?.contractId ?? null,
      contractName: input.selection?.contractName ?? null,
      fileId: input.selection?.fileId ?? null,
      fileName: input.selection?.fileName ?? null,
    },
    permissions: permissionFlags(roleView),
    generatedAt: new Date().toISOString(),
  };
}

export function describeSelection(selection: AssistantPageSelection) {
  const parts: string[] = [];
  if (selection.clientName) parts.push(`Client: ${selection.clientName}`);
  if (selection.projectName) parts.push(`Project: ${selection.projectName}`);
  if (selection.employeeName) parts.push(`Employee: ${selection.employeeName}`);
  if (selection.contractName) parts.push(`Contract: ${selection.contractName}`);
  if (selection.fileName) parts.push(`File: ${selection.fileName}`);
  return parts.join(" · ");
}

export function isKnownInternalView(view: string): view is InternalOperationsView {
  return isInternalOperationsView(view);
}
