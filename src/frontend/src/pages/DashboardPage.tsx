import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  AlignJustify,
  Archive,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Cpu,
  Filter,
  HardDrive,
  Laptop,
  LayoutGrid,
  Maximize2,
  MemoryStick,
  Monitor,
  Package,
  Palette,
  Printer,
  RefreshCw,
  Server,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import { StatusBadge } from "../components/StatusBadge";
import {
  type DashboardTheme,
  type ViewMode,
  useTheme,
} from "../context/ThemeContext";
import { useGetAllAssets, useGetStats } from "../hooks/useQueries";
import { useGetAllSoftware } from "../hooks/useSoftwareQueries";
import { getWarrantyStatus } from "../lib/warrantyUtils";

const STAT_SKELETONS = ["s1", "s2", "s3", "s4", "s5"] as const;
const SW_STAT_SKELETONS = ["sw1", "sw2", "sw3", "sw4"] as const;

const categoryIcons: Record<string, React.ReactNode> = {
  Laptop: <Laptop className="h-5 w-5" />,
  Desktop: <Monitor className="h-5 w-5" />,
  Monitor: <Monitor className="h-5 w-5" />,
  Server: <Server className="h-5 w-5" />,
  Printer: <Printer className="h-5 w-5" />,
  Other: <HardDrive className="h-5 w-5" />,
};

const categorySmallIcons: Record<string, React.ReactNode> = {
  Laptop: <Laptop className="h-4 w-4" />,
  Desktop: <Monitor className="h-4 w-4" />,
  Monitor: <Monitor className="h-4 w-4" />,
  Server: <Server className="h-4 w-4" />,
  Printer: <Printer className="h-4 w-4" />,
  Other: <HardDrive className="h-4 w-4" />,
};

type AgeBucket = {
  key: string;
  label: string;
  count: number;
};

const AGE_BUCKETS_TEMPLATE: Omit<AgeBucket, "count">[] = [
  { key: "lt1", label: "Under 1 Year" },
  { key: "1to2", label: "1\u20132 Years" },
  { key: "2to3", label: "2\u20133 Years" },
  { key: "3to5", label: "3\u20135 Years" },
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

const THEMES: {
  id: DashboardTheme;
  label: string;
  color: string;
  glow?: string;
}[] = [
  { id: "blue-steel", label: "Blue Steel", color: "#3a6ea5" },
  { id: "ocean-dark", label: "Ocean Dark", color: "#1a2a4a" },
  { id: "forest-green", label: "Forest Green", color: "#2d6a4f" },
  { id: "sunset-orange", label: "Sunset Orange", color: "#c05621" },
  { id: "purple-haze", label: "Purple Haze", color: "#6b3fa0" },
  { id: "royal-crimson", label: "Royal Crimson", color: "#c0253a" },
  {
    id: "cyber-tech",
    label: "⚡ Cyber Tech",
    color: "#00e5ff",
    glow: "#00e5ff",
  },
];

const VIEW_MODES: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  {
    id: "compact",
    label: "Compact",
    icon: <AlignJustify className="h-4 w-4" />,
  },
  {
    id: "comfortable",
    label: "Comfortable",
    icon: <LayoutGrid className="h-4 w-4" />,
  },
  { id: "wide", label: "Wide", icon: <Maximize2 className="h-4 w-4" /> },
];

const STAT_GRID: Record<ViewMode, string> = {
  compact: "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3",
  comfortable: "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4",
  wide: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6",
};

const PANELS_GRID: Record<ViewMode, string> = {
  compact: "grid grid-cols-1 lg:grid-cols-3 gap-3",
  comfortable: "grid grid-cols-1 lg:grid-cols-2 gap-6",
  wide: "grid grid-cols-1 xl:grid-cols-2 gap-6",
};

type Props = { onNavigate?: (page: string, filter?: string) => void };

