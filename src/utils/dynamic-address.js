export const DYNAMIC_ADDRESS_CHANNEL_ID = 'jmalcloud'
export const DYNAMIC_ADDRESS_ACCESS_TOKEN_PATH = '/setting/authAPP'
export const DYNAMIC_ADDRESS_UPDATE_ACCESS_TOKEN_PLACEHOLDER = '<your-access-token>'
export const DYNAMIC_ADDRESS_UPDATE_ADDR_PLACEHOLDER = '1.2.3.4:5678'

export function buildDynamicAddressUpdateCurlExample({
  origin,
  channelId = DYNAMIC_ADDRESS_CHANNEL_ID,
  accessToken = DYNAMIC_ADDRESS_UPDATE_ACCESS_TOKEN_PLACEHOLDER,
  addr = DYNAMIC_ADDRESS_UPDATE_ADDR_PLACEHOLDER,
}) {
  const normalizedOrigin = (origin || '').replace(/\/+$/, '')

  return `curl -X POST '${normalizedOrigin}/api/stun/${channelId}/update?access-token=${accessToken}' \\
  -H 'Content-Type: application/json' \\
  -d '{"addr":"${addr}"}'`
}
