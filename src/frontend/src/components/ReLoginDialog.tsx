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
import { useContext, useState } from "react";
import {
  LocalSessionContext,
  persistSession,
} from "../context/LocalSessionContext";
import { getActor } from "../hooks/useActor";
import { syncCredentialsToBackend } from "../utils/backendSync";

// ── Shared helpers ────────────────────────────────────────────────────────────

interface JsonUser {
  userId: string;
  password: string;
  name: string;
  accessLevel: string;
}

async function findUserInJson(
  username: string,
  password: string,
): Promise<JsonUser | null> {
  try {
    const res = await fetch("/users.json");
    if (!res.ok) return null;
    const data = (await res.json()) as { users: JsonUser[] };
    return (
      data.users.find(
        (u) => u.userId === username && u.password === password,
      ) ?? null
    );
  } catch {
    return null;
  }
}

function findUserInRegistry(
  username: string,
  password: string,
): JsonUser | null {
  try {
    const raw = localStorage.getItem("localUserRegistry");
    if (!raw) return null;
    const registry = JSON.parse(raw) as Array<{
      userId: string;
      password: string;
      name: string;
      accessLevel: string;
    }>;
    return (
      registry.find((u) => u.userId === username && u.password === password) ??
      null
    );
  } catch {
    return null;
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

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
    const passwordClean = password.trim();
    if (!passwordClean) {
      setError("Please enter your password");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // ── Path A: Backend has the credentials (normal case) ─────────────────
      let backendUser: { name: string; accessLevel: string } | null = null;
      try {
        const actor = await getActor();
        backendUser = await actor.loginLocalUser(username, passwordClean);
      } catch (err) {
        // Canister unreachable — fall through to users.json
        console.warn(
          "[ReLoginDialog] Backend loginLocalUser threw (will try fallback):",
          err,
        );
      }

      if (backendUser) {
        const session = {
          username,
          name: backendUser.name,
          accessLevel: backendUser.accessLevel,
          password: passwordClean,
        };
        persistSession(session);
        setLocalSession(session);
        setPassword("");
        onSuccess(passwordClean);
        return;
      }

      // ── Path B: Backend empty (after redeployment) — try users.json ────
      const jsonUser = await findUserInJson(username, passwordClean);
      const registryUser = !jsonUser
        ? findUserInRegistry(username, passwordClean)
        : null;
      const foundUser = jsonUser ?? registryUser;

      if (!foundUser) {
        setError("Incorrect password");
        return;
      }

      // Sync to backend (AWAITED) — allow login even if sync fails
      let syncOk = false;
      try {
        const actor = await getActor();
        syncOk = await syncCredentialsToBackend(actor, {
          username: foundUser.userId,
          password: passwordClean,
          name: foundUser.name,
          accessLevel: foundUser.accessLevel,
        });
      } catch (syncErr) {
        console.warn(
          "[ReLoginDialog] syncCredentialsToBackend threw:",
          syncErr,
        );
      }

      if (!syncOk) {
        localStorage.setItem("pendingBackendSync", "1");
      } else {
        localStorage.removeItem("pendingBackendSync");
      }

      const session = {
        username: foundUser.userId,
        name: foundUser.name,
        accessLevel: foundUser.accessLevel,
        password: passwordClean,
      };
      persistSession(session);
      setLocalSession(session);
      setPassword("");
      onSuccess(passwordClean);
    } catch (err) {
      console.error("[ReLoginDialog] Unexpected error:", err);
      setError("Could not verify credentials — please try again");
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
