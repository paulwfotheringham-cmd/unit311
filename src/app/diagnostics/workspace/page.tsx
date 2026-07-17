import { getWorkspaceContextDiagnostics } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[12rem_1fr] gap-3 border-b border-white/10 py-3 text-sm">
      <dt className="text-white/45">{label}</dt>
      <dd className="break-all font-mono text-white/90">{value || "—"}</dd>
    </div>
  );
}

export default async function WorkspaceContextDiagnosticsPage() {
  const diagnostics = await getWorkspaceContextDiagnostics();
  const workspace = diagnostics.resolvedWorkspace;

  return (
    <main className="min-h-[100dvh] bg-[#020617] px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300/80">
          Workspace Isolation · Phase 1
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Workspace Context</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
          Temporary diagnostics for runtime tenancy. No module data is filtered yet — this page only
          verifies that every authenticated request can resolve a single Workspace Context.
        </p>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-2">
          <dl>
            <Row label="Host" value={diagnostics.host ?? ""} />
            <Row
              label="Authenticated"
              value={diagnostics.authenticated ? "yes" : "no"}
            />
            <Row label="Session user" value={diagnostics.sessionUser?.username ?? ""} />
            <Row label="Session user id" value={diagnostics.sessionUser?.id ?? ""} />
            <Row label="Session user type" value={diagnostics.sessionUser?.userType ?? ""} />
            <Row
              label="Session workspace"
              value={
                diagnostics.sessionWorkspace
                  ? `${diagnostics.sessionWorkspace.slug} (${diagnostics.sessionWorkspace.id})`
                  : ""
              }
            />
            <Row label="Resolved source" value={diagnostics.source} />
            <Row label="Workspace ID" value={workspace?.id ?? ""} />
            <Row label="Workspace slug" value={workspace?.slug ?? ""} />
            <Row label="Workspace name" value={workspace?.name ?? ""} />
          </dl>
        </section>

        <p className="mt-6 text-xs text-white/35">
          JSON: <code className="text-white/55">/api/diagnostics/workspace-context</code>
        </p>
      </div>
    </main>
  );
}
