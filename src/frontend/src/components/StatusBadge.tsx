const statusConfig: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  // Original enum values (backend compatibility)
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
  // String variants (localStorage)
  Assigned: {
    label: "Assigned",
    bg: "oklch(var(--status-assigned-bg))",
    text: "oklch(var(--status-assigned-text))",
  },
  "In Storage": {
    label: "In Storage",
    bg: "oklch(var(--status-instorage-bg))",
    text: "oklch(var(--status-instorage-text))",
  },
  "In Repair": {
    label: "In Repair",
    bg: "oklch(var(--status-inrepair-bg))",
    text: "oklch(var(--status-inrepair-text))",
  },
  Available: {
    label: "Available",
    bg: "oklch(var(--status-available-bg))",
    text: "oklch(var(--status-available-text))",
  },
  Retired: {
    label: "Retired",
    bg: "oklch(var(--status-retired-bg))",
    text: "oklch(var(--status-retired-text))",
  },
};

const fallbackConfig = {
  label: "Unknown",
  bg: "oklch(var(--muted))",
  text: "oklch(var(--muted-foreground))",
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? fallbackConfig;
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
