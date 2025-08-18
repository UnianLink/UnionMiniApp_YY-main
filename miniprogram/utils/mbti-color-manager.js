/**
 * MBTI颜色统一管理器
 * 统一处理主页和问卷页面的颜色保存逻辑，确保数据一致性
 * 颜色配置统一从 tagThemes.js 的 idleLightConfig 中获取，实现单一数据源
 */

// 引入统一的标签主题配置
const tagThemes = require('../config/tagThemes.js');

// 默认春樱落霞色（来自common.h LED_IDLE_COLOR定义）
const DEFAULT_IDLE_COLOR = '#F8DEF6';

// 颜色映射缓存，避免重复解析
let _colorMappingCache = null;
let _cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 缓存5分钟

class MBTIColorManager {
  /**
   * 从 tagThemes.js 的 idleLightConfig 中提取 MBTI 颜色映射（带缓存）
   * @returns {Object} MBTI类型到颜色的映射对象
   */
  static _extractMBTIColorMapping() {
    const now = Date.now();
    
    // 检查缓存是否有效
    if (_colorMappingCache && (now - _cacheTimestamp) < CACHE_DURATION) {
      console.log('📚 [MBTI颜色管理] 使用缓存的颜色映射');
      return _colorMappingCache;
    }
    
    const mapping = {};
    
    try {
      console.log('🔍 [MBTI颜色管理] 开始提取颜色映射...');
      
      // 检查 tagThemes 是否正确加载
      if (!tagThemes) {
        console.error('❌ [MBTI颜色管理] tagThemes 未正确加载');
        return mapping;
      }
      
      // 检查 idleLightConfig 结构
      if (!tagThemes.idleLightConfig) {
        console.error('❌ [MBTI颜色管理] tagThemes.idleLightConfig 不存在');
        return mapping;
      }
      
      if (!tagThemes.idleLightConfig.options || !Array.isArray(tagThemes.idleLightConfig.options)) {
        console.error('❌ [MBTI颜色管理] tagThemes.idleLightConfig.options 不是有效数组');
        return mapping;
      }
      
      console.log(`📋 [MBTI颜色管理] 找到 ${tagThemes.idleLightConfig.options.length} 个MBTI选项`);
      
      // 提取颜色映射
      tagThemes.idleLightConfig.options.forEach((option, index) => {
        if (!option.name || !option.color) {
          console.warn(`⚠️ [MBTI颜色管理] 第${index}个选项缺少name或color:`, option);
          return;
        }
        
        // 从 'INTJ战略家' 格式中提取 'INTJ'
        const mbtiType = option.name.substring(0, 4);
        if (mbtiType && mbtiType.length === 4) {
          mapping[mbtiType] = option.color;
          console.log(`✅ [MBTI颜色管理] 提取: ${mbtiType} → ${option.color}`);
        } else {
          console.warn(`⚠️ [MBTI颜色管理] 无效的MBTI类型格式: ${option.name}`);
        }
      });
      
      console.log(`🎯 [MBTI颜色管理] 颜色映射提取完成，共${Object.keys(mapping).length}种类型`);
      
      // 更新缓存
      _colorMappingCache = mapping;
      _cacheTimestamp = now;
      console.log('💾 [MBTI颜色管理] 颜色映射已缓存');
      
    } catch (error) {
      console.error('❌ [MBTI颜色管理] 提取颜色映射时发生错误:', error);
    }
    
    return mapping;
  }
  /**
   * 统一保存MBTI颜色的核心函数
   * @param {Object} options 配置选项
   * @param {string} options.mbtiType MBTI类型 (如 'ENFP')
   * @param {string} options.color 可选的自定义颜色 (如 '#FF5733')
   * @param {string} options.source 来源标识 (如 'mbti_selection', 'manual_selection', 'questionnaire_submit')
   * @param {boolean} options.syncToCloud 是否同步到云端 (默认true)
   * @param {boolean} options.sendToDevice 是否发送到设备 (默认true)
   * @param {boolean} options.showFeedback 是否显示用户反馈 (默认true)
   * @returns {Promise<Object>} 操作结果
   */
  static async saveMBTIColor(options = {}) {
    const {
      mbtiType,
      color: customColor,
      source = 'unknown',
      syncToCloud = true,
      sendToDevice = true,
      showFeedback = true
    } = options;

    console.log('🎨 [MBTI颜色管理] 开始统一保存流程:', {
      mbtiType,
      customColor,
      source,
      syncToCloud,
      sendToDevice,
      showFeedback
    });

    const result = {
      success: false,
      localSave: false,
      cloudSync: false,
      deviceSend: false,
      color: null,
      message: ''
    };

    try {
      // 1. 确定最终颜色
      const finalColor = customColor || this.getMBTIColor(mbtiType);
      if (!finalColor) {
        throw new Error(`无效的MBTI类型或颜色: ${mbtiType}`);
      }
      result.color = finalColor;

      // 2. 保存到本地存储（供设备页面使用）
      try {
        const rgbColor = this.hexToRgb(finalColor);
        wx.setStorageSync('pendingIdleLightColor', {
          color: rgbColor,
          mbtiType: mbtiType,
          source: source,
          timestamp: Date.now()
        });
        result.localSave = true;
        console.log('✅ [MBTI颜色管理] 本地存储保存成功');
      } catch (error) {
        console.error('❌ [MBTI颜色管理] 本地存储失败:', error);
      }

      // 3. 同步到云数据库（持久化）
      if (syncToCloud) {
        try {
          const cloudResult = await wx.cloud.callFunction({
            name: 'getUserData',
            data: {
              action: 'updateMBTI',
              mbtiData: {
                mbtiType: mbtiType,
                idleLightColor: finalColor,
                colorSource: source,
                lastColorUpdateTime: Date.now()
              }
            }
          });

          if (cloudResult.result && cloudResult.result.success) {
            result.cloudSync = true;
            console.log('✅ [MBTI颜色管理] 云端同步成功');
          } else {
            console.warn('⚠️ [MBTI颜色管理] 云端同步失败:', cloudResult.result?.message);
          }
        } catch (error) {
          console.error('❌ [MBTI颜色管理] 云端同步异常:', error);
        }
      } else {
        result.cloudSync = true; // 不需要同步时标记为成功
      }

      // 4. 发送到已连接的设备
      if (sendToDevice) {
        try {
          const deviceSendResult = await this.sendToConnectedDevice(finalColor, mbtiType, source);
          result.deviceSend = deviceSendResult;
          console.log(`${deviceSendResult ? '✅' : '⚠️'} [MBTI颜色管理] 设备发送${deviceSendResult ? '成功' : '失败或未连接'}`);
        } catch (error) {
          console.error('❌ [MBTI颜色管理] 设备发送异常:', error);
        }
      } else {
        result.deviceSend = true; // 不需要发送时标记为成功
      }

      // 5. 计算整体成功状态
      result.success = result.localSave && result.cloudSync;
      result.message = result.success ? 
        `MBTI颜色设置成功 (${mbtiType})` : 
        '颜色设置部分成功，请检查网络连接';

      // 6. 显示用户反馈
      if (showFeedback) {
        wx.showToast({
          title: result.success ? '颜色设置成功' : '设置部分成功',
          icon: result.success ? 'success' : 'none',
          duration: 2000
        });
      }

      console.log('🎯 [MBTI颜色管理] 统一保存完成:', result);
      return result;

    } catch (error) {
      console.error('❌ [MBTI颜色管理] 统一保存失败:', error);
      result.message = `颜色设置失败: ${error.message}`;
      
      if (showFeedback) {
        wx.showToast({
          title: '颜色设置失败',
          icon: 'error',
          duration: 2000
        });
      }
      
      return result;
    }
  }

