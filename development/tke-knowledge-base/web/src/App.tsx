import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { DomainFilter } from "@/components/DomainFilter";
import { ChatInput } from "@/components/ChatInput";
import { MessageBubble } from "@/components/MessageBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { useChat } from "@/hooks/useChat";
import { getCollectionInfo } from "@/lib/api";
import type { CollectionInfo, Domain } from "@/lib/types";
import { Trash2 } from "lucide-react";

export default function App() {
  const { messages, isLoading, sendMessage, clearMessages } = useChat();
  const [domainFilter, setDomainFilter] = useState<Domain | null>(null);
  const [collectionInfo, setCollectionInfo] = useState<CollectionInfo | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch collection info on mount
  useEffect(() => {
    getCollectionInfo()
      .then((data) => setCollectionInfo(data.collection))
      .catch(() => {/* API not available yet */});
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function handleSend(question: string) {
    sendMessage(question, domainFilter);
  }

  return (
    <div className="h-screen flex flex-col bg-tke-bg">
      <Header collectionInfo={collectionInfo} />

      {/* Domain filter toggle + panel */}
      <div className="border-b border-tke-border bg-white flex items-center justify-between px-4 py-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-xs font-medium text-tke-text-muted hover:text-tke-blue transition-colors"
        >
          {showFilters ? "Hide Filters" : "Show Domain Filters"}
          {domainFilter && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-tke-blue text-white text-xs">
              {domainFilter.replace(/_/g, " ")}
            </span>
          )}
        </button>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="flex items-center gap-1 text-xs text-tke-text-muted hover:text-tke-danger transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Clear Chat
          </button>
        )}
      </div>
      {showFilters && <DomainFilter selected={domainFilter} onSelect={setDomainFilter} />}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <div className="max-w-4xl mx-auto p-4 space-y-6">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="max-w-4xl mx-auto w-full">
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          placeholder={
            domainFilter
              ? `Ask about ${domainFilter.replace(/_/g, " ")}...`
              : "Ask a clinical question..."
          }
        />
      </div>
    </div>
  );
}
