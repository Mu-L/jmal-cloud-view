import {
  DYNAMIC_ADDRESS_ACCESS_TOKEN_PATH,
  buildDynamicAddressUpdateCurlExample
} from '@/utils/dynamic-address'

describe('dynamic-address helpers', () => {
  test('uses the auth app page as the access token source', () => {
    expect(DYNAMIC_ADDRESS_ACCESS_TOKEN_PATH).toBe('/setting/authAPP')
  })

  test('builds the update curl example with the current frontend origin', () => {
    expect(buildDynamicAddressUpdateCurlExample({
      origin: 'http://127.0.0.1:8088/',
    })).toBe(`curl -X POST 'http://127.0.0.1:8088/api/stun/jmalcloud/update?access-token=<your-access-token>' \\
  -H 'Content-Type: application/json' \\
  -d '{"addr":"1.2.3.4:5678"}'`)
  })
})
