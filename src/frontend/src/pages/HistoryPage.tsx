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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
  History,
  Search,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import type { LocalHistoryEntry } from "../hooks/useQueries";
import { useGetHistory } from "../hooks/useQueries";

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusPill({ label }: { label: string }) {
  const normalized = label.toLowerCase().replace(/\s+/g, "");
  const colorMap: Record<string, string> = {
    assigned: "bg-green-100 text-green-700",
    available: "bg-blue-100 text-blue-700",
    inrepair: "bg-orange-100 text-orange-700",
    instorage: "bg-yellow-100 text-yellow-700",
    retired: "bg-gray-100 text-gray-600",
  };
  const cls = colorMap[normalized] ?? "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      {label || "—"}
    </span>
  );
}

const SKELETONS = ["h1", "h2", "h3", "h4", "h5", "h6", "h7", "h8"] as const;

// ─── Transfer track (timeline) for a single asset ───────────────────────────
function TransferTrack({ entries }: { entries: LocalHistoryEntry[] }) {
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  return (
    <div className="px-4 pb-4 pt-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Full Transfer Trail — {sorted[0]?.assetName}
      </p>
      <ol
        className="relative border-l-2 border-dashed ml-2"
        style={{ borderColor: "oklch(var(--border))" }}
      >
        {sorted.map((e, idx) => (
          <li key={e.id} className="ml-5 mb-4 last:mb-0">
            <span
              className="absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold"
              style={{ backgroundColor: "oklch(var(--primary))" }}
            >
              {idx + 1}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatTimestamp(e.timestamp)}
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium">
                {e.fromAssignee || "—"}
              </span>
              <ArrowRight
                className="h-3 w-3"
                style={{ color: "oklch(var(--primary))" }}
              />
              <span
                className="text-xs font-semibold"
                style={{ color: "oklch(var(--primary))" }}
              >
                {e.toAssignee || "—"}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                by {e.changedBy}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Transfer Asset List tab ─────────────────────────────────────────────────
function TransferAssetList({
  history,
  isLoading,
}: {
  history: LocalHistoryEntry[] | undefined;
  isLoading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Only entries where assignee actually changed between two real people
  const transfers = useMemo(() => {
    if (!history) return [];
    return history.filter(
      (e) =>
        e.fromAssignee &&
        e.toAssignee &&
        e.fromAssignee !== e.toAssignee &&
        e.fromAssignee.trim() !== "" &&
        e.toAssignee.trim() !== "",
    );
  }, [history]);

  // Group ALL history by assetId for full trail lookup
  const allByAsset = useMemo(() => {
    if (!history) return new Map<string, LocalHistoryEntry[]>();
    const map = new Map<string, LocalHistoryEntry[]>();
    for (const e of history) {
      const key = String(e.assetId);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [history]);

  // Unique assets that have at least one transfer
  const uniqueAssetIds = useMemo(() => {
    const seen = new Set<string>();
    for (const e of transfers) seen.add(String(e.assetId));
    return seen;
  }, [transfers]);

  // Deduplicate: latest transfer per asset, then filter by search
  const rows = useMemo(() => {
    const latestByAsset = new Map<string, LocalHistoryEntry>();
    for (const e of transfers) {
      const key = String(e.assetId);
      const existing = latestByAsset.get(key);
      if (!existing || e.timestamp > existing.timestamp) {
        latestByAsset.set(key, e);
      }
    }
    let arr = Array.from(latestByAsset.values());
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (e) =>
          e.assetName.toLowerCase().includes(q) ||
          (e.fromAssignee ?? "").toLowerCase().includes(q) ||
          (e.toAssignee ?? "").toLowerCase().includes(q),
      );
    }
    return arr.sort((a, b) => b.timestamp - a.timestamp);
  }, [transfers, search]);

  function toggleExpand(assetId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: "oklch(var(--muted-foreground))" }}
          />
          <Input
            placeholder="Filter by asset or employee name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-ocid="transfer.search_input"
          />
        </div>
        <Badge
          variant="outline"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          {isLoading ? "…" : `${uniqueAssetIds.size} assets transferred`}
        </Badge>
      </div>

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
          <div className="p-5 space-y-3" data-ocid="transfer.loading_state">
            {SKELETONS.map((k) => (
              <Skeleton key={k} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 gap-3"
            data-ocid="transfer.empty_state"
          >
            <ArrowLeftRight
              className="h-10 w-10"
              style={{ color: "oklch(var(--muted-foreground))" }}
            />
            <p
              className="text-sm font-medium"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              {search
                ? "No transfers match your filter"
                : "No asset transfers recorded yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="transfer.table">
              <TableHeader>
                <TableRow
                  style={{ backgroundColor: "oklch(var(--muted) / 0.5)" }}
                >
                  <TableHead className="text-xs font-semibold uppercase tracking-wide w-8" />
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Asset Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Asset ID
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    From Employee
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    To Employee
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Transfer Date
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Changed By
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">
                    Track
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((entry, i) => {
                  const assetKey = String(entry.assetId);
                  const isOpen = expanded.has(assetKey);
                  const trail = allByAsset.get(assetKey) ?? [];
                  const transferCount = trail.filter(
                    (e) =>
                      e.fromAssignee &&
                      e.toAssignee &&
                      e.fromAssignee !== e.toAssignee,
                  ).length;
                  return (
                    <>
                      <TableRow
                        key={assetKey}
                        className="hover:bg-muted/30 transition-colors"
                        data-ocid={`transfer.item.${i + 1}`}
                      >
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleExpand(assetKey)}
                            data-ocid={`transfer.toggle.${i + 1}`}
                          >
                            {isOpen ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {entry.assetName}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          #{assetKey}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="line-through text-muted-foreground">
                            {entry.fromAssignee}
                          </span>
                        </TableCell>
                        <TableCell
                          className="text-sm font-medium"
                          style={{ color: "oklch(var(--primary))" }}
                        >
                          {entry.toAssignee}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(entry.timestamp)}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {entry.changedBy}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="cursor-pointer text-xs"
                            onClick={() => toggleExpand(assetKey)}
                          >
                            {transferCount} transfer
                            {transferCount !== 1 ? "s" : ""}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <AnimatePresence key={`ap-${assetKey}`}>
                        {isOpen && (
                          <TableRow key={`${assetKey}-track`}>
                            <TableCell colSpan={8} className="p-0 bg-muted/20">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                style={{ overflow: "hidden" }}
                              >
                                <TransferTrack entries={trail} />
                              </motion.div>
                            </TableCell>
                          </TableRow>
                        )}
                      </AnimatePresence>
                    </>
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

// ─── Main page ───────────────────────────────────────────────────────────────
export function HistoryPage({ onBack }: { onBack?: () => void }) {
  const { data: history, isLoading } = useGetHistory();
  const [search, setSearch] = useState("");

  const sorted = useMemo(() => {
    if (!history) return [];
    const filtered = search
      ? history.filter((e) =>
          e.assetName.toLowerCase().includes(search.toLowerCase()),
        )
      : history;
    return [...filtered].sort((a, b) => b.timestamp - a.timestamp);
  }, [history, search]);

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
            Complete audit trail of all asset status, assignment, and transfer
            changes
          </p>
        </div>
        <Badge
          variant="outline"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
        >
          <Clock className="h-3.5 w-3.5" />
          {isLoading ? "…" : `${history?.length ?? 0} total events`}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="assignment" className="w-full">
        <TabsList className="mb-2" data-ocid="history.tab">
          <TabsTrigger value="assignment" data-ocid="history.assignment.tab">
            <History className="h-4 w-4 mr-1.5" />
            Assignment History
          </TabsTrigger>
          <TabsTrigger value="transfers" data-ocid="history.transfers.tab">
            <ArrowLeftRight className="h-4 w-4 mr-1.5" />
            Transfer Asset List
          </TabsTrigger>
        </TabsList>

        {/* ── Assignment History tab ── */}
        <TabsContent value="assignment" className="mt-0">
          <div className="flex flex-col gap-4">
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
                <div
                  className="p-5 space-y-3"
                  data-ocid="history.loading_state"
                >
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
                      : "No history recorded yet — edit any asset to start tracking"}
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
                      {sorted.map((entry: LocalHistoryEntry, i) => (
                        <TableRow
                          key={entry.id}
                          className="hover:bg-muted/30 transition-colors"
                          data-ocid={`history.item.${i + 1}`}
                        >
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTimestamp(entry.timestamp)}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {entry.assetName}
                            <span className="block text-xs text-muted-foreground font-mono">
                              #{entry.assetId}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {entry.changedBy}
                          </TableCell>
                          <TableCell>
                            {entry.fromStatus ? (
                              <div className="flex items-center gap-1.5">
                                <StatusPill label={entry.fromStatus} />
                                <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <StatusPill label={entry.toStatus} />
                              </div>
                            ) : (
                              <StatusPill label={entry.toStatus} />
                            )}
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
        </TabsContent>

        {/* ── Transfer Asset List tab ── */}
        <TabsContent value="transfers" className="mt-0">
          <TransferAssetList history={history} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
