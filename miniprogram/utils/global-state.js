/**
 * 全局状态管理器
 * 
 * 功能：
 * 1. 管理应用级别的共享状态
 * 2. 提供状态变化的响应式更新机制  
 * 3. 支持页面间状态同步
 * 4. BLE连接状态的全局访问
 * 
 * @author Claude
 * @version 2.0.0
 */

class GlobalState {
  constructor() {
    if (GlobalState.instance) {
      return GlobalState.instance;
    }

    GlobalState.instance = this;

    // 全局状态存储
    this.state = {
      // BLE连接相关状态
      ble: {
        connected: false,
        connecting: false,
        deviceId: '',
        deviceName: '',
        connectionState: 'disconnected',
        lastHeartbeat: 0,
        signalStrength: -100,
        boundDevice: null,
        autoReconnectEnabled: true,
        connectionAttempts: 0,
        maxConnectionAttempts: 5
      },
      
      // 同步状态
      sync: {
        isSyncing: false,
        lastSyncTime: 0,
        pendingSyncsCount: 0,
        pendingTouchEventsCount: 0,
        syncProgress: 0,
        syncErrors: []
      },
      
      // 应用状态
      app: {
        isBackground: false,
        currentPage: '',
        networkStatus: 'wifi',
        userOpenId: '',
        isFirstLaunch: true
      },
      
      // 设备数据
      device: {
        touchEvents: [],        // 最近的碰一碰事件
        touchList: [],          // 当前碰一碰列表
        lastTouchTime: 0,       // 最后碰触时间
        deviceStats: {          // 设备统计信息
          totalTouches: 0,
          todayTouches: 0,
          deviceUptime: 0
        }
      },
      
      // 用户数据缓存
      user: {
        profile: null,
        questionnaire: null,
        tags: [],
        bluetoothName: '',
        lastUpdateTime: 0
      }
    };

    // 状态变化监听器
    this.listeners = new Map();
    
    // 状态变化历史（用于调试）
    this.stateHistory = [];
    this.maxHistoryLength = 50;
    
    this.init();
    console.log('🏪 全局状态管理器初始化完成');
  }

  /**
   * 初始化状态管理器
   */
  init() {
    // 从本地存储恢复状态
    this.restoreFromStorage();
    
    // 监听网络状态
    this.setupNetworkListener();
    
    // 定期保存状态到本地
    this.setupAutoSave();
  }

  /**
   * 从本地存储恢复状态
   */
  restoreFromStorage() {
    try {
      // 恢复BLE状态
      const savedBleState = wx.getStorageSync('globalBleState');
      if (savedBleState) {
        this.setState('ble', { ...this.state.ble, ...savedBleState });
      }
      
      // 恢复用户状态
      const savedUserState = wx.getStorageSync('globalUserState');
      if (savedUserState) {
        this.setState('user', { ...this.state.user, ...savedUserState });
      }
      
      console.log('📱 全局状态已从本地存储恢复');
    } catch (error) {
      console.error('❌ 恢复全局状态失败:', error);
    }
  }

  /**
   * 设置网络监听
   */
  setupNetworkListener() {
    wx.onNetworkStatusChange((res) => {
      this.setState('app.networkStatus', res.networkType);
      console.log('📡 网络状态变化:', res.networkType);
    });

    // 获取初始网络状态
    wx.getNetworkType({
      success: (res) => {
        this.setState('app.networkStatus', res.networkType);
      }
    });
  }

  /**
   * 设置自动保存
   */
  setupAutoSave() {
    // 每30秒自动保存一次关键状态
    setInterval(() => {
      this.saveToStorage();
    }, 30000);
  }

  /**
   * 保存状态到本地存储
   */
  saveToStorage() {
    try {
      // 保存BLE状态（排除敏感信息）
      const bleStateToSave = {
        deviceId: this.state.ble.deviceId,
        deviceName: this.state.ble.deviceName,
        boundDevice: this.state.ble.boundDevice,
        autoReconnectEnabled: this.state.ble.autoReconnectEnabled
      };
      wx.setStorageSync('globalBleState', bleStateToSave);
      
      // 保存用户状态
      wx.setStorageSync('globalUserState', this.state.user);
      
    } catch (error) {
      console.error('❌ 保存全局状态失败:', error);
    }
  }

