/**
 * 📱 BLE硬件设备配置文件
 * 用于控制ESP32硬件端的各种参数配置
 * 可通过小程序实时发送给硬件设备进行动态调整
 */

const BleHardwareConfig = {
  // ===== 🔄 心跳和连接参数 =====
  
  /**
   * 硬件心跳间隔（毫秒）
   * 控制硬件端心跳任务的执行频率
   * 调试建议：
   * - 设置过短(如1000ms)：增加功耗，可能触发看门狗
   * - 设置过长(如15000ms)：降低响应性，影响实时性
   * - 推荐值：6000ms，平衡功耗和响应速度
   */
  HEARTBEAT_INTERVAL_MS: 6000,

  /**
   * 连接超时时间（毫秒）
   * 硬件端等待小程序响应的最大时间
   */
  CONNECTION_TIMEOUT_MS: 10000,

  /**
   * 数据同步间隔（毫秒）
   * 硬件向小程序发送数据的间隔
   */
  DATA_SYNC_INTERVAL_MS: 30000,

  // ===== 🎯 TAG匹配参数 =====
  
  /**
   * TAG匹配阈值
   * 需要多少个相同TAG才能触发灯光显示
   * 调试建议：
   * - 设置过低(如1-2)：容易误匹配，LED频繁亮起
   * - 设置过高(如8-10)：匹配条件严格，很难触发
   * - 推荐值：4，适合大部分用户的兴趣匹配
   */
  TAG_MATCH_THRESHOLD: 4,

  /**
   * TAG匹配最大距离（米）
   * 超过此距离的设备不参与TAG匹配
   */
  TAG_MATCH_MAX_DISTANCE: 50.0,

  // ===== 💡 LED控制参数 =====
  
  /**
   * 近距离阈值（米）
   * 小于此值触发近距离特效（七彩灯或共同标签颜色）
   */
  LED_NEAR_DISTANCE_THRESHOLD: 0.10,

  /**
   * 远距离呼吸灯周期（毫秒）
   * 远距离设备匹配时的呼吸灯周期
   */
  LED_BREATH_PERIOD_FAR: 3000,

  /**
   * 近距离快速呼吸周期（毫秒）
   * 极近距离时显示共同标签颜色的呼吸周期
   */
  LED_COMMON_TAGS_BREATH_PERIOD: 200,

  /**
   * LED亮度设置（0-255）
   * 所有LED效果的最大亮度
   */
  LED_MAX_BRIGHTNESS: 255,

  // ===== 🔋 功耗管理参数 =====
  
  /**
   * 空闲模式超时（毫秒）
   * 多长时间无设备活动后进入空闲模式
   */
  IDLE_TIMEOUT_MS: 30000,

  /**
   * 睡眠模式超时（毫秒）
   * 多长时间无设备活动后进入睡眠模式
   */
  SLEEP_TIMEOUT_MS: 120000,

  /**
   * 设备超时时间（毫秒）
   * 设备多长时间未更新RSSI则认为已离开
   */
  DEVICE_TIMEOUT_MS: 4000,

  // ===== 📡 BLE扫描参数 =====
  
  /**
   * 高性能模式开关
   * true: 高性能模式，更快响应但功耗高
   * false: 省电模式，平衡性能与功耗
   */
  HIGH_PERFORMANCE_MODE: true,

  /**
   * RSSI滤波样本数
   * 用于滑动平均的RSSI样本数量
   */
  RSSI_FILTER_SAMPLES: 4,

  // ===== 💾 数据存储参数 =====
  
  /**
   * 碰一碰列表最大容量
   * 硬件端可存储的最大碰一碰记录数
   */
  MAX_TOUCH_RECORDS: 2000,

  /**
   * Flash自动保存间隔（毫秒）
   * 多长时间自动保存一次数据到Flash
   */
  FLASH_AUTO_SAVE_INTERVAL_MS: 30000,

  // ===== 🔧 调试和日志控制 =====
  
  /**
   * 日志级别
   * 0: 静默, 1: 精简, 2: 正常, 3: 详细
   */
  LOG_LEVEL: 1,

  /**
   * 是否启用设备扫描日志
   * true: 显示设备扫描详情, false: 隐藏扫描日志
   */
  ENABLE_SCAN_DEBUG_LOG: false,

  /**
   * 是否启用TAG匹配详细日志
   * true: 显示TAG解码和匹配详情, false: 只显示结果
   */
  ENABLE_TAG_DEBUG_LOG: false,

  // ===== 🌐 网络和云同步参数 =====
  
  /**
   * 云同步重试次数
   * 小程序向云端同步数据失败时的重试次数
   */
  CLOUD_SYNC_RETRIES: 3,

  /**
   * 云同步超时时间（毫秒）
   * 云函数调用的超时时间
   */
  CLOUD_SYNC_TIMEOUT_MS: 10000,

  // ===== 📱 小程序端行为控制 =====
  
  /**
   * 实时数据监听间隔（毫秒）
   * 小程序检查数据更新的频率
   */
  REALTIME_LISTENER_INTERVAL_MS: 2000,

  /**
   * 朋友列表自动刷新间隔（毫秒）
   * 朋友页面自动刷新数据的间隔
   */
  FRIENDS_AUTO_REFRESH_INTERVAL_MS: 30000,

  /**
   * BLE连接重试次数
   * 小程序连接硬件失败时的重试次数
   */
  BLE_CONNECTION_RETRIES: 3,

  /**
   * BLE连接超时（毫秒）
   * 单次BLE连接尝试的超时时间
   */
  BLE_CONNECTION_TIMEOUT_MS: 15000
};

