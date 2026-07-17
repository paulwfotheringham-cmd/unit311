export type ClientOnboardingStage =
  | "signed_up"
  | "payment_received"
  | "questionnaire_complete"
  | "platform_clone_complete"
  | "review_complete"
  | "platform_live";

export type ClientOnboardingStatus = "In Progress" | "Platform Live";

export type ClientOnboardingAdvanceAction =
  | "payment_received"
  | "questionnaire_complete"
  | "platform_clone_complete"
  | "review_complete"
  | "platform_live";

export type ClientOnboardingRecord = {
  id: string;
  platformOrganisationId?: string | null;
  platformUserId?: string | null;
  companyName: string;
  contactName: string;
  contactEmail: string;
  signupDate: string;
  currentStage: ClientOnboardingStage;
  progressPercent: number;
  currentStatus: ClientOnboardingStatus;
  signedUpAt: string;
  signedUpBy?: string | null;
  paymentReceivedAt?: string | null;
  paymentReceivedBy?: string | null;
  questionnaireCompleteAt?: string | null;
  questionnaireCompleteBy?: string | null;
  platformCloneCompleteAt?: string | null;
  platformCloneCompleteBy?: string | null;
  reviewCompleteAt?: string | null;
  reviewCompleteBy?: string | null;
  platformLiveAt?: string | null;
  platformLiveBy?: string | null;
};

export type ClientOnboardingStageDefinition = {
  stage: ClientOnboardingStage;
  label: string;
  action?: ClientOnboardingAdvanceAction;
  buttonLabel?: string;
  automatic?: boolean;
};

export const CLIENT_ONBOARDING_STAGES: ClientOnboardingStageDefinition[] = [
  { stage: "signed_up", label: "Signed Up", automatic: true },
  {
    stage: "payment_received",
    label: "Payment Received",
    action: "payment_received",
    buttonLabel: "Payment Received",
  },
  {
    stage: "questionnaire_complete",
    label: "Questionnaire Complete",
    action: "questionnaire_complete",
    buttonLabel: "Questionnaire Complete",
  },
  {
    stage: "platform_clone_complete",
    label: "Platform Clone Complete",
    action: "platform_clone_complete",
    buttonLabel: "Clone Platform",
  },
  {
    stage: "review_complete",
    label: "Review Complete",
    action: "review_complete",
    buttonLabel: "Review Complete",
  },
  {
    stage: "platform_live",
    label: "Platform Live",
    action: "platform_live",
    buttonLabel: "Platform Ready",
  },
];

export const CLIENT_ONBOARDING_STAGE_ORDER = CLIENT_ONBOARDING_STAGES.map((item) => item.stage);

type DbClientOnboardingRecord = {
  id: string;
  platform_organisation_id: string | null;
  platform_user_id: string | null;
  company_name: string;
  contact_name: string;
  contact_email: string;
  signup_date: string;
  current_stage: ClientOnboardingStage;
  progress_percent: number;
  current_status: ClientOnboardingStatus;
  signed_up_at: string;
  signed_up_by: string | null;
  payment_received_at: string | null;
  payment_received_by: string | null;
  questionnaire_complete_at: string | null;
  questionnaire_complete_by: string | null;
  platform_clone_complete_at: string | null;
  platform_clone_complete_by: string | null;
  review_complete_at: string | null;
  review_complete_by: string | null;
  platform_live_at: string | null;
  platform_live_by: string | null;
};

export function mapClientOnboardingRecord(row: DbClientOnboardingRecord): ClientOnboardingRecord {
  return {
    id: row.id,
    platformOrganisationId: row.platform_organisation_id,
    platformUserId: row.platform_user_id,
    companyName: row.company_name,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    signupDate: row.signup_date,
    currentStage: row.current_stage,
    progressPercent: row.progress_percent,
    currentStatus: row.current_status,
    signedUpAt: row.signed_up_at,
    signedUpBy: row.signed_up_by,
    paymentReceivedAt: row.payment_received_at,
    paymentReceivedBy: row.payment_received_by,
    questionnaireCompleteAt: row.questionnaire_complete_at,
    questionnaireCompleteBy: row.questionnaire_complete_by,
    platformCloneCompleteAt: row.platform_clone_complete_at,
    platformCloneCompleteBy: row.platform_clone_complete_by,
    reviewCompleteAt: row.review_complete_at,
    reviewCompleteBy: row.review_complete_by,
    platformLiveAt: row.platform_live_at,
    platformLiveBy: row.platform_live_by,
  };
}

export function computeOnboardingProgressPercent(stage: ClientOnboardingStage): number {
  const index = CLIENT_ONBOARDING_STAGE_ORDER.indexOf(stage);
  if (index < 0) {
    return 0;
  }
  return Math.round(((index + 1) / CLIENT_ONBOARDING_STAGE_ORDER.length) * 100);
}

export function getStageCompletion(record: ClientOnboardingRecord, stage: ClientOnboardingStage) {
  switch (stage) {
    case "signed_up":
      return { completedAt: record.signedUpAt, completedBy: record.signedUpBy };
    case "payment_received":
      return { completedAt: record.paymentReceivedAt, completedBy: record.paymentReceivedBy };
    case "questionnaire_complete":
      return {
        completedAt: record.questionnaireCompleteAt,
        completedBy: record.questionnaireCompleteBy,
      };
    case "platform_clone_complete":
      return {
        completedAt: record.platformCloneCompleteAt,
        completedBy: record.platformCloneCompleteBy,
      };
    case "review_complete":
      return { completedAt: record.reviewCompleteAt, completedBy: record.reviewCompleteBy };
    case "platform_live":
      return { completedAt: record.platformLiveAt, completedBy: record.platformLiveBy };
    default:
      return { completedAt: null, completedBy: null };
  }
}

export function getOnboardingStageLabel(stage: ClientOnboardingStage): string {
  return CLIENT_ONBOARDING_STAGES.find((item) => item.stage === stage)?.label ?? stage;
}

export function getNextOnboardingAction(
  currentStage: ClientOnboardingStage,
): ClientOnboardingAdvanceAction | null {
  const currentIndex = CLIENT_ONBOARDING_STAGE_ORDER.indexOf(currentStage);
  if (currentIndex < 0 || currentIndex >= CLIENT_ONBOARDING_STAGE_ORDER.length - 1) {
    return null;
  }

  const nextStage = CLIENT_ONBOARDING_STAGE_ORDER[currentIndex + 1]!;
  const definition = CLIENT_ONBOARDING_STAGES.find((item) => item.stage === nextStage);
  return definition?.action ?? null;
}

export function formatOnboardingDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
