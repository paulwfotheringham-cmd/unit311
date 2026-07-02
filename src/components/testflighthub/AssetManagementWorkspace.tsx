"use client";

import { useMemo, useState } from "react";

import {
  ASSET_STATUS_OPTIONS,
  CONTROL_SOURCE_OPTIONS,
  createBlankAsset,
  FIRMWARE_VERSION_OPTIONS,
  formatAssetDate,
  getModelsForCategory,
  isAircraftAsset,
  isRtkAsset,
  isSoftwareAsset,
  RTK_CALIBRATION_OPTIONS,
  assetStatusClass,
  type ManagedAsset,
} from "@/lib/asset-management-data";
import type { ManagedClient } from "@/lib/client-management-data";
import { getOwnerUserIdForRegion, type ManagedUser } from "@/lib/user-management-data";
import { cn } from "@/lib/utils";
import ResponsiveMasterDetail, { useMobileDetailPanel } from "@/components/ui/ResponsiveMasterDetail";
import { Search } from "lucide-react";

type AssetManagementWorkspaceProps = {
  assets: ManagedAsset[];
  categories: string[];
  locations: string[];
  clients: ManagedClient[];
  users: ManagedUser[];
  selectedAssetId: string;
  onSelectAsset: (assetId: string) => void;
  onAssetsChange: (assets: ManagedAsset[]) => void;
  onCategoriesChange: (categories: string[]) => void;
  onLocationsChange: (locations: string[]) => void;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
      {children}
    </label>
  );
}

function inputClassName() {
  return "mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50";
}

function RegistryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
        active
          ? "border-sky-400/50 bg-sky-500/15 text-sky-200"
          : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white/75",
      )}
    >
      {label}
    </button>
  );
}

