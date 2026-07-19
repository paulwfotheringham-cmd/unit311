export type UserRole = "Staff" | "Manager" | "Admin";

export type UserStatus = "Active" | "On Leave" | "Inactive";

export type UserRegion = "Barcelona" | "Porto" | "Oxford" | "Multi-site";

export type ManagedUser = {
  id: string;
  operatorLabel: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  region: UserRegion;
  licenseId: string;
  notes: string;
};

export const USER_ROLE_OPTIONS: UserRole[] = ["Staff", "Manager", "Admin"];

const LEGACY_ROLE_MAP: Record<string, UserRole> = {
  "Senior Drone Operator": "Manager",
  "Drone Operator": "Staff",
  "Mission Coordinator": "Admin",
  "Survey Lead": "Manager",
};

export function normalizeUserRole(role: string): UserRole {
  if (USER_ROLE_OPTIONS.includes(role as UserRole)) {
    return role as UserRole;
  }
  return LEGACY_ROLE_MAP[role] ?? "Staff";
}

export const USER_STATUS_OPTIONS: UserStatus[] = ["Active", "On Leave", "Inactive"];

export const USER_REGION_OPTIONS: UserRegion[] = ["Barcelona", "Porto", "Oxford", "Multi-site"];

/** Regional site owners — one operator per base location. */
export const REGION_OWNER_USER_IDS = {
  Barcelona: "user-paul",
  Oxford: "user-info",
  Porto: "user-admin",
} as const satisfies Record<"Barcelona" | "Porto" | "Oxford", string>;

export function getOwnerUserIdForRegion(region: string): string | null {
  if (region in REGION_OWNER_USER_IDS) {
    return REGION_OWNER_USER_IDS[region as keyof typeof REGION_OWNER_USER_IDS];
  }
  return null;
}

export function createInitialUsers(): ManagedUser[] {
  return [
    {
      id: "user-admin",
      operatorLabel: "Admin",
      fullName: "Admin",
      username: "admin@unit311central.com",
      email: "admin@unit311central.com",
      phone: "",
      role: "Admin",
      status: "Active",
      region: "Multi-site",
      licenseId: "",
      notes: "Primary admin account for Unit311 Central.",
    },
    {
      id: "user-info",
      operatorLabel: "Info",
      fullName: "Info",
      username: "info@unit311central.com",
      email: "info@unit311central.com",
      phone: "",
      role: "Admin",
      status: "Active",
      region: "Multi-site",
      licenseId: "",
      notes: "Shared operations inbox for Unit311 Central.",
    },
    {
      id: "user-paul",
      operatorLabel: "Paul",
      fullName: "Paul",
      username: "paul@unit311central.com",
      email: "paul@unit311central.com",
      phone: "",
      role: "Admin",
      status: "Active",
      region: "Multi-site",
      licenseId: "",
      notes: "Executive account for Unit311 Central.",
    },
  ];
}

export function userStatusClass(status: UserStatus) {
  switch (status) {
    case "Active":
      return "border-emerald-400/40 bg-emerald-500/15 text-emerald-300";
    case "On Leave":
      return "border-amber-400/40 bg-amber-500/15 text-amber-200";
    case "Inactive":
      return "border-white/20 bg-white/10 text-white/60";
  }
}

type DbInternalOperator = {
  id: string;
  operator_label: string;
  full_name: string;
  username: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  region: string;
  license_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function mapInternalOperator(row: DbInternalOperator): ManagedUser {
  return {
    id: row.id,
    operatorLabel: row.operator_label,
    fullName: row.full_name,
    username: row.username,
    email: row.email ?? "",
    phone: row.phone ?? "",
    role: normalizeUserRole(row.role),
    status: row.status as UserStatus,
    region: row.region as UserRegion,
    licenseId: row.license_id ?? "",
    notes: row.notes ?? "",
  };
}

export function createBlankUserInput(): Omit<ManagedUser, "id"> {
  return {
    operatorLabel: "New Operator",
    fullName: "New Operator",
    username: `user${Date.now().toString(36)}`,
    email: "",
    phone: "",
    role: "Staff",
    status: "Active",
    region: "Barcelona",
    licenseId: "",
    notes: "",
  };
}

export function userFieldsEqual(a: ManagedUser, b: ManagedUser) {
  return (
    a.operatorLabel === b.operatorLabel &&
    a.fullName === b.fullName &&
    a.username === b.username &&
    a.email === b.email &&
    a.phone === b.phone &&
    a.role === b.role &&
    a.status === b.status &&
    a.region === b.region &&
    a.licenseId === b.licenseId &&
    a.notes === b.notes
  );
}
