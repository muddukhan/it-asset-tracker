import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { LocalSession } from "../context/LocalSessionContext";
import { persistSession } from "../context/LocalSessionContext";
import { getActor } from "../hooks/useActor";
import { syncCredentialsToBackend } from "../utils/backendSync";
import { runMigrationIfNeeded } from "../utils/localDB";

// ── Shared users.json type ─────────────────────────────────────────────────────
interface JsonUser {
  userId: string;
  password: string;
  name: string;
  accessLevel: string;
}

/**
 * Fetch users.json and find a matching user.
 * Returns null if the fetch fails or no match is found.
 */
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

export function LoginPage({
  onLocalLogin,
}: { onLocalLogin: (session: LocalSession) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const [localLoading, setLocalLoading] = useState(false);

  const handleLocalLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setLocalError("Please enter both username and password");
      return;
    }
    setLocalError("");
    setLocalLoading(true);

    const usernameClean = username.trim();

    try {
      const actor = await getActor();

      // ── Path A: Backend has the user (normal case after first login) ──────────
      const backendResult = await actor.loginLocalUser(usernameClean, password);
      if (backendResult) {
        const session: LocalSession = {
          name: backendResult.name,
          accessLevel: backendResult.accessLevel,
          username: usernameClean,
          password,
        };
        // Persist session INCLUDING password to localStorage
        persistSession(session);
        // Clear any pending sync flag since we confirmed backend has the user
        localStorage.removeItem("pendingBackendSync");
        runMigrationIfNeeded(actor).catch(() => {});
        onLocalLogin(session);
        return;
      }

      // ── Path B: Backend empty (fresh deploy) — fall back to users.json ────────
      const jsonUser = await findUserInJson(usernameClean, password);
      if (!jsonUser) {
        // Also check localStorage registry (users added via Admin panel)
        const registry = getLocalUserRegistry();
        const registryUser = registry.find(
          (u) => u.userId === usernameClean && u.password === password,
        );
        if (!registryUser) {
          setLocalError("Invalid username or password");
          return;
        }
        // Found in registry — sync to backend and create session
        const synced = await syncCredentialsToBackend(actor, {
          username: registryUser.userId,
          password,
          name: registryUser.name,
          accessLevel: registryUser.accessLevel,
        });
        if (!synced) {
          localStorage.setItem("pendingBackendSync", "1");
        } else {
          localStorage.removeItem("pendingBackendSync");
        }
        const regSession: LocalSession = {
          name: registryUser.name,
          accessLevel: registryUser.accessLevel,
          username: registryUser.userId,
          password,
        };
        persistSession(regSession);
        runMigrationIfNeeded(actor).catch(() => {});
        onLocalLogin(regSession);
        return;
      }

      // Found in users.json — AWAIT sync fully before creating session
      const synced = await syncCredentialsToBackend(actor, {
        username: jsonUser.userId,
        password,
        name: jsonUser.name,
        accessLevel: jsonUser.accessLevel,
      });

      if (!synced) {
        // Sync failed all retries — still allow login but flag pending sync
        console.error(
          "LoginPage: Could not sync user to backend after 3 attempts. " +
            "Add/edit operations may fail. Flag set: pendingBackendSync",
        );
        localStorage.setItem("pendingBackendSync", "1");
      } else {
        localStorage.removeItem("pendingBackendSync");
      }

      // Create the session from users.json data — password persisted to localStorage
      const session: LocalSession = {
        name: jsonUser.name,
        accessLevel: jsonUser.accessLevel,
        username: jsonUser.userId,
        password,
      };
      persistSession(session);
      runMigrationIfNeeded(actor).catch(() => {});
      onLocalLogin(session);
    } catch (err) {
      console.error("Login error:", err);
      setLocalError("Login failed — please try again");
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "oklch(var(--background))" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div
          className="rounded-xl shadow-card p-8 flex flex-col items-center gap-6"
          style={{ backgroundColor: "oklch(var(--card))" }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center">
            <div
              style={{
                background: "white",
                borderRadius: "10px",
                padding: "10px 20px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src="/assets/brand-scapes-worldwide-logo-019d47e7-0246-7340-8c61-32ae50525e90.png"
                alt="Brandscapes Worldwide"
                className="h-14 w-auto object-contain"
                style={{ display: "block" }}
              />
            </div>
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-xl font-semibold text-foreground">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to manage your IT assets
            </p>
          </div>

          <div className="w-full flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="local-username" className="text-sm">
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="local-username"
                  type="text"
                  className="h-10 pl-9"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLocalLogin()}
                  data-ocid="login.input"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="local-password" className="text-sm">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="local-password"
                  type={showPassword ? "text" : "password"}
                  className="h-10 pl-9 pr-10"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLocalLogin()}
                  data-ocid="login.password_input"
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

            {localError && (
              <p
                className="text-sm rounded-lg px-3 py-2"
                style={{
                  backgroundColor: "oklch(var(--status-repair-bg))",
                  color: "oklch(var(--status-repair-text))",
                }}
                data-ocid="login.error_state"
              >
                {localError}
              </p>
            )}

            <Button
              onClick={handleLocalLogin}
              disabled={localLoading}
              className="w-full h-11 font-semibold text-sm"
              style={{
                backgroundColor: "oklch(var(--primary))",
                color: "white",
              }}
              data-ocid="login.primary_button"
            >
              {localLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {localLoading ? "Signing in..." : "Login"}
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            Built with caffeine.ai
          </a>
        </p>
      </motion.div>
    </div>
  );
}

// ── Local User Registry helpers ───────────────────────────────────────────────

interface RegistryUser {
  userId: string;
  password: string;
  name: string;
  accessLevel: string;
}

function getLocalUserRegistry(): RegistryUser[] {
  try {
    const raw = localStorage.getItem("localUserRegistry");
    if (!raw) return [];
    return JSON.parse(raw) as RegistryUser[];
  } catch {
    return [];
  }
}
