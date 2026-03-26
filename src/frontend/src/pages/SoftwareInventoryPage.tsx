import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
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
  Monitor,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { StoreSoftware, StoreSoftwareInput } from "../backend";
import { useIsCallerAdmin } from "../hooks/useQueries";
import {
  useAddSoftware,
  useDeleteSoftware,
  useGetAllSoftware,
  useUpdateSoftware,
} from "../hooks/useSoftwareQueries";

const PAGE_SIZE = 15;
const SKELETON_ROWS = ["sk1", "sk2", "sk3", "sk4", "sk5", "sk6"] as const;

type Props = { onBack?: () => void };

function getLicenseStatus(expiry?: string) {
  if (!expiry) return null;
  const expiryDate = new Date(expiry);
  const now = new Date();
  const diffDays = Math.ceil(
    (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "expiring";
  return "valid";
}

function LicenseBadge({ expiry }: { expiry?: string }) {
  const status = getLicenseStatus(expiry);
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  if (status === "expired")
    return (
      <Badge variant="destructive" className="text-xs">
        Expired
      </Badge>
    );
  if (status === "expiring")
    return (
      <Badge
        className="text-xs"
        style={{
          backgroundColor: "oklch(var(--status-instorage-bg))",
          color: "oklch(var(--status-instorage-text))",
          border: "none",
        }}
      >
        Expiring Soon
      </Badge>
    );
  return (
    <Badge
      className="text-xs"
      style={{
        backgroundColor: "oklch(var(--status-available-bg))",
        color: "oklch(var(--status-available-text))",
        border: "none",
      }}
    >
      Valid
    </Badge>
  );
}

type SoftwareForm = StoreSoftwareInput & {
  assetTag?: string;
  invoiceNumber?: string;
};

const EMPTY_FORM: SoftwareForm = {
  name: "",
  vendor: "",
  purchaseDate: "",
  licenseExpiry: "",
  licenseType: "",
  licenseKey: "",
  notes: "",
  assignedTo: "",
  assetTag: "",
  invoiceNumber: "",
};

export function SoftwareInventoryPage({ onBack }: Props) {
  const { data: software, isLoading } = useGetAllSoftware();
  const { data: isAdmin } = useIsCallerAdmin();
  const addSoftware = useAddSoftware();
  const updateSoftware = useUpdateSoftware();
  const deleteSoftware = useDeleteSoftware();

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StoreSoftware | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoreSoftware | null>(null);
  const [form, setForm] = useState<SoftwareForm>(EMPTY_FORM);

  const filtered = useMemo(() => {
    if (!software) return [];
    if (!searchTerm) return software;
    const term = searchTerm.toLowerCase();
    return software.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.vendor.toLowerCase().includes(term),
    );
  }, [software, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (s: StoreSoftware) => {
    setEditTarget(s);
    setForm({
      name: s.name,
      vendor: s.vendor,
      purchaseDate: s.purchaseDate ?? "",
      licenseExpiry: s.licenseExpiry ?? "",
      licenseType: s.licenseType ?? "",
      licenseKey: s.licenseKey ?? "",
      notes: s.notes ?? "",
      assignedTo: s.assignedTo ?? "",
      assetTag: (s as any).assetTag ?? "",
      invoiceNumber: (s as any).invoiceNumber ?? "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.vendor.trim()) {
      toast.error("Software name and vendor are required");
      return;
    }
    const input: StoreSoftwareInput = {
      name: form.name.trim(),
      vendor: form.vendor.trim(),
      purchaseDate: form.purchaseDate || undefined,
      licenseExpiry: form.licenseExpiry || undefined,
      licenseType: form.licenseType || undefined,
      licenseKey: form.licenseKey || undefined,
      notes: form.notes || undefined,
      assignedTo: form.assignedTo || undefined,
      ...(form.assetTag ? { assetTag: form.assetTag } : {}),
      ...(form.invoiceNumber ? { invoiceNumber: form.invoiceNumber } : {}),
    } as StoreSoftwareInput;
    try {
      if (editTarget) {
        await updateSoftware.mutateAsync({ id: editTarget.id, input });
        toast.success("Software updated");
      } else {
        await addSoftware.mutateAsync(input);
        toast.success("Software added");
      }
      setModalOpen(false);
      setEditTarget(null);
      setForm(EMPTY_FORM);
    } catch {
      toast.error(
        editTarget ? "Failed to update software" : "Failed to add software",
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSoftware.mutateAsync(deleteTarget.id);
      toast.success("Software deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete software");
    }
  };

  const isPending = addSoftware.isPending || updateSoftware.isPending;

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="self-start -ml-1 text-muted-foreground hover:text-foreground"
            data-ocid="software.secondary_button"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Dashboard
          </Button>
        )}

        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Monitor
              className="h-7 w-7"
              style={{ color: "oklch(var(--accent))" }}
            />
            Software Inventory
          </h1>
          <p className="text-sm mt-0.5 text-muted-foreground">
            Track software licenses, vendors, and expiry dates
          </p>
        </div>

        {/* Search bar */}
        <div className="rounded-xl border p-4 shadow-card bg-card">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px] relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by software name or vendor..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
                data-ocid="software.search_input"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setPage(1);
              }}
              data-ocid="software.secondary_button"
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.35 }}
          className="rounded-xl border shadow-card overflow-hidden bg-card"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div>
              <h2 className="font-semibold text-base text-foreground">
                Software List
              </h2>
              <p className="text-xs mt-0.5 text-muted-foreground">
                {filtered.length} software item
                {filtered.length !== 1 ? "s" : ""} found
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={openAdd}
                    disabled={isAdmin === false}
                    data-ocid="software.open_modal_button"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Software
                  </Button>
                </span>
              </TooltipTrigger>
              {isAdmin === false && (
                <TooltipContent>Admin access required</TooltipContent>
              )}
            </Tooltip>
          </div>

          {isLoading ? (
            <div className="p-5 space-y-3" data-ocid="software.loading_state">
              {SKELETON_ROWS.map((k) => (
                <Skeleton key={k} className="h-10 w-full" />
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 gap-3"
              data-ocid="software.empty_state"
            >
              <Monitor className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                No software found
              </p>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={openAdd}>
                  Add your first software
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table data-ocid="software.table">
                  <TableHeader>
                    <TableRow
                      style={{ backgroundColor: "oklch(var(--muted) / 0.5)" }}
                    >
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Asset Tag
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Software Name
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Date of Purchase
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        License Expiry
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        License Status
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        License Type
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        License Key
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Assigned To
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Vendor
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">
                        Invoice No.
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
                    {paginated.map((sw, i) => {
                      const rowIdx = (page - 1) * PAGE_SIZE + i + 1;
                      return (
                        <TableRow
                          key={String(sw.id)}
                          className="hover:bg-muted/30 transition-colors"
                          data-ocid={`software.item.${rowIdx}`}
                        >
                          <TableCell className="text-sm text-muted-foreground">
                            {(sw as any).assetTag || "—"}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {sw.name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {sw.purchaseDate || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {sw.licenseExpiry || "—"}
                          </TableCell>
                          <TableCell>
                            <LicenseBadge expiry={sw.licenseExpiry} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {sw.licenseType || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground font-mono text-xs">
                            {sw.licenseKey ? (
                              <span className="truncate max-w-[120px] block">
                                {sw.licenseKey}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {sw.assignedTo || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {sw.vendor}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {(sw as any).invoiceNumber || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[140px]">
                            <span className="truncate block">
                              {sw.notes || "—"}
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
                                        isAdmin ? () => openEdit(sw) : undefined
                                      }
                                      data-ocid={`software.edit_button.${rowIdx}`}
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
                                          ? () => setDeleteTarget(sw)
                                          : undefined
                                      }
                                      data-ocid={`software.delete_button.${rowIdx}`}
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
                      data-ocid="software.pagination_prev"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      data-ocid="software.pagination_next"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* Add/Edit Modal */}
      <Dialog
        open={modalOpen}
        onOpenChange={(open) => !open && setModalOpen(false)}
      >
        <DialogContent className="max-w-lg" data-ocid="software.dialog">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Software" : "Add Software"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Asset Tag — first field */}
            <div className="grid gap-1.5">
              <Label htmlFor="sw-asset-tag">Asset Tag</Label>
              <Input
                id="sw-asset-tag"
                value={form.assetTag ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, assetTag: e.target.value }))
                }
                placeholder="e.g. SW-001"
                data-ocid="software.input"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sw-name">
                Software Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sw-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Microsoft Office 365"
                data-ocid="software.input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="sw-purchase">Date of Purchase</Label>
                <Input
                  id="sw-purchase"
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, purchaseDate: e.target.value }))
                  }
                  data-ocid="software.input"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sw-expiry">License Expiry</Label>
                <Input
                  id="sw-expiry"
                  type="date"
                  value={form.licenseExpiry}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, licenseExpiry: e.target.value }))
                  }
                  data-ocid="software.input"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sw-type">License Type</Label>
              <Input
                id="sw-type"
                value={form.licenseType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, licenseType: e.target.value }))
                }
                placeholder="e.g. Annual, Perpetual, Subscription"
                data-ocid="software.input"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sw-key">License Key</Label>
              <Input
                id="sw-key"
                value={form.licenseKey}
                onChange={(e) =>
                  setForm((f) => ({ ...f, licenseKey: e.target.value }))
                }
                placeholder="e.g. XXXXX-XXXXX-XXXXX"
                className="font-mono text-sm"
                data-ocid="software.input"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sw-assigned-to">Assigned To</Label>
              <Input
                id="sw-assigned-to"
                value={form.assignedTo ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, assignedTo: e.target.value }))
                }
                placeholder="e.g. John Smith or EMP001"
                data-ocid="software.input"
              />
            </div>
            {/* Vendor & Invoice — last fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="sw-vendor">
                  Vendor <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sw-vendor"
                  value={form.vendor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, vendor: e.target.value }))
                  }
                  placeholder="e.g. Microsoft"
                  data-ocid="software.input"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sw-invoice">Invoice Number</Label>
                <Input
                  id="sw-invoice"
                  value={form.invoiceNumber ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, invoiceNumber: e.target.value }))
                  }
                  placeholder="e.g. INV-2024-0001"
                  data-ocid="software.input"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sw-notes">Notes</Label>
              <Textarea
                id="sw-notes"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Any additional notes..."
                rows={3}
                data-ocid="software.textarea"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              data-ocid="software.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              data-ocid="software.submit_button"
            >
              {isPending
                ? "Saving..."
                : editTarget
                  ? "Save Changes"
                  : "Add Software"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent data-ocid="software.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Software</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.name}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteTarget(null)}
              data-ocid="software.cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="software.confirm_button"
            >
              {deleteSoftware.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
