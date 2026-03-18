import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  assetName?: string;
};

export function EditConfirmDialog({
  open,
  onConfirm,
  onCancel,
  assetName,
}: Props) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent data-ocid="asset.dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Edit Asset</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to edit <strong>{assetName || "this asset"}</strong>.
            Do you want to continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} data-ocid="asset.cancel_button">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            data-ocid="asset.confirm_button"
          >
            Continue to Edit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
