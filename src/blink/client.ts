import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: 'mrd-time-tag-manager-11genn8j',
  authRequired: false // We'll handle custom authentication
})