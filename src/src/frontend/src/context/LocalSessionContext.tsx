import { createContext, useContext } from "react";

export interface LocalSession {
  name: string;
  accessLevel: string;
  username?: string;
  password?: string;
}

interface LocalSessionContextValue {
  localSession: LocalSession | null;
}

export const LocalSessionContext = createContext<LocalSessionContextValue>({
  localSession: null,
});

export function useLocalSession() {
  return useContext(LocalSessionContext).localSession;
}

export function useLocalAdminCreds(): {
  username: string;
  password: string;
} | null {
  const session = useContext(LocalSessionContext).localSession;
  if (
    session &&
    session.accessLevel === "admin" &&
    session.username &&
    session.password
  ) {
    return { username: session.username, password: session.password };
  }
  return null;
}