  /**
   * 获取MBTI类型对应的颜色
   * @param {string} mbtiType MBTI类型代码 (如 'ENFP')
   * @returns {string} 十六进制颜色值，无效时返回春樱落霞色
   */
  static getMBTIColor(mbtiType) {
    if (!mbtiType || typeof mbtiType !== 'string') {
      return DEFAULT_IDLE_COLOR;
    }
    
    // 🎨 统一颜色来源：从 tagThemes.js 的 idleLightConfig 中动态获取
    const colorMapping = this._extractMBTIColorMapping();
    return colorMapping[mbtiType.toUpperCase()] || DEFAULT_IDLE_COLOR;
  }

  /**
   * 十六进制颜色转RGB对象
   */
  static hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') {
      // 返回春樱落霞色RGB值 (248,222,246)
      return { r: 248, g: 222, b: 246 };
    }
    
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length !== 6) {
      // 返回春樱落霞色RGB值 (248,222,246)
      return { r: 248, g: 222, b: 246 };
    }

    const r = parseInt(cleanHex.substr(0, 2), 16);
    const g = parseInt(cleanHex.substr(2, 2), 16);
    const b = parseInt(cleanHex.substr(4, 2), 16);
    
    // 检查解析结果是否有效
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      // 返回春樱落霞色RGB值 (248,222,246)
      return { r: 248, g: 222, b: 246 };
    }
    
    return { r, g, b };
  }

  /**
   * RGB对象转十六进制颜色
   */
  static rgbToHex(rgb) {
    if (!rgb || typeof rgb !== 'object') {
      return DEFAULT_IDLE_COLOR;
    }

    const { r = 248, g = 222, b = 246 } = rgb;
    const toHex = (n) => {
      const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  /**
   * 发送颜色到已连接的设备
   */
  static async sendToConnectedDevice(color, mbtiType, source) {
    try {
      // 获取当前所有页面
      const pages = getCurrentPages();
      const devicePage = pages.find(page => 
        page.route === 'pages/device/device' || 
        page.__route__ === 'pages/device/device'
      );

      if (!devicePage) {
        console.log('📱 [MBTI颜色管理] 设备页面未找到，跳过设备发送');
        return false;
      }

      // 检查设备连接状态
      if (!devicePage.data || !devicePage.data.connected) {
        console.log('🔌 [MBTI颜色管理] 设备未连接，跳过设备发送');
        return false;
      }

      // 检查设备页面是否有发送颜色的函数
      if (typeof devicePage.checkAndSendPendingIdleLightColor !== 'function') {
        console.log('⚠️ [MBTI颜色管理] 设备页面缺少颜色发送函数');
        return false;
      }

      // 调用设备页面的颜色发送函数
      console.log('📤 [MBTI颜色管理] 发送颜色到已连接设备...');
      await devicePage.checkAndSendPendingIdleLightColor();
      
      return true;

    } catch (error) {
      console.error('❌ [MBTI颜色管理] 设备发送异常:', error);
      return false;
    }
  }

  /**
   * 获取当前MBTI颜色设置
   */
  static getCurrentMBTISettings() {
    try {
      const settings = wx.getStorageSync('pendingIdleLightColor');
      if (settings) {
        return {
          mbtiType: settings.mbtiType,
          color: settings.color,
          hexColor: this.rgbToHex(settings.color),
          source: settings.source,
          timestamp: settings.timestamp
        };
      }
      return null;
    } catch (error) {
      console.error('❌ [MBTI颜色管理] 获取当前设置失败:', error);
      return null;
    }
  }

  /**
   * 清除MBTI颜色设置
   */
  static clearMBTISettings() {
    try {
      wx.removeStorageSync('pendingIdleLightColor');
      console.log('🗑️ [MBTI颜色管理] 颜色设置已清除');
      return true;
    } catch (error) {
      console.error('❌ [MBTI颜色管理] 清除设置失败:', error);
      return false;
    }
  }

  /**
   * 获取所有支持的MBTI类型和颜色
   * @returns {Object} 从 tagThemes.js 动态提取的 MBTI 类型颜色映射
   */
  static getAllMBTIColors() {
    return { ...this._extractMBTIColorMapping() };
  }

  /**
   * 验证MBTI类型是否有效
   * @param {string} mbtiType MBTI类型代码
   * @returns {boolean} 是否为有效的MBTI类型
   */
  static isValidMBTIType(mbtiType) {
    if (!mbtiType || typeof mbtiType !== 'string') {
      return false;
    }
    
    const colorMapping = this._extractMBTIColorMapping();
    return colorMapping.hasOwnProperty(mbtiType.toUpperCase());
  }

  /**
   * 验证颜色格式是否有效
   */
  static isValidColorFormat(color) {
    if (!color || typeof color !== 'string') {
      return false;
    }
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }

  /**
   * 清除颜色映射缓存（用于调试或强制重新加载）
   */
  static clearColorMappingCache() {
    _colorMappingCache = null;
    _cacheTimestamp = 0;
    console.log('🗑️ [MBTI颜色管理] 颜色映射缓存已清除');
  }
}

module.exports = MBTIColorManager;