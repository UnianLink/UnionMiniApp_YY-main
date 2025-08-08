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
    
    // ===== Un设备列表相关 =====
    unDevices: [] // Un开头的设备列表
  },
  
  // 页面加载时的处理
  onLoad(options) {
    // 如果传入了deviceId，直接连接设备
    if (options.deviceId) {
      this.setData({ 
        deviceId: options.deviceId,
        showScanView: false 
      });
      this.ensureAdapter(() => this.connect());
    } else {
      // 没有传入deviceId，显示扫描界面
      this.setData({ showScanView: true });
      this.ensureAdapter(() => this.startContinuousScan());
    }
  },
  
  // 页面显示时
  onShow() {
    // 如果在扫描界面且没有连接设备，继续扫描
    if (this.data.showScanView && !this.data.connected && !this.data.scanning) {
      this.startContinuousScan();
    }
  },
  
  // 页面隐藏时
  onHide() {
    // 停止扫描以节省电量
    this.stopContinuousScan();
  },
  
  // 页面卸载时
  onUnload() {
    // 清理所有定时器和监听器
    this.stopContinuousScan();
    if (this.data.connected) {
      this.disconnect();
    }
  },

  // ===== 蓝牙适配器管理 =====
  ensureAdapter(cb) {
    wx.openBluetoothAdapter({
      success: () => {
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
          wx.showModal({
            title: '提示',
            content: '请先打开系统蓝牙并授予位置权限',
            showCancel: false
          });
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
            
            // 按RSSI从高到低排序
            devices.sort((a, b) => (b.RSSI || -999) - (a.RSSI || -999));
            
            // 更新设备列表，显示所有发现的设备
            this.setData({ 
              devices: devices,
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
    const deviceId = e.currentTarget.dataset.deviceid;
    
    console.log('🔗 [连接] 用户点击连接设备:', deviceId);
    
    // 🎯 立即设置连接状态为正在连接
    this.setData({ 
      connecting: true,
      connected: false,
      connectionAnimation: false, // 停止旋转动画
      showConnectionGuide: false // 隐藏连接引导
    });
    
    // 延迟切换到设备详情页面
    setTimeout(() => {
      this.setData({ 
        deviceId: deviceId,
        showScanView: false 
      });
      
      // 连接设备，但不停止扫描，继续监控RSSI
      this.connect();
    }, 800); // 等待动画完成
  },

  // 返回扫描界面
  backToScan() {
    // 如果已连接，先断开
    if (this.data.connected) {
      wx.closeBLEConnection({
        deviceId: this.data.deviceId,
        complete: () => {
          this.resetToScan();
        }
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
  connect() {
    const { deviceId, deviceName } = this.data;
    console.log('🔗 [连接] 开始连接设备:', deviceId, deviceName);
    
    // 🎯 设置连接超时定时器 (15秒)
    if (this.data.connectionTimeout) {
      clearTimeout(this.data.connectionTimeout);
    }
    
    const timeoutId = setTimeout(() => {
      console.log('⏰ [连接] 连接超时，返回扫描页面');
      
      // 清理连接状态
      this.setData({
        connecting: false,
        connected: false
      });
      
      // 显示超时提示
      wx.showToast({
        title: '连接超时',
        icon: 'error',
        duration: 2000
      });
      
      // 延迟返回扫描页面
      setTimeout(() => {
        this.backToScan();
      }, 1000);
    }, 15000); // 15秒超时
    
    this.setData({
      connectionTimeout: timeoutId
    });
    
    wx.createBLEConnection({
      deviceId: deviceId,
      success: (res) => {
        console.log('🔗 [连接] ✅ BLE连接成功:', res);
        
        // 🎯 清除超时定时器
        if (this.data.connectionTimeout) {
          clearTimeout(this.data.connectionTimeout);
          this.setData({ connectionTimeout: null });
        }
        
        // 🎯 更新连接状态
        this.setData({
          connecting: false,
          connected: true,
          isConnected: true,
          deviceName: deviceName
        });
        
        // 连接成功后立即获取服务和特征值
        console.log('🔗 [连接] 开始获取服务...');
        this.getServices();
        
        // 添加连接成功通知
        this.addNotification(`✅ 已连接到设备: ${deviceName}`);
        
        // 显示连接成功提示
        wx.showToast({
          title: '连接成功',
          icon: 'success',
          duration: 2000
        });
      },
      fail: (err) => {
        console.error('🔗 [连接] ❌ 连接失败:', err);
        
        // 🎯 清除超时定时器
        if (this.data.connectionTimeout) {
          clearTimeout(this.data.connectionTimeout);
          this.setData({ connectionTimeout: null });
        }
        
        // 🎯 重置连接状态
        this.setData({
          connecting: false,
          connected: false
        });
        
        this.addNotification(`❌ 连接失败: ${err.errMsg}`);
        
        // 显示连接失败提示
        wx.showToast({
          title: '连接失败',
          icon: 'error',
          duration: 2000
        });
        
        // 🎯 连接失败后延迟返回扫描页面
        setTimeout(() => {
          this.backToScan();
        }, 2000);
      }
    });
  },

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
      
      // 记录发送的命令到消息列表
      const sendMessage = `📤 设置闪光阈值: ${threshold}`;
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
      
      // 记录发送的命令到消息列表
      const sendMessage = `📤 发送16字节Un字符串: ${unString}`;
      this.setData({ 
        messages: this.data.messages.concat(sendMessage)
      });
      
      // 检查BLE写入特征是否就绪
      const { rxServiceId, rxCharId } = this.data;
      if (!rxServiceId || !rxCharId) {
        console.error('❌ [调试] BLE特征未就绪，无法发送Un字符串');
        wx.showToast({
          title: 'BLE特征未就绪',
          icon: 'error',
          duration: 2000
        });
        return;
      }
      
      console.log('🔍 [调试] BLE特征已就绪，开始发送...');
      
      // 发送给硬件
      await this.writeToBle(commandStr);
      
      console.log('✅ [调试] 16字节Un字符串发送完成，等待硬件确认...');
      
      // 显示成功提示
      wx.showToast({
        title: 'Un字符串已发送',
        icon: 'success',
        duration: 2000
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
      
      // 🎯 备选方案：从云数据库获取
      console.log('🔍 [调试] 开始调用云函数获取用户数据...');
      const result = await wx.cloud.callFunction({
        name: 'getUserData',
        data: {
          dataType: 'advanced'
        }
      });
      
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
        console.log('⚠️ [调试] 云函数返回数据格式错误或无数据');
        console.log('⚠️ [调试] result.result:', result.result);
        return null;
      }
      
    } catch (error) {
      console.error('❌ [调试] 获取用户编码标签失败:', error);
      console.error('❌ [调试] 错误详情:', JSON.stringify(error));
      return null;
    }
  },

  // 处理接收到的数据包
  handleReceivedData(str) {
    const now = Date.now();
    
    // 如果距离上次接收超过500ms，认为是新的消息开始（增加时间窗口）
    if (now - this.lastReceiveTime > 500) {
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
          console.log('缓冲区超时，处理不完整消息:', this.dataBuffer);
          this.processCompleteMessage(this.dataBuffer);
          this.dataBuffer = '';
          this.setData({ dataBuffer: '' });
        }
      }, 5000); // 增加到5秒超时，给长JSON消息更多时间
    }
  },

  // 判断消息是否完整
  isCompleteMessage(str) {
    const cleanStr = str.trim();
    
    // 检查是否是JSON格式的碰一碰设备列表（这是最重要的消息）
    if (cleanStr.startsWith('{') && cleanStr.includes('"type":"touch_list"')) {
      // 检查JSON是否完整
      if (cleanStr.endsWith('}')) {
        try {
          JSON.parse(cleanStr);
          console.log('✅ JSON消息完整，可以解析');
          return true;
        } catch (e) {
          console.log('❌ JSON消息不完整，继续等待:', e.message);
          return false;
        }
      } else {
        // JSON开始但未结束，继续等待
        console.log('⏳ JSON消息未结束，继续等待');
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
    console.log('处理完整消息:', str);
    
    // 清理字符串中可能的控制字符和空白
    const cleanStr = str.trim();
    
    // 检查是否是JSON格式的确认消息
    if (cleanStr.startsWith('{') && cleanStr.includes('"type"')) {
      try {
        const jsonData = JSON.parse(cleanStr);
        console.log('解析JSON确认消息:', jsonData);
        
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
            if (jsonData.status === 'success') {
              console.log('✅ 硬件确认收到Un字符串:', jsonData.un_string);
              this.addNotification(`✅ 硬件确认收到Un字符串: ${jsonData.un_string}`);
              
              // 显示成功提示
              wx.showToast({
                title: 'Un字符串设置成功',
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
            if (jsonData.count === 0) {
              console.log('📋 碰一碰设备列表为空');
              this.addNotification('📋 碰一碰设备列表为空');
              
              // 清空设备列表显示
              this.setData({
                unDevices: []
              });
            } else {
              console.log('📋 收到碰一碰设备列表:', jsonData.devices);
              this.updateUnDevicesListFromJSON(jsonData);
            }
            return;
            
          default:
            console.log('📱 收到其他JSON消息:', jsonData);
            this.addNotification(`📱 收到消息: ${jsonData.type}`);
            break;
        }
      } catch (error) {
        console.error('JSON解析失败:', error);
        this.addNotification('❌ JSON解析失败');
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
    console.log('从JSON更新Un设备列表:', jsonData);
    
    if (jsonData.type === 'touch_list' && jsonData.devices && Array.isArray(jsonData.devices)) {
      const deviceCount = jsonData.devices.length;
      console.log(`📋 收到碰一碰设备列表，共${deviceCount}个设备`);
      
      // 格式化设备信息用于显示
      const formattedDevices = jsonData.devices.map(device => {
        const touchTime = new Date(device.first_touch);
        const timeStr = touchTime.toLocaleString();
        return {
          name: device.name,
          time: timeStr,
          distance: '已碰一碰'
        };
      });
      
      // 更新设备列表
      this.setData({
        unDevices: formattedDevices
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
      
      // 添加通知
      this.addNotification(`📋 自动接收碰一碰设备列表 (${deviceCount}个设备)`);
    } else {
      console.log('JSON数据格式不正确:', jsonData);
      this.addNotification('❌ 碰一碰设备列表格式错误');
    }
  },

  // ===== 其余功能保持不变 =====
  // 获取设备的所有服务
  getServices() {
    console.log('🔍 [调试] 开始获取服务...');
    wx.getBLEDeviceServices({
      deviceId: this.data.deviceId,
      success: (res) => {
        console.log('🔍 [调试] ✅ 获取服务成功:', res.services);
        console.log('🔍 [调试] 服务列表详情:', res.services.map(s => s.uuid.toLowerCase()));
        this.setData({ services: res.services });
        
        // 查找目标服务 - 兼容多种UUID格式
        const targetService = res.services.find(s => {
          const uuid = s.uuid.toLowerCase();
          // 支持多种UUID格式：fff0, 0000fff0, 0000fff0-0000-1000-8000-00805f9b34fb
          return uuid === 'fff0' || 
                 uuid === '0000fff0' || 
                 uuid.startsWith('0000fff0-') ||
                 uuid.includes('fff0');
        });
        
        console.log('🔍 [调试] 目标服务查找结果:', targetService);
        
        if (targetService) {
          console.log('🔍 [调试] ✅ 找到目标服务:', targetService.uuid);
          console.log('🔍 [调试] 开始获取特征值...');
          this.getCharacteristics(targetService.uuid);
        } else {
          console.error('🔍 [调试] ❌ 未找到目标服务 FFF0');
          console.error('🔍 [调试] 可用服务:', res.services.map(s => s.uuid));
          this.addNotification('❌ 未找到目标服务 FFF0');
        }
      },
      fail: (err) => {
        console.error('🔍 [调试] ❌ 获取服务失败:', err);
        this.addNotification(`❌ 获取服务失败: ${err.errMsg}`);
      }
    });
  },

  // 获取特征并处理读写/通知
  getCharacteristics(serviceId) {
    console.log('🔍 [调试] 开始获取特征值，服务ID:', serviceId);
    wx.getBLEDeviceCharacteristics({
      deviceId: this.data.deviceId,
      serviceId: serviceId,
      success: (res) => {
        console.log('🔍 [调试] ✅ 获取特征值成功:', res.characteristics);
        console.log('🔍 [调试] 特征值列表:', res.characteristics.map(c => ({ uuid: c.uuid.toLowerCase(), properties: c.properties })));
        
        // 查找RX和TX特征值 - 兼容多种UUID格式
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
        
        console.log('🔍 [调试] 查找结果 - RX特征(fff1):', rxChar ? '✅找到' : '❌未找到');
        console.log('🔍 [调试] 查找结果 - TX特征(fff2):', txChar ? '✅找到' : '❌未找到');
        
        if (rxChar && txChar) {
          console.log('🔍 [调试] ✅ 找到RX和TX特征值，设置数据...');
          this.setData({
            rxServiceId: serviceId,
            rxCharId: rxChar.uuid,
            txServiceId: serviceId,
            txCharId: txChar.uuid
          });
          
          console.log('🔍 [调试] 特征值已设置：');
          console.log('🔍 [调试]   RX: serviceId=' + serviceId + ', charId=' + rxChar.uuid);
          console.log('🔍 [调试]   TX: serviceId=' + serviceId + ', charId=' + txChar.uuid);
          
          // 订阅TX特征值的通知
          console.log('🔍 [调试] 开始订阅通知特征值...');
          this.subscribeAllNotifyCharacteristics();
          
          // 优化：先发送阈值设置，再发送Un字符串
          console.log('🔍 [调试] 1.5秒后开始发送配置...');
          setTimeout(async () => {
            console.log('🔍 [调试] 延迟时间到，开始发送配置...');
            // 先发送阈值设置
            await this.sendThresholdToDevice();
            // 等待500ms后发送Un字符串
            setTimeout(() => {
              this.checkAndSendUnString();
            }, 500);
          }, 1500);
          
        } else {
          console.error('🔍 [调试] ❌ 未找到RX或TX特征值');
          console.error('🔍 [调试] 可用特征值:', res.characteristics.map(c => c.uuid));
          this.addNotification('❌ 未找到RX或TX特征值');
        }
      },
      fail: (err) => {
        console.error('🔍 [调试] ❌ 获取特征值失败:', err);
        this.addNotification(`❌ 获取特征值失败: ${err.errMsg}`);
      }
    });
  },

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
      // 尝试订阅所有可能的通知特征值
      this.subscribeAllNotifyCharacteristics();
      // 延迟重试
      setTimeout(() => this.checkCharacteristics(), 1000);
    }
  },

  // 订阅所有可能的通知特征值
  subscribeAllNotifyCharacteristics() {
    console.log('尝试订阅所有可能的通知特征值');
    
    const { services } = this.data;
    if (!services || services.length === 0) {
      console.log('没有发现服务，无法订阅');
      return;
    }
    
    services.forEach((service, serviceIndex) => {
      console.log(`检查服务 ${serviceIndex + 1}:`, service.uuid);
      
      wx.getBLEDeviceCharacteristics({
        deviceId: this.data.deviceId,
        serviceId: service.uuid,
        success: (res) => {
          console.log(`服务 ${service.uuid} 的特征值:`, res.characteristics.map(c => ({
            uuid: c.uuid,
            properties: c.properties
          })));
          
          res.characteristics.forEach(char => {
            // 检查是否有通知或指示属性
            if (char.properties.notify || char.properties.indicate) {
              console.log('发现通知特征值:', char.uuid);
              
              // 尝试订阅所有通知特征值
              wx.notifyBLECharacteristicValueChange({
                deviceId: this.data.deviceId,
                serviceId: service.uuid,
                characteristicId: char.uuid,
                state: true,
                success: () => {
                  console.log('✅ 成功订阅通知特征值:', char.uuid);
                  // 订阅成功后设置BLE监听器
                  this.setupBLEListener();
                },
                fail: (err) => {
                  console.error('❌ 订阅通知特征值失败:', char.uuid, err);
                }
              });
            }
          });
        },
        fail: (err) => {
          console.error('获取特征值失败:', service.uuid, err);
        }
      });
    });
  },

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
      
      // 检查是否是来自我们期望的特征值
      const { txServiceId, txCharId } = this.data;
      if (res.serviceId === txServiceId && res.characteristicId === txCharId) {
        console.log('✅ 收到来自正确特征值的通知');
      } else {
        console.log('⚠️ 收到来自其他特征值的通知，但也会处理');
      }
      
      const str = this.ab2str(res.value);
      console.log('解码后字符串:', str);
      console.log('字符串长度:', str.length);
      console.log('原始字节:', Array.from(new Uint8Array(res.value)));
      
      // 检查是否是JSON开始
      if (str.startsWith('{') && str.includes('"type":"touch_list"')) {
        console.log('🎯 检测到碰一碰设备列表JSON开始');
      }
      
      // 检查是否是JSON结束
      if (str.includes('}]}') || str.endsWith('}')) {
        console.log('🎯 检测到可能的JSON结束');
      }
      
      // 数据包重组处理
      this.handleReceivedData(str);
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
      const { rxServiceId, rxCharId } = this.data;
      if (!rxServiceId || !rxCharId) {
        const error = '特征未就绪';
        wx.showToast({ title: error, icon: 'none' });
        reject(new Error(error));
        return;
      }
      
      console.log('📤 开始发送数据，总长度:', str.length, '内容:', str);
      
      // iOS 小程序一次最多20字节，Android 182/244 等，按20分包更保险
      const encoder = this.str2ab;
      // 分包
      const maxLen = 20;
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
        
        console.log('📤 发送分片', chunkCount, ':', chunk, '长度:', chunk.length);
        
        wx.writeBLECharacteristicValue({
          deviceId: this.data.deviceId,
          serviceId: rxServiceId,
          characteristicId: rxCharId,
          value: encoder(chunk),
          success: () => {
            console.log('📤 分片', chunkCount, '发送成功');
            setTimeout(sendNext, 50); // 增加间隔到50ms，确保硬件能处理
          },
          fail: (err) => {
            console.error('📤 分片', chunkCount, '发送失败:', err);
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
    wx.closeBLEConnection({
      deviceId: this.data.deviceId,
      success: () => {
        this.backToScan();
      },
      fail: () => {
        this.backToScan();
      }
    });
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
          // 断开当前连接
          wx.closeBLEConnection({
            deviceId: this.data.deviceId,
            success: () => {
              console.log('断开连接成功');
              // 重置状态
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
              
              // 重新连接
              setTimeout(() => {
                this.connect();
              }, 1000);
            },
            fail: (err) => {
              console.error('断开连接失败:', err);
              // 直接尝试重新连接
              this.connect();
            }
          });
        }
      }
    });
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
          
          // 强制订阅所有通知特征值
          this.subscribeAllNotifyCharacteristics();
          
          wx.showToast({
            title: '正在订阅...',
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
  }
});
