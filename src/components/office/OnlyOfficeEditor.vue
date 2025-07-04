<template>
  <div>

    <history-popover
      ref="historyPopover"
      style="right: 20px;top: 61px;position: absolute;"
      :transparent="true"
      :has-history-version.sync="hasHistoryVersion"
      :history-list-popover-visible.sync="historyListPopoverVisible"
      :history-operation-loading.sync="historyOperationLoading"
      :saved.sync="saved"
      @viewHistoryFile="viewHistoryFile"
      @recoverySuccess="recoverySuccess"
    >
    </history-popover>
    <div class="component-only-office">
      <div :id="this.id" class="placeholder"></div>
    </div>
  </div>
</template>

<script>

import api from "@/api/file-api"
import settingApi from "@/api/setting-api"
import fileConfig from "@/utils/file-config";
import SparkMD5 from 'spark-md5'
import HistoryPopover from "@/components/HistoryPopover/index.vue";
import {mapState} from "vuex";

export default {
  name: "OnlyOfficeEditor",
  components: {HistoryPopover},
  props: {
    id: {
      type: String,
      default: () => {
        return "office_" + Math.round(Math.random() * 10000)
      }
    },
    fileUrl: {
      type: String,
      default: ''
    },
    code: {
      type: String,
      default: ''
    },
    shareId: {
      type: String,
      default: ''
    },
    sharer: {
      type: String,
      default: undefined
    },
    file: {
      type: Object,
      default: function () {
        return {}
      }
    },
     readOnly: {
      type: Boolean,
      default: false
    },
    documentKey: Function
  },
  data() {
    return {
      docEditorConfig: {},
      docEditor: null,
      fileKey: '',
      saved: true,
      hasHistoryVersion: false,
      historyVersion: {metadata: {}},
      titleObserver: null,
      fileHistoryDateList: [],
      historyListPopoverVisible: false,
      historyPageIndex: 1,
      historyPageSize: 50,
      viewHistory: false,
      historyOperationLoading: false,
      officeServerConfig: {
        documentServer: undefined,
        callbackServer: undefined,
        tokenEnabled: false
      }
    }
  },
  beforeDestroy() {
    this.destroyEditor()
  },
  computed: {
    ...mapState(['message']),
    fileType() {
      return this.getType(this.file.suffix)
    },
  },
  watch: {
    'file.id': {
      handler(id)  {
        if (!id) {
          return
        }

        if (window.shareId) {
          settingApi.getPublicOfficeConfig({shareId: window.shareId, shareToken: this.$store.getters.shareToken}).then(res => {
            this.officeServerConfig = res.data
            this.loadOfficeApi()
          })
        } else {
          settingApi.getOfficeConfig().then(res => {
            this.officeServerConfig = res.data
            this.loadOfficeApi()
          })
        }
      },
      immediate: true,
    },
    hasHistoryVersion(value) {
      if (!value) {
        let parentDoc = document.querySelector('.component-only-office')
        let doc = parentDoc.getElementsByTagName('iframe')[0].contentWindow.document
        let versionBtn = doc.getElementById('box-doc-name-history-btn')
        if (versionBtn) {
          versionBtn.style.display = 'none'
        }
      }
    },
    message(msg) {
      if (msg.event === 'previewSaveAndClose') {
        this.requestClose()
      }
    }
  },
  destroyed() {
  },
  methods: {
    loadOfficeApi() {
      let officeApiUrl = fileConfig.officeApiUrl(this.officeServerConfig.documentServer)
      $J.loadScript($J.apiUrl(officeApiUrl), (e) => {
        if (e !== null) {
          this.$emit('onClose')
          this.$store.dispatch('updateMessage', { event: 'loadFileFailed'})
          return
        }
        if (this.shareId) {
          api.getPublicFileInfoById({fileId: this.file.id, shareId: this.shareId}).then(res => {
            this.file = res.data
            this.loadFile()
          })
        } else {
          api.getFileInfoById({id: this.file.id}).then(res => {
            this.file = res.data
            this.loadFile()
          })
        }
      })
    },
    viewHistoryFile({historyInfo}) {
      const historyUrl = window.location.origin + fileConfig.previewHistoryUrl(historyInfo.id, this.$store.state.user.name, this.$store.state.user.token)
      this.onRequestHistoryData(null, historyInfo, historyUrl)
      this.historyListPopoverVisible = false

      let parentDoc = document.querySelector('.component-only-office')
      let doc = parentDoc.getElementsByTagName('iframe')[0].contentWindow.document
      const toolbar = doc.getElementById('box-doc-name')
      // add cancelPreview button
      if (!doc.getElementById('box-doc-name-cancel-preview')) {
        let newButton = document.createElement("button")
        newButton.setAttribute('id', 'box-doc-name-cancel-preview')
        newButton.classList.add('btn', 'btn-header')
        newButton.innerHTML = '取消预览'
        newButton.style.color = '#fff'
        newButton.style.width = '60px'
        newButton.addEventListener('click', this.cancelPreview)
        toolbar.prepend(newButton)
      }
      // update title
      this.updateTitle(doc, historyInfo)
    },
    updateTitle(doc, historyInfo) {
      this.historyVersion = historyInfo
      let docTitle = doc.getElementById('title-doc-name')

      // Monitor title changes
      if (this.titleObserver === null) {
        let that = this
        this.titleObserver = new MutationObserver(function(mutations) {
          let el = mutations[mutations.length-1].target
          setTimeout(() => {
            el.innerHTML = `历史版本: ${that.historyVersion.metadata.time}`
          }, 0)
        })
        let config = { childList: true, characterData: true }
        this.titleObserver.observe(docTitle, config)
      }
    },
    recoverySuccess({result}) {
      this.reloadDocument(`${result.data}-${SparkMD5.hash(this.file.id)}`)
      this.$message({message: '恢复成功',type: 'success'})
      this.historyListPopoverVisible = false
      this.historyOperationLoading = false
    },
    cancelPreview() {
      this.reloadDocument()
    },
    reloadDocument(key) {
      this.destroyEditor()
      this.docEditorConfig.document.key = key ? key : this.fileKey
      this.docEditor = new DocsAPI.DocEditor(this.id, this.docEditorConfig)
    },
    onRequestHistoryData(event, historyInfo, historyUrl) {
      let historyConfig;
      if (historyInfo && historyUrl){
        historyConfig = {
          "fileType": this.fileType,
          "key": `${new Date(historyInfo.metadata.time).getTime()}-${SparkMD5.hash(this.file.id)}`,
          "url":  historyUrl,
          "version": historyInfo.metadata.time,
        }
      } else {
        historyInfo = this.fileHistoryDateList.find(historyInfo => historyInfo.version === event.data)
        console.log('historyInfo', historyInfo)
        historyUrl = window.location.origin + fileConfig.previewHistoryUrl(historyInfo.key, this.$store.state.user.name, this.$store.state.user.token)
        historyConfig = {
          "fileType": this.fileType,
          "key": historyInfo.key,
          "url": historyUrl,
          "version": historyInfo.version,
        }
      }
      api.getOfficeJwt(historyConfig).then(res => {
        historyConfig.token = res.data
        this.docEditor.setHistoryData(historyConfig)
      })
    },
    onRequestHistoryClose() {
      console.log('onRequestHistoryClose')
      this.reloadDocument()
    },
    onRequestHistory() {
      api.getOfficeHistoryList({fileId: this.file.id, pageSize: 100, pageIndex: 1}).then(res => {
        const currentVersion = res.data.length + 1
        this.fileHistoryDateList = res.data
        this.docEditor.refreshHistory({
          "currentVersion": currentVersion,
          "history": this.fileHistoryDateList
        })
      })
    },
    getType(type) {
      switch (type) {
        case 'doc':
          return 'docx'
        case 'word':
          return 'docx'
        case 'excel':
          return 'xlsx'
        case 'xls':
          return 'xlsx'
        case 'ppt':
          return 'pptx'
      }
      return type
    },
    async loadFile() {
      this.$nextTick(()=> {
        this.$refs.historyPopover.loadHistoryList(this.file.id)
      })
      this.destroyEditor()

      const file_username = this.sharer ? this.sharer : this.$store.state.user.name

      let callbackServer = this.officeServerConfig.callbackServer
      if (callbackServer) {
        if (callbackServer.endsWith('/')) {
          // 去掉最后的/
          callbackServer = callbackServer.substring(0, this.officeServerConfig.callbackServer.length - 1)
        }
      } else {
        callbackServer = 'http://jmalcloud:8088'
      }
      this.fileUrl = fileConfig.previewUrl(file_username, this.file, this.$store.getters.token, undefined, callbackServer)
      this.fileKey = `${new Date(this.file.updateDate).getTime()}-${SparkMD5.hash(this.file.id + callbackServer)}`
      if (this.readOnly && window.shareId) {
        this.fileUrl = fileConfig.publicPreviewUrl(this.file, window.shareId, this.$store.getters.shareToken, callbackServer)
        this.fileKey = `${new Date(this.file.updateDate).getTime()}-${SparkMD5.hash(window.shareId + callbackServer)}`
      }
      let callbackUrl = fileConfig.officeCallBackUrl(this.officeServerConfig.callbackServer, this.$store.getters.token, this.$store.getters.name, this.file.id)
      this.docEditorConfig = {
        document: {
          fileType: this.fileType,
          key: this.fileKey,
          title: this.file.name,
          url: this.fileUrl,
        },
        editorConfig: {
          mode: "edit",
          lang: "zh",
          user: {
            id: this.$store.state.user.userId,
            name: this.$store.state.user.name,
            image: `${window.location.origin}${process.env.VUE_APP_BASE_API}/public/s/view/thumbnail?id=${this.$store.state.user.avatar}`
          },
          customization: {
            autosave: false,
            comments: true,
            compactHeader: false,
            compactToolbar: false,
            compatibleFeatures: false,
            forcesave: false,
            help: false,
            hideRightMenu: false,
            hideRulers: false,
            submitForm: false,
            about: null,
            feedback: false
          },
          callbackUrl: callbackUrl,
        }
      }

      if (this.readOnly && window.shareId) {
        const shareToken = this.$store.getters.shareToken ? this.$store.getters.shareToken : 'token'
        this.docEditorConfig.editorConfig.callbackUrl = null
        api.getPublicOfficeJwt({shareId: window.shareId, shareToken: shareToken}, this.docEditorConfig).then(res => {
          this.loadOffice(res.data)
        })
      } else {
        if (this.officeServerConfig.tokenEnabled) {
          api.getOfficeJwt(this.docEditorConfig).then(res => {
            this.loadOffice(res.data)
          })
        } else {
          this.loadOffice()
        }
      }

    },
    loadOffice(token) {
      if (token) {
        this.docEditorConfig.token = token
      }
      if (!this.$pc) {
        this.docEditorConfig.type = 'mobile'
      }
      if (this.readOnly) {
        this.docEditorConfig.editorConfig.mode = "view"
        this.docEditorConfig.editorConfig.callbackUrl = null
        if (!this.docEditorConfig.editorConfig.user.id) {
          let visitor = $J.getStorageInt("visitor")
          if (!visitor) {
            visitor = $J.randNum(1000, 99999)
            $J.setStorage("viewer", visitor)
          }
          this.docEditorConfig.editorConfig.user.id = "visitor_" + visitor
          this.docEditorConfig.editorConfig.user.name = "Visitor_" + visitor
        }
      }

      this.docEditorConfig.events = {
        "onAppReady": this.onAppReady,
        "onDocumentReady": this.onDocumentReady,
        "onDocumentStateChange": this.onDocumentStateChange,
        "onRequestHistory": this.onRequestHistory,
        "onRequestHistoryData": this.onRequestHistoryData,
        "onRequestHistoryClose": this.onRequestHistoryClose,
      }
      this.$nextTick(() => {
        this.titleObserver = null
        this.docEditor = new DocsAPI.DocEditor(this.id, this.docEditorConfig)
      })
    },
    onClickHistoryVersion(event) {
      this.historyListPopoverVisible = !this.historyListPopoverVisible
      event.stopPropagation()
    },
    onAppReady() {
      this.$emit('onReady')
    },
    onDocumentReady() {
      let parentDoc = document.querySelector('.component-only-office')
      let doc = parentDoc.getElementsByTagName('iframe')[0].contentWindow.document

      if (!this.$pc) {
        parentDoc.style.top = '5rem'
        doc.querySelector('.navbar.main-navbar.navbar-with-logo').style.height = '0'
      }

      let logo = doc.querySelector('.extra .logo')
      // 隐藏logo,about
      logo.style.display = 'none'
      let about = doc.getElementById('left-btn-about')
      about.style.display = 'none'
      this.saveBtnDoc = doc.getElementById('slot-btn-dt-save').getElementsByTagName('button')[0]

      doc.getElementById('id-box-doc-name').style.paddingRight = '0'

      if (this.hasHistoryVersion && !doc.getElementById('box-doc-name-history-btn')) {
        const toolbar = doc.getElementById('box-doc-name')
        toolbar.style.justifyContent = 'right'
        toolbar.style.padding = '0'
        let versionButton = document.createElement("button")
        versionButton.classList.add('btn', 'btn-header')
        versionButton.setAttribute('id', 'box-doc-name-history-btn')
        fetch(require("@/assets/img/history.svg"))
          .then(response => response.text())
          .then(data => {
            let parser = new DOMParser()
            let svgDoc = parser.parseFromString(data, "image/svg+xml")
            let svgElement = svgDoc.querySelector('svg')
            svgElement.setAttribute('style', 'width:16px;height:16px;')
            versionButton.appendChild(svgElement)
          })
        versionButton.addEventListener('click', this.onClickHistoryVersion)
        doc.addEventListener('click', this.$refs.historyPopover.onGlobalClick)
        toolbar.appendChild(versionButton)
      }
    },
    onDocumentStateChange() {
      this.saved = this.saveBtnDoc.classList.contains('disabled')
      this.$emit('onEdit', this.saved)
    },
    requestClose() {
      this.$emit('manualSave')
    },
    destroyEditor() {
      if (this.docEditor !== null) {
        this.docEditor.destroyEditor()
        this.docEditor = null
        this.titleObserver = null
      }
    },
  }
}
</script>
<style lang="scss" scoped>

</style>
