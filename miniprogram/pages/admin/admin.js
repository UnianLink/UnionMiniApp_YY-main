// 管理员页面 - 用于切换活动主题
const tagThemes = require('../../config/tagThemes.js');

Page({
  data: {
    themes: [],           // 所有可用主题
    currentTheme: '',     // 当前主题名称
    themeDetails: null,   // 当前主题详情
    tagStats: {},         // 标签统计
    colorEffects: [],     // 颜色效果预览
    isAdmin: false        // 是否是管理员
  },
  
  onLoad() {
    // 检查管理员权限（这里可以根据实际需求添加权限验证）
    this.checkAdminAuth();
    
    // 加载主题列表
    this.loadThemes();
  },
  
  /**
   * 检查管理员权限
   */
  checkAdminAuth() {
    // TODO: 实际项目中应该通过后端验证管理员身份
    // 这里暂时直接设置为true
    this.setData({
      isAdmin: true
    });
  },
  
  /**
   * 加载所有主题
   */
  loadThemes() {
    const themes = Object.keys(tagThemes.themes).map(key => ({
      id: key,
      name: tagThemes.themes[key].name,
      description: tagThemes.themes[key].description,
      isActive: key === tagThemes.currentTheme
    }));
    
    const currentThemeDetails = tagThemes.getCurrentTheme();
    const tagCount = tagThemes.getTagCount();
    
    // 统计各类标签数量
    const stats = {};
    currentThemeDetails.categories.forEach(cat => {
      stats[cat.name] = {
        count: cat.tags.length,
        color: tagThemes.config.colorMapping[cat.color],
        required: cat.required
      };
    });
    
    // 获取颜色效果
    const effects = Object.values(tagThemes.config.colorMapping);
    
    this.setData({
      themes: themes,
      currentTheme: tagThemes.currentTheme,
      themeDetails: currentThemeDetails,
      tagStats: {
        total: tagCount,
        max: tagThemes.config.maxTags,
        categories: stats
      },
      colorEffects: effects
    });
  },
  
  /**
   * 切换主题
   */
  onThemeSelect(e) {
    const themeId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '切换主题',
      content: `确定要切换到"${tagThemes.themes[themeId].name}"吗？\n\n注意：切换主题会影响所有用户的标签选择界面`,
      success: (res) => {
        if (res.confirm) {
          this.switchTheme(themeId);
        }
      }
    });
  },
  
  /**
   * 执行主题切换
   */
  switchTheme(themeId) {
    if (tagThemes.setTheme(themeId)) {
      // 重新加载主题
      this.loadThemes();
      
      // 保存到云端（可选）
      this.saveThemeToCloud(themeId);
      
      wx.showToast({
        title: '主题切换成功',
        icon: 'success'
      });
    } else {
      wx.showToast({
        title: '切换失败',
        icon: 'none'
      });
    }
  },
  
  /**
   * 保存主题设置到云端
   */
  saveThemeToCloud(themeId) {
    // TODO: 调用云函数保存当前主题设置
    console.log('保存主题到云端:', themeId);
  },
  
  /**
   * 查看标签详情
   */
  viewCategoryDetail(e) {
    const categoryName = e.currentTarget.dataset.name;
    const category = this.data.themeDetails.categories.find(c => c.name === categoryName);
    
    if (category) {
      wx.showModal({
        title: categoryName,
        content: `标签列表：\n${category.tags.join('、')}\n\n颜色属性：${category.color}\n最大可选：${category.maxSelect}个\n是否必选：${category.required ? '是' : '否'}`,
        showCancel: false
      });
    }
  },
  
  /**
   * 预览LED效果
   */
  previewLedEffect(e) {
    const effect = e.currentTarget.dataset.effect;
    
    wx.showModal({
      title: effect.name,
      content: `色相范围：${effect.hueRange[0]}° - ${effect.hueRange[1]}°\n适用场景：${effect.description}\nLED效果：${effect.ledEffect}`,
      showCancel: false
    });
  },
  
  /**
   * 导出当前配置
   */
  exportConfig() {
    const config = {
      theme: tagThemes.currentTheme,
      details: tagThemes.getCurrentTheme(),
      timestamp: new Date().toISOString()
    };
    
    const configStr = JSON.stringify(config, null, 2);
    
    wx.setClipboardData({
      data: configStr,
      success: () => {
        wx.showToast({
          title: '配置已复制到剪贴板',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },
  
  /**
   * 刷新页面
   */
  onRefresh() {
    this.loadThemes();
    wx.showToast({
      title: '已刷新',
      icon: 'success'
    });
  }
});