export const BRIGHTON_BEACH_TASK_NAME = "Brighton Beach Road - 6/23/2016";

export type WebODMDeliverableCatalogItem = {
  asset: string;
  name: string;
  description: string;
  fileType: string;
};

/** Deliverables exposed in the Start Your Business portal (subset of WebODM assets). */
export const AERIAL_INTELLIGENCE_DELIVERABLES: WebODMDeliverableCatalogItem[] = [
  {
    asset: "orthophoto.tif",
    name: "Orthomosaic",
    description: "Georeferenced orthophoto mosaic for site-wide visual intelligence and mapping.",
    fileType: "GeoTIFF",
  },
  {
    asset: "georeferenced_model.laz",
    name: "Point Cloud",
    description: "Dense georeferenced point cloud for measurement-ready 3D spatial analysis.",
    fileType: "LAZ",
  },
  {
    asset: "dsm.tif",
    name: "Digital Surface Model",
    description: "Elevation surface model including structures, vegetation, and terrain features.",
    fileType: "GeoTIFF",
  },
  {
    asset: "textured_model.glb",
    name: "3D Model",
    description: "Textured mesh optimised for browser-based 3D visualisation and review.",
    fileType: "GLB",
  },
  {
    asset: "report.pdf",
    name: "Processing Report",
    description: "Photogrammetry processing summary with quality metrics and survey metadata.",
    fileType: "PDF",
  },
];

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export type WebODMDeliverable = WebODMDeliverableCatalogItem & {
  status: "ready";
  sizeBytes: number | null;
  sizeLabel: string;
  mimeType: string | null;
};

export type WebODMDeliverablesMission = {
  projectId: number;
  taskId: string;
  name: string;
  statusLabel: string;
  imagesCount: number | null;
  processingTimeMs: number | null;
  createdAt: string | null;
  captureDate: string | null;
  gsdMeters: number | null;
  gsdLabel: string | null;
  surveyAreaSqM: number | null;
  surveyAreaLabel: string | null;
  crsName: string | null;
  crsEpsg: number | null;
  pointCount: number | null;
};

export type RasterTileConfig = {
  minZoom: number;
  maxZoom: number;
  /** [west, south, east, north] */
  bounds: [number, number, number, number];
  tileUrlTemplate: string;
};

/** @deprecated Use RasterTileConfig */
export type OrthophotoTileConfig = RasterTileConfig;

export type AerialIntelligenceWorkspace = {
  mission: WebODMDeliverablesMission;
  orthophoto: RasterTileConfig | null;
  dsm: RasterTileConfig | null;
  dsmGeotiffUrl: string | null;
  modelGlbUrl: string | null;
  reportPdfUrl: string | null;
  hasPointCloud: boolean;
};

export function formatSurveyArea(sqM: number | null | undefined): string | null {
  if (sqM == null || Number.isNaN(sqM)) return null;
  if (sqM >= 10_000) return `${(sqM / 10_000).toFixed(2)} ha`;
  return `${Math.round(sqM).toLocaleString("en-GB")} m²`;
}

export function formatGsd(meters: number | null | undefined): string | null {
  if (meters == null || Number.isNaN(meters)) return null;
  return `${meters.toFixed(2)} m/px`;
}