export default function AssetManagementWorkspace({
  assets,
  categories,
  locations,
  clients,
  users,
  selectedAssetId,
  onSelectAsset,
  onAssetsChange,
  onCategoriesChange,
  onLocationsChange,
}: AssetManagementWorkspaceProps) {
  const { showDetail, openDetail, closeDetail } = useMobileDetailPanel();
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [locationFilter, setLocationFilter] = useState<string>("All");
  const [newCategory, setNewCategory] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [addCategory, setAddCategory] = useState(categories[0] ?? "Aircraft");
  const [addLocation, setAddLocation] = useState(locations[0] ?? "Oxford");

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) ?? assets[0],
    [assets, selectedAssetId],
  );

  const filteredAssets = useMemo(() => {
    const query = assetSearchQuery.trim().toLowerCase();
    return assets.filter((asset) => {
      const categoryMatch = categoryFilter === "All" || asset.category === categoryFilter;
      const locationMatch = locationFilter === "All" || asset.location === locationFilter;
      if (!categoryMatch || !locationMatch) return false;
      if (!query) return true;
      const haystack =
        `${asset.assetTag} ${asset.category} ${asset.location} ${asset.model} ${asset.serialNumber} ${asset.notes}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [assets, assetSearchQuery, categoryFilter, locationFilter]);

  const hasAssetSearch = assetSearchQuery.trim().length > 0;

  const modelOptions = useMemo(
    () => (selectedAsset ? getModelsForCategory(selectedAsset.category) : []),
    [selectedAsset],
  );

  function updateAsset(updated: ManagedAsset) {
    onAssetsChange(assets.map((asset) => (asset.id === updated.id ? updated : asset)));
  }

  function handleAddAsset() {
    const next = createBlankAsset(categories, locations, addCategory, addLocation);
    onAssetsChange([next, ...assets]);
    onSelectAsset(next.id);
    setAssetSearchQuery(next.assetTag || next.id);
    openDetail();
    setCategoryFilter(addCategory);
    setLocationFilter(addLocation);
  }

  function handleAddCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    onCategoriesChange([...categories, trimmed]);
    setNewCategory("");
  }

  function handleAddLocation() {
    const trimmed = newLocation.trim();
    if (!trimmed || locations.includes(trimmed)) return;
    onLocationsChange([...locations, trimmed]);
    setNewLocation("");
  }

  function patchSelected(patch: Partial<ManagedAsset>) {
    if (!selectedAsset) return;
    const next = { ...selectedAsset, ...patch };
    if (patch.location && patch.location !== selectedAsset.location) {
      next.assignedToUserId = getOwnerUserIdForRegion(patch.location);
    }
    if (patch.category && patch.category !== selectedAsset.category) {
      const models = getModelsForCategory(patch.category);
      next.model = models.includes(next.model) ? next.model : models[0] ?? next.model;
      next.operationalStatus =
        patch.operationalStatus ??
        (patch.category === "Software Licence"
          ? "Active Licence"
          : selectedAsset.operationalStatus);
    }
    updateAsset(next);
  }

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: client.companyName,
  }));

  const userOptions = users.map((user) => ({
    value: user.id,
    label: `${user.fullName} · ${user.region}`,
  }));

  function ownerLabel(userId: string | null) {
    if (!userId) return "Unassigned";
    const user = users.find((entry) => entry.id === userId);
    return user ? user.fullName : "Unassigned";
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            type="search"
            value={assetSearchQuery}
            onChange={(event) => setAssetSearchQuery(event.target.value)}
            placeholder="Search assets by tag, model, serial, location…"
            className={cn(inputClassName(), "mt-0 pl-10")}
          />
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">Categories</h3>
              <span className="text-xs text-white/40">{categories.length} types</span>
            </div>
            <div className="mt-3">
              <FieldLabel>Filter by category</FieldLabel>
              <select
                className={inputClassName()}
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="All">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                className={cn(inputClassName(), "mt-0")}
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                placeholder="New category…"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="shrink-0 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white hover:bg-white/[0.08]"
              >
                Add
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">Locations</h3>
              <span className="text-xs text-white/40">{locations.length} bases</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {locations.map((location) => (
                <RegistryChip
                  key={location}
                  label={location}
                  active={locationFilter === location}
                  onClick={() =>
                    setLocationFilter((current) => (current === location ? "All" : location))
                  }
                />
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                className={cn(inputClassName(), "mt-0")}
                value={newLocation}
                onChange={(event) => setNewLocation(event.target.value)}
                placeholder="New location…"
              />
              <button
                type="button"
                onClick={handleAddLocation}
                className="shrink-0 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white hover:bg-white/[0.08]"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-white/10 pt-5">
          <div className="min-w-[160px] flex-1">
            <FieldLabel>Add asset category</FieldLabel>
            <select
              className={inputClassName()}
              value={addCategory}
              onChange={(event) => setAddCategory(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px] flex-1">
            <FieldLabel>Add asset location</FieldLabel>
            <select
              className={inputClassName()}
              value={addLocation}
              onChange={(event) => setAddLocation(event.target.value)}
            >
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAddAsset}
            className="inline-flex h-[42px] items-center rounded-xl border border-sky-500/40 bg-sky-500/15 px-4 text-sm font-semibold text-sky-300 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25"
          >
            Add Asset
          </button>
        </div>
      </section>

      <ResponsiveMasterDetail
        showDetail={showDetail && !!selectedAsset}
        onBack={closeDetail}
        backLabel="Back to assets"
        master={
        <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Asset List</h2>
              <p className="mt-1 text-xs text-white/45">
                {hasAssetSearch
                  ? `${filteredAssets.length} match${filteredAssets.length === 1 ? "" : "es"}`
                  : "Search above to find assets"}
              </p>
            </div>
          </div>

          {!hasAssetSearch ? (
            <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-12 text-center">
              <Search className="h-8 w-8 text-white/25" />
              <p className="mt-3 text-sm text-white/50">Search above to find assets</p>
              <p className="mt-1 text-xs text-white/35">
                Enter a tag, model, serial number, or location to populate matches here.
              </p>
            </div>
          ) : (
            <ul className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {filteredAssets.length === 0 ? (
                <li className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-white/45">
                  No assets match your search.
                </li>
              ) : (
                filteredAssets.map((asset) => {
                  const selected = asset.id === selectedAsset?.id;
                  const clientName =
                    clients.find((client) => client.id === asset.assignedClientId)?.companyName ??
                    "Unassigned";
                  const assignedTo = ownerLabel(asset.assignedToUserId);

                  return (
                    <li key={asset.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectAsset(asset.id);
                          openDetail();
                        }}
                        className={cn(
                          "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                          selected
                            ? "border-sky-400/40 bg-sky-500/10 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.15)]"
                            : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-mono text-sm font-semibold text-white">{asset.assetTag}</p>
                            <p className="mt-1 text-xs text-white/45">
                              {asset.category} · {asset.location}
                            </p>
                            <p className="mt-0.5 text-[11px] text-white/35">
                              {asset.model} · {clientName}
                            </p>
                            <p className="mt-0.5 text-[11px] text-white/35">Assigned to {assignedTo}</p>
                          </div>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
                              assetStatusClass(asset.operationalStatus),
                            )}
                          >
                            {asset.operationalStatus}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </section>
        }
        detail={
        selectedAsset ? (
          <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                  {selectedAsset.category}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">
                  {selectedAsset.assetTag || "New Asset"}
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  Purchased {formatAssetDate(selectedAsset.purchaseDate)} · {selectedAsset.location}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                  assetStatusClass(selectedAsset.operationalStatus),
                )}
              >
                {selectedAsset.operationalStatus}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Asset Tag</FieldLabel>
                <input
                  className={inputClassName()}
                  value={selectedAsset.assetTag}
                  onChange={(event) => patchSelected({ assetTag: event.target.value })}
                />
              </div>
              <div>
                <FieldLabel>Category</FieldLabel>
                <select
                  className={inputClassName()}
                  value={selectedAsset.category}
                  onChange={(event) => patchSelected({ category: event.target.value })}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Location</FieldLabel>
                <select
                  className={inputClassName()}
                  value={selectedAsset.location}
                  onChange={(event) => patchSelected({ location: event.target.value })}
                >
                  {locations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Model</FieldLabel>
                <select
                  className={inputClassName()}
                  value={selectedAsset.model}
                  onChange={(event) => patchSelected({ model: event.target.value })}
                >
                  {modelOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Serial Number</FieldLabel>
                <input
                  className={inputClassName()}
                  value={selectedAsset.serialNumber}
                  onChange={(event) => patchSelected({ serialNumber: event.target.value })}
                />
              </div>
              <div>
                <FieldLabel>Operational Status</FieldLabel>
                <select
                  className={inputClassName()}
                  value={selectedAsset.operationalStatus}
                  onChange={(event) =>
                    patchSelected({
                      operationalStatus: event.target.value as ManagedAsset["operationalStatus"],
                    })
                  }
                >
                  {ASSET_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Purchase Date</FieldLabel>
                <input
                  type="date"
                  className={inputClassName()}
                  value={selectedAsset.purchaseDate}
                  onChange={(event) => patchSelected({ purchaseDate: event.target.value })}
                />
              </div>
              {!isSoftwareAsset(selectedAsset) && (
                <div>
                  <FieldLabel>Firmware Version</FieldLabel>
                  <select
                    className={inputClassName()}
                    value={selectedAsset.firmwareVersion}
                    onChange={(event) => patchSelected({ firmwareVersion: event.target.value })}
                  >
                    {FIRMWARE_VERSION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {(isAircraftAsset(selectedAsset) || isRtkAsset(selectedAsset)) && (
                <>
                  <div>
                    <FieldLabel>D-RTK 3 Base Serial</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedAsset.drtk3BaseSerial}
                      onChange={(event) => patchSelected({ drtk3BaseSerial: event.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>RTK Calibration Mode</FieldLabel>
                    <select
                      className={inputClassName()}
                      value={selectedAsset.rtkCalibrationMode}
                      onChange={(event) =>
                        patchSelected({
                          rtkCalibrationMode:
                            event.target.value as ManagedAsset["rtkCalibrationMode"],
                        })
                      }
                    >
                      {RTK_CALIBRATION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {isAircraftAsset(selectedAsset) && (
                <>
                  <div>
                    <FieldLabel>Control Source</FieldLabel>
                    <select
                      className={inputClassName()}
                      value={selectedAsset.controlSource}
                      onChange={(event) =>
                        patchSelected({
                          controlSource: event.target.value as ManagedAsset["controlSource"],
                        })
                      }
                    >
                      {CONTROL_SOURCE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Total Flight Hours</FieldLabel>
                    <input
                      type="number"
                      min={0}
                      className={inputClassName()}
                      value={selectedAsset.totalFlightHours}
                      onChange={(event) =>
                        patchSelected({ totalFlightHours: Number(event.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Storage Used (GB)</FieldLabel>
                    <input
                      type="number"
                      min={0}
                      className={inputClassName()}
                      value={selectedAsset.storageUsedGb}
                      onChange={(event) =>
                        patchSelected({ storageUsedGb: Number(event.target.value) || 0 })
                      }
                    />
                  </div>
                </>
              )}
              <div>
                <FieldLabel>Assigned Client</FieldLabel>
                <select
                  className={inputClassName()}
                  value={selectedAsset.assignedClientId ?? ""}
                  onChange={(event) =>
                    patchSelected({ assignedClientId: event.target.value || null })
                  }
                >
                  <option value="">Unassigned</option>
                  {clientOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Assigned To</FieldLabel>
                <select
                  className={inputClassName()}
                  value={selectedAsset.assignedToUserId ?? ""}
                  onChange={(event) =>
                    patchSelected({ assignedToUserId: event.target.value || null })
                  }
                >
                  <option value="">Unassigned</option>
                  {userOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {!isSoftwareAsset(selectedAsset) && (
                <>
                  <div>
                    <FieldLabel>Insurance Expiry</FieldLabel>
                    <input
                      type="date"
                      className={inputClassName()}
                      value={selectedAsset.insuranceExpiry}
                      onChange={(event) => patchSelected({ insuranceExpiry: event.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>Last Maintenance</FieldLabel>
                    <input
                      type="date"
                      className={inputClassName()}
                      value={selectedAsset.lastMaintenanceDate}
                      onChange={(event) =>
                        patchSelected({ lastMaintenanceDate: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Next Maintenance Due</FieldLabel>
                    <input
                      type="date"
                      className={inputClassName()}
                      value={selectedAsset.nextMaintenanceDue}
                      onChange={(event) =>
                        patchSelected({ nextMaintenanceDue: event.target.value })
                      }
                    />
                  </div>
                </>
              )}
              <div className="sm:col-span-2">
                <FieldLabel>Notes</FieldLabel>
                <textarea
                  rows={3}
                  className={cn(inputClassName(), "resize-y")}
                  value={selectedAsset.notes}
                  onChange={(event) => patchSelected({ notes: event.target.value })}
                />
              </div>
            </div>
          </section>
        ) : null
        }
      />
    </div>
  );
}
