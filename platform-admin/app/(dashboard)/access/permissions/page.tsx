"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { PermissionDefinition, PlatformPermission, PlatformRole } from "@/lib/access-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, PageHeader, Td, Th } from "@/components/ui";

export default function PermissionMatrixPage() {
  const [roles, setRoles] = useState<PlatformRole[] | null>(null);
  const [catalog, setCatalog] = useState<PermissionDefinition[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [roleResult, permissionResult] = await Promise.all([
        api.get<{ roles: PlatformRole[] }>("/access/roles"),
        api.get<{ permissions: PermissionDefinition[] }>("/access/permissions"),
      ]);
      setRoles(roleResult.roles);
      setCatalog(permissionResult.permissions);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The permission matrix could not be loaded.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function toggle(roleId: string, permission: PlatformPermission) {
    setRoles((current) => current?.map((role) => role.id !== roleId ? role : {
      ...role,
      permissions: role.permissions.includes(permission)
        ? role.permissions.filter((item) => item !== permission)
        : [...role.permissions, permission],
    }) ?? null);
  }

  async function save(role: PlatformRole) {
    setBusyId(role.id);
    setError(null);
    try {
      await api.patch(`/access/roles/${role.id}`, {
        name: role.name,
        description: role.description ?? undefined,
        permissions: role.permissions,
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Permissions could not be saved.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Permission matrix"
        description="A least-privilege map of every staff role against each platform module."
        action={<Link href="/access/roles"><Button variant="secondary">Manage roles</Button></Link>}
      />
      <ErrorBanner message={error} />
      {roles === null ? <EmptyState message="Loading…" /> : (
        <Card className="overflow-x-auto p-0">
          <table className="min-w-[1500px] w-full">
            <thead>
              <tr>
                <Th className="sticky left-0 z-10 min-w-52 bg-drift-surface">Role</Th>
                {catalog.map((item) => <Th key={item.permission} className="min-w-36 text-center">{item.module}</Th>)}
                <Th className="min-w-32 text-right">Save</Th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <Td className="sticky left-0 z-10 bg-drift-surface">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{role.name}</span>
                      {role.isSystem && <Badge tone="info">Protected</Badge>}
                    </div>
                  </Td>
                  {catalog.map((item) => (
                    <Td key={item.permission} className="text-center">
                      <input
                        type="checkbox"
                        aria-label={`${role.name}: ${item.module}`}
                        disabled={role.isSystem}
                        checked={role.permissions.includes(item.permission)}
                        onChange={() => toggle(role.id, item.permission)}
                        className="h-4 w-4 accent-drift-primary"
                      />
                    </Td>
                  ))}
                  <Td className="text-right">
                    {!role.isSystem && <Button variant="secondary" disabled={busyId === role.id || role.permissions.length === 0} onClick={() => void save(role)}>{busyId === role.id ? "Saving…" : "Save"}</Button>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
