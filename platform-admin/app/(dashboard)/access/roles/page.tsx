"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RowCard } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
import type { PermissionDefinition, PlatformPermission, PlatformRole } from "@/lib/access-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Textarea } from "@/components/ui";

export default function RolesPage() {
  const [roles, setRoles] = useState<PlatformRole[] | null>(null);
  const [catalog, setCatalog] = useState<PermissionDefinition[]>([]);
  const [selected, setSelected] = useState<PlatformRole | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<PlatformPermission[]>([]);
  const [busy, setBusy] = useState(false);
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
      setError(err instanceof ApiError ? err.message : "Role definitions could not be loaded.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function edit(role: PlatformRole | null) {
    setSelected(role);
    setName(role?.name ?? "");
    setDescription(role?.description ?? "");
    setPermissions(role?.permissions ?? []);
    setError(null);
  }

  function toggle(permission: PlatformPermission) {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = { name, description: description || undefined, permissions };
      if (selected) await api.patch(`/access/roles/${selected.id}`, body);
      else await api.post("/access/roles", body);
      edit(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The role could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Role management"
        description="Define internal staff roles before assigning them to team members."
        action={<div className="flex gap-2"><Link href="/access/permissions"><Button variant="secondary" icon="rule_settings">Permission matrix</Button></Link><Button icon="add" onClick={() => edit(null)}>Create role</Button></div>}
      />
      <ErrorBanner message={error} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(280px,0.7fr)_1.3fr]">
        <div>
          {roles === null ? <EmptyState message="Loading..." /> : (
            <div className="flex flex-col gap-2">
              {roles.map((role) => (
                <button key={role.id} onClick={() => edit(role)} className="block w-full text-left">
                  <RowCard selected={selected?.id === role.id}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold text-drift-text-primary">{role.name}</span>
                      {role.isSystem && <Badge tone="info">Protected</Badge>}
                    </div>
                    <p className="mt-1 text-sm leading-5 text-drift-text-secondary">
                      {role.description || "No description"}
                    </p>
                    <div className="mt-3 text-xs font-semibold text-drift-text-secondary">
                      {role.permissions.length} permissions / {role._count?.admins ?? 0} staff
                    </div>
                  </RowCard>
                </button>
              ))}
            </div>
          )}
        </div>
        <Card>
          <h2 className="font-display text-lg font-bold text-drift-text-primary">
            {selected ? `Edit ${selected.name}` : "Create role"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-drift-text-secondary">
            {selected?.isSystem ? "This bootstrap role is protected from changes." : "Name the responsibility clearly and grant only the modules it needs."}
          </p>
          <form onSubmit={save} className="mt-5 flex flex-col gap-5">
            <Field label="Role name">
              <Input required disabled={selected?.isSystem} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Description">
              <Textarea rows={3} disabled={selected?.isSystem} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <fieldset disabled={selected?.isSystem}>
              <legend className="mb-3 text-[12px] font-bold uppercase tracking-[0.08em] text-drift-text-secondary">Module permissions</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {catalog.map((item) => (
                  <label key={item.permission} className="rowcard flex cursor-pointer items-start gap-3 rounded-xl border border-drift-border px-3 py-3 transition">
                    <input type="checkbox" checked={permissions.includes(item.permission)} onChange={() => toggle(item.permission)} className="mt-0.5 h-4 w-4" />
                    <span><span className="block text-sm font-bold text-drift-text-primary">{item.module}</span><span className="mt-0.5 block text-xs leading-5 text-drift-text-secondary">{item.description}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>
            {!selected?.isSystem && <Button type="submit" icon="save" disabled={busy || permissions.length === 0} className="self-start">{busy ? "Saving..." : selected ? "Save role" : "Create role"}</Button>}
          </form>
        </Card>
      </div>
    </div>
  );
}
