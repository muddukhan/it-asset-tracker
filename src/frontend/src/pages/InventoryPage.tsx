import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  PackageOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { LocalAsset } from "../utils/localDB";

import { AssetDetailModal } from "../components/AssetDetailModal";
import { AssetModal } from "../components/AssetModal";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { EditConfirmDialog } from "../components/EditConfirmDialog";
import { HardwareImportDialog } from "../components/HardwareImportDialog";
import { StatusBadge } from "../components/StatusBadge";
import {
  useDeleteAsset,
  useGetAllAssets,
  useIsCallerAdmin,
  useUpdateAsset,
} from "../hooks/useQueries";
import { getWarrantyStatus } from "../lib/warrantyUtils";

const PAGE_SIZE = 15;
const SKELETON_ROWS = ["sk1", "sk2", "sk3", "sk4", "sk5", "sk6"] as const;

type Props = {
  initialStatusFilter?: string;
  initialCategoryFilter?: string;
  initialAgeFilter?: string;
  initialAssetId?: string;
  onBack?: () => void;
};

function WarrantyBadge({ warrantyDate }: { warrantyDate?: string }) {
  const ws = getWarrantyStatus(warrantyDate);
  if (!ws) return <span className="text-xs text-muted-foreground">—</span>;
  const colors = {
    expired: {
      bg: "oklch(var(--status-inrepair-bg))",
      text: "oklch(var(--status-inrepair-text))",
    },
    warning: {
      bg: "oklch(var(--status-instorage-bg))",
      text: "oklch(var(--status-instorage-text))",
    },
    valid: {
      bg: "oklch(var(--status-available-bg))",
      text: "oklch(var(--status-available-text))",
    },
    none: { bg: "oklch(var(--muted))", text: "oklch(var(--muted-foreground))" },
  };
  const c = colors[ws.variant];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {ws.label}
    </span>
  );
}

function getWindowsVersions(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem("asset_windows_versions") || "{}");
  } catch {
    return {};
  }
}

function getPurchaseYear(purchaseDate?: string): string {
  if (!purchaseDate) return "—";
  const d = new Date(purchaseDate);
  if (Number.isNaN(d.getTime())) return "—";
  return String(d.getFullYear());
}

function getAssetAgeLabel(purchaseDate?: string): string {
  if (!purchaseDate) return "—";
  const d = new Date(purchaseDate);
  if (Number.isNaN(d.getTime())) return "—";
  const years = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return `${years.toFixed(1)} yrs`;
}

