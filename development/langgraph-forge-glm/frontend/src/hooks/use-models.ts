import { useQuery } from "@tanstack/react-query"
import { useProviderStore } from "../stores/provider-store"
import { fetchModels, Model } from "../lib/api-client"

export function useModels(provider?: string) {
  const currentProvider = useProviderStore((state) => state.provider)
  const providerToUse = provider || currentProvider

  return useQuery({
    queryKey: ["models", providerToUse],
    queryFn: () => fetchModels(providerToUse as any),
    enabled: !!providerToUse,
  })
}