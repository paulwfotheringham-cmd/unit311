const STACK_ROWS = [
  { function: "CRM", product: "Pipedrive Professional", cost: "US$5,345" },
  { function: "HR", product: "PeopleHR Pro", cost: "US$1,148" },
  { function: "Project Management", product: "Zoho Projects", cost: "US$600" },
  { function: "Asset Management", product: "Sortly", cost: "US$1,000" },
  { function: "Support Desk", product: "Zoho Desk", cost: "US$840" },
  { function: "Messaging, Voice & Video", product: "Microsoft Teams Essentials", cost: "US$480" },
  { function: "Learning Management", product: "TalentLMS", cost: "US$500" },
  { function: "Social Media", product: "Buffer", cost: "US$800" },
  { function: "Expense Management", product: "Expensify", cost: "US$800" },
  { function: "File Repository", product: "SharePoint / OneDrive", cost: "US$100" },
  {
    function: "Internal Research Time",
    product: "Estimated 130 hours @ US$30/hr",
    cost: "US$3,900",
  },
  {
    function: "Internal Implementation",
    product: "Estimated internal implementation effort",
    cost: "US$7,000",
  },
] as const;

export default function HomeBusinessCaseStackTable() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-5 sm:mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/90 sm:text-[13px] sm:tracking-[0.12em] lg:leading-snug">
          The Hidden Cost of Multiple Business Applications
        </h3>
        <p className="mt-2 text-[11px] leading-relaxed text-white/45 sm:text-xs">
          Most growing businesses gradually accumulate software to solve individual problems. The
          result is higher subscription costs, duplicated data, disconnected workflows and more time
          spent managing systems instead of running the business.
        </p>
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-sky-300/20 bg-sky-400/[0.06] shadow-[inset_0_1px_0_rgba(186,230,253,0.12)] md:block">
        <table className="w-full table-fixed border-collapse text-left text-[9px] leading-snug lg:text-[10px]">
          <colgroup>
            <col className="w-[32%]" />
            <col className="w-[38%]" />
            <col className="w-[30%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-white/[0.08] bg-sky-400/[0.05]">
              <th className="px-2 py-2 font-semibold uppercase tracking-[0.08em] text-white/55 lg:px-2.5 lg:py-2">
                Function
              </th>
              <th className="px-2 py-2 font-semibold uppercase tracking-[0.08em] text-white/55 lg:px-2.5 lg:py-2">
                Example Product
              </th>
              <th className="px-2 py-2 text-right font-semibold uppercase tracking-[0.08em] text-white/55 lg:px-2.5 lg:py-2">
                Annual Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {STACK_ROWS.map((row, index) => (
              <tr
                key={row.function}
                className={
                  index % 2 === 0
                    ? "border-b border-sky-300/10 bg-transparent"
                    : "border-b border-sky-300/10 bg-sky-400/[0.04]"
                }
              >
                <td className="break-words px-2 py-1.5 align-top font-medium text-white/75 lg:px-2.5 lg:py-1.5">
                  {row.function}
                </td>
                <td className="break-words px-2 py-1.5 align-top text-white/50 lg:px-2.5 lg:py-1.5">{row.product}</td>
                <td className="px-2 py-1.5 text-right font-medium tabular-nums text-white/70 lg:px-2.5 lg:py-1.5">
                  {row.cost}
                </td>
              </tr>
            ))}
            <tr className="border-t border-[#3b82f6]/30 bg-gradient-to-r from-[#2563eb]/[0.18] via-[#1d4ed8]/[0.12] to-[#2563eb]/[0.06]">
              <td
                colSpan={2}
                className="px-2 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#bfdbfe] lg:px-2.5 lg:py-3 lg:text-[11px]"
              >
                Illustrative Annual Software Spend
              </td>
              <td className="px-2 py-2.5 text-right text-xs font-bold tabular-nums text-white lg:px-2.5 lg:py-3 lg:text-sm">
                US$22,513
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {STACK_ROWS.map((row) => (
          <article
            key={row.function}
            className="rounded-xl border border-sky-300/20 bg-sky-400/[0.06] px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold text-white/80">{row.function}</p>
              <p className="shrink-0 text-xs font-medium tabular-nums text-white/70">{row.cost}</p>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-white/45">{row.product}</p>
          </article>
        ))}
        <article className="rounded-xl border border-[#3b82f6]/30 bg-gradient-to-r from-[#2563eb]/[0.18] to-[#2563eb]/[0.06] px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#bfdbfe]">
              Illustrative Annual Software Spend
            </p>
            <p className="shrink-0 text-sm font-bold tabular-nums text-white">US$22,513</p>
          </div>
        </article>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-white/35 sm:mt-4 sm:text-[11px]">
        Illustrative estimates based on typical vendor pricing for a business of approximately 10
        users. Actual costs vary by provider, plan tier, implementation scope and internal resourcing.
      </p>
    </div>
  );
}
