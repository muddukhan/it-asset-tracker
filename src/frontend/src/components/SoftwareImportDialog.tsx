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
import { useAddSoftware } from "../hooks/useSoftwareQueries";
import { parseCsv } from "../lib/csvImport";

const TEMPLATE_HEADERS =
  "assetTag,assignedTo,softwareName,vendor,purchaseDate,licenseExpiry,licenseType,licenseKey,employeeCode,employeeName,invoiceNumber,notes";

const PREVIEW_COLUMNS = [
  "assetTag",
  "softwareName",
  "assignedTo",
  "licenseType",
  "licenseExpiry",
];

function downloadTemplate() {
  const content = `${TEMPLATE_HEADERS}\n`;
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "software_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

export function SoftwareImportDialog({ open, onOpenChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const addSoftware = useAddSoftware();

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
        await addSoftware.mutateAsync({
          assetTag: row.assetTag || undefined,
          assignedTo: row.assignedTo || undefined,
          name: row.softwareName || "Unnamed Software",
          vendor: row.vendor || "",
          purchaseDate: row.purchaseDate || undefined,
          licenseExpiry: row.licenseExpiry || undefined,
          licenseType: row.licenseType || undefined,
          licenseKey: row.licenseKey || undefined,
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
        `Successfully imported ${success} software record${success !== 1 ? "s" : ""}`,
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
      <DialogContent className="max-w-2xl" data-ocid="software_import.dialog">
        <DialogHeader>
          <DialogTitle>Import Software Data</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
            data-ocid="software_import.button"
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
              data-ocid="software_import.upload_button"
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
            data-ocid="software_import.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={rows.length === 0 || importing}
            data-ocid="software_import.submit_button"
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
