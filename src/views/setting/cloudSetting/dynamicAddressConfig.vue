<template>
  <div class="container">
    <el-form
      ref="dynamicAddressForm"
      :model="configFormData"
      :rules="rules"
      label-width="120px"
      size="small"
      style="max-width: 860px"
      autocomplete="off"
    >
      <div class="setting-title-desc">
        <div class="setting-title-desc-text">
          <p class="instruction">{{ $t('app.dynamicAddressHintLine1') }}</p>
          <p class="instruction">{{ $t('app.dynamicAddressHintLine2') }}</p>
          <p class="instruction">{{ $t('app.dynamicAddressHintLine3') }}</p>
          <p class="instruction">{{ $t('app.dynamicAddressHintLine4') }}</p>
          <p class="instruction">{{ $t('app.dynamicAddressHintLine5') }}</p>
          <p class="instruction">{{ $t('app.dynamicAddressHintLine6') }}</p>
          <p class="instruction">{{ $t('app.dynamicAddressHintLine7') }}</p>
          <pre class="instruction-code">{{ dynamicAddressUpdateCurlExample }}</pre>
          <p class="instruction">
            {{ $t('app.dynamicAddressHintLine8Prefix') }}
            <router-link class="instruction-link" :to="dynamicAddressAccessTokenPath">
              {{ $t('app.dynamicAddressHintLine8LinkText') }}
            </router-link>
            {{ $t('app.dynamicAddressHintLine8Suffix') }}
          </p>
          <p class="instruction">{{ $t('app.dynamicAddressHintLine9') }}</p>
        </div>
        <el-divider></el-divider>
      </div>

      <el-form-item :label="$t('app.dynamicAddressEnabled')" prop="enabled">
        <el-switch v-model="configFormData.enabled"></el-switch>
        <span class="form-instruction">
          {{ configFormData.enabled ? $t('msg.enabled') : $t('msg.disabled') }}
        </span>
      </el-form-item>

      <el-form-item :label="$t('app.dynamicAddressDomain')" prop="domain">
        <el-input
          v-model.trim="configFormData.domain"
          :placeholder="$t('app.dynamicAddressDomainPlaceholder')"
          clearable
        ></el-input>
        <div class="instruction">{{ $t('app.dynamicAddressDomainHint') }}</div>
      </el-form-item>

      <el-form-item>
        <el-button round type="primary" :loading="saveConfigLoading" @click="submitForm">
          {{ $t('common.save') }}
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import {
  DYNAMIC_ADDRESS_ACCESS_TOKEN_PATH,
  buildDynamicAddressUpdateCurlExample
} from '@/utils/dynamic-address'

const hostnamePattern = /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)(?:\.(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?))*$/
const ipv4Pattern = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/

export default {
  name: 'DynamicAddressConfig',
  data() {
    const validateDomain = (_rule, value, callback) => {
      if (!value) {
        callback()
        return
      }

      const normalizedValue = value.trim()
      const isValidDomain = hostnamePattern.test(normalizedValue) || ipv4Pattern.test(normalizedValue)

      if (!isValidDomain) {
        callback(new Error(this.$t('msg.dynamicAddressDomainRule').toString()))
        return
      }

      callback()
    }

    return {
      saveConfigLoading: false,
      configFormData: {
        enabled: false,
        domain: '',
      },
      rules: {
        domain: [
          { required: false, validator: validateDomain, trigger: 'blur' }
        ],
      },
    }
  },
  computed: {
    dynamicAddressAccessTokenPath() {
      return DYNAMIC_ADDRESS_ACCESS_TOKEN_PATH
    },
    dynamicAddressUpdateCurlExample() {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''

      return buildDynamicAddressUpdateCurlExample({ origin })
    },
  },
  mounted() {
    this.loadDynamicAddressConfig()
  },
  methods: {
    applyFormData(config) {
      this.configFormData = {
        enabled: config.enabled === true,
        domain: config.domain || '',
      }
    },
    async loadDynamicAddressConfig() {
      try {
        const config = await this.$store.dispatch('user/fetchDynamicAddressConfig')
        this.applyFormData(config)
      } catch (error) {
        const config = this.$store.getters.dynamicAddressConfig || {}
        this.applyFormData(config)
      }
    },
    submitForm() {
      this.$refs.dynamicAddressForm.validate((valid) => {
        if (valid) {
          this.saveConfig()
        }
      })
    },
    async saveConfig() {
      this.saveConfigLoading = true
      try {
        const config = await this.$store.dispatch('user/saveDynamicAddressConfig', this.configFormData)
        this.applyFormData(config)
        this.$message.success(this.$t('common.savedSuccessfully').toString())
      } finally {
        this.saveConfigLoading = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
@import "src/styles/setting";

.container {
  padding: 0 !important;
}

.setting-title-desc-text {
  .instruction {
    line-height: 1.7;
    margin: 0;
  }

  .instruction-code {
    margin: 8px 0;
    padding: 12px;
    white-space: pre-wrap;
    word-break: break-all;
    background: #f5f7fa;
    border-radius: 6px;
    font-size: 13px;
    line-height: 1.7;
  }

  .instruction-link {
    color: #409eff;
  }
}
</style>
