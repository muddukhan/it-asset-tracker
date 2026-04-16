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
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { useContext } from "react";
import { toast } from "sonner";
import { persistSession } from "../context/LocalSessionContext";
import { LocalSessionContext } from "../context/LocalSessionContext";
import { getActor } from "../hooks/useActor";

type Props = {
  open: boolean;
  username: string;
  onSuccess: (password: string) => void;
  onCancel: () => void;
};

export function ReLoginDialog({ open, username, onSuccess, onCancel }: Props) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setLocalSession } = useContext(LocalSessionContext);

  const handleSubmit = async () => {
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const actor = await getActor();
      const result = await actor.loginLocalUser(username, password);
      if (!result) {
        setError("Incorrect password");
        return;
      }
      const session = {
        username,
        name: result.name,
        accessLevel: result.accessLevel,
        password,
      };
      persistSession(session);
      setLocalSession(session);
      setPassword("");
      onSuccess(password);
    } catch {
      toast.error("Could not verify credentials — try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm" data-ocid="relogin.dialog">
        <DialogHeader>
          <DialogTitle>Re-enter Your Password</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Your session password has expired. Please re-enter your password to
          continue.
        </p>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Username</Label>
            <Input value={username} readOnly className="bg-muted/50" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="relogin-pw" className="text-sm">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="relogin-pw"
                type={showPassword ? "text" : "password"}
                className="pl-9 pr-10"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                data-ocid="relogin.input"
                autoFocus
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          {error && (
            <p
              className="text-sm rounded-lg px-3 py-2"
              style={{
                backgroundColor: "oklch(var(--status-repair-bg))",
                color: "oklch(var(--status-repair-text))",
              }}
              data-ocid="relogin.error_state"
            >
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            data-ocid="relogin.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            data-ocid="relogin.confirm_button"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {loading ? "Verifying..." : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
