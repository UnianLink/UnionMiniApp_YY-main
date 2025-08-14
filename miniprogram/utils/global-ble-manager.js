/**
 * 全局BLE连接管理器 - 单例模式
 * 
 * 核心功能：
 * 1. 维持应用级别的持续蓝牙连接
 * 2. 实现设备→小程序的实时数据推送和ACK机制
 * 3. 实现小程序→设备的主动数据同步
 * 4. 后台运行时保持基础连接
 * 5. 智能重连和错误恢复
 * 
 * @author Claude
 * @version 2.0.0 - 实时双向同步架构
 */

const { BleHandshakeClient, BLE_CONFIG, BLE_HANDSHAKE_STATE } = require('./ble-handshake-client.js');
const { globalState } = require('./global-state.js');

// 全局连接状态枚举
const GLOBAL_BLE_STATE = {
  DISCONNECTED: 'disconnected',        // 未连接
  CONNECTING: 'connecting',           // 连接中
  CONNECTED: 'connected',             // 已连接
  SYNCING: 'syncing',                // 同步中
  BACKGROUND: 'background',           // 后台模式
  ERROR: 'error',                     // 连接错误
  RECONNECTING: 'reconnecting'        // 重连中
};

// 数据同步类型
const SYNC_TYPE = {
  TOUCH_EVENT: 'touch_event',         // 碰一碰事件
  TAG_UPDATE: 'tag_update',           // 标签更新
  BLUETOOTH_NAME: 'bluetooth_name',   // 蓝牙名称更新
  HEARTBEAT: 'heartbeat',             // 心跳
  ACK: 'ack'                         // 确认回复
};

// 全局事件类型
const GLOBAL_BLE_EVENTS = {
  CONNECTION_STATE_CHANGED: 'connectionStateChanged',
  DEVICE_DATA_RECEIVED: 'deviceDataReceived',
  SYNC_PROGRESS_UPDATED: 'syncProgressUpdated',
  ERROR_OCCURRED: 'errorOccurred',
  BACKGROUND_MODE_CHANGED: 'backgroundModeChanged'
};

class GlobalBleManager {
  constructor() {
    if (GlobalBleManager.instance) {
      return GlobalBleManager.instance;
    }

    // 单例模式
    GlobalBleManager.instance = this;
    
    // 核心状态
    this.state = GLOBAL_BLE_STATE.DISCONNECTED;
    this.boundDevice = null;
    this.isBackgroundMode = false;
    
    // BLE连接客户端
    this.bleClient = new BleHandshakeClient();
    this.deviceId = '';
    this.deviceName = '';
    this.connected = false;
    
    // 事件总线
    this.eventHandlers = new Map();
    
    // 同步管理
    this.pendingSyncs = new Map();       // 待同步的数据
    this.syncQueue = [];                 // 同步队列
    this.isSyncing = false;             // 同步状态
    this.lastSyncTime = 0;              // 最后同步时间
    
    // 连接管理
    this.connectionAttempts = 0;         // 连接尝试次数
    this.maxConnectionAttempts = 5;      // 最大连接尝试次数
    this.reconnectTimer = null;          // 重连定时器
    this.lastConnectionTime = 0;         // 最后连接时间
    
    // 心跳管理 - 优化为15秒间隔
    this.heartbeatTimer = null;
    this.heartbeatInterval = 15000;      // 15秒心跳间隔
    this.lastHeartbeatTime = 0;
    this.missedHeartbeats = 0;
    this.maxMissedHeartbeats = 3;        // 最大允许丢失心跳数
    
    // 数据缓存
    this.pendingTouchEvents = [];        // 待处理的碰一碰事件
    this.pendingTagUpdates = [];         // 待处理的标签更新
    
    // 智能提醒管理
    this.reminderTimer = null;           // 提醒定时器
    this.lastReminderTime = 0;           // 最后提醒时间
    this.reminderInterval = 300000;      // 提醒间隔：5分钟
    this.reminderEnabled = true;         // 是否启用提醒
    this.offlineMode = false;            // 离线模式
    
    this.init();
    console.log('🚀 全局BLE连接管理器初始化完成');
  }

