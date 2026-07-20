"use client";

import Link from "next/link";
import { useMemo } from "react";

import {
  HR_REVIEW_STATUS_LABELS,
  reviewStatusClass,
} from "@/lib/hr-performance-data";
import { getInternalNavHref } from "@/lib/internal-operations-data";
import { useInternalOperationsBasePath } from "./InternalOperationsBasePathContext";
import { useHrMockStore } from "./useHrMockStore";
import {
  HrKpiTile,
  hrPrimaryButtonClass,
  HrSection,
  HrStatusPill,
} from "./hr-ui";

export default function PerformanceHubWorkspace() {
  const basePath = useInternalOperationsBasePath();
  const store = useHrMockStore();

  const due = useMemo(
    () =>
      store.reviews.filter(
        (review) =>
          review.status === "draft" ||
          review.status === "submitted" ||
          (review.nextReviewDate &&
            review.nextReviewDate <=
              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
      ),
    [store.reviews],
  );

  const byStatus = useMemo(() => {
    const counts = { draft: 0, submitted: 0, approved: 0, completed: 0 };
    for (const review of store.reviews) counts[review.status] += 1;
    return counts;
  }, [store.reviews]);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HrKpiTile label="Reviews Due" value={due.length} />
        <HrKpiTile label="Draft" value={byStatus.draft} />
        <HrKpiTile label="Submitted" value={byStatus.submitted} />
        <HrKpiTile label="Completed" value={byStatus.completed} />
      </section>

      <HrSection
        title="Performance Reviews"
        subtitle="Organisation-wide review queue. Open an employee to complete the full review form."
      >
        {store.reviews.length === 0 ? (
          <p className="text-sm text-white/50">
            No performance reviews are in progress. Open an employee record from HR to start a
            review cycle.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                <tr>
                  <th className="px-2 py-2">Employee</th>
                  <th className="px-2 py-2">Department</th>
                  <th className="px-2 py-2">Period</th>
                  <th className="px-2 py-2">Manager</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Rating</th>
                  <th className="px-2 py-2">Next review</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {store.reviews.map((review) => (
                  <tr key={review.id} className="border-t border-white/10">
                    <td className="px-2 py-2.5 font-medium text-white">{review.employeeName}</td>
                    <td className="px-2 py-2.5 text-white/60">{review.department}</td>
                    <td className="px-2 py-2.5 text-white/60">{review.reviewPeriod}</td>
                    <td className="px-2 py-2.5 text-white/60">{review.managerName}</td>
                    <td className="px-2 py-2.5">
                      <HrStatusPill className={reviewStatusClass(review.status)}>
                        {HR_REVIEW_STATUS_LABELS[review.status]}
                      </HrStatusPill>
                    </td>
                    <td className="px-2 py-2.5 tabular-nums text-white/70">
                      {review.overallRating ?? "—"}
                    </td>
                    <td className="px-2 py-2.5 tabular-nums text-white/60">
                      {review.nextReviewDate ?? "—"}
                    </td>
                    <td className="px-2 py-2.5">
                      <Link
                        href={getInternalNavHref("hr", basePath, {
                          employeeId: review.employeeId,
                          tab: "Performance",
                        })}
                        className={hrPrimaryButtonClass()}
                      >
                        Open employee
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </HrSection>
    </div>
  );
}
