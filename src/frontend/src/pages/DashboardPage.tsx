import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Archive,
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
  HardDrive,
  Laptop,
  MemoryStick,
  Monitor,
  Package,
  Printer,
  Server,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import { AssetCategory, AssetStatus } from "../backend";
import { StatusBadge } from "../components/StatusBadge";
import { useGetAllAssets, useGetStats } from "../hooks/useQueries";
import { getWarrantyStatus } from "../lib/warrantyUtils";

const STAT_SKELETONS = ["s1", "s2", "s3", "s4", "s5"] as const;

const categoryIcons: Record<AssetCategory, React.ReactNode> = {
  [AssetCategory.laptop]: <Laptop className="h-5 w-5" />,
  [AssetCategory.desktop]: <Monitor className="h-5 w-5" />,
  [AssetCategory.monitor]: <Monitor className="h-5 w-5" />,
  [AssetCategory.server]: <Server className="h-5 w-5" />,
  [AssetCategory.printer]: <Printer className="h-5 w-5" />,
  [AssetCategory.peripheral]: <Cpu className="h-5 w-5" />,
  [AssetCategory.other]: <HardDrive className="h-5 w-5" />,
};

function StatCard({
  label,
  value,
  icon,
  accentColor,
  index,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accentColor: string;
  index: number;
  onClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      onClick={onClick}
      className={`rounded-xl p-5 shadow-card border bg-card transition-all duration-200 ${
        onClick
          ? "cursor-pointer hover:shadow-md hover:ring-2 hover:ring-accent/30 hover:-translate-y-0.5"
          : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold mt-1" style={{ color: accentColor }}>
            {value}
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

type Props = { onNavigate?: (page: string, filter?: string) => void };

export function DashboardPage({ onNavigate }: Props) {
  const { data: assets, isLoading: assetsLoading } = useGetAllAssets();
  const { data: stats, isLoading: statsLoading } = useGetStats();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const retiredCount = useMemo(() => {
    if (!assets) return 0;
    return assets.filter((a) => a.status === AssetStatus.retired).length;
  }, [assets]);

  const warrantyAlerts = useMemo(() => {
    if (!assets) return [];
    return assets
      .filter((a) => {
        const ws = getWarrantyStatus(a.warrantyDate);
        return ws && (ws.variant === "expired" || ws.variant === "warning");
      })
      .sort((a, b) => {
        const wsA = getWarrantyStatus(a.warrantyDate);
        const wsB = getWarrantyStatus(b.warrantyDate);
        return (wsA?.daysLeft ?? 0) - (wsB?.daysLeft ?? 0);
      })
      .slice(0, 8);
  }, [assets]);

  const categoryBreakdown = useMemo(() => {
    if (!assets) return [];
    const counts: Record<string, number> = {};
    for (const a of assets) {
      counts[a.category] = (counts[a.category] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => ({ cat: cat as AssetCategory, count }));
  }, [assets]);

  const hardwareConfigAssets = useMemo(() => {
    if (!assets) return [];
    return assets
      .filter((a) => a.processorType || a.ram || a.storage)
      .slice(0, 5);
  }, [assets]);

  const maxCategoryCount = Math.max(
    ...categoryBreakdown.map((c) => c.count),
    1,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm mt-0.5 text-muted-foreground">{today}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statsLoading || assetsLoading ? (
          STAT_SKELETONS.map((k) => (
            <Skeleton key={k} className="h-24 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              label="Total Assets"
              value={stats ? Number(stats.total) : 0}
              icon={<Package className="h-5 w-5" />}
              accentColor="oklch(var(--foreground))"
              index={0}
              onClick={() => onNavigate?.("inventory")}
            />
            <StatCard
              label="Assigned"
              value={stats ? Number(stats.assigned) : 0}
              icon={<CheckCircle2 className="h-5 w-5" />}
              accentColor="oklch(var(--status-assigned-text))"
              index={1}
              onClick={() => onNavigate?.("inventory", "assigned")}
            />
            <StatCard
              label="In Repair"
              value={stats ? Number(stats.inRepair) : 0}
              icon={<Wrench className="h-5 w-5" />}
              accentColor="oklch(var(--status-inrepair-text))"
              index={2}
              onClick={() => onNavigate?.("inventory", "inRepair")}
            />
            <StatCard
              label="Available"
              value={stats ? Number(stats.available) : 0}
              icon={<BarChart3 className="h-5 w-5" />}
              accentColor="oklch(var(--status-available-text))"
              index={3}
              onClick={() => onNavigate?.("inventory", "available")}
            />
            <StatCard
              label="Retired"
              value={retiredCount}
              icon={<Archive className="h-5 w-5" />}
              accentColor="oklch(var(--muted-foreground))"
              index={4}
              onClick={() => onNavigate?.("inventory", AssetStatus.retired)}
            />
          </>
        )}
      </div>

      {/* Quick filter buttons */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-muted-foreground self-center mr-1">
          Quick filters:
        </span>
        {[
          { label: "Available Assets", filter: AssetStatus.available },
          { label: "In Repair", filter: AssetStatus.inRepair },
          { label: "Assigned", filter: AssetStatus.assigned },
          { label: "In Storage", filter: AssetStatus.inStorage },
          { label: "Retired", filter: AssetStatus.retired },
        ].map((item) => (
          <Button
            key={item.filter}
            variant="outline"
            size="sm"
            onClick={() => onNavigate?.("inventory", item.filter)}
            data-ocid="dashboard.secondary_button"
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Warranty alerts */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          className="rounded-xl border shadow-card bg-card overflow-hidden"
        >
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <h2 className="font-semibold text-base text-foreground">
              Warranty Alerts
            </h2>
            {warrantyAlerts.length > 0 && (
              <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                {warrantyAlerts.length}
              </span>
            )}
          </div>
          {assetsLoading ? (
            <div className="p-5 space-y-3" data-ocid="dashboard.loading_state">
              {["w1", "w2", "w3"].map((k) => (
                <Skeleton key={k} className="h-12 w-full" />
              ))}
            </div>
          ) : warrantyAlerts.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 gap-2"
              data-ocid="dashboard.empty_state"
            >
              <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                All warranties are up to date
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {warrantyAlerts.map((asset, i) => {
                const ws = getWarrantyStatus(asset.warrantyDate);
                return (
                  <li
                    key={String(asset.id)}
                    className="px-5 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors"
                    data-ocid={`dashboard.item.${i + 1}`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor:
                          ws?.variant === "expired"
                            ? "oklch(var(--status-inrepair-bg))"
                            : "oklch(var(--status-instorage-bg))",
                        color:
                          ws?.variant === "expired"
                            ? "oklch(var(--status-inrepair-text))"
                            : "oklch(var(--status-instorage-text))",
                      }}
                    >
                      {ws?.variant === "expired" ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {asset.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Warranty: {asset.warrantyDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={asset.status} />
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor:
                            ws?.variant === "expired"
                              ? "oklch(var(--status-inrepair-bg))"
                              : "oklch(var(--status-instorage-bg))",
                          color:
                            ws?.variant === "expired"
                              ? "oklch(var(--status-inrepair-text))"
                              : "oklch(var(--status-instorage-text))",
                        }}
                      >
                        {ws?.label}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.div>

        {/* Category breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.35 }}
          className="rounded-xl border shadow-card bg-card overflow-hidden"
        >
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-base text-foreground">
              Assets by Category
            </h2>
          </div>
          {assetsLoading ? (
            <div className="p-5 space-y-3">
              {["c1", "c2", "c3"].map((k) => (
                <Skeleton key={k} className="h-10 w-full" />
              ))}
            </div>
          ) : categoryBreakdown.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Package className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No assets yet</p>
            </div>
          ) : (
            <div className="p-5 space-y-3">
              {categoryBreakdown.map(({ cat, count }) => (
                <div key={cat} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center bg-muted text-muted-foreground flex-shrink-0">
                    {categoryIcons[cat]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground capitalize">
                        {cat}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {count}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(count / maxCategoryCount) * 100}%`,
                          backgroundColor: "oklch(var(--accent))",
                        }}
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2 flex-shrink-0"
                    onClick={() => onNavigate?.("inventory", cat)}
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Hardware Configs panel */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.35 }}
        className="rounded-xl border shadow-card bg-card overflow-hidden"
      >
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <Cpu className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-base text-foreground">
            Asset Hardware Specs
          </h2>
          <span className="ml-auto text-xs text-muted-foreground">
            Assets with configuration details
          </span>
        </div>
        {assetsLoading ? (
          <div className="p-5 space-y-3" data-ocid="dashboard.loading_state">
            {["h1", "h2", "h3"].map((k) => (
              <Skeleton key={k} className="h-12 w-full" />
            ))}
          </div>
        ) : hardwareConfigAssets.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-10 gap-2"
            data-ocid="dashboard.empty_state"
          >
            <Cpu className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No hardware specs added yet. Edit an asset to add processor, RAM,
              and storage info.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {hardwareConfigAssets.map((asset, i) => {
              return (
                <li
                  key={String(asset.id)}
                  className="px-5 py-3 flex items-center gap-4 hover:bg-muted/20 transition-colors"
                  data-ocid={`dashboard.item.${i + 1}`}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted text-muted-foreground">
                    {categoryIcons[asset.category]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {asset.name}
                      </p>
                      <StatusBadge status={asset.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {asset.processorType && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Cpu className="h-3 w-3" />
                          {asset.processorType}
                        </span>
                      )}
                      {asset.ram && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MemoryStick className="h-3 w-3" />
                          {asset.ram}
                        </span>
                      )}
                      {asset.storage && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <HardDrive className="h-3 w-3" />
                          {asset.storage}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground capitalize flex-shrink-0">
                    {asset.category}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </motion.div>
    </div>
  );
}
