/**
 * 智能弹窗管理器
 * 解决弹窗过多、重复弹出、跨页面污染问题
 * 
 * 核心功能：
 * 1. 页面感知：仅在指定页面显示特定类型弹窗
 * 2. 智能去重：相同内容3秒内不重复弹出  
 * 3. 静默模式：连接失败默默处理，减少用户打扰
 * 4. 优先级管理：重要弹窗优先显示
 */

class SmartModalManager {
  constructor() {
    this.recentModals = new Map(); // 去重记录: key -> timestamp
    this.silentMode = {
      connectionErrors: true,  // 连接错误静默模式
      deviceNotFound: false   // 设备未找到首次提醒
    };
    this.dedupeTimeout = 3000; // 去重时间窗口(ms)
  }

  /**
   * 检查当前是否在指定页面
   */
  isInTargetPage(pageRoute) {
    try {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const currentRoute = currentPage.route;
      return currentRoute.includes(pageRoute);
    } catch (error) {
      console.warn('[SmartModal] 页面检测失败:', error);
      return false; // 默认不显示，避免污染
    }
  }

  /**
   * 生成弹窗唯一标识
   */
  generateKey(type, title, content = '') {
    return `${type}:${title}:${content}`;
  }

  /**
   * 检查是否应该去重
   */
  shouldDedupe(key) {
    const now = Date.now();
    const lastShown = this.recentModals.get(key);
    
    if (lastShown && (now - lastShown) < this.dedupeTimeout) {
      console.log(`[SmartModal] 弹窗去重: ${key}`);
      return true;
    }
    
    this.recentModals.set(key, now);
    return false;
  }

  /**
   * 清理过期的去重记录
   */
  cleanupOldRecords() {
    const now = Date.now();
    for (const [key, timestamp] of this.recentModals.entries()) {
      if (now - timestamp > this.dedupeTimeout * 2) {
        this.recentModals.delete(key);
      }
    }
  }

  /**
   * 智能显示连接相关弹窗
   * 仅在设备页面显示，支持静默模式
   */
  showConnectionModal(type, title, content, options = {}) {
    // 1. 页面限制：仅在设备页面显示连接弹窗
    if (!this.isInTargetPage('pages/device')) {
      console.log(`[SmartModal] 跨页面连接弹窗被拦截: ${title} (当前不在设备页面)`);
      return;
    }

    // 2. 静默模式检查
    if (this.silentMode.connectionErrors && type === 'connectionError') {
      console.log(`[SmartModal] 连接错误静默处理: ${title}`);
      return;
    }

    // 3. 去重检查
    const key = this.generateKey('connection', title, content);
    if (this.shouldDedupe(key)) {
      return;
    }

    // 4. 特殊处理："设备未找到"只弹一次
    if (title.includes('设备未找到')) {
      if (this.silentMode.deviceNotFound) {
        console.log(`[SmartModal] 设备未找到弹窗已显示过，跳过`);
        return;
      }
      this.silentMode.deviceNotFound = true;
      
      // 30秒后重置，允许下次弹出
      setTimeout(() => {
        this.silentMode.deviceNotFound = false;
      }, 30000);
    }

    // 5. 显示弹窗
    this.displayModal(type, title, content, options);
  }

  /**
   * 显示常规弹窗（非连接相关）
   */
  showRegularModal(type, title, content, options = {}) {
    const key = this.generateKey('regular', title, content);
    if (this.shouldDedupe(key)) {
      return;
    }
    
    this.displayModal(type, title, content, options);
  }

  /**
   * 实际显示弹窗的方法
   */
  displayModal(type, title, content, options = {}) {
    this.cleanupOldRecords();
    
    switch (type) {
      case 'toast':
        wx.showToast({
          title,
          icon: options.icon || 'none',
          duration: options.duration || 2000,
          ...options
        });
        break;
        
      case 'modal':
        wx.showModal({
          title,
          content,
          showCancel: options.showCancel !== false,
          confirmText: options.confirmText || '确定',
          cancelText: options.cancelText || '取消',
          success: options.success || (() => {}),
          ...options
        });
        break;
        
      case 'connectionError':
        // 连接错误特殊处理：更温和的提示
        wx.showModal({
          title: '连接提示',
          content,
          showCancel: true,
          confirmText: '重试',
          cancelText: '返回',
          success: options.success || (() => {}),
          ...options
        });
        break;
        
      default:
        console.warn(`[SmartModal] 未知弹窗类型: ${type}`);
    }
    
    console.log(`[SmartModal] 显示弹窗: ${type} - ${title}`);
  }

  /**
   * 设置静默模式
   */
  setSilentMode(type, enabled) {
    if (this.silentMode.hasOwnProperty(type)) {
      this.silentMode[type] = enabled;
      console.log(`[SmartModal] 静默模式设置: ${type} = ${enabled}`);
    }
  }

  /**
   * 清空所有去重记录
   */
  clearAllRecords() {
    this.recentModals.clear();
    this.silentMode.deviceNotFound = false;
    console.log('[SmartModal] 清空所有弹窗记录');
  }

  /**
   * 获取管理器状态
   */
  getStatus() {
    return {
      recentModalsCount: this.recentModals.size,
      silentMode: { ...this.silentMode },
      dedupeTimeout: this.dedupeTimeout
    };
  }
}

// 创建全局单例
const smartModalManager = new SmartModalManager();

// 导出便捷方法
module.exports = {
  // 连接相关弹窗（仅在设备页面显示）
  connectionToast: (title, options = {}) => {
    smartModalManager.showConnectionModal('toast', title, '', options);
  },
  
  connectionModal: (title, content, options = {}) => {
    smartModalManager.showConnectionModal('modal', title, content, options);
  },
  
  connectionError: (title, content, options = {}) => {
    smartModalManager.showConnectionModal('connectionError', title, content, options);
  },
  
  // 常规弹窗（全页面通用）
  toast: (title, options = {}) => {
    smartModalManager.showRegularModal('toast', title, '', options);
  },
  
  modal: (title, content, options = {}) => {
    smartModalManager.showRegularModal('modal', title, content, options);
  },
  
  // 管理器控制
  setSilentMode: (type, enabled) => {
    smartModalManager.setSilentMode(type, enabled);
  },
  
  clearRecords: () => {
    smartModalManager.clearAllRecords();
  },
  
  getStatus: () => {
    return smartModalManager.getStatus();
  },
  
  // 获取管理器实例（供测试使用）
  getManager: () => smartModalManager
};