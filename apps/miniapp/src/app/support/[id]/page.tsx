"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { formatDateTime } from "@7mz/shared";
import { Button, Skeleton, cn } from "@7mz/ui";
import { useReplyTicket, useTicket } from "@/lib/api/hooks";
import { haptics } from "@/lib/telegram/haptics";
import { useTelegramBackButton } from "@/lib/telegram/use-telegram-ui";
import { Header } from "@/app/referrals/page";

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useTelegramBackButton();

  const { data: ticket, isLoading } = useTicket(id);
  const reply = useReplyTicket(id);
  const [body, setBody] = useState("");

  const send = async () => {
    if (!body.trim()) return;
    haptics.tap();
    try {
      await reply.mutateAsync(body.trim());
      setBody("");
    } catch {
      haptics.notify("error");
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <Header title={ticket?.subject ?? "Ticket"} onBack={() => router.push("/support")} />

      <div className="flex-1 space-y-3 p-4">
        {isLoading || !ticket ? (
          <Skeleton className="h-20 rounded-card" />
        ) : (
          ticket.messages.map((m) => (
            <div key={m.id} className={cn("flex", m.isStaff ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2.5",
                  m.isStaff ? "rounded-tl-sm bg-surface-2 text-fg" : "rounded-tr-sm bg-primary text-on-primary",
                )}
              >
                <p className="text-[14px] leading-relaxed">{m.body}</p>
                <p className={cn("mt-1 text-[10px]", m.isStaff ? "text-fg-tertiary" : "text-on-primary/60")}>
                  {m.authorName} · {formatDateTime(m.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {ticket && ticket.status !== "CLOSED" && (
        <div className="glass sticky bottom-0 flex items-center gap-2 border-t border-white/5 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message…"
            className="h-11 flex-1 rounded-btn border border-border bg-surface-2 px-4 text-[15px] outline-none focus:border-primary/60"
          />
          <Button variant="primary" size="icon" loading={reply.isPending} onClick={send}>
            <Send className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
