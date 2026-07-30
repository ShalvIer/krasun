import { useCallback, useEffect, useState } from "react";
import type { GroupSummary } from "@krasun/shared-types";
import { apiFetch } from "../../services/api";

export function useGroups() {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = useCallback(() => { setLoading(true); apiFetch<{ groups: GroupSummary[] }>("/api/groups").then((data) => setGroups(data.groups)).catch((issue: Error) => setError(issue.message)).finally(() => setLoading(false)); }, []);
  useEffect(() => { void reload(); }, [reload]);
  return { groups, loading, error, reload };
}
