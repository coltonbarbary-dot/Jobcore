"use client";

import { useState, useRef, useEffect, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type CreatedEntity = {
  entityType: string;
  entityId: string;
  action: string;
};

function entityHref(entity: CreatedEntity): string {
  switch (entity.entityType) {
    case "customer":  return `/operations/customers/${entity.entityId}`;
    case "job":       return `/operations/jobs/${entity.entityId}`;
    case "lead":      return `/operations/leads/${entity.entityId}`;
    case "estimate":  return `/operations/estimates/${entity.entityId}`;
    case "invoice":   return `/operations/invoices/${entity.entityId}`;
    default:          return "#";
  }
}

function EntityChip({ entity }: { entity: CreatedEntity }) {
  return (
    <a
      href={entityHref(entity)}
      className="inline-flex items-center gap-1 text-xs bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] rounded-full px-2 py-0.5 hover:bg-[#dbeafe] transition-colors"
    >
      → View {entity.entityType}
    </a>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-[#0a0a0a] text-white rounded-br-sm"
            : "bg-white border border-[#e5e7eb] text-[#0a0a0a] rounded-bl-sm"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-[#e5e7eb] rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 bg-[#9ca3af] rounded-full animate-bounce"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export function JojoChat({ initialConversationId }: { initialConversationId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingEntities, setPendingEntities] = useState<CreatedEntity[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || isPending) return;

    setInput("");
    setError(null);
    setPendingEntities([]);

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);

    startTransition(async () => {
      const res = await fetch("/api/jojo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.message,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      if (data.createdEntities?.length > 0) {
        setPendingEntities(data.createdEntities);
        // Refresh Next.js cache so entity pages show updated data
        router.refresh();
      }
    });
  }, [input, isPending, conversationId, router]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-140px)]">
      {/* Message area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {isEmpty && !isPending && (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0a0a0a] text-white flex items-center justify-center text-xl font-bold mx-auto">
              J
            </div>
            <p className="text-base font-semibold text-[#0a0a0a]">Hi, I&apos;m JoJo</p>
            <p className="text-sm text-[#6b7280] max-w-xs mx-auto">
              Ask me to create customers, jobs, estimates, or invoices — or ask questions about your business.
            </p>
            <div className="flex flex-wrap gap-2 justify-center pt-2">
              {[
                "How many jobs do I have?",
                "Create a customer named Alex Smith",
                "Show me open leads",
                "Give me a business summary",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="text-xs px-3 py-1.5 border border-[#e5e7eb] rounded-full text-[#6b7280] hover:text-[#0a0a0a] hover:border-[#9ca3af] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isPending && <TypingIndicator />}

        {pendingEntities.length > 0 && (
          <div className="flex flex-wrap gap-2 pl-2">
            {pendingEntities.map((e) => (
              <EntityChip key={e.entityId} entity={e} />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-[#e5e7eb] px-4 py-3 bg-white">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask JoJo anything…"
            rows={1}
            disabled={isPending}
            className="flex-1 resize-none rounded-xl border border-[#e5e7eb] px-3 py-2.5 text-sm text-[#0a0a0a] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a] focus:border-transparent disabled:opacity-50 max-h-32 overflow-y-auto"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={sendMessage}
            disabled={isPending || !input.trim()}
            className="shrink-0 h-10 px-4"
          >
            {isPending ? "…" : "Send"}
          </Button>
        </div>
        <p className="text-center text-[11px] text-[#9ca3af] mt-2">
          JoJo can make mistakes. Review created records before sending to customers.
        </p>
      </div>
    </div>
  );
}
