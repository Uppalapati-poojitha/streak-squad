import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useUnreadCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { count: c } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .is("read_at", null);
      if (!cancelled) setCount(c ?? 0);
    };

    load();
    const channel = supabase
      .channel("notif-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, load)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
