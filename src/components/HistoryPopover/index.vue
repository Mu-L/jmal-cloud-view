<template>
  <el-popover
    ref="historyPopover"
    :value="historyListPopoverVisible"
    style="margin-right: 15px"
    :visible-arrow="false"
    :popper-class="(lightTheme ? 'file-history-popover' : 'dark-file-history-popover') + ' version-timeline-popover'"
    placement="bottom"
    width="400"
    trigger="manual"
    @show="popoverShow"
    @hide="popoverHide"
  >
    <div :class="lightTheme ? 'version-history-timeline' : 'dark-version-history-timeline'">
      <div class="scrollbar-wrapper" @scroll="handleScroll">
        <div class="timeline-container-scrollbar">
          <div v-if="loading && fileHistoryList.length === 0" class="timeline-loading">加载中...</div>
          <div v-if="!loading && fileHistoryList.length === 0 && finished" class="timeline-empty">暂无历史版本</div>
          <div v-for="(item, index) in fileHistoryList" :key="item.id" class="timeline-item">
            <div class="timeline-icon">
              <el-avatar :src="imageUrl + item.metadata.operator" size="medium" icon="el-icon-user-solid"></el-avatar>
            </div>
            <div class="timeline-line" v-if="index !== fileHistoryList.length - 1"></div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="timeline-date">{{ item.metadata.time }}</span>
                <span class="version-filename" :title="item.metadata.filename">{{ item.metadata.filename }}</span>
              </div>
              <div class="timeline-second-line">
                <div><span class="timeline-operator">{{ item.metadata.operator }}</span></div>
                <div class="timeline-actions">
                  <el-button round size="mini" :class="lightTheme ? '' : 'dark-button'"
                             @click="viewHistoryFile(item, true, false)" :loading="historyOperationLoading">预览
                  </el-button>

                  <el-popover placement="bottom" width="310"
                              :popper-class="(lightTheme ? 'file-history-popover' : 'dark-file-history-popover') + ' recovery-' + item.id"
                              :visible-arrow="false" trigger="click">
                    <p class="el-popconfirm__main"><i class="el-popconfirm__icon el-icon-question"
                                                      style="color: rgb(255, 153, 0);"></i>{{ '确定要恢复到' + item.metadata.time + '吗？当前内容将被覆盖!'
                      }}
                    </p>
                    <div style="text-align: right; margin: 0">
                      <el-button round size="mini" type="text" @click="cancelRecovery(item.id)">取消</el-button>
                      <el-button round type="primary" size="mini" @click="confirmRecoveryHistoryFile(item)">确定
                      </el-button>
                    </div>
                    <el-button round slot="reference" size="mini" :id="'recoveryVersionBtn-'+item.id" type="warning"
                               :loading="historyOperationLoading">恢复
                    </el-button>
                  </el-popover>

                  <el-popover placement="bottom" width="310"
                              :popper-class="(lightTheme ? 'file-history-popover' : 'dark-file-history-popover') + ' delete-' + item.id"
                              :visible-arrow="false" trigger="click">
                    <p class="el-popconfirm__main"><i class="el-popconfirm__icon el-icon-question"
                                                      style="color: rgb(255, 153, 0);"></i>{{ '确定要删除' + item.metadata.time + '吗？这将永久删除该历史版本!'
                      }}
                    </p>
                    <div style="text-align: right; margin: 0">
                      <el-button round size="mini" type="text" @click="cancelDelete(item.id)">取消</el-button>
                      <el-button round type="primary" size="mini" @click="confirmDeleteHistoryFile(item.id)">确定
                      </el-button>
                    </div>
                    <el-button round slot="reference" size="mini" :id="'deleteVersionBtn-'+item.id" type="danger"
                               :loading="historyOperationLoading">删除
                    </el-button>
                  </el-popover>
                </div>
              </div>
            </div>
          </div>
          <div v-if="loading && fileHistoryList.length > 0" class="timeline-loading-more">加载中...</div>
        </div>
      </div>
    </div>

    <el-button
      slot="reference"
      round
      :style="versionBtnStyle"
      :size="buttonSize"
      :class="lightTheme ? ' history-version-btn' : 'dark-button history-version-btn'"
      @click="showOrHidePopover"
    >
      历史版本
    </el-button>
  </el-popover>
</template>

<script>
import historyApi from '@/api/file-history'

