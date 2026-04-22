// @ts-nocheck — backend.ts is auto-generated and uses private constructors
import { useEffect, useRef, useState } from "react";
import { Backend } from "../backend";

/**
 * Resolve the backend canister ID at runtime via multiple strategies:
 * 1. env.json (injected at build time by canister.yaml, served as a static asset)
 * 2. window.__CANISTER_ID_BACKEND__ (injected by platform runtime)
 * 3. import.meta.env.VITE_CANISTER_ID_BACKEND (Vite build-time env — may be empty)
 * 4. process.env.CANISTER_ID_BACKEND (non-Vite env fallback)
 */
async function resolveCanisterId(): Promise<string> {
  // Strategy 1: env.json (most reliable — set by canister.yaml at deploy time)
  try {
    const res = await fetch("/env.json", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { backend_canister_id?: string };
      const id = data.backend_canister_id;
      if (id && id !== "undefined" && id.length > 0) {
        console.log("[useActor] Canister ID from env.json:", id);
        return id;
      }
    }
  } catch {
    // Ignore — try next strategy
  }

  // Strategy 2: window global injected by platform
  const globalId =
    (globalThis as Record<string, unknown>).__CANISTER_ID_BACKEND__ ??
    (globalThis as Record<string, unknown>).__CANISTER_IDS__?.backend;
  if (typeof globalId === "string" && globalId.length > 0) {
    console.log("[useActor] Canister ID from window global:", globalId);
    return globalId;
  }

  // Strategy 3: Vite build-time env (may be empty if not set at build time)
  const viteId = (import.meta as { env: Record<string, string> }).env
    ?.VITE_CANISTER_ID_BACKEND;
  if (viteId && viteId.length > 0) {
    console.log("[useActor] Canister ID from VITE env:", viteId);
    return viteId;
  }

  // Strategy 4: process.env (non-Vite builds)
  const processId =
    typeof process !== "undefined"
      ? (process.env as Record<string, string>)?.CANISTER_ID_BACKEND
      : undefined;
  if (processId && processId.length > 0) {
    console.log("[useActor] Canister ID from process.env:", processId);
    return processId;
  }

  console.error(
    "[useActor] CANISTER_ID could not be resolved from any source. " +
      "env.json backend_canister_id was empty or undefined. " +
      "Backend calls will fail until a valid canister ID is available.",
  );
  return "";
}

let _cachedActor: Backend | null = null;
let _cachedCanisterId: string | null = null;

/** Clear the cached actor so the next call to getActorWithRetry() starts fresh */
export function resetActor(): void {
  _cachedActor = null;
}

async function createActor(): Promise<Backend> {
  if (_cachedActor) return _cachedActor;

  // Resolve canister ID at call time (not module load time)
  if (!_cachedCanisterId) {
    _cachedCanisterId = await resolveCanisterId();
  }
  const canisterId = _cachedCanisterId;

  if (!canisterId) {
    throw new Error(
      "Canister ID is not configured. The app cannot connect to the backend. " +
        "Please ensure the app is deployed correctly and env.json contains a valid backend_canister_id.",
    );
  }

  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  const host = isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io";

  const { HttpAgent, Actor } = await import("@icp-sdk/core/agent");
  const { idlFactory } = await import("../declarations/backend.did");

  const agent = await HttpAgent.create({ host });
  if (isLocal) {
    try {
      await agent.fetchRootKey();
    } catch {
      // Ignore in production environments
    }
  }

  const rawActor = Actor.createActor(idlFactory, {
    agent,
    canisterId,
  });

  // Simple upload/download stubs — photos are stored as data URLs, not ExternalBlob
  const uploadFile = async (_file: unknown): Promise<Uint8Array> =>
    new Uint8Array(0);
  const downloadFile = async (bytes: Uint8Array): Promise<unknown> => {
    const { ExternalBlob } = await import("../backend");
    return ExternalBlob.fromBytes(bytes as Uint8Array<ArrayBuffer>);
  };

  _cachedActor = new (
    Backend as unknown as new (
      actor: unknown,
      upload: unknown,
      download: unknown,
    ) => Backend
  )(rawActor, uploadFile, downloadFile);

  return _cachedActor;
}

/**
 * Attempt to create the actor with up to `maxAttempts` retries.
 * Each retry is separated by a 1-second delay.
 * Returns the actor on success, or throws after all attempts are exhausted.
 */
export async function getActorWithRetry(maxAttempts = 3): Promise<Backend> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const actor = await createActor();
      return actor;
    } catch (err) {
      lastError = err;
      console.error(
        `[useActor] Actor creation attempt ${attempt}/${maxAttempts} failed:`,
        err,
      );
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // Clear cache so next attempt starts fresh
        _cachedActor = null;
        _cachedCanisterId = null; // Re-resolve canister ID on retry (env.json may have loaded)
      }
    }
  }
  throw lastError;
}

export function useActor(): { actor: Backend | null; isFetching: boolean } {
  const [actor, setActor] = useState<Backend | null>(_cachedActor);
  const [isFetching, setIsFetching] = useState(!_cachedActor);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (_cachedActor) {
      setActor(_cachedActor);
      setIsFetching(false);
      return;
    }
    getActorWithRetry(3)
      .then((a) => {
        if (mountedRef.current) {
          setActor(a);
          setIsFetching(false);
        }
      })
      .catch((err) => {
        console.error("[useActor] All actor creation attempts failed:", err);
        if (mountedRef.current) setIsFetching(false);
      });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { actor, isFetching };
}

/** Synchronous getter used in imperative migration code */
export async function getActor(): Promise<Backend> {
  return getActorWithRetry(3);
}
