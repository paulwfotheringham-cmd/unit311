export type ProjectTask = {
  id: string;
  name: string;
  startDate: string;
  dueDate: string;
  progress: number;
  resource: string;
  milestone: boolean;
  critical: boolean;
};

export type ProjectDetail = {
  projectId: string;
  folderId: string | null;
  tasks: ProjectTask[];
};

function tasks(
  projectId: string,
  items: Array<Omit<ProjectTask, "id"> & { id?: string }>,
): ProjectDetail {
  return {
    projectId,
    folderId: null,
    tasks: items.map((item, index) => ({
      id: item.id ?? `${projectId}-t${index + 1}`,
      name: item.name,
      startDate: item.startDate,
      dueDate: item.dueDate,
      progress: item.progress,
      resource: item.resource,
      milestone: item.milestone,
      critical: item.critical,
    })),
  };
}

const DETAILS: Record<string, ProjectDetail> = {
  "int-crm-platform-upgrade": tasks("int-crm-platform-upgrade", [
    { name: "Discovery complete", startDate: "2026-02-03", dueDate: "2026-02-28", progress: 100, resource: "Elena Vargas", milestone: true, critical: true },
    { name: "Pipeline field mapping", startDate: "2026-03-02", dueDate: "2026-04-10", progress: 100, resource: "Marcus Chen", milestone: false, critical: true },
    { name: "Sandbox cutover", startDate: "2026-04-14", dueDate: "2026-05-15", progress: 100, resource: "Elena Vargas", milestone: true, critical: true },
    { name: "SSO & audit hardening", startDate: "2026-05-18", dueDate: "2026-07-03", progress: 70, resource: "IT Security", milestone: false, critical: true },
    { name: "Production migration", startDate: "2026-07-06", dueDate: "2026-08-12", progress: 25, resource: "Elena Vargas", milestone: true, critical: true },
    { name: "Hypercare close", startDate: "2026-08-13", dueDate: "2026-09-30", progress: 0, resource: "Sales Ops", milestone: true, critical: false },
  ]),
  "int-hr-self-service": tasks("int-hr-self-service", [
    { name: "Leave workflows live", startDate: "2026-01-12", dueDate: "2026-03-20", progress: 100, resource: "Priya Natarajan", milestone: true, critical: true },
    { name: "Payslip module UAT", startDate: "2026-03-23", dueDate: "2026-05-08", progress: 100, resource: "Payroll Lead", milestone: true, critical: true },
    { name: "Identity link to directory", startDate: "2026-05-11", dueDate: "2026-06-19", progress: 85, resource: "IT Ops", milestone: false, critical: true },
    { name: "Manager approvals release", startDate: "2026-06-22", dueDate: "2026-07-10", progress: 40, resource: "Priya Natarajan", milestone: true, critical: true },
    { name: "Full portal GA", startDate: "2026-07-13", dueDate: "2026-07-31", progress: 10, resource: "Employee Experience", milestone: true, critical: false },
  ]),
  "int-finance-reporting": tasks("int-finance-reporting", [
    { name: "Chart of accounts alignment", startDate: "2025-11-04", dueDate: "2025-12-18", progress: 100, resource: "Sofia Almeida", milestone: true, critical: true },
    { name: "Management P&L prototype", startDate: "2026-01-06", dueDate: "2026-03-14", progress: 100, resource: "James Whitfield", milestone: true, critical: true },
    { name: "FX revaluation rules", startDate: "2026-03-16", dueDate: "2026-05-22", progress: 55, resource: "Controller", milestone: false, critical: true },
    { name: "Board pack automation", startDate: "2026-05-25", dueDate: "2026-06-30", progress: 35, resource: "James Whitfield", milestone: true, critical: true },
    { name: "Audit trail certification", startDate: "2026-07-01", dueDate: "2026-08-28", progress: 0, resource: "External Audit Prep", milestone: true, critical: false },
  ]),
  "int-office-network": tasks("int-office-network", [
    { name: "Design & BOM approved", startDate: "2026-03-02", dueDate: "2026-03-28", progress: 100, resource: "Tomás Ribeiro", milestone: true, critical: true },
    { name: "Hardware staging", startDate: "2026-04-01", dueDate: "2026-05-29", progress: 80, resource: "Facilities Desk", milestone: false, critical: true },
    { name: "Barcelona core cutover", startDate: "2026-06-01", dueDate: "2026-06-20", progress: 15, resource: "Tomás Ribeiro", milestone: true, critical: true },
    { name: "Oxford refresh", startDate: "2026-07-06", dueDate: "2026-08-22", progress: 0, resource: "Network Engineers", milestone: true, critical: true },
    { name: "SD-WAN optimisation", startDate: "2026-08-24", dueDate: "2026-10-15", progress: 0, resource: "Tomás Ribeiro", milestone: true, critical: false },
  ]),
  "int-iso-27001": tasks("int-iso-27001", [
    { name: "Gap assessment closed", startDate: "2025-09-01", dueDate: "2025-11-15", progress: 100, resource: "Nadia Okonkwo", milestone: true, critical: true },
    { name: "SoA approved", startDate: "2025-11-18", dueDate: "2026-02-27", progress: 100, resource: "CISO Office", milestone: true, critical: true },
    { name: "Control evidence packs", startDate: "2026-03-02", dueDate: "2026-06-26", progress: 70, resource: "QMS Lead", milestone: false, critical: true },
    { name: "Stage 1 audit", startDate: "2026-07-13", dueDate: "2026-08-05", progress: 10, resource: "Nadia Okonkwo", milestone: true, critical: true },
    { name: "Stage 2 certification", startDate: "2026-09-01", dueDate: "2026-11-18", progress: 0, resource: "External Auditor", milestone: true, critical: true },
  ]),
  "int-ai-knowledge": tasks("int-ai-knowledge", [
    { name: "Corpus ingestion v1", startDate: "2026-04-07", dueDate: "2026-05-22", progress: 100, resource: "Lucas Ferreira", milestone: true, critical: true },
    { name: "Evaluation harness", startDate: "2026-05-25", dueDate: "2026-06-26", progress: 65, resource: "AI Platform", milestone: false, critical: true },
    { name: "Pilot with leadership team", startDate: "2026-06-29", dueDate: "2026-07-31", progress: 30, resource: "Lucas Ferreira", milestone: true, critical: true },
    { name: "Role-based retrieval policies", startDate: "2026-08-03", dueDate: "2026-09-25", progress: 0, resource: "DPO", milestone: true, critical: true },
    { name: "Company-wide release", startDate: "2026-10-01", dueDate: "2026-12-18", progress: 0, resource: "Knowledge Ops", milestone: true, critical: false },
  ]),
  "int-website-redesign": tasks("int-website-redesign", [
    { name: "Creative direction locked", startDate: "2026-08-04", dueDate: "2026-08-29", progress: 20, resource: "Claire Fontaine", milestone: true, critical: true },
    { name: "IA & content model", startDate: "2026-09-01", dueDate: "2026-09-25", progress: 0, resource: "Product Marketing", milestone: false, critical: true },
    { name: "CMS content migration", startDate: "2026-09-28", dueDate: "2026-10-16", progress: 0, resource: "Website Mgmt", milestone: true, critical: true },
    { name: "Soft launch", startDate: "2026-11-02", dueDate: "2026-12-09", progress: 0, resource: "Claire Fontaine", milestone: true, critical: true },
    { name: "SEO & analytics harden", startDate: "2026-12-10", dueDate: "2027-01-30", progress: 0, resource: "Growth Analytics", milestone: true, critical: false },
  ]),
  "int-onboarding-opt": tasks("int-onboarding-opt", [
    { name: "Process map & SLAs", startDate: "2026-02-16", dueDate: "2026-03-06", progress: 100, resource: "Amelia Brooks", milestone: true, critical: true },
    { name: "Device kit standard", startDate: "2026-03-09", dueDate: "2026-04-24", progress: 100, resource: "Technology Mgmt", milestone: true, critical: true },
    { name: "Access pack automation", startDate: "2026-04-27", dueDate: "2026-07-03", progress: 45, resource: "IT Service Desk", milestone: true, critical: true },
    { name: "30/60/90 templates", startDate: "2026-06-01", dueDate: "2026-07-17", progress: 35, resource: "People Experience", milestone: false, critical: false },
    { name: "Manager checklist GA", startDate: "2026-07-20", dueDate: "2026-08-14", progress: 0, resource: "Amelia Brooks", milestone: true, critical: false },
  ]),
  "int-data-warehouse": tasks("int-data-warehouse", [
    { name: "Landing zone live", startDate: "2025-10-13", dueDate: "2025-12-05", progress: 100, resource: "Owen Gallagher", milestone: true, critical: true },
    { name: "Finance mart v1", startDate: "2025-12-08", dueDate: "2026-03-27", progress: 100, resource: "BI Engineers", milestone: true, critical: true },
    { name: "CRM & HR marts", startDate: "2026-03-30", dueDate: "2026-07-17", progress: 40, resource: "Owen Gallagher", milestone: true, critical: true },
    { name: "Semantic model governance", startDate: "2026-06-01", dueDate: "2026-08-14", progress: 25, resource: "Data Governance", milestone: false, critical: true },
    { name: "Self-serve BI rollout", startDate: "2026-08-17", dueDate: "2026-09-25", progress: 0, resource: "Head of Analytics", milestone: true, critical: false },
  ]),
  "int-cyber-security": tasks("int-cyber-security", [
    { name: "Programme charter", startDate: "2026-09-01", dueDate: "2026-09-18", progress: 15, resource: "Helena Krüger", milestone: true, critical: true },
    { name: "Threat model refresh", startDate: "2026-09-21", dueDate: "2026-10-30", progress: 0, resource: "SecOps", milestone: false, critical: true },
    { name: "EDR fleet standard", startDate: "2026-11-02", dueDate: "2026-11-28", progress: 0, resource: "Helena Krüger", milestone: true, critical: true },
    { name: "Privileged access hardening", startDate: "2026-12-01", dueDate: "2027-01-30", progress: 0, resource: "Identity Team", milestone: true, critical: true },
    { name: "Tabletop IR exercise", startDate: "2027-02-16", dueDate: "2027-03-20", progress: 0, resource: "CISO Office", milestone: true, critical: false },
  ]),
  "ext-northwind-erp": tasks("ext-northwind-erp", [
    { name: "Blueprint signed", startDate: "2025-12-01", dueDate: "2026-01-24", progress: 100, resource: "Daniel Okoro", milestone: true, critical: true },
    { name: "Master data cleanse", startDate: "2026-01-27", dueDate: "2026-03-20", progress: 100, resource: "Customer PMO", milestone: false, critical: true },
    { name: "Finance module UAT", startDate: "2026-03-23", dueDate: "2026-04-18", progress: 100, resource: "Rachel Holt", milestone: true, critical: true },
    { name: "Plant 1 go-live", startDate: "2026-06-01", dueDate: "2026-07-25", progress: 35, resource: "Daniel Okoro", milestone: true, critical: true },
    { name: "Multi-site hypercare end", startDate: "2026-07-27", dueDate: "2026-10-31", progress: 0, resource: "Sophie Lang", milestone: true, critical: false },
  ]),
  "ext-apex-digital": tasks("ext-apex-digital", [
    { name: "Operating model design", startDate: "2026-01-20", dueDate: "2026-03-06", progress: 100, resource: "Maya Lindström", milestone: true, critical: true },
    { name: "Yard visibility MVP", startDate: "2026-03-09", dueDate: "2026-05-08", progress: 90, resource: "Integration Team", milestone: false, critical: true },
    { name: "TMS interface live", startDate: "2026-05-11", dueDate: "2026-06-12", progress: 45, resource: "Maya Lindström", milestone: true, critical: true },
    { name: "Customer portal beta", startDate: "2026-07-06", dueDate: "2026-09-04", progress: 10, resource: "Anika Berg", milestone: true, critical: false },
    { name: "Control tower GA", startDate: "2026-09-07", dueDate: "2026-11-20", progress: 0, resource: "Greg Palmer", milestone: true, critical: true },
  ]),
  "ext-city-m365": tasks("ext-city-m365", [
    { name: "Pilot wave complete", startDate: "2026-02-09", dueDate: "2026-03-20", progress: 100, resource: "Harriet Quinn", milestone: true, critical: true },
    { name: "Wave 3 departments", startDate: "2026-03-23", dueDate: "2026-05-29", progress: 100, resource: "Migration Factory", milestone: true, critical: true },
    { name: "SharePoint IA rebuild", startDate: "2026-05-04", dueDate: "2026-06-26", progress: 80, resource: "Content Team", milestone: false, critical: false },
    { name: "Legacy mail decommission", startDate: "2026-06-29", dueDate: "2026-07-24", progress: 20, resource: "Harriet Quinn", milestone: true, critical: true },
    { name: "Service acceptance", startDate: "2026-07-27", dueDate: "2026-08-21", progress: 0, resource: "Olivia Grant", milestone: true, critical: true },
  ]),
  "ext-global-warehouse": tasks("ext-global-warehouse", [
    { name: "Equipment FAT", startDate: "2025-09-15", dueDate: "2026-01-30", progress: 100, resource: "Viktor Novak", milestone: true, critical: true },
    { name: "WMS interface freeze", startDate: "2026-02-02", dueDate: "2026-04-10", progress: 100, resource: "Integration Leads", milestone: true, critical: true },
    { name: "Conveyor SAT", startDate: "2026-04-13", dueDate: "2026-07-03", progress: 60, resource: "OEM Commissioning", milestone: false, critical: true },
    { name: "Live putaway automation", startDate: "2026-07-06", dueDate: "2026-09-04", progress: 25, resource: "Viktor Novak", milestone: true, critical: true },
    { name: "Throughput acceptance", startDate: "2026-09-07", dueDate: "2026-12-11", progress: 0, resource: "Kim Adeyemi", milestone: true, critical: true },
  ]),
  "ext-freshmart-pos": tasks("ext-freshmart-pos", [
    { name: "Reference store live", startDate: "2026-03-09", dueDate: "2026-04-03", progress: 100, resource: "Inês Carvalho", milestone: true, critical: true },
    { name: "Region North complete", startDate: "2026-04-06", dueDate: "2026-06-19", progress: 100, resource: "Rollout Crew", milestone: true, critical: true },
    { name: "Payments certification", startDate: "2026-05-04", dueDate: "2026-07-10", progress: 55, resource: "Payments Partner", milestone: false, critical: true },
    { name: "Region South complete", startDate: "2026-06-22", dueDate: "2026-08-14", progress: 15, resource: "Inês Carvalho", milestone: true, critical: true },
    { name: "Legacy POS sunset", startDate: "2026-08-17", dueDate: "2026-09-18", progress: 0, resource: "Marco Silva", milestone: true, critical: false },
  ]),
  "ext-healthcare-analytics": tasks("ext-healthcare-analytics", [
    { name: "Data sharing agreements", startDate: "2026-01-06", dueDate: "2026-02-20", progress: 100, resource: "Sigrid Holm", milestone: true, critical: true },
    { name: "Secure lakehouse", startDate: "2026-02-23", dueDate: "2026-05-15", progress: 100, resource: "Platform Engineers", milestone: true, critical: true },
    { name: "Clinical KPI pack", startDate: "2026-05-18", dueDate: "2026-08-07", progress: 35, resource: "Annika Sørensen", milestone: true, critical: true },
    { name: "Ethics board evidence", startDate: "2026-06-01", dueDate: "2026-09-04", progress: 20, resource: "Sigrid Holm", milestone: false, critical: true },
    { name: "Clinical acceptance", startDate: "2026-09-07", dueDate: "2026-10-09", progress: 0, resource: "Dr. Erik Lund", milestone: true, critical: true },
  ]),
  "ext-financial-reporting-platform": tasks("ext-financial-reporting-platform", [
    { name: "Kick-off & data rooms", startDate: "2026-08-17", dueDate: "2026-08-28", progress: 0, resource: "Nathan Pierce", milestone: true, critical: true },
    { name: "Chart mapping workshops", startDate: "2026-09-01", dueDate: "2026-10-09", progress: 0, resource: "Emma Price", milestone: true, critical: true },
    { name: "Ledger connectors", startDate: "2026-10-12", dueDate: "2026-11-20", progress: 0, resource: "Delivery Engineers", milestone: false, critical: true },
    { name: "Investor pack pilot", startDate: "2026-11-23", dueDate: "2026-12-11", progress: 0, resource: "Nathan Pierce", milestone: true, critical: true },
    { name: "Year-end parallel run", startDate: "2027-01-05", dueDate: "2027-02-27", progress: 0, resource: "Chloe Avery", milestone: true, critical: true },
  ]),
  "ext-ai-customer-support": tasks("ext-ai-customer-support", [
    { name: "Knowledge base cleanse", startDate: "2026-04-01", dueDate: "2026-04-25", progress: 100, resource: "Yara Hassan", milestone: true, critical: true },
    { name: "Guardrail policy draft", startDate: "2026-04-27", dueDate: "2026-05-29", progress: 70, resource: "CX Policy", milestone: false, critical: true },
    { name: "Agent assist pilot", startDate: "2026-06-01", dueDate: "2026-06-19", progress: 20, resource: "Yara Hassan", milestone: true, critical: true },
    { name: "Chat deflection target", startDate: "2026-06-22", dueDate: "2026-08-14", progress: 0, resource: "Contact Centre", milestone: true, critical: true },
    { name: "Full channel GA", startDate: "2026-08-17", dueDate: "2026-09-30", progress: 0, resource: "Felix Braun", milestone: true, critical: false },
  ]),
  "ext-multisite-network": tasks("ext-multisite-network", [
    { name: "Reference architecture", startDate: "2025-11-10", dueDate: "2025-12-19", progress: 100, resource: "Andrej Petrov", milestone: true, critical: true },
    { name: "Wave A sites (8)", startDate: "2026-01-05", dueDate: "2026-04-03", progress: 100, resource: "Field Crew A", milestone: true, critical: true },
    { name: "Wave B sites (8)", startDate: "2026-04-06", dueDate: "2026-08-21", progress: 55, resource: "Andrej Petrov", milestone: true, critical: true },
    { name: "NOC tooling integration", startDate: "2026-07-01", dueDate: "2026-09-25", progress: 30, resource: "NOC Engineers", milestone: false, critical: false },
    { name: "Wave C + NOC handover", startDate: "2026-09-28", dueDate: "2026-11-28", progress: 0, resource: "Nicola West", milestone: true, critical: true },
  ]),
  "ext-cloud-migration": tasks("ext-cloud-migration", [
    { name: "Discovery & 6R scoring", startDate: "2026-09-14", dueDate: "2026-10-23", progress: 10, resource: "Rebecca Shaw", milestone: true, critical: true },
    { name: "Landing zone ready", startDate: "2026-10-26", dueDate: "2026-12-11", progress: 0, resource: "Cloud Platform", milestone: true, critical: true },
    { name: "Wave 1 production moves", startDate: "2027-01-05", dueDate: "2027-02-20", progress: 0, resource: "Rebecca Shaw", milestone: true, critical: true },
    { name: "FinOps baselines", startDate: "2027-02-02", dueDate: "2027-03-20", progress: 0, resource: "FinOps Lead", milestone: false, critical: false },
    { name: "DR & FinOps handover", startDate: "2027-03-23", dueDate: "2027-04-30", progress: 0, resource: "Chris Donnelly", milestone: true, critical: true },
  ]),
  default: {
    projectId: "default",
    folderId: null,
    tasks: [
      { id: "t1", name: "Kick-off & scope sign-off", startDate: "2026-03-01", dueDate: "2026-03-05", progress: 100, resource: "Tom", milestone: true, critical: true },
      { id: "t2", name: "Site survey planning", startDate: "2026-03-06", dueDate: "2026-03-12", progress: 100, resource: "John", milestone: false, critical: true },
      { id: "t3", name: "Field capture", startDate: "2026-03-13", dueDate: "2026-03-20", progress: 75, resource: "Sarah", milestone: false, critical: true },
      { id: "t4", name: "Processing & QA", startDate: "2026-03-18", dueDate: "2026-03-28", progress: 40, resource: "Tom", milestone: false, critical: false },
      { id: "t5", name: "Client deliverables", startDate: "2026-03-25", dueDate: "2026-04-02", progress: 10, resource: "John", milestone: true, critical: true },
    ],
  },
};

export function getProjectDetail(projectId: string): ProjectDetail {
  return DETAILS[projectId] ?? { ...DETAILS.default, projectId };
}

export function ganttBarStyle(start: string, due: string, rangeStart: Date, rangeEnd: Date) {
  const s = new Date(start).getTime();
  const e = new Date(due).getTime();
  const rs = rangeStart.getTime();
  const re = rangeEnd.getTime();
  const total = re - rs || 1;
  const left = Math.max(0, ((s - rs) / total) * 100);
  const width = Math.max(4, ((e - s) / total) * 100);
  return { left: `${left}%`, width: `${width}%` };
}
