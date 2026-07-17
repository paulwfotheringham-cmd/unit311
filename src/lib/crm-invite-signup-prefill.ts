import type { CrmSignupInviteLead } from "@/lib/crm-signup-invite";

export type CrmInviteSignupPrefill = {
  firstName: string;
  surname: string;
  organisation: string;
  role: string;
  email: string;
  phone: string;
};

export function buildCrmInviteSignupPrefill(lead: CrmSignupInviteLead): CrmInviteSignupPrefill {
  const firstName = lead.firstName.trim();
  const surname = lead.surname.trim();
  if (firstName || surname) {
    return {
      firstName,
      surname,
      organisation: lead.companyName.trim(),
      role: lead.role.trim(),
      email: lead.email.trim(),
      phone: lead.phone?.trim() || "",
    };
  }

  const parts = lead.contactName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    surname: parts.slice(1).join(" "),
    organisation: lead.companyName.trim(),
    role: lead.role.trim(),
    email: lead.email.trim(),
    phone: lead.phone?.trim() || "",
  };
}
