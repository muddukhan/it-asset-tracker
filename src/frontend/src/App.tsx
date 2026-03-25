import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BarChart3,
  Bell,
  ChevronDown,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  Package,
  Settings,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  InternetIdentityProvider,
  useInternetIdentity,
} from "./hooks/useInternetIdentity";
import { AdminPage } from "./pages/AdminPage";
import { DashboardPage } from "./pages/DashboardPage";
import { HistoryPage } from "./pages/HistoryPage";
import { InventoryPage } from "./pages/InventoryPage";
import { LoginPage } from "./pages/LoginPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SoftwareInventoryPage } from "./pages/SoftwareInventoryPage";

const queryClient = new QueryClient();

type NavPage =
  | "dashboard"
  | "inventory"
  | "assignments"
  | "history"
  | "reports"
  | "admin"
  | "software";

type PageState = {
  page: NavPage;
  filter?: string;
};

export interface LocalSession {
  name: string;
  accessLevel: string;
}

function loadLocalSession(): LocalSession | null {
  try {
    const raw = localStorage.getItem("localUserSession");
    if (!raw) return null;
    return JSON.parse(raw) as LocalSession;
  } catch {
    return null;
  }
}

const navItems: { id: NavPage; label: string; icon: React.ReactNode }[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: <Package className="h-4 w-4" />,
  },
  {
    id: "software",
    label: "Software",
    icon: <Monitor className="h-4 w-4" />,
  },
  {
    id: "assignments",
    label: "Assignments",
    icon: <ClipboardList className="h-4 w-4" />,
  },
  { id: "history", label: "History", icon: <History className="h-4 w-4" /> },
  { id: "reports", label: "Reports", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "admin", label: "Admin", icon: <Settings className="h-4 w-4" /> },
];

