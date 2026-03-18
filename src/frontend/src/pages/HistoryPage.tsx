import { Badge } from "@/components/ui/badge";
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
import { ArrowRight, Clock, History, Search } from "lucide-react";
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
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
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

export function HistoryPage() {
  const { data: history, isLoading } = useGetHistory();
  const [search, setSearch] = useState("");

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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{ color: "oklch(var(--foreground))" }}
          >
            Assignment History
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            Complete audit trail of all asset status and assignment changes
          </p>
        </div>
        <Badge
          variant="outline"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
        >
          <Clock className="h-3.5 w-3.5" />
          {isLoading ? "…" : `${sorted.length} events`}
        </Badge>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4"
          style={{ color: "oklch(var(--muted-foreground))" }}
        />
        <Input
          placeholder="Filter by asset name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-ocid="history.search_input"
        />
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
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
                      {entry.fromAssignee !== entry.toAssignee ? (
                        <div className="flex items-center gap-1.5">
                          <span className="line-through opacity-60">
                            {entry.fromAssignee || "—"}
                          </span>
                          <ArrowRight className="h-3 w-3 flex-shrink-0" />
                          <span>{entry.toAssignee || "—"}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
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