// 生成配置更新消息的辅助函数
const BleConfigHelper = {
  /**
   * 生成心跳间隔配置消息
   * @param {number} intervalMs 心跳间隔（毫秒）
   * @returns {string} JSON格式的配置消息
   */
  createHeartbeatConfigMessage(intervalMs) {
    return JSON.stringify({
      type: "set_heartbeat_interval",
      interval_ms: intervalMs,
      timestamp: Date.now()
    });
  },

  /**
   * 生成TAG阈值配置消息
   * @param {number} threshold TAG匹配阈值
   * @returns {string} JSON格式的配置消息
   */
  createTagThresholdConfigMessage(threshold) {
    return JSON.stringify({
      type: "set_threshold",
      threshold: threshold,
      timestamp: Date.now()
    });
  },

  /**
   * 生成LED参数配置消息
   * @param {Object} ledConfig LED配置对象
   * @returns {string} JSON格式的配置消息
   */
  createLedConfigMessage(ledConfig) {
    return JSON.stringify({
      type: "set_led_config",
      near_distance: ledConfig.nearDistance || BleHardwareConfig.LED_NEAR_DISTANCE_THRESHOLD,
      breath_period_far: ledConfig.breathPeriodFar || BleHardwareConfig.LED_BREATH_PERIOD_FAR,
      max_brightness: ledConfig.maxBrightness || BleHardwareConfig.LED_MAX_BRIGHTNESS,
      timestamp: Date.now()
    });
  },

  /**
   * 生成功耗管理配置消息
   * @param {Object} powerConfig 功耗配置对象
   * @returns {string} JSON格式的配置消息
   */
  createPowerConfigMessage(powerConfig) {
    return JSON.stringify({
      type: "set_power_config",
      idle_timeout_ms: powerConfig.idleTimeoutMs || BleHardwareConfig.IDLE_TIMEOUT_MS,
      sleep_timeout_ms: powerConfig.sleepTimeoutMs || BleHardwareConfig.SLEEP_TIMEOUT_MS,
      high_performance: powerConfig.highPerformance !== undefined ? powerConfig.highPerformance : BleHardwareConfig.HIGH_PERFORMANCE_MODE,
      timestamp: Date.now()
    });
  },

  /**
   * 生成完整设备配置消息
   * @param {Object} config 配置对象（可选，使用默认配置）
   * @returns {string} JSON格式的完整配置消息
   */
  createFullConfigMessage(config = {}) {
    const fullConfig = { ...BleHardwareConfig, ...config };
    return JSON.stringify({
      type: "set_full_config",
      config: fullConfig,
      timestamp: Date.now()
    });
  },

  /**
   * 验证配置参数的有效性
   * @param {string} configType 配置类型
   * @param {*} value 配置值
   * @returns {boolean} 是否有效
   */
  validateConfig(configType, value) {
    switch (configType) {
      case 'heartbeat_interval':
        return value >= 1000 && value <= 60000; // 1秒到60秒
      case 'tag_threshold':
        return value >= 1 && value <= 20; // 1到20个TAG
      case 'led_brightness':
        return value >= 0 && value <= 255; // LED亮度范围
      case 'timeout':
        return value >= 1000 && value <= 300000; // 1秒到5分钟
      default:
        return true; // 未知类型默认通过
    }
  }
};

