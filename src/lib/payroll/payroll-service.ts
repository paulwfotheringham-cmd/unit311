import { randomUUID } from "node:crypto";

import { isBoardPackPayrollEligible, type HrEmployee } from "@/lib/hr-data";
import { listHrEmployees, getHrEmployee } from "@/lib/hr-employees-service";
import { resolveHrWorkspaceId, type HrWorkspaceScope } from "@/lib/hr-workspace";
import {
  calculateEmployeePayroll,
  nextPayDateFromSettings,
  periodBoundsForPayDate,
} from "@/lib/payroll/engine";
import { glJournalProvider } from "@/lib/payroll/providers/journal-provider";
import { wisePaymentProvider } from "@/lib/payroll/providers/wise-payment-provider";
import {
  DEFAULT_PAYROLL_SETTINGS,
  type PayrollDashboardSnapshot,
  type PayrollEmployeeProfile,
  type PayrollFrequency,
  type PayrollRun,
  type PayrollRunLine,
  type PayrollRunStatus,
  type PayrollSettings,
  type WisePaymentStatus,
  roundPayrollMoney,
} from "@/lib/payroll/types";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

function requireDb() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

function mapSettings(row: Record<string, unknown>, workspaceId: string): PayrollSettings {
  return {
    workspaceId,
    federalTaxPct: Number(row.federal_tax_pct ?? DEFAULT_PAYROLL_SETTINGS.federalTaxPct),
    stateTaxPct: Number(row.state_tax_pct ?? DEFAULT_PAYROLL_SETTINGS.stateTaxPct),
    socialSecurityPct: Number(row.social_security_pct ?? DEFAULT_PAYROLL_SETTINGS.socialSecurityPct),
    medicarePct: Number(row.medicare_pct ?? DEFAULT_PAYROLL_SETTINGS.medicarePct),
    employerPayrollPct: Number(
      row.employer_payroll_pct ?? DEFAULT_PAYROLL_SETTINGS.employerPayrollPct,
    ),
    defaultCurrency: String(row.default_currency ?? DEFAULT_PAYROLL_SETTINGS.defaultCurrency),
    payrollFrequency: String(
      row.payroll_frequency ?? DEFAULT_PAYROLL_SETTINGS.payrollFrequency,
    ) as PayrollFrequency,
    payDay: Number(row.pay_day ?? DEFAULT_PAYROLL_SETTINGS.payDay),
    countryCode: String(row.country_code ?? DEFAULT_PAYROLL_SETTINGS.countryCode),
    defaultTaxState: String(row.default_tax_state ?? DEFAULT_PAYROLL_SETTINGS.defaultTaxState),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapProfile(row: Record<string, unknown>): PayrollEmployeeProfile {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    employeeId: String(row.employee_id),
    annualSalary: row.annual_salary == null ? null : Number(row.annual_salary),
    monthlySalary: row.monthly_salary == null ? null : Number(row.monthly_salary),
    hourlyRate: row.hourly_rate == null ? null : Number(row.hourly_rate),
    bonus: Number(row.bonus ?? 0),
    commission: Number(row.commission ?? 0),
    payrollFrequency: String(row.payroll_frequency ?? "monthly") as PayrollFrequency,
    currency: String(row.currency ?? "USD"),
    taxState: String(row.tax_state ?? "CA"),
    federalTaxPct: row.federal_tax_pct == null ? null : Number(row.federal_tax_pct),
    stateTaxPct: row.state_tax_pct == null ? null : Number(row.state_tax_pct),
    socialSecurityPct: row.social_security_pct == null ? null : Number(row.social_security_pct),
    medicarePct: row.medicare_pct == null ? null : Number(row.medicare_pct),
    employerPayrollPct:
      row.employer_payroll_pct == null ? null : Number(row.employer_payroll_pct),
    payrollStatus: String(row.payroll_status ?? "active") as PayrollEmployeeProfile["payrollStatus"],
    bankAccount: String(row.bank_account ?? ""),
    routingNumber: String(row.routing_number ?? ""),
    payrollEmployeeId: String(row.payroll_employee_id ?? ""),
    taxId: String(row.tax_id ?? ""),
    hireDate: row.hire_date ? String(row.hire_date) : null,
    terminationDate: row.termination_date ? String(row.termination_date) : null,
    manager: String(row.manager ?? ""),
    department: String(row.department ?? ""),
    costCentre: String(row.cost_centre ?? ""),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapLine(row: Record<string, unknown>): PayrollRunLine {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    runId: String(row.run_id),
    employeeId: String(row.employee_id),
    employeeName: String(row.employee_name ?? ""),
    department: String(row.department ?? ""),
    costCentre: String(row.cost_centre ?? ""),
    gross: Number(row.gross ?? 0),
    bonus: Number(row.bonus ?? 0),
    commission: Number(row.commission ?? 0),
    federalTax: Number(row.federal_tax ?? 0),
    stateTax: Number(row.state_tax ?? 0),
    socialSecurity: Number(row.social_security ?? 0),
    medicare: Number(row.medicare ?? 0),
    employerTax: Number(row.employer_tax ?? 0),
    net: Number(row.net ?? 0),
    totalEmploymentCost: Number(row.total_employment_cost ?? 0),
    currency: String(row.currency ?? "USD"),
  };
}

function mapRun(row: Record<string, unknown>, lines?: PayrollRunLine[]): PayrollRun {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    periodStart: String(row.period_start),
    periodEnd: String(row.period_end),
    payDate: String(row.pay_date),
    status: String(row.status ?? "draft") as PayrollRunStatus,
    employeeCount: Number(row.employee_count ?? 0),
    grossPayroll: Number(row.gross_payroll ?? 0),
    employeeTax: Number(row.employee_tax ?? 0),
    employerTax: Number(row.employer_tax ?? 0),
    netPayroll: Number(row.net_payroll ?? 0),
    currency: String(row.currency ?? "USD"),
    journalEntryId: row.journal_entry_id ? String(row.journal_entry_id) : null,
    paymentJournalEntryId: row.payment_journal_entry_id
      ? String(row.payment_journal_entry_id)
      : null,
    wiseBatchId: row.wise_batch_id ? String(row.wise_batch_id) : null,
    wisePaymentStatus: String(row.wise_payment_status ?? "none") as WisePaymentStatus,
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
    approvedAt: row.approved_at ? String(row.approved_at) : null,
    paidAt: row.paid_at ? String(row.paid_at) : null,
    lines,
  };
}

export async function getPayrollSettings(scope?: HrWorkspaceScope): Promise<PayrollSettings> {
  const workspaceId = await resolveHrWorkspaceId(scope);
  const supabase = requireDb();
  const { data, error } = await supabase
    .from("payroll_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) {
    if (error.message.includes("does not exist") || error.code === "42P01") {
      return { ...DEFAULT_PAYROLL_SETTINGS, workspaceId, updatedAt: new Date().toISOString() };
    }
    throw new Error(error.message);
  }
  if (!data) {
    const now = new Date().toISOString();
    const insert = {
      workspace_id: workspaceId,
      federal_tax_pct: DEFAULT_PAYROLL_SETTINGS.federalTaxPct,
      state_tax_pct: DEFAULT_PAYROLL_SETTINGS.stateTaxPct,
      social_security_pct: DEFAULT_PAYROLL_SETTINGS.socialSecurityPct,
      medicare_pct: DEFAULT_PAYROLL_SETTINGS.medicarePct,
      employer_payroll_pct: DEFAULT_PAYROLL_SETTINGS.employerPayrollPct,
      default_currency: DEFAULT_PAYROLL_SETTINGS.defaultCurrency,
      payroll_frequency: DEFAULT_PAYROLL_SETTINGS.payrollFrequency,
      pay_day: DEFAULT_PAYROLL_SETTINGS.payDay,
      country_code: DEFAULT_PAYROLL_SETTINGS.countryCode,
      default_tax_state: DEFAULT_PAYROLL_SETTINGS.defaultTaxState,
      updated_at: now,
    };
    const { data: created, error: insertError } = await supabase
      .from("payroll_settings")
      .upsert(insert, { onConflict: "workspace_id" })
      .select("*")
      .single();
    if (insertError) {
      return { ...DEFAULT_PAYROLL_SETTINGS, workspaceId, updatedAt: now };
    }
    return mapSettings(created as Record<string, unknown>, workspaceId);
  }
  return mapSettings(data as Record<string, unknown>, workspaceId);
}

export async function updatePayrollSettings(
  patch: Partial<PayrollSettings>,
  scope?: HrWorkspaceScope,
): Promise<PayrollSettings> {
  const current = await getPayrollSettings(scope);
  const workspaceId = current.workspaceId;
  const supabase = requireDb();
  const next = {
    workspace_id: workspaceId,
    federal_tax_pct: patch.federalTaxPct ?? current.federalTaxPct,
    state_tax_pct: patch.stateTaxPct ?? current.stateTaxPct,
    social_security_pct: patch.socialSecurityPct ?? current.socialSecurityPct,
    medicare_pct: patch.medicarePct ?? current.medicarePct,
    employer_payroll_pct: patch.employerPayrollPct ?? current.employerPayrollPct,
    default_currency: patch.defaultCurrency ?? current.defaultCurrency,
    payroll_frequency: patch.payrollFrequency ?? current.payrollFrequency,
    pay_day: patch.payDay ?? current.payDay,
    country_code: patch.countryCode ?? current.countryCode,
    default_tax_state: patch.defaultTaxState ?? current.defaultTaxState,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("payroll_settings")
    .upsert(next, { onConflict: "workspace_id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapSettings(data as Record<string, unknown>, workspaceId);
}

export async function getEmployeePayrollProfile(
  employeeId: string,
  scope?: HrWorkspaceScope,
): Promise<PayrollEmployeeProfile | null> {
  const workspaceId = await resolveHrWorkspaceId(scope);
  const supabase = requireDb();
  const { data, error } = await supabase
    .from("payroll_employee_profiles")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("employee_id", employeeId)
    .maybeSingle();
  if (error) {
    if (error.message.includes("does not exist") || error.code === "42P01") return null;
    throw new Error(error.message);
  }
  return data ? mapProfile(data as Record<string, unknown>) : null;
}

export async function upsertEmployeePayrollProfile(
  employeeId: string,
  patch: Partial<PayrollEmployeeProfile>,
  scope?: HrWorkspaceScope,
): Promise<PayrollEmployeeProfile> {
  const workspaceId = await resolveHrWorkspaceId(scope);
  const existing = await getEmployeePayrollProfile(employeeId, { workspaceId });
  const employee = await getHrEmployee(employeeId, { workspaceId });
  if (!employee) throw new Error("Employee not found.");

  const id = existing?.id ?? randomUUID();
  const now = new Date().toISOString();
  const row = {
    id,
    workspace_id: workspaceId,
    employee_id: employeeId,
    annual_salary: patch.annualSalary ?? existing?.annualSalary ?? null,
    monthly_salary: patch.monthlySalary ?? existing?.monthlySalary ?? null,
    hourly_rate: patch.hourlyRate ?? existing?.hourlyRate ?? null,
    bonus: patch.bonus ?? existing?.bonus ?? Number(employee.bonus || 0),
    commission: patch.commission ?? existing?.commission ?? 0,
    payroll_frequency:
      patch.payrollFrequency ?? existing?.payrollFrequency ?? "monthly",
    currency: patch.currency ?? existing?.currency ?? employee.currency ?? "USD",
    tax_state: patch.taxState ?? existing?.taxState ?? "CA",
    federal_tax_pct: patch.federalTaxPct ?? existing?.federalTaxPct ?? null,
    state_tax_pct: patch.stateTaxPct ?? existing?.stateTaxPct ?? null,
    social_security_pct: patch.socialSecurityPct ?? existing?.socialSecurityPct ?? null,
    medicare_pct: patch.medicarePct ?? existing?.medicarePct ?? null,
    employer_payroll_pct: patch.employerPayrollPct ?? existing?.employerPayrollPct ?? null,
    payroll_status: patch.payrollStatus ?? existing?.payrollStatus ?? "active",
    bank_account: patch.bankAccount ?? existing?.bankAccount ?? "",
    routing_number: patch.routingNumber ?? existing?.routingNumber ?? "",
    payroll_employee_id:
      patch.payrollEmployeeId ?? existing?.payrollEmployeeId ?? employee.employeeNumber ?? "",
    tax_id: patch.taxId ?? existing?.taxId ?? "",
    hire_date: patch.hireDate ?? existing?.hireDate ?? employee.dateJoined ?? null,
    termination_date:
      patch.terminationDate ?? existing?.terminationDate ?? employee.endDate ?? null,
    manager: patch.manager ?? existing?.manager ?? employee.manager ?? "",
    department: patch.department ?? existing?.department ?? employee.department ?? "",
    cost_centre: patch.costCentre ?? existing?.costCentre ?? "",
    updated_at: now,
  };

  const supabase = requireDb();
  const { data, error } = await supabase
    .from("payroll_employee_profiles")
    .upsert(row, { onConflict: "workspace_id,employee_id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapProfile(data as Record<string, unknown>);
}

function eligibleEmployees(employees: HrEmployee[]) {
  return employees.filter((employee) => isBoardPackPayrollEligible(employee.employmentStatus));
}

export async function calculateLivePayrollSnapshot(scope?: HrWorkspaceScope) {
  const workspaceId = await resolveHrWorkspaceId(scope);
  const [settings, employees] = await Promise.all([
    getPayrollSettings({ workspaceId }),
    listHrEmployees({ workspaceId }),
  ]);
  const supabase = requireDb();
  const { data: profiles } = await supabase
    .from("payroll_employee_profiles")
    .select("*")
    .eq("workspace_id", workspaceId);
  const profileByEmployee = new Map(
    (profiles ?? []).map((row) => {
      const profile = mapProfile(row as Record<string, unknown>);
      return [profile.employeeId, profile] as const;
    }),
  );

  const lines = eligibleEmployees(employees)
    .filter((employee) => {
      const profile = profileByEmployee.get(employee.id);
      return !profile || profile.payrollStatus === "active";
    })
    .map((employee) => {
      const profile = profileByEmployee.get(employee.id) ?? null;
      const calc = calculateEmployeePayroll(
        {
          salaryCurrent: employee.salaryCurrent,
          bonus: employee.bonus,
          payFrequency: employee.payFrequency,
          currency: employee.currency,
          profile,
        },
        settings,
      );
      return {
        employee,
        profile,
        calc,
        department: profile?.department || employee.department || "Unassigned",
      };
    });

  const monthlyGross = roundPayrollMoney(lines.reduce((sum, line) => sum + line.calc.gross, 0));
  const employeeTax = roundPayrollMoney(
    lines.reduce((sum, line) => sum + line.calc.employeeTaxTotal, 0),
  );
  const employerTax = roundPayrollMoney(
    lines.reduce((sum, line) => sum + line.calc.employerTax, 0),
  );
  const net = roundPayrollMoney(lines.reduce((sum, line) => sum + line.calc.net, 0));

  return {
    settings,
    lines,
    monthlyGross,
    employeeTax,
    employerTax,
    net,
    employeeCount: lines.length,
    averageSalary:
      lines.length === 0 ? 0 : roundPayrollMoney(monthlyGross / lines.length),
    nextPayrollDate: nextPayDateFromSettings(settings),
    currency: settings.defaultCurrency,
  };
}

export async function listPayrollRuns(scope?: HrWorkspaceScope): Promise<PayrollRun[]> {
  const workspaceId = await resolveHrWorkspaceId(scope);
  const supabase = requireDb();
  const { data, error } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("pay_date", { ascending: false })
    .limit(50);
  if (error) {
    if (error.message.includes("does not exist") || error.code === "42P01") return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => mapRun(row as Record<string, unknown>));
}

export async function getPayrollRun(
  runId: string,
  scope?: HrWorkspaceScope,
): Promise<PayrollRun | null> {
  const workspaceId = await resolveHrWorkspaceId(scope);
  const supabase = requireDb();
  const { data, error } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", runId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const { data: lines, error: linesError } = await supabase
    .from("payroll_run_lines")
    .select("*")
    .eq("run_id", runId)
    .order("employee_name", { ascending: true });
  if (linesError) throw new Error(linesError.message);
  return mapRun(
    data as Record<string, unknown>,
    (lines ?? []).map((row) => mapLine(row as Record<string, unknown>)),
  );
}

export async function createPayrollRun(
  input?: { payDate?: string; notes?: string },
  scope?: HrWorkspaceScope,
): Promise<PayrollRun> {
  const workspaceId = await resolveHrWorkspaceId(scope);
  const live = await calculateLivePayrollSnapshot({ workspaceId });
  const payDate = input?.payDate || live.nextPayrollDate;
  const bounds = periodBoundsForPayDate(payDate, live.settings.payrollFrequency);
  const runId = randomUUID();
  const now = new Date().toISOString();

  const runRow = {
    id: runId,
    workspace_id: workspaceId,
    period_start: bounds.periodStart,
    period_end: bounds.periodEnd,
    pay_date: payDate,
    status: "draft",
    employee_count: live.employeeCount,
    gross_payroll: live.monthlyGross,
    employee_tax: live.employeeTax,
    employer_tax: live.employerTax,
    net_payroll: live.net,
    currency: live.currency,
    wise_payment_status: "none",
    notes: input?.notes ?? "",
    created_at: now,
    updated_at: now,
  };

  const lineRows = live.lines.map((line) => ({
    id: randomUUID(),
    workspace_id: workspaceId,
    run_id: runId,
    employee_id: line.employee.id,
    employee_name: line.employee.fullName,
    department: line.department,
    cost_centre: line.profile?.costCentre ?? "",
    gross: line.calc.gross,
    bonus: line.calc.bonus,
    commission: line.calc.commission,
    federal_tax: line.calc.federalTax,
    state_tax: line.calc.stateTax,
    social_security: line.calc.socialSecurity,
    medicare: line.calc.medicare,
    employer_tax: line.calc.employerTax,
    net: line.calc.net,
    total_employment_cost: line.calc.totalEmploymentCost,
    currency: line.calc.currency,
  }));

  const supabase = requireDb();
  const { error } = await supabase.from("payroll_runs").insert(runRow);
  if (error) throw new Error(error.message);
  if (lineRows.length > 0) {
    const { error: linesError } = await supabase.from("payroll_run_lines").insert(lineRows);
    if (linesError) throw new Error(linesError.message);
  }

  return (await getPayrollRun(runId, { workspaceId }))!;
}

const STATUS_FLOW: Record<PayrollRunStatus, PayrollRunStatus[]> = {
  draft: ["ready", "cancelled"],
  ready: ["approved", "draft", "cancelled"],
  approved: ["processing", "cancelled"],
  processing: ["paid", "cancelled"],
  paid: [],
  cancelled: [],
};

export async function updatePayrollRunStatus(
  runId: string,
  status: PayrollRunStatus,
  scope?: HrWorkspaceScope,
): Promise<PayrollRun> {
  const workspaceId = await resolveHrWorkspaceId(scope);
  const run = await getPayrollRun(runId, { workspaceId });
  if (!run) throw new Error("Payroll run not found.");
  const allowed = STATUS_FLOW[run.status];
  if (!allowed.includes(status)) {
    throw new Error(`Cannot move payroll run from ${run.status} to ${status}.`);
  }

  const supabase = requireDb();
  const { error } = await supabase
    .from("payroll_runs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", runId)
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
  return (await getPayrollRun(runId, { workspaceId }))!;
}

export async function approvePayrollRun(
  runId: string,
  scope?: HrWorkspaceScope,
): Promise<PayrollRun> {
  const workspaceId = await resolveHrWorkspaceId(scope);
  let run = await getPayrollRun(runId, { workspaceId });
  if (!run) throw new Error("Payroll run not found.");
  if (run.status === "draft") {
    run = await updatePayrollRunStatus(runId, "ready", { workspaceId });
  }
  if (run.status !== "ready" && run.status !== "approved") {
    throw new Error(`Cannot approve payroll run in status ${run.status}.`);
  }

  if (!run.journalEntryId) {
    const journal = await glJournalProvider.postAccrual(run);
    const supabase = requireDb();
    const { error } = await supabase
      .from("payroll_runs")
      .update({
        status: "approved",
        journal_entry_id: journal.journalEntryId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", runId)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
  } else if (run.status !== "approved") {
    await updatePayrollRunStatus(runId, "approved", { workspaceId });
  }

  return (await getPayrollRun(runId, { workspaceId }))!;
}

export async function payPayrollRun(
  runId: string,
  scope?: HrWorkspaceScope,
): Promise<PayrollRun> {
  const workspaceId = await resolveHrWorkspaceId(scope);
  let run = await getPayrollRun(runId, { workspaceId });
  if (!run) throw new Error("Payroll run not found.");
  if (run.status !== "approved" && run.status !== "processing") {
    throw new Error("Payroll run must be approved before payment.");
  }

  const supabase = requireDb();
  await supabase
    .from("payroll_runs")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", runId)
    .eq("workspace_id", workspaceId);

  run = (await getPayrollRun(runId, { workspaceId }))!;
  const batch = await wisePaymentProvider.generateBatchPayment(run);
  if (batch.status === "failed") {
    await supabase
      .from("payroll_runs")
      .update({
        wise_batch_id: batch.batchId,
        wise_payment_status: "failed",
        notes: [run.notes, batch.message].filter(Boolean).join(" · "),
        updated_at: new Date().toISOString(),
      })
      .eq("id", runId);
    throw new Error(batch.message || "Wise payroll batch failed.");
  }

  run = {
    ...run,
    wiseBatchId: batch.batchId,
    wisePaymentStatus: batch.status === "paid" ? "paid" : "submitted",
  };

  const paymentJournal = await glJournalProvider.postPayment(run);
  const { error } = await supabase
    .from("payroll_runs")
    .update({
      status: "paid",
      wise_batch_id: batch.batchId,
      wise_payment_status: batch.status === "pending" ? "pending" : "paid",
      payment_journal_entry_id: paymentJournal.journalEntryId,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: [run.notes, batch.message].filter(Boolean).join(" · "),
    })
    .eq("id", runId)
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);

  return (await getPayrollRun(runId, { workspaceId }))!;
}

export async function getPayrollDashboard(
  scope?: HrWorkspaceScope,
): Promise<PayrollDashboardSnapshot> {
  const workspaceId = await resolveHrWorkspaceId(scope);
  const [live, runs] = await Promise.all([
    calculateLivePayrollSnapshot({ workspaceId }),
    listPayrollRuns({ workspaceId }),
  ]);

  const latest = runs[0] ?? null;
  const paidThisMonth = runs.filter((run) => {
    const month = new Date().toISOString().slice(0, 7);
    return run.status === "paid" && run.payDate.startsWith(month);
  });
  const pending = runs.filter((run) =>
    ["draft", "ready", "approved", "processing"].includes(run.status),
  );

  const deptMap = new Map<string, { gross: number; net: number; employees: number }>();
  for (const line of live.lines) {
    const key = line.department || "Unassigned";
    const current = deptMap.get(key) ?? { gross: 0, net: 0, employees: 0 };
    current.gross = roundPayrollMoney(current.gross + line.calc.gross);
    current.net = roundPayrollMoney(current.net + line.calc.net);
    current.employees += 1;
    deptMap.set(key, current);
  }

  const trendMonths: PayrollDashboardSnapshot["trend"] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date();
    date.setUTCMonth(date.getUTCMonth() - i);
    const month = date.toISOString().slice(0, 7);
    const monthRuns = runs.filter((run) => run.payDate.startsWith(month) && run.status === "paid");
    if (monthRuns.length > 0) {
      trendMonths.push({
        month,
        gross: roundPayrollMoney(monthRuns.reduce((sum, run) => sum + run.grossPayroll, 0)),
        net: roundPayrollMoney(monthRuns.reduce((sum, run) => sum + run.netPayroll, 0)),
        employerTax: roundPayrollMoney(monthRuns.reduce((sum, run) => sum + run.employerTax, 0)),
      });
    } else {
      trendMonths.push({
        month,
        gross: live.monthlyGross,
        net: live.net,
        employerTax: live.employerTax,
      });
    }
  }

  const upcoming: PayrollDashboardSnapshot["upcomingCalendar"] = [];
  let cursor = new Date();
  for (let i = 0; i < 3; i += 1) {
    const date = nextPayDateFromSettings(live.settings, cursor);
    upcoming.push({
      date,
      label: i === 0 ? "Next payroll" : `Payroll +${i}`,
      amount: live.monthlyGross,
    });
    const next = new Date(`${date}T12:00:00.000Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    cursor = next;
  }

  return {
    monthlyGrossPayroll: live.monthlyGross,
    estimatedEmployerTaxes: live.employerTax,
    estimatedEmployeeTaxWithheld: live.employeeTax,
    estimatedNetPayroll: live.net,
    nextPayrollDate: live.nextPayrollDate,
    payrollRunStatus: latest?.status ?? "none",
    employeesPaid: paidThisMonth.reduce((sum, run) => sum + run.employeeCount, 0),
    pendingPayroll: pending.length,
    averageSalary: live.averageSalary,
    currency: live.currency,
    employeeCount: live.employeeCount,
    trend: trendMonths,
    departmentBreakdown: [...deptMap.entries()]
      .map(([department, value]) => ({ department, ...value }))
      .sort((a, b) => b.gross - a.gross),
    upcomingCalendar: upcoming,
    recentRuns: runs.slice(0, 8),
  };
}
