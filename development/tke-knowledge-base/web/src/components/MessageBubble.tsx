import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";
import { CitationPanel } from "./CitationPanel";
import { User, Bot } from "lucide-react";
import Markdown from "react-markdown";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-tke-navy flex items-center justify-center mt-1">
          <Bot className="w-4 h-4 text-tke-blue-light" />
        </div>
      )}

      <div className={cn("max-w-[85%] min-w-[200px]", isUser ? "order-first" : "")}>
        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm",
            isUser
              ? "bg-tke-blue text-white rounded-br-md"
              : "bg-white border border-tke-border rounded-bl-md shadow-sm"
          )}
        >
          {isUser ? (
            <p className="leading-relaxed">{message.content}</p>
          ) : (
            <div className="markdown-answer">
              <Markdown>{message.content}</Markdown>
            </div>
          )}
        </div>

        {/* Citations (assistant only) */}
        {!isUser && message.response && (
          <CitationPanel
            citations={message.response.citations}
            confidence={message.response.confidence}
            queryTimeMs={message.response.query_time_ms}
            domainsSearched={message.response.domains_searched}
          />
        )}

        {/* Timestamp */}
        <p className={cn(
          "text-xs mt-1 px-1",
          isUser ? "text-right text-tke-text-muted" : "text-tke-text-muted"
        )}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-tke-blue flex items-center justify-center mt-1">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
}
