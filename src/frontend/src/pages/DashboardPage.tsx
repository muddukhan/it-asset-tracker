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
import { useMemo, useState } from "react";
import { AssetCategory, AssetStatus } from "../backend";
import { StatusBadge } from "../components/StatusBadge";
import { useGetAllAssets, useGetStats } from "../hooks/useQueries";
import { useGetAllSoftware } from "../hooks/useSoftwareQueries";
import { getWarrantyStatus } from "../lib/warrantyUtils";

const STAT_SKELETONS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"] as const;

const categoryIcons: Record<AssetCategory, React.ReactNode> = {
  [AssetCategory.laptop]: <Laptop className="h-5 w-5" />,
  [AssetCategory.desktop]: <Monitor className="h-5 w-5" />,
  [AssetCategory.monitor]: <Monitor className="h-5 w-5" />,
  [AssetCategory.server]: <Server className="h-5 w-5" />,
  [AssetCategory.printer]: <Printer className="h-5 w-5" />,
  [AssetCategory.peripheral]: <Cpu className="h-5 w-5" />,
  [AssetCategory.other]: <HardDrive className="h-5 w-5" />,
};

const categorySmallIcons: Record<AssetCategory, React.ReactNode> = {
  [AssetCategory.laptop]: <Laptop className="h-4 w-4" />,
  [AssetCategory.desktop]: <Monitor className="h-4 w-4" />,
  [AssetCategory.monitor]: <Monitor className="h-4 w-4" />,
  [AssetCategory.server]: <Server className="h-4 w-4" />,
  [AssetCategory.printer]: <Printer className="h-4 w-4" />,
  [AssetCategory.peripheral]: <Cpu className="h-4 w-4" />,
  [AssetCategory.other]: <HardDrive className="h-4 w-4" />,
};

type AgeBucket = {
  key: string;
  label: string;
  count: number;
};

const AGE_BUCKETS_TEMPLATE: Omit<AgeBucket, "count">[] = [
  { key: "lt1", label: "Under 1 Year" },
  { key: "1to2", label: "1–2 Years" },
  { key: "2to3", label: "2–3 Years" },
  { key: "3to5", label: "3–5 Years" },
  { key: "gt5", label: "5+ Years" },
  { key: "unknown", label: "Unknown" },
];

