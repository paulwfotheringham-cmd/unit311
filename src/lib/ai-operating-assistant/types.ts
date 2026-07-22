/**
 * Shared types for the Unit311 AI Operating Assistant.
 * Keep domain types here — services must not invent ad-hoc shapes.
 */

export type AssistantMessageRole = "user" | "assistant" | "system" | "tool";

export type AssistantMessageArtifact = {
  id: string;
  kind: "pdf";
  title: string;
  filename: string;
  downloadUrl: string;
  openUrl: string;
  /** Base64 PDF payload — enables client download even if serverless memory is cold. */
  contentBase64?: string;
};

export type AssistantChatMessage = {
  id: string;
  role: Exclude<AssistantMessageRole, "system">;
  content: string;
  createdAt: string;
  toolName?: string;
  toolCallId?: string;
  followUpActions?: import("./tool-result").AssistantFollowUpAction[];
  artifacts?: AssistantMessageArtifact[];
};

export type AssistantPageSelection = {
  clientId?: string | null;
  clientName?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  employeeId?: string | null;
  employeeName?: string | null;
  contractId?: string | null;
  contractName?: string | null;
  fileId?: string | null;
  fileName?: string | null;
};

export type AssistantBusinessContext = {
  user: {
    id: string;
    username: string;
    displayName: string;
    userType: string;
  };
  organisation: {
    id: string | null;
    name: string | null;
  };
  workspace: {
    id: string | null;
    name: string | null;
    slug: string | null;
  };
  page: {
    activeView: string;
    label: string;
    pathname?: string | null;
  };
  selection: AssistantPageSelection;
  permissions: {
    roleView: string;
    canAccessFinancials: boolean;
    canAccessUsers: boolean;
    canAccessStrategy: boolean;
    canAccessHr: boolean;
  };
  generatedAt: string;
};

export type AssistantConversationRecord = {
  id: string;
  title: string;
  userId: string;
  workspaceId: string | null;
  organisationId: string | null;
  messages: AssistantChatMessage[];
  workspaceContext: AssistantBusinessContext | null;
  isSaved: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AssistantChatRequest = {
  conversationId?: string | null;
  message: string;
  messages?: AssistantChatMessage[];
  activeView?: string | null;
  pathname?: string | null;
  selection?: AssistantPageSelection;
  roleView?: string | null;
  stream?: boolean;
  /** When true, ask model for structured JSON object in the final answer. */
  structuredJson?: boolean;
};

export type AssistantStreamEvent =
  | { type: "meta"; conversationId: string; title: string }
  | { type: "delta"; text: string }
  | { type: "tool_call"; name: string; arguments: unknown }
  | { type: "tool_result"; name: string; result: unknown }
  | { type: "done"; message: AssistantChatMessage; conversationId: string }
  | { type: "error"; error: string; retryable?: boolean };

export type AssistantToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type AssistantToolHandler = (args: Record<string, unknown>) => Promise<unknown>;
