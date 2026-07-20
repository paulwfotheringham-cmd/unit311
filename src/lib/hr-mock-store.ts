/**
 * Client-side HR mock store for demos.
 * Future: swap selectors/mutations for GET/POST /api/hr/... endpoints.
 */

import type { HrEmployee } from "@/lib/hr-data";
import {
  businessDaysBetween,
  type HrLeaveBalance,
  type HrLeaveRequest,
  type HrLeaveStatus,
  type HrPublicHoliday,
} from "@/lib/hr-leave-data";
import {
  blankQuestionResponses,
  type HrPerformanceReview,
  type HrReviewStatus,
} from "@/lib/hr-performance-data";
import {
  nextPipelineStage,
  type HrCandidate,
  type HrPipelineStage,
  type HrVacancy,
} from "@/lib/hr-recruitment-data";
import {
  defaultReportName,
  emptyHrReportFilters,
  sampleReportPreview,
  type HrReportFilters,
  type HrReportKind,
  type HrReportOutput,
  type HrSavedReport,
} from "@/lib/hr-reports-data";

type Listener = () => void;

type HrMockState = {
  leaveRequests: HrLeaveRequest[];
  leaveBalances: HrLeaveBalance[];
  publicHolidays: HrPublicHoliday[];
  vacancies: HrVacancy[];
  candidates: HrCandidate[];
  reviews: HrPerformanceReview[];
  reports: HrSavedReport[];
  activity: Array<{ id: string; at: string; label: string; detail: string }>;
};

