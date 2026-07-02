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

const DETAILS: Record<string, ProjectDetail> = {
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