  /**
   * 初始化管理器
   */
  init() {
    // 监听小程序生命周期
    this.setupAppLifecycleListeners();
    
    // 设置BLE客户端事件监听
    this.setupBleClientListeners();
    
    // 启动智能提醒系统
    this.startSmartReminders();
    
    // 恢复之前的连接状态
    this.restoreConnectionState();
  }

  /**
   * 设置小程序生命周期监听
   */
  setupAppLifecycleListeners() {
    // 监听小程序切换到前台
    wx.onAppShow(() => {
      console.log('📱 小程序切换到前台');
      this.onAppShow();
    });

    // 监听小程序切换到后台
    wx.onAppHide(() => {
      console.log('📱 小程序切换到后台');
      this.onAppHide();
    });
  }

  /**
   * 设置BLE客户端事件监听
   */
  setupBleClientListeners() {
    // 这里需要扩展BleHandshakeClient来支持事件回调
    // 暂时使用轮询方式检查连接状态
    this.startConnectionMonitor();
  }

  /**
   * 启动连接状态监控
   */
  startConnectionMonitor() {
    setInterval(() => {
      this.checkConnectionHealth();
    }, 5000); // 每5秒检查一次连接健康状态
  }

  /**
   * 检查连接健康状态
   */
  checkConnectionHealth() {
    if (!this.boundDevice || !this.deviceId) {
      return;
    }

    // 检查心跳状态
    const now = Date.now();
    if (this.connected && now - this.lastHeartbeatTime > this.heartbeatInterval * 2) {
      console.warn('⚠️ 心跳超时，可能连接异常');
      this.missedHeartbeats++;
      
      if (this.missedHeartbeats >= this.maxMissedHeartbeats) {
        console.error('❌ 连接心跳丢失，启动重连');
        this.handleConnectionLost();
      }
    }
  }

  /**
   * 处理连接丢失
   */
  handleConnectionLost() {
    this.connected = false;
    this.setState(GLOBAL_BLE_STATE.RECONNECTING);
    this.startReconnection();
  }

  /**
   * 启动重连机制
   */
  startReconnection() {
    // 清除现有重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      console.error(`❌ 已达到最大重连次数(${this.maxConnectionAttempts})，停止重连`);
      this.setState(GLOBAL_BLE_STATE.ERROR);
      
      // 更新全局状态
      globalState.setState('ble.connectionAttempts', this.connectionAttempts);
      globalState.addSyncError('达到最大重连次数，连接失败');
      
      // 触发错误事件
      this.emit(GLOBAL_BLE_EVENTS.ERROR_OCCURRED, {
        type: 'max_reconnection_attempts',
        attempts: this.connectionAttempts,
        device: this.boundDevice
      });
      
      return;
    }

    this.connectionAttempts++;
    
    // 智能退避策略：根据失败原因和网络状况调整延迟
    let baseDelay = 1000 * Math.pow(1.5, this.connectionAttempts - 1); // 较温和的指数退避
    
    // 后台模式下延迟更长
    if (this.isBackgroundMode) {
      baseDelay *= 2;
    }
    
    // 网络状况调整
    const networkType = globalState.getState('app.networkStatus');
    if (networkType === 'none' || networkType === '2g') {
      baseDelay *= 3; // 网络差时延迟更久
    } else if (networkType === '3g' || networkType === '4g') {
      baseDelay *= 1.5;
    }
    
    const delay = Math.min(baseDelay, 45000); // 最大45秒
    
    console.log(`🔄 准备第${this.connectionAttempts}/${this.maxConnectionAttempts}次重连，${Math.round(delay/1000)}秒后开始 (网络: ${networkType})`);
    
    // 更新全局状态
    globalState.setState('ble.connectionAttempts', this.connectionAttempts);
    
