import { useCallback, useEffect, useState } from "react";
import type { ConversationSummary } from "@krasun/shared-types";
import { apiFetch } from "../../services/api";

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => apiFetch<{ conversations: ConversationSummary[] }>("/api/conversations").then((data) => setConversations(data.conversations)).finally(() => setLoading(false)), []);
  useEffect(() => { void reload(); }, [reload]);
  return { conversations, loading, reload };
}