// 预设配置模板
const BleConfigPresets = {
  // 高性能模式配置
  highPerformance: {
    HEARTBEAT_INTERVAL_MS: 3000,
    HIGH_PERFORMANCE_MODE: true,
    LED_MAX_BRIGHTNESS: 255,
    IDLE_TIMEOUT_MS: 15000,
    SLEEP_TIMEOUT_MS: 60000,
    LOG_LEVEL: 2
  },

  // 省电模式配置
  powerSaving: {
    HEARTBEAT_INTERVAL_MS: 10000,
    HIGH_PERFORMANCE_MODE: false,
    LED_MAX_BRIGHTNESS: 150,
    IDLE_TIMEOUT_MS: 60000,
    SLEEP_TIMEOUT_MS: 300000,
    LOG_LEVEL: 1
  },

  // 调试模式配置
  debug: {
    HEARTBEAT_INTERVAL_MS: 5000,
    LOG_LEVEL: 3,
    ENABLE_SCAN_DEBUG_LOG: true,
    ENABLE_TAG_DEBUG_LOG: true,
    REALTIME_LISTENER_INTERVAL_MS: 1000
  },

  // 生产模式配置
  production: {
    HEARTBEAT_INTERVAL_MS: 6000,
    LOG_LEVEL: 0,
    ENABLE_SCAN_DEBUG_LOG: false,
    ENABLE_TAG_DEBUG_LOG: false,
    HIGH_PERFORMANCE_MODE: true
  }
};

// 导出配置对象和辅助函数
module.exports = {
  BleHardwareConfig,
  BleConfigHelper,
  BleConfigPresets
};

/**
 * 🔧 使用指南
 * 
 * 1. 基础使用：
 *    const { BleHardwareConfig } = require('./ble-hardware-config.js');
 *    const heartbeatInterval = BleHardwareConfig.HEARTBEAT_INTERVAL_MS;
 * 
 * 2. 发送配置到硬件：
 *    const { BleConfigHelper } = require('./ble-hardware-config.js');
 *    const message = BleConfigHelper.createHeartbeatConfigMessage(8000);
 *    // 通过BLE发送message到硬件
 * 
 * 3. 使用预设配置：
 *    const { BleConfigPresets } = require('./ble-hardware-config.js');
 *    const config = BleConfigPresets.powerSaving;
 *    const message = BleConfigHelper.createFullConfigMessage(config);
 * 
 * 4. 参数验证：
 *    const isValid = BleConfigHelper.validateConfig('heartbeat_interval', 5000);
 * 
 * 5. 在设备页面中使用：
 *    // 在pages/device/device.js中
 *    const { BleHardwareConfig, BleConfigHelper } = require('../../config/ble-hardware-config.js');
 *    
 *    // 发送心跳间隔配置
 *    sendHeartbeatConfig(intervalMs) {
 *      const message = BleConfigHelper.createHeartbeatConfigMessage(intervalMs);
 *      this.sendBleMessage(message);
 *    }
 * 
 * 修改建议：
 * - 调整HEARTBEAT_INTERVAL_MS可以控制硬件响应速度和功耗
 * - 修改TAG_MATCH_THRESHOLD可以调整标签匹配的敏感度
 * - 设置HIGH_PERFORMANCE_MODE可以在性能和功耗间切换
 * - 通过LOG_LEVEL控制调试信息的详细程度
 */