export default {
  name: 'history-popover',
  props: {
    hasHistoryVersion: {
      type: Object, // 注意：这里是 Object，虽然通常用 Boolean，但为保持兼容性，维持原样
      default: function() {
        return { metadata: {} }
      },
    },
    lightTheme: { type: Boolean, default: true },
    historyListPopoverVisible: { type: Boolean, default: false },
    historyOperationLoading: { type: Boolean, default: false },
    saved: { type: Boolean, default: true },
    buttonSize: { type: String, default: 'mini' },
    transparent: { type: Boolean, default: false },
  },
  data() {
    return {
      imageUrl: `${process.env.VUE_APP_BASE_API}/view/thumbnail/user/`,
      fileHistoryList: [],
      loading: false,
      finished: false,
      historyPageIndex: 1,
      historyPageSize: 20,
      loadApiFunction: null,
      loadApiParams: {},
    }
  },
  computed: {
    versionBtnStyle() {
      if (this.transparent) {
        return 'background: #00000000;border: 0;'
      }
      return ''
    },
  },
  watch: {
    historyListPopoverVisible(value) {
      if (value) {
        document.getElementById('app').addEventListener('click', this.onGlobalClick)
      } else {
        document.getElementById('app').removeEventListener('click', this.onGlobalClick)
      }
    },
  },
  methods: {
    /**
     * @public
     */
    loadHistoryList(id) {
      if (!this.$store.state.user.token || !this.$store.state.user.name) return
      this.resetState()
      this.loadApiFunction = historyApi.fileHistoryList
      this.loadApiParams = { fileId: id, username: this.$store.state.user.name }
      this._internalLoadHistory()
    },

    /**
     * @public
     */
    loadHistoryPathList(pathname) {
      if (!this.$store.getters.token) return
      this.resetState()
      this.loadApiFunction = historyApi.fileHistoryPathList
      this.loadApiParams = { path: encodeURI(pathname), username: this.$store.state.user.name }
      this._internalLoadHistory()
    },

    // --- 内部方法 ---

    _internalLoadHistory(isLoadMore = false) {
      if (this.loading || (isLoadMore && this.finished)) return

      if (!isLoadMore) {
        this.historyPageIndex = 1
        this.fileHistoryList = []
      } else {
        this.historyPageIndex++
      }

      this.loading = true
      const params = {
        ...this.loadApiParams,
        pageIndex: this.historyPageIndex,
        pageSize: this.historyPageSize,
      }

      this.loadApiFunction(params).then(res => {
        if (res.data && res.data.length > 0) {
          this.fileHistoryList.push(...res.data)
        }
        this.finished = this.fileHistoryList.length >= res.count

        if (this.loadApiFunction === historyApi.fileHistoryList) {
          this.$emit('update:hasHistoryVersion', res.count > 0)
        } else {
          this.$emit('loadHistoryPathListSuccess', { res, pathname: this.loadApiParams.path })
        }
      }).catch(err => {
        console.error('加载历史版本失败', err)
        if (isLoadMore) this.historyPageIndex--
      }).finally(() => {
        this.loading = false
      })
    },

    resetState() {
      this.fileHistoryList = []
      this.historyPageIndex = 1
      this.finished = false
      this.loading = false
      const scrollWrapper = this.$el ? this.$el.querySelector('.scrollbar-wrapper') : null
      if (scrollWrapper) scrollWrapper.scrollTop = 0
    },

    handleScroll(e) {
      const { scrollTop, scrollHeight, clientHeight } = e.target
      if (scrollHeight - scrollTop - clientHeight < 100) {
        this._internalLoadHistory(true)
      }
    },
    onGlobalClick(event) {
      let eventClass = event.target.getAttribute('class') || (event.target.parentElement ? event.target.parentElement.getAttribute('class') : '')
      if (eventClass && eventClass.includes('history-version-btn')) {
        return
      }
      if (this.historyListPopoverVisible) {
        this.$emit('update:historyListPopoverVisible', false)
      }
      // 这段逻辑非常特定，必须保留
      if (event.target.getAttribute('data-tab') === 'file') {
        setTimeout(() => {
          let parentDoc = document.querySelector('.component-only-office')
          if (parentDoc) {
            let doc = parentDoc.getElementsByTagName('iframe')[0].contentWindow.document
            let btn = doc.getElementById('fm-btn-history')
            if (btn) btn.style.display = 'none'
          }
        })
      }
    },

    popoverShow() {
      this.$emit('update:historyListPopoverVisible', true)
    },
    popoverHide() {
      this.$emit('update:historyListPopoverVisible', false)
    },
    showOrHidePopover() {
      this.$emit('update:historyListPopoverVisible', !this.historyListPopoverVisible)
    },
    viewHistoryFile(historyInfo, diff, recovery) {
      this.$emit('viewHistoryFile', { historyInfo, diff, recovery })
    },

    cancelDelete(id) {
      document.getElementById('deleteVersionBtn-' + id).click()
    },
    cancelRecovery(id) {
      document.getElementById('recoveryVersionBtn-' + id).click()
    },

    confirmRecoveryHistoryFile(historyInfo) {
      if (!this.saved) {
        this.$message({ type: 'info', message: '请先保存当前修改的内容' })
        return
      }
      this.cancelRecovery(historyInfo.id)
      this.$emit('update:historyOperationLoading', true)
      historyApi.recoveryHistory({ id: historyInfo.id }).then((res) => {
        this.$emit('recoverySuccess', { historyInfo, result: res })
      })
    },

    confirmDeleteHistoryFile(id) {
      this.cancelDelete(id)
      this.$emit('update:historyOperationLoading', true)
      historyApi.deleteHistory({ id: id }).then(() => {
        this.$emit('update:historyOperationLoading', false)
        this.$message({ message: '删除成功', type: 'success' })
        let deleteIndex = this.fileHistoryList.findIndex(fileHistory => fileHistory.id === id)
        this.fileHistoryList.splice(deleteIndex, 1)
        if (this.fileHistoryList.length < 1) {
          this.$emit('update:hasHistoryVersion', false)
        }
      })
    },
  },
}
</script>

