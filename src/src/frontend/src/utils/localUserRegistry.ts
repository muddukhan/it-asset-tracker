// Local user registry — persists users created via the admin panel in localStorage
// Acts as a fallback when backend is unavailable or credentials aren't synced

export interface RegistryUser {
  userId: string;
  password: string;
  name: string;
  accessLevel: string;
}

const REGISTRY_KEY = "localUsersRegistry";

export function getLocalUserRegistry(): RegistryUser[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RegistryUser[];
  } catch {
    return [];
  }
}

export function addToLocalUserRegistry(user: RegistryUser): void {
  const existing = getLocalUserRegistry();
  const idx = existing.findIndex((u) => u.userId === user.userId);
  if (idx >= 0) {
    existing[idx] = user; // update if exists
  } else {
    existing.push(user);
  }
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(existing));
}

export function removeFromLocalUserRegistry(userId: string): void {
  const existing = getLocalUserRegistry().filter((u) => u.userId !== userId);
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(existing));
}

export function findInLocalUserRegistry(
  username: string,
  password: string,
): RegistryUser | undefined {
  return getLocalUserRegistry().find(
    (u) => u.userId === username && u.password === password,
  );
}

export function exportRegistryAsJson(): string {
  const users = getLocalUserRegistry();
  return JSON.stringify({ users }, null, 2);
}
