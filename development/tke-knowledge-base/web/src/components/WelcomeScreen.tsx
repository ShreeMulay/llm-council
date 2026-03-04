import { BookOpen, Shield, Pill, Stethoscope, Brain, HeartPulse } from "lucide-react";

const FEATURES = [
  {
    icon: Stethoscope,
    title: "Clinical Protocols",
    desc: "16 nephrology domains from proteinuria to transplant immunosuppression",
  },
  {
    icon: Pill,
    title: "Drug Reference",
    desc: "66 drug mappings with brand + generic names, dosing, and monitoring",
  },
  {
    icon: BookOpen,
    title: "Evidence-Based",
    desc: "Every answer cites its source — KDIGO, ADA, ACC/AHA guidelines and trials",
  },
  {
    icon: Shield,
    title: "No Hallucination",
    desc: "Answers only from verified content. Says 'I don't know' when unsure",
  },
  {
    icon: Brain,
    title: "AI-Powered",
    desc: "Voyage 4-large embeddings + Gemini 3.1 Pro for accurate retrieval and generation",
  },
  {
    icon: HeartPulse,
    title: "TKE-Specific",
    desc: "Tailored to The Kidney Experts practice protocols and workflows",
  },
];

export function WelcomeScreen() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-tke-navy flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-8 h-8 text-tke-blue-light" />
        </div>

        <h2 className="text-2xl font-bold text-tke-text mb-2">
          TKE Knowledge Base
        </h2>
        <p className="text-tke-text-muted mb-8">
          Ask any clinical question about nephrology. I'll search our protocols and
          provide an evidence-based answer with citations.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-left">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-4 rounded-xl border border-tke-border bg-white hover:shadow-sm transition-shadow"
            >
              <f.icon className="w-5 h-5 text-tke-blue mb-2" />
              <h3 className="text-sm font-semibold text-tke-text mb-1">{f.title}</h3>
              <p className="text-xs text-tke-text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