<style>
/* 非 Scoped 样式 */
.file-history-popover {
  padding: 0 !important;
  border-radius: 8px !important;
  background-color: rgba(255, 255, 255, .75);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  backdrop-filter: blur(16px) saturate(180%);

  .el-popconfirm {
    width: 310px;
  }

}

.dark-file-history-popover {
  background-color: rgba(46, 46, 46, .75);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  backdrop-filter: blur(16px) saturate(180%);
  color: #b7b7b7;
  border: 1px solid #2e2e30;
}

</style>

<style scoped>
.version-history-timeline {
  height: 100%;
}

.dark-version-history-timeline {
  .timeline-date {
    color: #b7b7b7;
  }

  .timeline-icon {
    background: #3e3e3e;
  }

  .timeline-operator {
    color: #b7b7b7;
  }

  .version-filename {
    color: #b7b7b7;
  }

  .timeline-line {
    background: #3e3e3e;
  }

  .dark-button {
    background: #3e3e3e;
    border: 1px solid #3e3e3e;
    color: #ffffff;
  }

  .dark-button:hover {
    color: #409EFF;
    background-color: #181818;
  }

  .el-avatar {
    background: #181818;
  }

}

.scrollbar-wrapper {
  height: 400px;
  overflow-y: auto;
  position: relative;
}

.scrollbar-wrapper::-webkit-scrollbar {
  width: 6px;
  background: transparent;
}

.scrollbar-wrapper::-webkit-scrollbar-thumb {
  background: rgba(180, 180, 180, 0.48);
  border-radius: 6px;
}

.timeline-container-scrollbar {
  padding: 10px 15px 10px 20px;
}

.timeline-item {
  position: relative;
  display: flex;
  padding: 15px 0;
}

.timeline-icon {
  position: relative;
  z-index: 2;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background-color: #f0f2f5;
}

.timeline-line {
  position: absolute;
  left: 20px;
  top: 45px;
  bottom: -35px;
  width: 1px;
  background-color: #e1e4e8;
  z-index: 1;
}

.timeline-content {
  margin-left: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.timeline-date {
  font-size: 14px;
  color: #24292e;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}

.version-filename {
  font-size: 12px;
  color: #586069;
  flex-shrink: 0;
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.timeline-second-line {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
}

.timeline-operator {
  color: #586069;
  font-weight: bold;
}

.timeline-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.timeline-actions .el-button {
  margin: 0 !important;
}

.timeline-loading, .timeline-empty, .timeline-loading-more {
  text-align: center;
  color: #909399;
  padding: 20px 0;
  font-size: 14px;
}

.el-popconfirm__main {
  margin: 12px 0;
}
</style>