export function InventoryPage({
  initialStatusFilter,
  initialCategoryFilter,
  initialAgeFilter,
  initialAssetId,
  onBack,
}: Props) {
  const { data: assets, isLoading: assetsLoading } = useGetAllAssets();
  const { data: isAdmin } = useIsCallerAdmin();
  const deleteAsset = useDeleteAsset();
  const updateAsset = useUpdateAsset();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(
    initialStatusFilter ?? "all",
  );
  const [categoryFilter, setCategoryFilter] = useState<string>(
    initialCategoryFilter ?? "all",
  );
  const [ageFilter, setAgeFilter] = useState<string>(initialAgeFilter ?? "all");
  const [processorFilter, setProcessorFilter] = useState<string>("all");
  const [ramFilter, setRamFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<LocalAsset | null>(null);
  const [editConfirmTarget, setEditConfirmTarget] = useState<LocalAsset | null>(
    null,
  );
  const [detailAsset, setDetailAsset] = useState<LocalAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LocalAsset | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  // Track whether we've already auto-opened the asset from initialAssetId
  const [autoOpenDone, setAutoOpenDone] = useState(false);

  // Auto-open detail modal when initialAssetId is provided and assets are loaded
  useEffect(() => {
    if (autoOpenDone || !initialAssetId || !assets || assets.length === 0)
      return;
    const target = assets.find((a) => String(a.id) === String(initialAssetId));
    if (target) {
      setDetailAsset(target);
      setAutoOpenDone(true);
    }
  }, [initialAssetId, assets, autoOpenDone]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: addModalOpen triggers refresh after modal close
  const windowsVersions = useMemo(() => getWindowsVersions(), [addModalOpen]);

  // Derive unique processor and RAM values from assets for filter dropdowns
  const processorOptions = useMemo(() => {
    if (!assets) return [];
    const set = new Set<string>();
    for (const a of assets) {
      if (a.processorType) set.add(a.processorType);
    }
    return Array.from(set).sort();
  }, [assets]);

  const ramOptions = useMemo(() => {
    if (!assets) return [];
    const set = new Set<string>();
    for (const a of assets) {
      if (a.ram) set.add(a.ram);
    }
    return Array.from(set).sort();
  }, [assets]);

  const filtered = useMemo(() => {
    if (!assets) return [];
    return assets.filter((a) => {
      const matchSearch =
        !searchTerm ||
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.assignedUser?.toLowerCase().includes(searchTerm.toLowerCase()) ??
          false);
      const matchStatus = statusFilter === "all" || a.status === statusFilter;
      const matchCategory =
        categoryFilter === "all" || a.category === categoryFilter;
      const matchProcessor =
        processorFilter === "all" || a.processorType === processorFilter;
      const matchRam = ramFilter === "all" || a.ram === ramFilter;
      const matchAge = (() => {
        if (ageFilter === "all") return true;
        const pd = Array.isArray(a.purchaseDate)
          ? a.purchaseDate[0]
          : (a.purchaseDate as string | undefined);
        if (!pd) return ageFilter === "unknown";
        const ageYears =
          (Date.now() - new Date(pd).getTime()) /
          (1000 * 60 * 60 * 24 * 365.25);
        if (ageFilter === "lt1") return ageYears < 1;
        if (ageFilter === "1to2") return ageYears >= 1 && ageYears < 2;
        if (ageFilter === "2to3") return ageYears >= 2 && ageYears < 3;
        if (ageFilter === "3to5") return ageYears >= 3 && ageYears < 5;
        if (ageFilter === "gt5") return ageYears >= 5;
        if (ageFilter === "unknown") return !pd;
        return true;
      })();
      return (
        matchSearch &&
        matchStatus &&
        matchCategory &&
        matchAge &&
        matchProcessor &&
        matchRam
      );
    });
  }, [
    assets,
    searchTerm,
    statusFilter,
    categoryFilter,
    ageFilter,
    processorFilter,
    ramFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAsset.mutateAsync(deleteTarget.id);
      toast.success("Asset deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete asset");
    }
  };

  const handleEditConfirm = () => {
    if (!editConfirmTarget) return;
    setEditAsset(editConfirmTarget);
    setEditConfirmTarget(null);
    setAddModalOpen(true);
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="self-start -ml-1 text-muted-foreground hover:text-foreground"
            data-ocid="inventory.secondary_button"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Dashboard
          </Button>
        )}

        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm mt-0.5 text-muted-foreground">
            Manage and track all your IT assets
          </p>
        </div>

        {/* Filter bar */}
        <div className="rounded-xl border p-4 shadow-card bg-card">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px] relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, serial, or user..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
                data-ocid="inventory.search_input"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40" data-ocid="inventory.select">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value={"Available"}>Available</SelectItem>
                <SelectItem value={"Assigned"}>Assigned</SelectItem>
                <SelectItem value={"In Storage"}>In Storage</SelectItem>
                <SelectItem value={"In Repair"}>In Repair</SelectItem>
                <SelectItem value={"Retired"}>Retired</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40" data-ocid="inventory.select">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {[
                  "Laptop",
                  "Desktop",
                  "Monitor",
                  "Phone",
                  "Tablet",
                  "Printer",
                  "Server",
                  "Network",
                  "Other",
                ].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={ageFilter}
              onValueChange={(v) => {
                setAgeFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40" data-ocid="inventory.select">
                <SelectValue placeholder="Purchase Age" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ages</SelectItem>
                <SelectItem value="lt1">Under 1 Year</SelectItem>
                <SelectItem value="1to2">1–2 Years</SelectItem>
                <SelectItem value="2to3">2–3 Years</SelectItem>
                <SelectItem value="3to5">3–5 Years</SelectItem>
                <SelectItem value="gt5">5+ Years</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
            {/* Processor filter — populated dynamically from asset data */}
            <Select
              value={processorFilter}
              onValueChange={(v) => {
                setProcessorFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44" data-ocid="inventory.select">
                <SelectValue placeholder="Processor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Processors</SelectItem>
                {processorOptions.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* RAM filter — populated dynamically from asset data */}
            <Select
              value={ramFilter}
              onValueChange={(v) => {
                setRamFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36" data-ocid="inventory.select">
                <SelectValue placeholder="RAM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All RAM</SelectItem>
                {ramOptions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setCategoryFilter("all");
                setAgeFilter("all");
                setProcessorFilter("all");
                setRamFilter("all");
                setPage(1);
              }}
              data-ocid="inventory.secondary_button"
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Asset table */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.35 }}
          className="rounded-xl border shadow-card overflow-hidden bg-card"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div>
              <h2 className="font-semibold text-base text-foreground">
                Asset Inventory
              </h2>
              <p className="text-xs mt-0.5 text-muted-foreground">
                {filtered.length} asset{filtered.length !== 1 ? "s" : ""} found
              </p>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        variant="outline"
                        onClick={() => setImportOpen(true)}
                        disabled={!isAdmin}
                        data-ocid="inventory.import_button"
                      >
                        <Upload className="h-4 w-4 mr-1.5" />
                        Import Data
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!isAdmin && (
                    <TooltipContent>Admin access required</TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <Button
                onClick={() => {
                  setEditAsset(null);
                  setAddModalOpen(true);
                }}
                data-ocid="inventory.open_modal_button"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Asset
              </Button>
            </div>
          </div>

          {assetsLoading ? (
            <div className="p-5 space-y-3" data-ocid="inventory.loading_state">
              {SKELETON_ROWS.map((k) => (
                <Skeleton key={k} className="h-10 w-full" />
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 gap-3"
              data-ocid="inventory.empty_state"
            >
              <PackageOpen className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                No assets found
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditAsset(null);
                  setAddModalOpen(true);
                }}
              >
                Add your first asset
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table data-ocid="inventory.table">
                  <TableHeader>
                    <TableRow
                      style={{ backgroundColor: "oklch(var(--muted) / 0.5)" }}
                    >
                      <TableHead className="text-xs font-semibold uppercase tracking-wide w-12">
                        #
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide w-12">
                        Photo
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Asset Tag
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Asset Name
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Category
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Serial #
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Status
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Assigned To
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Emp Code
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Location
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Specs
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Warranty Status
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Purch. Year
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Age
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Windows Version
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Notes
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Invoice
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((asset, i) => {
                      const rowIdx = (page - 1) * PAGE_SIZE + i + 1;
                      const pd = Array.isArray(asset.purchaseDate)
                        ? asset.purchaseDate[0]
                        : (asset.purchaseDate as string | undefined);
                      return (
                        <TableRow
                          key={String(asset.id)}
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          data-ocid={`inventory.item.${rowIdx}`}
                          onClick={() => setDetailAsset(asset)}
                        >
                          <TableCell className="text-sm text-muted-foreground font-mono">
                            {(page - 1) * PAGE_SIZE + i + 1}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {asset.photoDataUrl ? (
                              <img
                                src={asset.photoDataUrl}
                                alt={asset.name}
                                className="w-9 h-9 rounded-md object-cover border"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm font-mono text-muted-foreground">
                            {asset.assetTag || "—"}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {asset.name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground capitalize">
                            {asset.category}
                          </TableCell>
                          <TableCell className="text-sm font-mono text-muted-foreground">
                            {asset.serialNumber}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={asset.status} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {asset.assignedUser || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground font-mono">
                            {(asset as any).employeeCode || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {asset.location}
                          </TableCell>
                          {/* Specs column: Processor / RAM / Storage */}
                          <TableCell className="text-xs text-muted-foreground min-w-[140px]">
                            {asset.processorType ||
                            asset.ram ||
                            asset.storage ? (
                              <div className="flex flex-col gap-0.5">
                                {asset.processorType && (
                                  <span
                                    className="truncate max-w-[160px]"
                                    title={asset.processorType}
                                  >
                                    <span className="font-medium text-foreground/70">
                                      CPU:
                                    </span>{" "}
                                    {asset.processorType}
                                  </span>
                                )}
                                {asset.ram && (
                                  <span>
                                    <span className="font-medium text-foreground/70">
                                      RAM:
                                    </span>{" "}
                                    {asset.ram}
                                  </span>
                                )}
                                {asset.storage && (
                                  <span>
                                    <span className="font-medium text-foreground/70">
                                      SSD:
                                    </span>{" "}
                                    {asset.storage}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span>—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <WarrantyBadge warrantyDate={asset.warrantyDate} />
                          </TableCell>
                          {/* Purchase Year column */}
                          <TableCell className="text-sm text-muted-foreground">
                            {getPurchaseYear(pd)}
                          </TableCell>
                          {/* Age column */}
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {getAssetAgeLabel(pd)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {windowsVersions[asset.serialNumber] || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[140px]">
                            <span className="truncate block">
                              {(asset as any).notes || "—"}
                            </span>
                          </TableCell>
                          {/* Invoice column */}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {(asset as any).invoiceFile ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() =>
                                    window.open(
                                      (asset as any).invoiceFile,
                                      "_blank",
                                    )
                                  }
                                  data-ocid={`inventory.secondary_button.${rowIdx}`}
                                >
                                  <FileText className="h-3.5 w-3.5 mr-1" />
                                  View
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  disabled={!isAdmin}
                                  onClick={async () => {
                                    if (!isAdmin) return;
                                    await updateAsset.mutateAsync({
                                      id: asset.id,
                                      input: {
                                        invoiceFile: undefined,
                                        invoiceFileName: undefined,
                                      },
                                    });
                                    toast.success("Invoice removed");
                                  }}
                                  data-ocid={`inventory.delete_button.${rowIdx}`}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell
                            className="text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={!isAdmin}
                                      onClick={
                                        isAdmin
                                          ? () => setEditConfirmTarget(asset)
                                          : undefined
                                      }
                                      data-ocid={`inventory.edit_button.${rowIdx}`}
                                    >
                                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                                      Edit
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                {!isAdmin && (
                                  <TooltipContent>
                                    Admin access required
                                  </TooltipContent>
                                )}
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={!isAdmin}
                                      className="text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive"
                                      onClick={
                                        isAdmin
                                          ? () => setDeleteTarget(asset)
                                          : undefined
                                      }
                                      data-ocid={`inventory.delete_button.${rowIdx}`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                      Delete
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                {!isAdmin && (
                                  <TooltipContent>
                                    Admin access required
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t text-sm">
                  <p className="text-muted-foreground">
                    Page {page} of {totalPages} · {filtered.length} total
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      data-ocid="inventory.pagination_prev"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      data-ocid="inventory.pagination_next"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>

        <AssetModal
          open={addModalOpen}
          onClose={() => {
            setAddModalOpen(false);
            setEditAsset(null);
          }}
          asset={editAsset}
          isAdmin={isAdmin !== false}
        />
        <AssetDetailModal
          asset={detailAsset}
          onClose={() => setDetailAsset(null)}
          onEdit={(a) => {
            setDetailAsset(null);
            setEditConfirmTarget(a);
          }}
          onDelete={(a) => {
            setDetailAsset(null);
            setDeleteTarget(a);
          }}
          isAdmin={isAdmin !== false}
        />
        <EditConfirmDialog
          open={!!editConfirmTarget}
          onConfirm={handleEditConfirm}
          onCancel={() => setEditConfirmTarget(null)}
          assetName={editConfirmTarget?.name}
        />
        <DeleteConfirmDialog
          open={!!deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          assetName={deleteTarget?.name}
          isPending={deleteAsset.isPending}
        />
        <HardwareImportDialog open={importOpen} onOpenChange={setImportOpen} />
      </div>
    </TooltipProvider>
  );
}
