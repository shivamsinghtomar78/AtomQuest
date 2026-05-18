"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, SkeletonBlock } from "@/components/portal/portal-ui";
import { cn } from "@/lib/utils";
import { apiJson } from "@/lib/api/client";
import type { PortalSession } from "@/lib/auth-types";

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
};

async function fetchNotifications() {
  return apiJson<NotificationItem[]>("/api/notifications");
}

function notificationHref(item: NotificationItem, role: PortalSession["user"]["role"]) {
  if (!item.entityId) return "/notifications";
  if (item.entityType === "goal_sheet") {
    if (role === "employee") return item.type.includes("checkin") ? "/checkins" : "/goals";
    return item.type.includes("checkin")
      ? `/manager-checkins/${item.entityId}`
      : `/team-goals/${item.entityId}/review`;
  }
  if (item.entityType === "goal") return "/goals";
  return "/notifications";
}

export function NotificationsPage({ session }: { session: PortalSession | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["notifications", "page"], queryFn: fetchNotifications });
  const notifications = query.data ?? [];
  const markAllRead = useMutation({
    mutationFn: () => apiJson<{ count: number }>("/api/notifications/read-all", { method: "PATCH" }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications", "page"] });
      const previous = queryClient.getQueryData<NotificationItem[]>(["notifications", "page"]);
      queryClient.setQueryData<NotificationItem[]>(["notifications", "page"], (current = []) =>
        current.map((item) => ({ ...item, isRead: true }))
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["notifications", "page"], context.previous);
      toast.error(error instanceof Error ? error.message : "Unable to mark notifications read");
    },
    onSuccess: () => {
      toast.success("All notifications marked read");
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });
  const openNotification = useMutation({
    mutationFn: async (item: NotificationItem) => {
      await apiJson(`/api/notifications/${item.id}/read`, { method: "PATCH" });
      return item;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      router.push(notificationHref(item, session?.user.role ?? "employee"));
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to open notification"),
  });

  return (
    <div className="portal-page">
      <div className="page-title-row">
        <div>
          <span>Notifications</span>
          <h2>Workspace inbox</h2>
          <p>Live approval, check-in, and shared-goal updates from the database.</p>
        </div>
        <Button onClick={() => markAllRead.mutate()} variant="secondary">
          <CheckCheck size={16} />
          Mark all read
        </Button>
      </div>

      {query.isLoading ? (
        <SkeletonBlock />
      ) : notifications.length ? (
        <div className="notification-page-list">
          {notifications.map((item) => (
            <article className={cn("notification-page-item", !item.isRead && "is-unread")} key={item.id}>
              <div className={`notification-dot notification-${item.type}`} />
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <span>{new Date(item.createdAt).toLocaleString()}</span>
              </div>
              <button onClick={() => openNotification.mutate(item)} type="button">
                {item.isRead ? "Open" : "Mark & open"}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          description="No new notifications."
          title="You're all caught up"
          action={<Button onClick={() => query.refetch()}><Bell size={16} />Refresh</Button>}
        />
      )}
    </div>
  );
}
