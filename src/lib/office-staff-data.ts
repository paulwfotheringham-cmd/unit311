export type OfficeStaffMember = {
  id: string;
  name: string;
  role: string;
  department: string;
};

export const OFFICE_STAFF: Record<string, OfficeStaffMember[]> = {
  barcelona: [
    { id: "s1", name: "Elena Morales", role: "Managing Director", department: "Leadership" },
    { id: "s2", name: "Tom Hughes", role: "Operations Lead", department: "Operations" },
    { id: "s3", name: "Sarah Chen", role: "Finance Manager", department: "Finance" },
    { id: "s4", name: "Marcus Webb", role: "Client Success", department: "Commercial" },
  ],
  porto: [
    { id: "s5", name: "Rui Ferreira", role: "Site Manager", department: "Operations" },
    { id: "s6", name: "Ana Ribeiro", role: "Logistics Coordinator", department: "Logistics" },
    { id: "s7", name: "João Silva", role: "Project Engineer", department: "Delivery" },
  ],
  oxford: [
    { id: "s8", name: "James Whitfield", role: "Studio Lead", department: "Delivery" },
    { id: "s9", name: "Emily Clarke", role: "HR Partner", department: "People" },
    { id: "s10", name: "David Okonkwo", role: "Technical Analyst", department: "Operations" },
  ],
};
