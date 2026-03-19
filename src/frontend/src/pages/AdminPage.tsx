import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Principal } from "@icp-sdk/core/principal";
import {
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { UserRole } from "../backend";
import type { UserWithRole } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAssignUserRole,
  useBootstrapAdmin,
  useGetAllAssets,
  useGetAllUsersWithRoles,
  useIsCallerAdmin,
} from "../hooks/useQueries";

function roleBadge(role: UserRole) {
  if (role === UserRole.admin) {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
        Full Access
      </Badge>
    );
  }
  if (role === UserRole.user) {
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
        Standard Access
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100">
      View Only
    </Badge>
  );
}

function truncatePrincipal(p: string) {
  if (p.length <= 16) return p;
  return `${p.slice(0, 12)}...`;
}

function UserRoleRow({
  entry,
  index,
  myPrincipal,
}: {
  entry: UserWithRole;
  index: number;
  myPrincipal: string;
}) {
  const assignRole = useAssignUserRole();
  const [changing, setChanging] = useState(false);
  const [pendingRole, setPendingRole] = useState<UserRole>(entry.role);

  const principalStr = entry.principal.toString();
  const isMe = principalStr === myPrincipal;

  const handleChangeRole = async (newRole: UserRole) => {
    setPendingRole(newRole);
    try {
      await assignRole.mutateAsync({
        user: entry.principal,
        role: newRole,
      });
      toast.success(`Role updated to "${newRole}"`);
      setChanging(false);
    } catch {
      toast.error("Failed to update role");
      setPendingRole(entry.role);
    }
  };

  return (
    <TableRow data-ocid={`admin.item.${index}`}>
      <TableCell className="font-mono text-sm">
        <span title={principalStr}>
          {truncatePrincipal(principalStr)}
          {isMe && (
            <Badge variant="outline" className="ml-2 text-[10px] py-0">
              You
            </Badge>
          )}
        </span>
      </TableCell>
      <TableCell>{roleBadge(pendingRole)}</TableCell>
      <TableCell className="text-right">
        {changing ? (
          <div className="flex items-center gap-2 justify-end">
            <Select
              value={pendingRole}
              onValueChange={(v) => handleChangeRole(v as UserRole)}
              disabled={assignRole.isPending}
            >
              <SelectTrigger
                className="w-36 h-7 text-xs"
                data-ocid="admin.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UserRole.admin}>Admin (Full)</SelectItem>
                <SelectItem value={UserRole.user}>User (Standard)</SelectItem>
                <SelectItem value={UserRole.guest}>Guest (View)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setChanging(false)}
              data-ocid="admin.cancel_button"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={() => setChanging(true)}
            disabled={assignRole.isPending}
            data-ocid="admin.edit_button"
          >
            {assignRole.isPending ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <UserCog className="h-3 w-3 mr-1" />
            )}
            Change Role
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export function AdminPage() {
  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();
  const { data: assets, isLoading: assetsLoading } = useGetAllAssets();
  const { data: usersWithRoles, isLoading: usersLoading } =
    useGetAllUsersWithRoles(isAdmin ?? false);
  const assignRole = useAssignUserRole();
  const bootstrapAdmin = useBootstrapAdmin();
  const { identity } = useInternetIdentity();

  const [principalInput, setPrincipalInput] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.user);

  const myPrincipal = identity?.getPrincipal().toString() ?? "";

  const assigneeGroups: [string, NonNullable<typeof assets>][] = [];
  if (assets) {
    const groups: Record<string, typeof assets> = {};
    for (const a of assets) {
      if (a.assignedUser) {
        if (!groups[a.assignedUser]) groups[a.assignedUser] = [];
        groups[a.assignedUser].push(a);
      }
    }
    assigneeGroups.push(
      ...(Object.entries(groups).sort(
        (a, b) => b[1].length - a[1].length,
      ) as any),
    );
  }

  const handleAssignRole = async () => {
    const trimmed = principalInput.trim();
    if (!trimmed) {
      toast.error("Please enter a principal ID");
      return;
    }
    let principal: Principal;
    try {
      principal = Principal.fromText(trimmed);
    } catch {
      toast.error("Invalid principal ID format");
      return;
    }
    try {
      await assignRole.mutateAsync({ user: principal, role: selectedRole });
      toast.success(`Role "${selectedRole}" assigned successfully`);
      setPrincipalInput("");
    } catch {
      toast.error("Failed to assign role");
    }
  };

  const handleBootstrapAdmin = async () => {
    try {
      const success = await bootstrapAdmin.mutateAsync();
      if (success) {
        toast.success("You are now an admin!");
      } else {
        toast.error(
          "An admin already exists. Ask your admin to grant you access.",
        );
      }
    } catch {
      toast.error("Failed to assign admin role");
    }
  };

  const handleFillMyPrincipal = () => {
    if (!myPrincipal) {
      toast.error("Please sign in first");
      return;
    }
    setPrincipalInput(myPrincipal);
    setSelectedRole(UserRole.admin);
  };

  if (adminLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {["a1", "a2", "a3", "a4"].map((k) => (
            <Skeleton key={k} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col items-center justify-center min-h-[380px] gap-6 px-4"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: "oklch(var(--muted))" }}
        >
          <Lock
            className="h-8 w-8"
            style={{ color: "oklch(var(--muted-foreground))" }}
          />
        </div>

        <div className="text-center max-w-sm">
          <h2 className="text-xl font-semibold text-foreground">
            Admin Access Required
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            You don't have administrator privileges to view this page.
          </p>
        </div>

        {/* Quick self-admin card */}
        <div
          className="w-full max-w-sm rounded-xl border p-5 flex flex-col gap-3"
          style={{
            backgroundColor: "oklch(var(--card))",
            borderColor: "oklch(var(--border))",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "oklch(var(--accent) / 0.15)" }}
            >
              <Sparkles
                className="h-4 w-4"
                style={{ color: "oklch(var(--accent))" }}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Grant Yourself Admin Access
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                If you're the system owner, click below to instantly assign
                yourself the admin role. Only works if no admin exists yet.
              </p>
            </div>
          </div>

          {myPrincipal && (
            <div
              className="text-[11px] font-mono break-all rounded-lg px-3 py-2"
              style={{
                backgroundColor: "oklch(var(--muted))",
                color: "oklch(var(--muted-foreground))",
              }}
            >
              {myPrincipal}
            </div>
          )}

          <Button
            onClick={handleBootstrapAdmin}
            disabled={bootstrapAdmin.isPending || !myPrincipal}
            className="w-full"
            style={{
              backgroundColor: "oklch(var(--primary))",
              color: "white",
            }}
            data-ocid="admin.primary_button"
          >
            {bootstrapAdmin.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4 mr-2" />
            )}
            {bootstrapAdmin.isPending ? "Assigning…" : "Make Me Admin"}
          </Button>

          {!myPrincipal && (
            <p className="text-xs text-center text-muted-foreground">
              Sign in first to enable this option.
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1
          className="text-3xl font-bold flex items-center gap-2"
          style={{ color: "oklch(var(--foreground))" }}
        >
          <ShieldCheck
            className="h-7 w-7"
            style={{ color: "oklch(var(--accent))" }}
          />
          Admin Panel
        </h1>
        <p
          className="text-sm mt-0.5"
          style={{ color: "oklch(var(--muted-foreground))" }}
        >
          User role management and asset allocation overview
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role assignment form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-xl border shadow-card p-6"
          style={{
            backgroundColor: "oklch(var(--card))",
            borderColor: "oklch(var(--border))",
          }}
        >
          <h2 className="font-semibold text-base text-foreground mb-1">
            Assign User Role
          </h2>
          <p
            className="text-xs mb-4"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            Grant or change a user's access level by their principal ID
          </p>

          {/* Fill My Principal quick button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleFillMyPrincipal}
            disabled={!myPrincipal}
            className="w-full mb-5 border-dashed"
            style={{
              borderColor: "oklch(var(--accent) / 0.5)",
              color: "oklch(var(--accent))",
            }}
            data-ocid="admin.secondary_button"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Fill My Principal
          </Button>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="principal-input">Principal ID</Label>
              <Input
                id="principal-input"
                placeholder="e.g. aaaaa-aa"
                value={principalInput}
                onChange={(e) => setPrincipalInput(e.target.value)}
                data-ocid="admin.input"
              />
              <p className="text-[11px] text-muted-foreground">
                Tip: Click &quot;Fill My Principal&quot; above to auto-fill your
                own principal ID.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role-select">Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as UserRole)}
              >
                <SelectTrigger id="role-select" data-ocid="admin.select">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.admin}>
                    Admin — Full Access
                  </SelectItem>
                  <SelectItem value={UserRole.user}>
                    User — Standard Access
                  </SelectItem>
                  <SelectItem value={UserRole.guest}>
                    Guest — View Only
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAssignRole}
              disabled={assignRole.isPending || !principalInput.trim()}
              style={{
                backgroundColor: "oklch(var(--primary))",
                color: "white",
              }}
              data-ocid="admin.submit_button"
            >
              {assignRole.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {assignRole.isPending ? "Assigning…" : "Assign Role"}
            </Button>
          </div>
        </motion.div>

        {/* Assets by assignee */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="rounded-xl border shadow-card overflow-hidden"
          style={{
            backgroundColor: "oklch(var(--card))",
            borderColor: "oklch(var(--border))",
          }}
        >
          <div
            className="px-5 py-4 border-b flex items-center gap-2"
            style={{ borderColor: "oklch(var(--border))" }}
          >
            <Users
              className="h-4 w-4"
              style={{ color: "oklch(var(--muted-foreground))" }}
            />
            <h2 className="font-semibold text-base text-foreground">
              Assets by Assignee
            </h2>
          </div>

          {assetsLoading ? (
            <div className="p-5 space-y-3" data-ocid="admin.loading_state">
              {["u1", "u2", "u3"].map((k) => (
                <Skeleton key={k} className="h-14 w-full" />
              ))}
            </div>
          ) : assigneeGroups.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 gap-2"
              data-ocid="admin.empty_state"
            >
              <Users
                className="h-8 w-8"
                style={{ color: "oklch(var(--muted-foreground))" }}
              />
              <p
                className="text-sm"
                style={{ color: "oklch(var(--muted-foreground))" }}
              >
                No assets are currently assigned
              </p>
            </div>
          ) : (
            <ul
              className="divide-y"
              style={{ borderColor: "oklch(var(--border))" }}
            >
              {assigneeGroups.map(([user, userAssets], i) => (
                <li
                  key={user}
                  className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                  data-ocid={`admin.item.${i + 1}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {userAssets.map((a) => a.name).join(", ")}
                    </p>
                  </div>
                  <span
                    className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: "oklch(var(--status-assigned-bg))",
                      color: "oklch(var(--status-assigned-text))",
                    }}
                  >
                    {userAssets.length} asset
                    {userAssets.length !== 1 ? "s" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>

      {/* Users & Roles section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
        className="rounded-xl border shadow-card overflow-hidden"
        style={{
          backgroundColor: "oklch(var(--card))",
          borderColor: "oklch(var(--border))",
        }}
      >
        <div
          className="px-5 py-4 border-b flex items-center gap-2"
          style={{ borderColor: "oklch(var(--border))" }}
        >
          <UserCog
            className="h-4 w-4"
            style={{ color: "oklch(var(--muted-foreground))" }}
          />
          <h2 className="font-semibold text-base text-foreground">
            Registered Users &amp; Roles
          </h2>
          {usersWithRoles && (
            <Badge variant="secondary" className="ml-auto">
              {usersWithRoles.length} user
              {usersWithRoles.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {usersLoading ? (
          <div className="p-5 space-y-3" data-ocid="admin.loading_state">
            {["r1", "r2", "r3"].map((k) => (
              <Skeleton key={k} className="h-12 w-full" />
            ))}
          </div>
        ) : !usersWithRoles || usersWithRoles.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-2"
            data-ocid="admin.empty_state"
          >
            <Users
              className="h-8 w-8"
              style={{ color: "oklch(var(--muted-foreground))" }}
            />
            <p
              className="text-sm"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              No users registered yet
            </p>
          </div>
        ) : (
          <Table data-ocid="admin.table">
            <TableHeader>
              <TableRow>
                <TableHead>Principal ID</TableHead>
                <TableHead>Access Level</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersWithRoles.map((entry, i) => (
                <UserRoleRow
                  key={entry.principal.toString()}
                  entry={entry}
                  index={i + 1}
                  myPrincipal={myPrincipal}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </motion.div>
    </div>
  );
}
