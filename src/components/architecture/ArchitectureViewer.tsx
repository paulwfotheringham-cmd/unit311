"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  Panel,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { toPng, toSvg } from "html-to-image";
import {
  Badge as BadgeIcon,
  Banknote,
  Bot,
  Boxes,
  Building2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Database,
  Download,
  Expand,
  FolderOpen,
  Globe,
  HardDrive,
  Kanban,
  KeyRound,
  LayoutDashboard,
  Link2,
  ListChecks,
  Loader2,
  Mail,
  Maximize2,
  MessageSquare,
  Minimize2,
  Network,
  Search,
  Server,
  Shield,
  Sparkles,
  Upload,
  UserPlus,
  Users,
  Wallet,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import "@xyflow/react/dist/style.css";

import {
  ARCHITECTURE_DIAGRAM_CATALOG,
  ARCHITECTURE_NODE_COLORS,
  type ArchitectureCatalogEntry,
  type ArchitectureDiagramDocument,
  type ArchitectureNodeBadge,
  type ArchitectureNodeData,
  type ArchitectureNodeKind,
  type SystemArchitectureDiagram,
} from "@/lib/architecture-diagram-data";
import { cn } from "@/lib/utils";

type ArchitectureRfNode = Node<ArchitectureNodeData, "architecture" | "group">;

const ICON_MAP: Record<string, LucideIcon> = {
  network: Network,
  upload: Upload,
  server: Server,
  "hard-drive": HardDrive,
  database: Database,
  link: Link2,
  "folder-open": FolderOpen,
  globe: Globe,
  "user-plus": UserPlus,
  "credit-card": CreditCard,
  banknote: Banknote,
  zap: Zap,
  "building-2": Building2,
  "list-checks": ListChecks,
  "layout-dashboard": LayoutDashboard,
  users: Users,
  kanban: Kanban,
  wallet: Wallet,
  badge: BadgeIcon,
  boxes: Boxes,
  "message-square": MessageSquare,
  sparkles: Sparkles,
  shield: Shield,
  bot: Bot,
  "key-round": KeyRound,
  mail: Mail,
};

function kindColors(kind: ArchitectureNodeKind) {
  if (kind === "group") {
    return {
      bg: "rgba(15, 23, 42, 0.55)",
      border: "rgba(148, 163, 184, 0.35)",
      text: "#e2e8f0",
      label: "Group",
    };
  }
  return ARCHITECTURE_NODE_COLORS[kind];
}

function badgeClass(tone: ArchitectureNodeBadge["tone"]) {
  switch (tone) {
    case "emerald":
      return "border-emerald-400/40 bg-emerald-500/20 text-emerald-100";
    case "amber":
      return "border-amber-400/40 bg-amber-500/20 text-amber-100";
    case "rose":
      return "border-rose-400/40 bg-rose-500/20 text-rose-100";
    case "violet":
      return "border-violet-400/40 bg-violet-500/20 text-violet-100";
    case "slate":
      return "border-slate-400/40 bg-slate-500/20 text-slate-100";
    case "sky":
    default:
      return "border-sky-400/40 bg-sky-500/20 text-sky-100";
  }
}

function statusDot(status: ArchitectureNodeData["status"]) {
  switch (status) {
    case "live":
      return "bg-emerald-400";
    case "beta":
      return "bg-sky-400";
    case "planned":
      return "bg-amber-400";
    case "deprecated":
      return "bg-rose-400";
    default:
      return "bg-slate-400";
  }
}

function ArchitectureNodeView({ data, selected }: NodeProps<ArchitectureRfNode>) {
  const colors = kindColors(data.nodeKind);
  const Icon = data.icon ? ICON_MAP[data.icon] : null;
  return (
    <div
      className={cn(
        "min-w-[200px] max-w-[280px] rounded-xl border px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm transition duration-200",
        selected && "scale-[1.02] ring-2 ring-sky-400/70",
      )}
      style={
        {
          background: colors.bg,
          borderColor: colors.border,
          color: colors.text,
        } as CSSProperties
      }
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-sky-300" />
      <div className="flex items-start gap-2">
        {Icon ? (
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/20">
            <Icon className="h-3.5 w-3.5 opacity-90" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
              {colors.label}
            </p>
            {data.status ? (
              <span className={cn("h-1.5 w-1.5 rounded-full", statusDot(data.status))} />
            ) : null}
          </div>
          <p className="mt-1 text-sm font-semibold leading-snug">{data.label}</p>
        </div>
      </div>
      {data.description ? (
        <p className="mt-1.5 text-[11px] leading-relaxed opacity-75">{data.description}</p>
      ) : null}
      {data.badges && data.badges.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {data.badges.map((badge) => (
            <span
              key={`${badge.label}-${badge.tone ?? "sky"}`}
              className={cn(
                "rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                badgeClass(badge.tone),
              )}
            >
              {badge.label}
            </span>
          ))}
        </div>
      ) : null}
      {data.docSectionSlug ? (
        <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-sky-200/90">
          Docs · {data.docSectionSlug}
        </p>
      ) : data.href ? (
        <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-orange-200/90">
          Link
        </p>
      ) : (
        <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-white/35">
          Documentation coming soon
        </p>
      )}
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-sky-300" />
    </div>
  );
}

function GroupNodeView({ data, selected }: NodeProps<ArchitectureRfNode>) {
  const collapsed = Boolean(data.collapsed);
  return (
    <div
      className={cn(
        "h-full w-full rounded-2xl border border-dashed border-white/20 bg-[#0b1524]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition duration-200",
        selected && "ring-2 ring-violet-400/40",
        collapsed && "min-h-[56px]",
      )}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-white/80">
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        <span className="text-xs font-semibold uppercase tracking-[0.12em]">{data.label}</span>
      </div>
    </div>
  );
}

const nodeTypes = {
  architecture: ArchitectureNodeView,
  group: GroupNodeView,
};

function documentToFlow(doc: ArchitectureDiagramDocument): {
  nodes: ArchitectureRfNode[];
  edges: Edge[];
} {
  const collapsedGroups = new Set(
    doc.nodes.filter((n) => n.type === "group" && n.data.collapsed).map((n) => n.id),
  );

  const nodes: ArchitectureRfNode[] = doc.nodes.map((node) => {
    const hidden = Boolean(node.parentId && collapsedGroups.has(node.parentId));
    return {
      id: node.id,
      type: node.type === "group" ? "group" : "architecture",
      position: node.position,
      data: { ...node.data },
      parentId: node.parentId,
      extent: node.extent,
      style:
        node.type === "group"
          ? {
              width: node.style?.width ?? 420,
              height: node.data.collapsed ? 56 : (node.style?.height ?? 220),
              ...node.style,
            }
          : node.style,
      hidden: node.hidden || hidden,
      draggable: true,
      selectable: true,
    };
  });

  const edges: Edge[] = doc.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: edge.animated ?? false,
    style: { stroke: "rgba(148, 163, 184, 0.55)", strokeWidth: 1.5 },
    labelStyle: { fill: "rgba(226, 232, 240, 0.85)", fontSize: 10 },
    labelBgStyle: { fill: "rgba(11, 21, 36, 0.9)" },
  }));

  return { nodes, edges };
}

