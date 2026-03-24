import { Button } from "@/components/ui/button";
import { Loader2, Shield } from "lucide-react";
import { motion } from "motion/react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export function LoginPage() {
  const { login, isLoggingIn, isInitializing } = useInternetIdentity();

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

          <div
            className="w-full rounded-lg p-4 flex items-start gap-3 text-sm"
            style={{
              backgroundColor: "oklch(var(--status-available-bg))",
              color: "oklch(var(--status-available-text))",
            }}
          >
            <Shield className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              Secure authentication via Internet Identity — no passwords needed.
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
                : "Sign In"}
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Built with love using caffeine.ai
          </a>
        </p>
      </motion.div>
    </div>
  );
}
