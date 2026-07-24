/**
 * Permission checks for Action Framework steps.
 */

import type { AssistantBusinessContext } from "../types";
import type { AssistantActionPermission } from "./types";

export function userHasActionPermissions(
  business: AssistantBusinessContext,
  required: AssistantActionPermission[],
): boolean {
  if (!required.length) return true;
  return required.every((permission) => {
    switch (permission) {
      case "authenticated":
        return Boolean(business.user.id);
      case "canAccessFinancials":
        return business.permissions.canAccessFinancials;
      case "canAccessHr":
        return business.permissions.canAccessHr;
      case "canAccessUsers":
        return business.permissions.canAccessUsers;
      case "canAccessStrategy":
        return business.permissions.canAccessStrategy;
      default:
        return false;
    }
  });
}

export function describeMissingPermissions(
  business: AssistantBusinessContext,
  required: AssistantActionPermission[],
): string[] {
  return required
    .filter((permission) => !userHasActionPermissions(business, [permission]))
    .map((permission) => {
      switch (permission) {
        case "canAccessFinancials":
          return "Financials access required";
        case "canAccessHr":
          return "HR access required";
        case "canAccessUsers":
          return "User management access required";
        case "canAccessStrategy":
          return "Strategy access required";
        case "authenticated":
          return "Authentication required";
        default:
          return `Missing permission: ${permission}`;
      }
    });
}