function flowToDocument(
  nodes: ArchitectureRfNode[],
  edges: Edge[],
  viewport?: ArchitectureDiagramDocument["viewport"],
  meta?: ArchitectureDiagramDocument["meta"],
): ArchitectureDiagramDocument {
  return {
    version: 1,
    viewport,
    meta,
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type === "group" ? "group" : "architecture",
      position: node.position,
      data: node.data,
      parentId: node.parentId,
      extent: node.extent === "parent" ? "parent" : undefined,
      style: node.style as Record<string, string | number> | undefined,
      hidden: node.hidden,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: typeof edge.label === "string" ? edge.label : undefined,
      animated: edge.animated,
    })),
  };
}

type ArchitectureViewerInnerProps = {
  diagramDocument: ArchitectureDiagramDocument;
  title?: string;
  sectionSlug?: string;
  catalog?: ArchitectureCatalogEntry[];
  existingDiagrams?: Array<Pick<SystemArchitectureDiagram, "sectionSlug" | "title">>;
  className?: string;
  height?: number | string;
  onDocumentChange?: (doc: ArchitectureDiagramDocument) => void;
  onNodeDocNavigate?: (sectionSlug: string) => void;
  onSelectDiagram?: (sectionSlug: string) => void;
  knownDocSections?: string[];
  readOnly?: boolean;
};

