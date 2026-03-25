import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Lock, Shield, User } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { LocalSession } from "../App";
import { createActorWithConfig } from "../config";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

type Tab = "ii" | "local";

export function LoginPage({
  onLocalLogin,
}: { onLocalLogin: (session: LocalSession) => void }) {
  const { login, isLoggingIn, isInitializing } = useInternetIdentity();
  const [tab, setTab] = useState<Tab>("ii");
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
    try {
      const actor = await createActorWithConfig();
      const result = await (actor as any).loginLocalUser(
        username.trim(),
        password,
      );
      if (result === null || result === undefined) {
        setLocalError("Invalid username or password");
      } else {
        const session: LocalSession = {
          name: result.name,
          accessLevel: result.accessLevel,
          username: username.trim(),
          password: password,
        };
        localStorage.setItem("localUserSession", JSON.stringify(session));
        onLocalLogin(session);
      }
    } catch {
      setLocalError("Login failed. Please try again.");
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
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: "oklch(var(--accent))" }}
            >
              A
            </div>
            <span
              className="text-2xl font-bold tracking-tight"
              style={{ color: "oklch(var(--navbar))" }}
            >
              Brandscapes Assets
            </span>
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-xl font-semibold text-foreground">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to manage your IT assets
            </p>
          </div>

          {/* Tabs */}
          <div
            className="w-full flex rounded-lg p-1 gap-1"
            style={{ backgroundColor: "oklch(var(--muted))" }}
          >
            <button
              type="button"
              onClick={() => setTab("ii")}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === "ii"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-ocid="login.tab"
            >
              Internet Identity
            </button>
            <button
              type="button"
              onClick={() => setTab("local")}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === "local"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-ocid="login.tab"
            >
              Local User
            </button>
          </div>

          {tab === "ii" ? (
            <>
              <div
                className="w-full rounded-lg p-4 flex items-start gap-3 text-sm"
                style={{
                  backgroundColor: "oklch(var(--status-available-bg))",
                  color: "oklch(var(--status-available-text))",
                }}
              >
                <Shield className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  Secure authentication via Internet Identity — no passwords
                  needed.
                </p>
              </div>

              <Button
                onClick={login}
                disabled={isLoggingIn || isInitializing}
                className="w-full h-11 font-semibold text-sm"
                style={{
                  backgroundColor: "oklch(var(--primary))",
                  color: "white",
                }}
                data-ocid="login.primary_button"
              >
                {isLoggingIn || isInitializing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isLoggingIn
                  ? "Connecting..."
                  : isInitializing
                    ? "Initializing..."
                    : "Sign In with Internet Identity"}
              </Button>
            </>
          ) : (
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
                    data-ocid="login.input"
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
                {localLoading ? "Signing in..." : "Sign In"}
              </Button>
            </div>
          )}
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
