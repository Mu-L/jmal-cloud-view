jest.mock('@/utils/request', () => jest.fn(() => Promise.resolve()))

import request from '@/utils/request'
import settingApi from '@/api/setting-api'

describe('setting-api dynamic address', () => {
  test('uses the fixed jmalcloud channel id for stun address', async () => {
    await settingApi.getDynamicAddress()

    expect(request).toHaveBeenCalledWith({
      url: '/stun/jmalcloud/address',
      method: 'get',
    })
  })
})
