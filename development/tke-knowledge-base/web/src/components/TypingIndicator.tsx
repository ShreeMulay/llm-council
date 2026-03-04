import { Bot } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-tke-navy flex items-center justify-center">
        <Bot className="w-4 h-4 text-tke-blue-light" />
      </div>
      <div className="bg-white border border-tke-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <div className="flex gap-1.5">
          <span className="typing-dot w-2 h-2 rounded-full bg-tke-slate" />
          <span className="typing-dot w-2 h-2 rounded-full bg-tke-slate" />
          <span className="typing-dot w-2 h-2 rounded-full bg-tke-slate" />
        </div>
      </div>
    </div>
  );
}
