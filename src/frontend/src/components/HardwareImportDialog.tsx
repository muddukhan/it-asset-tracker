import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AssetCategory, AssetStatus } from "../backend";
import { useAddAsset } from "../hooks/useQueries";
import { parseCsv } from "../lib/csvImport";

const TEMPLATE_HEADERS =
  "assetTag,employeeCode,employeeName,assetName,category,status,location,serialNumber,processorType,ram,storage,warrantyDate,purchaseDate,vendorName,invoiceNumber,notes";

const TEMPLATE_HINT =
  "# Valid category values: Laptop, Desktop, Monitor, Printer, Server, Network, Phone, Tablet, Other\n" +
  "# Valid status values: Available, Assigned, In Repair, In Storage, Retired\n";

const PREVIEW_COLUMNS = [
  "assetTag",
  "assetName",
  "category",
  "status",
  "employeeName",
];

const CATEGORY_MAP: Record<string, AssetCategory> = {
  laptop: AssetCategory.laptop,
  desktop: AssetCategory.desktop,
  monitor: AssetCategory.monitor,
  printer: AssetCategory.printer,
  server: AssetCategory.server,
  other: AssetCategory.other,
};

const STATUS_MAP: Record<string, AssetStatus> = {
  available: AssetStatus.available,
  assigned: AssetStatus.assigned,
  "in repair": AssetStatus.inRepair,
  inrepair: AssetStatus.inRepair,
  "in storage": AssetStatus.inStorage,
  instorage: AssetStatus.inStorage,
  retired: AssetStatus.retired,
};

function downloadTemplate() {
  const content = `${TEMPLATE_HINT}${TEMPLATE_HEADERS}\n`;
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "hardware_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

export function HardwareImportDialog({ open, onOpenChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const addAsset = useAddAsset();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCsv(text);
      setRows(parsed);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    setImporting(true);
    let success = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        await addAsset.mutateAsync({
          assetTag: row.assetTag || undefined,
          employeeCode: row.employeeCode || undefined,
          assignedUser: row.employeeName || undefined,
          name: row.assetName || "Unnamed Asset",
          serialNumber: row.serialNumber || "",
          location: row.location || "",
          category:
            CATEGORY_MAP[row.category?.toLowerCase().trim()] ??
            AssetCategory.other,
          status:
            STATUS_MAP[row.status?.toLowerCase().trim()] ??
            AssetStatus.available,
          processorType: row.processorType || undefined,
          ram: row.ram || undefined,
          storage: row.storage || undefined,
          warrantyDate: row.warrantyDate || undefined,
          purchaseDate: row.purchaseDate || undefined,
          vendorName: row.vendorName || undefined,
          invoiceNumber: row.invoiceNumber || undefined,
          notes: row.notes || undefined,
        });
        success++;
      } catch {
        failed++;
      }
    }
    setImporting(false);
    if (failed === 0) {
      toast.success(
        `Successfully imported ${success} hardware record${success !== 1 ? "s" : ""}`,
      );
    } else {
      toast.error(`Imported ${success}, failed ${failed}`);
    }
    setRows([]);
    if (fileRef.current) fileRef.current.value = "";
    onOpenChange(false);
  }

  function handleClose() {
    setRows([]);
    if (fileRef.current) fileRef.current.value = "";
    onOpenChange(false);
  }

  const preview = rows.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl" data-ocid="hardware_import.dialog">
        <DialogHeader>
          <DialogTitle>Import Hardware Data</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
            data-ocid="hardware_import.button"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Download CSV Template
          </Button>

          <div>
            <label
              htmlFor="csv-file-input"
              className="text-sm font-medium text-foreground block mb-1.5"
            >
              Select CSV File
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              id="csv-file-input"
              data-ocid="hardware_import.upload_button"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-input file:text-xs file:font-medium file:bg-background file:text-foreground hover:file:bg-accent cursor-pointer"
            />
          </div>

          {rows.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {rows.length} record{rows.length !== 1 ? "s" : ""} found —
                showing first {Math.min(5, rows.length)}
              </p>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {PREVIEW_COLUMNS.map((h) => (
                        <TableHead
                          key={h}
                          className="text-xs whitespace-nowrap"
                        >
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: preview rows have no stable id
                      <TableRow key={i}>
                        {PREVIEW_COLUMNS.map((h) => (
                          <TableCell
                            key={h}
                            className="text-xs max-w-[120px] truncate"
                          >
                            {row[h] || "—"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            data-ocid="hardware_import.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={rows.length === 0 || importing}
            data-ocid="hardware_import.submit_button"
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1.5" />
                Import {rows.length > 0 ? rows.length : ""} Record
                {rows.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
