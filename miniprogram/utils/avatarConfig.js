/**
 * 🖼️ 头像配置管理 - v2025.8.26.11
 * 
 * 功能说明：
 * 统一管理默认头像配置，使用简洁的圆形用户图标
 */

const AvatarConfig = {
  // 🎭 默认头像路径配置
  DEFAULT_AVATAR_PATH: '/assets/default-avatar.svg',
  DEFAULT_AVATAR_PNG: '/assets/default-avatar.png',
  
  // 🎨 获取默认头像URL（统一使用简洁头像）
  getDefaultAvatarUrl(seed = 'default', style = null) {
    // 不再使用动态生成，统一返回本地默认头像
    return this.DEFAULT_AVATAR_PATH;
  },
  
  // 🎨 为用户生成统一头像URL
  getUserAvatarUrl(userInfo) {
    // 统一返回默认头像，不再基于用户信息生成
    return this.DEFAULT_AVATAR_PATH;
  },
  
  // 🔄 头像URL刷新策略
  needsRefresh(avatarUrl) {
    if (!avatarUrl) return true;
    
    // 检查是否是需要更新的旧头像
    const oldPatterns = [
      '132.232.99.205',    // 旧的服务器地址
      'bottts-neutral',    // 旧的机器人风格  
      'robohash',          // 机器人哈希风格
      'dicebear.com',      // DiceBear动态头像
      'api.dicebear'       // DiceBear API
    ];
    
    return oldPatterns.some(pattern => avatarUrl.includes(pattern));
  },
  
  // ✨ 获取备用头像（PNG格式）
  getFallbackAvatarUrl() {
    return this.DEFAULT_AVATAR_PNG;
  },
  
  // 🌐 头像加载错误处理
  handleAvatarError() {
    console.log('头像加载失败，使用默认头像');
    return this.DEFAULT_AVATAR_PATH;
  }
};

module.exports = AvatarConfig;