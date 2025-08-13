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
    
    // 🔥 全局错误处理
    this.initGlobalErrorHandling();
    
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
        
        // 测试云开发连接
        this.testCloudConnection();
        
        // 检查是否支持AI+能力
        if (wx.cloud.extend && wx.cloud.extend.AI) {
          console.log('✅ 微信AI+能力支持检查通过');
          // 获取Agent信息，确认连接正常
          this.checkAgentStatus();
        } else {
          console.warn('⚠️ 当前基础库版本过低，请升级到3.7.1或以上版本以支持AI+能力');
        }
      } catch (error) {
        console.error('❌ 云开发环境初始化失败:', error);
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
  },

  // 🔥 新增：全局错误处理
  initGlobalErrorHandling: function() {
    // 监听小程序错误
    wx.onError((error) => {
      console.error('🚨 小程序全局错误:', error);
    });

    // 监听未处理的Promise rejection
    wx.onUnhandledRejection((event) => {
      console.error('🚨 未处理的Promise rejection:', event);
    });

    console.log('✅ 全局错误处理机制已启动');
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