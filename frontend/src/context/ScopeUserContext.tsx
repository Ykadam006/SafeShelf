import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";

import { apiGet, normalizeApiError } from "../api/http";
import type { UserDto } from "../types";

// Persist the currently selected scope user across page reloads.
const STORAGE_KEY = "safeshelf-scope-user-id";

// Pick the best default scope user when nothing is stored yet:
// 1) the previously chosen user, 2) demo@safeshelf.com, 3) any USER, 4) the first user.
function pickFallbackUserId(users: UserDto[], preferredId: string | null): string {
  const demo = users.find((u) => u.email.toLowerCase() === "demo@safeshelf.com");
  const userRole = users.find((u) => u.role === "USER");
  if (preferredId && users.some((u) => u.id === preferredId)) {
    return preferredId;
  }
  if (demo) return demo.id;
  if (userRole) return userRole.id;
  return users[0]!.id;
}

type ScopeCtx = {
  users: UserDto[];
  scopeUserId: string | undefined;
  setScopeUserId: (id: string) => void;
  loadingUsers: boolean;
  usersError: string | null;
  refreshUsers: () => Promise<void>;
};

const ScopeUserContext = createContext<ScopeCtx | null>(null);

// Loads users once on mount and exposes the active scope user to children.
export function ScopeUserProvider({ children }: PropsWithChildren) {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [scopeUserId, setScopeUserId] = useState<string | undefined>(
    undefined,
  );
  const [bootstrapped, setBootstrapped] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Pull the user list from the API.
  const refreshUsers = useCallback(async (): Promise<void> => {
    setLoadingUsers(true);
    setUsersError(null);
    try {
      const rows = await apiGet<UserDto[]>("/users");
      setUsers(rows);
    } catch (e) {
      setUsersError(normalizeApiError(e).message);
      setUsers([]);
      setBootstrapped(false);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Initial load.
  useEffect(() => {
    void refreshUsers();
  }, [refreshUsers]);

  // Resolve the active scope user whenever the user list changes.
  useEffect(() => {
    if (users.length === 0) {
      setBootstrapped(false);
      setScopeUserId(undefined);
      return;
    }

    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }

    // First successful load: pick the default and remember it.
    if (!bootstrapped) {
      const nextId = pickFallbackUserId(users, stored);
      setScopeUserId(nextId);
      try {
        sessionStorage.setItem(STORAGE_KEY, nextId);
      } catch {
        /* ignore */
      }
      setBootstrapped(true);
      return;
    }

    // Re-validate on subsequent reloads (e.g. user was deleted).
    setScopeUserId((current) => {
      if (current !== undefined && users.some((u) => u.id === current)) {
        return current;
      }
      const nextId = pickFallbackUserId(users, stored);
      try {
        sessionStorage.setItem(STORAGE_KEY, nextId);
      } catch {
        /* ignore */
      }
      return nextId;
    });
  }, [users, bootstrapped]);

  // Update + persist the chosen scope user.
  const setScopePersisted = useCallback((id: string) => {
    setScopeUserId(id);
    try {
      sessionStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<ScopeCtx>(
    () => ({
      users,
      scopeUserId,
      setScopeUserId: setScopePersisted,
      loadingUsers,
      usersError,
      refreshUsers,
    }),
    [
      users,
      scopeUserId,
      setScopePersisted,
      loadingUsers,
      usersError,
      refreshUsers,
    ],
  );

  return (
    <ScopeUserContext.Provider value={value}>{children}</ScopeUserContext.Provider>
  );
}

// Hook used by pages to read/update the active scope user.
export function useScopeUser(): ScopeCtx {
  const ctx = useContext(ScopeUserContext);
  if (ctx === null) {
    throw new Error("useScopeUser must be used within ScopeUserProvider");
  }
  return ctx;
}
