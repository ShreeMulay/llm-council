import { useProviderStore } from "../../stores/provider-store"
import { useModels } from "../../hooks/use-models"
import { Model } from "../../lib/api-client"
import { Button } from "../ui/button"

interface ModelSelectorProps {
  models?: Model[]
}

export function ModelSelector({ models: propModels }: ModelSelectorProps) {
  const { provider, modelId, setModelId } = useProviderStore()
  const { data: models = propModels } = useModels(provider)

  return (
    <div>
      <label className="text-sm font-medium mb-1 block">Model</label>
      {models && models.length > 0 ? (
        <select
          value={modelId || ""}
          onChange={(e) => setModelId(e.target.value || null)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
        >
          <option value="">Select a model</option>
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      ) : (
        <div className="w-full px-3 py-2 border border-border rounded-md text-muted-foreground">
          No models available
        </div>
      )}
    </div>
  )
}

export default ModelSelector