import { useCallback, useRef, useState } from "react";
import { chat as apiChat } from "@/lib/api";
import type { ChatMessage, ChatResponse, Domain } from "@/lib/types";

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (question: string, domainFilter?: Domain | null) => Promise<void>;
  clearMessages: () => void;
}

let messageCounter = 0;
function generateId(): string {
  return `msg_${Date.now()}_${++messageCounter}`;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (question: string, domainFilter?: Domain | null) => {
    if (!question.trim() || isLoading) return;

    setError(null);

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: question.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Cancel any previous request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const response: ChatResponse = await apiChat({
        question: question.trim(),
        domain_filter: domainFilter ?? null,
      });

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: response.answer,
        timestamp: new Date(),
        response,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMsg);

      // Add error as assistant message
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: `Sorry, I encountered an error: ${errorMsg}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages };
}
