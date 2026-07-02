import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "src");
const REPLACEMENTS = [
  ["BCN Drone Center", "Unit311"],
  ["Drone Catalyst", "Unit311"],
  ["DroneCatalyst", "Unit311"],
  ["dronecatalyst.com", "unit311.com"],
  ["From Drone to Intelligence", "Start your business. Run it in one place."],
  ["Aerial Intelligence", "Start Your Business"],
  ["| BCN Drone Center", "| Unit311"],
  ["BCN Support", "Unit311 Support"],
  ["BCN Admin", "Unit311 Admin"],
  ["BCN Operations", "Unit311 Operations"],
  ["BCN Shared Inbox", "Unit311 Shared Inbox"],
  ["BCN Paul", "Unit311 Admin"],
  ["BCN Courier", "Unit311 Courier"],
  ["BCN Drone Center —", "Unit311 —"],
  ["BCN Drone Center ", "Unit311 "],
  ["BCN Drone Center.", "Unit311."],
  ["BCN Drone Center,", "Unit311,"],
  ["BCN hubs", "Unit311 hubs"],
  ["BCN UAS test site", "Unit311 operations hub"],
  ["at BCN Drone Center", "with Unit311"],
  ["BCN Drone Center courses", "Unit311 programmes"],
  ["BCN ·", "Unit311 ·"],
  ["subtitle: \"BCN Drone Center\"", "subtitle: \"Unit311\""],
  ["footerBrand: \"Drone Catalyst Enterprise\"", "footerBrand: \"Unit311 Enterprise\""],
  ["footerBrand: \"BCN Drone Center\"", "footerBrand: \"Unit311\""],
  ["appName: \"BCN Drone Center\"", "appName: \"Unit311\""],
  ["title: \"BCN Support", "title: \"Unit311 Support"],
  ["Download BCN Drone Center", "Download Unit311"],
  ["BCN Drone Center Android", "Unit311 Android"],
  ["Open BCN Drone Center", "Open Unit311"],
  ["Loading BCN Drone Center", "Loading Unit311"],
  ["BCN WhatsApp", "Unit311 WhatsApp"],
  ["BCN SERVER", "UNIT311 SERVER"],
  ["Zoho BCN", "Zoho Unit311"],
  ["Drone Catalyst info", "Unit311 info"],
  ["Drone Catalyst paul", "Unit311 admin"],
  ["Drone Catalyst Inbox", "Unit311 Inbox"],
  ["Drone Catalyst Paul", "Unit311 Admin"],
  ["Drone Catalyst Enterprise", "Unit311 Enterprise"],
  ["Drone Catalyst ·", "Unit311 ·"],
  ["Drone Catalyst Workflow", "Unit311 Workflow"],
  ["Drone Catalyst captures", "Unit311 delivers"],
  ["the Drone Catalyst team", "the Unit311 team"],
  ["Drone Catalyst will", "Unit311 will"],
  ["Shared with DroneCatalyst", "Shared with Unit311"],
  ["Drone Catalyst operators", "Unit311 operators"],
  ["syncing to DroneCatalyst", "syncing to Unit311"],
  ["in DroneCatalyst", "in Unit311"],
  ["DroneCatalyst service", "Unit311 service"],
  ["Contact DroneCatalyst", "Contact Unit311"],
  ["@barcelonadronecenter.com", "@unit311.com"],
  ["barcelonadronecenter.com", "unit311.com"],
  ["barcelonadronecenter.vercel.app", "unit311.vercel.app"],
  ["bcn drone center", "unit311"],
  ["BCN WhatsApp", "Unit311 WhatsApp"],
  ["BCN SERVER", "UNIT311 SERVER"],
];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?|md|html|json)$/.test(entry.name)) {
      let text = fs.readFileSync(full, "utf8");
      let changed = false;
      for (const [from, to] of REPLACEMENTS) {
        if (text.includes(from)) {
          text = text.split(from).join(to);
          changed = true;
        }
      }
      if (changed) fs.writeFileSync(full, text, "utf8");
    }
  }
}

walk(ROOT);
console.log("Unit311 rebrand replacements applied.");
