/**
 * 🖼️ 头像配置管理 - v2025.8.26.10
 * 
 * 功能说明：
 * 统一管理默认头像配置，提供美观的头像选择
 */

const AvatarConfig = {
  // 🎨 美观的默认头像配置
  defaultAvatarStyles: [
    'adventurer', // 冒险家风格 - 简约现代
    'avataaars', // 卡通风格 - 友好可爱
    'big-smile', // 微笑风格 - 温暖阳光
    'fun-emoji', // 表情符号风格 - 活泼有趣
    'lorelei',   // 优雅风格 - 文艺清新
    'personas'   // 人格化风格 - 个性突出
  ],
  
  // 🌈 头像颜色主题
  colorThemes: [
    'pastel',    // 柔和色彩
    'vibrant',   // 鲜艳色彩
    'muted',     // 柔和低调
    'bright'     // 明亮色彩
  ],
  
  // 🎭 获取默认头像URL
  getDefaultAvatarUrl(seed = 'default', style = 'adventurer') {
    // 确保使用可用的风格
    const validStyle = this.defaultAvatarStyles.includes(style) ? style : 'adventurer';
    
    // 根据种子选择颜色主题
    const themeIndex = this.hashString(seed) % this.colorThemes.length;
    const theme = this.colorThemes[themeIndex];
    
    // 生成美观的头像URL
    const encodedSeed = encodeURIComponent(seed);
    return `https://api.dicebear.com/7.x/${validStyle}/svg?seed=${encodedSeed}&backgroundColor=${theme}`;
  },
  
  // 🎨 为用户生成个性化头像URL
  getUserAvatarUrl(userInfo) {
    // 使用用户昵称或其他标识作为种子
    const seed = userInfo.nickName || userInfo.displayName || userInfo.openid || 'anonymous';
    
    // 根据用户特征选择头像风格
    let style = 'adventurer'; // 默认风格
    
    if (userInfo.personalityTags) {
      // 根据性格标签选择合适的头像风格
      const personality = userInfo.personalityTags.join('').toLowerCase();
      if (personality.includes('enfp') || personality.includes('开朗')) {
        style = 'big-smile';
      } else if (personality.includes('intj') || personality.includes('内向')) {
        style = 'lorelei';
      } else if (personality.includes('创意') || personality.includes('艺术')) {
        style = 'avataaars';
      } else if (personality.includes('活泼')) {
        style = 'fun-emoji';
      }
    }
    
    return this.getDefaultAvatarUrl(seed, style);
  },
  
  // 🎯 简单的字符串哈希函数
  hashString(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return Math.abs(hash);
  },
  
  // 🔄 头像URL刷新策略
  needsRefresh(avatarUrl) {
    if (!avatarUrl) return true;
    
    // 检查是否是旧的默认头像需要更新
    const oldPatterns = [
      '132.232.99.205', // 旧的服务器地址
      'bottts-neutral', // 旧的机器人风格
      'robohash'        // 机器人哈希风格
    ];
    
    return oldPatterns.some(pattern => avatarUrl.includes(pattern));
  },
  
  // ✨ 获取高质量头像配置
  getHighQualityConfig() {
    return {
      format: 'svg',        // 使用SVG格式，支持任意缩放
      size: '200',         // 基础尺寸
      backgroundColor: 'transparent', // 透明背景
      radius: '50'         // 圆角配置
    };
  }
};

module.exports = AvatarConfig;