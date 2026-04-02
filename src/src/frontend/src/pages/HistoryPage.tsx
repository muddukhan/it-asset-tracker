import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Clock,
  History,
  Search,
  Shuffle,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import type { AssignmentHistoryEntry } from "../backend";
import { useGetHistory } from "../hooks/useQueries";

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

function truncatePrincipal(p: { toString(): string }): string {
  const s = p.toString();
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}\u2026${s.slice(-4)}`;
}

function StatusPill({ label }: { label: string }) {
  const colorMap: Record<string, string> = {
    assigned: "bg-green-100 text-green-700",
    available: "bg-blue-100 text-blue-700",
    inRepair: "bg-orange-100 text-orange-700",
    inStorage: "bg-yellow-100 text-yellow-700",
    retired: "bg-gray-100 text-gray-600",
  };
  const cls = colorMap[label] ?? "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

const SKELETONS = ["h1", "h2", "h3", "h4", "h5", "h6", "h7", "h8"] as const;

type TransferGroup = {
  assetId: string;
  assetName: string;
  transfers: AssignmentHistoryEntry[];
};

function TransferAssetList({
  history,
  search,
}: {
  history: AssignmentHistoryEntry[];
  search: string;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const transferGroups = useMemo(() => {
    // Only entries where assignee actually changed
    const transferEntries = history.filter(
      (e) =>
        (e.fromAssignee?.[0] ?? "") !== (e.toAssignee?.[0] ?? "") &&
        ((e.fromAssignee?.[0] ?? "") !== "" ||
          (e.toAssignee?.[0] ?? "") !== ""),
    );

    // Group by assetId
    const groups = new Map<string, TransferGroup>();
    for (const entry of transferEntries) {
      const key = String(entry.assetId);
      if (!groups.has(key)) {
        groups.set(key, {
          assetId: key,
          assetName: entry.assetName,
          transfers: [],
        });
      }
      groups.get(key)!.transfers.push(entry);
    }

    // Sort each group's transfers by timestamp ascending
    for (const g of groups.values()) {
      g.transfers.sort((a, b) => {
        if (a.timestamp < b.timestamp) return -1;
        if (a.timestamp > b.timestamp) return 1;
        return 0;
      });
    }

    let result = Array.from(groups.values());

    if (search) {
      const term = search.toLowerCase();
      result = result.filter((g) => g.assetName.toLowerCase().includes(term));
    }

    // Sort groups by most recent transfer descending
    result.sort((a, b) => {
      const aLast = a.transfers[a.transfers.length - 1]?.timestamp ?? 0n;
      const bLast = b.transfers[b.transfers.length - 1]?.timestamp ?? 0n;
      if (bLast > aLast) return 1;
      if (bLast < aLast) return -1;
      return 0;
    });

    return result;
  }, [history, search]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (transferGroups.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 gap-3"
        data-ocid="transfer.empty_state"
      >
        <Shuffle
          className="h-10 w-10"
          style={{ color: "oklch(var(--muted-foreground))" }}
        />
        <p
          className="text-sm font-medium"
          style={{ color: "oklch(var(--muted-foreground))" }}
        >
          {search
            ? "No transfers match your filter"
            : "No asset transfers recorded yet. Edit a software or hardware asset and change the Assigned To field to record a transfer."}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y" style={{ borderColor: "oklch(var(--border))" }}>
      {transferGroups.map((group) => {
        const isOpen = expanded.has(group.assetId);
        const latestTransfer = group.transfers[group.transfers.length - 1];
        const from =
          group.transfers[0]?.fromAssignee?.[0] ??
          group.transfers[0]?.toAssignee?.[0] ??
          "—";
        const to = latestTransfer?.toAssignee?.[0] ?? "—";
        return (
          <div key={group.assetId}>
            <button
              type="button"
              onClick={() => toggle(group.assetId)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
              data-ocid={`transfer.row.${group.assetId}`}
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {group.assetName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Asset #{group.assetId}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground max-w-[120px] truncate">
                  {from}
                </span>
                <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <span className="font-medium max-w-[120px] truncate">{to}</span>
              </div>
              <Badge variant="secondary" className="ml-2 text-xs flex-shrink-0">
                {group.transfers.length} transfer
                {group.transfers.length !== 1 ? "s" : ""}
              </Badge>
            </button>

            {isOpen && (
              <div
                className="px-8 pb-4 pt-1"
                style={{ backgroundColor: "oklch(var(--muted) / 0.3)" }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Transfer Trail
                </p>
                <div className="relative">
                  <div
                    className="absolute left-2 top-0 bottom-0 w-px"
                    style={{ backgroundColor: "oklch(var(--border))" }}
                  />
                  <div className="space-y-3">
                    {group.transfers.map((t, idx) => (
                      <div
                        key={String(t.id)}
                        className="relative pl-7"
                        data-ocid={`transfer.trail.${idx}`}
                      >
                        <div
                          className="absolute left-0 top-1.5 h-2 w-2 rounded-full border-2"
                          style={{
                            backgroundColor: "oklch(var(--background))",
                            borderColor: "oklch(var(--primary))",
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(t.timestamp)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-sm line-through opacity-60">
                            {t.fromAssignee?.[0] || "Unassigned"}
                          </span>
                          <ArrowRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {t.toAssignee?.[0] || "Unassigned"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Changed by {truncatePrincipal(t.changedBy)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function HistoryPage({ onBack }: { onBack?: () => void }) {
  const { data: history, isLoading } = useGetHistory();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"history" | "transfers">(
    "history",
  );

  const sorted = useMemo(() => {
    if (!history) return [];
    const filtered = search
      ? history.filter((e) =>
          e.assetName.toLowerCase().includes(search.toLowerCase()),
        )
      : history;
    return [...filtered].sort((a, b) => {
      if (b.timestamp > a.timestamp) return 1;
      if (b.timestamp < a.timestamp) return -1;
      return 0;
    });
  }, [history, search]);

  const transferCount = useMemo(() => {
    if (!history) return 0;
    const ids = new Set(
      history
        .filter(
          (e) =>
            (e.fromAssignee?.[0] ?? "") !== (e.toAssignee?.[0] ?? "") &&
            ((e.fromAssignee?.[0] ?? "") !== "" ||
              (e.toAssignee?.[0] ?? "") !== ""),
        )
        .map((e) => String(e.assetId)),
    );
    return ids.size;
  }, [history]);

  return (
    <div className="flex flex-col gap-6">
      {onBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="self-start -ml-1 text-muted-foreground hover:text-foreground"
          data-ocid="history.secondary_button"
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
            History
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            Audit trail of all asset status and assignment changes
          </p>
        </div>
        <Badge
          variant="outline"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
        >
          <Clock className="h-3.5 w-3.5" />
          {isLoading ? "\u2026" : `${sorted.length} events`}
        </Badge>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 border-b"
        style={{ borderColor: "oklch(var(--border))" }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "history"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          data-ocid="history.tab_history"
        >
          <History className="h-4 w-4" />
          Assignment History
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("transfers")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "transfers"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          data-ocid="history.tab_transfers"
        >
          <Shuffle className="h-4 w-4" />
          Transfer Asset List
          {transferCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {transferCount}
            </Badge>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4"
          style={{ color: "oklch(var(--muted-foreground))" }}
        />
        <Input
          placeholder={
            activeTab === "history"
              ? "Filter by asset name\u2026"
              : "Search transfers\u2026"
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-ocid="history.search_input"
        />
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl border shadow-card overflow-hidden"
        style={{
          backgroundColor: "oklch(var(--card))",
          borderColor: "oklch(var(--border))",
        }}
      >
        {isLoading ? (
          <div className="p-5 space-y-3" data-ocid="history.loading_state">
            {SKELETONS.map((k) => (
              <Skeleton key={k} className="h-10 w-full" />
            ))}
          </div>
        ) : activeTab === "transfers" ? (
          <TransferAssetList history={history ?? []} search={search} />
        ) : sorted.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 gap-3"
            data-ocid="history.empty_state"
          >
            <History
              className="h-10 w-10"
              style={{ color: "oklch(var(--muted-foreground))" }}
            />
            <p
              className="text-sm font-medium"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              {search
                ? "No history matches your filter"
                : "No history recorded yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="history.table">
              <TableHeader>
                <TableRow
                  style={{ backgroundColor: "oklch(var(--muted) / 0.5)" }}
                >
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Time
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Asset
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Changed By
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Status Change
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Assignee Change
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((entry: AssignmentHistoryEntry, i) => (
                  <TableRow
                    key={String(entry.id)}
                    className="hover:bg-muted/30 transition-colors"
                    data-ocid={`history.item.${i + 1}`}
                  >
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(entry.timestamp)}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {entry.assetName}
                      <span className="block text-xs text-muted-foreground font-mono">
                        #{String(entry.assetId)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {truncatePrincipal(entry.changedBy)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <StatusPill label={entry.fromStatus} />
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <StatusPill label={entry.toStatus} />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(entry.fromAssignee?.[0] ?? "") !==
                      (entry.toAssignee?.[0] ?? "") ? (
                        <div className="flex items-center gap-1.5">
                          <span className="line-through opacity-60">
                            {entry.fromAssignee?.[0] || "\u2014"}
                          </span>
                          <ArrowRight className="h-3 w-3 flex-shrink-0" />
                          <span>{entry.toAssignee?.[0] || "\u2014"}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">\u2014</span>
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
