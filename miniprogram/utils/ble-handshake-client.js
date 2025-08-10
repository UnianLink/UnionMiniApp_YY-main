/**
 * BLE握手通信协议客户端实现 - 完整版
 * 负责完整的BLE连接流程：连接→服务发现→特征配置→通知订阅→业务就绪
 * 支持3次重连、自适应超时、指数退避重试
 */

// 导入协议配置常量
const BLE_CONFIG = {
  // 超时配置
  CRITICAL_TIMEOUT_MS: 3000,        // 关键操作超时：3秒
  DATA_TIMEOUT_MS: 5000,            // 数据传输超时：5秒  
  CONNECTION_TIMEOUT_MS: 5000,      // 单次连接超时：5秒
  CONNECTION_RETRIES: 3,            // 连接重试次数：3次
  MESSAGE_RETRIES: 3,               // 消息重试次数：3次
  
  // 指数退避配置
  RETRY_BASE_MS: 500,               // 基础重试间隔：500ms
  RETRY_MULTIPLIER: 2,              // 退避倍数：2倍
  MAX_RETRY_INTERVAL_MS: 4000,      // 最大重试间隔：4秒
  
  // 信号强度阈值
  SIGNAL_STRONG_THRESHOLD: -50,     // 强信号阈值
  SIGNAL_WEAK_THRESHOLD: -80,       // 弱信号阈值
  TIMEOUT_REDUCTION_FACTOR: 0.7,    // 强信号超时减少因子
  TIMEOUT_EXTENSION_FACTOR: 1.5     // 弱信号超时延长因子
};

// 协议状态枚举 - 扩展版本
const BLE_HANDSHAKE_STATE = {
  IDLE: 0,                          // 空闲状态
  CONNECTING: 1,                    // 连接尝试中
  RETRYING: 2,                      // 重试连接中
  CONNECTED: 3,                     // 物理连接成功
  SERVICE_DISCOVERY: 4,             // 服务发现阶段
  CHARACTERISTIC_DISCOVERY: 5,      // 特征发现阶段
  NOTIFICATION_SETUP: 6,            // 通知订阅设置
  DEVICE_READY: 7,                  // 设备完全就绪
  NAME_EXCHANGE: 8,                 // 蓝牙名称交换阶段
  TOUCHLIST_TRANSFER: 9,            // 碰一碰列表传输阶段
  COMPLETED: 10,                    // 协议完成
  FAILED: 11                        // 协议失败
};

class BleHandshakeClient {
  constructor() {
    this.reset();
    console.log('🚀 BLE握手协议客户端初始化完成');
  }
  
