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
  Image as ImageIcon,
  PackageOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Asset } from "../backend";
import { AssetCategory, AssetStatus } from "../backend";
import { AssetDetailModal } from "../components/AssetDetailModal";
import { AssetModal } from "../components/AssetModal";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { EditConfirmDialog } from "../components/EditConfirmDialog";
import { StatusBadge } from "../components/StatusBadge";
import {
  useDeleteAsset,
  useGetAllAssets,
  useIsCallerAdmin,
} from "../hooks/useQueries";
import { getWarrantyStatus } from "../lib/warrantyUtils";

const PAGE_SIZE = 15;
const SKELETON_ROWS = ["sk1", "sk2", "sk3", "sk4", "sk5", "sk6"] as const;

type Props = {
  initialStatusFilter?: string;
  initialCategoryFilter?: string;
  initialAgeFilter?: string;
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

export function InventoryPage({
  initialStatusFilter,
  initialCategoryFilter,
  initialAgeFilter,
  onBack,
}: Props) {
  const { data: assets, isLoading: assetsLoading } = useGetAllAssets();
  const { data: isAdmin } = useIsCallerAdmin();
  const deleteAsset = useDeleteAsset();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(
    initialStatusFilter ?? "all",
  );
  const [categoryFilter, setCategoryFilter] = useState<string>(
    initialCategoryFilter ?? "all",
  );
  const [ageFilter, setAgeFilter] = useState<string>(initialAgeFilter ?? "all");
  const [page, setPage] = useState(1);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [editConfirmTarget, setEditConfirmTarget] = useState<Asset | null>(
    null,
  );
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);

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
      return matchSearch && matchStatus && matchCategory && matchAge;
    });
  }, [assets, searchTerm, statusFilter, categoryFilter, ageFilter]);

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
                <SelectItem value={AssetStatus.available}>Available</SelectItem>
                <SelectItem value={AssetStatus.assigned}>Assigned</SelectItem>
                <SelectItem value={AssetStatus.inStorage}>
                  In Storage
                </SelectItem>
                <SelectItem value={AssetStatus.inRepair}>In Repair</SelectItem>
                <SelectItem value={AssetStatus.retired}>Retired</SelectItem>
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
                {Object.values(AssetCategory).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
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
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setCategoryFilter("all");
                setAgeFilter("all");
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
                        Photo
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
                        Warranty
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Notes
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((asset, i) => {
                      const rowIdx = (page - 1) * PAGE_SIZE + i + 1;
                      return (
                        <TableRow
                          key={String(asset.id)}
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          data-ocid={`inventory.item.${rowIdx}`}
                          onClick={() => setDetailAsset(asset)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {asset.photoId ? (
                              <img
                                src={asset.photoId.getDirectURL()}
                                alt={asset.name}
                                className="w-9 h-9 rounded-md object-cover border"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
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
                          <TableCell>
                            <WarrantyBadge warrantyDate={asset.warrantyDate} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[140px]">
                            <span className="truncate block">
                              {(asset as any).notes || "—"}
                            </span>
                          </TableCell>
                          <TableCell
                            className="text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-2">
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
          isAdmin={!!isAdmin}
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
          isAdmin={!!isAdmin}
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
      </div>
    </TooltipProvider>
  );
}
