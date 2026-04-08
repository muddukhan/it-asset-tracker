/**
 * Stub for Internet Identity — this app uses local user auth only.
 * Provides the same interface shape expected by App.tsx and AdminPage.tsx
 * so they compile without requiring the @caffeineai/core-infrastructure package.
 */
import { type ReactNode, createContext, useContext } from "react";

interface InternetIdentityContextValue {
  identity: null;
  clear: () => void;
  isInitializing: boolean;
  login: () => void;
  loginStatus: "idle";
}

const II_CONTEXT_DEFAULT: InternetIdentityContextValue = {
  identity: null,
  clear: () => {},
  isInitializing: false,
  login: () => {},
  loginStatus: "idle",
};

const InternetIdentityContext =
  createContext<InternetIdentityContextValue>(II_CONTEXT_DEFAULT);

export function useInternetIdentity(): InternetIdentityContextValue {
  return useContext(InternetIdentityContext);
}

/** No-op provider — identity is always null (local auth only) */
export function InternetIdentityProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <InternetIdentityContext.Provider value={II_CONTEXT_DEFAULT}>
      {children}
    </InternetIdentityContext.Provider>
  );
}
