// app.js
App({
  globalData: {
    userInfo: null,
    logged: false,
    openid: '',
    tabBar: {
      selected: 2,
      lastUpdateTime: 0
    }
  },
  
  onLaunch: function() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'unionlink-4gkmzbm1babe86a7',
        traceUser: true,
      })
      
      console.log('云开发环境初始化成功');
      
      // 检查是否支持AI+能力
      if (wx.cloud.extend && wx.cloud.extend.AI) {
        console.log('微信AI+能力支持检查通过');
        // 获取Agent信息，确认连接正常
        this.checkAgentStatus();
      } else {
        console.error('当前基础库版本过低，请升级到3.7.1或以上版本以支持AI+能力');
      }
    }

    // 展示本地存储能力
    var logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    });
    
    // 获取用户信息
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
          wx.getUserInfo({
            success: res => {
              // 可以将 res 发送给后台解码出 unionId
              this.globalData.userInfo = res.userInfo;

              // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
              // 所以此处加入 callback 以防止这种情况
              if (this.userInfoReadyCallback) {
                this.userInfoReadyCallback(res);
              }
            }
          });
        }
      }
    });

    // 获取用户登录态
    this.checkLoginStatus();
    
    // 初始化TabBar状态
    this.initTabBarState();
  },

  // 检查Agent状态
  checkAgentStatus: async function() {
    try {
      const botId = 'bot-e108fd19';
      const res = await wx.cloud.extend.AI.bot.get({ botId: botId });
      console.log('Agent信息获取成功:', res);
    } catch (error) {
      console.error('Agent连接失败:', error);
    }
  },

  // 检查登录状态
  checkLoginStatus: function() {
    const userInfo = wx.getStorageSync('userInfo');
    const openid = wx.getStorageSync('openid');
    
    if (userInfo && openid) {
      this.globalData.userInfo = userInfo;
      this.globalData.logged = true;
      this.globalData.openid = openid;
    }
  },

  // 登录方法，接受用户信息作为参数
  login: function(userInfo) {
    return new Promise((resolve, reject) => {
      // 调用云函数进行登录
      wx.cloud.callFunction({
        name: 'login',
        data: {
          userInfo: userInfo || {}
        },
        success: res => {
          if (res.result && res.result.code === 0) {
            this.globalData.logged = true;
            this.globalData.openid = res.result.data._openid || '';
            
            // 合并返回的用户数据
            this.globalData.userInfo = {
              ...res.result.data,
              ...userInfo  // 优先使用传入的用户信息（如昵称、头像）
            };
            
            // 保存用户信息和OpenID到本地存储
            wx.setStorageSync('userInfo', this.globalData.userInfo);
            wx.setStorageSync('openid', this.globalData.openid);
            
            resolve(this.globalData.userInfo);
          } else {
            reject(res.result || { message: '登录失败' });
          }
        },
        fail: err => {
          reject(err);
        }
      });
    });
  },
  
  // 简化的TabBar状态管理
  initTabBarState: function() {
    // 不再从本地存储读取，统一由页面路由决定
    this.globalData.tabBar = {
      selected: 2,
      lastUpdateTime: Date.now()
    };
  },
  
  setTabBarIndex: function(index) {
    this.globalData.tabBar.selected = index;
    this.globalData.tabBar.lastUpdateTime = Date.now();
    
    // 更新当前页面的TabBar
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && currentPage.getTabBar) {
      const tabBar = currentPage.getTabBar();
      tabBar && tabBar.setData({ selected: index });
    }
  }
}) 