function AppShell() {
  const { identity, clear, isInitializing } = useInternetIdentity();
  const [localSession, setLocalSession] = useState<LocalSession | null>(
    loadLocalSession,
  );
  const [pageState, setPageState] = useState<PageState>({ page: "dashboard" });
  const [previousPage, setPreviousPage] = useState<NavPage | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLocalLogout = () => {
    localStorage.removeItem("localUserSession");
    setLocalSession(null);
  };

  const navigate = (page: string, filter?: string) => {
    setPreviousPage(pageState.page);
    setPageState({ page: page as NavPage, filter });
    setSidebarOpen(false);
  };

  const goBack = () => {
    if (previousPage) {
      setPageState({ page: previousPage });
      setPreviousPage(null);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: "oklch(var(--accent))" }}
          >
            A
          </div>
          <p className="text-sm text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  if (!identity && !localSession) {
    return <LoginPage onLocalLogin={(session) => setLocalSession(session)} />;
  }

  // Determine display name and initials
  const isLocalUser = !identity && !!localSession;
  const displayName = isLocalUser
    ? localSession!.name
    : identity!.getPrincipal().toString();
  const initials = isLocalUser
    ? localSession!.name.slice(0, 2).toUpperCase()
    : identity!.getPrincipal().toString().slice(0, 2).toUpperCase();

  function renderPage() {
    switch (pageState.page) {
      case "dashboard":
        return <DashboardPage onNavigate={navigate} />;
      case "inventory": {
        const isAgeFilter = pageState.filter?.startsWith("age:");
        return (
          <InventoryPage
            key={pageState.filter}
            initialStatusFilter={isAgeFilter ? undefined : pageState.filter}
            initialAgeFilter={
              isAgeFilter ? pageState.filter?.replace("age:", "") : undefined
            }
            onBack={previousPage === "dashboard" ? goBack : undefined}
          />
        );
      }
      case "assignments":
        return <InventoryPage key="assigned" initialStatusFilter="assigned" />;
      case "history":
        return (
          <HistoryPage
            onBack={previousPage === "dashboard" ? goBack : undefined}
          />
        );
      case "reports":
        return (
          <ReportsPage
            onBack={previousPage === "dashboard" ? goBack : undefined}
          />
        );
      case "admin":
        return (
          <AdminPage
            onBack={previousPage === "dashboard" ? goBack : undefined}
            localSession={localSession}
          />
        );
      case "software":
        return (
          <SoftwareInventoryPage
            onBack={previousPage === "dashboard" ? goBack : undefined}
          />
        );
      default:
        return <DashboardPage onNavigate={navigate} />;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navbar */}
      <header
        className="h-14 flex items-center px-4 gap-4 fixed top-0 left-0 right-0 z-40 shadow-sm"
        style={{ backgroundColor: "oklch(var(--navbar))" }}
      >
        {/* Mobile menu toggle */}
        <button
          type="button"
          className="lg:hidden text-white/80 hover:text-white"
          onClick={() => setSidebarOpen((v) => !v)}
          data-ocid="nav.toggle"
        >
          {sidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2 mr-4">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: "oklch(var(--accent))" }}
          >
            A
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            Brandscapes Assets
          </span>
        </div>

        {/* Nav links (desktop) */}
        <nav className="hidden lg:flex items-center gap-1 flex-1">
          {navItems.slice(0, 4).map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pageState.page === item.id
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
              data-ocid={`nav.${item.id}.link`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="relative text-white/70 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors"
          >
            <Bell className="h-5 w-5" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 text-white/80 hover:text-white px-2 py-1.5 rounded-md hover:bg-white/10 transition-colors"
                data-ocid="nav.user.dropdown_menu"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback
                    className="text-xs font-semibold"
                    style={{
                      backgroundColor: "oklch(var(--accent))",
                      color: "white",
                    }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden md:block">
                  {isLocalUser ? displayName : `${displayName.slice(0, 8)}…`}
                </span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-3 py-2 border-b">
                <p className="text-xs font-medium text-foreground">
                  {isLocalUser ? "Local User" : "Signed in as"}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {isLocalUser ? displayName : displayName}
                </p>
                {isLocalUser && localSession && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Access:{" "}
                    {localSession.accessLevel === "admin"
                      ? "Admin"
                      : localSession.accessLevel === "readwrite"
                        ? "Read & Write"
                        : "Read Only"}
                  </p>
                )}
              </div>
              <DropdownMenuItem
                onClick={isLocalUser ? handleLocalLogout : clear}
                className="text-destructive focus:text-destructive cursor-pointer mt-1"
                data-ocid="nav.logout.button"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Body */}
      <div className="flex pt-14 flex-1">
        {/* Sidebar overlay (mobile) */}
        {sidebarOpen && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Close sidebar"
            className="fixed inset-0 bg-black/40 z-30 lg:hidden cursor-default"
            onClick={() => setSidebarOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar */}
        <aside
          className={`fixed top-14 bottom-0 left-0 z-30 w-56 flex flex-col py-4 transition-transform lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ backgroundColor: "oklch(var(--sidebar))" }}
        >
          <nav className="flex flex-col gap-0.5 px-3">
            {navItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${
                  pageState.page === item.id
                    ? "bg-white/15 text-white"
                    : "text-sidebar-foreground hover:bg-white/10 hover:text-white"
                }`}
                data-ocid={`sidebar.${item.id}.link`}
              >
                <span
                  className={
                    pageState.page === item.id ? "text-white" : "opacity-70"
                  }
                >
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="mt-auto px-4 pb-2">
            <p
              className="text-xs"
              style={{ color: "oklch(var(--sidebar-foreground) / 0.4)" }}
            >
              © {new Date().getFullYear()}{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                style={{ color: "oklch(var(--sidebar-foreground) / 0.5)" }}
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-56 p-6 min-h-full">{renderPage()}</main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <InternetIdentityProvider>
        <AppShell />
        <Toaster richColors position="top-right" />
      </InternetIdentityProvider>
    </QueryClientProvider>
  );
}
