/**
 * Type-only payload for Action Framework plan confirmation.
 * Approve UI lives exclusively in PlanViewer — do not add a second Confirm/Approve card.
 */

export type ActionConfirmationView = {
  planId: string;
  correlationId?: string;
  title: string;
  summary: string;
  status: string;
  aiRequest?: string | null;
  warnings: string[];
  permissionNotes: string[];
  actions: Array<{
    stepId: string;
    actionId: string;
    name: string;
    module: string;
    status: string;
    input: Record<string, unknown>;
    preview: {
      summary: string;
      affectedRecords: Array<{
        type: string;
        id?: string | null;
        label: string;
        change?: string;
      }>;
      warnings: string[];
      reversible: boolean;
    } | null;
    error?: string | null;
  }>;
  affectedRecords: Array<{
    type: string;
    id?: string | null;
    label: string;
    change?: string;
  }>;
};