function isoDaysFromNow(offset: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function seedState(): HrMockState {
  const leaveRequests: HrLeaveRequest[] = [
    {
      id: "leave-001",
      employeeId: "emp-demo-1",
      employeeName: "María García",
      department: "Operations",
      location: "Barcelona",
      role: "Operations Lead",
      managerName: "Paul Fotheringham",
      type: "annual",
      startDate: isoDaysFromNow(3),
      endDate: isoDaysFromNow(7),
      days: 5,
      status: "approved",
      notes: "Summer break",
      requestedAt: isoDaysFromNow(-14),
      decidedAt: isoDaysFromNow(-12),
    },
    {
      id: "leave-002",
      employeeId: "emp-demo-2",
      employeeName: "Carlos Mendoza",
      department: "Technical",
      location: "Barcelona",
      role: "Software Engineer",
      managerName: "Hannes Weber",
      type: "annual",
      startDate: isoDaysFromNow(12),
      endDate: isoDaysFromNow(23),
      days: 10,
      status: "pending",
      notes: "Family travel",
      requestedAt: isoDaysFromNow(-2),
      decidedAt: null,
    },
    {
      id: "leave-003",
      employeeId: "emp-demo-3",
      employeeName: "Elena Ruiz",
      department: "Sales",
      location: "Madrid",
      role: "Account Executive",
      managerName: "Ashley Cole",
      type: "sick",
      startDate: isoDaysFromNow(-1),
      endDate: isoDaysFromNow(1),
      days: 3,
      status: "approved",
      notes: "Medical recovery",
      requestedAt: isoDaysFromNow(-1),
      decidedAt: isoDaysFromNow(-1),
    },
    {
      id: "leave-004",
      employeeId: "emp-demo-4",
      employeeName: "Ana Torres",
      department: "People",
      location: "Hybrid",
      role: "People Partner",
      managerName: "Paul Fotheringham",
      type: "training",
      startDate: isoDaysFromNow(18),
      endDate: isoDaysFromNow(19),
      days: 2,
      status: "approved",
      notes: "CIPD workshop",
      requestedAt: isoDaysFromNow(-5),
      decidedAt: isoDaysFromNow(-4),
    },
    {
      id: "leave-005",
      employeeId: "emp-demo-5",
      employeeName: "Pablo Serrano",
      department: "Customer Success",
      location: "Barcelona",
      role: "CS Manager",
      managerName: "Ashley Cole",
      type: "remote",
      startDate: isoDaysFromNow(0),
      endDate: isoDaysFromNow(2),
      days: 3,
      status: "approved",
      notes: "Client onsite prep from home",
      requestedAt: isoDaysFromNow(-3),
      decidedAt: isoDaysFromNow(-3),
    },
    {
      id: "leave-006",
      employeeId: "emp-demo-6",
      employeeName: "Lucía Fernández",
      department: "Marketing",
      location: "Remote",
      role: "Content Lead",
      managerName: "Saffin Khan",
      type: "maternity_paternity",
      startDate: isoDaysFromNow(40),
      endDate: isoDaysFromNow(130),
      days: 90,
      status: "pending",
      notes: "Maternity leave request",
      requestedAt: isoDaysFromNow(-1),
      decidedAt: null,
    },
    {
      id: "leave-007",
      employeeId: "emp-demo-7",
      employeeName: "David Llorens",
      department: "Finance",
      location: "Barcelona",
      role: "Finance Analyst",
      managerName: "Stefan Braun",
      type: "annual",
      startDate: isoDaysFromNow(28),
      endDate: isoDaysFromNow(32),
      days: 5,
      status: "pending",
      notes: "",
      requestedAt: isoDaysFromNow(0),
      decidedAt: null,
    },
  ];

  const leaveBalances: HrLeaveBalance[] = [
    {
      employeeId: "emp-demo-1",
      employeeName: "María García",
      department: "Operations",
      location: "Barcelona",
      annualAllocated: 25,
      annualTaken: 8,
      sickTaken: 1,
      trainingTaken: 0,
    },
    {
      employeeId: "emp-demo-2",
      employeeName: "Carlos Mendoza",
      department: "Technical",
      location: "Barcelona",
      annualAllocated: 25,
      annualTaken: 5,
      sickTaken: 0,
      trainingTaken: 2,
    },
    {
      employeeId: "emp-demo-3",
      employeeName: "Elena Ruiz",
      department: "Sales",
      location: "Madrid",
      annualAllocated: 22,
      annualTaken: 10,
      sickTaken: 3,
      trainingTaken: 1,
    },
    {
      employeeId: "emp-demo-4",
      employeeName: "Ana Torres",
      department: "People",
      location: "Hybrid",
      annualAllocated: 25,
      annualTaken: 4,
      sickTaken: 0,
      trainingTaken: 3,
    },
    {
      employeeId: "emp-demo-5",
      employeeName: "Pablo Serrano",
      department: "Customer Success",
      location: "Barcelona",
      annualAllocated: 25,
      annualTaken: 12,
      sickTaken: 2,
      trainingTaken: 0,
    },
    {
      employeeId: "emp-demo-6",
      employeeName: "Lucía Fernández",
      department: "Marketing",
      location: "Remote",
      annualAllocated: 25,
      annualTaken: 6,
      sickTaken: 0,
      trainingTaken: 1,
    },
    {
      employeeId: "emp-demo-7",
      employeeName: "David Llorens",
      department: "Finance",
      location: "Barcelona",
      annualAllocated: 25,
      annualTaken: 3,
      sickTaken: 1,
      trainingTaken: 0,
    },
  ];

  const publicHolidays: HrPublicHoliday[] = [
    {
      id: "ph-1",
      name: "Assumption Day",
      date: "2026-08-15",
      calendar: "Spain (National)",
    },
    {
      id: "ph-2",
      name: "Hispanic Day",
      date: "2026-10-12",
      calendar: "Spain (National)",
    },
    {
      id: "ph-3",
      name: "La Mercè",
      date: "2026-09-24",
      calendar: "Spain (Catalonia)",
    },
  ];

  const vacancies: HrVacancy[] = [
    {
      id: "vac-1",
      title: "Senior Full-Stack Engineer",
      department: "Technical",
      location: "Barcelona",
      employmentType: "Full time",
      hiringManager: "Hannes Weber",
      status: "open",
      openedAt: isoDaysFromNow(-45),
      targetStartDate: isoDaysFromNow(30),
      headcount: 1,
      salaryBand: "€55–70k",
      description:
        "Own end-to-end delivery of the Unit311 workspace platform across React and Node services.",
      requirements:
        "5+ years full-stack experience · TypeScript · cloud-native delivery · strong communication",
    },
    {
      id: "vac-2",
      title: "Customer Success Specialist",
      department: "Customer Success",
      location: "Remote",
      employmentType: "Full time",
      hiringManager: "Ashley Cole",
      status: "open",
      openedAt: isoDaysFromNow(-21),
      targetStartDate: isoDaysFromNow(21),
      headcount: 1,
      salaryBand: "€38–48k",
      description:
        "Partner with SME customers through onboarding, adoption, and renewal conversations.",
      requirements: "B2B SaaS experience · CRM fluency · clear written English · Spanish a plus",
    },
    {
      id: "vac-3",
      title: "Finance Controller",
      department: "Finance",
      location: "Madrid",
      employmentType: "Full time",
      hiringManager: "Stefan Braun",
      status: "open",
      openedAt: isoDaysFromNow(-60),
      targetStartDate: isoDaysFromNow(45),
      headcount: 1,
      salaryBand: "€60–75k",
      description: "Lead month-end close, management reporting, and cash forecasting for growth.",
      requirements: "Qualified accountant · multi-entity experience · ERP familiarity",
    },
    {
      id: "vac-4",
      title: "Training Coordinator",
      department: "Training",
      location: "Hybrid",
      employmentType: "Part time",
      hiringManager: "Saffin Khan",
      status: "filled",
      openedAt: isoDaysFromNow(-90),
      targetStartDate: isoDaysFromNow(-10),
      headcount: 1,
      salaryBand: "€28–34k",
      description: "Coordinate internal learning programmes and compliance training schedules.",
      requirements: "LMS administration · diary management · attention to detail",
    },
  ];

  const candidates: HrCandidate[] = [
    {
      id: "cand-1",
      name: "Jordi Vila",
      email: "jordi.vila@example.com",
      vacancyId: "vac-1",
      role: "Senior Full-Stack Engineer",
      department: "Technical",
      location: "Barcelona",
      stage: "interview",
      rating: 4,
      interviewer: "Hannes Weber",
      expectedSalary: "€62k",
      appliedAt: isoDaysFromNow(-18),
      notes: "Strong React / Node background",
      rejected: false,
      interviews: [
        {
          id: "int-1a",
          scheduledAt: `${isoDaysFromNow(-7)}T10:00`,
          type: "video",
          interviewer: "Hannes Weber",
          status: "completed",
          feedback: "Solid system design; clear communicator.",
          recommendation: "yes",
        },
        {
          id: "int-1b",
          scheduledAt: `${isoDaysFromNow(2)}T15:00`,
          type: "panel",
          interviewer: "Hannes Weber + Paul Fotheringham",
          status: "scheduled",
          feedback: "",
          recommendation: null,
        },
      ],
      offer: {
        status: "none",
        salary: "",
        startDate: "",
        employmentType: "Full time",
        notes: "",
        sentAt: null,
      },
      timeline: [
        { id: "tl-1a", at: isoDaysFromNow(-18), label: "Application received", detail: "Via careers page" },
        { id: "tl-1b", at: isoDaysFromNow(-14), label: "Screening complete", detail: "Moved to interview" },
        { id: "tl-1c", at: isoDaysFromNow(-7), label: "First interview", detail: "Video with Hannes Weber" },
        { id: "tl-1d", at: isoDaysFromNow(2), label: "Panel interview scheduled", detail: "Barcelona office" },
      ],
    },
    {
      id: "cand-2",
      name: "Nina Costa",
      email: "nina.costa@example.com",
      vacancyId: "vac-1",
      role: "Senior Full-Stack Engineer",
      department: "Technical",
      location: "Barcelona",
      stage: "screening",
      rating: 3,
      interviewer: "Hannes Weber",
      expectedSalary: "€58k",
      appliedAt: isoDaysFromNow(-10),
      notes: "",
      rejected: false,
      interviews: [
        {
          id: "int-2a",
          scheduledAt: `${isoDaysFromNow(4)}T11:30`,
          type: "phone",
          interviewer: "Hannes Weber",
          status: "scheduled",
          feedback: "",
          recommendation: null,
        },
      ],
      offer: {
        status: "none",
        salary: "",
        startDate: "",
        employmentType: "Full time",
        notes: "",
        sentAt: null,
      },
      timeline: [
        { id: "tl-2a", at: isoDaysFromNow(-10), label: "Application received", detail: "LinkedIn referral" },
        { id: "tl-2b", at: isoDaysFromNow(-8), label: "Screening", detail: "CV shortlisted" },
      ],
    },
    {
      id: "cand-3",
      name: "Omar Haddad",
      email: "omar.haddad@example.com",
      vacancyId: "vac-2",
      role: "Customer Success Specialist",
      department: "Customer Success",
      location: "Remote",
      stage: "offer",
      rating: 5,
      interviewer: "Ashley Cole",
      expectedSalary: "€44k",
      appliedAt: isoDaysFromNow(-25),
      notes: "Offer sent — awaiting response",
      rejected: false,
      interviews: [
        {
          id: "int-3a",
          scheduledAt: `${isoDaysFromNow(-12)}T09:00`,
          type: "video",
          interviewer: "Ashley Cole",
          status: "completed",
          feedback: "Excellent customer empathy and SaaS fluency.",
          recommendation: "strong_yes",
        },
      ],
      offer: {
        status: "sent",
        salary: "€44,000",
        startDate: isoDaysFromNow(28),
        employmentType: "Full time",
        notes: "Standard benefits package · 25 days leave",
        sentAt: isoDaysFromNow(-3),
      },
      timeline: [
        { id: "tl-3a", at: isoDaysFromNow(-25), label: "Application received", detail: "" },
        { id: "tl-3b", at: isoDaysFromNow(-18), label: "Interview completed", detail: "Ashley Cole" },
        { id: "tl-3c", at: isoDaysFromNow(-3), label: "Offer sent", detail: "€44k · start in 4 weeks" },
      ],
    },
    {
      id: "cand-4",
      name: "Sophie Laurent",
      email: "sophie.laurent@example.com",
      vacancyId: "vac-2",
      role: "Customer Success Specialist",
      department: "Customer Success",
      location: "Remote",
      stage: "applications",
      rating: 3,
      interviewer: "Ashley Cole",
      expectedSalary: "€40k",
      appliedAt: isoDaysFromNow(-4),
      notes: "",
      rejected: false,
      interviews: [],
      offer: {
        status: "none",
        salary: "",
        startDate: "",
        employmentType: "Full time",
        notes: "",
        sentAt: null,
      },
      timeline: [
        { id: "tl-4a", at: isoDaysFromNow(-4), label: "Application received", detail: "Careers page" },
      ],
    },
    {
      id: "cand-5",
      name: "Miguel Ortega",
      email: "miguel.ortega@example.com",
      vacancyId: "vac-3",
      role: "Finance Controller",
      department: "Finance",
      location: "Madrid",
      stage: "role_approved",
      rating: 0,
      interviewer: "Stefan Braun",
      expectedSalary: "—",
      appliedAt: isoDaysFromNow(-2),
      notes: "Sourcing shortlist",
      rejected: false,
      interviews: [],
      offer: {
        status: "none",
        salary: "",
        startDate: "",
        employmentType: "Full time",
        notes: "",
        sentAt: null,
      },
      timeline: [
        { id: "tl-5a", at: isoDaysFromNow(-2), label: "Added to pipeline", detail: "Agency shortlist" },
      ],
    },
    {
      id: "cand-6",
      name: "Priya Shah",
      email: "priya.shah@example.com",
      vacancyId: "vac-3",
      role: "Finance Controller",
      department: "Finance",
      location: "Madrid",
      stage: "interview",
      rating: 4,
      interviewer: "Stefan Braun",
      expectedSalary: "€68k",
      appliedAt: isoDaysFromNow(-30),
      notes: "Second interview booked",
      rejected: false,
      interviews: [
        {
          id: "int-6a",
          scheduledAt: `${isoDaysFromNow(-14)}T14:00`,
          type: "video",
          interviewer: "Stefan Braun",
          status: "completed",
          feedback: "Strong close process; good IFRS depth.",
          recommendation: "yes",
        },
        {
          id: "int-6b",
          scheduledAt: `${isoDaysFromNow(5)}T10:00`,
          type: "onsite",
          interviewer: "Stefan Braun",
          status: "scheduled",
          feedback: "",
          recommendation: null,
        },
      ],
      offer: {
        status: "draft",
        salary: "€66,000",
        startDate: isoDaysFromNow(35),
        employmentType: "Full time",
        notes: "Draft pending panel outcome",
        sentAt: null,
      },
      timeline: [
        { id: "tl-6a", at: isoDaysFromNow(-30), label: "Application received", detail: "" },
        { id: "tl-6b", at: isoDaysFromNow(-14), label: "First interview", detail: "Completed" },
        { id: "tl-6c", at: isoDaysFromNow(5), label: "On-site interview", detail: "Madrid office" },
      ],
    },
    {
      id: "cand-7",
      name: "Tomás Ribeiro",
      email: "tomas.ribeiro@example.com",
      vacancyId: "vac-1",
      role: "Senior Full-Stack Engineer",
      department: "Technical",
      location: "Barcelona",
      stage: "accepted",
      rating: 5,
      interviewer: "Hannes Weber",
      expectedSalary: "€65k",
      appliedAt: isoDaysFromNow(-40),
      notes: "Start date agreed",
      rejected: false,
      interviews: [
        {
          id: "int-7a",
          scheduledAt: `${isoDaysFromNow(-28)}T16:00`,
          type: "panel",
          interviewer: "Technical panel",
          status: "completed",
          feedback: "Hire — top of band.",
          recommendation: "strong_yes",
        },
      ],
      offer: {
        status: "accepted",
        salary: "€65,000",
        startDate: isoDaysFromNow(14),
        employmentType: "Full time",
        notes: "Signed · equipment ordered",
        sentAt: isoDaysFromNow(-10),
      },
      timeline: [
        { id: "tl-7a", at: isoDaysFromNow(-40), label: "Application received", detail: "" },
        { id: "tl-7b", at: isoDaysFromNow(-28), label: "Panel interview", detail: "Completed" },
        { id: "tl-7c", at: isoDaysFromNow(-10), label: "Offer accepted", detail: "€65k" },
      ],
    },
    {
      id: "cand-8",
      name: "Helen Park",
      email: "helen.park@example.com",
      vacancyId: "vac-4",
      role: "Training Coordinator",
      department: "Training",
      location: "Hybrid",
      stage: "onboarding",
      rating: 4,
      interviewer: "Saffin Khan",
      expectedSalary: "€32k",
      appliedAt: isoDaysFromNow(-70),
      notes: "Onboarding week 1",
      rejected: false,
      interviews: [
        {
          id: "int-8a",
          scheduledAt: `${isoDaysFromNow(-50)}T13:00`,
          type: "video",
          interviewer: "Saffin Khan",
          status: "completed",
          feedback: "Organised and personable.",
          recommendation: "yes",
        },
      ],
      offer: {
        status: "accepted",
        salary: "€32,000",
        startDate: isoDaysFromNow(-10),
        employmentType: "Part time",
        notes: "Started onboarding",
        sentAt: isoDaysFromNow(-20),
      },
      timeline: [
        { id: "tl-8a", at: isoDaysFromNow(-70), label: "Application received", detail: "" },
        { id: "tl-8b", at: isoDaysFromNow(-20), label: "Offer accepted", detail: "Part time" },
        { id: "tl-8c", at: isoDaysFromNow(-10), label: "Onboarding started", detail: "Week 1 checklist" },
      ],
    },
  ];

  const reviews: HrPerformanceReview[] = [
    {
      id: "rev-1",
      employeeId: "emp-demo-1",
      employeeName: "María García",
      department: "Operations",
      role: "Operations Lead",
      managerName: "Paul Fotheringham",
      reviewPeriod: "H1 2026",
      status: "submitted",
      overallRating: 4,
      strengths: "Reliable delivery ownership and cross-team coordination.",
      areasForImprovement: "Delegate routine escalations earlier.",
      trainingRecommendations: "Advanced people leadership workshop",
      promotionRecommendation: "later",
      salaryReviewRecommendation: "increase",
      managerRecommendation: "develop",
      employeeGoals: "Lead two cross-functional delivery programmes and mentor coordinators to independent ownership.",
      nextReviewDate: isoDaysFromNow(120),
      summary: "Strong half — exceeded delivery targets.",
      responses: blankQuestionResponses().map((item, index) => ({
        ...item,
        rating: ([4, 4, 5, 4, 4, 4, 3, 4, 4, 4, 3, 5, 5, 4, 4, 3, 5, 4, 4, 4][index] ??
          3) as 1 | 2 | 3 | 4 | 5,
        managerComments: index % 5 === 0 ? "Consistently strong." : "",
        employeeComments: index % 7 === 0 ? "Agree — focusing here next quarter." : "",
      })),
      objectives: [
        {
          id: "obj-1",
          title: "Stabilise dispatch SLA",
          description: "Hold 98% on-time mission readiness.",
          progressPercent: 92,
          dueDate: isoDaysFromNow(20),
          status: "on_track",
        },
        {
          id: "obj-2",
          title: "Mentor two coordinators",
          description: "Documented mentoring plan and monthly check-ins.",
          progressPercent: 70,
          dueDate: isoDaysFromNow(45),
          status: "on_track",
        },
      ],
      competencies: [
        { id: "comp-1", name: "Leadership", score: 4, notes: "Trusted by peers" },
        { id: "comp-2", name: "Communication", score: 4, notes: "" },
        { id: "comp-3", name: "Delivery", score: 5, notes: "Consistently ahead" },
      ],
      developmentPlan: [
        {
          id: "dev-1",
          focus: "Delegation",
          action: "Shadow Paul on weekly priority triage",
          owner: "María García",
          targetDate: isoDaysFromNow(60),
          status: "in_progress",
        },
      ],
      createdAt: isoDaysFromNow(-40),
      updatedAt: isoDaysFromNow(-3),
      submittedAt: isoDaysFromNow(-3),
      approvedAt: null,
      completedAt: null,
    },
    {
      id: "rev-2",
      employeeId: "emp-demo-2",
      employeeName: "Carlos Mendoza",
      department: "Technical",
      role: "Software Engineer",
      managerName: "Hannes Weber",
      reviewPeriod: "Probation 2026",
      status: "draft",
      overallRating: null,
      strengths: "",
      areasForImprovement: "",
      trainingRecommendations: "",
      promotionRecommendation: null,
      salaryReviewRecommendation: null,
      managerRecommendation: null,
      employeeGoals: "",
      nextReviewDate: isoDaysFromNow(14),
      summary: "",
      responses: blankQuestionResponses(),
      objectives: [
        {
          id: "obj-3",
          title: "Ship workspace isolation suite",
          description: "Complete Phase-2 tenancy tests.",
          progressPercent: 55,
          dueDate: isoDaysFromNow(10),
          status: "at_risk",
        },
      ],
      competencies: [
        { id: "comp-4", name: "Technical ability", score: 3, notes: "Growing quickly" },
        { id: "comp-5", name: "Collaboration", score: 4, notes: "" },
      ],
      developmentPlan: [],
      createdAt: isoDaysFromNow(-7),
      updatedAt: isoDaysFromNow(-1),
      submittedAt: null,
      approvedAt: null,
      completedAt: null,
    },
    {
      id: "rev-3",
      employeeId: "emp-demo-5",
      employeeName: "Pablo Serrano",
      department: "Customer Success",
      role: "CS Manager",
      managerName: "Ashley Cole",
      reviewPeriod: "FY 2025",
      status: "completed",
      overallRating: 5,
      strengths: "Client retention and team coaching.",
      areasForImprovement: "Capacity forecasting under growth.",
      trainingRecommendations: "Forecasting for CS leaders",
      promotionRecommendation: "yes",
      salaryReviewRecommendation: "increase",
      managerRecommendation: "retain",
      employeeGoals: "Scale the CS team playbook and protect net revenue retention above 110%.",
      nextReviewDate: isoDaysFromNow(180),
      summary: "Outstanding year — promoted to CS Manager track.",
      responses: blankQuestionResponses().map((item) => ({
        ...item,
        rating: 5 as const,
        managerComments: "",
        employeeComments: "",
      })),
      objectives: [],
      competencies: [],
      developmentPlan: [],
      createdAt: isoDaysFromNow(-200),
      updatedAt: isoDaysFromNow(-150),
      submittedAt: isoDaysFromNow(-160),
      approvedAt: isoDaysFromNow(-155),
      completedAt: isoDaysFromNow(-150),
    },
  ];

  const reports: HrSavedReport[] = [
    {
      id: "rep-1",
      name: "Employee Directory — Jun 2026",
      kind: "employee_directory",
      output: "excel",
      filters: emptyHrReportFilters(),
      createdAt: isoDaysFromNow(-12),
      updatedAt: isoDaysFromNow(-12),
      createdBy: "Ana Torres",
      rowCount: 28,
      previewLines: [
        "Employee Directory",
        "Department: All",
        "Location: All",
        "",
        "Employee,Number,Department,Role,Location,Manager,Status",
        "María García,EMP-0001,Operations,Operations Lead,Barcelona,Paul Fotheringham,Active",
      ],
    },
    {
      id: "rep-2",
      name: "Leave Summary — Q2",
      kind: "leave_summary",
      output: "pdf",
      filters: { ...emptyHrReportFilters(), dateFrom: "2026-04-01", dateTo: "2026-06-30" },
      createdAt: isoDaysFromNow(-20),
      updatedAt: isoDaysFromNow(-20),
      createdBy: "Ana Torres",
      rowCount: 46,
      previewLines: [
        "Leave Summary",
        "Period: 2026-04-01 to 2026-06-30",
        "",
        "Type,Approved days,Pending requests",
        "Annual Leave,86,3",
      ],
    },
    {
      id: "rep-3",
      name: "Probation Report — Jul 2026",
      kind: "probation",
      output: "csv",
      filters: emptyHrReportFilters(),
      createdAt: isoDaysFromNow(-5),
      updatedAt: isoDaysFromNow(-5),
      createdBy: "Paul Fotheringham",
      rowCount: 4,
      previewLines: [
        "Probation Report",
        "",
        "Employee,Joined,Probation end,Manager,Status",
        "Carlos Mendoza,2026-05-12,2026-08-12,Hannes Weber,In progress",
      ],
    },
    {
      id: "rep-4",
      name: "Performance Summary — H1 2026",
      kind: "performance_summary",
      output: "pdf",
      filters: emptyHrReportFilters(),
      createdAt: isoDaysFromNow(-8),
      updatedAt: isoDaysFromNow(-8),
      createdBy: "Ana Torres",
      rowCount: 19,
      previewLines: ["Performance Summary", "", "Status,Count", "Completed,12", "Submitted,4"],
    },
    {
      id: "rep-5",
      name: "Training Matrix — Jul 2026",
      kind: "training_matrix",
      output: "excel",
      filters: emptyHrReportFilters(),
      createdAt: isoDaysFromNow(-2),
      updatedAt: isoDaysFromNow(-2),
      createdBy: "Saffin Khan",
      rowCount: 22,
      previewLines: [
        "Training Matrix",
        "",
        "Employee,Course,Status,Due",
        "Ana Torres,People Partner essentials,Completed,2026-05-01",
      ],
    },
  ];

  const activity = [
    {
      id: "act-1",
      at: isoDaysFromNow(0),
      label: "Leave approved",
      detail: "Elena Ruiz — Sick Leave (3 days)",
    },
    {
      id: "act-2",
      at: isoDaysFromNow(-1),
      label: "New vacancy created",
      detail: "Senior Full-Stack Engineer — Barcelona",
    },
    {
      id: "act-3",
      at: isoDaysFromNow(-2),
      label: "Candidate hired",
      detail: "Helen Park — Training Coordinator",
    },
    {
      id: "act-4",
      at: isoDaysFromNow(-3),
      label: "Performance review completed",
      detail: "Pablo Serrano — FY 2025",
    },
    {
      id: "act-5",
      at: isoDaysFromNow(-4),
      label: "Employee added",
      detail: "David Llorens — Finance Analyst",
    },
  ];

  return {
    leaveRequests,
    leaveBalances,
    publicHolidays,
    vacancies,
    candidates,
    reviews,
    reports,
    activity,
  };
}

let state = seedState();
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

function pushActivity(label: string, detail: string) {
  state = {
    ...state,
    activity: [
      { id: uid("act"), at: isoDaysFromNow(0), label, detail },
      ...state.activity,
    ].slice(0, 40),
  };
}

export function subscribeHrMockStore(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getHrMockSnapshot(): HrMockState {
  return state;
}

export function resetHrMockStore() {
  state = seedState();
  emit();
}

/* —— Leave —— */

export function listLeaveRequests() {
  return state.leaveRequests;
}

export function listLeaveBalances() {
  return state.leaveBalances;
}

export function listPublicHolidays() {
  return state.publicHolidays;
}

export function updateLeaveRequestStatus(id: string, status: HrLeaveStatus) {
  state = {
    ...state,
    leaveRequests: state.leaveRequests.map((request) =>
      request.id === id
        ? {
            ...request,
            status,
            decidedAt: status === "pending" ? null : isoDaysFromNow(0),
          }
        : request,
    ),
  };
  const request = state.leaveRequests.find((item) => item.id === id);
  if (request) {
    pushActivity(
      status === "approved" ? "Leave approved" : status === "rejected" ? "Leave rejected" : "Leave updated",
      `${request.employeeName} — ${request.type} (${request.days} days)`,
    );
  }
  emit();
}

export function upsertLeaveRequest(input: Partial<HrLeaveRequest> & { id?: string }) {
  const existing = input.id ? state.leaveRequests.find((item) => item.id === input.id) : null;
  const startDate = input.startDate ?? existing?.startDate ?? isoDaysFromNow(1);
  const endDate = input.endDate ?? existing?.endDate ?? startDate;
  const next: HrLeaveRequest = {
    id: existing?.id ?? uid("leave"),
    employeeId: input.employeeId ?? existing?.employeeId ?? "",
    employeeName: input.employeeName ?? existing?.employeeName ?? "Employee",
    department: input.department ?? existing?.department ?? "Operations",
    location: input.location ?? existing?.location ?? "Barcelona",
    role: input.role ?? existing?.role ?? "Team Member",
    managerName: input.managerName ?? existing?.managerName ?? "Manager",
    type: input.type ?? existing?.type ?? "annual",
    startDate,
    endDate,
    days: input.days ?? businessDaysBetween(startDate, endDate),
    status: input.status ?? existing?.status ?? "pending",
    notes: input.notes ?? existing?.notes ?? "",
    requestedAt: existing?.requestedAt ?? isoDaysFromNow(0),
    decidedAt: input.status && input.status !== "pending" ? isoDaysFromNow(0) : (existing?.decidedAt ?? null),
  };
  state = {
    ...state,
    leaveRequests: existing
      ? state.leaveRequests.map((item) => (item.id === existing.id ? next : item))
      : [next, ...state.leaveRequests],
  };
  pushActivity(existing ? "Leave updated" : "Leave requested", `${next.employeeName} — ${next.type}`);
  emit();
  return next;
}

export function getLeaveBalanceForEmployee(employeeId: string) {
  return state.leaveBalances.find((item) => item.employeeId === employeeId) ?? null;
}

export function getLeaveRequestsForEmployee(employeeId: string) {
  return state.leaveRequests.filter((item) => item.employeeId === employeeId);
}

/* —— Recruitment —— */

export function listVacancies() {
  return state.vacancies;
}

export function listCandidates() {
  return state.candidates;
}

export function moveCandidateStage(id: string, stage?: HrPipelineStage) {
  state = {
    ...state,
    candidates: state.candidates.map((candidate) => {
      if (candidate.id !== id || candidate.rejected) return candidate;
      const nextStage = stage ?? nextPipelineStage(candidate.stage) ?? candidate.stage;
      return { ...candidate, stage: nextStage };
    }),
  };
  const candidate = state.candidates.find((item) => item.id === id);
  if (candidate) pushActivity("Candidate stage updated", `${candidate.name} → ${candidate.stage}`);
  emit();
}

export function rejectCandidate(id: string) {
  state = {
    ...state,
    candidates: state.candidates.map((candidate) =>
      candidate.id === id ? { ...candidate, rejected: true } : candidate,
    ),
  };
  const candidate = state.candidates.find((item) => item.id === id);
  if (candidate) pushActivity("Candidate rejected", `${candidate.name} — ${candidate.role}`);
  emit();
}

export function offerCandidate(id: string) {
  moveCandidateStage(id, "offer");
}

/* —— Performance —— */

export function listPerformanceReviews() {
  return state.reviews;
}

export function getReviewsForEmployee(employeeId: string) {
  return state.reviews
    .filter((review) => review.employeeId === employeeId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function savePerformanceReview(review: HrPerformanceReview) {
  const exists = state.reviews.some((item) => item.id === review.id);
  state = {
    ...state,
    reviews: exists
      ? state.reviews.map((item) => (item.id === review.id ? review : item))
      : [review, ...state.reviews],
  };
  pushActivity("Performance review saved", `${review.employeeName} — ${review.reviewPeriod}`);
  emit();
  return review;
}

export function setReviewStatus(id: string, status: HrReviewStatus) {
  state = {
    ...state,
    reviews: state.reviews.map((review) => {
      if (review.id !== id) return review;
      return {
        ...review,
        status,
        updatedAt: isoDaysFromNow(0),
        submittedAt: status === "submitted" || status === "approved" || status === "completed"
          ? review.submittedAt ?? isoDaysFromNow(0)
          : review.submittedAt,
        approvedAt:
          status === "approved" || status === "completed"
            ? review.approvedAt ?? isoDaysFromNow(0)
            : review.approvedAt,
        completedAt: status === "completed" ? isoDaysFromNow(0) : review.completedAt,
      };
    }),
  };
  const review = state.reviews.find((item) => item.id === id);
  if (review) {
    pushActivity(
      status === "completed" ? "Performance review completed" : "Performance review updated",
      `${review.employeeName} — ${review.reviewPeriod}`,
    );
  }
  emit();
}

export function createDraftReviewForEmployee(input: {
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;
  managerName: string;
}) {
  const review: HrPerformanceReview = {
    id: uid("rev"),
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    department: input.department,
    role: input.role,
    managerName: input.managerName,
    reviewPeriod: "Current cycle",
    status: "draft",
    overallRating: null,
    strengths: "",
    areasForImprovement: "",
    trainingRecommendations: "",
    promotionRecommendation: null,
    salaryReviewRecommendation: null,
    managerRecommendation: null,
    employeeGoals: "",
    nextReviewDate: isoDaysFromNow(90),
    summary: "",
    responses: blankQuestionResponses(),
    objectives: [],
    competencies: [],
    developmentPlan: [],
    createdAt: isoDaysFromNow(0),
    updatedAt: isoDaysFromNow(0),
    submittedAt: null,
    approvedAt: null,
    completedAt: null,
  };
  return savePerformanceReview(review);
}

/* —— Reports —— */

export function listHrReports() {
  return state.reports;
}

export function deleteHrReport(id: string) {
  state = { ...state, reports: state.reports.filter((item) => item.id !== id) };
  emit();
}

export function duplicateHrReport(id: string) {
  const source = state.reports.find((item) => item.id === id);
  if (!source) return null;
  const copy: HrSavedReport = {
    ...source,
    id: uid("rep"),
    name: `${source.name} (copy)`,
    createdAt: isoDaysFromNow(0),
    updatedAt: isoDaysFromNow(0),
  };
  state = { ...state, reports: [copy, ...state.reports] };
  emit();
  return copy;
}

export function generateHrReport(input: {
  kind: HrReportKind;
  output: HrReportOutput;
  filters: HrReportFilters;
  name?: string;
  createdBy?: string;
  previewLines?: string[];
  rowCount?: number;
}) {
  const report: HrSavedReport = {
    id: uid("rep"),
    name: input.name?.trim() || defaultReportName(input.kind),
    kind: input.kind,
    output: input.output,
    filters: input.filters,
    createdAt: isoDaysFromNow(0),
    updatedAt: isoDaysFromNow(0),
    createdBy: input.createdBy ?? "HR Administrator",
    rowCount: input.rowCount ?? 12,
    previewLines: input.previewLines ?? sampleReportPreview(input.kind, input.filters),
  };
  state = { ...state, reports: [report, ...state.reports] };
  pushActivity("HR report generated", report.name);
  emit();
  return report;
}

export function updateHrReport(id: string, patch: Partial<HrSavedReport>) {
  state = {
    ...state,
    reports: state.reports.map((report) =>
      report.id === id ? { ...report, ...patch, updatedAt: isoDaysFromNow(0) } : report,
    ),
  };
  emit();
}

export function listHrActivity() {
  return state.activity;
}

/** Align leave balances to live employees when IDs differ (demo fallback by name). */
export function resolveLeaveBalanceForLiveEmployee(employee: HrEmployee) {
  const byId = state.leaveBalances.find((item) => item.employeeId === employee.id);
  if (byId) return byId;
  const fullName = (employee.fullName || employee.preferredName).trim();
  return (
    state.leaveBalances.find(
      (item) => item.employeeName.toLowerCase() === fullName.toLowerCase(),
    ) ?? null
  );
}
