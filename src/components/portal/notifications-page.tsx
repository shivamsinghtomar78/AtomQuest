"use client";

import { toast } from "sonner";
import { Bell, CheckCheck } from "lucide-react";
import { notifications } from "@/lib/portal-data";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/portal/portal-ui";
import { cn } from "@/lib/utils";

export function NotificationsPage() {
  return (
    <div className="portal-page">
      <div className="page-title-row">
        <div>
          <span>Notifications</span>
          <h2>Workspace inbox</h2>
          <p>Polling-ready notification center for approval, check-in, and shared-goal events.</p>
        </div>
        <Button onClick={() => toast.success("All notifications marked read.")} variant="secondary">
          <CheckCheck size={16} />
          Mark all read
        </Button>
      </div>

      {notifications.length ? (
        <div className="notification-page-list">
          {notifications.map((item) => (
            <article className={cn("notification-page-item", item.unread && "is-unread")} key={item.id}>
              <div className={`notification-dot notification-${item.type}`} />
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <span>{item.time}</span>
              </div>
              <button onClick={() => toast.info("Notification opened.")} type="button">Open</button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          description="You will see approval, reminder, and shared-goal updates here."
          title="No notifications yet"
          action={<Button><Bell size={16} />Refresh</Button>}
        />
      )}
    </div>
  );
}
