import { generateTypedReportPdf } from "../report-pdf-service";
import { generateEmployeeDirectoryPdf } from "../employee-pdf-service";
import { reportDisplayMeta } from "../report-intent";
import type { InternalProject } from "@/lib/projects-data";
import type { ManagedClient } from "@/lib/client-management-data";

async function main() {
  const projects = [
    {
      id: "1",
      name: "Alpha Delivery",
      clientId: "c1",
      clientName: "Acme",
      site: null,
      region: null,
      operator: null,
      phase: "live",
      startDate: "2026-01-01",
      endDate: "2026-08-01",
      progressPct: 55,
      notes: "Waiting on vendor",
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "2",
      name: "Beta Kickoff",
      clientId: "c2",
      clientName: "Beta Co",
      site: null,
      region: null,
      operator: null,
      phase: "upcoming",
      startDate: "2026-09-01",
      endDate: null,
      progressPct: 0,
      notes: null,
      createdAt: "",
      updatedAt: "",
    },
  ] as InternalProject[];

  const clients = [
    {
      id: "c1",
      companyName: "Acme",
      industry: "Other",
      primaryContact: "A",
      email: "a@x.com",
      phone: "",
      region: "Other",
      accountStatus: "Active",
      contractType: "Retainer",
      taxId: "",
      billingAddress: "",
      activeProjects: 1,
      notes: "Support ticket open",
      renewalDate: "2026-12-01",
      onboardingStage: null,
    },
    {
      id: "c2",
      companyName: "Beta Co",
      industry: "Other",
      primaryContact: "B",
      email: "b@x.com",
      phone: "",
      region: "Other",
      accountStatus: "Onboarding",
      contractType: "Pilot",
      taxId: "",
      billingAddress: "",
      activeProjects: 0,
      notes: "",
      renewalDate: null,
      onboardingStage: "Kickoff",
    },
  ] as ManagedClient[];

  const eng = await generateTypedReportPdf({
    reportType: "engineering",
    userId: "u1",
    organisationName: "Unit311",
    projects,
    clients,
    employees: [],
  });
  console.log("eng", eng.filename, eng.bytes.length);

  const board = await generateTypedReportPdf({
    reportType: "board",
    userId: "u1",
    projects,
    clients,
    employees: [],
  });
  console.log("board", board.filename, board.bytes.length);

  const emp = await generateEmployeeDirectoryPdf({
    employees: [
      {
        id: "e1",
        fullName: "Jane Doe",
        department: "Engineering",
        role: "Engineer",
        employmentStatus: "active",
      } as never,
    ],
    userId: "u1",
  });
  console.log("emp", emp.filename, emp.bytes.length);
  console.log("financial meta", reportDisplayMeta("financial"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
