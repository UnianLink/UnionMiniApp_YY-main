/**
 * 社群页面 - briefing.js (最简版)
 * 
 * 功能说明：
 * 基础页面，无复杂功能
 */

// 引入全局配置
const Config = require('../../utils/config.js');

Page({
  data: {
    message: '社群报告页面',
    classifications: [],
    currentThemeIndex: 0, // 当前选中的主题索引
    currentUserOpenId: '', // 当前用户的openid
    targetTheme: '', // 目标主题名称
    targetThemeIndex: -1, // 目标主题索引
    hideThemeSwitcher: false, // 是否隐藏主题切换器
    showCommunityPreview: false, // 是否显示社群详情弹窗
    selectedCommunity: {}, // 选中的社群数据
    texts: {},
  },

  switchTheme: function(e) {
    const index = e.currentTarget.dataset.index;
    if (this.data.currentThemeIndex !== index) {
      this.setData({
        currentThemeIndex: index
      });
    }
  },

  onLoad(options) {
    console.log('[BriefingPage] 页面加载', options);
    
    // 初始化文字配置
    this.initTextConfig();
    
    // 检查是否有传入的主题参数
    if (options.theme && options.themeIndex !== undefined) {
      const targetTheme = decodeURIComponent(options.theme);
      const targetThemeIndex = parseInt(options.themeIndex);
      
      console.log('接收到目标主题:', targetTheme, '索引:', targetThemeIndex);
      
      this.setData({
        targetTheme: targetTheme,
        targetThemeIndex: targetThemeIndex,
        currentThemeIndex: targetThemeIndex,
        hideThemeSwitcher: true // 隐藏主题切换器
      });
    }
    
    wx.showLoading({
      title: this.data.texts.loading || '正在加载社群数据...',
    });

    // 直接从 class_bar 读取分类结果（数据应该已经在connect页面生成）
    // 🔧 优化：class_bar 集合只包含一条文档，添加 limit(1) 避免全表扫描告警
    const db = wx.cloud.database();
    db.collection('class_bar').limit(1).get({
      success: res => {
        console.log('从class_bar获取数据成功', res.data);
        console.log('class_bar原始数据结构检查:', res.data);
        
        // 根据README文档，数据结构应该是 res.data[0].data
        let classifications = [];
        if (res.data && res.data.length > 0 && res.data[0].data) {
          classifications = res.data[0].data;
          console.log('解析出的主题数组:', classifications);
        } else {
          console.error('class_bar数据结构不符合预期');
          classifications = res.data; // 降级处理
        }

        // 获取当前用户openid并重排序
        wx.cloud.callFunction({
          name: 'login',
          success: loginRes => {
            const openid = loginRes.result.openid;
            const reorderedClassifications = classifications.map(theme => {
              theme.communities.forEach(community => {
                const userIndex = community.members.findIndex(member => member.openid === openid);
                if (userIndex > 0) {
                  const user = community.members.splice(userIndex, 1)[0];
                  community.members.unshift(user);
                }
                // 创建一个只包含前3个成员的数组用于显示
                community.displayMembers = community.members.slice(0, 3);
              });
              return theme;
            });

            // 如果有指定目标主题，尝试匹配并设置正确的索引
            let finalThemeIndex = this.data.currentThemeIndex;
            if (this.data.targetTheme && this.data.hideThemeSwitcher) {
              const themeIndex = reorderedClassifications.findIndex(theme => theme.theme === this.data.targetTheme);
                
                if (themeIndex !== -1) {
                  finalThemeIndex = themeIndex;
                  console.log('匹配到目标主题:', this.data.targetTheme, '设置索引为:', finalThemeIndex);
                } else {
                console.warn('未找到匹配的主题:', this.data.targetTheme, '可用主题:', reorderedClassifications.map(t => t.theme));
              }
            }

            this.setData({
              classifications: reorderedClassifications,
              currentUserOpenId: openid,
              currentThemeIndex: finalThemeIndex
            });
            wx.hideLoading();
          },
          fail: loginErr => {
            console.error('获取用户信息失败', loginErr);
            this.setData({ 
              classifications,
              currentUserOpenId: '' // 失败时清空
            });
            wx.hideLoading();
          }
        });
      },
      fail: err => {
        console.error('从class_bar获取数据失败', err);
        wx.hideLoading();
        wx.showToast({
          title: this.data.texts.error || '获取社群数据失败',
          icon: 'none'
        });
      }
    });
  },

  // 初始化文字配置
  initTextConfig() {
    // 初始化所有需要的文字
    const texts = Config.getTexts({
      // 页面标题
      title: 'briefing.title',
      titleWithTheme: 'briefing.titleWithTheme',
      subtitle: 'briefing.subtitle',
      subtitleWithTheme: 'briefing.subtitleWithTheme',
      loading: 'briefing.loading',
      empty: 'briefing.empty',
      
      // 成员相关
      membersJoined: 'briefing.members.joined',
      noMembers: 'briefing.members.noMembers',
      sectionTitle: 'briefing.members.sectionTitle',
      scrollHint: 'briefing.members.scrollHint',
      
      // 弹窗相关
      modalClose: 'briefing.modal.close',
      unknownCommunity: 'briefing.modal.unknownCommunity',
      unknownTheme: 'briefing.modal.unknownTheme',
      noDescription: 'briefing.modal.noDescription',
      anonymousUser: 'briefing.modal.anonymousUser',
      totalMembers: 'briefing.modal.totalMembers',
      
      // 通用文字
      confirm: 'common.confirm',
      cancel: 'common.cancel',
      close: 'common.close',
      loading: 'common.loading',
      error: 'common.error',
      retry: 'common.retry',
      noData: 'common.noData',
      success: 'common.success',
      fail: 'common.fail'
    });

    this.setData({ texts });
  },

  onShow: function() {
    console.log('[BriefingPage] 页面显示');
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected('/pages/briefing/briefing');
    }
  },

  onHide: function() {
    console.log('[BriefingPage] 页面隐藏');
  },

  onUnload: function() {
    console.log('[BriefingPage] 页面卸载');
  },

  // 显示社群详情
  showCommunityDetail: function(e) {
    const communityIndex = e.currentTarget.dataset.communityIndex;
    const currentTheme = this.data.classifications[this.data.currentThemeIndex];
    
    if (!currentTheme || !currentTheme.communities || communityIndex >= currentTheme.communities.length) {
      console.error('社群索引无效:', communityIndex);
      wx.showToast({
        title: this.data.texts.error || '社群信息异常',
        icon: 'none'
      });
      return;
    }

    const community = currentTheme.communities[communityIndex];
    
    console.log('=== 显示社群详情 ===');
    console.log('社群:', community.name);
    console.log('成员数量:', community.members ? community.members.length : 0);

    if (!community.members || community.members.length === 0) {
      wx.showToast({
        title: this.data.texts.noMembers || '该社群暂无成员',
        icon: 'none'
      });
      return;
    }

    // 设置弹窗数据
    this.setData({
      showCommunityPreview: true,
      selectedCommunity: {
        ...community,
        themeName: currentTheme.theme,
        themeAvatar: '/images/uinon logo4.png', // 使用默认主题头像
        totalMembers: community.members.length
      }
    });

    console.log('显示社群详情弹窗:', {
      社群名称: community.name,
      主题: currentTheme.theme,
      成员数量: community.members.length
    });
  },

  // 关闭社群详情弹窗
  closeCommunityPreview: function() {
    this.setData({
      showCommunityPreview: false,
      selectedCommunity: {}
    });
  },

  // 查看用户详情（可以后续扩展）
  viewUserProfile: function(e) {
    const openid = e.currentTarget.dataset.openid;
    console.log('查看用户详情:', openid);
    
    // 这里可以后续添加用户详情查看功能
    wx.showToast({
      title: '用户详情功能开发中',
      icon: 'none'
    });
  }
});