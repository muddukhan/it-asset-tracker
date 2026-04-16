import { useEffect, useRef, useState } from "react";
/**
 * useActor — returns the Caffeine backend actor for direct canister calls.
 * The actor is created once and reused. When the ICP agent is not yet ready
 * it returns isFetching: true so callers can guard queries.
 */
// @ts-nocheck — backend.ts is auto-generated and uses private constructors
import { Backend } from "../backend";

const CANISTER_ID: string =
  (import.meta as { env: Record<string, string> }).env
    ?.VITE_CANISTER_ID_BACKEND ??
  (globalThis as Record<string, unknown>).__CANISTER_ID_BACKEND__ ??
  "";

let _cachedActor: Backend | null = null;

async function createActor(): Promise<Backend> {
  if (_cachedActor) return _cachedActor;

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
    canisterId: CANISTER_ID,
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
    createActor()
      .then((a) => {
        if (mountedRef.current) {
          setActor(a);
          setIsFetching(false);
        }
      })
      .catch(() => {
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
  return createActor();
}
