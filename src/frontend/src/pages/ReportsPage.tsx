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
import { ArrowLeft, BarChart3, Download, Package, Wrench } from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import { toast } from "sonner";
import type { Asset } from "../backend";
import { useGetAllAssets, useGetStats } from "../hooks/useQueries";

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

function exportCSV(assets: Asset[]) {
  const headers = [
    "ID",
    "Name",
    "Category",
    "Serial Number",
    "Assigned User",
    "Location",
    "Status",
    "Purchase Date",
    "Notes",
  ];
  const rows = assets.map((a) => [
    String(a.id),
    a.name,
    a.category,
    a.serialNumber,
    a.assignedUser ?? "",
    a.location,
    a.status,
    a.purchaseDate ?? "",
    a.notes ?? "",
  ]);

  const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [headers.map(csvEscape), ...rows.map((r) => r.map(csvEscape))]
    .map((r) => r.join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `it-assets-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage({ onBack }: { onBack?: () => void }) {
  const { data: assets, isLoading: assetsLoading } = useGetAllAssets();
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

  const handleExport = () => {
    if (!assets || assets.length === 0) {
      toast.error("No assets to export");
      return;
    }
    exportCSV(assets);
    toast.success(`Exported ${assets.length} assets to CSV`);
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
        <Button
          onClick={handleExport}
          disabled={assetsLoading || !assets}
          style={{ backgroundColor: "oklch(var(--primary))", color: "white" }}
          data-ocid="reports.primary_button"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
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
    </div>
  );
}