    this.reconnectTimer = setTimeout(() => {
      if (this.boundDevice) {
        console.log(`🔄 执行第${this.connectionAttempts}次重连`);
        this.connectToDevice(this.boundDevice);
      } else {
        console.warn('⚠️ 重连时发现无绑定设备，停止重连');
        this.setState(GLOBAL_BLE_STATE.ERROR);
      }
    }, delay);
  }

  /**
   * 连接到指定设备
   */
  async connectToDevice(device) {
    if (!device || this.state === GLOBAL_BLE_STATE.CONNECTING) {
      return false;
    }

    this.boundDevice = device;
    this.deviceId = device.deviceId;
    this.deviceName = device.deviceName || device.name;
    
    // 同步设备信息到全局状态
    globalState.batchSetState({
      'ble.deviceId': this.deviceId,
      'ble.deviceName': this.deviceName,
      'ble.boundDevice': device,
      'ble.connectionAttempts': this.connectionAttempts
    });
    
    this.setState(GLOBAL_BLE_STATE.CONNECTING);
    
    try {
      // 使用现有的BLE客户端进行连接
      console.log(`🔗 开始连接设备: ${this.deviceName} (${this.deviceId})`);
      
      // 这里需要调用现有的连接逻辑
      // 暂时返回模拟结果，后续集成真实连接逻辑
      const connected = await this.performDeviceConnection(device);
      
      if (connected) {
        this.connected = true;
        this.connectionAttempts = 0; // 重置连接尝试次数
        this.lastConnectionTime = Date.now();
        
        // 更新全局状态
        globalState.batchSetState({
          'ble.connectionAttempts': 0,
          'ble.lastHeartbeat': Date.now()
        });
        
        this.setState(GLOBAL_BLE_STATE.CONNECTED);
        
        // 启动心跳
        this.startHeartbeat();
        
        // 处理待同步的数据
        this.processPendingSyncs();
        
        console.log('✅ 设备连接成功');
        return true;
      } else {
        console.error('❌ 设备连接失败');
        this.startReconnection();
        return false;
      }
      
    } catch (error) {
      console.error('❌ 连接设备时发生错误:', error);
      this.setState(GLOBAL_BLE_STATE.ERROR);
      this.startReconnection();
      return false;
    }
  }

  /**
   * 执行设备连接（集成现有连接逻辑的占位符）
   */
  async performDeviceConnection(device) {
    // TODO: 这里需要集成现有的device.js中的连接逻辑
    // 暂时返回模拟结果
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(Math.random() > 0.3); // 70%成功率的模拟
      }, 2000);
    });
  }

  /**
   * 启动心跳机制
   */
  startHeartbeat() {
    this.stopHeartbeat(); // 先停止现有心跳
    
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatInterval);
    
    console.log(`💓 心跳机制启动，间隔${this.heartbeatInterval}ms`);
  }

  /**
   * 停止心跳机制
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 发送心跳
   */
  async sendHeartbeat() {
    if (!this.connected) {
      return;
    }

    try {
      const heartbeatData = {
        type: SYNC_TYPE.HEARTBEAT,
        timestamp: Date.now(),
        seq: this.generateSeqId()
      };

      const success = await this.sendDataToDevice(heartbeatData);
      if (success) {
        this.lastHeartbeatTime = Date.now();
        this.missedHeartbeats = 0;
        
        // 更新全局状态
        globalState.updateBleHeartbeat();
        
        console.log('💓 心跳发送成功');
      } else {
        this.missedHeartbeats++;
        console.warn('⚠️ 心跳发送失败');
      }
      
    } catch (error) {
      this.missedHeartbeats++;
      console.error('❌ 心跳发送异常:', error);
    }
  }

  /**
   * 向设备发送数据
   */
  async sendDataToDevice(data) {
    if (!this.connected || !this.deviceId) {
      console.warn('⚠️ 设备未连接，无法发送数据');
      return false;
    }

    try {
      // TODO: 集成现有的BLE数据发送逻辑
      console.log('📤 向设备发送数据:', data);
      
      // 模拟发送过程
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(Math.random() > 0.1); // 90%成功率
        }, 100);
      });
      
    } catch (error) {
      console.error('❌ 发送数据失败:', error);
      return false;
    }
  }

  /**
   * 处理从设备接收到的数据
   */
  handleDeviceData(data) {
    console.log('📥 收到设备数据:', data);

    try {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      switch (parsedData.type) {
        case SYNC_TYPE.TOUCH_EVENT:
          this.handleTouchEvent(parsedData);
          break;
          
        case SYNC_TYPE.HEARTBEAT:
          this.handleHeartbeatResponse(parsedData);
          break;
          
        default:
          console.log('📦 处理未知数据类型:', parsedData.type);
          break;
      }
      
      // 发送ACK确认
      this.sendAck(parsedData.seq);
      
      // 触发全局事件
      this.emit(GLOBAL_BLE_EVENTS.DEVICE_DATA_RECEIVED, parsedData);
      
    } catch (error) {
      console.error('❌ 处理设备数据失败:', error);
    }
  }

  /**
   * 处理碰一碰事件
   */
  handleTouchEvent(data) {
    console.log('👆 处理碰一碰事件:', data);
    
    // 添加到待处理队列
    this.pendingTouchEvents.push({
      ...data,
      receivedTime: Date.now(),
      processed: false
    });
    
    // 更新全局状态
    globalState.addTouchEvent(data);
    globalState.setState('sync.pendingTouchEventsCount', this.pendingTouchEvents.filter(e => !e.processed).length);
    
    // 立即处理（异步）
    this.processTouchEvents();
  }

  /**
   * 处理心跳响应
   */
  handleHeartbeatResponse(data) {
    this.lastHeartbeatTime = Date.now();
    this.missedHeartbeats = 0;
    console.log('💓 收到心跳响应');
  }

  /**
   * 发送ACK确认
   */
  async sendAck(seqId) {
    const ackData = {
      type: SYNC_TYPE.ACK,
      seq: seqId,
      timestamp: Date.now()
    };
    
    await this.sendDataToDevice(ackData);
    console.log(`✅ 发送ACK确认: seq=${seqId}`);
  }

  /**
   * 处理碰一碰事件队列
   */
  async processTouchEvents() {
    const unprocessedEvents = this.pendingTouchEvents.filter(event => !event.processed);
    
    for (const event of unprocessedEvents) {
      try {
        // 保存到本地存储
        await this.saveTouchEventLocally(event);
        
        // 尝试上传到云端
        await this.uploadTouchEventToCloud(event);
        
        // 标记为已处理
        event.processed = true;
        
        console.log('✅ 碰一碰事件处理完成:', event);
        
      } catch (error) {
        console.error('❌ 处理碰一碰事件失败:', error);
      }
    }
    
    // 清理已处理的事件（保留最近100条）
    this.pendingTouchEvents = this.pendingTouchEvents
      .filter(event => !event.processed || this.pendingTouchEvents.length <= 100);
  }

  /**
   * 本地保存碰一碰事件
   */
  async saveTouchEventLocally(event) {
    try {
      const localTouchEvents = wx.getStorageSync('localTouchEvents') || [];
      localTouchEvents.unshift({
        ...event,
        savedTime: Date.now()
      });
      
      // 只保留最近200条记录
      const trimmedEvents = localTouchEvents.slice(0, 200);
      wx.setStorageSync('localTouchEvents', trimmedEvents);
      
      console.log('💾 碰一碰事件已保存到本地');
      
    } catch (error) {
      console.error('❌ 本地保存失败:', error);
      throw error;
    }
  }

  /**
   * 上传碰一碰事件到云端
   */
  async uploadTouchEventToCloud(event) {
    try {
      // TODO: 集成现有的云函数调用逻辑
      console.log('☁️ 上传碰一碰事件到云端:', event);
      
      // 模拟云端上传
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 500);
      });
      
    } catch (error) {
      console.error('❌ 云端上传失败:', error);
      throw error;
    }
  }

  /**
   * 同步标签更新到设备
   */
  async syncTagUpdateToDevice(tagData) {
    if (!this.connected) {
      console.warn('⚠️ 设备未连接，标签更新加入待同步队列');
      this.pendingTagUpdates.push(tagData);
      return false;
    }

    try {
      const syncData = {
        type: SYNC_TYPE.TAG_UPDATE,
        data: tagData,
        timestamp: Date.now(),
        seq: this.generateSeqId()
      };

      this.setState(GLOBAL_BLE_STATE.SYNCING);
      const success = await this.sendDataToDevice(syncData);
      
      if (success) {
        console.log('✅ 标签更新同步成功');
        this.setState(GLOBAL_BLE_STATE.CONNECTED);
        return true;
      } else {
        console.error('❌ 标签更新同步失败');
        this.pendingTagUpdates.push(tagData);
        this.setState(GLOBAL_BLE_STATE.CONNECTED);
        return false;
      }
      
    } catch (error) {
      console.error('❌ 标签更新同步异常:', error);
      this.pendingTagUpdates.push(tagData);
      this.setState(GLOBAL_BLE_STATE.CONNECTED);
      return false;
    }
  }

  /**
   * 同步蓝牙名称到设备
   */
  async syncBluetoothNameToDevice(newName) {
    if (!this.connected) {
      console.warn('⚠️ 设备未连接，蓝牙名称更新加入待同步队列');
      this.addToSyncQueue(SYNC_TYPE.BLUETOOTH_NAME, { name: newName });
      return false;
    }

    try {
      const syncData = {
        type: SYNC_TYPE.BLUETOOTH_NAME,
        name: newName,
        timestamp: Date.now(),
        seq: this.generateSeqId()
      };

      this.setState(GLOBAL_BLE_STATE.SYNCING);
      const success = await this.sendDataToDevice(syncData);
      
      if (success) {
        console.log('✅ 蓝牙名称同步成功:', newName);
        this.deviceName = newName; // 更新本地名称
        this.setState(GLOBAL_BLE_STATE.CONNECTED);
        return true;
      } else {
        console.error('❌ 蓝牙名称同步失败');
        this.addToSyncQueue(SYNC_TYPE.BLUETOOTH_NAME, { name: newName });
        this.setState(GLOBAL_BLE_STATE.CONNECTED);
        return false;
      }
      
    } catch (error) {
      console.error('❌ 蓝牙名称同步异常:', error);
      this.addToSyncQueue(SYNC_TYPE.BLUETOOTH_NAME, { name: newName });
      this.setState(GLOBAL_BLE_STATE.CONNECTED);
      return false;
    }
  }

  /**
   * 添加到同步队列
   */
  addToSyncQueue(type, data) {
    this.syncQueue.push({
      type,
      data,
      timestamp: Date.now(),
      attempts: 0
    });
    console.log(`📋 添加到同步队列: ${type}`);
  }

  /**
   * 处理待同步数据
   */
  async processPendingSyncs() {
    if (this.isSyncing || !this.connected) {
      return;
    }

    this.isSyncing = true;
    
    // 更新全局同步状态
    globalState.setSyncing(true, 0);

    try {
      const totalItems = this.pendingTagUpdates.length + this.syncQueue.length;
      let processedItems = 0;
      
      // 处理待同步的标签更新
      for (const tagUpdate of this.pendingTagUpdates) {
        try {
          const success = await this.syncTagUpdateToDevice(tagUpdate);
          if (!success) {
            // 同步失败，重新加入队列但增加尝试次数
            tagUpdate.attempts = (tagUpdate.attempts || 0) + 1;
            if (tagUpdate.attempts < 3) {
              this.pendingTagUpdates.push(tagUpdate);
            } else {
              console.error('❌ 标签更新同步失败次数过多，放弃同步:', tagUpdate);
              globalState.addSyncError({ message: `标签更新同步失败: ${tagUpdate.displayName || 'Unknown'}`, tagUpdate });
            }
          }
        } catch (error) {
          console.error('❌ 标签更新同步异常:', error);
          globalState.addSyncError({ message: `标签更新同步异常: ${error.message}`, error, tagUpdate });
        }
        
        processedItems++;
        globalState.updateSyncProgress(Math.round((processedItems / totalItems) * 100));
      }
      
      // 清除已处理的标签更新
      this.pendingTagUpdates = this.pendingTagUpdates.filter(item => (item.attempts || 0) >= 3);

      // 处理同步队列
      const pendingSyncs = [...this.syncQueue];
      this.syncQueue = [];

      for (const syncItem of pendingSyncs) {
        try {
          let success = false;
          
          switch (syncItem.type) {
            case SYNC_TYPE.BLUETOOTH_NAME:
              success = await this.syncBluetoothNameToDevice(syncItem.data.name);
              break;
            case SYNC_TYPE.TAG_UPDATE:
              success = await this.syncTagUpdateToDevice(syncItem.data);
              break;
            default:
              console.warn('⚠️ 未知同步类型:', syncItem.type);
              globalState.addSyncError({ message: `未知同步类型: ${syncItem.type}`, syncItem });
              break;
          }
          
          if (!success) {
            // 同步失败，重新加入队列但增加尝试次数
            syncItem.attempts = (syncItem.attempts || 0) + 1;
            if (syncItem.attempts < 3) {
              this.syncQueue.push(syncItem);
            } else {
              console.error('❌ 同步项失败次数过多，放弃同步:', syncItem);
              globalState.addSyncError({ message: `同步失败次数过多: ${syncItem.type}`, syncItem });
            }
          }
          
        } catch (error) {
          console.error('❌ 同步项处理异常:', error);
          globalState.addSyncError({ message: `同步异常: ${error.message}`, error, syncItem });
        }
        
        processedItems++;
        globalState.updateSyncProgress(Math.round((processedItems / totalItems) * 100));
      }

      this.lastSyncTime = Date.now();
      globalState.setState('sync.lastSyncTime', this.lastSyncTime);
      
      // 更新待同步计数
      const remainingCount = this.pendingTagUpdates.length + this.syncQueue.length;
      globalState.setState('sync.pendingSyncsCount', remainingCount);
      
      if (remainingCount === 0) {
        console.log('✅ 所有待同步数据处理完成');
      } else {
        console.log(`📋 还有${remainingCount}个待同步项目`);
      }

    } catch (error) {
      console.error('❌ 处理待同步数据失败:', error);
      globalState.addSyncError({ message: `同步处理失败: ${error.message}`, error });
    } finally {
      this.isSyncing = false;
      globalState.setSyncing(false, 100);
    }
  }

  /**
   * 小程序切换到前台
   */
  onAppShow() {
    this.isBackgroundMode = false;
    
    console.log('☀️ 小程序回到前台');
    
    // 检查连接状态
    if (this.boundDevice && !this.connected) {
      console.log('🔄 前台模式，尝试重新连接设备');
      this.connectToDevice(this.boundDevice);
    } else if (this.connected) {
      // 如果连接仍然存在，发送一次立即心跳验证连接状态
      console.log('💓 验证后台连接状态');
      this.sendHeartbeat();
    }
    
    // 恢复正常心跳间隔
    if (this.connected) {
      this.heartbeatInterval = 15000; // 恢复15秒间隔
      this.startHeartbeat();
      console.log('☀️ 前台模式，心跳间隔恢复为15秒');
    }
    
    // 更新全局状态
    globalState.setBackgroundMode(false);
    
    // 处理后台期间可能积累的待同步数据
    if (this.connected) {
      setTimeout(() => {
        this.processPendingSyncs();
      }, 1000); // 给连接验证一些时间
    }
    
    this.emit(GLOBAL_BLE_EVENTS.BACKGROUND_MODE_CHANGED, false);
  }

  /**
   * 小程序切换到后台
   */
  onAppHide() {
    this.isBackgroundMode = true;
    
    // 后台模式：适度延长心跳间隔以节省电量，但仍保持连接活跃
    if (this.connected) {
      this.heartbeatInterval = 30000; // 30秒间隔（比前台稍慢，但仍保持活跃）
      this.startHeartbeat();
      this.setState(GLOBAL_BLE_STATE.BACKGROUND);
      
      console.log('🌙 进入后台模式，心跳间隔调整为30秒');
    }
    
    // 更新全局状态
    globalState.setBackgroundMode(true);
    
    this.emit(GLOBAL_BLE_EVENTS.BACKGROUND_MODE_CHANGED, true);
  }

  /**
   * 恢复连接状态
   */
  restoreConnectionState() {
    try {
      const savedDevice = wx.getStorageSync('myBoundDevice');
      if (savedDevice) {
        this.boundDevice = savedDevice;
        console.log('📱 恢复绑定设备:', savedDevice.deviceName);
        
        // 自动尝试连接
        setTimeout(() => {
          this.connectToDevice(savedDevice);
        }, 1000);
      }
    } catch (error) {
      console.error('❌ 恢复连接状态失败:', error);
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.connected = false;
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.setState(GLOBAL_BLE_STATE.DISCONNECTED);
    console.log('🔌 设备连接已断开');
  }

  /**
   * 设置连接状态
   */
  setState(newState) {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      
      // 同步到全局状态管理器
      globalState.setState('ble.connectionState', newState);
      globalState.setState('ble.connected', newState === GLOBAL_BLE_STATE.CONNECTED);
      globalState.setState('ble.connecting', newState === GLOBAL_BLE_STATE.CONNECTING || newState === GLOBAL_BLE_STATE.RECONNECTING);
      
      console.log(`🔄 连接状态变化: ${oldState} → ${newState}`);
      this.emit(GLOBAL_BLE_EVENTS.CONNECTION_STATE_CHANGED, { oldState, newState });
    }
  }

  /**
   * 生成序列号
   */
  generateSeqId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  }

  // ========== 事件总线机制 ==========

  /**
   * 注册事件监听器
   */
  on(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType).push(handler);
  }

  /**
   * 移除事件监听器
   */
  off(eventType, handler) {
    if (this.eventHandlers.has(eventType)) {
      const handlers = this.eventHandlers.get(eventType);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   */
  emit(eventType, data) {
    if (this.eventHandlers.has(eventType)) {
      const handlers = this.eventHandlers.get(eventType);
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`❌ 事件处理器执行失败 [${eventType}]:`, error);
        }
      });
    }
  }

  // ========== 智能提醒和离线模式 ==========

  /**
   * 启动智能提醒系统
   */
  startSmartReminders() {
    if (!this.reminderEnabled || this.reminderTimer) {
      return;
    }

    this.reminderTimer = setInterval(() => {
      this.checkAndSendReminders();
    }, 30000); // 每30秒检查一次

    console.log('🔔 智能提醒系统已启动');
  }

  /**
   * 停止智能提醒系统
   */
  stopSmartReminders() {
    if (this.reminderTimer) {
      clearInterval(this.reminderTimer);
      this.reminderTimer = null;
    }
    console.log('🔔 智能提醒系统已停止');
  }

  /**
   * 检查并发送智能提醒
   */
  checkAndSendReminders() {
    if (!this.reminderEnabled || this.isBackgroundMode) {
      return;
    }

    const now = Date.now();
    
    // 检查是否需要提醒
    if (now - this.lastReminderTime < this.reminderInterval) {
      return;
    }

    // 设备长时间未连接提醒
    if (this.boundDevice && !this.connected) {
      const disconnectTime = now - (this.lastConnectionTime || 0);
      if (disconnectTime > 600000) { // 10分钟未连接
        this.sendConnectionReminder();
        return;
      }
    }

    // 同步失败提醒
    if (this.syncQueue.length > 0 || this.pendingTagUpdates.length > 0) {
      const pendingCount = this.syncQueue.length + this.pendingTagUpdates.length;
      if (pendingCount >= 3) { // 3个或以上待同步项目
        this.sendSyncReminder(pendingCount);
        return;
      }
    }

    // 网络状况提醒
    const networkType = globalState.getState('app.networkStatus');
    if (networkType === 'none' && this.connected) {
      this.sendNetworkReminder();
      return;
    }
  }

  /**
   * 发送连接提醒
   */
  sendConnectionReminder() {
    const deviceName = this.deviceName || '智能设备';
    
    wx.showToast({
      title: `设备"${deviceName}"长时间未连接`,
      icon: 'none',
      duration: 3000
    });

    // 触发提醒事件
    this.emit(GLOBAL_BLE_EVENTS.ERROR_OCCURRED, {
      type: 'connection_reminder',
      message: `设备"${deviceName}"长时间未连接，建议检查设备状态`,
      deviceName: deviceName
    });

    this.lastReminderTime = Date.now();
    console.log('🔔 发送连接提醒:', deviceName);
  }

  /**
   * 发送同步提醒
   */
  sendSyncReminder(pendingCount) {
    wx.showToast({
      title: `有${pendingCount}项数据待同步`,
      icon: 'none',
      duration: 3000
    });

    // 触发提醒事件
    this.emit(GLOBAL_BLE_EVENTS.SYNC_PROGRESS_UPDATED, {
      type: 'sync_reminder',
      message: `有${pendingCount}项数据待同步，建议检查网络连接`,
      pendingCount: pendingCount
    });

    this.lastReminderTime = Date.now();
    console.log('🔔 发送同步提醒:', pendingCount);
  }

  /**
   * 发送网络提醒
   */
  sendNetworkReminder() {
    wx.showToast({
      title: '网络连接中断，请检查网络',
      icon: 'none',
      duration: 3000
    });

    // 触发提醒事件
    this.emit(GLOBAL_BLE_EVENTS.ERROR_OCCURRED, {
      type: 'network_reminder',
      message: '网络连接中断，部分功能可能受影响',
    });

    this.lastReminderTime = Date.now();
    console.log('🔔 发送网络提醒');
  }

  /**
   * 切换到离线模式
   */
  enableOfflineMode() {
    this.offlineMode = true;
    globalState.setState('app.offlineMode', true);
    
    // 在离线模式下，延长心跳间隔以节省电量
    if (this.connected) {
      this.heartbeatInterval = 60000; // 1分钟间隔
      this.startHeartbeat();
    }
    
    // 暂停智能提醒
    this.reminderEnabled = false;
    
    console.log('📶 已切换到离线模式');
    
    wx.showToast({
      title: '离线模式已开启',
      icon: 'success',
      duration: 2000
    });
  }

  /**
   * 退出离线模式
   */
  disableOfflineMode() {
    this.offlineMode = false;
    globalState.setState('app.offlineMode', false);
    
    // 恢复正常心跳间隔
    if (this.connected) {
      this.heartbeatInterval = this.isBackgroundMode ? 30000 : 15000;
      this.startHeartbeat();
    }
    
    // 恢复智能提醒
    this.reminderEnabled = true;
    
    console.log('📶 已退出离线模式');
    
    wx.showToast({
      title: '离线模式已关闭',
      icon: 'success',
      duration: 2000
    });
    
    // 尝试处理待同步数据
    if (this.connected) {
      setTimeout(() => {
        this.processPendingSyncs();
      }, 2000);
    }
  }

  /**
   * 设置提醒间隔
   */
  setReminderInterval(intervalMs) {
    this.reminderInterval = Math.max(intervalMs, 60000); // 最小1分钟间隔
    console.log('🔔 提醒间隔已设置为:', this.reminderInterval);
  }

  /**
   * 启用/禁用提醒
   */
  setReminderEnabled(enabled) {
    this.reminderEnabled = enabled;
    
    if (enabled) {
      this.startSmartReminders();
    } else {
      this.stopSmartReminders();
    }
    
    console.log('🔔 智能提醒已', enabled ? '启用' : '禁用');
  }

  // ========== 公共接口 ==========

  /**
   * 获取当前连接状态
   */
  getState() {
    return {
      state: this.state,
      connected: this.connected,
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      boundDevice: this.boundDevice,
      isBackgroundMode: this.isBackgroundMode,
      lastHeartbeatTime: this.lastHeartbeatTime,
      connectionAttempts: this.connectionAttempts,
      offlineMode: this.offlineMode,
      reminderEnabled: this.reminderEnabled
    };
  }

  /**
   * 获取同步状态
   */
  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      pendingSyncsCount: this.syncQueue.length + this.pendingTagUpdates.length,
      lastSyncTime: this.lastSyncTime,
      pendingTouchEventsCount: this.pendingTouchEvents.filter(e => !e.processed).length
    };
  }
}

// 导出单例实例
const globalBleManager = new GlobalBleManager();

module.exports = {
  GlobalBleManager,
  globalBleManager,
  GLOBAL_BLE_STATE,
  GLOBAL_BLE_EVENTS,
  SYNC_TYPE
};