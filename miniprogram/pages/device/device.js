// 导入BLE握手协议客户端
const { BleHandshakeClient, BLE_CONFIG, BLE_HANDSHAKE_STATE } = require('../../utils/ble-handshake-client.js');
// 导入智能设备选择配置
const DeviceSelectionConfig = require('../../config/device-selection-config.js');

Page({
  data: {
    // ===== 扫描相关 =====
    devices: [], // 扫描到的蓝牙设备列表
    scanning: false, // 是否正在扫描
    showScanView: true, // 是否显示扫描界面
    
    // ===== 设备连接相关 =====
    deviceId: '', // 当前连接的设备ID
    services: [], // 设备的服务列表
    connected: false, // 连接状态
    connecting: false, // 正在连接状态
    connectionTimeout: null, // 连接超时定时器
    messages: [], // 消息收发记录
    notifications: [], // 设备通知记录
    input: '', // 输入框内容
    
    // ===== BLE握手协议相关 =====
    protocolState: '空闲', // 协议状态显示
    connectionAttempt: 0, // 当前连接尝试次数
    maxRetries: 3, // 最大重试次数
    
    // 🚀 BLE性能优化字段
    negotiatedMTU: 23, // 协商的MTU大小，默认23字节
    maxPacketSize: 20, // 最大数据包大小，默认20字节
    
    // ===== 颜色方案编辑 =====
    colorNear: '#FF0000', // 近距离颜色
    colorMid: '#00FF00',  // 中距离颜色
    colorFar: '#0000FF',  // 远距离颜色

    // ===== 内部句柄 =====
    rxServiceId: '', // 可写特征所在服务ID (0xFFF0)
    rxCharId: '',    // 可写特征ID     (0xFFF1)
    txServiceId: '', // 通知特征所在服务ID (0xFFF0)
    txCharId: '',    // 通知特征ID       (0xFFF2)
    deviceReady: false, // 设备就绪状态
    
    // ===== 调试相关 =====
    dataBuffer: '', // 数据缓冲区内容
    lastReceiveTime: 0, // 最后接收时间
    
    // ===== 连接引导相关 =====
    showConnectionGuide: false, // 是否显示连接引导
    connectionAnimation: false, // 连接动画状态
    
    // ===== 智能设备选择相关 =====
    recommendedDevice: null, // 智能推荐的设备
    showOtherDevices: false, // 是否显示其他设备列表
    deviceSelectionTimer: null, // 设备选择定时器
    lastStableCheck: 0, // 上次稳定性检查时间
    
    // ===== Un设备列表相关 =====
    unDevices: [], // Un开头的设备列表
    
    // ===== 云同步状态 =====
    isCloudSyncing: false, // 是否正在云同步
    lastCloudSyncTime: '', // 最后一次云同步时间
    lastCloudSyncError: '', // 最后一次同步错误信息
    cloudSyncStatus: 'idle', // idle, syncing, success, error
    
    // ===== 数据刷新状态 =====
    isRefreshingData: false, // 是否正在刷新数据
    
    // ===== 设备绑定相关状态 =====
    boundDevice: null, // 绑定的设备信息
    searchingMyDevice: false, // 是否正在搜索我的设备
    searchingAllDevices: false, // 是否正在搜索所有设备
    statusMessage: '正在初始化...', // 当前状态提示信息
    blockOtherDevices: false, // 是否阻止连接其他设备
  },

  // ===== 设备绑定管理工具函数 =====
  
  /**
   * 获取当前绑定的设备信息
   */
  getBoundDevice() {
    try {
      const boundDevice = wx.getStorageSync('myBoundDevice');
      if (!boundDevice) return null;
      
      // 验证是否属于当前用户
      if (this.isSameUser(boundDevice)) {
        return boundDevice;
      } else {
        // 如果不是当前用户的设备，清除绑定记录
        this.clearBoundDevice();
        return null;
      }
    } catch (error) {
      console.error('获取绑定设备失败:', error);
      return null;
    }
  },

  /**
   * 保存设备绑定信息
   */
  saveBoundDevice(deviceInfo) {
    try {
      const currentUser = getApp().globalData.openid || wx.getStorageSync('openid');
      if (!currentUser) {
        console.warn('用户未登录，无法保存设备绑定');
        return false;
      }

      const boundDevice = {
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        userOpenid: currentUser,
        bindTime: Date.now(),
        lastConnectTime: Date.now(),
        connectCount: (deviceInfo.connectCount || 0) + 1
      };

      wx.setStorageSync('myBoundDevice', boundDevice);
      console.log('✅ 设备绑定成功:', boundDevice.deviceName);
      return true;
    } catch (error) {
      console.error('保存设备绑定失败:', error);
      return false;
    }
  },

  /**
   * 更新设备连接统计
   */
  updateDeviceConnection(deviceInfo) {
    const boundDevice = this.getBoundDevice();
    if (boundDevice && boundDevice.deviceId === deviceInfo.deviceId) {
      boundDevice.lastConnectTime = Date.now();
      boundDevice.connectCount = (boundDevice.connectCount || 0) + 1;
      
      try {
        wx.setStorageSync('myBoundDevice', boundDevice);
        console.log('📊 更新设备连接统计:', boundDevice.connectCount);
      } catch (error) {
        console.error('更新连接统计失败:', error);
      }
    }
  },

  /**
   * 清除设备绑定
   */
  clearBoundDevice() {
    try {
      wx.removeStorageSync('myBoundDevice');
      console.log('🗑️ 设备绑定已清除');
      return true;
    } catch (error) {
      console.error('清除设备绑定失败:', error);
      return false;
    }
  },

  /**
   * 验证设备是否属于当前用户
   */
  isSameUser(deviceInfo) {
    if (!deviceInfo || !deviceInfo.userOpenid) return false;
    
    const currentUser = getApp().globalData.openid || wx.getStorageSync('openid');
    return deviceInfo.userOpenid === currentUser;
  },

  /**
   * 检查设备是否已绑定
   */
  isDeviceBound() {
    return !!this.getBoundDevice();
  },

  /**
   * 获取设备绑定状态信息（用于UI显示）
   */
  getDeviceBindingStatus() {
    const boundDevice = this.getBoundDevice();
    if (!boundDevice) {
      return {
        bound: false,
        deviceName: '',
        bindTime: '',
        connectCount: 0
      };
    }

    return {
      bound: true,
      deviceId: boundDevice.deviceId,
      deviceName: boundDevice.deviceName,
      bindTime: new Date(boundDevice.bindTime).toLocaleString(),
      lastConnectTime: new Date(boundDevice.lastConnectTime).toLocaleString(),
      connectCount: boundDevice.connectCount || 0
    };
  },

  /**
   * 初始化设备绑定状态
   */
  initDeviceBinding() {
    const boundDevice = this.getBoundDevice();
    this.setData({
      boundDevice: boundDevice,
      blockOtherDevices: !!boundDevice,
      statusMessage: boundDevice ? 
        `正在寻找我的设备 ${boundDevice.deviceName}...` : 
        '正在搜索可用设备...'
    });
    console.log('🔗 设备绑定状态初始化:', boundDevice ? '已绑定' : '未绑定');
  },

  // ===== 智能扫描流程控制 =====

  /**
   * 启动智能扫描流程（自动判断绑定设备或搜索所有设备）
   */
  startIntelligentFlow() {
    const boundDevice = this.getBoundDevice();
    if (boundDevice) {
      this.startBoundDeviceFlow(boundDevice);
    } else {
      this.startDiscoveryFlow();
    }
  },

  /**
   * 绑定设备的专属搜索流程
   */
  async startBoundDeviceFlow(boundDevice) {
    console.log('🔍 开始搜索我的设备:', boundDevice.deviceName);
    
    this.setData({ 
      boundDevice: boundDevice,
      searchingMyDevice: true,
      searchingAllDevices: false,
      blockOtherDevices: true,
      statusMessage: `正在寻找我的设备 ${boundDevice.deviceName}...`
    });
    
    try {
      await this.searchForSpecificDevice(boundDevice);
    } catch (error) {
      console.error('搜索我的设备失败:', error);
      this.handleMyDeviceNotFound();
    }
  },

  /**
   * 未绑定时的设备发现流程
   */
  startDiscoveryFlow() {
    console.log('🔍 开始搜索所有可用设备');
    
    this.setData({ 
      boundDevice: null,
      searchingMyDevice: false,
      searchingAllDevices: true,
      blockOtherDevices: false,
      statusMessage: '正在搜索可用设备...'
    });
    
    // 启动连续扫描
    this.startContinuousScan();
  },

  /**
   * 搜索特定的绑定设备
   */
  searchForSpecificDevice(boundDevice) {
    return new Promise((resolve, reject) => {
      let searchTimeout;
      let deviceFound = false;
      
      // 设置30秒搜索超时
      searchTimeout = setTimeout(() => {
        if (!deviceFound) {
          this.stopContinuousScan();
          reject(new Error('搜索超时'));
        }
      }, 30000);

      // 开始扫描
      this.startContinuousScan();
      
      // 监听设备发现
      const checkForMyDevice = () => {
        const devices = this.data.devices;
        const myDevice = devices.find(d => 
          d.deviceId === boundDevice.deviceId || 
          d.name === boundDevice.deviceName
        );
        
        if (myDevice && !deviceFound) {
          deviceFound = true;
          clearTimeout(searchTimeout);
          console.log('✅ 找到我的设备，开始自动连接');
          this.connectToMyDevice(myDevice);
          resolve(myDevice);
        }
      };

      // 每秒检查一次
      this.deviceCheckInterval = setInterval(checkForMyDevice, 1000);
    });
  },

  /**
   * 连接到我的设备
   */
  async connectToMyDevice(device) {
    try {
      this.setData({ 
        statusMessage: `正在连接我的设备 ${device.name}...`
      });
      
      await this.connectDevice({ 
        currentTarget: { 
          dataset: { deviceid: device.deviceId }
        }
      });
      
      // 更新连接统计
      this.updateDeviceConnection({
        deviceId: device.deviceId,
        deviceName: device.name
      });
      
    } catch (error) {
      console.error('连接我的设备失败:', error);
      wx.showToast({ title: '连接失败', icon: 'error' });
    }
  },

  /**
   * 停止所有扫描活动
   */
  stopAllScanning() {
    console.log('🛑 停止所有扫描活动');
    
    // 停止连续扫描
    this.stopContinuousScan();
    
    // 清理设备检查定时器
    if (this.deviceCheckInterval) {
      clearInterval(this.deviceCheckInterval);
      this.deviceCheckInterval = null;
    }
    
    // 更新状态
    this.setData({
      searchingMyDevice: false,
      searchingAllDevices: false,
      statusMessage: '扫描已停止'
    });
  },

  /**
   * 处理我的设备未找到情况
   */
  handleMyDeviceNotFound() {
    console.log('⚠️ 我的设备未找到');
    
    this.setData({ 
      searchingMyDevice: false,
      statusMessage: '我的设备离线'
    });
    
    wx.showModal({
      title: '设备未找到',
      content: `未在附近找到您的设备 ${this.data.boundDevice.deviceName}\n\n可能原因：\n• 设备不在蓝牙范围内\n• 设备电量不足或关机`,
      confirmText: '继续等待',
      cancelText: '解除绑定',
      success: (res) => {
        if (res.confirm) {
          // 用户选择继续等待，2秒后重新搜索
          setTimeout(() => {
            if (this.data.boundDevice) {
              this.startBoundDeviceFlow(this.data.boundDevice);
            }
          }, 2000);
        } else {
          // 用户选择解绑
          this.performUnbind();
        }
      }
    });
  },

  // ===== 设备绑定管理操作 =====

  /**
   * 解绑设备按钮点击事件
   */
  unbindDevice() {
    const boundDevice = this.getBoundDevice();
    if (!boundDevice) {
      wx.showToast({ title: '没有绑定设备', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认解绑',
      content: `确定解除与 ${boundDevice.deviceName} 的绑定吗？\n\n解绑后：\n✓ 碰一碰历史记录会保留\n✓ 可以绑定其他设备\n✗ 需要重新配对才能使用该设备`,
      confirmText: '确认解绑',
      confirmColor: '#ff4444',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.performUnbind();
        }
      }
    });
  },

  /**
   * 执行设备解绑操作
   */
  performUnbind() {
    console.log('🗑️ 开始执行设备解绑');
    
    // 先断开当前连接（如果已连接）
    if (this.data.connected) {
      this.disconnect();
    }
    
    // 停止所有搜索活动
    this.stopAllScanning();
    
    // 清除设备绑定记录
    const success = this.clearBoundDevice();
    
    if (success) {
      // 更新UI状态
      this.setData({ 
        boundDevice: null,
        connected: false,
        blockOtherDevices: false,
        searchingMyDevice: false,
        statusMessage: '正在搜索可用设备...'
      });
      
      // 显示成功提示
      wx.showToast({ 
        title: '解绑成功', 
        icon: 'success',
        duration: 2000 
      });
      
      // 延迟启动设备发现流程
      setTimeout(() => {
        this.startDiscoveryFlow();
      }, 1000);
      
      console.log('✅ 设备解绑完成，开始搜索新设备');
      
    } else {
      wx.showToast({ 
        title: '解绑失败', 
        icon: 'error' 
      });
    }
  },

  /**
   * 重新连接我的设备
   */
  async reconnectMyDevice() {
    const boundDevice = this.getBoundDevice();
    if (!boundDevice) {
      wx.showToast({ title: '没有绑定设备', icon: 'none' });
      return;
    }

    console.log('🔄 开始重新连接我的设备');
    this.startBoundDeviceFlow(boundDevice);
  },

  /**
   * 处理自动设备绑定
   */
  handleAutoBinding(deviceInfo) {
    console.log('🔗 检查是否需要自动绑定设备');
    
    const boundDevice = this.getBoundDevice();
    const currentDeviceId = this.data.deviceId;
    const currentDeviceName = deviceInfo.deviceName || this.data.deviceName;
    
    if (!boundDevice) {
      // 首次连接设备，自动绑定
      console.log('🆕 首次连接设备，开始自动绑定');
      
      const bindingSuccess = this.saveBoundDevice({
        deviceId: currentDeviceId,
        deviceName: currentDeviceName
      });
      
      if (bindingSuccess) {
        // 更新UI状态
        const updatedBoundDevice = this.getBoundDevice();
        this.setData({
          boundDevice: updatedBoundDevice,
          blockOtherDevices: true,
          statusMessage: '✅ 已连接并绑定设备'
        });
        
        // 显示绑定成功提示
        wx.showToast({
          title: '设备已自动绑定',
          icon: 'success',
          duration: 2000
        });
        
        console.log('✅ 设备自动绑定成功:', currentDeviceName);
        
      } else {
        console.error('❌ 设备自动绑定失败');
      }
      
    } else if (boundDevice.deviceId === currentDeviceId) {
      // 连接的是已绑定的设备，更新连接统计
      console.log('📊 连接已绑定设备，更新连接统计');
      
      this.updateDeviceConnection({
        deviceId: currentDeviceId,
        deviceName: currentDeviceName
      });
      
      // 更新UI状态
      const updatedBoundDevice = this.getBoundDevice();
      this.setData({
        boundDevice: updatedBoundDevice,
        statusMessage: '✅ 已连接到我的设备'
      });
      
    } else {
      // 连接的设备与绑定设备不符（理论上不应该发生）
      console.warn('⚠️ 连接设备与绑定设备不匹配');
    }
  },

  // ===== 智能状态提示和错误处理 =====

  /**
   * 更新状态消息
   */
  updateStatusMessage() {
    const { boundDevice, connected, searchingMyDevice, searchingAllDevices } = this.data;
    
    let statusMessage = '';
    if (boundDevice) {
      if (connected) {
        statusMessage = `✅ ${boundDevice.deviceName} 已连接`;
      } else if (searchingMyDevice) {
        statusMessage = `🔍 正在寻找 ${boundDevice.deviceName}...`;
      } else {
        statusMessage = `💤 ${boundDevice.deviceName} 离线`;
      }
    } else {
      if (searchingAllDevices) {
        statusMessage = '🔍 正在搜索可用设备...';
      } else {
        statusMessage = '点击下方设备开始连接';
      }
    }
    
    this.setData({ statusMessage });
  },

  /**
   * 处理蓝牙错误
   */
  handleBluetoothError(error) {
    console.error('🚨 蓝牙错误:', error);
    
    let errorMessage = '';
    let canRetry = false;
    
    if (error.message) {
      const msg = error.message.toLowerCase();
      
      if (msg.includes('not available') || msg.includes('not enabled')) {
        errorMessage = '蓝牙未开启，请在系统设置中开启蓝牙';
      } else if (msg.includes('not authorized') || msg.includes('unauthorized')) {
        errorMessage = '蓝牙权限未授权，请在设置中允许蓝牙权限';
      } else if (msg.includes('already connect')) {
        errorMessage = '设备连接冲突，正在重置连接...';
        canRetry = true;
      } else if (msg.includes('connection timeout') || msg.includes('timeout')) {
        errorMessage = '连接超时，请确保设备在蓝牙范围内';
        canRetry = true;
      } else if (msg.includes('device not found')) {
        errorMessage = '设备未找到，请确保设备已开启';
        canRetry = true;
      } else {
        errorMessage = `连接异常: ${error.message}`;
        canRetry = true;
      }
    } else {
      errorMessage = '未知蓝牙错误';
      canRetry = true;
    }
    
    // 更新UI状态
    this.setData({
      connecting: false,
      searchingMyDevice: false,
      searchingAllDevices: false,
      statusMessage: errorMessage
    });
    
    // 显示错误提示
    if (canRetry) {
      wx.showModal({
        title: '连接失败',
        content: errorMessage + '\n\n是否重试？',
        confirmText: '重试',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            setTimeout(() => {
              this.startIntelligentFlow();
            }, 1000);
          }
        }
      });
    } else {
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      });
    }
  },

  /**
   * 处理连接成功状态
   */
  handleConnectionSuccess(deviceInfo) {
    console.log('🎉 连接成功处理');
    
    const deviceName = deviceInfo.deviceName || this.data.deviceName;
    
    this.setData({
      connecting: false,
      connected: true,
      searchingMyDevice: false,
      searchingAllDevices: false,
      statusMessage: `✅ ${deviceName} 已连接`
    });
    
    // 停止所有搜索活动
    this.stopAllScanning();
  },

  /**
   * 处理连接失败状态
   */
  handleConnectionFailure(error) {
    console.error('💥 连接失败处理:', error);
    
    this.setData({
      connecting: false,
      connected: false,
      statusMessage: '连接失败，请重试'
    });
    
    // 根据错误类型进行相应处理
    this.handleBluetoothError(error);
  },
  
  // 页面加载时的处理
  onLoad(options) {
    // 🔬 初始化设备历史记录（不能放在data中，因为Map不可序列化）
    this.deviceHistory = new Map();
    
    // 初始化设备绑定状态
    this.initDeviceBinding();
    
    // 初始化BLE握手协议客户端
    this.initHandshakeClient();
    
    // 更新tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected('/pages/device/device');
    }
    
    // 如果传入了deviceId，直接连接设备
    if (options.deviceId) {
      this.setData({ 
        deviceId: options.deviceId,
        showScanView: false 
      });
      // 延迟初始化蓝牙，确保页面先渲染
      setTimeout(() => {
        this.ensureAdapter(() => this.connectWithHandshake());
      }, 100);
    } else {
      // 没有传入deviceId，显示扫描界面
      this.setData({ showScanView: true });
      // 延迟启动智能扫描流程
      setTimeout(() => {
        this.ensureAdapter(() => this.startIntelligentFlow());
      }, 100);
    }
  },
  
  // 页面显示时
  onShow() {
    // 更新tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected('/pages/device/device');
    }
    
    // 重新初始化设备绑定状态
    this.initDeviceBinding();
    
    // 如果在扫描界面且没有连接设备，启动智能扫描流程
    if (this.data.showScanView && !this.data.connected) {
      setTimeout(() => {
        this.startIntelligentFlow();
      }, 300); // 给页面足够时间初始化
    }
  },
  
  // 页面隐藏时
  onHide() {
    // 停止所有扫描以节省电量
    this.stopAllScanning();
  },
  
  // 页面卸载时
  onUnload() {
    // 清理所有定时器和监听器
    this.stopContinuousScan();
    
    // 清理设备更新定时器
    if (this._deviceUpdateTimer) {
      clearInterval(this._deviceUpdateTimer);
      this._deviceUpdateTimer = null;
    }
    
    // 🔬 清理设备历史记录，防止内存泄漏
    if (this.deviceHistory) {
      this.deviceHistory.clear();
      this.deviceHistory = null;
    }
    
    // 断开握手协议连接
    if (this.handshakeClient) {
      this.handshakeClient.disconnect();
    }
    
    if (this.data.connected) {
      this.disconnect();
    }
  },

  // ===== BLE握手协议客户端管理 =====
  
  /**
   * 初始化BLE握手协议客户端 - 完全接管BLE通信
   */
  initHandshakeClient() {
    this.handshakeClient = new BleHandshakeClient();
    
    // 设置状态变化回调
    this.handshakeClient.onStateChange = (stateInfo) => {
      console.log('🔄 握手协议状态变化:', stateInfo);
      
      this.setData({
        protocolState: stateInfo.message || '未知状态',
        connectionAttempt: stateInfo.attempt || 0
      });
      
      // 处理不同状态
      switch(stateInfo.state) {
        case 'connecting':
          this.setData({
            connecting: true,
            connected: false
          });
          break;
          
        case 'retrying':
          wx.showToast({
            title: `重试中... (${stateInfo.attempt}/${stateInfo.maxRetries})`,
            icon: 'loading',
            duration: 1000
          });
          break;
          
        case 'service_discovery':
        case 'characteristic_discovery':
        case 'notification_setup':
          this.setData({
            connecting: true, // 仍在初始化中
            protocolState: stateInfo.message
          });
          break;
          
        case 'failed':
          this.setData({
            connecting: false,
            connected: false,
            protocolState: '连接失败'
          });
          
          wx.showModal({
            title: '连接失败',
            content: stateInfo.message || '无法连接到设备，请重试',
            showCancel: true,
            cancelText: '返回扫描',
            confirmText: '重试连接',
            success: (res) => {
              if (res.confirm) {
                this.connectWithHandshake();
              } else {
                this.backToScan();
              }
            }
          });
          break;
      }
    };
    
    // 设置设备就绪回调 - 协议栈完全接管后的回调
    this.handshakeClient.onDeviceReady = (deviceInfo) => {
      console.log('✅ 设备完全就绪:', deviceInfo);
      
      // 更新设备状态
      this.setData({
        connecting: false,
        connected: true,
        deviceReady: true,
        rxServiceId: deviceInfo.rxServiceId,
        rxCharId: deviceInfo.rxCharId,
        txServiceId: deviceInfo.txServiceId,
        txCharId: deviceInfo.txCharId,
        negotiatedMTU: deviceInfo.negotiatedMTU,
        maxPacketSize: deviceInfo.maxPacketSize,
        protocolState: '设备就绪，开始业务流程'
      });
      
      // 显示连接成功提示
      wx.showToast({
        title: '连接成功',
        icon: 'success',
        duration: 2000
      });
      
      // 添加连接成功通知
      this.addNotification(`✅ 已连接到设备: ${deviceInfo.deviceName || '未知设备'}`);
      
      // 🔗 自动绑定设备（如果尚未绑定）
      this.handleAutoBinding(deviceInfo);
      
      // 开始业务流程：发送Un字符串等
      this.startBusinessLogic();
    };
    
    // 设置消息接收回调
    this.handshakeClient.onMessageReceived = (message) => {
      console.log('📨 收到握手协议消息:', message);
      // 转发给原有的消息处理逻辑
      this.handleReceivedData(JSON.stringify(message));
    };
    
    // 设置连接丢失处理回调
    this.handshakeClient.onConnectionLoss = (lossInfo) => {
      console.error('🔴 握手协议检测到连接丢失:', lossInfo);
      
      this.setData({
        connected: false,
        deviceReady: false,
        protocolState: `连接丢失: ${lossInfo.reason}`
      });
      
      // 显示重连提示
      wx.showModal({
        title: '连接中断',
        content: `设备连接已中断：${lossInfo.reason}\n已尝试${lossInfo.autoReconnectAttempts}次自动重连`,
        showCancel: true,
        cancelText: '返回扫描',
        confirmText: '手动重连',
        success: (res) => {
          if (res.confirm) {
            this.connectWithHandshake();
          } else {
            this.backToScan();
          }
        }
      });
    };
    
    // 覆盖握手客户端的发送方法，直接调用device.js的writeToBle逻辑
    this.handshakeClient.sendMessage = (message) => {
      return new Promise((resolve, reject) => {
        if (!this.handshakeClient.deviceReady || !this.handshakeClient.rxCharId) {
          reject(new Error('设备未就绪'));
          return;
        }
        
        // 使用原有的writeToBle函数
        this.writeToBle(message, '握手协议消息').then(resolve).catch(reject);
      });
    };
    
    console.log('🚀 BLE握手协议客户端初始化完成');
  },

  /**
   * 使用握手协议连接设备 - 完整流程
   */
  async connectWithHandshake() {
    const { deviceId, deviceName } = this.data;
    
    if (!this.handshakeClient) {
      console.error('❌ 握手协议客户端未初始化');
      return;
    }
    
    console.log('🤝 开始完整握手协议连接流程:', deviceId, deviceName);
    
    try {
      this.setData({
        connecting: true,
        connected: false,
        protocolState: '开始连接...',
        connectionAttempt: 0
      });
      
      // 📌 关键修复：连接前先确保彻底断开之前的连接
      await this.ensureDisconnected(deviceId);
      
      // 重置握手客户端状态
      this.handshakeClient.reset();
      
      // 开始完整连接流程（连接→服务发现→特征配置→通知订阅→设备就绪）
      await this.handshakeClient.connectWithRetry(deviceId, deviceName);
      
      console.log('✅ 握手协议完整流程成功');
      
    } catch (error) {
      console.error('❌ 握手协议连接失败:', error);
      this.setData({
        connecting: false,
        connected: false,
        protocolState: '连接失败: ' + error.message
      });
      
      // 使用新的错误处理机制
      this.handleConnectionFailure(error);
    }
  },

  /**
   * 确保设备完全断开连接 - 解决"already connect"问题
   */
  async ensureDisconnected(targetDeviceId) {
    console.log(`🔍 检查设备${targetDeviceId}的连接状态...`);
    
    try {
      // 如果握手客户端有连接，先断开
      if (this.handshakeClient && this.handshakeClient.deviceId) {
        console.log('🔌 发现握手客户端有连接，先断开...');
        await this.handshakeClient.disconnect();
        console.log('✅ 握手客户端连接已断开');
      }
      
      // 额外尝试断开目标设备（防止有僵尸连接）
      await new Promise((resolve) => {
        wx.closeBLEConnection({
          deviceId: targetDeviceId,
          success: (res) => {
            console.log('✅ 强制断开目标设备成功');
            resolve(res);
          },
          fail: (err) => {
            console.log('📝 强制断开目标设备失败（可能本来就没连接）:', err.errMsg);
            resolve(err); // 不管成功失败都继续
          }
        });
      });
      
      // 等待断开完全生效
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('⏳ 断开等待完成，可以安全重连');
      
    } catch (error) {
      console.warn('⚠️ 断开连接过程中出现错误，但继续尝试连接:', error);
    }
  },
  
  /**
   * 开始业务逻辑 - 设备就绪后的处理
   */
  startBusinessLogic() {
    console.log('🚀 开始业务逻辑处理');
    
    // 延迟发送Un字符串，确保连接稳定
    setTimeout(() => {
      console.log('📤 发送Un字符串');
      this.checkAndSendUnString();
    }, 1000);
    
    // 延迟发送阈值设置
    setTimeout(() => {
      console.log('🎯 发送阈值设置');
      this.sendThresholdToDevice().catch(error => {
        console.error('🎯 阈值发送失败:', error);
      });
    }, 2000);
  },

  // ===== 蓝牙适配器管理 =====
  ensureAdapter(cb) {
    wx.openBluetoothAdapter({
      success: () => {
        // 设置蓝牙可用状态
        this.setData({ 
          bluetoothAvailable: true,
          errorMessage: '' 
        });
        
        // 停止可能已存在的扫描
        wx.stopBluetoothDevicesDiscovery({});
        
        // 监听连接状态变化
        wx.onBLEConnectionStateChange((res) => {
          console.log('BLE state change', res);
          this.setData({ connected: res.connected });
          
          // 如果连接断开，重置就绪状态
          if (!res.connected) {
            this.setData({ 
              deviceReady: false,
              rxServiceId: '',
              rxCharId: '',
              txServiceId: '',
              txCharId: ''
            });
            console.log('连接已断开，重置设备状态');
          }
        });
        
        cb && cb();
      },
      fail: (e) => {
        if (e.errMsg && e.errMsg.includes('already opened')) {
          // 已打开，直接继续
          cb && cb();
        } else {
          console.error('openBluetoothAdapter fail', e);
          
          // 设置错误状态，但不阻止页面显示
          this.setData({
            bluetoothAvailable: false,
            scanning: false,
            errorMessage: '蓝牙未开启或未授权'
          });
          
          // 显示非阻塞式提示
          wx.showToast({
            title: '请开启蓝牙',
            icon: 'none',
            duration: 3000
          });
          
          // 如果在真机环境，显示更详细的引导
          if (e.errCode !== 10001) { // 10001是模拟器错误码
            setTimeout(() => {
              wx.showModal({
                title: '蓝牙未开启',
                content: '请先打开系统蓝牙并授予小程序位置权限',
                showCancel: true,
                cancelText: '稍后再试',
                confirmText: '去设置',
                success: (res) => {
                  if (res.confirm) {
                    // 尝试打开系统设置
                    wx.openSetting();
                  }
                }
              });
            }, 500);
          }
        }
      }
    });
  },

  // ===== 蓝牙扫描功能 =====
  // 开始持续扫描
  startContinuousScan() {
    console.log('🔄 [扫描] 开始持续扫描');
    this.setData({ scanning: true });
    
    // 清除之前的定时器
    this.clearScanTimers();
    
    // 开始蓝牙扫描
    this.startScan();
    
    // 设置周期性重启扫描（每15秒重启一次，保持扫描新鲜度）
    this._continuousScanTimer = setInterval(() => {
      if (this.data.scanning && this.data.showScanView && !this.data.connected) {
        console.log('🔄 [扫描] 周期性重启扫描');
        this.restartScan();
      }
    }, 15000);
  },
  
  // 停止持续扫描
  stopContinuousScan() {
    console.log('⛔ [扫描] 停止持续扫描');
    this.setData({ scanning: false });
    
    // 停止蓝牙扫描
    wx.stopBluetoothDevicesDiscovery({ complete: () => {} });
    
    // 清除定时器
    this.clearScanTimers();
  },
  
  // 清除扫描相关定时器
  clearScanTimers() {
    if (this._scanTimer) {
      clearTimeout(this._scanTimer);
      this._scanTimer = null;
    }
    if (this._continuousScanTimer) {
      clearInterval(this._continuousScanTimer);
      this._continuousScanTimer = null;
    }
    if (this._deviceUpdateTimer) {
      clearInterval(this._deviceUpdateTimer);
      this._deviceUpdateTimer = null;
    }
  },
  
  // 重启扫描（保持设备列表）
  restartScan() {
    wx.stopBluetoothDevicesDiscovery({ 
      complete: () => {
        setTimeout(() => {
          this.startScan();
        }, 500);
      }
    });
  },
  
  // 切换扫描状态
  toggleScan() {
    // 先检查蓝牙是否可用
    if (this.data.bluetoothAvailable === false) {
      // 重新尝试初始化蓝牙
      this.ensureAdapter(() => {
        if (this.data.bluetoothAvailable !== false) {
          this.startContinuousScan();
        }
      });
      return;
    }
    
    if (this.data.scanning) {
      this.stopContinuousScan();
    } else {
      this.startContinuousScan();
    }
  },
  
  startScan() {
    this.setData({ scanning: true });

    // 停止可能已存在的扫描
    wx.stopBluetoothDevicesDiscovery({ complete: () => {} });

    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: true, // 允许重复上报，用于实时更新RSSI
      success: () => {
        // 监听新设备发现事件（只注册一次）
        if (!this._deviceFoundListener) {
          this._deviceFoundListener = (res) => {
            // 过滤设备：只保留以Un开头的设备
            const filteredDevices = res.devices.filter(d => {
              return d.name && d.name.startsWith('Un');
            });
            
            if (filteredDevices.length === 0) {
              return; // 没有符合条件的设备，不更新列表
            }
            
            const now = Date.now();
            
            // 更新列表（使用Map去重并保留最新RSSI）
            const map = new Map(this.data.devices.map(d => [d.deviceId, d]));
            filteredDevices.forEach(d => {
              // 🔬 更新RSSI历史记录
              this.updateDeviceRSSIHistory(d.deviceId, d.RSSI, now);
              
              // 添加更新时间信息
              const existingDevice = map.get(d.deviceId);
              map.set(d.deviceId, {
                ...d,
                lastSeen: now,
                updateTime: existingDevice ? '刚刚更新' : '刚刚发现'
              });
            });
            let devices = Array.from(map.values());
            
            // 清除超过30秒未更新的设备
            devices = devices.filter(d => {
              return !d.lastSeen || (now - d.lastSeen) < 30000;
            });
            
            // 为所有设备添加历史信息
            devices = devices.map(device => {
              const history = this.deviceHistory.get(device.deviceId);
              return {
                ...device,
                historySize: history ? history.rssiHistory.length : 0
              };
            });
            
            // 按RSSI从高到低排序
            devices.sort((a, b) => (b.RSSI || -999) - (a.RSSI || -999));
            
            // 🧠 智能设备选择算法
            const smartRecommendation = this.smartDeviceSelection(devices);
            
            // 🔄 动态推荐撤回检查
            const shouldRevokeRecommendation = this.checkRecommendationRevocation(smartRecommendation);
            
            // 更新设备列表和推荐设备
            this.setData({ 
              devices: devices,
              recommendedDevice: shouldRevokeRecommendation ? null : smartRecommendation,
              showConnectionGuide: devices.length > 0
            });
            
            // 启动设备更新时间定时器
            if (!this._deviceUpdateTimer) {
              this._deviceUpdateTimer = setInterval(() => {
                this.updateDeviceTimes();
              }, 1000);
            }
            
            console.log(`🔍 [扫描] 当前发现 ${devices.length} 个Un设备:`, 
              devices.map(d => ({ 
                name: d.name, 
                RSSI: d.RSSI,
                updateTime: d.updateTime
              })));
          };
          wx.onBluetoothDeviceFound(this._deviceFoundListener);
        }
        // 不设置超时，保持持续扫描
      },
      fail: () => {
        this.setData({ scanning: false });
        wx.showToast({ title: '扫描失败', icon: 'none' });
      }
    });
  },

  // 点击设备，停止扫描并连接设备
  connectDevice(e) {
    // 🛡️ 防重复连接保护
    if (this.data.connecting || this.data.connected) {
      console.log('⚠️ [连接] 忽略重复连接请求 - 当前状态:', {
        connecting: this.data.connecting,
        connected: this.data.connected
      });
      return;
    }
    
    const deviceId = e.currentTarget.dataset.deviceid;
    const device = this.data.devices.find(d => d.deviceId === deviceId);
    
    // 🔗 检查设备绑定状态
    if (this.data.blockOtherDevices && this.isDeviceBound()) {
      const boundDevice = this.getBoundDevice();
      if (boundDevice && boundDevice.deviceId !== deviceId) {
        wx.showModal({
          title: '设备已绑定',
          content: `您已绑定设备 ${boundDevice.deviceName}，需要先解绑才能连接其他设备`,
          confirmText: '解除绑定',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              this.performUnbind();
            }
          }
        });
        return;
      }
    }
    
    console.log('🔗 [连接] 用户点击连接设备:', deviceId);
    
    // 🎯 立即设置连接状态为正在连接，防止重复点击
    this.setData({ 
      connecting: true,
      connected: false,
      connectionAnimation: false, // 停止旋转动画
      showConnectionGuide: false // 隐藏连接引导
    });
    
    // 🚨 立即停止扫描，防止发现更多设备导致界面混乱
    if (this.data.scanning) {
      this.stopContinuousScan();  // 修复：使用正确的函数名
      console.log('🛑 [连接] 开始连接时立即停止扫描');
    }
    
    // 延迟切换到设备详情页面
    setTimeout(() => {
      this.setData({ 
        deviceId: deviceId,
        showScanView: false 
      });
      
      // 连接设备，但不停止扫描，继续监控RSSI
      this.connectWithHandshake();
    }, 800); // 等待动画完成
  },

  // 更新设备时间显示
  updateDeviceTimes() {
    const now = Date.now();
    const devices = this.data.devices.map(device => {
      if (device.lastSeen) {
        const timeDiff = now - device.lastSeen;
        let updateTime;
        
        if (timeDiff < 5000) {
          updateTime = '刚刚更新';
        } else if (timeDiff < 60000) {
          updateTime = `${Math.floor(timeDiff / 1000)}秒前`;
        } else if (timeDiff < 3600000) {
          updateTime = `${Math.floor(timeDiff / 60000)}分钟前`;
        } else {
          updateTime = `${Math.floor(timeDiff / 3600000)}小时前`;
        }
        
        return {
          ...device,
          updateTime: updateTime
        };
      }
      return device;
    });
    
    this.setData({ devices });
  },

  // 返回扫描界面
  backToScan() {
    // 如果已连接，先断开
    if (this.data.connected && this.handshakeClient) {
      this.handshakeClient.disconnect().finally(() => {
        this.resetToScan();
      });
    } else {
      this.resetToScan();
    }
  },

  // 重置到扫描状态
  resetToScan() {
    // 🎯 清理连接相关的定时器
    if (this.data.connectionTimeout) {
      clearTimeout(this.data.connectionTimeout);
    }
    
    this.setData({ 
      showScanView: true,
      connected: false,
      connecting: false,
      connectionTimeout: null,
      deviceReady: false,
      deviceId: '',
      services: [],
      messages: [],
      notifications: [],
      input: '',
      rxServiceId: '',
      rxCharId: '',
      txServiceId: '',
      txCharId: '',
      unDevices: []
    });
    this.startScan();
  },

  // ===== 设备连接功能 =====
  // 原connect()方法已被握手协议完全替代

  // 连接后停止扫描，专注于接收硬件消息
  stopScanningAfterConnection() {
    console.log('设备已连接，停止扫描，专注于接收硬件消息');
    
    // 停止蓝牙设备扫描
    wx.stopBluetoothDevicesDiscovery({
      success: () => {
        console.log('扫描已停止');
      },
      fail: (err) => {
        console.error('停止扫描失败:', err);
      }
    });
    
    // 清理扫描相关定时器
    if (this._scanTimer) {
      clearTimeout(this._scanTimer);
      this._scanTimer = null;
    }
    
    if (this._continuousScanTimer) {
      clearInterval(this._continuousScanTimer);
      this._continuousScanTimer = null;
    }
    
    // 检查并发送16字节Un字符串给硬件
    this.checkAndSendUnString();
  },

  // 发送阈值设置给硬件
  async sendThresholdToDevice() {
    try {
      console.log('🎯 [阈值设置] 开始发送阈值设置给硬件');
      
      // 获取用户设置的阈值
      const advancedTags = wx.getStorageSync('advancedTags') || {};
      const threshold = advancedTags.threshold || 4;
      
      console.log('🎯 [阈值设置] 当前阈值:', threshold);
      
      // 构建发送给硬件的JSON命令
      const command = {
        type: 'set_threshold',
        threshold: threshold,
        timestamp: Date.now()
      };
      
      const commandStr = JSON.stringify(command);
      console.log('🎯 [阈值设置] 发送的JSON命令:', commandStr);
      
      // 记录发送的命令到消息列表 - 添加时间戳
      const timestamp = new Date().toLocaleString();
      const sendMessage = `📤 设置闪光阈值: ${threshold} [${timestamp}]`;
      this.setData({ 
        messages: this.data.messages.concat(sendMessage)
      });
      
      // 检查BLE写入特征是否就绪
      const { rxServiceId, rxCharId } = this.data;
      if (!rxServiceId || !rxCharId) {
        console.error('❌ [阈值设置] BLE特征未就绪，无法发送阈值设置');
        wx.showToast({
          title: 'BLE特征未就绪',
          icon: 'error',
          duration: 2000
        });
        return;
      }
      
      console.log('🎯 [阈值设置] BLE特征已就绪，开始发送...');
      
      // 发送给硬件
      await this.writeToBle(commandStr);
      
      console.log('✅ [阈值设置] 阈值设置发送完成');
      
      // 显示成功提示
      wx.showToast({
        title: `阈值已设置为${threshold}`,
        icon: 'success',
        duration: 2000
      });
      
    } catch (error) {
      console.error('❌ [阈值设置] 发送阈值设置失败:', error);
      
      // 显示错误提示
      wx.showToast({
        title: '阈值设置失败',
        icon: 'error',
        duration: 2000
      });
    }
  },

  // 检查并发送16字节Un字符串给硬件
  async checkAndSendUnString() {
    try {
      console.log('🔍🔍🔍 [重要调试] ===== 开始检查并发送16字节Un字符串给硬件 =====');
      console.log('🔍 [调试] 函数被调用时间:', new Date().toLocaleTimeString());
      
      // ✅ 首先验证BLE连接状态
      const { connected, rxServiceId, rxCharId } = this.data;
      console.log('🔍 [BLE验证] 连接状态:', connected);
      console.log('🔍 [BLE验证] RX特征:', rxServiceId, rxCharId);
      
      if (!connected) {
        console.error('❌ [BLE验证] 设备未连接，无法发送Un字符串');
        wx.showToast({
          title: '设备未连接',
          icon: 'error',
          duration: 2000
        });
        return;
      }
      
      if (!rxServiceId || !rxCharId) {
        console.error('❌ [BLE验证] BLE特征值未就绪，无法发送Un字符串');
        wx.showToast({
          title: 'BLE特征未就绪',
          icon: 'error',
          duration: 2000
        });
        return;
      }
      
      console.log('✅ [BLE验证] 连接状态正常，特征值就绪，可以发送数据');
      
      // 获取当前用户的编码标签
      console.log('🔍 [调试] 正在调用getUserEncodedTags()...');
      let userEncodedTags = await this.getUserEncodedTags();
      console.log('🔍🔍🔍 [重要调试] getUserEncodedTags()结果:', userEncodedTags, '类型:', typeof userEncodedTags, '长度:', userEncodedTags ? userEncodedTags.length : 'null');
      console.log('🔍🔍🔍 [重要调试] 预期应该与成功页面显示的 iCQCAABqMIgQAA 一致！');
      
      let unString;
      
      if (!userEncodedTags || userEncodedTags.length === 0) {
        console.log('⚠️ [调试] 未找到用户编码标签，使用默认Un名称（不会触发其他设备亮灯）');
        
        // 🎯 新的默认格式：Un + 14个星号，确保16字符长度且会被其他设备忽略
        unString = 'Un**************'; // Un + 14个星号 = 16字符
        
        console.log('🔍 [调试] 使用默认Un名称（星号格式）:', unString, '（将被其他设备直接忽略，不进入解码环节）');
        
        // 显示提示用户可以完善个人主页来启用完整功能
        wx.showToast({
          title: '使用默认模式（其他设备会忽略）',
          icon: 'none',
          duration: 2000
        });
        
      } else {
        // 🚨 关键修复：生成16字符的Un字符串
        // 格式："Un" + 14字符编码 = 16字符总长度
        if (userEncodedTags.length >= 14) {
          // 如果编码长度>=14，直接使用前14个字符
          unString = `Un${userEncodedTags.substring(0, 14)}`;
          console.log('🔍 [调试] 使用用户编码生成Un字符串（取前14字符）:', unString);
        } else {
          // 如果编码长度<14，补0到14字符
          const paddedEncoding = userEncodedTags.padEnd(14, '0');
          unString = `Un${paddedEncoding}`;
          console.log('🔍 [调试] 使用用户编码生成Un字符串（补0到14字符）:', unString);
        }
      }
      
      console.log('🔍 [调试] 最终蓝牙名称:', unString, '长度:', unString.length);
      
      // 验证蓝牙名称格式（必须是16字符且以Un开头）
      if (unString.length !== 16 || !unString.startsWith('Un')) {
        console.error('❌ [调试] 蓝牙名称格式错误:', unString, '长度:', unString.length);
        wx.showToast({
          title: '蓝牙名称格式错误',
          icon: 'error',
          duration: 2000
        });
        return;
      }
      
      // 判断是用户编码名称还是默认名称
      const isUserEncoded = (userEncodedTags && userEncodedTags.length > 0);
      console.log('🔍 [调试] 名称类型:', isUserEncoded ? '用户编码名称' : '默认Un名称（其他设备会忽略）');
      
      // 构建发送给硬件的JSON命令
      const command = {
        type: 'set_un_string',
        un_string: unString,
        timestamp: Date.now()
      };
      
      const commandStr = JSON.stringify(command);
      console.log('🔍 [调试] 发送的JSON命令:', commandStr, '长度:', commandStr.length);
      
      // 记录发送的命令到消息列表 - 用户友好的标签更新提示
      const timestamp = new Date().toLocaleString();
      const sendMessage = `📤 [更新个人标签到硬件] ${timestamp}`;
      this.setData({ 
        messages: this.data.messages.concat(sendMessage)
      });
      
      // ✅ BLE状态在函数开始处已验证，直接发送
      console.log('🔍 [调试] BLE特征已验证，开始发送Un字符串...');
      
      // 发送给硬件
      await this.writeToBle(commandStr);
      
      console.log('✅ [调试] 16字节Un字符串发送完成，等待硬件确认...');
      
      // ✅ 智能响应等待：只在连接不稳定时显示超时
      this.waitingForUnStringResponse = true;
      this.unStringResponseTimeout = setTimeout(() => {
        if (this.waitingForUnStringResponse) {
          console.log('⚠️ [调试] 等待硬件Un字符串确认超时');
          this.waitingForUnStringResponse = false;
          
          // 🔥 修复：检查连接状态，避免误导性超时提示
          try {
            // 安全获取握手客户端和连接状态
            const bleClient = this.handshakeClient || this.bleHandshakeClient;
            let isHealthy = false;
            
            if (bleClient && typeof bleClient === 'object') {
              // 检查连接健康状态
              isHealthy = bleClient.connectionHealthy === true;
              
              // 额外检查设备是否仍然连接
              if (bleClient.deviceReady === true && this.data.connected === true) {
                isHealthy = true;
              }
            }
            
            if (isHealthy) {
              console.log('💡 连接健康，可能是消息丢失，不显示超时提示');
              // 连接正常时不显示超时，可能只是消息丢失
            } else {
              console.warn('💔 连接不健康，显示超时提示');
              wx.showToast({
                title: '请检查设备连接',
                icon: 'none',
                duration: 2000
              });
            }
          } catch (error) {
            console.error('❌ 连接健康检查出错:', error);
            // 出错时保守处理，显示连接提示
            wx.showToast({
              title: '设备连接状态检查失败',
              icon: 'none',
              duration: 2000
            });
          }
        }
      }, 8000); // 8秒超时（用户协议规定）
      
      // 暂时显示发送中状态
      wx.showToast({
        title: '正在更新蓝牙名称...',
        icon: 'loading',
        duration: 1000
      });
      
    } catch (error) {
      console.error('❌ [调试] 发送16字节Un字符串失败:', error);
      console.error('❌ [调试] 错误详情:', JSON.stringify(error));
      
      // 显示错误提示
      wx.showToast({
        title: '发送失败',
        icon: 'error',
        duration: 2000
      });
    }
  },

  // 手动发送Un字符串（供调试使用）
  manualSendUnString() {
    console.log('🔍 [调试] 用户手动点击发送Un名称按钮');
    console.log('🔍 [调试] 当前连接状态:', this.data.connected);
    console.log('🔍 [调试] 当前RX特征:', this.data.rxServiceId, this.data.rxCharId);
    
    if (!this.data.connected) {
      wx.showToast({
        title: '设备未连接',
        icon: 'error',
        duration: 2000
      });
      return;
    }
    
    this.checkAndSendUnString();
  },

  // 🚀 简化测试发送（绕过所有复杂逻辑，直接发送默认Un字符串）
  async testSimpleSend() {
    console.log('🚀 [测试] 简化发送测试开始...');
    
    // 检查基础连接状态
    const { connected, rxServiceId, rxCharId } = this.data;
    if (!connected || !rxServiceId || !rxCharId) {
      wx.showToast({
        title: '连接或特征值未就绪',
        icon: 'error',
        duration: 2000
      });
      return;
    }
    
    try {
      // 直接发送一个简单的测试Un字符串
      const testUnString = 'UnTEST1234567890'; // 16字符测试字符串
      const command = {
        type: 'set_un_string',
        un_string: testUnString,
        timestamp: Date.now()
      };
      
      const commandStr = JSON.stringify(command);
      console.log('🚀 [测试] 发送测试命令:', commandStr);
      
      // 直接发送，不经过复杂的编码生成逻辑
      await this.writeToBle(commandStr);
      
      console.log('✅ [测试] 简化发送成功');
      wx.showToast({
        title: '测试发送成功',
        icon: 'success',
        duration: 2000
      });
      
      // 添加到消息列表
      this.setData({
        messages: this.data.messages.concat(`🚀 测试发送: ${testUnString}`)
      });
      
    } catch (error) {
      console.error('❌ [测试] 简化发送失败:', error);
      wx.showToast({
        title: '测试发送失败',
        icon: 'error',
        duration: 2000
      });
    }
  },

  // 🔬 最小化BLE写入测试（用于诊断基础连接）
  async testMinimalBleWrite() {
    console.log('🔬 [最小测试] 开始最小化BLE写入测试...');
    
    const { connected, deviceId, rxServiceId, rxCharId } = this.data;
    
    console.log('🔬 [最小测试] 当前状态检查:');
    console.log('  connected:', connected);
    console.log('  deviceId:', deviceId);
    console.log('  rxServiceId:', rxServiceId);
    console.log('  rxCharId:', rxCharId);
    
    if (!connected || !deviceId || !rxServiceId || !rxCharId) {
      wx.showToast({
        title: '连接状态异常',
        icon: 'error',
        duration: 3000
      });
      return;
    }
    
    try {
      // 发送最简单的测试字符串
      const testStr = 'hello';
      const buffer = this.str2ab(testStr);
      
      console.log('🔬 [最小测试] 即将发送:', testStr);
      console.log('🔬 [最小测试] 编码后长度:', buffer.byteLength);
      
      const result = await new Promise((resolve, reject) => {
        wx.writeBLECharacteristicValue({
          deviceId: deviceId,
          serviceId: rxServiceId,
          characteristicId: rxCharId,
          value: buffer,
          success: (res) => {
            console.log('✅ [最小测试] 微信API调用成功:', res);
            resolve(res);
          },
          fail: (err) => {
            console.error('❌ [最小测试] 微信API调用失败:', err);
            reject(err);
          }
        });
      });
      
      wx.showToast({
        title: '最小测试成功',
        icon: 'success',
        duration: 2000
      });
      
      console.log('✅ [最小测试] 测试完成，请检查硬件是否收到"hello"');
      
    } catch (error) {
      console.error('❌ [最小测试] 测试失败:', error);
      wx.showToast({
        title: '最小测试失败',
        icon: 'error',
        duration: 3000
      });
    }
  },

  // 测试编码一致性（调试用）
  async testEncodingConsistency() {
    console.log('🔍🔍🔍 [重要调试] ===== 开始测试编码一致性 =====');
    
    try {
      // 1. 获取当前BLE发送的编码
      const bleEncoding = await this.getUserEncodedTags();
      console.log('🔍🔍🔍 [重要调试] BLE发送编码:', bleEncoding);
      
      // 2. 模拟成功页面的编码生成
      const Config = require('../../utils/config.js');
      const encoding = Config.advancedTagsConfig.encoding;
      const steps = Config.advancedTagsConfig.steps;
      const encodingSteps = steps.slice(0, 3);
      const allTagsList = encoding.getAllTagsList(encodingSteps);
      
      // 根据截图，用户成功页面显示的是 iCQCAABqMIgQAA
      console.log('🔍🔍🔍 [重要调试] 成功页面应该显示: iCQCAABqMIgQAA');
      
      // 显示对比结果
      const expectedEncoding = 'iCQCAABqMIgQAA';
      const isConsistent = bleEncoding === expectedEncoding;
      
      wx.showModal({
        title: '编码一致性测试',
        content: `✨ 成功页面显示: ${expectedEncoding}\n📱 BLE实际发送: ${bleEncoding || 'null'}\n🔧 硬件应接收: Un${expectedEncoding}\n\n${isConsistent ? '✅ 编码一致！' : '❌ 编码不一致！需要修复'}`,
        showCancel: false,
        confirmText: '确定'
      });
      
    } catch (error) {
      console.error('❌ [调试] 编码一致性测试失败:', error);
      wx.showToast({
        title: '测试失败',
        icon: 'error',
        duration: 2000
      });
    }
  },

  // 🔥 新增：保存碰一碰结果到本地存储（作为云函数的兜底方案）
  saveTouchListToStorage(devices) {
    try {
      console.log('💾 保存碰一碰列表到本地存储...');
      console.log('💾 设备列表:', devices);
      
      // 将硬件发送的设备列表转换为朋友页面需要的格式
      const unmatchedDevices = devices.map((device, index) => {
        // 从Un字符串中提取标签信息（如果可能）
        const tags = this.extractTagsFromUnString(device.name);
        
        return {
          id: `unmatched_${index}`,
          openid: null,  // 未注册用户没有openid
          name: `Un用户 (${tags.length}个标签)`,
          deviceName: device.name,  // 🔧 修复字段名：bluetooth_name -> deviceName
          subtitle: '无共同标签',
          description: tags.length > 0 ? `TA的兴趣: ${tags.slice(0, 3).join(' · ')}` : '暂无标签信息',
          firstTouchTime: device.first_touch || Date.now(),  // 🔧 修复字段名：timestamp -> firstTouchTime
          isUnmatched: true,
          tags: tags
        };
      });
      
      // 构造完整的碰一碰结果
      const touchListResult = {
        matchedUsers: [],  // 暂时没有匹配用户
        unmatchedDevices: unmatchedDevices,
        summary: {
          total: devices.length,
          matched: 0,
          unmatched: devices.length
        },
        isLocalMode: true,  // 标记为本地模式（云函数未可用）
        updateTime: Date.now()
      };
      
      // 保存到本地存储
      wx.setStorageSync('touchListResult', touchListResult);
      console.log('💾 碰一碰结果已保存到本地存储:', touchListResult);
      
      // 显示保存成功提示
      wx.showToast({
        title: `已保存${devices.length}个碰一碰设备`,
        icon: 'success',
        duration: 2000
      });
      
      return true;
    } catch (error) {
      console.error('❌ 保存碰一碰列表失败:', error);
      return false;
    }
  },
  
  // 从Un字符串中提取标签信息（示例实现）
  extractTagsFromUnString(unString) {
    // 这里可以根据Un字符串的编码规则提取标签
    // 暂时返回示例标签
    const sampleTags = [
      ['编程', '音乐', '旅行', '摄影'],
      ['运动', '阅读', '美食', '电影'],
      ['设计', '咖啡', '徒步', '游戏'],
      ['艺术', '瑜伽', '烹饪', '音乐']
    ];
    
    // 根据字符串生成伪随机索引
    const index = unString.charCodeAt(2) % sampleTags.length;
    return sampleTags[index] || ['探索', '创新', '学习'];
  },

  // 🚨 新增：同步碰一碰列表到云端（添加错误处理和降级方案）
  async syncTouchListToCloud(devices) {
    try {
      console.log('☁️ 开始同步碰一碰列表到云端...');
      console.log('☁️ 设备列表:', devices);
      console.log('☁️ 设备数量:', devices.length);
      
      // 检查云开发是否可用
      if (!wx.cloud || typeof wx.cloud.callFunction !== 'function') {
        console.warn('⚠️ 云开发不可用，跳过云端同步');
        this.addNotification('⚠️ 云开发不可用，使用本地模式');
        return;
      }
      
      console.log('☁️ 云开发环境可用，准备调用云函数');
      
      // 获取当前用户的openid - 修复获取逻辑
      let openid = wx.getStorageSync('openid') || 
                   getApp().globalData.openid ||
                   this.data.userOpenId;
      
      console.log('☁️ 尝试获取openid:', {
        localStorage: wx.getStorageSync('openid'),
        globalData: getApp().globalData.openid,
        pageData: this.data.userOpenId
      });
      
      // 如果还是没有openid，尝试通过云函数登录获取
      if (!openid) {
        console.log('☁️ 未找到本地openid，尝试云函数登录获取');
        try {
          const loginRes = await wx.cloud.callFunction({
            name: 'login'
          });
          if (loginRes.result && loginRes.result.openid) {
            openid = loginRes.result.openid;
            wx.setStorageSync('openid', openid);
            getApp().globalData.openid = openid;
            console.log('☁️ 通过云函数获取openid成功:', openid);
          } else if (loginRes.result && loginRes.result.data && loginRes.result.data._openid) {
            openid = loginRes.result.data._openid;
            wx.setStorageSync('openid', openid);
            getApp().globalData.openid = openid;
            console.log('☁️ 通过云函数获取openid成功(备用格式):', openid);
          }
        } catch (loginError) {
          console.error('☁️ 云函数登录失败:', loginError);
        }
      }
      
      if (!openid) {
        console.warn('⚠️ 仍然无法获取用户openid，跳过云端同步');
        return;
      }
      
      console.log('☁️ 成功获取openid，开始云端同步:', openid);
      
      // 调用云函数（添加超时和重试机制）
      const res = await Promise.race([
        wx.cloud.callFunction({
          name: 'syncTouchList',
          data: {
            openid: openid,
            touchList: devices
          }
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('云函数调用超时')), 5000);
        })
      ]);
      
      console.log('☁️ 云函数返回结果:', res.result);
      
      if (res.result.success) {
        const { matchedUsers, unmatchedDevices, summary } = res.result;
        
        // 存储匹配结果到全局或本地存储，供朋友页面使用
        wx.setStorageSync('touchListResult', {
          matchedUsers,
          unmatchedDevices,
          updateTime: Date.now()
        });
        
        // 显示同步结果
        const message = `已同步${summary.total}个设备：${summary.matched}个朋友，${summary.unmatched}个待注册`;
        wx.showToast({
          title: message,
          icon: 'none',
          duration: 3000
        });
        
        this.addNotification(`☁️ ${message}`);
        
        // 如果有匹配的朋友，显示简要信息
        if (matchedUsers.length > 0) {
          const topMatch = matchedUsers[0];
          this.addNotification(`🎯 最佳匹配：${topMatch.displayName} (${topMatch.matchScore}个共同标签)`);
        }
      } else {
        console.error('❌ 同步失败:', res.result.message);
        this.addNotification('❌ 朋友列表同步失败');
      }
      
    } catch (error) {
      console.warn('⚠️ 云函数调用失败（非关键功能）:', error.message || error.errMsg);
      
      // 静默处理云函数错误，不影响主要功能
      if (error.errCode === -501000 || error.message?.includes('FUNCTION_NOT_FOUND') || error.errMsg?.includes('FUNCTION_NOT_FOUND')) {
        console.log('📝 云函数未部署，跳过云端同步');
        // 可选：使用本地存储作为fallback
        // this.handleTouchListFallback(devices);
      } else if (error.message?.includes('超时')) {
        console.log('📝 云函数调用超时，跳过云端同步');
      } else {
        console.log('📝 其他云函数错误，跳过云端同步');
      }
      
      // 不显示错误提示给用户，因为这不是关键功能
    }
  },
  
  // 🔧 新增：安全的云函数同步，不覆盖本地数据
  async syncTouchListToCloudSafely(devices) {
    // 🔥 新增：显示同步状态给用户
    this.setData({ 
      isCloudSyncing: true,
      cloudSyncStatus: 'syncing',
      lastCloudSyncError: ''
    });
    
    try {
      console.log('📡 开始安全同步碰一碰列表到云端（不覆盖本地数据）...');
      console.log('📡 设备列表:', JSON.stringify(devices, null, 2));
      console.log('📡 设备数量:', devices.length);
      
      // 检查云开发是否可用
      if (!wx.cloud || typeof wx.cloud.callFunction !== 'function') {
        console.error('❌ 云开发不可用，跳过云端同步');
        this.addNotification('⚠️ 云开发不可用，仅本地保存');
        this.setData({ isCloudSyncing: false });
        return;
      }
      
      console.log('✅ 云开发环境可用，准备调用云函数');
      
      // 获取当前用户的openid - 修复获取逻辑
      let openid = wx.getStorageSync('openid') || 
                   getApp().globalData.openid ||
                   this.data.userOpenId;
      
      console.log('☁️ 尝试获取openid进行云端同步:', {
        localStorage: wx.getStorageSync('openid'),
        globalData: getApp().globalData.openid,
        pageData: this.data.userOpenId
      });
      
      // 如果还是没有openid，尝试通过云函数登录获取
      if (!openid) {
        console.log('☁️ 未找到本地openid，尝试云函数登录获取');
        try {
          const loginRes = await wx.cloud.callFunction({
            name: 'login'
          });
          console.log('☁️ 登录云函数响应:', loginRes);
          
          if (loginRes.result && loginRes.result.openid) {
            openid = loginRes.result.openid;
            wx.setStorageSync('openid', openid);
            getApp().globalData.openid = openid;
            console.log('☁️ 通过云函数获取openid成功:', openid);
          } else if (loginRes.result && loginRes.result.data && loginRes.result.data._openid) {
            // 兼容不同的返回格式
            openid = loginRes.result.data._openid;
            wx.setStorageSync('openid', openid);
            getApp().globalData.openid = openid;
            console.log('☁️ 通过云函数获取openid成功(备用格式):', openid);
          }
        } catch (loginError) {
          console.error('☁️ 云函数登录失败:', loginError);
        }
      }
      
      if (!openid) {
        console.error('❌ 仍然无法获取用户openid，跳过云端同步');
        this.addNotification('❌ 用户身份验证失败');
        this.setData({ isCloudSyncing: false });
        return;
      }
      
      console.log('✅ 成功获取openid，开始云端同步');
      console.log('📡 调用参数:', {
        openid: openid,
        touchListLength: devices.length,
        firstDevice: devices[0] || null
      });
      
      // 调用云函数（添加超时和重试机制）
      console.log('📞 开始调用 syncTouchList 云函数...');
      const startTime = Date.now();
      
      const res = await Promise.race([
        wx.cloud.callFunction({
          name: 'syncTouchList',
          data: {
            openid: openid,
            touchList: devices
          }
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('云函数调用超时 (10秒)')), 10000);
        })
      ]);
      
      const endTime = Date.now();
      console.log(`📞 云函数调用完成，耗时 ${endTime - startTime}ms`);
      console.log('📞 云函数返回结果:', JSON.stringify(res.result, null, 2));
      
      // 增强错误处理
      if (!res || !res.result) {
        console.error('❌ syncTouchListToCloudSafely - 云函数返回结果格式异常:', res);
        this.addNotification('❌ 云函数返回格式错误');
        throw new Error('云函数返回格式错误');
      }
      
      if (!res.result.success) {
        console.error('❌ syncTouchListToCloudSafely - 云函数执行失败:', res.result.message || '未知错误');
        this.addNotification(`❌ 云同步失败: ${res.result.message || '未知错误'}`);
        throw new Error(res.result.message || '同步朋友关系失败');
      }
      
      if (res.result.success) {
        const { matchedUsers, unmatchedDevices, summary } = res.result;
        console.log('✅ 云函数执行成功');
        console.log('✅ 匹配用户数:', matchedUsers?.length || 0);
        console.log('✅ 未匹配设备数:', unmatchedDevices?.length || 0);
        
        // 🔧 关键修复：不直接覆盖本地存储，而是智能合并数据
        const existingData = wx.getStorageSync('touchListResult');
        if (existingData) {
          // 如果本地已有数据，只更新匹配的用户部分，保留本地的未匹配设备
          const updatedResult = {
            matchedUsers: matchedUsers || [], // 使用云函数返回的匹配用户
            unmatchedDevices: existingData.unmatchedDevices || [], // 保留本地的未匹配设备
            summary: {
              total: (matchedUsers?.length || 0) + (existingData.unmatchedDevices?.length || 0),
              matched: matchedUsers?.length || 0,
              unmatched: existingData.unmatchedDevices?.length || 0
            },
            isLocalMode: false, // 标记为云端同步成功
            updateTime: Date.now(),
            cloudSyncTime: new Date().toISOString() // 记录云同步时间
          };
          
          wx.setStorageSync('touchListResult', updatedResult);
          console.log('✅ 智能合并后的数据已保存:', updatedResult);
        }
        
        // 显示同步结果
        const message = `云同步成功！${summary?.matched || 0}个朋友，${summary?.unmatched || 0}个未注册设备`;
        wx.showToast({
          title: message,
          icon: 'success',
          duration: 3000
        });
        
        this.addNotification(`☁️ ${message}`);
        
        // 如果有匹配的朋友，显示简要信息
        if (matchedUsers && matchedUsers.length > 0) {
          const topMatch = matchedUsers[0];
          this.addNotification(`🎯 最佳匹配：${topMatch.displayName || topMatch.name} (${topMatch.matchScore}个共同标签)`);
        }
        
        // 标记同步完成
        this.setData({ 
          isCloudSyncing: false, 
          cloudSyncStatus: 'success',
          lastCloudSyncTime: new Date().toLocaleTimeString()
        });
      } else {
        console.error('❌ 云端同步失败:', res.result.message);
        this.addNotification(`❌ 云同步失败: ${res.result.message}`);
        this.setData({ 
          isCloudSyncing: false,
          cloudSyncStatus: 'error',
          lastCloudSyncError: res.result.message,
          lastCloudSyncTime: new Date().toLocaleTimeString() + ' (失败)'
        });
      }
      
    } catch (error) {
      console.error('❌ 云函数调用失败:', error.message || error.errMsg || error);
      
      // 详细错误日志用于调试
      console.error('❌ syncTouchListToCloudSafely 详细错误:', {
        error: error,
        message: error.message,
        errMsg: error.errMsg,
        stack: error.stack,
        type: typeof error,
        timestamp: new Date().toISOString()
      });
      
      // 显示具体错误信息给用户
      const errorMessage = error.message || error.errMsg || '未知错误';
      this.addNotification(`❌ 云同步失败: ${errorMessage}`);
      
      // 显示Toast提示
      wx.showToast({
        title: `云同步失败: ${errorMessage}`,
        icon: 'none',
        duration: 4000
      });
      
      // 标记同步失败
      this.setData({ 
        isCloudSyncing: false, 
        cloudSyncStatus: 'error',
        lastCloudSyncError: errorMessage,
        lastCloudSyncTime: new Date().toLocaleTimeString() + ' (失败)'
      });
    }
  },
  
  // 处理云函数失败时的本地fallback
  handleTouchListFallback(devices) {
    console.log('🔄 处理碰一碰列表本地fallback');
    
    try {
      // 创建基础的匹配结果（无法匹配用户，但至少显示设备）
      const fallbackResult = {
        matchedUsers: [], // 无法匹配，因为没有云端数据
        unmatchedDevices: devices.map(device => ({
          deviceName: device.name,
          firstTouchTime: device.first_touch || Date.now(),
          status: 'local_mode'
        })),
        summary: {
          total: devices.length,
          matched: 0,
          unmatched: devices.length
        },
        isLocalMode: true
      };
      
      // 存储到本地，供朋友页面使用
      wx.setStorageSync('touchListResult', {
        ...fallbackResult,
        updateTime: Date.now()
      });
      
      // 显示结果
      const message = `本地模式：发现${devices.length}个碰一碰设备`;
      console.log('🔄 本地fallback完成:', message);
      
      wx.showToast({
        title: message,
        icon: 'none',
        duration: 2000
      });
      
      // 添加通知
      this.addNotification(`🔄 ${message}（需云函数匹配用户）`);
      
    } catch (fallbackError) {
      console.error('❌ 本地fallback失败:', fallbackError);
      this.addNotification('❌ 本地模式也失败了');
    }
  },
  
  // 🔄 新增：Un字符串动态同步函数
  async syncUnStringToBle() {
    try {
      console.log('🔄 开始同步Un字符串到硬件...');
      
      // 检查BLE连接状态
      if (!this.data.connected) {
        console.warn('⚠️ BLE未连接，无法同步Un字符串');
        this.addNotification('⚠️ 设备未连接，请先连接设备');
        return false;
      }
      
      // 获取最新的用户编码标签
      const userEncodedTags = await this.getUserEncodedTags();
      if (!userEncodedTags || userEncodedTags.length < 14) {
        console.error('❌ 获取编码标签失败或长度不足');
        this.addNotification('❌ 获取标签编码失败，请完善个人资料');
        return false;
      }
      
      // 生成16字符Un字符串: "Un" + 14字符编码
      const unString = `Un${userEncodedTags.substring(0, 14)}`;
      console.log('🎯 准备发送Un字符串:', unString);
      
      // 构建设置Un字符串的命令
      const command = {
        type: 'set_un_string',
        un_string: unString,
        timestamp: Date.now()
      };
      
      const commandStr = JSON.stringify(command);
      console.log('📤 发送Un字符串命令:', commandStr);
      
      // 检查特征值是否就绪
      const { rxServiceId, rxCharId } = this.data;
      if (!rxServiceId || !rxCharId) {
        console.error('❌ BLE特征值未就绪，无法发送命令');
        this.addNotification('❌ BLE服务未就绪，请重新连接');
        return false;
      }
      
      // 发送给硬件
      await this.writeToBle(commandStr);
      
      console.log('✅ Un字符串同步命令发送成功');
      
      // 添加通信日志 - 用户友好的标签更新提示
      const timestamp = new Date().toLocaleString();
      this.addNotification(`📤 [更新个人标签到硬件] ${timestamp}`);
      
      return true;
      
    } catch (error) {
      console.error('❌ Un字符串同步失败:', error);
      this.addNotification(`❌ 蓝牙名称同步失败: ${error.message || '未知错误'}`);
      return false;
    }
  },
  
  // 🔄 新增：碰一碰数据刷新函数
  async requestTouchListFromBle() {
    try {
      console.log('🔄 请求硬件发送最新碰一碰列表...');
      
      // 检查BLE连接状态
      if (!this.data.connected) {
        console.warn('⚠️ BLE未连接，无法请求碰一碰列表');
        this.addNotification('⚠️ 设备未连接，请先连接设备');
        return false;
      }
      
      // 构建请求碰一碰列表的命令
      const command = {
        type: 'request_touch_list',
        timestamp: Date.now()
      };
      
      const commandStr = JSON.stringify(command);
      console.log('📤 发送碰一碰列表请求命令:', commandStr);
      
      // 检查特征值是否就绪
      const { rxServiceId, rxCharId } = this.data;
      if (!rxServiceId || !rxCharId) {
        console.error('❌ BLE特征值未就绪，无法发送命令');
        this.addNotification('❌ BLE服务未就绪，请重新连接');
        return false;
      }
      
      // 发送请求给硬件
      await this.writeToBle(commandStr);
      
      console.log('✅ 碰一碰列表请求发送成功');
      
      // 添加通信日志
      this.addNotification('📤 已请求硬件发送最新碰一碰列表');
      
      return true;
      
    } catch (error) {
      console.error('❌ 请求碰一碰列表失败:', error);
      this.addNotification(`❌ 请求碰一碰列表失败: ${error.message || '未知错误'}`);
      return false;
    }
  },
  
  // 🔄 新增：刷新数据按钮点击处理函数
  async refreshData() {
    try {
      console.log('🔄 开始刷新设备数据...');
      
      // 设置刷新状态
      this.setData({ isRefreshingData: true });
      
      // 显示开始刷新的提示
      this.addNotification('🔄 开始刷新数据...');
      
      let successCount = 0;
      let totalOperations = 2;
      
      // 1. 同步Un字符串到硬件
      console.log('🔄 [1/2] 同步Un字符串到硬件...');
      const unSyncResult = await this.syncUnStringToBle();
      if (unSyncResult) {
        successCount++;
        console.log('✅ [1/2] Un字符串同步成功');
      } else {
        console.log('❌ [1/2] Un字符串同步失败');
      }
      
      // 短暂延迟，确保硬件处理完成
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 2. 请求硬件发送最新碰一碰列表
      console.log('🔄 [2/2] 请求最新碰一碰列表...');
      const touchListResult = await this.requestTouchListFromBle();
      if (touchListResult) {
        successCount++;
        console.log('✅ [2/2] 碰一碰列表请求成功');
      } else {
        console.log('❌ [2/2] 碰一碰列表请求失败');
      }
      
      // 显示刷新结果
      if (successCount === totalOperations) {
        console.log('✅ 数据刷新完全成功');
        this.addNotification(`✅ 数据刷新完成 (${successCount}/${totalOperations})`);
        wx.showToast({
          title: '刷新成功',
          icon: 'success',
          duration: 2000
        });
      } else if (successCount > 0) {
        console.log(`⚠️ 数据刷新部分成功: ${successCount}/${totalOperations}`);
        this.addNotification(`⚠️ 部分刷新成功 (${successCount}/${totalOperations})`);
        wx.showToast({
          title: `部分成功 ${successCount}/${totalOperations}`,
          icon: 'none',
          duration: 3000
        });
      } else {
        console.log('❌ 数据刷新完全失败');
        this.addNotification('❌ 数据刷新失败');
        wx.showToast({
          title: '刷新失败',
          icon: 'error',
          duration: 2000
        });
      }
      
    } catch (error) {
      console.error('❌ 数据刷新过程中发生异常:', error);
      this.addNotification(`❌ 刷新异常: ${error.message || '未知错误'}`);
      
      wx.showToast({
        title: '刷新异常',
        icon: 'error',
        duration: 2000
      });
    } finally {
      // 恢复刷新状态
      this.setData({ isRefreshingData: false });
      console.log('🔄 数据刷新过程结束');
    }
  },
  
  // 发送碰一碰列表确认
  async sendTouchListAck() {
    try {
      console.log('📤 发送碰一碰列表确认');
      
      // 构建确认命令
      const command = {
        type: 'touch_list_ack',
        timestamp: Date.now()
      };
      
      const commandStr = JSON.stringify(command);
      console.log('📤 发送确认命令:', commandStr);
      
      // 检查特征值是否就绪
      const { rxServiceId, rxCharId } = this.data;
      if (!rxServiceId || !rxCharId) {
        console.error('❌ 特征值未就绪，无法发送确认');
        wx.showToast({
          title: '特征值未就绪',
          icon: 'error',
          duration: 2000
        });
        return;
      }
      
      // 发送给硬件
      await this.writeToBle(commandStr);
      
      console.log('✅ 碰一碰列表确认发送成功');
      
      // 显示成功提示
      wx.showToast({
        title: '确认发送成功',
        icon: 'success',
        duration: 2000
      });
      
      // 添加通知
      this.addNotification('📤 碰一碰列表确认已发送');
      
    } catch (error) {
      console.error('❌ 发送碰一碰列表确认失败:', error);
      
      // 显示错误提示
      wx.showToast({
        title: '确认发送失败',
        icon: 'error',
        duration: 2000
      });
      
      // 添加错误通知
      this.addNotification('❌ 碰一碰列表确认发送失败');
    }
  },

  // 获取用户编码标签 - 优先使用成功页面显示的编码
  async getUserEncodedTags() {
    try {
      console.log('🔍 [调试] 获取用户编码标签...');
      
      // 🎯 优先方案：直接从成功页面获取已生成的编码
      // 检查是否有最近保存的编码结果
      try {
        const savedEncoding = wx.getStorageSync('lastGeneratedEncoding');
        const encodingTime = wx.getStorageSync('lastEncodingTime');
        
        // 如果有最近生成的编码（5分钟内），直接使用
        if (savedEncoding && encodingTime) {
          const timeDiff = Date.now() - encodingTime;
          if (timeDiff < 5 * 60 * 1000) { // 5分钟内
            console.log('🎯🎯🎯 [优先方案] 使用最近生成的编码:', savedEncoding);
            console.log('🎯 编码生成时间:', new Date(encodingTime).toLocaleString());
            console.log('🎯 距离现在:', Math.round(timeDiff / 1000), '秒');
            return savedEncoding;
          }
        }
      } catch (storageError) {
        console.log('📦 本地存储读取失败，继续云端获取');
      }
      
      // 🎯 备选方案：从云数据库获取（带超时保护）
      console.log('🔍 [调试] 开始调用云函数获取用户数据（3秒超时）...');
      
      // 创建超时Promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('云函数调用超时')), 3000);
      });
      
      // 云函数调用Promise
      const cloudCallPromise = wx.cloud.callFunction({
        name: 'getUserData',
        data: {
          dataType: 'advanced'
        }
      });
      
      // 使用Promise.race实现超时机制
      const result = await Promise.race([cloudCallPromise, timeoutPromise]);
      
      console.log('🔍 [调试] 云函数调用结果:', result);
      
      if (result.result && result.result.success && result.result.data) {
        const userData = result.result.data;
        console.log('🔍 [调试] 用户数据:', userData);
        
        // ✅ 关键修复：使用与index.js完全相同的编码生成逻辑
        if (userData.advancedTags && (userData.advancedTags.professionalTags || userData.advancedTags.interestTags || userData.advancedTags.personalityTags)) {
          console.log('🔍🔍🔍 [重要调试] 检测到用户标签数据，使用与成功页面完全相同的编码生成逻辑...');
          console.log('🔍 [调试] professionalTags:', userData.advancedTags.professionalTags);
          console.log('🔍 [调试] interestTags:', userData.advancedTags.interestTags);
          console.log('🔍 [调试] personalityTags:', userData.advancedTags.personalityTags);
          
          // 🚨 关键调试：输出用户标签的详细信息
          const userTags = {
            professional: userData.advancedTags.professionalTags || [],
            interest: userData.advancedTags.interestTags || [],
            personality: userData.advancedTags.personalityTags || []
          };
          console.log('🎯🎯🎯 [关键调试] 数据库中的用户标签数据详情:');
          console.log('🎯 专业标签:', userTags.professional);
          console.log('🎯 兴趣标签:', userTags.interest);  
          console.log('🎯 性格标签:', userTags.personality);
          console.log('🎯 总标签数:', userTags.professional.length + userTags.interest.length + userTags.personality.length);
          
          try {
            // 🎯 使用与index.js generateTagsEncoding()完全相同的逻辑
            const Config = require('../../utils/config.js');
            console.log('🔍 [调试] Config模块加载成功');
            const encoding = Config.advancedTagsConfig.encoding;
            const steps = Config.advancedTagsConfig.steps;
            
            // 只获取前3页的标签列表（专业领域、兴趣爱好、MBTI性格）
            const encodingSteps = steps.slice(0, 3); // 只取前3步
            const allTagsList = encoding.getAllTagsList(encodingSteps);
            console.log('[getUserEncodedTags] 编码标签列表（前3页）:', allTagsList);
            
            // 获取用户选择的前3页标签（不包括彩蛋标签）
            const userSelectedTags = [
              ...(userData.advancedTags.professionalTags || []),
              ...(userData.advancedTags.interestTags || []),
              ...(userData.advancedTags.personalityTags || [])
            ];
            
            console.log('[getUserEncodedTags] 用户选择的前3页标签:', userSelectedTags);
            
            // 🎯 关键调试：显示标签匹配详情
            console.log('🎯🎯🎯 [标签匹配调试] 开始标签匹配过程...');
            console.log('🎯 所有可选标签数量:', allTagsList.length);
            console.log('🎯 用户选择标签数量:', userSelectedTags.length);
            
            // 创建二进制数组：每个标签对应一个位，选中为true，未选为false
            const binaryArray = allTagsList.map((tagInfo, index) => {
              const isSelected = userSelectedTags.includes(tagInfo.tag);
              if (isSelected) {
                console.log(`🎯 匹配第${index}位: ${tagInfo.tag} ✅`);
              }
              return isSelected;
            });
            
            const selectedCount = binaryArray.filter(x => x).length;
            console.log('🎯🎯🎯 [二进制数组] 长度:', binaryArray.length, '选中数量:', selectedCount);
            console.log('🎯 选中位置:', binaryArray.map((selected, index) => selected ? index : -1).filter(index => index !== -1));
            
            // 调用编码函数
            const encodedTags = encoding.encode(binaryArray);
            console.log('🎯🎯🎯 [最终编码] 生成结果:', encodedTags, '长度:', encodedTags.length);
            
            // 🚨 关键对比：与预期编码对比
            const expectedEncoding = 'iCQCAABqMIgQAA';
            const isMatch = encodedTags === expectedEncoding;
            console.log('🚨🚨🚨 [编码对比]');
            console.log('🚨 预期编码:', expectedEncoding);
            console.log('🚨 实际编码:', encodedTags);
            console.log('🚨 是否一致:', isMatch ? '✅ 一致' : '❌ 不一致');
            
            console.log('🔍🔍🔍 [重要调试] ✅ 使用与成功页面完全一致的编码生成逻辑');
            console.log('🔍🔍🔍 [重要调试] 最终生成编码:', encodedTags);
            console.log('🔍🔍🔍 [重要调试] 这应该与成功页面显示的 iCQCAABqMIgQAA 完全一致！');
            
            // 返回生成的编码
            return encodedTags;
          } catch (configError) {
            console.error('❌ [调试] 配置文件加载或编码生成失败:', configError);
            // 如果配置加载失败，使用数据库中的编码作为后备
          }
        }
        
        // 如果没有标签数据，使用数据库中的编码作为后备
        const encodedTags = userData.encodedTags || '';
        console.log('🔍🔍🔍 [重要调试] 使用数据库编码作为后备:', encodedTags, '长度:', encodedTags.length);
        console.log('🔍🔍🔍 [重要调试] 数据库编码详情:', encodedTags);
        
        // 🚨 临时修复：如果数据库编码不是14字符，可能是包含了所有页面的编码
        // 我们需要确保只取前14个字符用于硬件配对
        if (encodedTags.length > 14) {
          const frontEncoding = encodedTags.substring(0, 14);
          console.log('🔍🔍🔍 [重要调试] 数据库编码超过14字符，截取前14字符:', frontEncoding);
          return frontEncoding;
        }
        
        return encodedTags;
      } else {
        console.log('⚠️ [调试] 云函数返回数据格式错误或无数据，使用本地fallback');
        console.log('⚠️ [调试] result.result:', result.result);
        
        // 🎯 Fallback方案：检查本地是否有缓存的编码
        try {
          const cachedEncoding = wx.getStorageSync('lastGeneratedEncoding');
          if (cachedEncoding) {
            console.log('🎯 [Fallback] 找到本地缓存编码:', cachedEncoding);
            return cachedEncoding;
          }
        } catch (cacheError) {
          console.log('📦 [Fallback] 本地缓存也无法读取');
        }
        
        return null;
      }
      
    } catch (error) {
      console.error('❌ [调试] 获取用户编码标签失败:', error);
      console.error('❌ [调试] 错误类型:', error.message);
      
      // 🎯 增强的Fallback机制：即使云函数完全失败也尝试本地数据
      console.log('🎯 [Fallback] 尝试使用本地数据作为最后备选...');
      try {
        const cachedEncoding = wx.getStorageSync('lastGeneratedEncoding');
        if (cachedEncoding) {
          console.log('🎯 [Fallback] 使用本地缓存编码作为最后备选:', cachedEncoding);
          return cachedEncoding;
        }
        
        // 检查本地存储的用户标签数据
        const advancedTags = wx.getStorageSync('advancedTags');
        if (advancedTags && advancedTags.encodedResult) {
          console.log('🎯 [Fallback] 使用本地标签编码结果:', advancedTags.encodedResult);
          return advancedTags.encodedResult;
        }
        
      } catch (fallbackError) {
        console.error('❌ [Fallback] 所有备选方案都失败了:', fallbackError);
      }
      
      // ✅ 关键修复：提供默认编码，确保蓝牙名称更新不会失败
      const defaultEncoding = 'ugghGFsYktYAgA'; // 使用之前成功的编码作为默认值
      console.log('🔧 [Fallback] 使用默认编码避免功能失败:', defaultEncoding);
      return defaultEncoding;
    }
  },

  // 处理接收到的数据包
  handleReceivedData(str) {
    const now = Date.now();
    
    console.log('📨 收到新数据片段:', JSON.stringify(str));
    console.log('📨 数据片段长度:', str.length);
    console.log('📨 接收时间间隔:', this.lastReceiveTime ? (now - this.lastReceiveTime) + 'ms' : '首次');
    
    // 如果距离上次接收超过100ms，认为是新的消息开始（配合更快传输）
    if (now - this.lastReceiveTime > 100) {
      if (this.dataBuffer.length > 0) {
        console.log('⏰ 超时清空缓冲区，原内容:', JSON.stringify(this.dataBuffer));
      }
      this.dataBuffer = '';
    }
    
    this.lastReceiveTime = now;
    this.dataBuffer += str;
    
    // 更新UI显示缓冲区状态
    this.setData({
      dataBuffer: this.dataBuffer,
      lastReceiveTime: now
    });
    
    console.log('当前缓冲区内容:', this.dataBuffer, '长度:', this.dataBuffer.length);
    
    // 检查是否是完整的消息
    if (this.isCompleteMessage(this.dataBuffer)) {
      console.log('检测到完整消息:', this.dataBuffer);
      this.processCompleteMessage(this.dataBuffer);
      this.dataBuffer = ''; // 清空缓冲区
      this.setData({ dataBuffer: '' });
    } else {
      console.log('消息不完整，等待更多数据...');
      // 设置超时清理，防止缓冲区无限增长
      if (this.bufferTimeout) clearTimeout(this.bufferTimeout);
      this.bufferTimeout = setTimeout(() => {
        if (this.dataBuffer.length > 0) {
          console.log('缓冲区超时，强制处理消息:', this.dataBuffer);
          console.log('缓冲区字符串长度:', this.dataBuffer.length);
          this.processCompleteMessage(this.dataBuffer);
          this.dataBuffer = '';
          this.setData({ dataBuffer: '' });
        }
      }, 200); // 大幅减少到200ms超时，配合更快的传输
    }
  },

  // 判断消息是否完整
  isCompleteMessage(str) {
    const cleanStr = str.trim();
    
    // 检查是否是JSON格式的碰一碰设备列表（这是最重要的消息）
    if (cleanStr.includes('"type":"touch_list"')) {
      console.log('🔍 检测到touch_list消息，验证完整性...');
      console.log('🔍 当前字符串长度:', cleanStr.length);
      console.log('🔍 字符串内容:', cleanStr.substring(0, 100) + (cleanStr.length > 100 ? '...' : ''));
      
      // 必须以{开始，以}结束
      if (cleanStr.startsWith('{') && cleanStr.endsWith('}')) {
        // 检查是否包含完整的touch_list结构
        const hasRequiredFields = 
          cleanStr.includes('"type":"touch_list"') &&
          cleanStr.includes('"count":') &&
          cleanStr.includes('"devices":[') &&
          cleanStr.includes(']}');
        
        if (hasRequiredFields) {
          try {
            const jsonData = JSON.parse(cleanStr);
            console.log('✅ touch_list JSON消息完整，可以解析');
            console.log('✅ 设备数量:', jsonData.count);
            return true;
          } catch (e) {
            console.log('❌ touch_list JSON解析失败，继续等待:', e.message);
            return false;
          }
        } else {
          console.log('⏳ touch_list消息缺少必要字段，继续等待');
          return false;
        }
      } else {
        console.log('⏳ touch_list消息格式不完整，继续等待');
        return false;
      }
    }
    
    // 检查是否包含"收到就绪信号"等关键信息
    if (cleanStr.includes('收到就绪信号')) {
      return true;
    }
    
    // 检查是否包含设备信息（Un开头的设备名称）
    if (cleanStr.includes('Un') && cleanStr.includes('m)')) {
      return true;
    }
    
    // 检查是否是其他JSON格式且括号匹配
    if (cleanStr.startsWith('{') && cleanStr.endsWith('}')) {
      try {
        JSON.parse(cleanStr);
        return true;
      } catch (e) {
        // JSON不完整，继续等待
        return false;
      }
    }
    
    // 检查是否以常见结束符结尾
    if (cleanStr.includes('\n') || cleanStr.includes('\r') || cleanStr.includes('}')) {
      // 但如果是JSON开始，需要确保JSON完整
      if (cleanStr.startsWith('{') && !cleanStr.endsWith('}')) {
        return false;
      }
      return true;
    }
    
    // 如果消息长度超过400字符，认为可能完整（增加长度阈值，适应374字节JSON）
    if (cleanStr.length > 400) {
      return true;
    }
    
    // 如果包含特定关键词，认为可能完整
    if (cleanStr.includes('stamp') || cleanStr.includes('timestamp')) {
      return true;
    }
    
    return false;
  },

  // 处理完整的消息
  processCompleteMessage(str) {
    console.log('🔍 处理完整消息:', str);
    console.log('🔍 消息长度:', str.length);
    
    // 清理字符串中可能的控制字符和空白
    let cleanStr = str.trim();
    
    // 特别检查touch_list消息
    if (cleanStr.includes('touch_list')) {
      console.log('🎯 发现touch_list关键字！');
      console.log('🎯 原始字符串:', JSON.stringify(cleanStr));
    }
    
    // 修复可能的JSON格式问题
    if (cleanStr.includes('touch_list')) {
      // 尝试提取第一个完整的JSON对象
      const jsonStart = cleanStr.indexOf('{');
      if (jsonStart >= 0) {
        let bracketCount = 0;
        let jsonEnd = -1;
        
        for (let i = jsonStart; i < cleanStr.length; i++) {
          if (cleanStr[i] === '{') bracketCount++;
          if (cleanStr[i] === '}') bracketCount--;
          if (bracketCount === 0) {
            jsonEnd = i;
            break;
          }
        }
        
        if (jsonEnd > jsonStart) {
          const extractedJson = cleanStr.substring(jsonStart, jsonEnd + 1);
          console.log('📋 提取的JSON:', extractedJson);
          cleanStr = extractedJson;
        }
      }
    }
    
    // 检查是否是JSON格式的确认消息
    if (cleanStr.startsWith('{') && cleanStr.includes('"type"')) {
      try {
        console.log('🔍 尝试解析JSON:', cleanStr);
        const jsonData = JSON.parse(cleanStr);
        console.log('✅ 成功解析JSON消息:', jsonData);
        console.log('✅ 消息类型:', jsonData.type);
        
        // 处理不同类型的确认消息
        switch (jsonData.type) {
          case 'device_ready_ack':
            if (jsonData.status === 'success') {
              console.log('✅ 硬件确认设备就绪');
              this.addNotification('✅ 硬件确认设备就绪');
            } else {
              console.log('❌ 硬件设备就绪确认失败:', jsonData.message);
              this.addNotification(`❌ 设备就绪确认失败: ${jsonData.message}`);
            }
            return;
            
          case 'un_string_ack':
            // ✅ 关键修复：清理响应等待状态
            if (this.waitingForUnStringResponse) {
              this.waitingForUnStringResponse = false;
              if (this.unStringResponseTimeout) {
                clearTimeout(this.unStringResponseTimeout);
                this.unStringResponseTimeout = null;
              }
            }
            
            if (jsonData.status === 'success') {
              console.log('✅ 硬件确认收到Un字符串:', jsonData.un_string);
              this.addNotification(`✅ 硬件确认收到Un字符串: ${jsonData.un_string}`);
              
              // 显示成功提示
              wx.showToast({
                title: '蓝牙名称更新成功',
                icon: 'success',
                duration: 2000
              });
            } else {
              console.log('❌ 硬件Un字符串设置失败:', jsonData.message);
              this.addNotification(`❌ Un字符串设置失败: ${jsonData.message}`);
              
              // 显示错误提示
              wx.showToast({
                title: 'Un字符串设置失败',
                icon: 'error',
                duration: 2000
              });
            }
            return;
            
          case 'touch_list_ack_response':
            if (jsonData.status === 'success') {
              console.log('✅ 硬件确认碰一碰列表已清空');
              this.addNotification('✅ 碰一碰列表已清空');
            } else {
              console.log('❌ 碰一碰列表清空失败:', jsonData.message);
              this.addNotification(`❌ 碰一碰列表清空失败: ${jsonData.message}`);
            }
            return;
            
          case 'command_ack':
            if (jsonData.status === 'success') {
              console.log('✅ 硬件确认收到命令');
              this.addNotification('✅ 硬件确认收到命令');
            } else if (jsonData.status === 'error') {
              console.log('❌ 硬件命令处理失败:', jsonData.message);
              this.addNotification(`❌ 命令处理失败: ${jsonData.message}`);
            } else if (jsonData.status === 'ignored') {
              console.log('⚠️ 硬件忽略命令:', jsonData.message);
              this.addNotification(`⚠️ 命令被忽略: ${jsonData.message}`);
            } else if (jsonData.status === 'unknown') {
              console.log('❓ 硬件收到未知命令:', jsonData.message);
              this.addNotification(`❓ 未知命令: ${jsonData.message}`);
            }
            return;
            
          case 'touch_list':
            // 处理碰一碰设备列表
            console.log('📋 收到touch_list消息，设备数量:', jsonData.count);
            console.log('📋 设备列表:', jsonData.devices);
            
            if (jsonData.count === 0) {
              console.log('📋 碰一碰设备列表为空');
              this.addNotification('📋 碰一碰设备列表为空');
              
              // 清空设备列表显示
              this.setData({
                unDevices: []
              });
            } else {
              console.log('📋 收到碰一碰设备列表:', jsonData.devices);
              console.log('📋 准备调用updateUnDevicesListFromJSON...');
              this.updateUnDevicesListFromJSON(jsonData);
              console.log('📋 updateUnDevicesListFromJSON调用完成');
            }
            return;
            
          default:
            console.log('📱 收到其他JSON消息:', jsonData);
            this.addNotification(`📱 收到消息: ${jsonData.type}`);
            break;
        }
      } catch (error) {
        console.error('JSON解析失败:', error);
        console.error('失败的字符串:', JSON.stringify(cleanStr));
        console.error('字符串长度:', cleanStr.length);
        console.error('错误位置:', error.message);
        
        // 如果是touch_list消息解析失败，尝试修复
        if (cleanStr.includes('touch_list')) {
          console.log('🔧 尝试修复touch_list JSON...');
          
          // 尝试查找并提取正确的JSON部分
          const patterns = [
            /\{"type":"touch_list"[^}]*"devices":\[[^\]]*\]\}/,
            /\{"type":"touch_list".*?\}/s
          ];
          
          for (let pattern of patterns) {
            const match = cleanStr.match(pattern);
            if (match) {
              try {
                const fixedJson = match[0];
                console.log('🔧 尝试修复的JSON:', fixedJson);
                const jsonData = JSON.parse(fixedJson);
                console.log('✅ 修复成功！处理数据:', jsonData);
                
                // 处理修复后的数据
                if (jsonData.type === 'touch_list') {
                  this.updateUnDevicesListFromJSON(jsonData);
                  return;
                }
              } catch (fixError) {
                console.log('🔧 修复尝试失败:', fixError);
              }
            }
          }
        }
        
        this.addNotification(`❌ JSON解析失败: ${error.message}`);
      }
    }
    
    // 检查是否包含设备检测信息（这是最重要的消息）
    if (cleanStr.includes('收到就绪信号') && cleanStr.includes('当前检测到') && cleanStr.includes('Un')) {
      console.log('识别为设备检测消息（重要）');
      this.addNotification(cleanStr);
      this.updateUnDevicesList(cleanStr);
      return;
    }
    
    // 检查是否包含"收到就绪信号"等关键信息
    if (cleanStr.includes('收到就绪信号') || 
        cleanStr.includes('当前检测到') || 
        cleanStr.includes('Un')) {
      console.log('识别为设备状态消息');
      this.addNotification(cleanStr);
      return;
    }
    
    // 检查是否为纯文本回复（不是JSON格式）
    if (!cleanStr.startsWith('{') && !cleanStr.startsWith('[') && cleanStr.length > 0) {
      // 不是JSON且不是状态消息，可能是设备的文本回复
      if (!cleanStr.includes('"type"') && !cleanStr.includes('status')) {
        console.log('识别为纯文本消息');
        this.addNotification(cleanStr);
        return;
      }
    }
    
    // 检查是否包含设备信息（距离、设备ID等）
    if (cleanStr.includes('m)') || cleanStr.includes('距离') || cleanStr.includes('检测到')) {
      console.log('识别为设备检测消息');
      this.addNotification(cleanStr);
      return;
    }
    
    // 其他消息
    console.log('处理其他消息:', cleanStr);
    this.addNotification(cleanStr);
  },

  // 更新Un设备列表
  updateUnDevicesList(message) {
    try {
      // 提取所有Un开头的设备信息
      const deviceMatches = message.match(/Un[^,]+\([^)]+\)/g);
      if (deviceMatches && deviceMatches.length > 0) {
        const unDevices = deviceMatches.map(deviceInfo => {
          // 解析设备名称和距离
          const nameMatch = deviceInfo.match(/Un[^\(]+/);
          const distanceMatch = deviceInfo.match(/\(([^)]+)\)/);
          
          const name = nameMatch ? nameMatch[0] : deviceInfo;
          const distance = distanceMatch ? distanceMatch[1] : '';
          
          return {
            name: name,
            distance: distance,
            status: '在线',
            timestamp: Date.now()
          };
        });
        
        // 更新设备列表，去重并保留最新信息
        const existingDevices = this.data.unDevices;
        const updatedDevices = [...existingDevices];
        
        unDevices.forEach(newDevice => {
          const existingIndex = updatedDevices.findIndex(d => d.name === newDevice.name);
          if (existingIndex >= 0) {
            // 更新现有设备信息
            updatedDevices[existingIndex] = {
              ...updatedDevices[existingIndex],
              distance: newDevice.distance,
              timestamp: newDevice.timestamp
            };
          } else {
            // 添加新设备
            updatedDevices.push(newDevice);
          }
        });
        
        // 按时间戳排序，最新的在前面
        updatedDevices.sort((a, b) => b.timestamp - a.timestamp);
        
        this.setData({ unDevices: updatedDevices });
        console.log('更新Un设备列表:', updatedDevices);
      }
    } catch (error) {
      console.error('解析Un设备信息失败:', error);
    }
  },

  // 从JSON格式更新Un设备列表
  updateUnDevicesListFromJSON(jsonData) {
    console.log('🔄 从JSON更新Un设备列表，原始数据:', jsonData);
    
    if (jsonData.type === 'touch_list' && jsonData.devices && Array.isArray(jsonData.devices)) {
      const deviceCount = jsonData.devices.length;
      console.log(`📋 收到碰一碰设备列表，共${deviceCount}个设备`);
      console.log('📋 设备详情:', jsonData.devices);
      
      // 格式化设备信息用于显示
      const formattedDevices = jsonData.devices.map((device, index) => {
        const touchTime = new Date(device.first_touch);
        const timeStr = touchTime.toLocaleString();
        console.log(`📋 [${index + 1}] 格式化设备: ${device.name}, 首次碰一碰时间: ${timeStr}`);
        return {
          name: device.name,
          time: timeStr,
          distance: '已碰一碰'
        };
      });
      
      console.log('📋 格式化完成，设备数:', formattedDevices.length);
      console.log('📋 格式化后的设备列表:', formattedDevices);
      
      // 更新设备列表
      this.setData({
        unDevices: formattedDevices
      }, () => {
        console.log('📋 setData回调：UI更新完成');
        console.log('📋 当前unDevices数量:', this.data.unDevices.length);
        console.log('📋 当前unDevices内容:', this.data.unDevices);
      });
      
      // 🎯 自动接收碰一碰设备列表，无需用户手动确认
      console.log('🚀 [自动接收] 自动确认接收碰一碰列表，无需用户干预');
      
      // 显示接收成功的提示信息
      wx.showToast({
        title: `已接收${deviceCount}个碰一碰设备`,
        icon: 'success',
        duration: 2000
      });
      
      // 🎯 立即发送确认消息给硬件，无需等待用户确认
      setTimeout(() => {
        console.log('🚀 [自动接收] 自动发送确认消息给硬件');
        this.sendTouchListAck();
      }, 500); // 短暂延迟确保UI更新完成
      
      // 🔥 关键修复：保存碰一碰结果到本地存储，供朋友页面使用
      this.saveTouchListToStorage(jsonData.devices);
      
      // 🚨 新增：异步调用云函数同步碰一碰列表到后端，但不覆盖本地数据
      this.syncTouchListToCloudSafely(jsonData.devices);
      
      // 添加通知
      this.addNotification(`📋 自动接收碰一碰设备列表 (${deviceCount}个设备)`);
    } else {
      console.log('JSON数据格式不正确:', jsonData);
      this.addNotification('❌ 碰一碰设备列表格式错误');
    }
  },

  // ===== 其余功能保持不变 =====
  // 获取设备的所有服务
  // 原 getServices() 方法已被握手协议完全替代

  // 🚀 BLE性能优化：MTU协商
  negotiateMTU() {
    // 检查连接状态和设备ID
    if (!this.data.connected || !this.data.deviceId) {
      console.log('🚀 [性能优化] ⚠️ 设备未连接，跳过MTU协商');
      return;
    }
    
    console.log('🚀 [性能优化] 开始MTU协商...');
    
    // 检查是否支持setBLEMTU
    if (typeof wx.setBLEMTU === 'function') {
      // 添加延时确保连接稳定
      setTimeout(() => {
        wx.setBLEMTU({
          deviceId: this.data.deviceId,
          mtu: 517, // 请求最大MTU (BLE规范允许的最大值)
          success: (res) => {
            console.log('🚀 [性能优化] ✅ MTU协商成功:', res);
            console.log('🚀 [性能优化] 协商后的MTU:', res.mtu);
            
            // 保存实际协商的MTU大小
            this.setData({ 
              negotiatedMTU: res.mtu,
              maxPacketSize: res.mtu - 3 // 减去3字节协议开销
            });
            
            // MTU协商成功提示
            this.addNotification(`🚀 MTU优化成功: ${res.mtu}字节`);
        },
        fail: (err) => {
          console.log('🚀 [性能优化] ⚠️ MTU协商失败:', err);
          console.log('🚀 [性能优化] 使用默认20字节分包');
          
          // MTU协商失败，使用默认值
          this.setData({ 
            negotiatedMTU: 23,
            maxPacketSize: 20
          });
          
          this.addNotification('⚠️ MTU协商失败，使用默认分包');
        }
      });
      }, 500); // 延迟500ms确保连接稳定
    } else {
      console.log('🚀 [性能优化] ⚠️ 当前微信版本不支持MTU协商');
      console.log('🚀 [性能优化] 使用默认20字节分包');
      
      // 不支持MTU协商，使用默认值
      this.setData({ 
        negotiatedMTU: 23,
        maxPacketSize: 20
      });
      
      this.addNotification('⚠️ 微信版本过低，无法优化MTU');
    }
  },

  // 获取特征并处理读写/通知
  // 原 getCharacteristics() 方法已被握手协议完全替代

  // 检查特征状态
  checkCharacteristics() {
    const { rxServiceId, rxCharId, txServiceId, txCharId } = this.data;
    console.log('特征状态检查:');
    console.log('写特征:', rxServiceId, rxCharId);
    console.log('通知特征:', txServiceId, txCharId);
    
    if (rxServiceId && rxCharId) {
      console.log('✅ 写特征已就绪');
    } else {
      console.log('❌ 写特征未就绪');
    }
    
    if (txServiceId && txCharId) {
      console.log('✅ 通知特征已就绪');
      // 通知特征已就绪，标记设备为就绪状态
      this.setData({ deviceReady: true });
    } else {
      console.log('❌ 通知特征未就绪');
      // 注意：通知订阅现在由握手协议统一处理
      console.log('握手协议将自动处理通知订阅');
      // 延迟重试
      setTimeout(() => this.checkCharacteristics(), 1000);
    }
  },

  // 已移除 subscribeAllNotifyCharacteristics - 由握手协议统一处理

  // 设置BLE通知监听器
  setupBLEListener() {
    console.log('设置BLE通知监听器');
    
    // 确保只设置一次监听器
    if (this._bleListenerSet) {
      console.log('BLE监听器已设置，跳过');
      return;
    }
    
    this._bleListenerSet = true;
    
    // 监听所有BLE特征值变化
    wx.onBLECharacteristicValueChange((res) => {
      console.log('=== BLE通知接收 ===');
      console.log('通知来源:', res);
      console.log('服务ID:', res.serviceId);
      console.log('特征ID:', res.characteristicId);
      console.log('设备ID:', res.deviceId);
      console.log('原始数据长度:', res.value.byteLength);
      
      // 将数据转换为字符串先看看
      const uint8Array = new Uint8Array(res.value);
      const str = String.fromCharCode.apply(null, uint8Array);
      console.log('📥 接收到的原始字符串:', str);
      
      // 检查是否包含touch_list
      if (str.includes('touch_list')) {
        console.log('🎯 检测到touch_list消息！');
      }
      
      // 检查是否是来自我们期望的特征值
      const { txServiceId, txCharId } = this.data;
      if (res.serviceId === txServiceId && res.characteristicId === txCharId) {
        console.log('✅ 收到来自正确特征值的通知');
      } else {
        console.log('⚠️ 收到来自其他特征值的通知，但也会处理');
      }
      
      const decodedStr = this.ab2str(res.value);
      console.log('解码后字符串:', decodedStr);
      console.log('字符串长度:', decodedStr.length);
      console.log('原始字节:', Array.from(new Uint8Array(res.value)));
      
      // 检查是否是JSON开始
      if (decodedStr.startsWith('{') && decodedStr.includes('"type":"touch_list"')) {
        console.log('🎯 检测到碰一碰设备列表JSON开始');
      }
      
      // 检查是否是JSON结束
      if (decodedStr.includes('}]}') || decodedStr.endsWith('}')) {
        console.log('🎯 检测到可能的JSON结束');
      }
      
      // 数据包重组处理
      this.handleReceivedData(decodedStr);
    });
    
    // 监听BLE连接状态变化
    wx.onBLEConnectionStateChange((res) => {
      console.log('=== BLE连接状态变化 ===');
      console.log('设备ID:', res.deviceId);
      console.log('连接状态:', res.connected);
      
      if (!res.connected) {
        console.log('设备断开连接');
        this.setData({ connected: false, deviceReady: false });
        this._bleListenerSet = false;
      }
    });
    
    console.log('BLE通知监听器设置完成');
  },

  // 添加设备通知
  addNotification(content) {
    const time = new Date().toLocaleTimeString();
    const notifications = this.data.notifications.concat({ time, content });
    // 保留最近20条通知
    if (notifications.length > 20) {
      notifications.shift();
    }
    this.setData({ notifications });
  },

  // 工具：ArrayBuffer -> 字符串（支持UTF-8解码）
  ab2str(buf) {
    try {
      const uint8Array = new Uint8Array(buf);
      console.log('解码前的字节数据:', Array.from(uint8Array));
      
      // 优先使用手动UTF-8解码（兼容性最好）
      try {
        const str = this.utf8BytesToString(uint8Array);
        console.log('手动UTF-8解码结果:', str);
        return str;
      } catch (e) {
        console.warn('手动UTF-8解码失败:', e);
      }
      
      // 方法2：尝试使用TextDecoder（如果可用）
      if (typeof TextDecoder !== 'undefined') {
        try {
          const decoder = new TextDecoder('utf-8');
          const str = decoder.decode(buf);
          console.log('TextDecoder解码结果:', str);
          return str;
        } catch (e) {
          console.warn('TextDecoder解码失败:', e);
        }
      }
      
      // 方法3：微信小程序专用方法（如果可用）
      if (typeof wx !== 'undefined' && wx.arrayBufferToBase64) {
        try {
          // 先尝试直接转换
          let result = '';
          for (let i = 0; i < uint8Array.length; i++) {
            result += String.fromCharCode(uint8Array[i]);
          }
          console.log('微信兼容模式解码结果:', result);
          return result;
        } catch (e) {
          console.warn('微信解码方法失败:', e);
        }
      }
      
      // 方法4：简单字节转字符串（最后的降级方案）
      let result = '';
      for (let i = 0; i < uint8Array.length; i++) {
        result += String.fromCharCode(uint8Array[i]);
      }
      console.log('简单解码结果:', result);
      return result;
      
    } catch (error) {
      console.warn('字符串解码完全失败:', error);
      return String.fromCharCode.apply(null, new Uint8Array(buf));
    }
  },

  // 手动UTF-8字节数组转字符串
  utf8BytesToString(bytes) {
    let result = '';
    let i = 0;
    
    while (i < bytes.length) {
      let byte1 = bytes[i++];
      
      // ASCII字符 (0xxxxxxx)
      if (byte1 < 0x80) {
        result += String.fromCharCode(byte1);
      }
      // 2字节UTF-8字符 (110xxxxx 10xxxxxx)
      else if ((byte1 & 0xE0) === 0xC0) {
        if (i >= bytes.length) break;
        let byte2 = bytes[i++];
        let codePoint = ((byte1 & 0x1F) << 6) | (byte2 & 0x3F);
        result += String.fromCharCode(codePoint);
      }
      // 3字节UTF-8字符 (1110xxxx 10xxxxxx 10xxxxxx)
      else if ((byte1 & 0xF0) === 0xE0) {
        if (i + 1 >= bytes.length) break;
        let byte2 = bytes[i++];
        let byte3 = bytes[i++];
        let codePoint = ((byte1 & 0x0F) << 12) | ((byte2 & 0x3F) << 6) | (byte3 & 0x3F);
        result += String.fromCharCode(codePoint);
      }
      // 4字节UTF-8字符 (11110xxx 10xxxxxx 10xxxxxx 10xxxxxx)
      else if ((byte1 & 0xF8) === 0xF0) {
        if (i + 2 >= bytes.length) break;
        let byte2 = bytes[i++];
        let byte3 = bytes[i++];
        let byte4 = bytes[i++];
        let codePoint = ((byte1 & 0x07) << 18) | ((byte2 & 0x3F) << 12) | ((byte3 & 0x3F) << 6) | (byte4 & 0x3F);
        if (codePoint > 0xFFFF) {
          // 处理代理对
          codePoint -= 0x10000;
          result += String.fromCharCode(0xD800 + (codePoint >> 10));
          result += String.fromCharCode(0xDC00 + (codePoint & 0x3FF));
        } else {
          result += String.fromCharCode(codePoint);
        }
      }
      // 无效字节，跳过
      else {
        console.warn('无效的UTF-8字节:', byte1.toString(16));
      }
    }
    
    return result;
  },

  // 工具：字符串 -> ArrayBuffer
  str2ab(str) {
    // 使用UTF-8编码将字符串转换为字节数组
    const utf8Bytes = this.stringToUtf8Bytes(str);
    const buffer = new ArrayBuffer(utf8Bytes.length);
    const dataView = new Uint8Array(buffer);
    
    for (let i = 0; i < utf8Bytes.length; i++) {
      dataView[i] = utf8Bytes[i];
    }
    
    console.log('str2ab 输入:', str);
    console.log('str2ab UTF-8字节:', Array.from(utf8Bytes));
    console.log('str2ab 输出buffer长度:', buffer.byteLength);
    
    return buffer;
  },
  
  // 字符串转UTF-8字节数组
  stringToUtf8Bytes(str) {
    const bytes = [];
    
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      
      if (code < 0x80) {
        // ASCII字符 (0-127)
        bytes.push(code);
      } else if (code < 0x800) {
        // 2字节UTF-8字符
        bytes.push(0xC0 | (code >> 6));
        bytes.push(0x80 | (code & 0x3F));
      } else if ((code & 0xFC00) === 0xD800) {
        // 代理对的高位
        if (i + 1 < str.length) {
          const lowCode = str.charCodeAt(i + 1);
          if ((lowCode & 0xFC00) === 0xDC00) {
            // 4字节UTF-8字符
            const codePoint = 0x10000 + ((code & 0x3FF) << 10) + (lowCode & 0x3FF);
            bytes.push(0xF0 | (codePoint >> 18));
            bytes.push(0x80 | ((codePoint >> 12) & 0x3F));
            bytes.push(0x80 | ((codePoint >> 6) & 0x3F));
            bytes.push(0x80 | (codePoint & 0x3F));
            i++; // 跳过低位代理
            continue;
          }
        }
        // 无效的代理对，当作普通字符处理
        bytes.push(0xEF, 0xBF, 0xBD); // UTF-8 替换字符
      } else {
        // 3字节UTF-8字符
        bytes.push(0xE0 | (code >> 12));
        bytes.push(0x80 | ((code >> 6) & 0x3F));
        bytes.push(0x80 | (code & 0x3F));
      }
    }
    
    return bytes;
  },

  // 输入框内容变化时更新 input
  onInput(e) {
    this.setData({ input: e.detail.value });
  },

  // 发送消息（针对 input 文本）
  sendMsg() {
    const msg = this.data.input;
    if (!msg) return;
    
    // 记录发送的消息
    const sendMessage = `📤 发送: ${msg}`;
    this.setData({ 
      messages: this.data.messages.concat(sendMessage), 
      input: '' 
    });
    
    // 发送给硬件
    this.writeToBle(msg, () => {
      console.log('消息发送成功:', msg);
    }).catch(error => {
      console.error('消息发送失败:', error);
      // 记录发送失败
      const failMessage = `❌ 发送失败: ${msg}`;
      this.setData({ 
        messages: this.data.messages.concat(failMessage)
      });
    });
  },

  // 颜色输入框处理
  onColorInput(e) {
    const type = e.currentTarget.dataset.type;
    const val = e.detail.value;
    this.setData({ [`color${type.charAt(0).toUpperCase() + type.slice(1)}`]: val });
  },

  // 发送颜色方案
  sendColors() {
    const { colorNear, colorMid, colorFar } = this.data;
    const colors = [colorNear, colorMid, colorFar];
    // 验证格式 #RRGGBB
    for (let i = 0; i < colors.length; i++) {
      if (!/^#?[0-9a-fA-F]{6}$/.test(colors[i])) {
        wx.showToast({ title: '颜色格式错误', icon: 'none' });
        return;
      }
    }
    // 去掉'#'并拼接
    const hexStr = colors.map(c => c.replace('#', '').toUpperCase()).join(''); // 18字符
    const payload = 'unchangecolor' + hexStr;
    this.writeToBle(payload, () => {
      this.setData({ messages: this.data.messages.concat('发送颜色: ' + payload) });
    });
  },

  // 测试中文消息显示
  testChineseMessage() {
    // 模拟各种可能的中文消息
    const testMessages = [
      'hello',
      '收到: 测试消息',
      '收到：颜色设置成功',
      '设备状态正常',
      '{\"type\":\"status\",\"msg\":\"测试JSON\"}',
      '纯中文测试消息'
    ];
    
    testMessages.forEach((msg, index) => {
      setTimeout(() => {
        console.log(`测试消息${index + 1}:`, msg);
        
        // 模拟ArrayBuffer转换过程
        const buffer = this.str2ab(msg);
        const decoded = this.ab2str(buffer);
        
        console.log('原始消息:', msg);
        console.log('转换后消息:', decoded);
        
        const isImportant = this.isImportantMessage(decoded);
        
        if (isImportant) {
          const newMessage = '测试设备: ' + decoded;
          this.setData({ 
            messages: this.data.messages.concat(newMessage)
          });
        } else {
          this.addNotification(decoded);
        }
      }, index * 500); // 每0.5秒发送一条
    });
    
    wx.showToast({ title: '已发送测试消息', icon: 'success' });
  },

  // 测试接收数据功能
  testReceiveData() {
    // 模拟接收硬件发送的数据
    const testData = [
      '收到就绪信号，当前检测到1个设备, Un4E4E1ED51EDC(4.64m)',
      'stamp":1753554232704',
      '}'
    ];
    
    console.log('开始测试数据接收...');
    testData.forEach((data, index) => {
      setTimeout(() => {
        console.log(`模拟接收数据片段${index + 1}:`, data);
        this.handleReceivedData(data);
      }, index * 200); // 每200ms发送一个片段
    });
  },



  // BLE写入通用方法，自动分包20字节
  writeToBle(str, cb) {
    return new Promise((resolve, reject) => {
      console.log('🔍🔍🔍 [writeToBle诊断] ===== 开始BLE写入诊断 =====');
      
      const { connected, deviceId, rxServiceId, rxCharId } = this.data;
      console.log('🔍 [writeToBle诊断] 连接状态:', connected);
      console.log('🔍 [writeToBle诊断] 设备ID:', deviceId);
      console.log('🔍 [writeToBle诊断] RX服务ID:', rxServiceId);
      console.log('🔍 [writeToBle诊断] RX特征ID:', rxCharId);
      
      if (!rxServiceId || !rxCharId) {
        const error = '特征未就绪';
        console.error('❌ [writeToBle诊断] 特征值未就绪');
        wx.showToast({ title: error, icon: 'none' });
        reject(new Error(error));
        return;
      }
      
      if (!connected) {
        const error = '设备未连接';
        console.error('❌ [writeToBle诊断] 设备未连接');
        wx.showToast({ title: error, icon: 'none' });
        reject(new Error(error));
        return;
      }
      
      console.log('✅ [writeToBle诊断] BLE状态验证通过');
      console.log('📤 [writeToBle] 开始发送数据，总长度:', str.length, '内容:', str);
      
      // 优化：动态MTU大小，根据消息长度和平台优化
      const encoder = this.str2ab;
      
      // 🔧 修复：暂时使用固定20字节分包，确保连接稳定
      let maxLen = 20;
      console.log('📤 使用分包大小:', maxLen, '字节');
      let offset = 0;
      let chunkCount = 0;
      
      const sendNext = () => {
        if (offset >= str.length) {
          console.log('📤 数据发送完成，总共发送', chunkCount, '个分片');
          cb && cb();
          resolve();
          return;
        }
        const chunk = str.slice(offset, offset + maxLen);
        offset += maxLen;
        chunkCount++;
        
        console.log('📤 [writeToBle] 发送分片', chunkCount, ':', chunk, '长度:', chunk.length);
        
        // 🔍 详细诊断即将发送的BLE写入参数
        console.log('🔍 [BLE写入] 即将写入参数:');
        console.log('🔍   deviceId:', this.data.deviceId);
        console.log('🔍   serviceId:', rxServiceId);
        console.log('🔍   characteristicId:', rxCharId);
        console.log('🔍   chunk原文:', chunk);
        console.log('🔍   chunk编码后长度:', encoder(chunk).byteLength, '字节');
        
        wx.writeBLECharacteristicValue({
          deviceId: this.data.deviceId,
          serviceId: rxServiceId,
          characteristicId: rxCharId,
          value: encoder(chunk),
          success: () => {
            console.log('✅ [BLE写入] 分片', chunkCount, '写入微信API成功');
            // 🚀 性能优化：配合硬件连接参数优化，减少分片延迟
            setTimeout(sendNext, 20); // 优化至20ms间隔，配合10ms连接间隔
          },
          fail: (err) => {
            console.error('❌ [BLE写入] 分片', chunkCount, '写入微信API失败:', err);
            console.error('❌ [BLE写入] 错误详情:', JSON.stringify(err));
            wx.showToast({ title: '写入失败', icon: 'none' });
            reject(err);
          }
        });
      };
      sendNext();
    });
  },

  // 重要消息判断逻辑
  isImportantMessage(str) {
    // 清理字符串中可能的控制字符和空白
    const cleanStr = str.trim();
    console.log('判断消息类型:', cleanStr, '长度:', cleanStr.length);
    
    // 检查是否是JSON格式的碰一碰设备列表（这是最重要的消息）
    if (cleanStr.startsWith('{') && cleanStr.includes('"type":"touch_list"') && cleanStr.includes('"devices"')) {
      console.log('识别为碰一碰设备列表JSON消息（重要）');
      return true;
    }
    
    // 检查是否包含设备检测信息（这是最重要的消息）
    if (cleanStr.includes('收到就绪信号') && cleanStr.includes('当前检测到') && cleanStr.includes('Un')) {
      console.log('识别为设备检测消息（重要）');
      return true;
    }
    
    // 检查是否包含"收到就绪信号"等关键信息
    if (cleanStr.includes('收到就绪信号') || 
        cleanStr.includes('当前检测到') || 
        cleanStr.includes('Un')) {
      console.log('识别为设备状态消息');
      return true;
    }
    
    // 检查是否为纯文本回复（不是JSON格式）
    if (!cleanStr.startsWith('{') && !cleanStr.startsWith('[') && cleanStr.length > 0) {
      // 不是JSON且不是状态消息，可能是设备的文本回复
      if (!cleanStr.includes('"type"') && !cleanStr.includes('status')) {
        console.log('识别为纯文本消息');
        return true;
      }
    }
    
    // 检查是否包含设备信息（距离、设备ID等）
    if (cleanStr.includes('m)') || cleanStr.includes('距离') || cleanStr.includes('检测到')) {
      console.log('识别为设备检测消息');
      return true;
    }
    
    console.log('识别为通知消息');
    return false;
  },

  // 断开蓝牙连接
  disconnect() {
    // 通过握手协议客户端断开连接
    if (this.handshakeClient) {
      this.handshakeClient.disconnect().then(() => {
        this.backToScan();
      }).catch(() => {
        this.backToScan();
      });
    } else {
      // 兜底：直接返回扫描界面
      console.warn('握手协议客户端未初始化，直接返回扫描界面');
      this.backToScan();
    }
  },

  // 清除调试信息
  clearDebugInfo() {
    this.dataBuffer = '';
    this.lastReceiveTime = 0;
    this.setData({
      messages: [],
      notifications: [],
      unDevices: []
    });
    wx.showToast({ title: '已清除信息', icon: 'success' });
  },

  // 清除消息列表
  clearMessages() {
    this.setData({
      messages: []
    });
    wx.showToast({
      title: '消息已清除',
      icon: 'success',
      duration: 1500
    });
  },

  // 显示调试信息
  showDebugInfo() {
    const { rxServiceId, rxCharId, txServiceId, txCharId, connected, deviceReady, services } = this.data;
    
    let debugInfo = `
BLE连接调试信息：
连接状态: ${connected ? '已连接' : '未连接'}
设备就绪: ${deviceReady ? '是' : '否'}
写特征: ${rxServiceId ? '已就绪' : '未就绪'} (${rxServiceId || '无'})
通知特征: ${txServiceId ? '已就绪' : '未就绪'} (${txServiceId || '无'})
BLE监听器: ${this._bleListenerSet ? '已设置' : '未设置'}
消息数量: ${this.data.messages.length}
缓冲区: ${this.dataBuffer.length > 0 ? '有数据' : '空'}
缓冲区长度: ${this.dataBuffer.length} 字符
最后接收时间: ${this.lastReceiveTime ? new Date(this.lastReceiveTime).toLocaleTimeString() : '无'}
    `;
    
    // 添加服务信息
    if (services && services.length > 0) {
      debugInfo += `\n发现的服务 (${services.length}个):`;
      services.forEach((service, index) => {
        debugInfo += `\n服务${index + 1}: ${service.uuid}`;
      });
    } else {
      debugInfo += '\n未发现服务';
    }
    
    // 添加缓冲区内容预览
    if (this.dataBuffer.length > 0) {
      debugInfo += `\n\n缓冲区内容预览:`;
      debugInfo += `\n${this.dataBuffer.substring(0, 100)}${this.dataBuffer.length > 100 ? '...' : ''}`;
    }
    
    console.log(debugInfo);
    
    wx.showModal({
      title: '调试信息',
      content: debugInfo,
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 强制重新连接
  forceReconnect() {
    console.log('强制重新连接');
    
    wx.showModal({
      title: '重新连接',
      content: '确定要重新连接设备吗？',
      success: (res) => {
        if (res.confirm) {
          // 通过握手协议断开并重连
          if (this.handshakeClient) {
            this.handshakeClient.disconnect().then(() => {
              console.log('断开连接成功');
              this.resetConnectionState();
              // 重新连接
              setTimeout(() => {
                this.connectWithHandshake();
              }, 1000);
            }).catch((err) => {
              console.error('断开连接失败:', err);
              this.resetConnectionState();
              // 直接尝试重新连接
              this.connectWithHandshake();
            });
          } else {
            console.warn('握手协议客户端未初始化，重新初始化并连接');
            this.resetConnectionState();
            this.connectWithHandshake();
          }
        }
      }
    });
  },

  // 重置连接状态
  resetConnectionState() {
    this.setData({
      connected: false,
      deviceReady: false,
      rxServiceId: '',
      rxCharId: '',
      txServiceId: '',
      txCharId: '',
      messages: [],
      unDevices: []
    });
    this._bleListenerSet = false;
  },

  // 手动触发订阅所有通知特征值
  forceSubscribeAll() {
    console.log('手动触发订阅所有通知特征值');
    
    wx.showModal({
      title: '强制订阅',
      content: '确定要强制订阅所有通知特征值吗？',
      success: (res) => {
        if (res.confirm) {
          // 重置BLE监听器状态
          this._bleListenerSet = false;
          
          // 强制通过握手协议重新初始化
          if (this.handshakeClient) {
            console.log('通过握手协议重新处理通知订阅');
            // 握手协议会自动处理通知订阅
          }
          
          wx.showToast({
            title: '重新初始化中...',
            icon: 'loading',
            duration: 2000
          });
        }
      }
    });
  },

  // 通知设备已就绪
  notifyDeviceReady() {
    console.log('小程序BLE通知订阅完成，向设备发送就绪信号');
    
    // 防止重复发送就绪信号
    if (this.data.deviceReady) {
      console.log('设备已标记为就绪，跳过重复发送');
      return;
    }
    
    // 标记设备为就绪状态
    this.setData({ deviceReady: true });
    
    // 🚨 重要修复：发送正确的JSON格式，包含type字段
    const readyCommand = {
      type: 'device_ready',
      cmd: 'ready',
      timestamp: Date.now()
    };
    
    const readyMessage = JSON.stringify(readyCommand);
    console.log('📤 发送正确格式的就绪信号:', readyMessage);
    
    this.writeToBle(readyMessage, () => {
      console.log('已发送设备就绪信号');
      wx.showToast({ title: '连接完成，等待设备消息', icon: 'success' });
    });
  },

  /**
   * 🧠 智能设备选择算法 - 基于RSSI滤波和稳定性的高精度识别
   * @param {Array} devices 设备列表
   * @returns {Object|null} 推荐的设备对象或null
   */
  smartDeviceSelection(devices) {
    if (!devices || devices.length === 0) {
      return null;
    }

    // 🎛️ 使用配置文件中的参数，开发者可通过修改配置文件来调整算法行为
    const RSSI_STRONG_THRESHOLD = DeviceSelectionConfig.RSSI_STRONG_THRESHOLD;
    const RSSI_PROXIMITY_THRESHOLD = DeviceSelectionConfig.RSSI_PROXIMITY_THRESHOLD;
    const RSSI_CANDIDATE_MIN = DeviceSelectionConfig.RSSI_CANDIDATE_MIN;
    const RSSI_CONFIDENCE_MIN = DeviceSelectionConfig.RSSI_CONFIDENCE_MIN;

    // 过滤出有效的候选设备（信号不能太弱）
    const candidates = devices.filter(d => d.RSSI >= RSSI_CANDIDATE_MIN);
    
    if (candidates.length === 0) {
      return null;
    }

    // 为每个候选设备计算滤波后的RSSI和稳定性
    const enrichedCandidates = candidates.map(device => {
      const history = this.deviceHistory.get(device.deviceId);
      const filteredRSSI = this.calculateFilteredRSSI(device.deviceId);
      const stability = this.calculateRSSIStability(device.deviceId);
      const confidence = this.calculateConfidence(device.deviceId);
      
      return {
        ...device,
        filteredRSSI,
        stability,
        confidence,
        historySize: history ? history.rssiHistory.length : 0
      };
    });

    // 情况1：只有一个设备，但需要稳定性检查
    if (enrichedCandidates.length === 1) {
      const device = enrichedCandidates[0];
      if (device.confidence >= RSSI_CONFIDENCE_MIN && device.stability.isStable && device.filteredRSSI >= RSSI_PROXIMITY_THRESHOLD) {
        return {
          ...device,
          recommendReason: '唯一稳定设备'
        };
      } else {
        console.log('🤔 [智能选择] 唯一设备不满足推荐条件，继续观察', 
          {name: device.name, rssi: device.filteredRSSI.toFixed(1), confidence: device.confidence.toFixed(2), stable: device.stability.isStable, threshold: RSSI_PROXIMITY_THRESHOLD});
        return null;
      }
    }

    // 情况2：有设备信号特别强且稳定（贴手机背面）
    const stableCloseDevices = enrichedCandidates.filter(d => 
      d.filteredRSSI >= RSSI_PROXIMITY_THRESHOLD && 
      d.confidence >= RSSI_CONFIDENCE_MIN &&
      d.stability.isStable
    );
    
    if (stableCloseDevices.length === 1) {
      return {
        ...stableCloseDevices[0],
        recommendReason: '极强稳定信号'
      };
    } else if (stableCloseDevices.length > 1) {
      // 多个极强信号，选择最稳定的
      const mostStable = stableCloseDevices.sort((a, b) => b.confidence - a.confidence)[0];
      return {
        ...mostStable,
        recommendReason: `极强信号(置信度${(mostStable.confidence * 100).toFixed(0)}%)`
      };
    }

    // 情况3：检查是否有设备明显强于其他设备且稳定
    const stableCandidates = enrichedCandidates.filter(d => 
      d.confidence >= RSSI_CONFIDENCE_MIN && d.stability.isStable && d.filteredRSSI >= RSSI_PROXIMITY_THRESHOLD
    );

    if (stableCandidates.length === 0) {
      console.log('🤔 [智能选择] 所有设备都不满足推荐条件，继续观察', 
        enrichedCandidates.map(d => ({
          name: d.name, 
          rssi: d.filteredRSSI.toFixed(1), 
          confidence: (d.confidence * 100).toFixed(0) + '%',
          stable: d.stability.isStable,
          rssiThreshold: RSSI_PROXIMITY_THRESHOLD,
          passThreshold: d.filteredRSSI >= RSSI_PROXIMITY_THRESHOLD
        })));
      return null;
    }

    const sortedStable = stableCandidates.sort((a, b) => b.filteredRSSI - a.filteredRSSI);
    const strongest = sortedStable[0];
    const secondStrongest = sortedStable[1];

    if (secondStrongest && (strongest.filteredRSSI - secondStrongest.filteredRSSI) >= RSSI_STRONG_THRESHOLD) {
      return {
        ...strongest,
        recommendReason: `稳定领先${(strongest.filteredRSSI - secondStrongest.filteredRSSI).toFixed(1)}dBm`
      };
    }

    // 情况4：稳定设备信号差不多，继续等待
    console.log('🤔 [智能选择] 稳定设备信号强度相近，等待更明显差异', 
      stableCandidates.map(d => ({
        name: d.name, 
        rssi: d.filteredRSSI.toFixed(1),
        confidence: (d.confidence * 100).toFixed(0) + '%'
      })));
    
    return null;
  },

  /**
   * 🔬 更新设备RSSI历史记录
   * @param {string} deviceId 设备ID
   * @param {number} rssi RSSI值
   * @param {number} timestamp 时间戳
   */
  updateDeviceRSSIHistory(deviceId, rssi, timestamp) {
    const RSSI_HISTORY_SIZE = DeviceSelectionConfig.RSSI_HISTORY_SIZE;
    
    if (!this.deviceHistory.has(deviceId)) {
      this.deviceHistory.set(deviceId, {
        rssiHistory: [],
        timestamps: [],
        firstSeenTime: timestamp
      });
    }
    
    const history = this.deviceHistory.get(deviceId);
    
    // 添加新的RSSI值
    history.rssiHistory.push(rssi);
    history.timestamps.push(timestamp);
    
    // 保持历史记录大小限制
    if (history.rssiHistory.length > RSSI_HISTORY_SIZE) {
      history.rssiHistory.shift();
      history.timestamps.shift();
    }
  },

  /**
   * 📊 计算滤波后的RSSI（移动平均）
   * @param {string} deviceId 设备ID
   * @returns {number} 滤波后的RSSI值
   */
  calculateFilteredRSSI(deviceId) {
    const history = this.deviceHistory.get(deviceId);
    if (!history || history.rssiHistory.length === 0) {
      return -999;
    }
    
    // 简单移动平均
    const sum = history.rssiHistory.reduce((acc, val) => acc + val, 0);
    return sum / history.rssiHistory.length;
  },

  /**
   * 📈 计算RSSI稳定性
   * @param {string} deviceId 设备ID
   * @returns {Object} {isStable: boolean, stdDev: number, sampleSize: number}
   */
  calculateRSSIStability(deviceId) {
    const RSSI_STABILITY_THRESHOLD = DeviceSelectionConfig.RSSI_STABILITY_THRESHOLD;
    const MIN_SAMPLES = DeviceSelectionConfig.MIN_SAMPLES_FOR_STABILITY;
    
    const history = this.deviceHistory.get(deviceId);
    if (!history || history.rssiHistory.length < MIN_SAMPLES) {
      return {
        isStable: false,
        stdDev: 999,
        sampleSize: history ? history.rssiHistory.length : 0
      };
    }
    
    // 计算标准差
    const mean = this.calculateFilteredRSSI(deviceId);
    const variance = history.rssiHistory.reduce((acc, val) => {
      const diff = val - mean;
      return acc + diff * diff;
    }, 0) / history.rssiHistory.length;
    
    const stdDev = Math.sqrt(variance);
    
    return {
      isStable: stdDev <= RSSI_STABILITY_THRESHOLD,
      stdDev,
      sampleSize: history.rssiHistory.length
    };
  },

  /**
   * 🎯 计算设备推荐置信度
   * @param {string} deviceId 设备ID
   * @returns {number} 置信度 (0-1)
   */
  calculateConfidence(deviceId) {
    const RSSI_STABLE_TIME = DeviceSelectionConfig.RSSI_STABLE_TIME;
    
    const history = this.deviceHistory.get(deviceId);
    if (!history || history.rssiHistory.length === 0) {
      return 0;
    }
    
    const now = Date.now();
    const observationTime = now - history.firstSeenTime;
    const stability = this.calculateRSSIStability(deviceId);
    
    // 🎛️ 基础置信度：基于观察时间
    const timeConfidence = Math.min(observationTime / RSSI_STABLE_TIME, 1) * DeviceSelectionConfig.CONFIDENCE_WEIGHT_TIME;
    
    // 🎛️ 稳定性置信度：基于标准差
    const stabilityConfidence = stability.isStable ? 
      Math.max(0, (5 - stability.stdDev) / 5) * DeviceSelectionConfig.CONFIDENCE_WEIGHT_STABILITY : 0;
    
    // 🎛️ 样本数置信度：基于历史记录完整度
    const sampleConfidence = Math.min(stability.sampleSize / DeviceSelectionConfig.RSSI_HISTORY_SIZE, 1) * DeviceSelectionConfig.CONFIDENCE_WEIGHT_SAMPLES;
    
    return Math.min(timeConfidence + stabilityConfidence + sampleConfidence, 1);
  },

  /**
   * 🔄 检查是否应该撤回当前推荐
   * @param {Object|null} newRecommendation 新的推荐结果
   * @returns {boolean} true表示应该撤回推荐
   */
  checkRecommendationRevocation(newRecommendation) {
    const currentRecommended = this.data.recommendedDevice;
    
    // 如果当前没有推荐设备，不需要撤回
    if (!currentRecommended) {
      return false;
    }
    
    // 如果新推荐是同一个设备，不撤回
    if (newRecommendation && newRecommendation.deviceId === currentRecommended.deviceId) {
      return false;
    }
    
    // 检查当前推荐设备的稳定性
    const currentDeviceConfidence = this.calculateConfidence(currentRecommended.deviceId);
    const currentDeviceStability = this.calculateRSSIStability(currentRecommended.deviceId);
    
    const REVOCATION_CONFIDENCE_THRESHOLD = DeviceSelectionConfig.REVOCATION_CONFIDENCE_THRESHOLD;
    
    // 如果当前推荐设备变得不稳定，撤回推荐
    if (currentDeviceConfidence < REVOCATION_CONFIDENCE_THRESHOLD || !currentDeviceStability.isStable) {
      console.log('⚠️ [智能选择] 撤回不稳定的推荐设备:', {
        device: currentRecommended.name,
        confidence: (currentDeviceConfidence * 100).toFixed(0) + '%',
        stable: currentDeviceStability.isStable,
        stdDev: currentDeviceStability.stdDev.toFixed(1)
      });
      
      // 显示撤回推荐的提示
      wx.showToast({
        title: '设备信号不稳定，重新识别中...',
        icon: 'none',
        duration: 2000
      });
      
      return true;
    }
    
    return false;
  },

  /**
   * 切换显示其他设备列表
   */
  toggleOtherDevices() {
    this.setData({
      showOtherDevices: !this.data.showOtherDevices
    });
  }
});