function ArchitectureViewerInner({
  diagramDocument,
  title,
  sectionSlug,
  catalog = [...ARCHITECTURE_DIAGRAM_CATALOG],
  existingDiagrams = [],
  className,
  height = 560,
  onDocumentChange,
  onNodeDocNavigate,
  onSelectDiagram,
  knownDocSections = [],
  readOnly = false,
}: ArchitectureViewerInnerProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const { fitView, getViewport, setViewport, setCenter, getNode } = useReactFlow();
  const initial = useMemo(() => documentToFlow(diagramDocument), [diagramDocument]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [exporting, setExporting] = useState<"png" | "svg" | null>(null);
  const [search, setSearch] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [navOpen, setNavOpen] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const next = documentToFlow(diagramDocument);
    setNodes(next.nodes);
    setEdges(next.edges);
    if (diagramDocument.viewport) {
      setViewport(diagramDocument.viewport);
    } else {
      requestAnimationFrame(() => fitView({ padding: 0.18, duration: 280 }));
    }
  }, [diagramDocument, fitView, setEdges, setNodes, setViewport]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && fullscreen) setFullscreen(false);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        // keep browser find; no override
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  const persist = useCallback(
    (nextNodes: ArchitectureRfNode[], nextEdges: Edge[]) => {
      if (!onDocumentChange || readOnly) return;
      onDocumentChange(
        flowToDocument(nextNodes, nextEdges, getViewport(), diagramDocument.meta),
      );
    },
    [diagramDocument.meta, getViewport, onDocumentChange, readOnly],
  );

  const toggleGroupCollapse = useCallback(
    (groupId: string) => {
      setNodes((current) => {
        const next = current.map((node) => {
          if (node.id !== groupId || node.type !== "group") return node;
          const collapsed = !node.data.collapsed;
          return {
            ...node,
            data: { ...node.data, collapsed },
            style: {
              ...node.style,
              height: collapsed ? 56 : Number(node.style?.height ?? 220),
            },
          };
        });
        const collapsed = Boolean(next.find((n) => n.id === groupId)?.data.collapsed);
        const withHidden = next.map((node) =>
          node.parentId === groupId ? { ...node, hidden: collapsed } : node,
        );
        persist(withHidden, edges);
        return withHidden;
      });
    },
    [edges, persist, setNodes],
  );

  const onNodeClick = useCallback(
    (_event: ReactMouseEvent, node: ArchitectureRfNode) => {
      if (node.type === "group") {
        toggleGroupCollapse(node.id);
        return;
      }

      if (node.data.href) {
        window.open(node.data.href, "_blank", "noopener,noreferrer");
        return;
      }

      const slug = node.data.docSectionSlug?.trim();
      if (!slug) {
        setNotice("Documentation coming soon");
        return;
      }

      if (knownDocSections.length > 0 && !knownDocSections.includes(slug)) {
        setNotice("Documentation coming soon");
        return;
      }

      if (onNodeDocNavigate) {
        onNodeDocNavigate(slug);
        return;
      }

      setNotice(`Open docs: ${slug}`);
    },
    [knownDocSections, onNodeDocNavigate, toggleGroupCollapse],
  );

  const exportFile = useCallback(
    async (format: "png" | "svg") => {
      const el = wrapperRef.current?.querySelector(".react-flow__viewport") as HTMLElement | null;
      if (!el) return;
      setExporting(format);
      try {
        const fileBase = (title || "architecture").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
        if (format === "png") {
          const dataUrl = await toPng(el, {
            cacheBust: true,
            backgroundColor: "#020617",
            pixelRatio: 2,
          });
          const anchor = globalThis.document.createElement("a");
          anchor.href = dataUrl;
          anchor.download = `${fileBase}.png`;
          anchor.click();
        } else {
          const dataUrl = await toSvg(el, {
            cacheBust: true,
            backgroundColor: "#020617",
          });
          const anchor = globalThis.document.createElement("a");
          anchor.href = dataUrl;
          anchor.download = `${fileBase}.svg`;
          anchor.click();
        }
      } finally {
        setExporting(null);
      }
    },
    [title],
  );

  const focusSearchMatch = useCallback(() => {
    const query = search.trim().toLowerCase();
    if (!query) return;
    const match = nodes.find(
      (node) =>
        !node.hidden &&
        (node.data.label.toLowerCase().includes(query) ||
          node.data.description?.toLowerCase().includes(query) ||
          node.data.docSectionSlug?.toLowerCase().includes(query)),
    );
    if (!match) {
      setNotice("No matching nodes");
      return;
    }
    const current = getNode(match.id);
    if (!current) return;
    const width = typeof current.measured?.width === "number" ? current.measured.width : 220;
    const height = typeof current.measured?.height === "number" ? current.measured.height : 80;
    setCenter(current.position.x + width / 2, current.position.y + height / 2, {
      zoom: 1.15,
      duration: 320,
    });
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({ ...node, selected: node.id === match.id })),
    );
  }, [getNode, nodes, search, setCenter, setNodes]);

  const existingSlugSet = useMemo(
    () => new Set(existingDiagrams.map((diagram) => diagram.sectionSlug)),
    [existingDiagrams],
  );

  const shellStyle: CSSProperties = fullscreen
    ? { position: "fixed", inset: 0, zIndex: 80, height: "100dvh" }
    : { height };

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative flex overflow-hidden rounded-2xl border border-white/15 bg-[#020617]",
        fullscreen && "rounded-none border-0",
        className,
      )}
      style={shellStyle}
    >
      {navOpen ? (
        <aside className="flex w-56 shrink-0 flex-col border-r border-white/10 bg-[#07111f]/95 backdrop-blur">
          <div className="border-b border-white/10 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
              Architecture library
            </p>
            <p className="mt-1 text-sm font-semibold text-white">Diagrams</p>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {catalog.map((entry) => {
              const active = entry.sectionSlug === sectionSlug;
              const exists = existingSlugSet.has(entry.sectionSlug);
              return (
                <button
                  key={entry.sectionSlug}
                  type="button"
                  onClick={() => onSelectDiagram?.(entry.sectionSlug)}
                  className={cn(
                    "w-full rounded-lg border px-2.5 py-2 text-left transition",
                    active
                      ? "border-emerald-500/50 bg-emerald-500/15 text-white"
                      : "border-transparent bg-transparent text-white/70 hover:border-white/10 hover:bg-white/[0.04] hover:text-white",
                  )}
                >
                  <span className="block text-xs font-semibold">{entry.title}</span>
                  <span className="mt-0.5 block text-[10px] text-white/40">
                    {exists ? "Saved in database" : entry.description ?? "Available to create"}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      ) : null}

      <div className="relative min-w-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={() => persist(nodes, edges)}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={2.2}
          proOptions={{ hideAttribution: true }}
          colorMode="dark"
          className="architecture-viewer-flow"
          defaultEdgeOptions={{ type: "smoothstep" }}
        >
          <Background gap={18} size={1} color="rgba(148,163,184,0.18)" />
          <Controls
            showInteractive={!readOnly}
            className="!overflow-hidden !rounded-xl !border !border-white/15 !bg-[#0b1524]/95 !shadow-lg [&>button]:!border-white/10 [&>button]:!bg-transparent [&>button]:!text-white/80"
          />
          <MiniMap
            pannable
            zoomable
            className="!overflow-hidden !rounded-xl !border !border-white/15 !bg-[#0b1524]/90"
            maskColor="rgba(2,6,23,0.7)"
            nodeColor={(node) => {
              const kind = (node.data as ArchitectureNodeData | undefined)?.nodeKind ?? "service";
              return kindColors(kind).border;
            }}
          />

          <Panel position="top-left" className="m-3 max-w-[min(100%,28rem)]">
            <div className="rounded-xl border border-white/10 bg-[#0b1524]/92 px-3 py-2 shadow-lg backdrop-blur">
              <div className="flex items-center gap-2 text-white/90">
                <Network className="h-4 w-4 text-sky-300" />
                <span className="text-sm font-semibold">{title ?? "Architecture"}</span>
              </div>
              <p className="mt-1 text-[11px] text-white/45">
                Scroll zoom · drag pan · click groups to collapse · click nodes for docs
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        focusSearchMatch();
                      }
                    }}
                    placeholder="Search nodes…"
                    className="w-full rounded-lg border border-white/10 bg-black/20 py-1.5 pl-7 pr-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-sky-400/40"
                  />
                </div>
                <button
                  type="button"
                  onClick={focusSearchMatch}
                  className="rounded-lg border border-white/15 bg-white/[0.04] px-2 py-1.5 text-[11px] font-medium text-white/80 hover:bg-white/10"
                >
                  Find
                </button>
              </div>
            </div>
          </Panel>

          <Panel position="top-right" className="m-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setNavOpen((value) => !value)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0b1524]/90 px-2.5 py-1.5 text-xs font-medium text-white/85 transition hover:bg-white/10"
            >
              {navOpen ? <ChevronRight className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
              Library
            </button>
            <button
              type="button"
              onClick={() => fitView({ padding: 0.18, duration: 280 })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0b1524]/90 px-2.5 py-1.5 text-xs font-medium text-white/85 transition hover:bg-white/10"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Fit
            </button>
            <button
              type="button"
              onClick={() => setFullscreen((value) => !value)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0b1524]/90 px-2.5 py-1.5 text-xs font-medium text-white/85 transition hover:bg-white/10"
            >
              {fullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Expand className="h-3.5 w-3.5" />
              )}
              {fullscreen ? "Exit" : "Full screen"}
            </button>
            <button
              type="button"
              disabled={exporting !== null}
              onClick={() => void exportFile("png")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0b1524]/90 px-2.5 py-1.5 text-xs font-medium text-white/85 transition hover:bg-white/10 disabled:opacity-60"
            >
              {exporting === "png" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              PNG
            </button>
            <button
              type="button"
              disabled={exporting !== null}
              onClick={() => void exportFile("svg")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0b1524]/90 px-2.5 py-1.5 text-xs font-medium text-white/85 transition hover:bg-white/10 disabled:opacity-60"
            >
              {exporting === "svg" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              SVG
            </button>
          </Panel>

          <Panel position="bottom-left" className="m-3">
            <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-[#0b1524]/90 px-2.5 py-2 text-[10px] text-white/70">
              {(
                [
                  ["frontend", "Frontend"],
                  ["service", "Services"],
                  ["database", "Database"],
                  ["integration", "Integrations"],
                  ["storage", "Storage"],
                ] as const
              ).map(([kind, label]) => (
                <span key={kind} className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: ARCHITECTURE_NODE_COLORS[kind].border }}
                  />
                  {label}
                </span>
              ))}
            </div>
          </Panel>
        </ReactFlow>

        {notice ? (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-xl border border-white/15 bg-[#0b1524]/95 px-4 py-2 text-sm text-white shadow-xl backdrop-blur">
            {notice}
          </div>
        ) : null}

        {fullscreen ? (
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-[#0b1524]/95 text-white/80 hover:bg-white/10"
            aria-label="Close full screen"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export type ArchitectureViewerProps = ArchitectureViewerInnerProps;

/**
 * Reusable interactive architecture diagram viewer (React Flow).
 * Accepts editable JSON documents from system_architecture_diagrams.
 */
export default function ArchitectureViewer(props: ArchitectureViewerProps) {
  return (
    <ReactFlowProvider>
      <ArchitectureViewerInner {...props} />
    </ReactFlowProvider>
  );
}
