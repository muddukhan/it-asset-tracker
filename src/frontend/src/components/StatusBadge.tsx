import type { AssetStatus } from "../backend";

const statusConfig: Record<
  AssetStatus,
  { label: string; bg: string; text: string }
> = {
  assigned: {
    label: "Assigned",
    bg: "oklch(var(--status-assigned-bg))",
    text: "oklch(var(--status-assigned-text))",
  },
  inStorage: {
    label: "In Storage",
    bg: "oklch(var(--status-instorage-bg))",
    text: "oklch(var(--status-instorage-text))",
  },
  inRepair: {
    label: "In Repair",
    bg: "oklch(var(--status-inrepair-bg))",
    text: "oklch(var(--status-inrepair-text))",
  },
  available: {
    label: "Available",
    bg: "oklch(var(--status-available-bg))",
    text: "oklch(var(--status-available-text))",
  },
  retired: {
    label: "Retired",
    bg: "oklch(var(--status-retired-bg))",
    text: "oklch(var(--status-retired-text))",
  },
};

export function StatusBadge({ status }: { status: AssetStatus }) {
  const config = statusConfig[status];
  return (
    <span
      style={{ backgroundColor: config.bg, color: config.text }}
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
    >
      {config.label}
    </span>
  );
}

export { statusConfig };
