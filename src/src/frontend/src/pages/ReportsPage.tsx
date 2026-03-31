import { Button } from "@/components/ui/button";
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
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle,
  Download,
  Package,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import { toast } from "sonner";
import type { Asset, StoreSoftware } from "../backend";
import { useGetAllAssets, useGetStats } from "../hooks/useQueries";
import { useGetAllSoftware } from "../hooks/useSoftwareQueries";

const STAT_SKELETONS = ["r1", "r2", "r3", "r4"] as const;

function StatCard({
  label,
  value,
  icon,
  color,
  index,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      className="rounded-xl p-5 shadow-card border flex items-start gap-4"
      style={{
        backgroundColor: "oklch(var(--card))",
        borderColor: "oklch(var(--border))",
      }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {icon}
      </div>
      <div>
        <p
          className="text-sm font-medium"
          style={{ color: "oklch(var(--muted-foreground))" }}
        >
          {label}
        </p>
        <p
          className="text-3xl font-bold mt-0.5"
          style={{ color: "oklch(var(--foreground))" }}
        >
          {value}
        </p>
      </div>
    </motion.div>
  );
}

function buildCSV(headers: string[], rows: string[][]): string {
  const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [headers.map(csvEscape), ...rows.map((r) => r.map(csvEscape))]
    .map((r) => r.join(","))
    .join("\n");
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getWarrantyStatus(
  warrantyDate?: string | null,
): "Active" | "Expiring Soon" | "Expired" | "N/A" {
  if (!warrantyDate) return "N/A";
  const expiry = new Date(warrantyDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (expiry < today) return "Expired";
  const in30 = new Date(today);
  in30.setDate(in30.getDate() + 30);
  if (expiry <= in30) return "Expiring Soon";
  return "Active";
}

function exportHardwareCSV(assets: Asset[]) {
  const headers = [
    "ID",
    "Name",
    "Category",
    "Serial Number",
    "Asset Tag",
    "Assigned User",
    "Employee Code",
    "Location",
    "Status",
    "Purchase Date",
    "Warranty Date",
    "Warranty Status",
    "Vendor Name",
    "Invoice Number",
    "Processor",
    "RAM",
    "Storage",
    "Notes",
  ];
  const rows = assets.map((a) => [
    String(a.id),
    a.name,
    a.category,
    a.serialNumber,
    (a as any).assetTag ?? "",
    a.assignedUser ?? "",
    (a.employeeCode as string | undefined) ?? "",
    a.location,
    a.status,
    a.purchaseDate ?? "",
    (a.warrantyDate as string | undefined) ?? "",
    getWarrantyStatus(a.warrantyDate as string | null | undefined),
    (a as any).vendorName ?? "",
    (a as any).invoiceNumber ?? "",
    (a.processorType as string | undefined) ?? "",
    (a.ram as string | undefined) ?? "",
    (a.storage as string | undefined) ?? "",
    a.notes ?? "",
  ]);
  downloadCSV(
    buildCSV(headers, rows),
    `hardware-assets-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}

function getSoftwareLicenseStatus(
  licenseExpiry?: string | null,
): "active" | "expiring" | "expired" {
  if (!licenseExpiry) return "active";
  const expiry = new Date(licenseExpiry);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (expiry < today) return "expired";
  const in30 = new Date(today);
  in30.setDate(in30.getDate() + 30);
  if (expiry <= in30) return "expiring";
  return "active";
}

const LICENSE_STATUS_LABEL: Record<"active" | "expiring" | "expired", string> =
  {
    active: "Active",
    expiring: "Expiring Soon",
    expired: "Expired",
  };

function exportSoftwareCSV(software: StoreSoftware[]) {
  const headers = [
    "ID",
    "Asset Tag",
    "Assigned To",
    "Name",
    "Vendor",
    "Purchase Date",
    "License Expiry",
    "License Status",
    "License Type",
    "License Key",
    "Invoice Number",
    "Notes",
  ];
  const rows = software.map((s) => [
    String(s.id),
    s.assetTag ?? "",
    s.assignedTo ?? "",
    s.name,
    s.vendor,
    s.purchaseDate ?? "",
    s.licenseExpiry ?? "",
    LICENSE_STATUS_LABEL[
      getSoftwareLicenseStatus(s.licenseExpiry as string | null | undefined)
    ],
    s.licenseType ?? "",
    s.licenseKey ?? "",
    s.invoiceNumber ?? "",
    s.notes ?? "",
  ]);
  downloadCSV(
    buildCSV(headers, rows),
    `software-assets-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}

export function ReportsPage({ onBack }: { onBack?: () => void }) {
  const { data: assets, isLoading: assetsLoading } = useGetAllAssets();
  const { data: software, isLoading: softwareLoading } = useGetAllSoftware();
  const { data: stats, isLoading: statsLoading } = useGetStats();

  const categoryBreakdown = useMemo(() => {
    if (!assets) return [];
    const counts: Record<
      string,
      { total: number; assigned: number; available: number }
    > = {};
    for (const a of assets) {
      if (!counts[a.category])
        counts[a.category] = { total: 0, assigned: 0, available: 0 };
      counts[a.category].total++;
      if (a.status === "assigned") counts[a.category].assigned++;
      if (a.status === "available") counts[a.category].available++;
    }
    return Object.entries(counts)
      .map(([cat, c]) => ({ category: cat, ...c }))
      .sort((a, b) => b.total - a.total);
  }, [assets]);

  const softwareStats = useMemo(() => {
    if (!software) return { total: 0, active: 0, expiring: 0, expired: 0 };
    let active = 0;
    let expiring = 0;
    let expired = 0;
    for (const s of software) {
      const status = getSoftwareLicenseStatus(
        s.licenseExpiry as string | null | undefined,
      );
      if (status === "active") active++;
      else if (status === "expiring") expiring++;
      else expired++;
    }
    return { total: software.length, active, expiring, expired };
  }, [software]);

  const softwareLicenseTypeBreakdown = useMemo(() => {
    if (!software) return [];
    const map: Record<
      string,
      { total: number; active: number; expiring: number; expired: number }
    > = {};
    for (const s of software) {
      const key = (s.licenseType as string | null | undefined) || "Unspecified";
      if (!map[key])
        map[key] = { total: 0, active: 0, expiring: 0, expired: 0 };
      map[key].total++;
      const status = getSoftwareLicenseStatus(
        s.licenseExpiry as string | null | undefined,
      );
      map[key][status]++;
    }
    return Object.entries(map)
      .map(([type, c]) => ({ type, ...c }))
      .sort((a, b) => b.total - a.total);
  }, [software]);

  const handleHardwareExport = () => {
    if (!assets || assets.length === 0) {
      toast.error("No hardware assets to export");
      return;
    }
    exportHardwareCSV(assets);
    toast.success(`Exported ${assets.length} hardware assets to CSV`);
  };

  const handleSoftwareExport = () => {
    if (!software || software.length === 0) {
      toast.error("No software assets to export");
      return;
    }
    exportSoftwareCSV(software);
    toast.success(`Exported ${software.length} software assets to CSV`);
  };

  return (
    <div className="flex flex-col gap-6">
      {onBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="self-start -ml-1 text-muted-foreground hover:text-foreground"
          data-ocid="reports.secondary_button"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Dashboard
        </Button>
      )}
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{ color: "oklch(var(--foreground))" }}
          >
            Reports
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            Asset analytics and data export
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleHardwareExport}
            disabled={assetsLoading || !assets}
            style={{ backgroundColor: "oklch(var(--primary))", color: "white" }}
            data-ocid="reports.primary_button"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Hardware CSV
          </Button>
          <Button
            variant="outline"
            onClick={handleSoftwareExport}
            disabled={softwareLoading || !software}
            data-ocid="reports.secondary_button"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Software CSV
          </Button>
        </div>
      </div>

      {/* Hardware Stats */}
      <div>
        <h2
          className="text-sm font-semibold uppercase tracking-wide mb-3"
          style={{ color: "oklch(var(--muted-foreground))" }}
        >
          Hardware Overview
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading ? (
            STAT_SKELETONS.map((k) => (
              <Skeleton key={k} className="h-24 rounded-xl" />
            ))
          ) : (
            <>
              <StatCard
                label="Total Assets"
                value={stats ? Number(stats.total) : 0}
                icon={<Package className="h-5 w-5" />}
                color="oklch(var(--primary))"
                index={0}
              />
              <StatCard
                label="Assigned"
                value={stats ? Number(stats.assigned) : 0}
                icon={<BarChart3 className="h-5 w-5" />}
                color="oklch(var(--status-assigned-text))"
                index={1}
              />
              <StatCard
                label="In Repair"
                value={stats ? Number(stats.inRepair) : 0}
                icon={<Wrench className="h-5 w-5" />}
                color="oklch(var(--status-inrepair-text))"
                index={2}
              />
              <StatCard
                label="Available"
                value={stats ? Number(stats.available) : 0}
                icon={<Package className="h-5 w-5" />}
                color="oklch(var(--status-available-text))"
                index={3}
              />
            </>
          )}
        </div>
      </div>

      {/* Software Summary */}
      <div>
        <h2
          className="text-sm font-semibold uppercase tracking-wide mb-3"
          style={{ color: "oklch(var(--muted-foreground))" }}
        >
          Software Summary
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {softwareLoading ? (
            STAT_SKELETONS.map((k) => (
              <Skeleton key={k} className="h-24 rounded-xl" />
            ))
          ) : (
            <>
              <StatCard
                label="Total Software"
                value={softwareStats.total}
                icon={<Package className="h-5 w-5" />}
                color="oklch(var(--primary))"
                index={0}
              />
              <StatCard
                label="Active Licenses"
                value={softwareStats.active}
                icon={<CheckCircle className="h-5 w-5" />}
                color="#22c55e"
                index={1}
              />
              <StatCard
                label="Expiring Soon"
                value={softwareStats.expiring}
                icon={<AlertTriangle className="h-5 w-5" />}
                color="#f59e0b"
                index={2}
              />
              <StatCard
                label="Expired"
                value={softwareStats.expired}
                icon={<ShieldAlert className="h-5 w-5" />}
                color="#ef4444"
                index={3}
              />
            </>
          )}
        </div>
      </div>

      {/* Category breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
        className="rounded-xl border shadow-card overflow-hidden"
        style={{
          backgroundColor: "oklch(var(--card))",
          borderColor: "oklch(var(--border))",
        }}
      >
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: "oklch(var(--border))" }}
        >
          <h2 className="font-semibold text-base text-foreground">
            Assets by Category
          </h2>
          <p
            className="text-xs mt-0.5"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            Breakdown of inventory across hardware categories
          </p>
        </div>

        {assetsLoading ? (
          <div className="p-5 space-y-3" data-ocid="reports.loading_state">
            {["c1", "c2", "c3"].map((k) => (
              <Skeleton key={k} className="h-10 w-full" />
            ))}
          </div>
        ) : categoryBreakdown.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-2"
            data-ocid="reports.empty_state"
          >
            <BarChart3
              className="h-8 w-8"
              style={{ color: "oklch(var(--muted-foreground))" }}
            />
            <p
              className="text-sm"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              No data yet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="reports.table">
              <TableHeader>
                <TableRow
                  style={{ backgroundColor: "oklch(var(--muted) / 0.5)" }}
                >
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Category
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">
                    Total
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">
                    Assigned
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">
                    Available
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">
                    Utilization
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryBreakdown.map((row, i) => {
                  const util =
                    row.total > 0
                      ? Math.round((row.assigned / row.total) * 100)
                      : 0;
                  return (
                    <TableRow
                      key={row.category}
                      className="hover:bg-muted/30"
                      data-ocid={`reports.item.${i + 1}`}
                    >
                      <TableCell className="font-medium capitalize">
                        {row.category}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {row.total}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {row.assigned}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {row.available}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${util}%`,
                                backgroundColor:
                                  "oklch(var(--status-assigned-text))",
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">
                            {util}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>

      {/* Software by License Type */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.35 }}
        className="rounded-xl border shadow-card overflow-hidden"
        style={{
          backgroundColor: "oklch(var(--card))",
          borderColor: "oklch(var(--border))",
        }}
      >
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: "oklch(var(--border))" }}
        >
          <h2 className="font-semibold text-base text-foreground">
            Software by License Type
          </h2>
          <p
            className="text-xs mt-0.5"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            License status breakdown across software categories
          </p>
        </div>

        {softwareLoading ? (
          <div className="p-5 space-y-3" data-ocid="reports.loading_state">
            {["s1", "s2", "s3"].map((k) => (
              <Skeleton key={k} className="h-10 w-full" />
            ))}
          </div>
        ) : softwareLicenseTypeBreakdown.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-2"
            data-ocid="reports.empty_state"
          >
            <Package
              className="h-8 w-8"
              style={{ color: "oklch(var(--muted-foreground))" }}
            />
            <p
              className="text-sm"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              No software data yet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow
                  style={{ backgroundColor: "oklch(var(--muted) / 0.5)" }}
                >
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    License Type
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">
                    Count
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">
                    Expired
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">
                    Expiring Soon
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">
                    Active
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {softwareLicenseTypeBreakdown.map((row, i) => (
                  <TableRow
                    key={row.type}
                    className="hover:bg-muted/30"
                    data-ocid={`reports.item.${i + 1}`}
                  >
                    <TableCell className="font-medium">{row.type}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {row.total}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.expired > 0 ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: "#ef444420",
                            color: "#ef4444",
                          }}
                        >
                          {row.expired}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground font-mono">
                          0
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.expiring > 0 ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: "#f59e0b20",
                            color: "#f59e0b",
                          }}
                        >
                          {row.expiring}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground font-mono">
                          0
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.active > 0 ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: "#22c55e20",
                            color: "#22c55e",
                          }}
                        >
                          {row.active}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground font-mono">
                          0
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
