import {
  createBlankEmployeeInput,
  mapHrEmployee,
  type HrDocuments,
  type HrEmployee,
} from "@/lib/hr-data";
import {
  ensureHrEmployeesTable,
  withHrEmployeesTable,
} from "@/lib/internal-db-migrations";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type DbEmployee = Parameters<typeof mapHrEmployee>[0];

function requireHrSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return createSupabaseServerClient();
}

function buildEmployeePayload(input: Partial<HrEmployee>) {
  const payload: Record<string, string | number | HrDocuments | null> = {
    updated_at: new Date().toISOString(),
  };

  if (input.fullName !== undefined) payload.full_name = input.fullName.trim();
  if (input.email !== undefined) payload.email = input.email.trim();
  if (input.phone !== undefined) payload.phone = input.phone.trim();
  if (input.dateJoined !== undefined) payload.date_joined = input.dateJoined;
  if (input.location !== undefined) payload.location = input.location.trim();
  if (input.role !== undefined) payload.role = input.role.trim();
  if (input.department !== undefined) payload.department = input.department.trim();
  if (input.manager !== undefined) payload.manager = input.manager.trim();
  if (input.salaryCurrent !== undefined) payload.salary_current = input.salaryCurrent;
  if (input.salaryPrevious !== undefined) payload.salary_previous = input.salaryPrevious;
  if (input.salaryIncreaseDate !== undefined) {
    payload.salary_increase_date = input.salaryIncreaseDate || null;
  }
  if (input.salaryIncreaseAmount !== undefined) {
    payload.salary_increase_amount = input.salaryIncreaseAmount;
  }
  if (input.bonus !== undefined) payload.bonus = input.bonus;
  if (input.holidayCalendar !== undefined) payload.holiday_calendar = input.holidayCalendar;
  if (input.vacationDaysPerYear !== undefined) {
    payload.vacation_days_per_year = input.vacationDaysPerYear;
  }
  if (input.vacationDaysTaken !== undefined) payload.vacation_days_taken = input.vacationDaysTaken;
  if (input.documents !== undefined) payload.documents = input.documents;

  return payload;
}

export async function listHrEmployees(): Promise<HrEmployee[]> {
  await ensureHrEmployeesTable();
  return withHrEmployeesTable(async () => {
    const supabase = requireHrSupabase();
    const { data, error } = await supabase
      .from("hr_employees")
      .select("*")
      .order("full_name", { ascending: true });

    if (error) throw new Error(error.message);
    return (data as DbEmployee[]).map(mapHrEmployee);
  });
}

export async function createHrEmployee(
  input: Partial<HrEmployee> & { fullName: string },
): Promise<HrEmployee> {
  await ensureHrEmployeesTable();
  return withHrEmployeesTable(async () => {
    const supabase = requireHrSupabase();
    const blank = createBlankEmployeeInput();
    const id = `hr-${crypto.randomUUID().slice(0, 8)}`;

    const { data, error } = await supabase
      .from("hr_employees")
      .insert({
        id,
        full_name: input.fullName.trim(),
        email: input.email?.trim() || `${id}@unit311.com`,
        phone: input.phone?.trim() || "",
        date_joined: input.dateJoined ?? blank.dateJoined,
        location: input.location?.trim() || blank.location,
        role: input.role?.trim() || blank.role,
        department: input.department?.trim() || blank.department,
        manager: input.manager?.trim() || blank.manager,
        salary_current: input.salaryCurrent ?? blank.salaryCurrent,
        salary_previous: input.salaryPrevious ?? blank.salaryPrevious,
        salary_increase_date: input.salaryIncreaseDate ?? null,
        salary_increase_amount: input.salaryIncreaseAmount ?? blank.salaryIncreaseAmount,
        bonus: input.bonus ?? blank.bonus,
        holiday_calendar: input.holidayCalendar ?? blank.holidayCalendar,
        vacation_days_per_year: input.vacationDaysPerYear ?? blank.vacationDaysPerYear,
        vacation_days_taken: input.vacationDaysTaken ?? blank.vacationDaysTaken,
        documents: input.documents ?? blank.documents,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return mapHrEmployee(data as DbEmployee);
  });
}

export async function updateHrEmployee(
  id: string,
  patch: Partial<HrEmployee>,
): Promise<HrEmployee> {
  return withHrEmployeesTable(async () => {
    const supabase = requireHrSupabase();
    const payload = buildEmployeePayload(patch);

    const { data, error } = await supabase
      .from("hr_employees")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return mapHrEmployee(data as DbEmployee);
  });
}

export async function deleteHrEmployee(id: string) {
  return withHrEmployeesTable(async () => {
    const supabase = requireHrSupabase();
    const { error } = await supabase.from("hr_employees").delete().eq("id", id);
    if (error) throw new Error(error.message);
  });
}
