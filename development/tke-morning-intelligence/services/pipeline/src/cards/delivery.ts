/**
 * Google Chat Delivery
 *
 * Phase 1: Uses webhook URLs (simple POST)
 * Phase 3: Upgrade to Google Chat API with interactive buttons
 */

type SpaceTarget = 'mindset' | 'operations' | 'celebrations' | 'errors'

/** Webhook URLs per space (Phase 1) */
const WEBHOOK_URLS: Record<SpaceTarget, string> = {
  mindset: process.env.CHAT_WEBHOOK_MINDSET ?? '',
  operations: process.env.CHAT_WEBHOOK_MINDSET ?? '', // Same space as mindset
  celebrations: process.env.CHAT_WEBHOOK_CELEBRATIONS ?? '',
  errors: process.env.CHAT_WEBHOOK_ERRORS ?? '',
}

export async function deliverToChat(target: SpaceTarget, card: unknown): Promise<void> {
  const url = WEBHOOK_URLS[target]
  if (!url) {
    throw new Error(`No webhook URL configured for target: ${target}`)
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Chat delivery failed for ${target}: ${response.status} ${body}`)
  }

  console.log(`[Delivery] Sent ${target} card to Google Chat`)
}
