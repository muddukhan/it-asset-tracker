import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Cpu,
  FileText,
  HardDrive,
  Image as ImageIcon,
  Loader2,
  MemoryStick,
  Monitor,
  Paperclip,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocalSession } from "../context/LocalSessionContext";
import { useAddAsset, useUpdateAsset } from "../hooks/useQueries";
import type { LocalAsset } from "../utils/localDB";
import { ReLoginDialog } from "./ReLoginDialog";

const CATEGORIES = [
  "Laptop",
  "Desktop",
  "Monitor",
  "Phone",
  "Tablet",
  "Printer",
  "Server",
  "Network",
  "Other",
];
const STATUSES = [
  "Available",
  "Assigned",
  "In Storage",
  "In Repair",
  "Retired",
];

type Props = {
  open: boolean;
  onClose: () => void;
  asset?: LocalAsset | null;
  isAdmin?: boolean;
};

type FormState = {
  name: string;
  serialNumber: string;
  category: string;
  status: string;
  location: string;
  assignedUser: string;
  employeeCode: string;
  purchaseDate: string;
  warrantyDate: string;
  notes: string;
  processorType: string;
  ram: string;
  storage: string;
  windowsVersion: string;
  assetTag: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceFile: string;
  invoiceFileName: string;
};

const defaultForm: FormState = {
  name: "",
  serialNumber: "",
  category: "Laptop",
  status: "Available",
  location: "",
  assignedUser: "",
  employeeCode: "",
  purchaseDate: "",
  warrantyDate: "",
  notes: "",
  processorType: "",
  ram: "",
  storage: "",
  windowsVersion: "",
  assetTag: "",
  vendorName: "",
  invoiceNumber: "",
  invoiceFile: "",
  invoiceFileName: "",
};

