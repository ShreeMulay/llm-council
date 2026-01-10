import { useProviderStore } from "../../stores/provider-store"
import { Button } from "../ui/button"
import { ModelSelector } from "./model-selector"

export function ProviderSelector() {
  const { provider, setProvider, modelId } = useProviderStore()

  const providers = [
    { id: "openrouter", name: "OpenRouter" },
    { id: "cerebras", name: "Cerebras" },
    { id: "fireworks", name: "Fireworks" },
  ] as const

  return (
    <div className="flex items-center gap-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Provider</label>
        <div className="flex gap-2">
          {providers.map((p) => (
            <Button
              key={p.id}
              variant={provider === p.id ? "default" : "outline"}
              size="sm"
              onClick={() => setProvider(p.id)}
            >
              {p.name}
            </Button>
          ))}
        </div>
      </div>
      <ModelSelector />
    </div>
  )
}

export default ProviderSelector