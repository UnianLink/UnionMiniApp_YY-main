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
    console.log('[App] 小程序启动，开始初始化云开发环境');
    
    try {
      // 🔥 全局错误处理
      this.initGlobalErrorHandling();
      
      // 延迟初始化非关键功能，避免框架未准备好时调用
      setTimeout(() => {
        this.delayedInit();
      }, 100);
      
      // 初始化云开发环境
      if (!wx.cloud) {
        console.error('❌ 请使用 2.2.3 或以上的基础库以使用云能力')
      } else {
        try {
          wx.cloud.init({
            env: 'unionlink-4gkmzbm1babe86a7',
            traceUser: true,
          })
          
          console.log('✅ 云开发环境初始化成功');
          console.log('🌩️ 云环境ID: unionlink-4gkmzbm1babe86a7');
          
          // 延迟测试云开发连接
          setTimeout(() => {
            this.testCloudConnection();
          }, 200);
          
          // 延迟检查AI+能力
          setTimeout(() => {
            if (wx.cloud.extend && wx.cloud.extend.AI) {
              console.log('✅ 微信AI+能力支持检查通过');
              this.checkAgentStatus();
            } else {
              console.warn('⚠️ 当前基础库版本过低，请升级到3.7.1或以上版本以支持AI+能力');
            }
          }, 300);
          
        } catch (error) {
          console.error('❌ 云开发环境初始化失败:', error);
        }
      }

      // 安全地处理本地存储
      try {
        var logs = wx.getStorageSync('logs') || [];
        logs.unshift(Date.now());
        wx.setStorageSync('logs', logs);
      } catch (storageError) {
        console.error('❌ 本地存储操作失败:', storageError);
      }

      // 安全的登录处理
      try {
        wx.login({
          success: res => {
            // 发送 res.code 到后台换取 openId, sessionKey, unionId
          },
          fail: err => {
            console.error('❌ 登录失败:', err);
          }
        });
      } catch (loginError) {
        console.error('❌ 调用登录API失败:', loginError);
      }
      
      // 安全的用户信息获取
      this.safeGetUserInfo();

      // 获取用户登录态
      this.checkLoginStatus();
      
      // 初始化TabBar状态
      this.initTabBarState();
      
    } catch (globalError) {
      console.error('❌ App启动过程中发生严重错误:', globalError);
    }
  },

  // 延迟初始化方法
  delayedInit: function() {
    try {
      console.log('🔄 开始执行延迟初始化...');
      // 在这里执行一些可能导致冲突的初始化操作
    } catch (error) {
      console.error('❌ 延迟初始化失败:', error);
    }
  },

  // 安全的用户信息获取
  safeGetUserInfo: function() {
    try {
      wx.getSetting({
        success: res => {
          try {
            if (res.authSetting && res.authSetting['scope.userInfo']) {
              wx.getUserInfo({
                success: res => {
                  try {
                    this.globalData.userInfo = res.userInfo;
                    if (typeof this.userInfoReadyCallback === 'function') {
                      this.userInfoReadyCallback(res);
                    }
                  } catch (userInfoError) {
                    console.error('❌ 用户信息处理失败:', userInfoError);
                  }
                },
                fail: err => {
                  console.error('❌ 获取用户信息失败:', err);
                }
              });
            }
          } catch (settingError) {
            console.error('❌ 处理用户设置失败:', settingError);
          }
        },
        fail: err => {
          console.error('❌ 获取用户设置失败:', err);
        }
      });
    } catch (getUserInfoError) {
      console.error('❌ 调用用户信息API失败:', getUserInfoError);
    }
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
  },

  // 🔥 新增：全局错误处理
  initGlobalErrorHandling: function() {
    // 监听小程序错误
    wx.onError((error) => {
      console.error('🚨 小程序全局错误:', error);
      
      // 过滤并处理特定错误
      if (typeof error === 'string') {
        if (error.includes('t is not a function')) {
          console.warn('⚠️ 检测到函数调用错误，可能是由于异步加载时序问题');
          return;
        }
        if (error.includes('backgroundfetch')) {
          console.warn('⚠️ 后台获取数据错误已被拦截，这是正常的');
          return;
        }
      }
    });

    // 监听未处理的Promise rejection
    wx.onUnhandledRejection((event) => {
      console.error('🚨 未处理的Promise rejection:', event);
      
      // 尝试阻止错误传播
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
    });

    // 重写setTimeout，添加错误保护
    const originalSetTimeout = setTimeout;
    setTimeout = function(callback, delay) {
      if (typeof callback !== 'function') {
        console.error('❌ setTimeout回调不是函数:', callback);
        return;
      }
      
      return originalSetTimeout(function() {
        try {
          callback.apply(this, arguments);
        } catch (error) {
          console.error('❌ setTimeout回调执行错误:', error);
        }
      }, delay);
    };

    console.log('✅ 增强版全局错误处理机制已启动');
  },

  // 🔥 新增：测试云开发连接
  testCloudConnection: async function() {
    try {
      console.log('🧪 开始测试云开发连接...');
      
      // 测试数据库连接
      const db = wx.cloud.database();
      const testResult = await db.collection('users_adv').limit(1).get();
      console.log('✅ 数据库连接测试成功，找到', testResult.data.length, '条记录');
      
      // 测试云函数连接
      try {
        const funcResult = await wx.cloud.callFunction({
          name: 'login',
          data: { test: true }
        });
        console.log('✅ 云函数连接测试成功');
      } catch (funcError) {
        console.warn('⚠️ 云函数连接测试失败:', funcError.message);
      }
      
    } catch (error) {
      console.error('❌ 云开发连接测试失败:', error);
      console.error('❌ 错误详情:', {
        message: error.message,
        errMsg: error.errMsg,
        code: error.code
      });
    }
  }
}) 