export function AssetModal({ open, onClose, asset }: Props) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [reLoginOpen, setReLoginOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const invoiceFileRef = useRef<HTMLInputElement>(null);
  const addAsset = useAddAsset();
  const updateAsset = useUpdateAsset();
  const localSession = useLocalSession();

  // biome-ignore lint/correctness/useExhaustiveDependencies: open is intentional trigger
  useEffect(() => {
    if (asset) {
      setForm({
        name: asset.name,
        serialNumber: asset.serialNumber,
        category: asset.category,
        status: asset.status,
        location: asset.location,
        assignedUser: asset.assignedUser ?? "",
        employeeCode: asset.employeeCode ?? "",
        purchaseDate: asset.purchaseDate ?? "",
        warrantyDate: asset.warrantyDate ?? "",
        notes: asset.notes ?? "",
        processorType: asset.processorType ?? "",
        ram: asset.ram ?? "",
        storage: asset.storage ?? "",
        windowsVersion: asset.windowsVersion ?? "",
        assetTag: asset.assetTag ?? "",
        vendorName: asset.vendorName ?? "",
        invoiceNumber: asset.invoiceNumber ?? "",
        invoiceFile: (asset as { invoiceFile?: string }).invoiceFile ?? "",
        invoiceFileName:
          (asset as { invoiceFileName?: string }).invoiceFileName ?? "",
      });
      setExistingPhotoUrl(asset.photoDataUrl ?? null);
    } else {
      setForm(defaultForm);
      setExistingPhotoUrl(null);
    }
    setPhotoFile(null);
    setPhotoPreview(null);
  }, [asset, open]);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const isPending = addAsset.isPending || updateAsset.isPending;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handleInvoiceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(file.type)) {
      toast.error("Only PDF, image, or Word documents allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((f) => ({
        ...f,
        invoiceFile: ev.target?.result as string,
        invoiceFileName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const doSubmit = async () => {
    const input = {
      name: form.name,
      serialNumber: form.serialNumber,
      category: form.category,
      status: form.status,
      location: form.location,
      assignedUser: form.assignedUser || undefined,
      employeeCode: form.employeeCode || undefined,
      purchaseDate: form.purchaseDate || undefined,
      warrantyDate: form.warrantyDate || undefined,
      notes: form.notes || undefined,
      processorType: form.processorType || undefined,
      ram: form.ram || undefined,
      storage: form.storage || undefined,
      windowsVersion: form.windowsVersion || undefined,
      assetTag: form.assetTag || undefined,
      vendorName: form.vendorName || undefined,
      invoiceNumber: form.invoiceNumber || undefined,
      invoiceFile: form.invoiceFile || undefined,
      invoiceFileName: form.invoiceFileName || undefined,
      photoDataUrl: existingPhotoUrl ?? undefined,
      photoFile: photoFile ?? undefined,
    };
    try {
      if (asset) {
        await updateAsset.mutateAsync({ id: asset.id, input });
        toast.success("Asset updated successfully");
      } else {
        await addAsset.mutateAsync(input);
        toast.success("Asset added successfully");
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Not authenticated")) {
        setPendingSubmit(true);
        setReLoginOpen(true);
      } else {
        toast.error("Failed to save asset");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localSession?.password) {
      setPendingSubmit(true);
      setReLoginOpen(true);
      return;
    }
    await doSubmit();
  };

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  const currentPhoto = photoPreview || existingPhotoUrl;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="asset.modal"
        >
          <DialogHeader>
            <DialogTitle>{asset ? "Edit Asset" : "Add New Asset"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Photo upload */}
            <div className="space-y-2">
              <Label>Photo</Label>
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  className="w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:border-accent transition-colors p-0"
                  style={{
                    borderColor: currentPhoto ? "transparent" : undefined,
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  data-ocid="asset.dropzone"
                >
                  {currentPhoto ? (
                    <img
                      src={currentPhoto}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <ImageIcon className="h-6 w-6" />
                      <span className="text-xs">Photo</span>
                    </div>
                  )}
                </button>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    data-ocid="asset.upload_button"
                  >
                    <Upload className="h-4 w-4 mr-1.5" />
                    {currentPhoto ? "Change Photo" : "Upload Photo"}
                  </Button>
                  {currentPhoto && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(null);
                        setExistingPhotoUrl(null);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4 mr-1.5" />
                      Remove
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG up to 5MB
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="assetTag">Asset Tag</Label>
                <Input
                  id="assetTag"
                  value={form.assetTag}
                  onChange={(e) => set("assetTag")(e.target.value)}
                  placeholder="e.g. ASSET-001"
                  data-ocid="asset.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="employeeCode">Employee Code</Label>
                <Input
                  id="employeeCode"
                  value={form.employeeCode}
                  onChange={(e) => set("employeeCode")(e.target.value)}
                  placeholder="e.g. EMP-001"
                  data-ocid="asset.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assignedUser">Employee Name</Label>
                <Input
                  id="assignedUser"
                  value={form.assignedUser}
                  onChange={(e) => set("assignedUser")(e.target.value)}
                  placeholder="e.g. John Doe"
                  data-ocid="asset.input"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="name">Asset Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => set("name")(e.target.value)}
                  placeholder="e.g. MacBook Pro 16"
                  required
                  data-ocid="asset.input"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="serial">Serial Number *</Label>
                <Input
                  id="serial"
                  value={form.serialNumber}
                  onChange={(e) => set("serialNumber")(e.target.value)}
                  placeholder="e.g. SN-2024-001"
                  required
                  data-ocid="asset.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={set("category")}>
                  <SelectTrigger data-ocid="asset.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status *</Label>
                <Select value={form.status} onValueChange={set("status")}>
                  <SelectTrigger data-ocid="asset.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => set("location")(e.target.value)}
                  placeholder="e.g. HQ Floor 2"
                  required
                  data-ocid="asset.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => set("purchaseDate")(e.target.value)}
                  data-ocid="asset.input"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="warrantyDate">Warranty Expiry Date</Label>
                <Input
                  id="warrantyDate"
                  type="date"
                  value={form.warrantyDate}
                  onChange={(e) => set("warrantyDate")(e.target.value)}
                  data-ocid="asset.input"
                />
              </div>

              {/* Hardware specs */}
              <div className="space-y-3 col-span-2">
                <div className="flex items-center gap-2">
                  <Separator className="flex-1" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">
                    Hardware Specs
                  </span>
                  <Separator className="flex-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="processorType">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                        Processor
                      </span>
                    </Label>
                    <Input
                      id="processorType"
                      value={form.processorType}
                      onChange={(e) => set("processorType")(e.target.value)}
                      placeholder="e.g. Intel Core i7-12700"
                      data-ocid="asset.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ram">
                      <span className="flex items-center gap-1.5">
                        <MemoryStick className="h-3.5 w-3.5 text-muted-foreground" />
                        RAM
                      </span>
                    </Label>
                    <Input
                      id="ram"
                      value={form.ram}
                      onChange={(e) => set("ram")(e.target.value)}
                      placeholder="e.g. 16GB DDR5"
                      data-ocid="asset.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="storage">
                      <span className="flex items-center gap-1.5">
                        <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                        Storage
                      </span>
                    </Label>
                    <Input
                      id="storage"
                      value={form.storage}
                      onChange={(e) => set("storage")(e.target.value)}
                      placeholder="e.g. 512GB NVMe SSD"
                      data-ocid="asset.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="windowsVersion">
                      <span className="flex items-center gap-1.5">
                        <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                        Windows Version
                      </span>
                    </Label>
                    <Input
                      id="windowsVersion"
                      value={form.windowsVersion}
                      onChange={(e) => set("windowsVersion")(e.target.value)}
                      placeholder="e.g. Windows 11 Pro"
                      data-ocid="asset.input"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Vendor & Invoice */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Separator className="flex-1" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">
                  Purchase Details
                </span>
                <Separator className="flex-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="vendorName">Vendor Name</Label>
                  <Input
                    id="vendorName"
                    value={form.vendorName}
                    onChange={(e) => set("vendorName")(e.target.value)}
                    placeholder="e.g. Dell Technologies"
                    data-ocid="asset.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    value={form.invoiceNumber}
                    onChange={(e) => set("invoiceNumber")(e.target.value)}
                    placeholder="e.g. INV-2024-0001"
                    data-ocid="asset.input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                    Attach Invoice
                  </span>
                </Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {form.invoiceFile && form.invoiceFileName && (
                    <div className="flex items-center gap-2 flex-1 min-w-0 rounded-md border px-3 py-1.5 bg-muted/40">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-muted-foreground truncate flex-1">
                        {form.invoiceFileName}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs flex-shrink-0"
                        onClick={() => window.open(form.invoiceFile, "_blank")}
                        data-ocid="asset.secondary_button"
                      >
                        View
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs flex-shrink-0 text-destructive hover:text-destructive"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            invoiceFile: "",
                            invoiceFileName: "",
                          }))
                        }
                        data-ocid="asset.delete_button"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  <input
                    ref={invoiceFileRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                    className="hidden"
                    onChange={handleInvoiceFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => invoiceFileRef.current?.click()}
                    data-ocid="asset.upload_button"
                  >
                    <Paperclip className="h-3.5 w-3.5 mr-1.5" />
                    {form.invoiceFile ? "Replace File" : "Choose File"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  PDF, image, or Word doc — max 5MB
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => set("notes")(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
                data-ocid="asset.textarea"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-ocid="asset.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                style={{
                  backgroundColor: "oklch(var(--primary))",
                  color: "white",
                }}
                data-ocid="asset.submit_button"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? "Saving..." : asset ? "Update Asset" : "Add Asset"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ReLoginDialog
        open={reLoginOpen}
        username={localSession?.username ?? ""}
        onSuccess={() => {
          setReLoginOpen(false);
          if (pendingSubmit) {
            setPendingSubmit(false);
            doSubmit();
          }
        }}
        onCancel={() => {
          setReLoginOpen(false);
          setPendingSubmit(false);
        }}
      />
    </>
  );
}