export function DashboardPage({ onNavigate }: Props) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["assets"] });
    await queryClient.invalidateQueries({ queryKey: ["stats"] });
    await queryClient.invalidateQueries({ queryKey: ["software"] });
    setIsRefreshing(false);
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      await queryClient.invalidateQueries({ queryKey: ["assets"] });
      await queryClient.invalidateQueries({ queryKey: ["stats"] });
      await queryClient.invalidateQueries({ queryKey: ["software"] });
    }, 30000);
    return () => clearInterval(interval);
  }, [queryClient]);

  const { data: assets, isLoading: assetsLoading } = useGetAllAssets();
  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: softwareList, isLoading: softwareLoading } =
    useGetAllSoftware();
  const { currentTheme, setTheme, viewMode, setViewMode } = useTheme();

  // Spec filter state
  const [processorFilter, setProcessorFilter] = useState<string>("all");
  const [ramFilter, setRamFilter] = useState<string>("all");
  const [ageFilter, setAgeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const ageOptions = [
    { key: "lt1", label: "Under 1 Year" },
    { key: "1to2", label: "1–2 Years" },
    { key: "2to3", label: "2–3 Years" },
    { key: "3to5", label: "3–5 Years" },
    { key: "gt5", label: "5+ Years" },
  ];

  // Panel visibility state
  type PanelVisibility = {
    warrantyAlerts: boolean;
    categoryBreakdown: boolean;
    ageAlerts: boolean;
    softwareLicenseAlerts: boolean;
    hardwareSpecs: boolean;
    assetAgeByCategory: boolean;
    warrantyExpiry: boolean;
    softwareSummary: boolean;
  };

  const DEFAULT_PANEL_VISIBILITY: PanelVisibility = {
    warrantyAlerts: true,
    categoryBreakdown: true,
    ageAlerts: true,
    softwareLicenseAlerts: true,
    hardwareSpecs: true,
    assetAgeByCategory: true,
    warrantyExpiry: true,
    softwareSummary: true,
  };

  const [panelVisibility, setPanelVisibility] = useState<PanelVisibility>(
    () => {
      try {
        const stored = localStorage.getItem("dashboard_panel_visibility");
        if (stored)
          return { ...DEFAULT_PANEL_VISIBILITY, ...JSON.parse(stored) };
      } catch {}
      return DEFAULT_PANEL_VISIBILITY;
    },
  );

  const togglePanel = (key: keyof PanelVisibility) => {
    setPanelVisibility((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("dashboard_panel_visibility", JSON.stringify(next));
      return next;
    });
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Dynamically build processor, RAM, and category options from assets
  const processorOptions = useMemo(() => {
    if (!assets) return [];
    const seen = new Set<string>();
    for (const a of assets) {
      const val = Array.isArray(a.processorType)
        ? a.processorType[0]
        : a.processorType;
      if (val && typeof val === "string" && val.trim()) seen.add(val.trim());
    }
    return Array.from(seen).sort();
  }, [assets]);

  const ramOptions = useMemo(() => {
    if (!assets) return [];
    const seen = new Set<string>();
    for (const a of assets) {
      const val = Array.isArray(a.ram) ? a.ram[0] : a.ram;
      if (val && typeof val === "string" && val.trim()) seen.add(val.trim());
    }
    return Array.from(seen).sort();
  }, [assets]);

  const categoryOptions = useMemo(() => {
    if (!assets) return [];
    const seen = new Set<string>();
    for (const a of assets) {
      if (a.category && typeof a.category === "string" && a.category.trim())
        seen.add(a.category.trim());
    }
    return Array.from(seen).sort();
  }, [assets]);

  // Filtered assets based on spec filters
  const isSpecFiltered =
    processorFilter !== "all" ||
    ramFilter !== "all" ||
    ageFilter !== "all" ||
    categoryFilter !== "all";

  const filteredAssets = useMemo(() => {
    if (!assets || !isSpecFiltered) return assets ?? [];
    let result = assets.filter((a) => {
      const proc = Array.isArray(a.processorType)
        ? a.processorType[0]
        : a.processorType;
      const ram = Array.isArray(a.ram) ? a.ram[0] : a.ram;
      if (processorFilter !== "all" && proc !== processorFilter) return false;
      if (ramFilter !== "all" && ram !== ramFilter) return false;
      if (categoryFilter !== "all" && a.category !== categoryFilter)
        return false;
      return true;
    });
    if (ageFilter !== "all") {
      result = result.filter((a) => {
        const ageYears = getAgeYears(a.purchaseDate);
        return bucketAgeKey(ageYears) === ageFilter;
      });
    }
    return result;
  }, [
    assets,
    isSpecFiltered,
    processorFilter,
    ramFilter,
    ageFilter,
    categoryFilter,
  ]);

  // Source array: filtered or full
  const sourceAssets = isSpecFiltered ? filteredAssets : (assets ?? []);

  // Stat counts derived from filtered assets when filtering is active
  const filteredTotal = useMemo(() => sourceAssets.length, [sourceAssets]);
  const filteredAssigned = useMemo(
    () => sourceAssets.filter((a) => a.status === "Assigned").length,
    [sourceAssets],
  );
  const filteredInRepair = useMemo(
    () => sourceAssets.filter((a) => a.status === "In Repair").length,
    [sourceAssets],
  );
  const filteredAvailable = useMemo(
    () => sourceAssets.filter((a) => a.status === "Available").length,
    [sourceAssets],
  );

  const retiredCount = useMemo(() => {
    return sourceAssets.filter((a) => a.status === "Retired").length;
  }, [sourceAssets]);

  const agingAssetsCount = useMemo(() => {
    return sourceAssets.filter((a) => {
      const age = getAgeYears(a.purchaseDate);
      return age !== null && age > 4;
    }).length;
  }, [sourceAssets]);

  const agingAssets = useMemo(() => {
    return sourceAssets
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
  }, [sourceAssets]);

  const warrantyAlerts = useMemo(() => {
    return sourceAssets
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
  }, [sourceAssets]);

  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of sourceAssets) {
      counts[a.category] = (counts[a.category] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => ({ cat: cat as string, count }));
  }, [sourceAssets]);

  const hardwareConfigAssets = useMemo(() => {
    return sourceAssets
      .filter((a) => a.processorType || a.ram || a.storage)
      .slice(0, 5);
  }, [sourceAssets]);

  // Compute age buckets per category
  const categoryAgeBuckets = useMemo((): Record<string, AgeBucket[]> => {
    const result: Record<string, AgeBucket[]> = {};
    for (const a of sourceAssets) {
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
  }, [sourceAssets]);

  const availableAgeCats = useMemo(
    () => Object.keys(categoryAgeBuckets) as string[],
    [categoryAgeBuckets],
  );

  const defaultAgeCat = useMemo(() => {
    if (availableAgeCats.includes("Laptop")) return "Laptop";
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
  const {
    softwareExpired,
    softwareExpiringSoon: swExpiringSoon,
    softwareAtRisk,
    softwareAtRiskCount,
  } = useMemo(() => {
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

  // Software summary counts
  const softwareTotalCount = softwareList ? softwareList.length : 0;
  const softwareActiveCount = softwareList
    ? softwareList.filter((sw) => {
        const expiryStr = Array.isArray(sw.licenseExpiry)
          ? sw.licenseExpiry[0]
          : sw.licenseExpiry;
        if (!expiryStr) return true; // no expiry = active
        const expiryDate = new Date(expiryStr);
        if (Number.isNaN(expiryDate.getTime())) return true;
        return expiryDate.getTime() > Date.now();
      }).length
    : 0;
  const softwareExpiringSoonCount = swExpiringSoon.length;
  const softwareExpiredCount = softwareExpired.length;

  // Hardware warranty expiry breakdown (all, not sliced)
  const warrantyExpiredAssets = useMemo(() => {
    return sourceAssets
      .filter((a) => {
        const ws = getWarrantyStatus(a.warrantyDate);
        return ws?.variant === "expired";
      })
      .sort((a, b) => {
        const wsA = getWarrantyStatus(a.warrantyDate);
        const wsB = getWarrantyStatus(b.warrantyDate);
        return (wsA?.daysLeft ?? 0) - (wsB?.daysLeft ?? 0);
      });
  }, [sourceAssets]);

  const warrantyExpiringSoonAssets = useMemo(() => {
    return sourceAssets
      .filter((a) => {
        const ws = getWarrantyStatus(a.warrantyDate);
        return ws?.variant === "warning";
      })
      .sort((a, b) => {
        const wsA = getWarrantyStatus(a.warrantyDate);
        const wsB = getWarrantyStatus(b.warrantyDate);
        return (wsA?.daysLeft ?? 0) - (wsB?.daysLeft ?? 0);
      });
  }, [sourceAssets]);

  const [warrantyTab, setWarrantyTab] = useState<"expiringSoon" | "expired">(
    "expiringSoon",
  );

  const _softwareCardAccentColor =
    softwareExpired.length > 0 ? "#dc2626" : "#d97706";

  return (
    <div className="flex flex-col gap-6">
      {/* Header row with title + theme/view toolbar */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className={`text-3xl font-bold text-foreground${currentTheme === "cyber-tech" ? " font-orbitron tracking-widest" : ""}`}
          >
            Dashboard
          </h1>
          <p className="text-sm mt-0.5 text-muted-foreground">{today}</p>
        </div>

        {/* Theme & View toolbar */}
        <div className="flex items-center gap-2" data-ocid="dashboard.panel">
          {/* Theme picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                data-ocid="dashboard.open_modal_button"
              >
                <Palette className="h-3.5 w-3.5" />
                Theme
                <span
                  className="w-3 h-3 rounded-full border border-border ml-0.5"
                  style={{
                    backgroundColor:
                      THEMES.find((t) => t.id === currentTheme)?.color ??
                      "#3a6ea5",
                  }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-52 p-3"
              data-ocid="dashboard.popover"
            >
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                Dashboard Theme
              </p>
              <div className="flex flex-col gap-1">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setTheme(theme.id)}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors w-full text-left ${
                      currentTheme === theme.id
                        ? "bg-accent/10 text-foreground"
                        : "hover:bg-muted text-foreground"
                    }`}
                    data-ocid="dashboard.toggle"
                  >
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0 border border-border/60"
                      style={{
                        backgroundColor: theme.color,
                        boxShadow: theme.glow
                          ? `0 0 8px ${theme.glow}, 0 0 16px ${theme.glow}55`
                          : undefined,
                      }}
                    />
                    <span className="flex-1 text-sm font-medium">
                      {theme.label}
                    </span>
                    {currentTheme === theme.id && (
                      <Check className="h-3.5 w-3.5 text-accent" />
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleRefresh}
            disabled={isRefreshing}
            data-ocid="dashboard.secondary_button"
          >
            <RefreshCw
              className={`h-3.5 w-3.5${isRefreshing ? " animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>

          {/* View mode toggle */}
          <div
            className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5"
            aria-label="View mode"
          >
            {VIEW_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                title={mode.label}
                onClick={() => setViewMode(mode.id)}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === mode.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-ocid="dashboard.toggle"
              >
                {mode.icon}
              </button>
            ))}
          </div>

          {/* Customize panels */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                data-ocid="dashboard.open_modal_button"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Customize
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-56 p-3"
              data-ocid="dashboard.popover"
            >
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                Dashboard Panels
              </p>
              <div className="flex flex-col gap-1.5">
                {(
                  [
                    { key: "warrantyAlerts", label: "Warranty Alerts" },
                    { key: "warrantyExpiry", label: "Warranty Expiry Tab" },
                    { key: "softwareSummary", label: "Software Summary" },
                    { key: "categoryBreakdown", label: "Assets by Category" },
                    { key: "ageAlerts", label: "Age Alerts" },
                    {
                      key: "softwareLicenseAlerts",
                      label: "Software License Alerts",
                    },
                    { key: "hardwareSpecs", label: "Hardware Specs" },
                    {
                      key: "assetAgeByCategory",
                      label: "Asset Age by Category",
                    },
                  ] as { key: keyof PanelVisibility; label: string }[]
                ).map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 px-1 py-1 rounded cursor-pointer hover:bg-muted text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={panelVisibility[key]}
                      onChange={() => togglePanel(key)}
                      className="rounded"
                      data-ocid="dashboard.checkbox"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Filter Stats bar */}
      <div
        className="flex items-center gap-3 flex-wrap p-3 rounded-xl border bg-muted/30"
        data-ocid="dashboard.panel"
      >
        <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground flex-shrink-0">
          <Filter className="h-3.5 w-3.5" />
          Filter Stats:
        </span>

        {/* Category filter */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger
            className="h-8 w-44 text-xs"
            data-ocid="dashboard.select"
          >
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categoryOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Age filter */}
        <Select value={ageFilter} onValueChange={setAgeFilter}>
          <SelectTrigger
            className="h-8 w-36 text-xs"
            data-ocid="dashboard.select"
          >
            <SelectValue placeholder="All Ages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ages</SelectItem>
            {ageOptions.map((opt) => (
              <SelectItem key={opt.key} value={opt.key}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Processor filter */}
        <Select value={processorFilter} onValueChange={setProcessorFilter}>
          <SelectTrigger
            className="h-8 w-44 text-xs"
            data-ocid="dashboard.select"
          >
            <SelectValue placeholder="All Processors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Processors</SelectItem>
            {processorOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* RAM filter */}
        <Select value={ramFilter} onValueChange={setRamFilter}>
          <SelectTrigger
            className="h-8 w-36 text-xs"
            data-ocid="dashboard.select"
          >
            <SelectValue placeholder="All RAM" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All RAM</SelectItem>
            {ramOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Active filter indicators */}
        {isSpecFiltered && (
          <>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent/15 text-accent-foreground border border-accent/20">
              Showing {filteredAssets.length} of {assets?.length ?? 0} assets
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground ml-auto"
              onClick={() => {
                setProcessorFilter("all");
                setRamFilter("all");
                setAgeFilter("all");
                setCategoryFilter("all");
              }}
              data-ocid="dashboard.secondary_button"
            >
              Clear Filters
            </Button>
          </>
        )}
      </div>

      {/* Hardware Summary */}
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Hardware Summary
        </span>
      </div>
      <div className={STAT_GRID[viewMode]}>
        {statsLoading || assetsLoading || softwareLoading ? (
          STAT_SKELETONS.map((k) => (
            <Skeleton key={k} className="h-24 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              label="Total Hardware"
              value={
                isSpecFiltered ? filteredTotal : stats ? Number(stats.total) : 0
              }
              icon={<Package className="h-5 w-5" />}
              accentColor="oklch(var(--foreground))"
              index={0}
              onClick={() => onNavigate?.("inventory")}
            />
            <StatCard
              label="Assigned"
              value={
                isSpecFiltered
                  ? filteredAssigned
                  : stats
                    ? Number(stats.assigned)
                    : 0
              }
              icon={<CheckCircle2 className="h-5 w-5" />}
              accentColor="oklch(var(--status-assigned-text))"
              index={1}
              onClick={() => onNavigate?.("inventory", "Assigned")}
            />
            <StatCard
              label="In Repair"
              value={
                isSpecFiltered
                  ? filteredInRepair
                  : stats
                    ? Number(stats.inRepair)
                    : 0
              }
              icon={<Wrench className="h-5 w-5" />}
              accentColor="oklch(var(--status-inrepair-text))"
              index={2}
              onClick={() => onNavigate?.("inventory", "In Repair")}
            />
            <StatCard
              label="Available"
              value={
                isSpecFiltered
                  ? filteredAvailable
                  : stats
                    ? Number(stats.available)
                    : 0
              }
              icon={<BarChart3 className="h-5 w-5" />}
              accentColor="oklch(var(--status-available-text))"
              index={3}
              onClick={() => onNavigate?.("inventory", "Available")}
            />
            <StatCard
              label="Retired"
              value={retiredCount}
              icon={<Archive className="h-5 w-5" />}
              accentColor="oklch(var(--muted-foreground))"
              index={4}
              onClick={() => onNavigate?.("inventory", "Retired")}
            />
          </>
        )}
      </div>

      {/* Software Summary Stat Cards */}
      {panelVisibility.softwareSummary && (
        <>
          <div className="flex items-center gap-2 mt-1">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Software Summary
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {softwareLoading ? (
              SW_STAT_SKELETONS.map((k) => (
                <Skeleton key={k} className="h-24 rounded-xl" />
              ))
            ) : (
              <>
                <StatCard
                  label="Total Software"
                  value={softwareTotalCount}
                  icon={<Package className="h-5 w-5" />}
                  accentColor="oklch(var(--foreground))"
                  index={0}
                  onClick={() => onNavigate?.("software")}
                />
                <StatCard
                  label="Active Licenses"
                  value={softwareActiveCount}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  accentColor="#16a34a"
                  index={1}
                  onClick={() => onNavigate?.("software", "valid")}
                />
                <StatCard
                  label="Expiring Soon"
                  value={softwareExpiringSoonCount}
                  icon={<Clock className="h-5 w-5" />}
                  accentColor="#d97706"
                  index={2}
                  warningBg={softwareExpiringSoonCount > 0}
                  onClick={() => onNavigate?.("software", "expiring")}
                />
                <StatCard
                  label="Expired"
                  value={softwareExpiredCount}
                  icon={<AlertTriangle className="h-5 w-5" />}
                  accentColor="#dc2626"
                  index={3}
                  warningBg={softwareExpiredCount > 0}
                  onClick={() => onNavigate?.("software", "expired")}
                />
              </>
            )}
          </div>
        </>
      )}

      {/* Quick filter buttons */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-muted-foreground self-center mr-1">
          Quick filters:
        </span>
        {[
          { label: "Available Assets", filter: "Available" },
          { label: "In Repair", filter: "In Repair" },
          { label: "Assigned", filter: "Assigned" },
          { label: "In Storage", filter: "In Storage" },
          { label: "Retired", filter: "Retired" },
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

      <div className={PANELS_GRID[viewMode]}>
        {/* Warranty alerts */}
        {panelVisibility.warrantyAlerts && (
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
              <div
                className="p-5 space-y-3"
                data-ocid="dashboard.loading_state"
              >
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2 flex-shrink-0"
                        onClick={() =>
                          onNavigate?.("inventory", `assetId:${asset.id}`)
                        }
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
        )}

        {/* Category breakdown */}
        {panelVisibility.categoryBreakdown && (
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
                      onClick={() => onNavigate?.("inventory", `cat:${cat}`)}
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Age Alerts Panel */}
      {panelVisibility.ageAlerts && (
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
            <h2
              className="font-semibold text-base"
              style={{ color: "#92400e" }}
            >
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
                      onClick={() =>
                        onNavigate?.("inventory", `cat:${asset.category}`)
                      }
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
      )}

      {/* Hardware Warranty Expiry Panel */}
      {panelVisibility.warrantyExpiry && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.35 }}
          className="rounded-xl border shadow-card bg-card overflow-hidden"
          data-ocid="dashboard.warranty_expiry_panel"
        >
          <div className="px-5 py-4 border-b flex items-center gap-2 flex-wrap">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <h2 className="font-semibold text-base text-foreground">
              Hardware Warranty Expiry
            </h2>
            {(warrantyExpiredAssets.length > 0 ||
              warrantyExpiringSoonAssets.length > 0) && (
              <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                {warrantyExpiredAssets.length +
                  warrantyExpiringSoonAssets.length}
              </span>
            )}
          </div>
          {/* Tab bar */}
          <div className="flex border-b bg-muted/30">
            <button
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${warrantyTab === "expiringSoon" ? "border-b-2 border-primary text-primary bg-background" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setWarrantyTab("expiringSoon")}
              type="button"
              data-ocid="dashboard.tab_expiring_soon"
            >
              Expiring Soon
              {warrantyExpiringSoonAssets.length > 0 && (
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                  {warrantyExpiringSoonAssets.length}
                </span>
              )}
            </button>
            <button
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${warrantyTab === "expired" ? "border-b-2 border-destructive text-destructive bg-background" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setWarrantyTab("expired")}
              type="button"
              data-ocid="dashboard.tab_expired"
            >
              Expired
              {warrantyExpiredAssets.length > 0 && (
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                  {warrantyExpiredAssets.length}
                </span>
              )}
            </button>
          </div>
          {assetsLoading ? (
            <div className="p-5 space-y-3" data-ocid="dashboard.loading_state">
              {["wt1", "wt2", "wt3"].map((k) => (
                <Skeleton key={k} className="h-12 w-full" />
              ))}
            </div>
          ) : warrantyTab === "expiringSoon" ? (
            warrantyExpiringSoonAssets.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12 gap-2"
                data-ocid="dashboard.empty_state"
              >
                <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No warranties expiring soon
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {warrantyExpiringSoonAssets.map((asset, i) => {
                  const ws = getWarrantyStatus(asset.warrantyDate);
                  return (
                    <li
                      key={String(asset.id)}
                      className="px-5 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors"
                      data-ocid={`dashboard.item.${i + 1}`}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-100 text-amber-700">
                        <Clock className="h-4 w-4" />
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
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          {ws?.label}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2 flex-shrink-0"
                        onClick={() =>
                          onNavigate?.("inventory", `assetId:${asset.id}`)
                        }
                        data-ocid="dashboard.secondary_button"
                      >
                        View
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : warrantyExpiredAssets.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 gap-2"
              data-ocid="dashboard.empty_state"
            >
              <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No warranties expired
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {warrantyExpiredAssets.map((asset, i) => {
                const ws = getWarrantyStatus(asset.warrantyDate);
                return (
                  <li
                    key={String(asset.id)}
                    className="px-5 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors"
                    data-ocid={`dashboard.item.${i + 1}`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-100 text-red-700">
                      <AlertTriangle className="h-4 w-4" />
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
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        {ws?.label}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2 flex-shrink-0"
                      onClick={() =>
                        onNavigate?.("inventory", `assetId:${asset.id}`)
                      }
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
      )}

      {/* Software License Alerts Panel */}
      {panelVisibility.softwareLicenseAlerts && (
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
                      (expiryDate.getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24),
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
                          <span className={sw.vendor ? " \u00b7 " : ""}>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2 flex-shrink-0"
                      onClick={() => onNavigate?.("software")}
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
      )}

      {/* Hardware Configs panel */}
      {panelVisibility.hardwareSpecs && (
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
                No hardware specs added yet. Edit an asset to add processor,
                RAM, and storage info.
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2 flex-shrink-0"
                      onClick={() =>
                        onNavigate?.("inventory", `cat:${asset.category}`)
                      }
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
      )}

      {/* Asset Age by Category panel */}
      {panelVisibility.assetAgeByCategory && (
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
                      {categorySmallIcons[cat as string]}
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
                                  : bucket.key === "gt5" ||
                                      bucket.key === "3to5"
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
      )}
    </div>
  );
}
