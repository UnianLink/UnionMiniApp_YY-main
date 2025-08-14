/**
 * 全局连接状态指示器组件
 * 
 * 功能：
 * 1. 显示BLE连接状态（类似WiFi指示器）
 * 2. 显示同步进度
 * 3. 点击可查看详细状态
 * 4. 自动根据连接状态变化颜色和图标
 * 
 * @author Claude
 * @version 2.0.0
 */

const { globalBleManager, GLOBAL_BLE_STATE, GLOBAL_BLE_EVENTS } = require('../../utils/global-ble-manager.js');
const { globalState } = require('../../utils/global-state.js');

Component({
  properties: {
    // 显示位置：'top-right', 'top-left', 'bottom-right', 'bottom-left'
    position: {
      type: String,
      value: 'top-right'
    },
    
    // 是否显示文本标签
    showLabel: {
      type: Boolean,
      value: false
    },
    
    // 是否可点击展开详情
    clickable: {
      type: Boolean,
      value: true
    },
    
    // 主题：'light', 'dark', 'auto'
    theme: {
      type: String,
      value: 'auto'
    }
  },

  data: {
    // 连接状态
    connectionState: GLOBAL_BLE_STATE.DISCONNECTED,
    connected: false,
    connecting: false,
    
    // 设备信息
    deviceName: '',
    signalStrength: -100,
    lastHeartbeat: 0,
    
    // 同步状态
    isSyncing: false,
    syncProgress: 0,
    pendingSyncsCount: 0,
    
    // UI状态
    showDetails: false,
    animating: false,
    
    // 同步反馈
    syncFeedback: {
      show: false,
      type: '', // 'success', 'error', 'warning', 'info'
      message: '',
      progress: 0,
      autoHide: true
    },
    
    // 状态映射
    statusConfig: {
      [GLOBAL_BLE_STATE.DISCONNECTED]: {
        icon: 'bluetooth-off',
        color: '#999999',
        text: '未连接',
        bgColor: 'rgba(153, 153, 153, 0.1)'
      },
      [GLOBAL_BLE_STATE.CONNECTING]: {
        icon: 'bluetooth-searching',
        color: '#1296db',
        text: '连接中',
        bgColor: 'rgba(18, 150, 219, 0.1)'
      },
      [GLOBAL_BLE_STATE.CONNECTED]: {
        icon: 'bluetooth',
        color: '#10aeff',
        text: '已连接',
        bgColor: 'rgba(16, 174, 255, 0.1)'
      },
      [GLOBAL_BLE_STATE.SYNCING]: {
        icon: 'sync',
        color: '#ff9500',
        text: '同步中',
        bgColor: 'rgba(255, 149, 0, 0.1)'
      },
      [GLOBAL_BLE_STATE.BACKGROUND]: {
        icon: 'bluetooth-connected',
        color: '#34c759',
        text: '后台连接',
        bgColor: 'rgba(52, 199, 89, 0.1)'
      },
      [GLOBAL_BLE_STATE.ERROR]: {
        icon: 'bluetooth-disabled',
        color: '#ff3b30',
        text: '连接错误',
        bgColor: 'rgba(255, 59, 48, 0.1)'
      },
      [GLOBAL_BLE_STATE.RECONNECTING]: {
        icon: 'refresh',
        color: '#ff9500',
        text: '重连中',
        bgColor: 'rgba(255, 149, 0, 0.1)'
      }
    }
  },

  lifetimes: {
    attached() {
      console.log('🔗 连接状态指示器组件加载');
      this.initComponent();
    },
    
    detached() {
      console.log('🔗 连接状态指示器组件卸载');
      this.cleanup();
    }
  },

  methods: {
    /**
     * 初始化组件
     */
    initComponent() {
      // 获取初始状态
      this.updateFromGlobalState();
      
      // 监听全局状态变化
      this.setupStateListeners();
    },

    /**
     * 设置状态监听器
     */
    setupStateListeners() {
      // 监听BLE状态变化
      this.bleStateListener = globalBleManager.on(GLOBAL_BLE_EVENTS.CONNECTION_STATE_CHANGED, (data) => {
        this.handleConnectionStateChange(data);
      });

      // 监听同步进度更新
      this.syncProgressListener = globalBleManager.on(GLOBAL_BLE_EVENTS.SYNC_PROGRESS_UPDATED, (data) => {
        this.handleSyncProgressUpdate(data);
      });

      // 监听全局状态变化
      this.globalStateListener = globalState.watch('ble.*', (newValue, oldValue, path) => {
        this.handleGlobalStateChange(path, newValue);
      });

      this.syncStateListener = globalState.watch('sync.*', (newValue, oldValue, path) => {
        this.handleSyncStateChange(path, newValue);
      });
    },

    /**
     * 从全局状态更新组件状态
     */
    updateFromGlobalState() {
      const bleState = globalState.getBleState();
      const syncState = globalState.getSyncState();
      
      this.setData({
        connectionState: bleState.connectionState || GLOBAL_BLE_STATE.DISCONNECTED,
        connected: bleState.connected || false,
        connecting: bleState.connecting || false,
        deviceName: bleState.deviceName || '',
        signalStrength: bleState.signalStrength || -100,
        lastHeartbeat: bleState.lastHeartbeat || 0,
        isSyncing: syncState.isSyncing || false,
        syncProgress: syncState.syncProgress || 0,
        pendingSyncsCount: syncState.pendingSyncsCount || 0
      });
    },

    /**
     * 处理连接状态变化
     */
    handleConnectionStateChange(data) {
      const { newState } = data;
      
      this.setData({
        connectionState: newState,
        connecting: newState === GLOBAL_BLE_STATE.CONNECTING || newState === GLOBAL_BLE_STATE.RECONNECTING,
        connected: newState === GLOBAL_BLE_STATE.CONNECTED || newState === GLOBAL_BLE_STATE.BACKGROUND
      });

      // 触发动画效果
      this.triggerAnimation();
    },

    /**
     * 处理同步进度更新
     */
    handleSyncProgressUpdate(data) {
      this.setData({
        isSyncing: data.isSyncing || false,
        syncProgress: data.progress || 0
      });
      
      // 处理同步反馈
      if (data.type === 'sync_reminder') {
        this.showSyncFeedback('warning', data.message, false);
      } else if (data.isSyncing) {
        this.showSyncFeedback('info', `同步中... ${data.progress || 0}%`, true);
      } else if (data.progress === 100) {
        this.showSyncFeedback('success', '同步完成', true);
      }
    },

    /**
     * 处理全局状态变化
     */
    handleGlobalStateChange(path, newValue) {
      if (path === 'ble.deviceName') {
        this.setData({ deviceName: newValue });
      } else if (path === 'ble.signalStrength') {
        this.setData({ signalStrength: newValue });
      } else if (path === 'ble.lastHeartbeat') {
        this.setData({ lastHeartbeat: newValue });
      }
    },

    /**
     * 处理同步状态变化
     */
    handleSyncStateChange(path, newValue) {
      if (path === 'sync.isSyncing') {
        this.setData({ isSyncing: newValue });
      } else if (path === 'sync.syncProgress') {
        this.setData({ syncProgress: newValue });
      } else if (path === 'sync.pendingSyncsCount') {
        this.setData({ pendingSyncsCount: newValue });
      }
    },

    /**
     * 触发动画效果
     */
    triggerAnimation() {
      this.setData({ animating: true });
      setTimeout(() => {
        this.setData({ animating: false });
      }, 300);
    },

    /**
     * 点击指示器
     */
    onIndicatorTap() {
      if (!this.data.clickable) {
        return;
      }

      // 切换详情显示
      const showDetails = !this.data.showDetails;
      this.setData({ showDetails });

      // 触发自定义事件
      this.triggerEvent('statusTap', {
        connectionState: this.data.connectionState,
        connected: this.data.connected,
        deviceName: this.data.deviceName,
        showDetails
      });
    },

    /**
     * 关闭详情面板
     */
    onCloseDetails() {
      this.setData({ showDetails: false });
    },

    /**
     * 手动刷新连接
     */
    onRefreshConnection() {
      console.log('🔄 手动刷新连接');
      
      const bleState = globalBleManager.getState();
      if (bleState.boundDevice) {
        globalBleManager.connectToDevice(bleState.boundDevice);
      }
      
      // 触发自定义事件
      this.triggerEvent('refreshConnection');
    },

    /**
     * 获取当前状态配置
     */
    getCurrentStatusConfig() {
      let currentState = this.data.connectionState;
      
      // 如果正在同步，显示同步状态
      if (this.data.isSyncing) {
        currentState = GLOBAL_BLE_STATE.SYNCING;
      }
      
      return this.data.statusConfig[currentState] || this.data.statusConfig[GLOBAL_BLE_STATE.DISCONNECTED];
    },

    /**
     * 获取信号强度等级
     */
    getSignalLevel() {
      const rssi = this.data.signalStrength;
      if (rssi >= -50) return 4; // 优秀
      if (rssi >= -60) return 3; // 良好  
      if (rssi >= -70) return 2; // 一般
      if (rssi >= -80) return 1; // 较差
      return 0; // 很差
    },

    /**
     * 格式化最后心跳时间
     */
    getLastHeartbeatText() {
      if (!this.data.lastHeartbeat) {
        return '未知';
      }
      
      const now = Date.now();
      const diff = now - this.data.lastHeartbeat;
      
      if (diff < 30000) { // 30秒内
        return '刚刚';
      } else if (diff < 60000) { // 1分钟内
        return '不到1分钟前';
      } else if (diff < 300000) { // 5分钟内
        return `${Math.round(diff / 60000)}分钟前`;
      } else {
        return '较长时间前';
      }
    },

    /**
     * 显示同步反馈
     */
    showSyncFeedback(type, message, autoHide = true) {
      this.setData({
        'syncFeedback.show': true,
        'syncFeedback.type': type,
        'syncFeedback.message': message,
        'syncFeedback.autoHide': autoHide
      });

      // 自动隐藏
      if (autoHide) {
        setTimeout(() => {
          this.hideSyncFeedback();
        }, 3000);
      }
    },

    /**
     * 隐藏同步反馈
     */
    hideSyncFeedback() {
      this.setData({
        'syncFeedback.show': false
      });
    },

    /**
     * 关闭同步反馈
     */
    onCloseSyncFeedback() {
      this.hideSyncFeedback();
    },

    /**
     * 获取同步反馈样式
     */
    getSyncFeedbackStyle() {
      const type = this.data.syncFeedback.type;
      const styleMap = {
        success: { color: '#52c41a', bgColor: 'rgba(82, 196, 26, 0.1)', icon: '✓' },
        error: { color: '#ff4d4f', bgColor: 'rgba(255, 77, 79, 0.1)', icon: '✗' },
        warning: { color: '#faad14', bgColor: 'rgba(250, 173, 20, 0.1)', icon: '⚠' },
        info: { color: '#1890ff', bgColor: 'rgba(24, 144, 255, 0.1)', icon: 'ℹ' }
      };
      
      return styleMap[type] || styleMap.info;
    },

    /**
     * 清理资源
     */
    cleanup() {
      // 移除事件监听器
      if (this.bleStateListener) {
        globalBleManager.off(GLOBAL_BLE_EVENTS.CONNECTION_STATE_CHANGED, this.bleStateListener);
      }
      if (this.syncProgressListener) {
        globalBleManager.off(GLOBAL_BLE_EVENTS.SYNC_PROGRESS_UPDATED, this.syncProgressListener);
      }
      if (this.globalStateListener) {
        this.globalStateListener();
      }
      if (this.syncStateListener) {
        this.syncStateListener();
      }
      
      // 清理同步反馈定时器
      this.hideSyncFeedback();
    }
  }
});