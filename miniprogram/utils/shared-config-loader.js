/**
 * 统一配置加载器
 * 从硬件配置自动生成的 shared-config.json 中加载配置
 * 
 * 使用方法:
 *   const sharedConfig = require('./utils/shared-config-loader.js');
 *   const defaultThreshold = sharedConfig.getDefaultTagThreshold();
 */

let sharedConfigData = null;

/**
 * 懒加载共享配置数据
 * 优先使用JS模块，确保小程序兼容性
 */
function loadSharedConfig() {
  if (sharedConfigData === null) {
    try {
      // 方法1: 优先使用JS模块 (小程序兼容性最好)
      sharedConfigData = require('../config/shared-config.js');
      console.log('[SharedConfig] ✅ 成功加载硬件同步配置(JS模块)，生成时间:', sharedConfigData.metadata?.generated_at);
      console.log('[SharedConfig] 📊 加载配置项数量:', Object.keys(sharedConfigData.values || {}).length);
      
    } catch (jsError) {
      console.warn('[SharedConfig] ⚠️ JS模块加载失败，尝试JSON文件:', jsError.message);
      
      try {
        // 方法2: 尝试JSON文件 (开发环境或Node.js环境)
        sharedConfigData = require('../config/shared-config.json');
        console.log('[SharedConfig] ✅ 成功加载配置JSON文件');
        console.log('[SharedConfig] 📊 加载配置项数量:', Object.keys(sharedConfigData.values || {}).length);
        
      } catch (jsonError) {
        console.error('[SharedConfig] ❌ 所有配置加载方式都失败:');
        console.error('[SharedConfig]   JS模块:', jsError.message);
        console.error('[SharedConfig]   JSON文件:', jsonError.message);
        console.error('[SharedConfig] 💡 使用内置的硬件同步配置');
        
        // 🔧 降级到与硬件同步的默认值 (从shared-config.json复制的值)
        sharedConfigData = {
          metadata: {
            generated_at: 'fallback-hardcoded',
            description: '内置硬件同步配置 - 与common.h保持一致',
            source_file: 'Unian_esp32c3_ble/NimBLE_Beacon/main/include/common.h'
          },
          values: {
            DEFAULT_TAG_THRESHOLD: 2,    // 🔧 与硬件DEFAULT_TAG_THRESHOLD同步
            MAX_TOUCH_RECORDS: 2000,     // 与硬件MAX_TOUCH_RECORDS同步
            TOUCH_LIST_BATCH_SIZE: 100,  // 与硬件TOUCH_LIST_BATCH_SIZE同步
            TOUCH_LIST_BATCH_INTERVAL_MS: 100, // 与硬件TOUCH_LIST_BATCH_INTERVAL_MS同步
            HIGH_PERFORMANCE_MODE: 1,    // 与硬件HIGH_PERFORMANCE_MODE同步
            BLUETOOTH_NAME_LEN: 17       // 与硬件BLUETOOTH_NAME_LEN同步
          }
        };
        
        console.warn('[SharedConfig] ⚠️ 使用内置硬件同步配置，DEFAULT_TAG_THRESHOLD = 2');
      }
    }
  }
  return sharedConfigData;
}

/**
 * 获取配置值
 * @param {string} key - 配置项名称
 * @param {*} defaultValue - 默认值
 * @returns {*} 配置值
 */
function getConfigValue(key, defaultValue = null) {
  const config = loadSharedConfig();
  const value = config.values[key];
  
  if (value !== undefined) {
    return value;
  }
  
  console.warn(`[SharedConfig] ⚠️ 配置项 ${key} 未找到，使用默认值:`, defaultValue);
  return defaultValue;
}

/**
 * 获取默认标签匹配阈值
 * @returns {number} 默认阈值
 */
function getDefaultTagThreshold() {
  return getConfigValue('DEFAULT_TAG_THRESHOLD', 4);
}

/**
 * 获取最大碰一碰记录数
 * @returns {number} 最大记录数
 */
function getMaxTouchRecords() {
  return getConfigValue('MAX_TOUCH_RECORDS', 2000);
}

/**
 * 获取蓝牙名称长度
 * @returns {number} 蓝牙名称长度
 */
function getBluetoothNameLength() {
  return getConfigValue('BLUETOOTH_NAME_LEN', 17);
}

/**
 * 获取批次发送大小
 * @returns {number} 批次大小
 */
function getTouchListBatchSize() {
  return getConfigValue('TOUCH_LIST_BATCH_SIZE', 100);
}

/**
 * 获取批次间隔时间
 * @returns {number} 间隔时间(ms)
 */
function getTouchListBatchInterval() {
  return getConfigValue('TOUCH_LIST_BATCH_INTERVAL_MS', 100);
}

/**
 * 获取高性能模式开关
 * @returns {number} 1=启用, 0=禁用
 */
function getHighPerformanceMode() {
  return getConfigValue('HIGH_PERFORMANCE_MODE', 1);
}

/**
 * 获取配置元数据
 * @returns {object} 元数据对象
 */
function getMetadata() {
  const config = loadSharedConfig();
  return config.metadata || {};
}

/**
 * 获取所有配置值
 * @returns {object} 所有配置值
 */
function getAllValues() {
  const config = loadSharedConfig();
  return config.values || {};
}

/**
 * 打印配置信息（调试用）
 */
function logConfigInfo() {
  const config = loadSharedConfig();
  const metadata = config.metadata || {};
  
  console.log('[SharedConfig] 📋 配置信息摘要:');
  console.log(`  生成时间: ${metadata.generated_at}`);
  console.log(`  源文件: ${metadata.source_file}`);
  console.log(`  版本: ${metadata.version}`);
  console.log('  关键配置:');
  console.log(`    DEFAULT_TAG_THRESHOLD: ${getDefaultTagThreshold()}`);
  console.log(`    MAX_TOUCH_RECORDS: ${getMaxTouchRecords()}`);
  console.log(`    BLUETOOTH_NAME_LEN: ${getBluetoothNameLength()}`);
}

module.exports = {
  // 通用配置访问
  getConfigValue,
  getAllValues,
  getMetadata,
  
  // 特定配置访问器
  getDefaultTagThreshold,
  getMaxTouchRecords,
  getBluetoothNameLength,
  getTouchListBatchSize,
  getTouchListBatchInterval,
  getHighPerformanceMode,
  
  // 调试工具
  logConfigInfo,
  
  // 兼容性别名
  DEFAULT_TAG_THRESHOLD: getDefaultTagThreshold(),
  MAX_TOUCH_RECORDS: getMaxTouchRecords(),
  BLUETOOTH_NAME_LEN: getBluetoothNameLength()
};