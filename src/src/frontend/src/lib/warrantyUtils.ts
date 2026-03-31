export type WarrantyStatus = {
  label: string;
  variant: "expired" | "warning" | "valid" | "none";
  daysLeft: number;
} | null;

export function getWarrantyStatus(warrantyDate?: string): WarrantyStatus {
  if (!warrantyDate) return null;
  const expiry = new Date(warrantyDate);
  const now = new Date();
  const daysLeft = Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysLeft < 0) return { label: "Expired", variant: "expired", daysLeft };
  if (daysLeft <= 30)
    return { label: `Expires in ${daysLeft}d`, variant: "warning", daysLeft };
  return { label: `Valid (${daysLeft}d)`, variant: "valid", daysLeft };
}
