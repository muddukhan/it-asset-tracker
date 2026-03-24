import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  HardDrive,
  Hash,
  Image as ImageIcon,
  MapPin,
  MemoryStick,
  Pencil,
  Tag,
  Trash2,
  User,
} from "lucide-react";
import type { Asset } from "../backend";
import { useGetHistoryForAsset } from "../hooks/useQueries";
import { getWarrantyStatus } from "../lib/warrantyUtils";
import { StatusBadge } from "./StatusBadge";

type Props = {
  asset: Asset | null;
  onClose: () => void;
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  isAdmin: boolean;
};

function DetailRow({
  icon,
  label,
  value,
}: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0 mt-0.5 text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value || "—"}</p>
      </div>
    </div>
  );
}

function WarrantyStatusIndicator({ warrantyDate }: { warrantyDate?: string }) {
  const ws = getWarrantyStatus(warrantyDate);
  if (!ws) {
    return (
      <span className="text-sm text-muted-foreground">
        No warranty date set
      </span>
    );
  }
  const config = {
    expired: {
      icon: <AlertTriangle className="h-4 w-4" />,
      bg: "oklch(var(--status-inrepair-bg))",
      text: "oklch(var(--status-inrepair-text))",
    },
    warning: {
      icon: <Clock className="h-4 w-4" />,
      bg: "oklch(var(--status-instorage-bg))",
      text: "oklch(var(--status-instorage-text))",
    },
    valid: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      bg: "oklch(var(--status-available-bg))",
      text: "oklch(var(--status-available-text))",
    },
    none: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      bg: "oklch(var(--muted))",
      text: "oklch(var(--muted-foreground))",
    },
  };
  const c = config[ws.variant];
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {c.icon}
      {ws.label}
    </div>
  );
}

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts / 1_000_000n);
  return new Date(ms).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HistoryTab({ assetId }: { assetId: bigint }) {
  const { data: history, isLoading } = useGetHistoryForAsset(assetId);

  if (isLoading) {
    return (
      <div className="space-y-3 py-4" data-ocid="asset.loading_state">
        {["h1", "h2", "h3"].map((k) => (
          <Skeleton key={k} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-10 gap-2"
        data-ocid="asset.empty_state"
      >
        <Clock className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No history recorded yet</p>
      </div>
    );
  }

  const sorted = [...history].sort((a, b) => Number(b.timestamp - a.timestamp));

  return (
    <ul className="divide-y">
      {sorted.map((entry, i) => (
        <li
          key={String(entry.id)}
          className="py-3 flex items-start gap-3"
          data-ocid={`asset.item.${i + 1}`}
        >
          <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-muted-foreground">
                {entry.changedBy.toString().slice(0, 8)}…
              </span>
              <span className="text-xs text-muted-foreground">changed</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {String(entry.fromStatus)}
              </span>
              <span className="text-xs text-muted-foreground">→</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-foreground font-medium">
                {String(entry.toStatus)}
              </span>
            </div>
            {(entry.fromAssignee || entry.toAssignee) && (
              <p className="text-xs text-muted-foreground mt-1">
                Assignee: {entry.fromAssignee || "(none)"} →{" "}
                {entry.toAssignee || "(none)"}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatTimestamp(entry.timestamp)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AssetDetailModal({
  asset,
  onClose,
  onEdit,
  onDelete,
  isAdmin,
}: Props) {
  if (!asset) return null;

  const hasHardwareConfig = !!(
    asset.processorType ||
    asset.ram ||
    asset.storage
  );

  return (
    <Dialog open={!!asset} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        data-ocid="asset.modal"
      >
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">{asset.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1.5">
                <StatusBadge status={asset.status} />
                <span className="text-xs text-muted-foreground capitalize">
                  {asset.category}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  #{String(asset.id)}
                </span>
              </div>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(asset)}
                  data-ocid="asset.edit_button"
                >
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive border-destructive/30"
                  onClick={() => onDelete(asset)}
                  data-ocid="asset.delete_button"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="details">
          <TabsList className="w-full">
            <TabsTrigger
              value="details"
              className="flex-1"
              data-ocid="asset.tab"
            >
              Details
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex-1"
              data-ocid="asset.tab"
            >
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4 space-y-4">
            {/* Photo */}
            {asset.photoId ? (
              <img
                src={asset.photoId.getDirectURL()}
                alt={asset.name}
                className="w-full h-48 object-cover rounded-xl border"
              />
            ) : (
              <div className="w-full h-32 rounded-xl border bg-muted flex items-center justify-center gap-2 text-muted-foreground">
                <ImageIcon className="h-6 w-6" />
                <span className="text-sm">No photo attached</span>
              </div>
            )}

            {/* Warranty status */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Warranty Status
              </p>
              <WarrantyStatusIndicator warrantyDate={asset.warrantyDate} />
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailRow
                icon={<Tag className="h-4 w-4" />}
                label="Serial Number"
                value={asset.serialNumber}
              />
              <DetailRow
                icon={<MapPin className="h-4 w-4" />}
                label="Location"
                value={asset.location}
              />
              <DetailRow
                icon={<User className="h-4 w-4" />}
                label="Assigned To"
                value={asset.assignedUser}
              />
              <DetailRow
                icon={<Hash className="h-4 w-4" />}
                label="Employee Code"
                value={asset.employeeCode}
              />
              <DetailRow
                icon={<Calendar className="h-4 w-4" />}
                label="Purchase Date"
                value={asset.purchaseDate}
              />
              <DetailRow
                icon={<Calendar className="h-4 w-4" />}
                label="Warranty Date"
                value={asset.warrantyDate}
              />
            </div>

            {/* Hardware Configuration */}
            {hasHardwareConfig && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5" />
                    Hardware Configuration
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <DetailRow
                      icon={<Cpu className="h-4 w-4" />}
                      label="Processor"
                      value={asset.processorType}
                    />
                    <DetailRow
                      icon={<MemoryStick className="h-4 w-4" />}
                      label="RAM"
                      value={asset.ram}
                    />
                    <DetailRow
                      icon={<HardDrive className="h-4 w-4" />}
                      label="Storage"
                      value={asset.storage}
                    />
                  </div>
                </div>
              </>
            )}

            {asset.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {asset.notes}
                  </p>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <HistoryTab assetId={asset.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