  /**
   * 设置状态值
   * @param {string} path - 状态路径，如 'ble.connected' 或 'sync.isSyncing'
   * @param {any} value - 新值
   */
  setState(path, value) {
    const oldState = this.deepClone(this.state);
    
    // 解析路径并设置值
    const pathArray = path.split('.');
    let current = this.state;
    
    for (let i = 0; i < pathArray.length - 1; i++) {
      const key = pathArray[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    const finalKey = pathArray[pathArray.length - 1];
    const oldValue = current[finalKey];
    current[finalKey] = value;
    
    // 记录状态变化历史
    this.recordStateChange(path, oldValue, value);
    
    // 触发监听器
    this.notifyListeners(path, value, oldValue);
    
    console.log(`🔄 状态更新: ${path} =`, value);
  }

  /**
   * 获取状态值
   * @param {string} path - 状态路径
   * @returns {any} 状态值
   */
  getState(path) {
    const pathArray = path.split('.');
    let current = this.state;
    
    for (const key of pathArray) {
      if (current && current.hasOwnProperty(key)) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * 批量设置状态
   * @param {Object} updates - 更新对象，键为路径，值为新值
   */
  batchSetState(updates) {
    Object.entries(updates).forEach(([path, value]) => {
      this.setState(path, value);
    });
  }

  /**
   * 获取完整状态快照
   */
  getFullState() {
    return this.deepClone(this.state);
  }

  /**
   * 重置指定部分状态
   * @param {string} section - 状态部分，如 'ble', 'sync', 'app' 等
   */
  resetSection(section) {
    const defaultStates = {
      ble: {
        connected: false,
        connecting: false,
        deviceId: '',
        deviceName: '',
        connectionState: 'disconnected',
        lastHeartbeat: 0,
        signalStrength: -100,
        boundDevice: null,
        autoReconnectEnabled: true,
        connectionAttempts: 0,
        maxConnectionAttempts: 5
      },
      sync: {
        isSyncing: false,
        lastSyncTime: 0,
        pendingSyncsCount: 0,
        pendingTouchEventsCount: 0,
        syncProgress: 0,
        syncErrors: []
      },
      device: {
        touchEvents: [],
        touchList: [],
        lastTouchTime: 0,
        deviceStats: {
          totalTouches: 0,
          todayTouches: 0,
          deviceUptime: 0
        }
      }
    };
    
    if (defaultStates[section]) {
      this.state[section] = this.deepClone(defaultStates[section]);
      this.notifyListeners(`${section}.*`, this.state[section]);
      console.log(`🔄 重置状态部分: ${section}`);
    }
  }

  /**
   * 记录状态变化历史
   */
  recordStateChange(path, oldValue, newValue) {
    this.stateHistory.unshift({
      path,
      oldValue,
      newValue,
      timestamp: Date.now()
    });
    
    // 限制历史记录长度
    if (this.stateHistory.length > this.maxHistoryLength) {
      this.stateHistory = this.stateHistory.slice(0, this.maxHistoryLength);
    }
  }

  /**
   * 获取状态变化历史
   */
  getStateHistory() {
    return this.stateHistory.slice();
  }

  /**
   * 监听状态变化
   * @param {string} path - 监听路径，支持通配符 * 
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消监听的函数
   */
  watch(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, []);
    }
    
    this.listeners.get(path).push(callback);
    
    // 返回取消监听的函数
    return () => {
      const callbacks = this.listeners.get(path);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * 移除监听器
   * @param {string} path - 监听路径
   * @param {Function} callback - 回调函数
   */
  unwatch(path, callback) {
    const callbacks = this.listeners.get(path);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * 通知监听器
   */
  notifyListeners(path, newValue, oldValue) {
    // 精确匹配的监听器
    const exactListeners = this.listeners.get(path) || [];
    exactListeners.forEach(callback => {
      try {
        callback(newValue, oldValue, path);
      } catch (error) {
        console.error(`❌ 状态监听器执行失败 [${path}]:`, error);
      }
    });
    
    // 通配符监听器
    const pathParts = path.split('.');
    for (let i = 1; i <= pathParts.length; i++) {
      const wildcardPath = pathParts.slice(0, i).join('.') + '.*';
      const wildcardListeners = this.listeners.get(wildcardPath) || [];
      
      wildcardListeners.forEach(callback => {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          console.error(`❌ 通配符状态监听器执行失败 [${wildcardPath}]:`, error);
        }
      });
    }
  }

  /**
   * 深度克隆对象
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item));
    }
    
    const cloned = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = this.deepClone(obj[key]);
    });
    
    return cloned;
  }

  // ========== 便捷方法 ==========

  /**
   * BLE连接状态相关便捷方法
   */
  getBleState() {
    return this.getState('ble');
  }

  setBleConnected(connected, deviceInfo = {}) {
    this.batchSetState({
      'ble.connected': connected,
      'ble.connecting': false,
      'ble.connectionState': connected ? 'connected' : 'disconnected',
      ...Object.keys(deviceInfo).reduce((acc, key) => {
        acc[`ble.${key}`] = deviceInfo[key];
        return acc;
      }, {})
    });
  }

  setBleConnecting(connecting) {
    this.setState('ble.connecting', connecting);
    if (connecting) {
      this.setState('ble.connectionState', 'connecting');
    }
  }

  updateBleHeartbeat() {
    this.setState('ble.lastHeartbeat', Date.now());
  }

  /**
   * 同步状态相关便捷方法
   */
  getSyncState() {
    return this.getState('sync');
  }

  setSyncing(syncing, progress = 0) {
    this.batchSetState({
      'sync.isSyncing': syncing,
      'sync.syncProgress': progress
    });
  }

  updateSyncProgress(progress) {
    this.setState('sync.syncProgress', progress);
  }

  addSyncError(error) {
    const errors = this.getState('sync.syncErrors') || [];
    errors.unshift({
      error: error.message || error,
      timestamp: Date.now()
    });
    
    // 只保留最近10个错误
    this.setState('sync.syncErrors', errors.slice(0, 10));
  }

  /**
   * 设备数据相关便捷方法
   */
  getDeviceState() {
    return this.getState('device');
  }

  addTouchEvent(touchEvent) {
    const events = this.getState('device.touchEvents') || [];
    events.unshift({
      ...touchEvent,
      timestamp: Date.now()
    });
    
    // 只保留最近50个事件
    this.setState('device.touchEvents', events.slice(0, 50));
    this.setState('device.lastTouchTime', Date.now());
    
    // 更新统计
    const stats = this.getState('device.deviceStats');
    this.batchSetState({
      'device.deviceStats.totalTouches': (stats.totalTouches || 0) + 1,
      'device.deviceStats.todayTouches': this.getTodayTouchCount() + 1
    });
  }

  updateTouchList(touchList) {
    this.setState('device.touchList', touchList || []);
  }

  getTodayTouchCount() {
    const events = this.getState('device.touchEvents') || [];
    const today = new Date().toDateString();
    
    return events.filter(event => {
      const eventDate = new Date(event.timestamp).toDateString();
      return eventDate === today;
    }).length;
  }

  /**
   * 用户数据相关便捷方法
   */
  getUserState() {
    return this.getState('user');
  }

  updateUserProfile(profile) {
    this.batchSetState({
      'user.profile': profile,
      'user.lastUpdateTime': Date.now()
    });
  }

  updateBluetoothName(name) {
    this.setState('user.bluetoothName', name);
  }

  /**
   * 应用状态相关便捷方法
   */
  getAppState() {
    return this.getState('app');
  }

  setBackgroundMode(isBackground) {
    this.setState('app.isBackground', isBackground);
  }

  setCurrentPage(pageName) {
    this.setState('app.currentPage', pageName);
  }
}

// 导出单例实例
const globalState = new GlobalState();

module.exports = {
  GlobalState,
  globalState
};