import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

const SUGGESTED_QUESTIONS = [
  "When should I start Farxiga in a CKD patient?",
  "What are the four pillars of GDMT for HFrEF?",
  "What is the hemoglobin target for ESA therapy?",
  "How do I manage hyperkalemia on RAAS blockade?",
  "What is the dosing for Kerendia?",
  "When should I use Repatha vs Leqvio for LDL?",
];

export function ChatInput({ onSend, isLoading, placeholder }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  }, [input]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="border-t border-tke-border bg-white">
      {/* Suggested questions (show only when empty) */}
      {input === "" && !isLoading && (
        <div className="px-4 pt-3 flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => onSend(q)}
              className="text-xs px-3 py-1.5 rounded-full bg-tke-sky text-tke-blue hover:bg-blue-100 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 flex gap-3 items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Ask a clinical question..."}
          rows={1}
          disabled={isLoading}
          className={cn(
            "flex-1 resize-none rounded-lg border border-tke-border px-4 py-2.5",
            "text-sm leading-relaxed placeholder:text-tke-text-muted",
            "focus:outline-none focus:ring-2 focus:ring-tke-blue/30 focus:border-tke-blue",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg",
            "bg-tke-blue text-white hover:bg-tke-blue-light transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
}
