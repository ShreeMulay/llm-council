import { useExecutionStore } from '../stores/execution-store'
import { useProviderStore } from '../stores/provider-store'

export function useExecute(code: string) {
  const execute = useExecutionStore((state) => state.execute)
  const isLoading = useExecutionStore((state) => state.isLoading)
  const error = useExecutionStore((state) => state.error)
  const output = useExecutionStore((state) => state.output)
  const metrics = useExecutionStore((state) => state.metrics)
  const graphStructure = useExecutionStore((state) => state.graphStructure)
  const provider = useProviderStore((state) => state.provider)
  const model = useProviderStore((state) => state.model)

  const runExecution = async (timeout?: number) => {
    if (!code) {
      throw new Error('Code is required for execution')
    }
    if (!provider || !model) {
      throw new Error('Provider and model must be selected')
    }
    await execute(provider, model, code, timeout)
  }

  return {
    execute: runExecution,
    isLoading,
    error,
    output,
    metrics,
    graphStructure,
  }
}