  /**
   * 重置协议状态
   */
  reset() {
    this.state = BLE_HANDSHAKE_STATE.IDLE;
    this.retryCount = 0;
    this.stateStartTime = Date.now();
    this.messageSeqId = 0;
    this.waitingForResponse = false;
    this.waitingSeqId = 0;
    this.pendingResponses = new Map();
    this.deviceId = '';
    this.deviceName = '';
    this.currentRSSI = -100;
    
    // BLE连接管理属性
    this.services = [];
    this.rxServiceId = '';
    this.rxCharId = '';
    this.txServiceId = '';
    this.txCharId = '';
    this.deviceReady = false;
    this.negotiatedMTU = 23;
    this.maxPacketSize = 20;
    
    // BLE数据分包重组缓冲区
    this.receiveBuffer = '';
    this.lastReceiveTime = 0;
    this.receiveTimeout = null;
    
    // 清理定时器
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
      this.messageTimeout = null;
    }
    if (this.receiveTimeout) {
      clearTimeout(this.receiveTimeout);
      this.receiveTimeout = null;
    }
  }
  
  /**
   * 设置协议状态
   */
  setState(newState) {
    if (this.state !== newState) {
      const stateNames = [
        '空闲', '连接中', '重试中', '已连接', '服务发现', '特征发现', 
        '通知设置', '设备就绪', '名称交换', '列表传输', '完成', '失败'
      ];
      console.log(`🔄 协议状态转换: ${stateNames[this.state]} -> ${stateNames[newState]}`);
      
      this.state = newState;
      this.stateStartTime = Date.now();
      
      // 状态转换时重置重试计数（除非是重试状态）
      if (newState !== BLE_HANDSHAKE_STATE.RETRYING) {
        this.retryCount = 0;
      }
    }
  }
  
  /**
   * 计算指数退避重试间隔
   */
  calculateRetryInterval(retryCount) {
    if (retryCount === 0) return 0;
    
    let interval = BLE_CONFIG.RETRY_BASE_MS;
    for (let i = 1; i < retryCount && i < 4; i++) {
      interval *= BLE_CONFIG.RETRY_MULTIPLIER;
    }
    
    return Math.min(interval, BLE_CONFIG.MAX_RETRY_INTERVAL_MS);
  }
  
  /**
   * 获取自适应超时时间
   */
  getAdaptiveTimeout(isCriticalOperation = false) {
    const baseTimeout = isCriticalOperation ? 
      BLE_CONFIG.CRITICAL_TIMEOUT_MS : 
      BLE_CONFIG.DATA_TIMEOUT_MS;
    
    let adaptiveTimeout = baseTimeout;
    
    if (this.currentRSSI > BLE_CONFIG.SIGNAL_STRONG_THRESHOLD) {
      // 强信号：减少30%超时时间
      adaptiveTimeout = baseTimeout * BLE_CONFIG.TIMEOUT_REDUCTION_FACTOR;
      console.log(`📶 强信号(RSSI=${this.currentRSSI}) -> 超时优化至${adaptiveTimeout}ms`);
    } else if (this.currentRSSI < BLE_CONFIG.SIGNAL_WEAK_THRESHOLD) {
      // 弱信号：增加50%超时时间
      adaptiveTimeout = baseTimeout * BLE_CONFIG.TIMEOUT_EXTENSION_FACTOR;
      console.log(`📶 弱信号(RSSI=${this.currentRSSI}) -> 超时延长至${adaptiveTimeout}ms`);
    } else {
      console.log(`📶 中等信号(RSSI=${this.currentRSSI}) -> 默认超时${adaptiveTimeout}ms`);
    }
    
    return Math.round(adaptiveTimeout);
  }
  
  /**
   * 3次重连机制的核心实现
   */
  async connectWithRetry(deviceId, deviceName = '') {
    this.deviceId = deviceId;
    this.deviceName = deviceName;
    
    console.log('🤝 开始BLE握手连接流程，支持3次重试');
    this.setState(BLE_HANDSHAKE_STATE.CONNECTING);
    
    for (let attempt = 1; attempt <= BLE_CONFIG.CONNECTION_RETRIES; attempt++) {
      try {
        console.log(`🔗 连接尝试 ${attempt}/${BLE_CONFIG.CONNECTION_RETRIES}: ${deviceName || deviceId}`);
        
        // 更新UI显示重试状态
        if (typeof this.onStateChange === 'function') {
          this.onStateChange({
            state: 'connecting',
            message: `正在连接... (${attempt}/${BLE_CONFIG.CONNECTION_RETRIES})`,
            attempt: attempt,
            maxRetries: BLE_CONFIG.CONNECTION_RETRIES
          });
        }
        
        // 尝试连接
        await this.attemptConnection(deviceId);
        
        // 连接成功，开始完整BLE初始化流程
        console.log('✅ BLE物理连接成功，开始完整初始化');
        this.setState(BLE_HANDSHAKE_STATE.CONNECTED);
        
        // 继续完整的BLE初始化：服务发现 → 特征配置 → 通知订阅 → 设备就绪
        await this.performFullBLEInitialization();
        return true;
        
      } catch (error) {
        console.log(`❌ 连接失败 (${attempt}/${BLE_CONFIG.CONNECTION_RETRIES}):`, error.message);
        this.retryCount = attempt;
        
        if (attempt === BLE_CONFIG.CONNECTION_RETRIES) {
          // 所有重试都失败
          console.error('❌ 连接失败，已达最大重试次数');
          this.setState(BLE_HANDSHAKE_STATE.FAILED);
          
          if (typeof this.onStateChange === 'function') {
            this.onStateChange({
              state: 'failed',
              message: '连接失败，请重试',
              error: '达到最大重试次数'
            });
          }
          
          throw new Error('达到最大重试次数');
        }
        
        // 计算重试间隔
        const retryDelay = this.calculateRetryInterval(attempt);
        console.log(`⏳ ${retryDelay}ms后进行第${attempt + 1}次重试...`);
        
        this.setState(BLE_HANDSHAKE_STATE.RETRYING);
        
        if (typeof this.onStateChange === 'function') {
          this.onStateChange({
            state: 'retrying',
            message: `${Math.round(retryDelay/1000)}秒后重试...`,
            attempt: attempt,
            nextAttempt: attempt + 1,
            maxRetries: BLE_CONFIG.CONNECTION_RETRIES
          });
        }
        
        // 等待重试间隔
        await this.sleep(retryDelay);
      }
    }
  }
  
  /**
   * 单次连接尝试 - 改进处理"already connect"错误
   */
  attemptConnection(deviceId) {
    return new Promise((resolve, reject) => {
      // 设置连接超时
      const timeout = setTimeout(() => {
        reject(new Error(`连接超时(${BLE_CONFIG.CONNECTION_TIMEOUT_MS}ms)`));
      }, BLE_CONFIG.CONNECTION_TIMEOUT_MS);
      
      // 调用微信BLE连接API
      wx.createBLEConnection({
        deviceId: deviceId,
        timeout: BLE_CONFIG.CONNECTION_TIMEOUT_MS,
        success: (res) => {
          clearTimeout(timeout);
          
          // 尝试获取连接的RSSI
          wx.getBLEDeviceRSSI({
            deviceId: deviceId,
            success: (rssiRes) => {
              this.currentRSSI = rssiRes.RSSI;
              console.log(`📶 连接RSSI: ${this.currentRSSI}dBm`);
            },
            fail: () => {
              console.log('📶 无法获取RSSI，使用默认值');
            }
          });
          
          resolve(res);
        },
        fail: async (err) => {
          clearTimeout(timeout);
          
          // 检查是否是"already connect"错误
          const errMsg = err.errMsg || err.message || '';
          if (errMsg.includes('already connect')) {
            console.log('⚠️ 检测到已连接状态，尝试强制断开后重连...');
            
            try {
              // 尝试断开现有连接
              await new Promise((resolveDisconnect, rejectDisconnect) => {
                wx.closeBLEConnection({
                  deviceId: deviceId,
                  success: resolveDisconnect,
                  fail: resolveDisconnect  // 断开失败也继续，可能连接已经不存在
                });
              });
              
              // 等待一段时间确保断开完成
              await this.sleep(1000);
              console.log('🔄 强制断开完成，重新尝试连接...');
              
              // 重新尝试连接（递归调用，但只尝试一次避免无限循环）
              const retryResult = await new Promise((resolveRetry, rejectRetry) => {
                wx.createBLEConnection({
                  deviceId: deviceId,
                  timeout: BLE_CONFIG.CONNECTION_TIMEOUT_MS,
                  success: resolveRetry,
                  fail: rejectRetry
                });
              });
              
              console.log('✅ 强制断开后重连成功');
              resolve(retryResult);
              
            } catch (forceRetryErr) {
              console.error('❌ 强制断开后重连仍然失败:', forceRetryErr);
              reject(new Error(`强制断开重连失败: ${forceRetryErr.message || forceRetryErr.errMsg || '未知错误'}`));
            }
          } else {
            // 其他类型的连接错误
            reject(new Error(`BLE连接失败: ${errMsg}`));
          }
        }
      });
    });
  }
  
  /**
   * 发送消息并等待确认
   */
  async sendMessageWithAck(message, isCriticalOperation = false) {
    return new Promise((resolve, reject) => {
      // 生成序列号
      const seqId = ++this.messageSeqId;
      
      // 添加序列号到消息
      let messageObj;
      if (typeof message === 'string') {
        try {
          messageObj = JSON.parse(message);
        } catch (e) {
          reject(new Error('消息格式错误'));
          return;
        }
      } else {
        messageObj = { ...message };
      }
      
      messageObj.seq_id = seqId;
      messageObj.timestamp = Date.now();
      
      const messageStr = JSON.stringify(messageObj);
      
      // 获取自适应超时时间
      const timeoutMs = this.getAdaptiveTimeout(isCriticalOperation);
      
      // 设置超时
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(seqId);
        const opType = isCriticalOperation ? '关键操作' : '数据传输';
        reject(new Error(`${opType}超时(${timeoutMs}ms)，未收到硬件响应`));
      }, timeoutMs);
      
      // 添加到等待响应列表
      this.pendingResponses.set(seqId, {
        resolve: (data) => {
          clearTimeout(timeout);
          this.pendingResponses.delete(seqId);
          resolve(data);
        },
        reject: (error) => {
          clearTimeout(timeout);
          this.pendingResponses.delete(seqId);
          reject(error);
        }
      });
      
      // 发送消息
      this.sendMessage(messageStr).catch(reject);
      
      console.log(`📨 发送消息: seq_id=${seqId}, 超时=${timeoutMs}ms, 关键=${isCriticalOperation}`);
    });
  }
  
  /**
   * 处理收到的消息
   */
  handleReceivedMessage(message) {
    try {
      const messageObj = JSON.parse(message);
      
      // 检查是否有序列号
      if (messageObj.seq_id) {
        const seqId = messageObj.seq_id;
        const pending = this.pendingResponses.get(seqId);
        
        if (pending) {
          console.log(`📨 收到ACK: seq_id=${seqId}, type=${messageObj.type}`);
          
          if (messageObj.status === 'success' || messageObj.status === 'received') {
            pending.resolve(messageObj);
          } else {
            pending.reject(new Error(messageObj.message || '消息处理失败'));
          }
          return;
        }
      }
      
      // 处理其他类型的消息
      console.log('📨 收到消息:', messageObj.type);
      
      if (typeof this.onMessageReceived === 'function') {
        this.onMessageReceived(messageObj);
      }
      
    } catch (error) {
      console.error('❌ 消息解析失败:', error);
    }
  }
  
  /**
   * 发送消息（基础函数） - 将被device.js覆盖实现
   */
  sendMessage(message) {
    // 默认实现，实际使用时会被device.js中的writeToBle方法覆盖
    return Promise.reject(new Error('sendMessage方法需要被上层覆盖实现'));
  }
  
  /**
   * 完整BLE初始化流程：服务发现 → 特征配置 → 通知订阅 → 设备就绪
   */
  async performFullBLEInitialization() {
    try {
      // 1. 服务发现
      console.log('🔍 开始服务发现...');
      this.setState(BLE_HANDSHAKE_STATE.SERVICE_DISCOVERY);
      this.notifyStateChange('service_discovery', '正在发现服务...');
      await this.discoverServices();

      // 2. 特征发现
      console.log('🔍 开始特征发现...');
      this.setState(BLE_HANDSHAKE_STATE.CHARACTERISTIC_DISCOVERY);
      this.notifyStateChange('characteristic_discovery', '正在配置特征...');
      await this.discoverCharacteristics();

      // 3. 通知订阅
      console.log('🔔 开始通知订阅...');
      this.setState(BLE_HANDSHAKE_STATE.NOTIFICATION_SETUP);
      this.notifyStateChange('notification_setup', '正在设置通知...');
      await this.setupNotifications();

      // 4. 设备完全就绪
      console.log('✅ 设备完全就绪！');
      this.setState(BLE_HANDSHAKE_STATE.DEVICE_READY);
      this.deviceReady = true;
      
      // 通知上层应用设备就绪
      this.notifyDeviceReady({
        deviceId: this.deviceId,
        deviceName: this.deviceName,
        rxServiceId: this.rxServiceId,
        rxCharId: this.rxCharId,
        txServiceId: this.txServiceId,
        txCharId: this.txCharId,
        negotiatedMTU: this.negotiatedMTU,
        maxPacketSize: this.maxPacketSize
      });

    } catch (error) {
      console.error('❌ BLE初始化失败:', error);
      this.setState(BLE_HANDSHAKE_STATE.FAILED);
      throw error;
    }
  }

  /**
   * 服务发现
   */
  async discoverServices() {
    return new Promise((resolve, reject) => {
      wx.getBLEDeviceServices({
        deviceId: this.deviceId,
        success: (res) => {
          console.log('🔍 服务发现成功:', res.services.map(s => s.uuid));
          this.services = res.services;

          // 查找目标服务FFF0
          const targetService = res.services.find(s => {
            const uuid = s.uuid.toLowerCase();
            return uuid === 'fff0' || 
                   uuid === '0000fff0' || 
                   uuid.startsWith('0000fff0-') ||
                   uuid.includes('fff0');
          });

          if (targetService) {
            console.log('✅ 找到目标服务:', targetService.uuid);
            this.rxServiceId = targetService.uuid;
            this.txServiceId = targetService.uuid;
            resolve(targetService);
          } else {
            reject(new Error('未找到目标服务FFF0'));
          }
        },
        fail: (err) => {
          console.error('❌ 服务发现失败:', err);
          reject(new Error(`服务发现失败: ${err.errMsg}`));
        }
      });
    });
  }

  /**
   * 特征发现
   */
  async discoverCharacteristics() {
    return new Promise((resolve, reject) => {
      wx.getBLEDeviceCharacteristics({
        deviceId: this.deviceId,
        serviceId: this.rxServiceId,
        success: (res) => {
          console.log('🔍 特征发现成功:', res.characteristics.map(c => ({ uuid: c.uuid, properties: c.properties })));

          // 查找RX和TX特征
          const rxChar = res.characteristics.find(c => {
            const uuid = c.uuid.toLowerCase();
            return uuid === 'fff1' || 
                   uuid === '0000fff1' || 
                   uuid.startsWith('0000fff1-') ||
                   uuid.includes('fff1');
          });

          const txChar = res.characteristics.find(c => {
            const uuid = c.uuid.toLowerCase();
            return uuid === 'fff2' || 
                   uuid === '0000fff2' || 
                   uuid.startsWith('0000fff2-') ||
                   uuid.includes('fff2');
          });

          if (rxChar && txChar) {
            console.log('✅ 找到RX和TX特征');
            this.rxCharId = rxChar.uuid;
            this.txCharId = txChar.uuid;
            resolve({ rxChar, txChar });
          } else {
            reject(new Error('未找到RX或TX特征值'));
          }
        },
        fail: (err) => {
          console.error('❌ 特征发现失败:', err);
          reject(new Error(`特征发现失败: ${err.errMsg}`));
        }
      });
    });
  }

  /**
   * 通知订阅设置
   */
  async setupNotifications() {
    return new Promise((resolve, reject) => {
      // 启用TX特征的通知
      wx.notifyBLECharacteristicValueChange({
        deviceId: this.deviceId,
        serviceId: this.txServiceId,
        characteristicId: this.txCharId,
        state: true,
        success: () => {
          console.log('✅ 通知订阅成功');
          
          // 设置数据接收监听
          wx.onBLECharacteristicValueChange((res) => {
            if (res.deviceId === this.deviceId && res.characteristicId === this.txCharId) {
              this.handleBLEDataReceived(res.value);
            }
          });
          
          resolve();
        },
        fail: (err) => {
          console.error('❌ 通知订阅失败:', err);
          reject(new Error(`通知订阅失败: ${err.errMsg}`));
        }
      });
    });
  }

  /**
   * 处理接收到的BLE数据 - 支持分包重组
   */
  handleBLEDataReceived(buffer) {
    try {
      // 将ArrayBuffer转换为字符串
      const data = String.fromCharCode.apply(null, new Uint8Array(buffer));
      console.log('📨 收到BLE分片:', data);
      
      // 累积数据到接收缓冲区
      this.receiveBuffer += data;
      this.lastReceiveTime = Date.now();
      
      // 清理之前的超时定时器
      if (this.receiveTimeout) {
        clearTimeout(this.receiveTimeout);
        this.receiveTimeout = null;
      }
      
      // 尝试解析完整的JSON消息
      if (this.isCompleteJSONMessage(this.receiveBuffer)) {
        console.log('✅ 收到完整JSON消息:', this.receiveBuffer);
        
        try {
          const message = JSON.parse(this.receiveBuffer);
          this.handleReceivedMessage(JSON.stringify(message));
          
          // 清空缓冲区
          this.receiveBuffer = '';
        } catch (parseError) {
          console.error('❌ JSON解析失败:', parseError);
          this.receiveBuffer = ''; // 清空无效数据
        }
      } else {
        console.log('⏳ JSON不完整，等待更多数据...当前缓冲区:', this.receiveBuffer);
        
        // 设置超时，避免缓冲区无限积累
        this.receiveTimeout = setTimeout(() => {
          console.warn('⏰ BLE数据接收超时，清空缓冲区');
          this.receiveBuffer = '';
          this.receiveTimeout = null;
        }, 2000); // 2秒超时
      }
    } catch (error) {
      console.error('❌ BLE数据处理失败:', error);
      this.receiveBuffer = ''; // 清空缓冲区
    }
  }
  
  /**
   * 检查是否为完整的JSON消息
   */
  isCompleteJSONMessage(data) {
    if (!data || data.length === 0) return false;
    
    // 简单的JSON完整性检查
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escaped = false;
    
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      
      if (escaped) {
        escaped = false;
        continue;
      }
      
      if (char === '\\') {
        escaped = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        else if (char === '[') bracketCount++;
        else if (char === ']') bracketCount--;
      }
    }
    
    // JSON完整的条件：大括号和方括号都匹配，且不在字符串内
    return braceCount === 0 && bracketCount === 0 && !inString;
  }

  /**
   * 通知状态变化
   */
  notifyStateChange(state, message, extra = {}) {
    if (typeof this.onStateChange === 'function') {
      this.onStateChange({
        state: state,
        message: message,
        ...extra
      });
    }
  }

  /**
   * 通知设备就绪
   */
  notifyDeviceReady(deviceInfo) {
    if (typeof this.onDeviceReady === 'function') {
      this.onDeviceReady(deviceInfo);
    }
  }

  /**
   * 内部BLE写入实现（备用方案，实际使用device.js的writeToBle）
   */
  _internalBLEWrite(message) {
    return new Promise((resolve, reject) => {
      if (!this.deviceReady || !this.rxCharId) {
        reject(new Error('设备未就绪'));
        return;
      }

      // 转换字符串为ArrayBuffer
      const buffer = new ArrayBuffer(message.length);
      const dataView = new DataView(buffer);
      for (let i = 0; i < message.length; i++) {
        dataView.setUint8(i, message.charCodeAt(i));
      }

      wx.writeBLECharacteristicValue({
        deviceId: this.deviceId,
        serviceId: this.rxServiceId,
        characteristicId: this.rxCharId,
        value: buffer,
        success: () => {
          console.log('📤 内部BLE写入成功');
          resolve();
        },
        fail: (err) => {
          console.error('❌ 内部BLE写入失败:', err);
          reject(new Error(`内部BLE写入失败: ${err.errMsg}`));
        }
      });
    });
  }

  /**
   * 工具函数：延时
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 获取协议栈统计信息
   */
  getStats() {
    const stateNames = ['空闲', '连接中', '重试中', '已连接', '就绪', '名称交换', '列表传输', '完成', '失败'];
    const elapsedTime = Date.now() - this.stateStartTime;
    
    return {
      state: stateNames[this.state],
      stateCode: this.state,
      retryCount: this.retryCount,
      elapsedTime: elapsedTime,
      waitingForResponse: this.waitingForResponse,
      messageSeqId: this.messageSeqId,
      currentRSSI: this.currentRSSI,
      pendingResponses: this.pendingResponses.size
    };
  }
  
  /**
   * 断开连接 - 修复先reset()导致deviceId为空的问题
   */
  disconnect() {
    console.log('🔌 开始断开BLE连接');
    
    // 保存需要断开的设备ID（因为reset()会清空它）
    const targetDeviceId = this.deviceId;
    
    if (!targetDeviceId) {
      console.log('📝 设备ID为空，无需断开连接');
      return Promise.resolve();
    }
    
    // 清理所有等待的响应
    this.pendingResponses.forEach((pending, seqId) => {
      pending.reject(new Error('连接已断开'));
    });
    this.pendingResponses.clear();
    
    // 设置断开状态但不完全reset（保留deviceId）
    this.setState(BLE_HANDSHAKE_STATE.IDLE);
    this.deviceReady = false;
    this.waitingForResponse = false;
    
    return new Promise((resolve, reject) => {
      console.log(`🔌 正在断开设备: ${targetDeviceId}`);
      
      wx.closeBLEConnection({
        deviceId: targetDeviceId,
        success: (res) => {
          console.log('✅ BLE连接断开成功');
          // 只有在成功断开后才完全清理状态
          this.reset();
          resolve(res);
        },
        fail: (err) => {
          console.error('❌ BLE连接断开失败:', err);
          // 即使断开失败也要清理状态，避免状态不一致
          this.reset();
          // 不要reject，因为断开失败通常意味着连接已经不存在了
          resolve(err);
        }
      });
    });
  }
}

// 导出协议客户端
module.exports = {
  BleHandshakeClient,
  BLE_CONFIG,
  BLE_HANDSHAKE_STATE
};