function getAgeYears(
  purchaseDate: string | string[] | undefined | null,
): number | null {
  const pd = Array.isArray(purchaseDate)
    ? purchaseDate[0]
    : (purchaseDate as string | undefined);
  if (!pd) return null;
  return (Date.now() - new Date(pd).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

function bucketAgeKey(ageYears: number | null): string {
  if (ageYears === null) return "unknown";
  if (ageYears < 1) return "lt1";
  if (ageYears < 2) return "1to2";
  if (ageYears < 3) return "2to3";
  if (ageYears < 5) return "3to5";
  return "gt5";
}

function StatCard({
  label,
  value,
  icon,
  accentColor,
  index,
  onClick,
  warningBg,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accentColor: string;
  index: number;
  onClick?: () => void;
  warningBg?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      onClick={onClick}
      className={`rounded-xl p-5 shadow-card border transition-all duration-200 ${
        warningBg
          ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
          : "bg-card"
      } ${
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
  const { data: softwareList, isLoading: softwareLoading } =
    useGetAllSoftware();

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

  const agingAssetsCount = useMemo(() => {
    if (!assets) return 0;
    return assets.filter((a) => {
      const age = getAgeYears(a.purchaseDate);
      return age !== null && age > 4;
    }).length;
  }, [assets]);

  const agingAssets = useMemo(() => {
    if (!assets) return [];
    return assets
      .filter((a) => {
        const age = getAgeYears(a.purchaseDate);
        return age !== null && age > 4;
      })
      .sort((a, b) => {
        const ageA = getAgeYears(a.purchaseDate) ?? 0;
        const ageB = getAgeYears(b.purchaseDate) ?? 0;
        return ageB - ageA;
      })
      .slice(0, 10);
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

  // Compute age buckets per category
  const categoryAgeBuckets = useMemo((): Record<string, AgeBucket[]> => {
    if (!assets) return {};
    const result: Record<string, AgeBucket[]> = {};
    for (const a of assets) {
      const cat = a.category as string;
      if (!result[cat]) {
        result[cat] = AGE_BUCKETS_TEMPLATE.map((b) => ({ ...b, count: 0 }));
      }
      const ageYears = getAgeYears(a.purchaseDate);
      const key = bucketAgeKey(ageYears);
      const bucket = result[cat].find((b) => b.key === key);
      if (bucket) bucket.count++;
    }
    // Only keep categories where at least one asset has a purchaseDate set
    return Object.fromEntries(
      Object.entries(result).filter(([, buckets]) =>
        buckets.some((b) => b.key !== "unknown" && b.count > 0),
      ),
    );
  }, [assets]);

  const availableAgeCats = useMemo(
    () => Object.keys(categoryAgeBuckets) as AssetCategory[],
    [categoryAgeBuckets],
  );

  const defaultAgeCat = useMemo(() => {
    if (availableAgeCats.includes(AssetCategory.laptop))
      return AssetCategory.laptop;
    return availableAgeCats[0] ?? null;
  }, [availableAgeCats]);

  const [selectedAgeCat, setSelectedAgeCat] = useState<string | null>(null);

  const activeCat = selectedAgeCat ?? defaultAgeCat;
  const activeBuckets: AgeBucket[] = activeCat
    ? (categoryAgeBuckets[activeCat] ?? [])
    : [];
  const maxBucketCount = Math.max(...activeBuckets.map((b) => b.count), 1);
  const totalActiveCat = activeBuckets.reduce((s, b) => s + b.count, 0);

  const maxCategoryCount = Math.max(
    ...categoryBreakdown.map((c) => c.count),
    1,
  );

  // Software expiry computed data
  const { softwareExpired, softwareAtRisk, softwareAtRiskCount } =
    useMemo(() => {
      if (!softwareList) {
        return {
          softwareExpired: [],
          softwareExpiringSoon: [],
          softwareExpiringWarn: [],
          softwareAtRisk: [],
          softwareAtRiskCount: 0,
        };
      }
      const now = Date.now();
      const expired: typeof softwareList = [];
      const expiringSoon: typeof softwareList = [];
      const expiringWarn: typeof softwareList = [];

      for (const sw of softwareList) {
        const expiryStr = Array.isArray(sw.licenseExpiry)
          ? sw.licenseExpiry[0]
          : sw.licenseExpiry;
        if (!expiryStr) continue;
        const expiryDate = new Date(expiryStr);
        if (Number.isNaN(expiryDate.getTime())) continue;
        const daysUntil = Math.floor(
          (expiryDate.getTime() - now) / (1000 * 60 * 60 * 24),
        );
        if (daysUntil < 0) {
          expired.push(sw);
        } else if (daysUntil <= 30) {
          expiringSoon.push(sw);
        } else if (daysUntil <= 90) {
          expiringWarn.push(sw);
        }
      }

      const atRisk = [...expired, ...expiringSoon, ...expiringWarn].sort(
        (a, b) => {
          const getExpiry = (s: typeof a) => {
            const str = Array.isArray(s.licenseExpiry)
              ? s.licenseExpiry[0]
              : s.licenseExpiry;
            return str ? new Date(str).getTime() : Number.POSITIVE_INFINITY;
          };
          return getExpiry(a) - getExpiry(b);
        },
      );

      return {
        softwareExpired: expired,
        softwareExpiringSoon: expiringSoon,
        softwareExpiringWarn: expiringWarn,
        softwareAtRisk: atRisk,
        softwareAtRiskCount: atRisk.length,
      };
    }, [softwareList]);

  const softwareCardAccentColor =
    softwareExpired.length > 0 ? "#dc2626" : "#d97706";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm mt-0.5 text-muted-foreground">{today}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {statsLoading || assetsLoading || softwareLoading ? (
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
            <StatCard
              label="Aging Assets"
              value={agingAssetsCount}
              icon={<AlertTriangle className="h-5 w-5" />}
              accentColor="#d97706"
              index={5}
              warningBg
              onClick={() => onNavigate?.("inventory", "age:gt5")}
            />
            <StatCard
              label="License Alerts"
              value={softwareAtRiskCount}
              icon={<Package className="h-5 w-5" />}
              accentColor={
                softwareAtRiskCount > 0
                  ? softwareCardAccentColor
                  : "oklch(var(--muted-foreground))"
              }
              index={6}
              warningBg={softwareAtRiskCount > 0}
              onClick={() => onNavigate?.("software")}
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

      {/* Age Alerts Panel */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.27, duration: 0.35 }}
        className="rounded-xl border border-amber-200 shadow-card bg-card overflow-hidden dark:border-amber-800"
      >
        <div
          className="px-5 py-4 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2"
          style={{ backgroundColor: "rgb(255 251 235)" }}
        >
          <AlertTriangle className="h-4 w-4" style={{ color: "#d97706" }} />
          <h2 className="font-semibold text-base" style={{ color: "#92400e" }}>
            Age Alerts
          </h2>
          <span className="text-xs" style={{ color: "#b45309" }}>
            Assets older than 4 years
          </span>
          {agingAssets.length > 0 && (
            <span
              className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "#fde68a", color: "#92400e" }}
            >
              {agingAssetsCount}
            </span>
          )}
        </div>
        {assetsLoading ? (
          <div className="p-5 space-y-3" data-ocid="dashboard.loading_state">
            {["ag1", "ag2", "ag3"].map((k) => (
              <Skeleton key={k} className="h-12 w-full" />
            ))}
          </div>
        ) : agingAssets.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-10 gap-2"
            data-ocid="dashboard.empty_state"
          >
            <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No assets older than 4 years
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {agingAssets.map((asset, i) => {
              const ageYears = getAgeYears(asset.purchaseDate);
              const ageLabel =
                ageYears !== null ? `${ageYears.toFixed(1)} yrs` : "Unknown";
              return (
                <li
                  key={String(asset.id)}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-amber-50/50 transition-colors"
                  data-ocid={`dashboard.item.${i + 1}`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#fde68a", color: "#92400e" }}
                  >
                    {categorySmallIcons[asset.category]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {asset.name}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {asset.category}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs flex-shrink-0"
                    style={{
                      borderColor: "#f59e0b",
                      color: "#92400e",
                      backgroundColor: "#fef3c7",
                    }}
                  >
                    {ageLabel}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2 flex-shrink-0"
                    onClick={() => onNavigate?.("inventory", asset.category)}
                    data-ocid="dashboard.secondary_button"
                  >
                    View
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </motion.div>

      {/* Software License Alerts Panel */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.35 }}
        className="rounded-xl border shadow-card bg-card overflow-hidden"
        data-ocid="dashboard.software_expiry_alerts"
      >
        <div
          className="px-5 py-4 border-b flex items-center gap-2"
          style={{
            backgroundColor:
              softwareAtRiskCount > 0
                ? softwareExpired.length > 0
                  ? "rgb(254 242 242)"
                  : "rgb(255 251 235)"
                : undefined,
            borderBottomColor:
              softwareAtRiskCount > 0
                ? softwareExpired.length > 0
                  ? "#fecaca"
                  : "#fde68a"
                : undefined,
          }}
        >
          <Package
            className="h-4 w-4"
            style={{
              color:
                softwareAtRiskCount > 0
                  ? softwareExpired.length > 0
                    ? "#dc2626"
                    : "#d97706"
                  : undefined,
            }}
          />
          <h2
            className="font-semibold text-base"
            style={{
              color:
                softwareAtRiskCount > 0
                  ? softwareExpired.length > 0
                    ? "#991b1b"
                    : "#92400e"
                  : undefined,
            }}
          >
            Software License Alerts
          </h2>
          <span
            className="text-xs text-muted-foreground"
            style={{
              color:
                softwareAtRiskCount > 0
                  ? softwareExpired.length > 0
                    ? "#b91c1c"
                    : "#b45309"
                  : undefined,
            }}
          >
            Expired or expiring within 90 days
          </span>
          {softwareAtRiskCount > 0 && (
            <span
              className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor:
                  softwareExpired.length > 0 ? "#fecaca" : "#fde68a",
                color: softwareExpired.length > 0 ? "#991b1b" : "#92400e",
              }}
            >
              {softwareAtRiskCount}
            </span>
          )}
        </div>

        {softwareLoading ? (
          <div className="p-5 space-y-3" data-ocid="dashboard.loading_state">
            {["sl1", "sl2", "sl3"].map((k) => (
              <Skeleton key={k} className="h-12 w-full" />
            ))}
          </div>
        ) : softwareAtRisk.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-10 gap-2"
            data-ocid="dashboard.empty_state"
          >
            <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              All licenses are up to date
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {softwareAtRisk.map((sw, i) => {
              const expiryStr = Array.isArray(sw.licenseExpiry)
                ? sw.licenseExpiry[0]
                : sw.licenseExpiry;
              const expiryDate = expiryStr ? new Date(expiryStr) : null;
              const daysUntil = expiryDate
                ? Math.floor(
                    (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                  )
                : null;

              let badgeLabel = "";
              let badgeBg = "";
              let badgeColor = "";

              if (daysUntil !== null && daysUntil < 0) {
                badgeLabel = "Expired";
                badgeBg = "#fecaca";
                badgeColor = "#991b1b";
              } else if (daysUntil !== null && daysUntil <= 30) {
                badgeLabel = "Expiring Soon";
                badgeBg = "#fde68a";
                badgeColor = "#92400e";
              } else if (daysUntil !== null) {
                badgeLabel = `Expiring in ${daysUntil}d`;
                badgeBg = "#fef9c3";
                badgeColor = "#713f12";
              }

              return (
                <li
                  key={String(sw.id)}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors"
                  data-ocid={`dashboard.item.${i + 1}`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: badgeBg, color: badgeColor }}
                  >
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {sw.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sw.vendor && <span>{sw.vendor}</span>}
                      {expiryDate && (
                        <span className={sw.vendor ? " · " : ""}>
                          Expires: {expiryDate.toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs flex-shrink-0"
                    style={{
                      borderColor: badgeBg,
                      backgroundColor: badgeBg,
                      color: badgeColor,
                    }}
                  >
                    {badgeLabel}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </motion.div>

      {/* Hardware Configs panel */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.33, duration: 0.35 }}
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

      {/* Asset Age by Category panel (replaces Laptop Age Distribution) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.36, duration: 0.35 }}
        className="rounded-xl border shadow-card bg-card overflow-hidden"
      >
        <div className="px-5 py-4 border-b flex items-center gap-2 flex-wrap">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-base text-foreground">
            Asset Age by Category
          </h2>
          {activeCat && (
            <span className="ml-auto text-xs text-muted-foreground">
              {totalActiveCat} asset{totalActiveCat !== 1 ? "s" : ""} with
              purchase date
            </span>
          )}
        </div>

        {assetsLoading ? (
          <div className="p-5 space-y-3" data-ocid="dashboard.loading_state">
            {["a1", "a2", "a3"].map((k) => (
              <Skeleton key={k} className="h-10 w-full" />
            ))}
          </div>
        ) : availableAgeCats.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-10 gap-2"
            data-ocid="dashboard.empty_state"
          >
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No assets with purchase dates found
            </p>
          </div>
        ) : (
          <div>
            {/* Category tabs */}
            <div className="px-5 pt-4 pb-2 flex gap-2 flex-wrap border-b">
              {availableAgeCats.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedAgeCat(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                    activeCat === cat
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  }`}
                  data-ocid="dashboard.tab"
                >
                  <span className="opacity-80">
                    {categorySmallIcons[cat as AssetCategory]}
                  </span>
                  {cat}
                </button>
              ))}
            </div>

            {/* Buckets */}
            <div className="p-5 space-y-3">
              {activeBuckets.map((bucket) => (
                <div key={bucket.key} className="flex items-center gap-3">
                  <div className="w-28 flex-shrink-0">
                    <span className="text-sm font-medium text-foreground">
                      {bucket.label}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden mr-3">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${(bucket.count / maxBucketCount) * 100}%`,
                            backgroundColor:
                              bucket.key === "unknown"
                                ? "oklch(var(--muted-foreground))"
                                : bucket.key === "gt5" || bucket.key === "3to5"
                                  ? "#f59e0b"
                                  : "oklch(var(--accent))",
                            opacity: bucket.key === "unknown" ? 0.5 : 1,
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground w-5 text-right flex-shrink-0">
                        {bucket.count}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2 flex-shrink-0"
                    disabled={bucket.count === 0}
                    onClick={() =>
                      onNavigate?.("inventory", `age:${bucket.key}`)
                    }
                    data-ocid="dashboard.secondary_button"
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
