export const MISSION_REPLAY_VIDEO = "/videos/mission-replay-demo.mp4";

export const MISSION_REPLAY_HUD = {
  mission: "Westport Logistics Hub",
  drone: "DJI Matrice 4T",
  flightTime: "18 min",
  imagesCaptured: "426",
  processing: "Complete",
  resolution: "1.6 cm/px",
} as const;

export const MISSION_REPLAY_SCENES = [
  { id: "takeoff", label: "Drone takeoff", caption: "Construction site launch" },
  { id: "grid", label: "Autonomous grid flight", caption: "Surveying roads, stockpiles and buildings" },
  { id: "capture", label: "Nadir imagery capture", caption: "Overlapping photo sequence" },
  { id: "upload", label: "Cloud upload", caption: "Images syncing to Unit311" },
  { id: "processing", label: "Photogrammetry processing", caption: "Structure-from-motion pipeline" },
  { id: "ortho", label: "Orthomosaic", caption: "Georeferenced site mosaic" },
  { id: "model3d", label: "Textured 3D model", caption: "Mesh reconstruction" },
  { id: "elevation", label: "Elevation model", caption: "Digital surface model" },
  { id: "measure", label: "Cut / fill analysis", caption: "Volume measurement highlights" },
  { id: "complete", label: "Survey complete", caption: "Deliverables ready for review" },
] as const;

export const MISSION_REPLAY_SCENE_MS = 4200;
