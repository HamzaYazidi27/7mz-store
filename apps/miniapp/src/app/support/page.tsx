"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, HelpCircle, LifeBuoy, Plus, Send } from "lucide-react";
import { TICKET_STATUSES, relativeTime } from "@7mz/shared";
import { Badge, Button, EmptyState, Input, Sheet, Skeleton, Textarea, cn } from "@7mz/ui";
import { useCreateTicket, useHelpArticles, useTickets } from "@/lib/api/hooks";
import { haptics } from "@/lib/telegram/haptics";
import { useTelegramBackButton } from "@/lib/telegram/use-telegram-ui";
import { Header } from "@/app/referrals/page";

function SupportInner() {
  const router = useRouter();
  const params = useSearchParams();
  useTelegramBackButton();

  const orderId = params.get("order") ?? undefined;
  const { data: tickets, isLoading } = useTickets();
  const { data: articles } = useHelpArticles();
  const createTicket = useCreateTicket();

  const [open, setOpen] = useState(!!orderId);
  const [subject, setSubject] = useState(orderId ? "Help with my order" : "");
  const [message, setMessage] = useState("");

  const submit = async () => {
    haptics.press();
    try {
      const ticket = await createTicket.mutateAsync({ subject, message, orderId });
      setOpen(false);
      setSubject("");
      setMessage("");
      router.push(`/support/${ticket.id}`);
    } catch {
      haptics.notify("error");
    }
  };

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md pb-10">
      <Header title="Support" onBack={() => router.back()} />

      <div className="space-y-6 p-4">
        <Button variant="primary" fullWidth onClick={() => { haptics.tap(); setOpen(true); }}>
          <Plus className="size-4" /> New support ticket
        </Button>

        {/* Tickets */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-fg-secondary">Your tickets</h2>
          {isLoading ? (
            <Skeleton className="h-16 rounded-card" />
          ) : !tickets || tickets.length === 0 ? (
            <EmptyState icon={<LifeBuoy />} title="No tickets" description="Open a ticket and we'll help you out." />
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <Link
                  key={t.id}
                  href={`/support/${t.id}`}
                  onClick={() => haptics.tap()}
                  className="flex items-center gap-3 rounded-card border border-border bg-surface p-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.subject}</p>
                    <p className="text-xs text-fg-tertiary">
                      {t.number} · {relativeTime(t.lastMessageAt)}
                    </p>
                  </div>
                  <Badge variant={t.status === "CLOSED" ? "neutral" : "accent"} dot>
                    {t.status.replace("_", " ").toLowerCase()}
                  </Badge>
                  <ChevronRight className="size-4 text-fg-tertiary" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Help center */}
        {articles && articles.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-fg-secondary">Help center</h2>
            <div className="overflow-hidden rounded-card border border-border bg-surface">
              {articles.map((a) => (
                <details key={a.id} className="group border-b border-border last:border-0">
                  <summary className="flex cursor-pointer items-center gap-2 p-3.5 text-sm font-medium">
                    <HelpCircle className="size-4 shrink-0 text-fg-tertiary" />
                    {a.title}
                  </summary>
                  <p className="px-3.5 pb-3.5 text-[13px] leading-relaxed text-fg-secondary">{a.body}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="New ticket">
        <div className="space-y-4">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} label="Subject" placeholder="Brief summary" />
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} label="Message" placeholder="Describe your issue…" />
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={createTicket.isPending}
            disabled={subject.length < 4 || message.length < 10}
            onClick={submit}
          >
            <Send className="size-4" /> Submit ticket
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center"><Skeleton className="h-24 w-24 rounded-full" /></div>}>
      <SupportInner />
    </Suspense>
  );
}
