/**
 * 好友列表页面 - connect.js
 * 
 * 功能说明：
 * 1. 显示用户名片卡片列表，支持滑动切换
 * 2. 支持触摸滑动、惯性滚动和振动反馈
 * 3. 用户名片详情查看和介绍展示
 * 
 * 交互设计要点：
 * - 卡片滚动与缩放：滑动时实现卡片放大聚焦视觉效果
 * - 触摸振动反馈：滑动切换卡片时提供轻微振动
 * - 惯性滚动效果：根据滑动速度实现自然的惯性滑动
 * - 卡片位置偏移：将选中的卡片位置优化到视觉中心
 * 
 * 修改历史：
 * 1. 优化了卡片显示样式，使卡片更大更醒目
 * 2. 将头像改为方形，类似黑胶唱片的专辑封面
 * 3. 移除了选择指示器，简化界面
 * 4. 优化了滚动体验，提升用户交互感
 * 5. 将主题卡片改为用户名片展示
 * 6. 删除了广场功能和旋转球体功能
 * 7. 改为从users_adv集合检索用户数据
 */

// miniprogram/pages/connect/connect.js
// 引入文字配置
const Config = require('../../utils/config.js')

Page({

  /**
   * Page initial data
   */
  data: {
    arcPosition: 0,         // 弧形位置参数
    notesHeight: 120,       // 注释区域高度
    minNotesHeight: 200,    // 最小注释区域高度
    maxNotesHeight: 1200,   // 最大注释区域高度
    isExpanded: false,      // 是否展开注释区域
    startY: 0,              // 触摸起始Y坐标
    lastY: 0,               // 上次触摸Y坐标
    moveDirection: '',      // 移动方向
    moveSpeed: 0,           // 移动速度
    canScroll: false,       // 是否可以滚动
    isDragging: false,      // 是否正在拖动
    userCards: [],          // 用户名片数据
    isLoading: false,       // 是否正在加载
    loadError: '',          // 加载错误信息
    // 碰一碰相关数据
    touchListResult: null,  // 碰一碰匹配结果
    matchedFriends: [],     // 已匹配的朋友
    unmatchedDevices: [],   // 未匹配的设备
    notes: [                // 注释数据
      { id: 1, title: '时间的使用者', content: '探索时间管理与生活节奏的艺术' },
      { id: 2, title: '感官交界', content: '体验多感官融合的奇妙世界' },
      { id: 3, title: '未来探索派', content: '畅想科技与人文的未来图景' },
      { id: 4, title: '探索人格博弈馆', content: '深入了解人格类型与社交动态' }
    ],
    currentTrackIndex: 0,   // 当前选中的用户索引
    startTouchY: 0,         // 触摸开始Y坐标
    lastTouchY: 0,          // 上次触摸Y坐标
    scrollDistance: 0,      // 滚动距离
    scrollOffset: 0,        // 滚动偏移量
    itemHeight: 310,        // 卡片高度
    touchStartTime: 0,      // 触摸开始时间
    touchEndTime: 0,        // 触摸结束时间
    touchVelocity: 0,       // 触摸滑动速度
    isScrolling: false,     // 是否正在滚动
    inertiaAnimationId: null, // 惯性动画ID
    isInertiaScrolling: false, // 是否正在惯性滚动
    showCardPreview: false, // 是否显示用户预览
    selectedCard: {},       // 选中的用户数据
    stars: [],              // 背景星星数组
    connections: [],        // 社交连接数据
    loading: false,         // 是否正在加载
    cardPositionOffset: 200, // 卡片位置偏移量
    pairResults: {},        // 存储每个主题下的配对结果 { themeId: [{users: [userA, userB], reason: "..."}, ...] }
    myPairs: [],            // 当前用户在当前主题下的配对对象
    myPairReasons: {},      // 当前用户与配对对象的理由 { openid: reason }
    showPairModal: false,    // 是否显示配对理由弹窗
    pairModalContent: '',    // 配对理由内容
    pairModalUser: null,     // 当前弹窗的配对用户
    // 新增：社群分类相关数据
    currentUserCommunity: null, // 当前用户所在的社群
    communityMembers: [],    // 当前用户社群的其他成员
    // 照抄briefing页面的成功数据结构
    classifications: [],     // briefing页面的分类数据结构
    currentUserOpenId: '',   // briefing页面的openid字段
    // 详细名片相关数据
    showDetailedCard: false, // 是否显示详细名片弹窗
    selectedMember: {},       // 选中的成员数据
    showUserDetailModal: false, // 是否显示用户详细信息弹窗
    selectedUserDetail: null,   // 选中的用户详细信息
    // 主题颜色相关
    currentThemeColor: '#00d4ff', // 当前主题颜色
    themeColors: [
      '#00d4ff', // 亮天依蓝 - 更加鲜艳明亮
      '#ff4500', // 亮橙红 - 增强饱和度
      '#ff69b4', // 亮春樱落霞 - 改为热粉色
      '#00ff7f'  // 亮宝石绿 - 改为春绿色
    ],
    texts: {}, // 文字配置
    // 新增：分离显示相关数据
    registeredUserCards: [],        // 注册用户卡片数据
    unregisteredUserCards: [],      // 未注册设备卡片数据
    showUnregisteredDevices: false  // 是否显示未注册设备列表
  },

  // 🖼️ 获取统一的默认头像URL
  getDefaultAvatarUrl(seed = 'friend') {
    // 统一使用本地默认头像，不再动态生成
    return '/assets/default-avatar.svg';
  },

  /**
   * Lifecycle function--Called when page load
   */
  onLoad(options) {
    // 初始化云开发AI
    wx.cloud.init({
      env: "unionlink-4gkmzbm1babe86a7"
    });
    
    // 初始化文字配置
    this.initTextConfig();
    
    // 初始化设置向上偏移量
    this.setData({
      cardPositionOffset: -100, // 减少向上偏移量，从200rpx调整为100rpx
      scrollOffset: -100 // 设置初始滚动位置，与偏移量保持一致
    });
    
    // 优先从数据库加载朋友列表
    this.loadFriendsFromDatabase();
    
    this.initUserCards();
    this.generateStars();
    this.initAnimation();
    
    // 直接从数据库获取分类数据，不显示加载提示
    this.loadClassificationDataSilently();
  },

  /**
   * Lifecycle function--Called when page is initially rendered
   */
  onReady() {
    // 添加向上偏移量，使选中的卡片位置更靠上
    this.setData({
      cardPositionOffset: -100 // 减少向上偏移量，调整为100rpx
    });
  },

  /**
   * Lifecycle function--Called when page show
   */
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected('/pages/connect/connect');
    }
    
    // 每次显示页面时重新加载朋友数据
    console.log('[ConnectPage] onShow - 重新加载朋友数据');
    this.loadFriendsFromDatabase();
    
    // 🔥 新增：启动实时数据监听机制
    this.startRealTimeDataListener();
  },

  /**
   * Lifecycle function--Called when page hide
   */
  onHide() {
    this.clearAllTimers();
    // 🔥 新增：停止实时数据监听
    this.stopRealTimeDataListener();
  },

  /**
   * Lifecycle function--Called when page unload
   */
  onUnload() {
    this.clearAllTimers();
    // 🔥 新增：停止实时数据监听
    this.stopRealTimeDataListener();
  },

  /**
   * Page event handler function--Called when user drop down
   */
  onPullDownRefresh() {

  },

  /**
   * Called when page reach bottom
   */
  onReachBottom() {

  },

  /**
   * Called when user click on the top right corner to share
   */
  onShareAppMessage() {

  },

  /**
   * 初始化文字配置
   */
  initTextConfig: function() {
    // 初始化所有需要的文字
    const texts = Config.getTexts({
      // 搜索相关
      searchPlaceholder: 'connect.search.placeholder',
      searchHint: 'connect.search.hint',
      
      // 加载状态
      loadingText: 'connect.loading.text',
      loadingError: 'connect.loading.error',
      retryButton: 'connect.loading.retry',
      emptyText: 'connect.loading.empty',
      emptySubtext: 'connect.loading.emptySubtext',
      
      // 配对相关
      pairingTitle: 'connect.pairing.title',
      tapHint: 'connect.pairing.tapHint',
      modalTitle: 'connect.pairing.modalTitle',
      unknownUser: 'connect.pairing.unknownUser',
      
      // 社群相关
      unknownTheme: 'connect.community.unknownTheme',
      unknownCommunity: 'connect.community.unknownCommunity',
      noDescription: 'connect.community.noDescription',
      memberCount: 'connect.community.memberCount',
      memberStatus: 'connect.community.memberStatus',
      sectionTitle: 'connect.community.sectionTitle',
      featuresTitle: 'connect.community.featuresTitle',
      scrollHint: 'connect.community.scrollHint',
      
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

  /**
   * 清除所有计时器
   */
  clearAllTimers: function() {
    if (this.scrollAnimationTimer) {
      clearTimeout(this.scrollAnimationTimer);
      this.scrollAnimationTimer = null;
    }
    
    // 清理实时数据监听定时器
    if (this.dataListenerTimer) {
      clearInterval(this.dataListenerTimer);
      this.dataListenerTimer = null;
    }
  },

  /**
   * 🔥 实时数据监听机制 - 监听本地存储中的碰一碰数据变化
   */
  startRealTimeDataListener: function() {
    console.log('[ConnectPage] 启动实时数据监听机制');
    
    // 记录上次检查的数据更新时间
    this.lastDataUpdateTime = wx.getStorageSync('touchListResult')?.updateTime || 0;
    
    // 每2秒检查一次数据是否有更新
    this.dataListenerTimer = setInterval(() => {
      try {
        const currentResult = wx.getStorageSync('touchListResult');
        
        if (currentResult && currentResult.updateTime) {
          // 检查数据是否有更新
          if (currentResult.updateTime > this.lastDataUpdateTime) {
            console.log('[ConnectPage] 检测到新的碰一碰数据，立即更新界面');
            console.log('[ConnectPage] 上次更新时间:', new Date(this.lastDataUpdateTime).toLocaleString());
            console.log('[ConnectPage] 新数据时间:', new Date(currentResult.updateTime).toLocaleString());
            
            // 更新记录的时间戳
            this.lastDataUpdateTime = currentResult.updateTime;
            
            // 立即刷新朋友列表显示
            this.refreshFriendsData();
            
            // 显示友好的更新提示
            wx.showToast({
              title: '发现新朋友！',
              icon: 'success',
              duration: 2000
            });
          }
        }
      } catch (error) {
        console.error('[ConnectPage] 实时数据监听出错:', error);
      }
    }, 2000); // 每2秒检查一次
    
    console.log('[ConnectPage] 实时数据监听已启动，每2秒检查一次数据更新');
  },

  /**
   * 停止实时数据监听
   */
  stopRealTimeDataListener: function() {
    if (this.dataListenerTimer) {
      clearInterval(this.dataListenerTimer);
      this.dataListenerTimer = null;
      console.log('[ConnectPage] 实时数据监听已停止');
    }
  },

  /**
   * 刷新朋友数据（快速版本，优先使用本地存储）
   */
  refreshFriendsData: function() {
    console.log('[ConnectPage] 快速刷新朋友数据');
    
    try {
      // 优先从本地存储快速加载
      const result = wx.getStorageSync('touchListResult');
      if (result && (result.matchedUsers || result.unmatchedDevices)) {
        console.log('[ConnectPage] 从本地存储快速更新朋友列表');
        
        this.setData({
          touchListResult: result,
          matchedFriends: result.matchedUsers || [],
          unmatchedDevices: result.unmatchedDevices || []
        });
        
        // 立即刷新显示
        this.initUserCards();
        
        console.log('[ConnectPage] 快速刷新完成，显示',  
          (result.matchedUsers || []).length, '个匹配朋友，',
          (result.unmatchedDevices || []).length, '个未匹配设备');
      } else {
        // 本地存储无数据，降级到数据库加载
        console.log('[ConnectPage] 本地存储无数据，降级到数据库加载');
        this.loadFriendsFromDatabase();
      }
    } catch (error) {
      console.error('[ConnectPage] 快速刷新朋友数据失败:', error);
      // 出错时降级到数据库加载
      this.loadFriendsFromDatabase();
    }
  },



  // 跳转到连接图谱页面
  goToConnectionMap: function() {
    wx.navigateTo({
      url: '/pages/connectionMap/connectionMap'
    });
  },

  // 跳转到成就系统页面
  goToAchievements: function() {
    wx.navigateTo({
      url: '/pages/achievements/achievements'
    });
  },



  /**
   * 触摸开始事件
   */
  touchStart: function(e) {
    // 停止任何正在进行的惯性滚动
    if (this.data.inertiaAnimationId) {
      cancelAnimationFrame(this.data.inertiaAnimationId);
      this.setData({
        isInertiaScrolling: false,
        inertiaAnimationId: null
      });
    }
    
    const touch = e.touches[0];
    this.setData({
      startTouchY: touch.clientY,
      lastTouchY: touch.clientY,
      touchStartTime: Date.now(),
      isScrolling: true,
      isDragging: true
    });
  },

  /**
   * 添加振动反馈函数
   */
  vibrateFeedback: function() {
    // 调用微信小程序振动API
    wx.vibrateShort({
      type: 'light' // 轻微振动，适用于微信小程序基础库 2.13.0 及以上版本
    }).catch(error => {
      // 如果light类型不支持，回退到默认振动
      if (error) {
        wx.vibrateShort().catch(() => {
          // 忽略不支持振动的设备错误
          console.log('设备不支持振动');
        });
      }
    });
  },

  /**
   * 触摸移动事件
   */
  touchMove: function(e) {
    if (!this.data.isScrolling) return;
    
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const deltaY = currentY - this.data.lastTouchY;
    
    // 计算滚动偏移量 - 降低滚动灵敏度，使滑动不至于太快
    const moveRate = 0.8; // 进一步降低滚动灵敏度
    const scrollDelta = deltaY * moveRate;
    let newScrollOffset = this.data.scrollOffset + scrollDelta;
    
    // 计算当前应该选中的卡片索引
    const itemCount = this.data.userCards.length;
    if (itemCount > 0) {
      // 添加向上偏移量
      const cardPositionOffset = this.data.cardPositionOffset || -100; // 默认值为-100rpx
      
      // 添加边界限制，防止无限滚动
      const maxOffset = 0 + cardPositionOffset; // 顶部边界(加上偏移量)
      const minOffset = -(itemCount - 1) * this.data.itemHeight + cardPositionOffset; // 底部边界(加上偏移量)
      
      // 限制滚动范围
      if (newScrollOffset > maxOffset) {
        // 添加阻尼效果，使超出边界变得困难
        newScrollOffset = maxOffset + (newScrollOffset - maxOffset) * 0.2;
      } else if (newScrollOffset < minOffset) {
        // 添加阻尼效果，使超出边界变得困难
        newScrollOffset = minOffset + (newScrollOffset - minOffset) * 0.2;
      } else {
        // 在正常范围内，添加轻微磁吸效果
        // 计算最接近的项目中心
        const closestIndex = Math.round(-(newScrollOffset - cardPositionOffset) / this.data.itemHeight);
        const snapPoint = -closestIndex * this.data.itemHeight + cardPositionOffset;
        const distanceToSnap = Math.abs(newScrollOffset - snapPoint);
        
        // 当接近磁吸点时，轻微吸引
        const snapThreshold = this.data.itemHeight * 0.15;
        if (distanceToSnap < snapThreshold) {
          // 靠近磁吸点时，轻微拉向磁吸点
          const snapStrength = 0.3 * (1 - distanceToSnap / snapThreshold);
          newScrollOffset = newScrollOffset + (snapPoint - newScrollOffset) * snapStrength;
        }
      }
      
      // 根据偏移量计算索引(减去偏移量后计算)
      let newIndex = Math.round(-(newScrollOffset - cardPositionOffset) / this.data.itemHeight);
      
      // 确保索引在有效范围内
      newIndex = Math.max(0, Math.min(newIndex, itemCount - 1));
      
      // 记录当前索引用于比较
      const oldIndex = this.data.currentTrackIndex;
      
      // 更新数据
      this.setData({
        scrollOffset: newScrollOffset,
        lastTouchY: currentY,
        currentTrackIndex: newIndex
      });
      
      // 如果索引变化，触发振动反馈并同步主题到全局
      if (newIndex !== oldIndex) {
        this.vibrateFeedback();
        this.syncThemeToGlobal(newIndex);
      }
    } else {
      this.setData({
        scrollOffset: newScrollOffset,
        lastTouchY: currentY
      });
    }
  },
  
  /**
   * 处理循环滚动的索引计算
   */
  normalizeIndex: function(index, count) {
    if (count === 0) return 0;
    // 循环滚动：当索引小于0时，从列表末尾开始；当索引大于等于count时，从列表开头开始
    while (index < 0) {
      index += count;
    }
    return index % count;
  },

  /**
   * 触摸结束事件
   */
  touchEnd: function(e) {
    if (!this.data.isScrolling) return;
    
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - this.data.touchStartTime;
    
    // 计算滑动速度 (像素/毫秒)
    const touchDistance = this.data.lastTouchY - this.data.startTouchY;
    const velocity = touchDistance / touchDuration;
    
    // 设置结束状态
    this.setData({
      isScrolling: false,
      touchEndTime: touchEndTime,
      touchVelocity: velocity,
      isDragging: false
    });
    
    // 如果滑动速度很快，才使用惯性滚动，提高速度阈值
    if (Math.abs(velocity) > 0.2) {
      // 处理物理惯性滚动
      this.handleInertiaScroll(velocity);
    } else {
      // 速度较慢，直接对齐到最近的项目
      this.snapToClosestItem();
    }
  },
  
  /**
   * 处理惯性滚动
   */
  handleInertiaScroll: function(initialVelocity) {
    // 滚动速度太小则不启用惯性
    if (Math.abs(initialVelocity) < 0.05) {
      this.snapToClosestItem();
      return;
    }
    
    // 惯性参数 - 增加减速度，使滑动更快停下来
    const deceleration = 0.004; // 增加减速度
    let velocity = initialVelocity * 15; // 进一步降低初始速度系数
    let scrollOffset = this.data.scrollOffset;
    const itemCount = this.data.userCards.length;
    const cardPositionOffset = this.data.cardPositionOffset || -100; // 默认值为-100rpx
    
    // 记录上一个索引，用于检测变化
    let lastIndex = this.data.currentTrackIndex;
    
    // 设置惯性滚动状态
    this.setData({
      isInertiaScrolling: true
    });
    
    // 使用定时器替代requestAnimationFrame
    const animate = () => {
      if (!this.data.isInertiaScrolling) return;
      
      if (Math.abs(velocity) > 0.1) {
        // 减速
        const direction = velocity > 0 ? 1 : -1;
        velocity -= direction * deceleration * 16; // 假设16ms为一帧
        
        // 计算滚动偏移
        const delta = velocity * 16;
        scrollOffset += delta;
        
        // 检查边界
        if (scrollOffset > 0 + cardPositionOffset) {
          scrollOffset = 0 + cardPositionOffset;
          velocity = 0; // 到达顶部边界，停止惯性
        } else if (scrollOffset < -(itemCount - 1) * this.data.itemHeight + cardPositionOffset) {
          scrollOffset = -(itemCount - 1) * this.data.itemHeight + cardPositionOffset;
          velocity = 0; // 到达底部边界，停止惯性
        }
        
        // 计算当前应该选中的卡片索引
        if (itemCount > 0) {
          let newIndex = Math.round(-(scrollOffset - cardPositionOffset) / this.data.itemHeight);
          
          // 确保索引在有效范围内
          newIndex = Math.max(0, Math.min(newIndex, itemCount - 1));
          
          // 增强磁吸效果 - 当接近某个选项的中心点时，增加减速
          const itemCenter = -newIndex * this.data.itemHeight + cardPositionOffset;
          const distanceToCenter = Math.abs(scrollOffset - itemCenter);
          const magnetThreshold = this.data.itemHeight * 0.4; // 磁吸范围
          
          if (distanceToCenter < magnetThreshold) {
            // 距离中心点越近，减速越明显
            const magnetStrength = 1 - (distanceToCenter / magnetThreshold);
            velocity *= (1 - (magnetStrength * 0.3)); // 使用磁吸强度减速
            
            // 如果速度很小且非常接近中心点，直接对齐并停止
            if (Math.abs(velocity) < 0.5 && distanceToCenter < this.data.itemHeight * 0.1) {
              this.setData({
                scrollOffset: itemCenter,
                currentTrackIndex: newIndex,
                isInertiaScrolling: false
              });
              return;
            }
          }
          
          // 检测索引是否变化
          if (newIndex !== lastIndex) {
            // 索引变化，触发振动反馈
            this.vibrateFeedback();
            // 更新上一个索引
            lastIndex = newIndex;
          }
          
          this.setData({
            scrollOffset: scrollOffset,
            currentTrackIndex: newIndex
          });
        } else {
          this.setData({
            scrollOffset: scrollOffset
          });
        }
        
        // 继续动画
        setTimeout(animate, 16);
      } else {
        // 速度太小，结束惯性滚动
        this.setData({
          isInertiaScrolling: false
        });
        
        // 对齐到最近的选项
        this.snapToClosestItem();
      }
    };
    
    // 启动动画
    setTimeout(animate, 16);
  },
  
  /**
   * 对齐到最近的选项
   */
  snapToClosestItem: function() {
    const itemCount = this.data.userCards.length;
    if (itemCount === 0) return;
    
    // 计算最接近的项目索引
    const currentOffset = this.data.scrollOffset;
    const cardPositionOffset = this.data.cardPositionOffset || -100; // 默认值为-100rpx
    const rawIndex = Math.round(-(currentOffset - cardPositionOffset) / this.data.itemHeight);
    
    // 确保索引在有效范围内
    const newIndex = Math.max(0, Math.min(rawIndex, itemCount - 1));
    
    // 记录当前索引用于比较
    const oldIndex = this.data.currentTrackIndex;
    
    // 计算对齐后的偏移
    // 添加向上的位置偏移，使选中卡片位置更靠上
    const targetOffset = -newIndex * this.data.itemHeight + cardPositionOffset;
    
    // 如果当前偏移与目标偏移相差太大，使用动画过渡
    if (Math.abs(currentOffset - targetOffset) > 2) {
      this.animateToOffset(targetOffset, newIndex);
    } else {
      // 直接设置
      this.setData({
        scrollOffset: targetOffset,
        currentTrackIndex: newIndex
      });
      
      // 如果索引变化，触发振动反馈
      if (newIndex !== oldIndex) {
        this.vibrateFeedback();
        // 更新主题颜色
        this.updateCurrentThemeColor();
      }
      
      // 自动选中当前项目（但不立即显示预览，只设置选中状态）
      this.setCurrentCardActive();
    }
  },
  
  /**
   * 动画滚动到指定偏移
   */
  animateToOffset: function(targetOffset, targetIndex) {
    const startOffset = this.data.scrollOffset;
    const distance = targetOffset - startOffset;
    const duration = 300;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        // 动画结束
        this.setData({
          scrollOffset: targetOffset,
          currentTrackIndex: targetIndex,
          isInertiaScrolling: false
        });
        
        // 更新主题颜色
        this.updateCurrentThemeColor();
        
        // 动画完成后选中当前项目
        this.setCurrentCardActive();
        return;
      }
      
      // 使用缓动效果
      const progress = this.easeOutQuint(elapsed / duration);
      const currentOffset = startOffset + distance * progress;
      
      this.setData({
        scrollOffset: currentOffset
      });
      
      // 继续动画
      setTimeout(animate, 16);
    };
    
    // 启动动画
    setTimeout(animate, 16);
  },
  
  /**
   * 平滑的二次方缓动函数
   */
  easeOutQuad: function(t) {
    return t * (2 - t);
  },
  
  /**
   * 更平滑的五次方缓动函数
   */
  easeOutQuint: function(t) {
    return 1 - Math.pow(1 - t, 5);
  },
  
  /**
   * 设置当前卡片为激活状态（不显示预览）
   */
  setCurrentCardActive: function() {
    if (this.data.userCards.length === 0) return;
    
    // 获取当前选中的卡片索引
    const index = this.data.currentTrackIndex;
    
    // 只设置当前卡片为激活状态，不显示预览
    if (index >= 0 && index < this.data.userCards.length) {
      // 什么都不做，因为active状态是通过视图层的class绑定自动设置的
      console.log('设置卡片激活状态:', index);
    }
  },

  /**
   * 点击查看主题详情 - 改为显示配对用户
   */
  viewTrackDetail: function(e) {
    const index = e.currentTarget.dataset.index;
    
    // 如果点击的项不是当前中心项，先滚动到该项
    if (index !== this.data.currentTrackIndex) {
      // 直接计算目标偏移量，添加向上偏移
      const cardPositionOffset = this.data.cardPositionOffset || -200;
      const targetOffset = -index * this.data.itemHeight + cardPositionOffset;
      
      // 使用动画滚动，然后跳转到用户问卷页面
      this.animateToOffset(targetOffset, index);
      
      // 动画完成后跳转到用户问卷页面
      setTimeout(() => {
        this.onUserCardTap(e);
      }, 300);
    } else {
      // 已经是中心项，直接跳转到用户问卷页面
      this.onUserCardTap(e);
    }
  },
  
  /**
   * 显示配对用户
   */
  // 【重写】智能配对逻辑：先检查是否已有配对，如果没有则AI匹配
  showPairedUsers: async function(index) {
    if (index < 0 || index >= this.data.userCards.length) {
      console.error('主题索引无效:', index);
      return;
    }

    const theme = this.data.userCards[index];
    const classifications = this.data.classifications;
    const currentUserOpenId = this.data.currentUserOpenId;

    console.log('=== 智能配对系统启动 ===');
    console.log('选中主题:', theme.name);
    console.log('当前用户openid:', currentUserOpenId);

    if (!classifications || !classifications.length) {
      wx.showToast({
        title: '社群数据未加载，请稍后重试',
        icon: 'none'
      });
      return;
    }

    if (!currentUserOpenId) {
      wx.showToast({
        title: '用户信息未获取，请稍后重试',
        icon: 'none'
      });
      return;
    }

    // 步骤1：检查是否已有配对
    console.log('检查现有配对...');
    const existingPairs = await this.checkExistingPairs(currentUserOpenId, theme.name);
    
    if (existingPairs !== null) {
      console.log('发现现有配对:', existingPairs);
      // 显示已配对的用户
      this.displayPairedUsers(theme, existingPairs);
      return;
    }

    // 步骤2：如果没有配对，获取社群成员进行AI匹配
    console.log('没有现有配对，开始AI智能匹配...');
    
    // 在classifications中找到对应的主题数据
    const themeData = classifications.find(t => t.theme === theme.name);
    if (!themeData || !themeData.communities) {
      console.log('未找到主题数据或社群数据:', theme.name);
      wx.showToast({
        title: `${theme.name}暂无社群数据`,
        icon: 'none'
      });
      return;
    }

    // 查找当前用户所在的社群
    let userCommunity = null;
    let communityMembers = [];

    for (const community of themeData.communities) {
      if (community.members) {
        const userInCommunity = community.members.find(member => member.openid === currentUserOpenId);
        if (userInCommunity) {
          userCommunity = community;
          // 获取除当前用户外的其他成员
          communityMembers = community.members.filter(member => member.openid !== currentUserOpenId);
          console.log('找到用户社群:', community.name, '其他成员数量:', communityMembers.length);
          break;
        }
      }
    }

    if (!userCommunity) {
      wx.showToast({
        title: `您在${theme.name}主题下还未被分配到社群`,
        icon: 'none',
        duration: 3000
      });
      return;
    }

    if (communityMembers.length === 0) {
      wx.showToast({
        title: `您的社群"${userCommunity.name}"中暂无其他成员`,
        icon: 'none',
        duration: 3000
      });
      return;
    }

    // 步骤3：使用AI对整个部落进行配对分组
    try {
      wx.showLoading({
        title: 'AI智能配对整个部落中...'
      });
      
      // 获取部落所有成员（包括当前用户）
      const allCommunityMembers = [...communityMembers];
      allCommunityMembers.push({openid: currentUserOpenId}); // 添加当前用户
      
      const groupMatchResult = await this.performTribeGroupMatching(allCommunityMembers, theme.name);
      
      if (groupMatchResult && groupMatchResult.pairGroups && groupMatchResult.pairGroups.length > 0) {
        // 步骤4：保存所有配对组到云端
        await this.saveAllPairGroupsToCloud(theme.name, groupMatchResult);
        
        // 步骤5：找到当前用户所在的配对组并显示
        const currentUserGroup = this.findCurrentUserGroup(currentUserOpenId, groupMatchResult.pairGroups);
        if (currentUserGroup) {
          this.displayCurrentUserPairGroup(theme, currentUserGroup);
        } else {
          console.log('未找到当前用户的配对组');
          this.displayAllCommunityMembers(theme, userCommunity, communityMembers);
        }
      } else {
        // AI匹配失败，显示所有社群成员
        console.log('AI部落配对失败，显示所有社群成员');
        this.displayAllCommunityMembers(theme, userCommunity, communityMembers);
      }
      
    } catch (error) {
      console.error('AI部落配对过程出错:', error);
      // 匹配失败，显示所有社群成员
      this.displayAllCommunityMembers(theme, userCommunity, communityMembers);
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 查看用户名片
   */
  viewUserProfile: function(e) {
    const openid = e.currentTarget.dataset.openid;
    const user = this.data.communityMembers.find(u => u.openid === openid);
    if (user) {
      wx.navigateTo({
        url: `/pages/userProfile/userProfile?openid=${openid}`
      });
    }
  },

  /**
   * 点击用户卡片 - 显示用户详细信息
   */
  onUserCardTap: function(e) {
    const index = e.currentTarget.dataset.index;
    const section = e.currentTarget.dataset.section;
    let card;
    
    // 根据section选择正确的数据源
    if (section === 'registered') {
      card = this.data.registeredUserCards[index];
    } else if (section === 'unregistered') {
      card = this.data.unregisteredUserCards[index];
    } else {
      // 兼容旧的数据结构
      card = this.data.userCards[index];
    }
    
    if (!card) {
      console.error('[ConnectPage] 用户卡片不存在，索引:', index, '分区:', section);
      return;
    }
    
    console.log('[ConnectPage] 点击用户卡片:', card.name);
    
    // 🔥 修复：区分真实用户和碰一碰虚拟用户
    if (card.userData) {
      // 真实注册用户 - 显示详细信息
      console.log('[ConnectPage] 真实用户，显示详细信息');
      this.showUserDetail(card.userData);
    } else if (card.id && card.id.startsWith('unmatched_')) {
      // 碰一碰虚拟用户 - 显示简单信息
      console.log('[ConnectPage] 碰一碰虚拟用户，显示简单信息');
      this.showUnmatchedDeviceInfo(card);
    } else {
      // 未知类型
      console.warn('[ConnectPage] 未知卡片类型:', card);
      wx.showToast({
        title: '用户类型不明',
        icon: 'none',
        duration: 1500
      });
    }
  },

  /**
   * 显示碰一碰虚拟用户信息
   */
  showUnmatchedDeviceInfo: function(card) {
    console.log('[ConnectPage] 显示碰一碰设备信息:', card);
    
    // 显示设备的基本信息和建议
    wx.showModal({
      title: '碰一碰设备',
      content: `设备名称：${card.name}\n\n${card.description || '这是一个还未在小程序中注册的Un设备用户。'}\n\n建议TA也下载小程序完善个人资料，这样你们就能看到更详细的匹配信息啦！`,
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#4CAF50'
    });
  },

  /**
   * 显示用户详细信息
   */
  showUserDetail: async function(userData) {
    console.log('[ConnectPage] 显示用户详细信息:', userData);
    
    // 检查是否是未匹配的设备
    if (!userData) {
      wx.showToast({
        title: '该设备用户未注册',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 🔍 增强数据完整性验证和调试日志
    console.log('[ConnectPage] 原始用户数据结构验证:');
    console.log('- userData存在:', !!userData);
    console.log('- advancedTags存在:', !!userData.advancedTags);
    console.log('- userInfo存在:', !!userData.userInfo);
    
    // 验证名片关键信息
    const cardInfoStatus = {
      contactInfo: userData.advancedTags?.contactInfo || '',
      personalTagsText: userData.advancedTags?.personalTagsText || '',
      qrCodeUrl: userData.advancedTags?.qrCodeUrl || ''
    };
    console.log('[ConnectPage] 名片关键信息状态:', {
      hasContactInfo: !!cardInfoStatus.contactInfo,
      hasPersonalTagsText: !!cardInfoStatus.personalTagsText,
      hasQrCodeUrl: !!cardInfoStatus.qrCodeUrl,
      contactInfoLength: cardInfoStatus.contactInfo.length,
      personalTagsTextLength: cardInfoStatus.personalTagsText.length
    });
    
    // 🎨 获取当前用户标签用于高亮显示匹配标签
    const currentUserTags = this.getCurrentUserTags();
    const matchedTagsSet = new Set(userData.matchedTags || []);
    
    // 为标签添加匹配状态标识
    const addMatchStatusToTags = (tags) => {
      return (tags || []).map(tag => ({
        name: tag,
        isMatched: matchedTagsSet.has(tag)
      }));
    };

    // 构建用户详细信息
    const userDetail = {
      name: userData.displayName || userData.advancedTags?.displayName || userData.userInfo?.nickName || '未知用户',
      // 🖼️ 头像修复：优先使用服务器存储的头像，fallback到美观默认头像
      avatarUrl: userData.avatarUrl || userData.userInfo?.avatarUrl || this.getDefaultAvatarUrl(userData.userInfo?.nickName || '朋友'),
      // 为每类标签添加匹配状态
      professionalTags: addMatchStatusToTags(userData.advancedTags?.professionalTags),
      interestTags: addMatchStatusToTags(userData.advancedTags?.interestTags),
      personalityTags: addMatchStatusToTags(userData.advancedTags?.personalityTags),
      quirkyTags: addMatchStatusToTags(userData.advancedTags?.quirkyTags),
      contactInfo: userData.advancedTags?.contactInfo || '',
      personalTagsText: userData.advancedTags?.personalTagsText || '',
      threshold: userData.advancedTags?.threshold || 3,
      totalTags: userData.totalTags || userData.advancedTags?.totalTags || 0,
      qrCodeUrl: userData.advancedTags?.qrCodeUrl || '',
      // 碰一碰相关信息
      matchScore: userData.matchScore,
      matchedTags: userData.matchedTags,
      firstTouchTime: this.formatTouchTime(userData.firstTouchTime)
    };
    
    console.log('[ConnectPage] 标签匹配状态:', {
      matchedTags: userData.matchedTags,
      professionalMatches: userDetail.professionalTags.filter(t => t.isMatched).length,
      interestMatches: userDetail.interestTags.filter(t => t.isMatched).length,
      personalityMatches: userDetail.personalityTags.filter(t => t.isMatched).length,
      quirkyMatches: userDetail.quirkyTags.filter(t => t.isMatched).length
    });
    
    // 🔍 验证构建后的用户详细信息
    console.log('[ConnectPage] 构建后的用户详细信息验证:');
    console.log('- 名片信息完整性:', {
      hasContactInfo: !!userDetail.contactInfo,
      hasPersonalTagsText: !!userDetail.personalTagsText, 
      hasQrCodeUrl: !!userDetail.qrCodeUrl,
      contactInfoContent: userDetail.contactInfo ? userDetail.contactInfo.substring(0, 50) + '...' : '空',
      personalTagsTextContent: userDetail.personalTagsText ? userDetail.personalTagsText.substring(0, 50) + '...' : '空',
      qrCodeUrlContent: userDetail.qrCodeUrl ? '有URL' : '无URL'
    });
    console.log('- 标签信息完整性:', {
      professionalTagsCount: userDetail.professionalTags.length,
      interestTagsCount: userDetail.interestTags.length,
      personalityTagsCount: userDetail.personalityTags.length,
      quirkyTagsCount: userDetail.quirkyTags.length
    });
    
    // 处理二维码URL（如果是云存储文件ID）
    if (userData.advancedTags?.qrCodeUrl && userData.advancedTags.qrCodeUrl.startsWith('cloud://')) {
      try {
        const tempUrlResult = await wx.cloud.getTempFileURL({
          fileList: [userData.advancedTags.qrCodeUrl]
        });
        
        if (tempUrlResult.fileList && tempUrlResult.fileList.length > 0) {
          const fileInfo = tempUrlResult.fileList[0];
          if (fileInfo.status === 0) {
            userDetail.qrCodeUrl = fileInfo.tempFileURL;
            console.log('[ConnectPage] 二维码URL转换成功:', userDetail.qrCodeUrl);
          }
        }
      } catch (urlError) {
        console.warn('[ConnectPage] 获取二维码URL失败:', urlError);
      }
    }
    
    // 🚨 名片信息完整性检查和警告
    const missingCardInfo = [];
    if (!userDetail.contactInfo) missingCardInfo.push('联系方式');
    if (!userDetail.personalTagsText) missingCardInfo.push('个人介绍');
    if (!userDetail.qrCodeUrl) missingCardInfo.push('微信二维码');
    
    if (missingCardInfo.length > 0) {
      console.warn('[ConnectPage] 朋友名片信息不完整，缺少:', missingCardInfo.join(', '));
      console.warn('[ConnectPage] 这可能导致朋友详情页面显示不全的问题');
    } else {
      console.log('[ConnectPage] ✅ 朋友名片信息完整，所有关键字段都存在');
    }
    
    // 🔍 新增：名片信息实时补充机制（安全修复：解决朋友名片显示不完整问题）
    const hasCompleteCardInfo = !!(
      userDetail.contactInfo || 
      userDetail.personalTagsText || 
      userDetail.qrCodeUrl
    );
    
    // 如果名片信息不完整且有朋友的openid，尝试获取最新信息
    if (!hasCompleteCardInfo && userData.openid) {
      try {
        console.log('[ConnectPage] 🔍 检测到名片信息不完整，尝试获取朋友最新信息');
        console.log('[ConnectPage] 🔍 朋友openid:', userData.openid);
        
        const latestInfo = await wx.cloud.callFunction({
          name: 'getUserData',
          data: { 
            openid: userData.openid,
            dataType: 'advanced' 
          }
        });
        
        if (latestInfo.result?.success && latestInfo.result?.data?.advancedTags) {
          const latestTags = latestInfo.result.data.advancedTags;
          console.log('[ConnectPage] 🔍 获取到朋友最新名片信息:', {
            hasContactInfo: !!latestTags.contactInfo,
            hasPersonalTagsText: !!latestTags.personalTagsText,
            hasQrCodeUrl: !!latestTags.qrCodeUrl
          });
          
          // 只更新缺失的字段，保持原有数据优先
          if (!userDetail.contactInfo && latestTags.contactInfo) {
            userDetail.contactInfo = latestTags.contactInfo;
            console.log('[ConnectPage] ✅ 补充联系方式信息');
          }
          if (!userDetail.personalTagsText && latestTags.personalTagsText) {
            userDetail.personalTagsText = latestTags.personalTagsText;
            console.log('[ConnectPage] ✅ 补充个人介绍信息');
          }
          if (!userDetail.qrCodeUrl && latestTags.qrCodeUrl) {
            userDetail.qrCodeUrl = latestTags.qrCodeUrl;
            console.log('[ConnectPage] ✅ 补充二维码信息');
            
            // 处理云存储URL转换
            if (latestTags.qrCodeUrl.startsWith('cloud://')) {
              try {
                const tempUrlResult = await wx.cloud.getTempFileURL({
                  fileList: [latestTags.qrCodeUrl]
                });
                
                if (tempUrlResult.fileList && tempUrlResult.fileList.length > 0) {
                  const fileInfo = tempUrlResult.fileList[0];
                  if (fileInfo.status === 0) {
                    userDetail.qrCodeUrl = fileInfo.tempFileURL;
                    console.log('[ConnectPage] ✅ 二维码云存储URL转换成功');
                  }
                }
              } catch (urlError) {
                console.warn('[ConnectPage] ⚠️ 二维码URL转换失败:', urlError);
                // 继续使用原始URL
              }
            }
          }
          
          console.log('[ConnectPage] ✅ 成功补充朋友名片信息，现在信息完整性:', {
            hasContactInfo: !!userDetail.contactInfo,
            hasPersonalTagsText: !!userDetail.personalTagsText,
            hasQrCodeUrl: !!userDetail.qrCodeUrl
          });
        } else {
          console.log('[ConnectPage] ⚠️ 未能获取到朋友的有效名片信息，使用原有数据');
        }
      } catch (error) {
        console.warn('[ConnectPage] ⚠️ 获取朋友最新名片信息失败，使用原有数据:', error);
        // 继续使用原有数据，不影响正常流程
      }
    } else if (hasCompleteCardInfo) {
      console.log('[ConnectPage] ✅ 朋友名片信息已完整，无需额外查询');
    } else {
      console.log('[ConnectPage] ⚠️ 朋友未注册或缺少openid，无法获取最新信息');
    }
    
    // 显示用户详细信息弹窗
    this.setData({
      showUserDetailModal: true,
      selectedUserDetail: userDetail
    });
    
    console.log('[ConnectPage] 用户详细信息:', userDetail);
  },

  /**
   * 关闭用户详细信息弹窗
   */
  closeUserDetailModal: function() {
    this.setData({
      showUserDetailModal: false,
      selectedUserDetail: null
    });
  },

  /**
   * 切换未注册设备列表显示状态
   */
  toggleUnregisteredDevices: function() {
    this.setData({
      showUnregisteredDevices: !this.data.showUnregisteredDevices
    });
  },

  /**
   * 二维码图片加载失败处理
   */
  onQRCodeError: function(e) {
    console.error('[ConnectPage] 二维码图片加载失败:', e);
    
    // 隐藏二维码区域
    this.setData({
      'selectedUserDetail.qrCodeUrl': ''
    });
    
    wx.showToast({
      title: '二维码加载失败',
      icon: 'none',
      duration: 2000
    });
  },



  /**
   * 保存二维码图片
   */
  saveQRCodeImage: function() {
    const qrCodeUrl = this.data.selectedUserDetail.qrCodeUrl;
    if (!qrCodeUrl) {
      wx.showToast({
        title: '二维码不可用',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '保存中...'
    });

    // 下载图片到本地
    wx.downloadFile({
      url: qrCodeUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          // 保存到相册
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.hideLoading();
              wx.showToast({
                title: '保存成功',
                icon: 'success'
              });
            },
            fail: (err) => {
              wx.hideLoading();
              console.error('[ConnectPage] 保存图片失败:', err);
              if (err.errMsg.includes('auth deny')) {
                wx.showModal({
                  title: '保存失败',
                  content: '需要您授权保存图片到相册',
                  showCancel: false
                });
              } else {
                wx.showToast({
                  title: '保存失败',
                  icon: 'none'
                });
              }
            }
          });
        } else {
          wx.hideLoading();
          wx.showToast({
            title: '下载失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('[ConnectPage] 下载图片失败:', err);
        wx.showToast({
          title: '下载失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 转发二维码
   */
  shareQRCode: function() {
    const userDetail = this.data.selectedUserDetail;
    const shareContent = `推荐好友：${userDetail.name}\n${userDetail.contactInfo || ''}\n标签：${userDetail.totalTags}个`;
    
    wx.showModal({
      title: '转发给朋友',
      content: shareContent,
      confirmText: '复制内容',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: shareContent,
            success: () => {
              wx.showToast({
                title: '内容已复制',
                icon: 'success'
              });
            }
          });
        }
      }
    });
  },

  /**
   * 显示主题详情
   */
  showCardDetail: function(index) {
    if (index >= 0 && index < this.data.userCards.length) {
      const card = this.data.userCards[index];
      this.setData({
        selectedCard: card,
        showCardPreview: true
      });
    }
  },
  
  /**
   * 关闭主题预览
   */
  closeCardPreview: function() {
    this.setData({
      showCardPreview: false
    });
  },

  /**
   * 加载碰一碰匹配结果
   */
  /**
   * 从数据库加载朋友列表（新方法）
   */
  loadFriendsFromDatabase: async function() {
    try {
      console.log('🌩️ [ConnectPage] 开始从云端数据库加载朋友列表');
      
      // 显示加载状态
      wx.showLoading({
        title: '从云端加载朋友...',
        mask: true
      });
      
      // 获取当前用户openid - 修复获取逻辑
      let currentUserOpenId = wx.getStorageSync('openid') || 
                              getApp().globalData.openid;
      
      console.log('📋 [ConnectPage] 尝试获取openid:', {
        localStorage: wx.getStorageSync('openid'),
        globalData: getApp().globalData.openid
      });
      
      // 如果还是没有openid，尝试通过云函数登录获取
      if (!currentUserOpenId) {
        console.log('[ConnectPage] 未找到本地openid，尝试云函数登录');
        try {
          const loginRes = await wx.cloud.callFunction({
            name: 'login'
          });
          console.log('[ConnectPage] 登录云函数响应:', loginRes);
          
          if (loginRes.result && loginRes.result.openid) {
            currentUserOpenId = loginRes.result.openid;
            wx.setStorageSync('openid', currentUserOpenId);
            getApp().globalData.openid = currentUserOpenId;
            console.log('[ConnectPage] 通过云函数获取openid成功:', currentUserOpenId);
          } else if (loginRes.result && loginRes.result.data && loginRes.result.data._openid) {
            // 兼容不同的返回格式
            currentUserOpenId = loginRes.result.data._openid;
            wx.setStorageSync('openid', currentUserOpenId);
            getApp().globalData.openid = currentUserOpenId;
            console.log('[ConnectPage] 通过云函数获取openid成功(备用格式):', currentUserOpenId);
          }
        } catch (loginError) {
          console.error('[ConnectPage] 云函数登录失败:', loginError);
        }
      }
      
      if (!currentUserOpenId) {
        console.error('[ConnectPage] 仍然无法获取用户openid，降级到本地存储方式');
        // 显示友好的错误信息
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none',
          duration: 2000
        });
        // 降级到本地存储方式
        this.loadTouchListResult();
        return;
      }
      
      console.log('✅ [ConnectPage] 成功获取openid，开始加载朋友列表:', currentUserOpenId);
      
      // 📞 调用云函数获取用户的朋友列表
      console.log('📞 开始调用 getUserData 云函数...');
      const startTime = Date.now();
      
      const res = await Promise.race([
        wx.cloud.callFunction({
          name: 'getUserData',
          data: {
            openid: currentUserOpenId,
            type: 'advanced',
            includeFriends: true
          }
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('云函数调用超时 (10秒)')), 10000);
        })
      ]);
      
      const endTime = Date.now();
      console.log(`📞 getUserData 调用完成，耗时 ${endTime - startTime}ms`);
      console.log('📞 getUserData 返回结果:', JSON.stringify(res.result, null, 2));
      
      // 隐藏加载状态
      wx.hideLoading();
      
      // 增强错误处理
      if (!res || !res.result) {
        console.error('❌ [ConnectPage] 云函数返回结果格式异常:', res);
        throw new Error('云函数返回格式错误');
      }
      
      if (!res.result.success) {
        console.error('❌ [ConnectPage] 云函数执行失败:', res.result.message || '未知错误');
        throw new Error(res.result.message || '获取用户数据失败');
      }
      
      if (!res.result.data) {
        console.log('[ConnectPage] 用户数据不存在，可能是新用户');
        // 显示空状态，不算错误
        this.setData({
          matchedFriends: [],
          unmatchedDevices: [],
          touchListResult: {
            success: true,
            matchedUsers: [],
            unmatchedDevices: [],
            fromDatabase: true,
            isEmpty: true
          }
        });
        return;
      }
      
      const userData = res.result.data;
      const friends = userData.friends || [];
      
      console.log('✅ [ConnectPage] 从云端数据库加载到朋友数量:', friends.length);
      console.log('✅ 朋友详情:', friends.map(f => ({ name: f.friendDeviceName, openid: f.friendOpenid })));
        
        // 将朋友数据转换为匹配用户格式，保持UI兼容性
        // 获取当前用户的所有标签用于匹配度计算
        const currentUserTags = this.getCurrentUserTags();
        console.log('[ConnectPage] 当前用户标签:', currentUserTags);
        
        const matchedFriends = friends.map(friend => {
          // 判断是否为未注册设备
          const isUnregistered = friend.isUnregistered || friend.deviceOnly || !friend.friendOpenid;
          
          // 重新计算匹配度和匹配标签
          let recalculatedMatchScore = 0;
          let recalculatedMatchedTags = [];
          
          if (!isUnregistered && friend.friendUserInfo) {
            // 获取朋友的所有标签
            const friendTags = [
              ...(friend.friendUserInfo.professionalTags || []),
              ...(friend.friendUserInfo.interestTags || []),
              ...(friend.friendUserInfo.personalityTags || []),
              ...(friend.friendUserInfo.quirkyTags || [])
            ];
            
            // 计算共同标签
            recalculatedMatchedTags = currentUserTags.filter(tag => friendTags.includes(tag));
            recalculatedMatchScore = recalculatedMatchedTags.length;
            
            console.log(`[ConnectPage] 重新计算匹配度 - ${friend.friendUserInfo?.displayName}:`, {
              friendTags: friendTags.length,
              matchedTags: recalculatedMatchedTags,
              matchScore: recalculatedMatchScore
            });
          }
          
          return {
            openid: friend.friendOpenid || 'unregistered',
            displayName: isUnregistered ? 
              `${friend.friendDeviceName} (未注册)` : 
              (friend.friendUserInfo?.displayName || friend.friendUserInfo?.nickName || '未知用户'),
            deviceName: friend.friendDeviceName,
            // 🖼️ 头像修复：优先使用朋友的存储头像，fallback到美观默认头像
            avatarUrl: isUnregistered ? 
              this.getDefaultAvatarUrl('unregistered') : 
              (friend.friendUserInfo?.avatarUrl || this.getDefaultAvatarUrl(friend.friendUserInfo?.nickName || friend.friendUserInfo?.displayName || 'friend')),
            matchScore: recalculatedMatchScore,
            matchedTags: recalculatedMatchedTags,
            firstTouchTime: friend.firstMeetTime || friend.lastMeetTime,
            meetCount: friend.meetCount || 1,
            isFromDatabase: true, // 标识这是从数据库加载的
            isRegistered: !isUnregistered, // 标识注册状态
            isUnregistered: isUnregistered, // 标识是否为未注册设备
            friendType: isUnregistered ? 'device' : 'user', // 朋友类型：设备或用户
            // 🔥 新增：添加完整的名片信息，兼容showUserDetail函数的期望结构
            advancedTags: isUnregistered ? null : {
              displayName: friend.friendUserInfo?.displayName || '未设置昵称',
              contactInfo: friend.friendUserInfo?.contactInfo || '',
              personalTagsText: friend.friendUserInfo?.personalTagsText || '',
              qrCodeUrl: friend.friendUserInfo?.qrCodeUrl || '',
              professionalTags: friend.friendUserInfo?.professionalTags || [],
              interestTags: friend.friendUserInfo?.interestTags || [],
              personalityTags: friend.friendUserInfo?.personalityTags || [],
              quirkyTags: friend.friendUserInfo?.quirkyTags || [],
              threshold: friend.friendUserInfo?.threshold || 3
            },
            userInfo: isUnregistered ? null : {
              avatarUrl: friend.friendUserInfo?.avatarUrl || '',
              nickName: friend.friendUserInfo?.nickName || ''
            },
            totalTags: friend.friendUserInfo?.totalTags || 0
          };
        });
        
        // 计算注册用户和未注册设备数量
        const registeredCount = matchedFriends.filter(f => f.isRegistered).length;
        const unregisteredCount = matchedFriends.filter(f => f.isUnregistered).length;
        
        this.setData({
          matchedFriends: matchedFriends,
          unmatchedDevices: [], // 数据库中的都是已匹配用户
          registeredFriendsCount: registeredCount,
          unregisteredDevicesCount: unregisteredCount,
          totalFriendsCount: matchedFriends.length,
          touchListResult: {
            success: true,
            matchedUsers: matchedFriends,
            unmatchedDevices: [],
            fromDatabase: true
          }
        });
        
        // 立即刷新显示
        this.initUserCards();
        
        console.log('✅ [ConnectPage] 云端朋友列表加载完成');
        
        // 显示成功提示
        wx.showToast({
          title: `云端同步成功！找到${friends.length}个朋友`,
          icon: 'success',
          duration: 2000
        });
        
    } catch (error) {
      console.error('❌ [ConnectPage] 从数据库加载朋友列表失败:', error);
      console.error('❌ 错误详情:', {
        message: error.message,
        errMsg: error.errMsg,
        stack: error.stack
      });
      
      // 隐藏加载状态
      wx.hideLoading();
      
      // 显示用户友好的错误信息
      wx.showToast({
        title: `云端加载失败: ${error.message || '网络异常'}`,
        icon: 'none',
        duration: 3000
      });
      
      // 降级到本地存储方式
      console.log('⬇️ [ConnectPage] 尝试降级到本地存储方式');
      this.loadTouchListResult();
      
      // 如果本地存储也没有数据，显示空状态
      setTimeout(() => {
        if ((!this.data.matchedFriends || this.data.matchedFriends.length === 0) &&
            (!this.data.unmatchedDevices || this.data.unmatchedDevices.length === 0)) {
          console.log('[ConnectPage] 本地存储也无数据，显示空状态');
          this.setData({
            matchedFriends: [],
            unmatchedDevices: [],
            touchListResult: {
              success: false,
              error: '加载朋友列表失败',
              isEmpty: true
            }
          });
          // 触发UI更新
          this.initUserCards();
        }
      }, 1000);
    }
  },

  /**
   * 加载碰一碰结果（兼容旧方法）
   */
  loadTouchListResult: function() {
    try {
      const result = wx.getStorageSync('touchListResult');
      console.log('[ConnectPage] 尝试加载碰一碰结果，存储中的数据:', result);
      
      if (result) {
        console.log('[ConnectPage] 找到碰一碰结果:', {
          matchedUsers: result.matchedUsers?.length || 0,
          unmatchedDevices: result.unmatchedDevices?.length || 0,
          updateTime: result.updateTime
        });
        
        this.setData({
          touchListResult: result,
          matchedFriends: result.matchedUsers || [],
          unmatchedDevices: result.unmatchedDevices || []
        });
        
        // 立即刷新显示
        this.initUserCards();
      } else {
        console.log('[ConnectPage] 未找到碰一碰结果，显示空状态');
      }
    } catch (error) {
      console.error('[ConnectPage] 加载碰一碰结果失败:', error);
    }
  },

  /**
   * 初始化用户名片卡片
   */
  initUserCards: async function() {
    console.log('[ConnectPage] 初始化用户名片卡片');
    this.setData({ isLoading: true, loadError: '' });

    try {
      // 优先显示碰一碰的朋友
      const { matchedFriends, unmatchedDevices } = this.data;
      let displayUsers = [];
      
      if (matchedFriends.length > 0 || unmatchedDevices.length > 0) {
        console.log('[ConnectPage] 使用碰一碰数据创建卡片');
        
        // 先添加已匹配的朋友（包括注册用户和未注册设备）
        displayUsers = matchedFriends.map((friend, index) => {
          // 判断是否为未注册设备
          const isUnregistered = friend.isUnregistered || friend.friendType === 'device';
          
          return {
            id: `matched_${index}`,
            openid: friend.openid,
            name: friend.displayName || '未知用户',
            subtitle: isUnregistered ? 
              '未注册设备' : 
              `${friend.matchScore}个共同标签`,
            description: isUnregistered ? 
              '该设备用户尚未注册小程序' : 
              (friend.matchedTags ? friend.matchedTags.slice(0, 3).join(' · ') : '暂无标签'),
            theme: isUnregistered ? '未注册设备' : '碰一碰朋友',
            color: this.getUserThemeColor(index),
            // 🖼️ 头像修复：使用美观的默认头像
            avatarUrl: friend.avatarUrl || this.getDefaultAvatarUrl(friend.name || 'friend'),
            userData: friend,
            isMatched: !isUnregistered,
            isUnregistered: isUnregistered,
            matchScore: friend.matchScore,
            matchedTags: friend.matchedTags,
            totalTags: friend.totalTags || 0,
            firstTouchTime: friend.firstTouchTime,
            deviceName: friend.deviceName, // 保留设备名信息
            details: {
              concept: isUnregistered ? 
                '未注册的碰一碰设备' : 
                `匹配度: ${friend.matchScore}个共同标签`,
              features: isUnregistered ? 
                [`设备ID: ${friend.deviceName}`] : 
                (friend.matchedTags || []),
              philosophy: isUnregistered ? 
                '通过碰一碰发现的设备，用户尚未注册' : 
                '通过碰一碰认识的朋友'
            }
          };
        });
        
        // 注意：由于云函数现在会将未注册设备也添加到friends列表，
        // 这里的unmatchedDevices应该为空，保留作为兜底处理
        const unmatchedCards = unmatchedDevices.map((device, index) => {
          console.log('[ConnectPage] 处理兜底的未匹配设备:', device.deviceName);
          const deviceInfo = this.analyzeUnmatchedDevice(device);
          
          return {
            id: `unmatched_${index}`,
            openid: 'unregistered',
            name: `${device.deviceName} (未注册)`,
            subtitle: '未注册设备',
            description: '该设备用户尚未注册小程序',
            theme: '未注册设备',
            color: '#999999', // 灰色表示未注册
            avatarUrl: '/images/default-unregistered.png',
            userData: null,
            isMatched: false,
            isUnregistered: true,
            deviceName: device.deviceName,
            firstTouchTime: device.firstTouchTime,
            matchScore: 0,
            matchedTags: [],
            totalTags: 0,
            details: {
              concept: '未注册的碰一碰设备',
              features: [`设备ID: ${device.deviceName}`],
              philosophy: '通过碰一碰发现的设备，用户尚未注册'
            }
          };
        });
        
        displayUsers = [...displayUsers, ...unmatchedCards];
      }
      
      // 检查是否有未匹配的设备需要特殊显示（本地模式等）
      if (displayUsers.length === 0 && unmatchedDevices.length > 0) {
        console.log('[ConnectPage] 显示未匹配设备');
        
        // 显示未匹配的设备，包括本地模式设备
        const unmatchedCards = unmatchedDevices.map((device, index) => {
          const deviceInfo = this.analyzeUnmatchedDevice(device);
          
          return {
            id: `unmatched_${index}`,
            openid: null,
            name: deviceInfo.displayName,
            subtitle: deviceInfo.subtitle,
            description: deviceInfo.description,
            theme: deviceInfo.theme,
            color: deviceInfo.color,
            avatarUrl: '/images/default-device.jpg',
            userData: null,
            isMatched: false,
            deviceName: device.deviceName,
            firstTouchTime: device.firstTouchTime,
            matchScore: deviceInfo.matchScore,
            matchedTags: deviceInfo.matchedTags,
            totalTags: deviceInfo.totalTags,
            isLocalMode: device.status === 'local_mode',
            details: {
              concept: deviceInfo.concept,
              features: deviceInfo.features,
              philosophy: deviceInfo.philosophy
            }
          };
        });
        
        displayUsers = [...displayUsers, ...unmatchedCards];
      }
      
      // 如果完全没有数据，显示提示信息
      if (displayUsers.length === 0) {
        console.log('[ConnectPage] 无任何碰一碰数据，显示空状态');
        // 创建一个提示卡片
        displayUsers = [{
          id: 'empty',
          openid: null,
          name: '开始碰一碰',
          subtitle: '暂无朋友',
          description: '使用设备与朋友碰一碰，即可在这里看到匹配的朋友',
          theme: '提示',
          color: '#999999',
          // 🖼️ 头像修复：使用美观的默认头像
          avatarUrl: this.getDefaultAvatarUrl('empty'),
          userData: null,
          isMatched: false,
          isEmpty: true,
          details: {
            concept: '使用UnionLink设备与朋友碰一碰',
            features: ['自动记录碰一碰的朋友', '显示标签匹配度', '发现志同道合的伙伴'],
            philosophy: '通过碰一碰，让社交更简单'
          }
        }];
      }
      
      console.log('[ConnectPage] 用户名片卡片初始化成功:', displayUsers.length, '个用户');
      
      // 分离注册用户和未注册设备
      const registeredUsers = displayUsers.filter(user => !user.isUnregistered);
      const unregisteredDevices = displayUsers.filter(user => user.isUnregistered);
      
      console.log('[ConnectPage] 分离结果:', registeredUsers.length, '个注册用户,', unregisteredDevices.length, '个未注册设备');
      
      this.setData({
        userCards: displayUsers,
        registeredUserCards: registeredUsers,
        unregisteredUserCards: unregisteredDevices,
        isLoading: false
      });
    } catch (error) {
      console.error('[ConnectPage] 初始化用户名片失败:', error);
      this.setData({
        isLoading: false,
        loadError: '加载用户数据失败'
      });
    }
  },

  /**
   * 从users_adv集合获取用户数据
   */
  getUsersFromUsersAdv: async function() {
    try {
      console.log('[ConnectPage] 开始从users_adv获取用户数据');
      
      const db = wx.cloud.database();
      const MAX_LIMIT = 100;
      
      // 获取总数
      const countResult = await db.collection('users_adv').count();
      const total = countResult.total;
      console.log('[ConnectPage] users_adv集合总用户数:', total);
      
      if (total === 0) {
        return [];
      }
      
      // 分批获取所有用户数据
      const batchTimes = Math.ceil(total / MAX_LIMIT);
      const allUsers = [];
      
      for (let i = 0; i < batchTimes; i++) {
        const result = await db.collection('users_adv')
          .skip(i * MAX_LIMIT)
          .limit(MAX_LIMIT)
          .orderBy('updateTime', 'desc')
          .get();
          
        if (result.data && result.data.length > 0) {
          allUsers.push(...result.data);
        }
      }
      
      console.log('[ConnectPage] 成功获取用户数据:', allUsers.length, '个用户');
      
      // 处理头像URL
      for (let user of allUsers) {
        if (user.userInfo && user.userInfo.avatarFileID) {
          try {
            const tempUrlResult = await wx.cloud.getTempFileURL({
              fileList: [user.userInfo.avatarFileID]
            });
            
            if (tempUrlResult.fileList && tempUrlResult.fileList.length > 0) {
              const fileInfo = tempUrlResult.fileList[0];
              if (fileInfo.status === 0) {
                user.userInfo.avatarUrl = fileInfo.tempFileURL;
              }
            }
          } catch (urlError) {
            console.warn('[ConnectPage] 获取头像URL失败:', urlError);
          }
        }
      }
      
      return allUsers;
    } catch (error) {
      console.error('[ConnectPage] 从users_adv获取用户数据失败:', error);
      throw error;
    }
  },

  /**
   * 生成用户描述
   */
  generateUserDescription: function(user) {
    const tags = user.advancedTags;
    if (!tags) return '暂无标签信息';
    
    const professionalTags = tags.professionalTags || [];
    const interestTags = tags.interestTags || [];
    const personalityTags = tags.personalityTags || [];
    const quirkyTags = tags.quirkyTags || [];
    
    // 组合标签生成描述
    const allTags = [...professionalTags, ...interestTags, ...personalityTags, ...quirkyTags];
    
    if (allTags.length === 0) return '暂无标签信息';
    
    // 取前3个标签作为描述
    const displayTags = allTags.slice(0, 3);
    return displayTags.join(' · ');
  },

  /**
   * 获取用户标签列表
   */
  getUserTags: function(user) {
    const tags = user.advancedTags;
    if (!tags) return ['暂无标签'];
    
    const professionalTags = tags.professionalTags || [];
    const interestTags = tags.interestTags || [];
    const personalityTags = tags.personalityTags || [];
    const quirkyTags = tags.quirkyTags || [];
    
    // 组合所有标签
    const allTags = [...professionalTags, ...interestTags, ...personalityTags, ...quirkyTags];
    
    if (allTags.length === 0) return ['暂无标签'];
    
    // 返回前6个标签
    return allTags.slice(0, 6);
  },

  /**
   * 获取用户主题颜色
   */
  getUserThemeColor: function(index) {
    const colors = this.data.themeColors;
    return colors[index % colors.length];
  },

  /**
   * 获取交互用户名片
   */
  getInteractionCards: function() {
    // 直接调用初始化用户名片卡片
    this.initUserCards();
  },

  /**
   * 图片加载失败处理
   */
  onImageError: function(e) {
    const index = e.currentTarget.dataset.index;
    console.error(`主题图片加载失败，索引: ${index}`, e);
    
    // 获取当前主题卡片
    const card = this.data.userCards[index];
    if (card) {
      console.log('加载失败的图片URL:', card.avatarUrl);
      
      // 可以在这里设置备用图片或清空URL
      // 简单将该卡片的头像URL设为空
      const newCards = [...this.data.userCards];
      newCards[index].avatarUrl = '';
      
      this.setData({
        userCards: newCards
      });
    }
  },
  
  /**
   * 图片加载成功处理
   */
  onImageLoad: function(e) {
    const index = e.currentTarget.dataset.index;
    console.log(`主题图片加载成功，索引: ${index}`);
  },

  /**
   * 设置触摸性能优化选项
   */
  setTouchPerfOptions: function() {
    // 设置wx.createSelectorQuery的性能选项
    if (wx.canIUse('createSelectorQuery.in')) {
      const query = wx.createSelectorQuery();
      
      // 尝试禁用滚动节流，提高流畅度
      if (query.in && query.in.scrollThrottle) {
        query.in({
          scrollThrottle: false
        });
      }
    }
    
    // 设置页面渲染层优化
    if (wx.canIUse('setPageStyle')) {
      wx.setPageStyle({
        style: {
          // 开启渲染新层优化
          'layer-performance-mode': 'fast'
        }
      }).catch(() => {
        // 忽略不支持的API错误
      });
    }
  },

  /**
   * 生成背景星星
   */
  generateStars() {
    const starCount = 50; // 星星数量
    let stars = [];
    
    for (let i = 0; i < starCount; i++) {
      // 随机位置和大小
      stars.push({
        id: i,
        x: Math.random() * 750, // 屏幕宽度为750rpx
        y: Math.random() * 1600, // 假设屏幕高度
        size: Math.random() * 4 + 1, // 星星大小1-5rpx
        opacity: Math.random() * 0.5 + 0.1, // 不透明度0.1-0.6
      });
    }
    
    this.setData({ stars });
  },

  /**
   * 初始化动画
   */
  initAnimation() {
    // 设置触摸性能优化，提高滚动流畅度
    this.setTouchPerfOptions();
    
    // 初始化主题预览相关数据
    this.setData({
      showCardPreview: false,
      selectedCard: {}
    });
  },

  /**
   * 同步主题索引到全局数据
   */
  syncThemeToGlobal: function(themeIndex) {
    const app = getApp();
    if (!app.globalData) {
      app.globalData = {};
    }
    app.globalData.currentThemeIndex = themeIndex;
    
    // 主题切换时重新加载社群成员
    this.loadCommunityMembers();
    
    console.log(`同步主题索引到全局: ${themeIndex}`);
  },

  // 静默加载分类数据，不显示加载提示
  loadClassificationDataSilently: function() {
    console.log('[ConnectPage] 静默加载分类数据...');
    
    // 直接从 class_bar 读取分类结果
    const db = wx.cloud.database();
    db.collection('class_bar').get({
      success: res => {
        console.log('从class_bar获取数据成功', res.data);
        console.log('class_bar原始数据结构检查:', res.data);
        
        // 智能解析数据结构
        let classifications = [];
        if (res.data && res.data.length > 0) {
          // 检查是否是嵌套结构 res.data[0].data
          if (res.data[0].data && Array.isArray(res.data[0].data)) {
            classifications = res.data[0].data;
            console.log('✅ 使用嵌套结构解析出的主题数组:', classifications.length, '个主题');
          } 
          // 检查是否是直接数组结构，且第一个元素有theme属性
          else if (res.data[0].theme) {
            classifications = res.data;
            console.log('✅ 使用直接数组结构解析出的主题数组:', classifications.length, '个主题');
          }
          // 其他情况的兜底处理
          else {
            console.warn('⚠️ 未知的数据结构，使用降级处理');
            classifications = res.data;
          }
        } else {
          console.error('❌ class_bar数据为空或无效');
          classifications = [];
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

            this.setData({
              classifications: reorderedClassifications,
              currentUserOpenId: openid
            });
            
            console.log('[ConnectPage] 分类数据加载完成');
            // 成功后加载社群成员数据
            this.loadCommunityMembers();
            // 更新主题颜色
            this.updateCurrentThemeColor();
          },
          fail: loginErr => {
            console.error('获取用户信息失败', loginErr);
            this.setData({ 
              classifications,
              currentUserOpenId: '' // 失败时清空
            });
          }
        });
      },
      fail: err => {
        console.error('从class_bar获取数据失败', err);
        // 静默失败，不显示错误提示
      }
    });
  },







  /**
   * 获取当前用户在主题中的社群颜色（带缓存优化）
   */
  getCurrentThemeColor: function() {
    const currentThemeIndex = this.data.currentTrackIndex;
    const currentCard = this.data.userCards[currentThemeIndex];
    
    // 首先检查卡片是否已有缓存的用户颜色
    if (currentCard && currentCard.userCachedColor) {
      console.log('使用缓存的用户颜色:', currentCard.userCachedColor);
      return currentCard.userCachedColor;
    }
    
    const classifications = this.data.classifications;
    const currentUserOpenid = this.data.currentUserOpenId;
    
    if (!classifications || !classifications[currentThemeIndex] || !currentUserOpenid) {
      const defaultColor = this.data.themeColors[0];
      this.cacheUserColorToCard(currentThemeIndex, defaultColor);
      return defaultColor;
    }
    
    const currentTheme = classifications[currentThemeIndex];
    const communities = currentTheme.communities || [];
    
    // 找到用户所在的社群索引
    for (let i = 0; i < communities.length; i++) {
      const community = communities[i];
      if (community.members && community.members.some(member => member.openid === currentUserOpenid)) {
        // 根据社群索引返回对应颜色，确保不超出颜色数组范围
        const colorIndex = i % this.data.themeColors.length;
        const userColor = this.data.themeColors[colorIndex];
        console.log(`用户在第${i + 1}个社群，使用第${colorIndex + 1}个颜色:`, userColor);
        
        // 缓存颜色到卡片数据中
        this.cacheUserColorToCard(currentThemeIndex, userColor);
        return userColor;
      }
    }
    
    // 如果没找到用户，返回默认颜色
    console.log('未找到用户所在社群，使用默认颜色');
    const defaultColor = this.data.themeColors[0];
    this.cacheUserColorToCard(currentThemeIndex, defaultColor);
    return defaultColor;
  },

  /**
   * 缓存用户颜色到卡片数据中
   */
  cacheUserColorToCard: function(themeIndex, color) {
    const cards = [...this.data.userCards];
    if (cards[themeIndex]) {
      cards[themeIndex].userCachedColor = color;
      this.setData({ cards });
      console.log(`缓存颜色 ${color} 到主题 ${themeIndex}`);
    }
  },

  /**
   * 更新当前主题颜色
   */
  updateCurrentThemeColor: function() {
    const themeColor = this.getCurrentThemeColor();
    this.setData({
      currentThemeColor: themeColor
    });
    console.log('更新主题颜色为:', themeColor);
  },

  /**
   * 【照抄briefing成功方案】根据当前主题加载社群成员
   */
  loadCommunityMembers: function() {
    const currentThemeIndex = this.data.currentTrackIndex;
    const currentTheme = this.data.userCards[currentThemeIndex];
    const classifications = this.data.classifications;
    const currentUserOpenid = this.data.currentUserOpenId;
    
    console.log('=== 【新版本】开始加载社群成员 ===');
    console.log('当前主题索引:', currentThemeIndex);
    console.log('当前主题:', currentTheme);
    
    // 🔥 关键修复：检查当前主题是否是碰一碰生成的虚拟用户
    if (!currentTheme || !currentTheme.name) {
      console.error('❌ 当前主题为空');
      return;
    }
    
    // 检查是否是碰一碰生成的Un用户（虚拟用户）
    if (currentTheme.name.startsWith('Un用户') || currentTheme.id.startsWith('unmatched_')) {
      console.log('🎯 当前是碰一碰虚拟用户，跳过社群数据加载');
      this.setData({
        communityMembers: [],
        currentUserCommunity: null
      });
      return;
    }
    console.log('分类数据长度:', classifications.length);
    console.log('当前用户openid:', currentUserOpenid);
    
    // 继续处理真实社群主题 - 统一检查
    if (!classifications || classifications.length === 0) {
      console.error('❌ 分类数据为空，等待数据加载');
      wx.showToast({
        title: '请等待数据加载完成',
        icon: 'none'
      });
      return;
    }
    
    if (!currentUserOpenid) {
      console.error('❌ 用户openid为空');
      wx.showToast({
        title: '请稍后重试',
        icon: 'none'
      });
      return;
    }
    
    // 🔍 调试信息
    console.log('=== 调试信息 ===');
    console.log('可用主题列表:', classifications.map(t => t.theme));
    console.log('当前选择的主题名:', currentTheme.name);
    
    // 🎯 在真实社群分类中匹配主题
    const themeData = classifications.find(theme => theme.theme === currentTheme.name);
    console.log('找到的主题数据:', themeData);
    
    if (!themeData || !themeData.communities) {
      console.log('⚠️ 未找到当前主题的社群数据:', currentTheme.name);
      console.log('可用的主题列表:', classifications.map(t => t.theme));
      this.setData({
        communityMembers: [],
        currentUserCommunity: null
      });
      wx.showToast({
        title: '该主题暂无社群数据',
        icon: 'none'
      });
      return;
    }
    
    console.log('主题社群数量:', themeData.communities.length);
    
    // 查找当前用户所在的社群
    let userCommunity = null;
    let communityMembers = [];
    
    for (let i = 0; i < themeData.communities.length; i++) {
      const community = themeData.communities[i];
      console.log(`检查社群 ${i + 1}:`, community.name, '成员数量:', community.members ? community.members.length : 0);
      
      if (community.members) {
        const userInCommunity = community.members.find(member => {
          console.log('检查成员openid:', member.openid, '与当前用户:', currentUserOpenid);
          return member.openid === currentUserOpenid;
        });
        
        if (userInCommunity) {
          console.log('找到用户所在社群:', community.name);
          userCommunity = community;
          // 获取除了当前用户之外的其他成员
          communityMembers = community.members.filter(member => 
            member.openid !== currentUserOpenid
          );
          console.log('社群其他成员数量:', communityMembers.length);
          break;
        }
      }
    }
    
    console.log('当前用户社群:', userCommunity);
    console.log('社群其他成员:', communityMembers);
    
    this.setData({
      currentUserCommunity: userCommunity,
      communityMembers: communityMembers,
      myPairs: communityMembers // 复用原有的显示逻辑
    });
    
    if (!userCommunity) {
      wx.showToast({
        title: '您还未被分配到任何社群',
        icon: 'none',
        duration: 3000
      });
    } else {
      console.log('成功加载社群成员，社群:', userCommunity.name, '其他成员:', communityMembers.length);
    }
  },

  /**
   * 显示配对理由弹窗 - 改为显示社群信息
   */
  showPairModal: function(e) {
    const openid = e.currentTarget.dataset.openid;
    const user = this.data.communityMembers.find(u => u.openid === openid);
    const currentUserCommunity = this.data.currentUserCommunity;
    
    let modalContent = '';
    if (currentUserCommunity) {
      modalContent = `社群：${currentUserCommunity.name}\n\n描述：${currentUserCommunity.description}`;
      if (user && user.userInfo) {
        modalContent += `\n\n与 ${user.userInfo.nickName} 同属一个社群，你们有相似的特质和兴趣！`;
      }
    } else {
      modalContent = '暂无社群信息';
    }
    
    this.setData({
      showPairModal: true,
      pairModalContent: modalContent,
      pairModalUser: user
    });
  },
  closePairModal: function() {
    this.setData({ showPairModal: false });
  },

  /**
   * 显示详细名片
   */
  showDetailedCard: function(e) {
    const memberIndex = e.currentTarget.dataset.memberIndex;
    const selectedCard = this.data.selectedCard;
    
    if (!selectedCard.pairedUsers || memberIndex >= selectedCard.pairedUsers.length) {
      console.error('成员索引无效:', memberIndex);
      wx.showToast({
        title: '成员信息异常',
        icon: 'none'
      });
      return;
    }
    
    const selectedMember = selectedCard.pairedUsers[memberIndex];
    
    console.log('=== 显示详细名片 ===');
    console.log('成员索引:', memberIndex);
    console.log('选中成员:', selectedMember);
    
    // 设置加载状态并显示弹窗
    selectedMember.isGeneratingReason = true;
    selectedMember.matchReason = null;
    
    this.setData({
      showDetailedCard: true,
      selectedMember: selectedMember
    });
    
    console.log('显示详细名片弹窗:', {
      用户昵称: selectedMember.userInfo?.nickName,
      用户openid: selectedMember.openid
    });
    
    // 异步生成AI匹配理由
    this.generateMatchReason(selectedMember);
  },

  /**
   * 生成AI匹配理由（带缓存）
   */
  generateMatchReason: async function(selectedMember) {
    try {
      console.log('=== 开始生成AI匹配理由 ===');
      
      // 获取当前用户的openid
      const currentUserOpenid = this.data.currentUserOpenId;
      if (!currentUserOpenid) {
        console.error('当前用户openid为空');
        this.updateMatchReasonError('无法获取用户信息');
        return;
      }
      
      // 生成缓存键
      const currentTheme = this.data.userCards[this.data.currentTrackIndex];
      const themeName = currentTheme?.name || '未知主题';
      const cacheKey = this.generateMatchReasonCacheKey(currentUserOpenid, selectedMember.openid, themeName);
      
      // 先检查本地缓存
      const cachedReason = this.getMatchReasonFromCache(cacheKey);
      if (cachedReason) {
        console.log('从缓存获取匹配理由:', cachedReason);
        this.updateMatchReason(cachedReason);
        return;
      }
      
      console.log('缓存中无匹配理由，开始AI生成...');
      
      // 从users_bar获取两个用户的详细信息
      const bothUserOpenids = [currentUserOpenid, selectedMember.openid];
      const bothUsersDetails = await this.getUsersDetailFromUsersBar(bothUserOpenids);
      
      if (!bothUsersDetails || bothUsersDetails.length < 2) {
        console.error('无法获取两个用户的详细信息');
        this.updateMatchReasonError('获取用户信息失败');
        return;
      }
      
      const currentUser = bothUsersDetails.find(user => user.openid === currentUserOpenid);
      const targetUser = bothUsersDetails.find(user => user.openid === selectedMember.openid);
      
      if (!currentUser || !targetUser) {
        console.error('用户信息不完整');
        this.updateMatchReasonError('用户信息不完整');
        return;
      }
      
      console.log('当前用户信息:', currentUser);
      console.log('目标用户信息:', targetUser);
      
      // 构建AI提示词
      const prompt = this.buildMatchReasonPrompt(currentUser, targetUser);
      
      // 调用AI模型
      const model = wx.cloud.extend.AI.createModel("deepseek");
      const response = await model.generateText({
        model: "deepseek-v3-function-call",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

      console.log('AI匹配理由原始响应:', response);
      
      if (response && response.choices && response.choices.length > 0) {
        const aiResult = response.choices[0].message.content;
        console.log('AI匹配理由结果:', aiResult);
        
        // 缓存AI结果
        this.saveMatchReasonToCache(cacheKey, aiResult);
        
        // 更新匹配理由
        this.updateMatchReason(aiResult);
      } else {
        console.error('AI响应格式异常:', response);
        this.updateMatchReasonError('AI分析失败，请稍后重试');
      }
      
    } catch (error) {
      console.error('生成AI匹配理由失败:', error);
      this.updateMatchReasonError('网络异常，请稍后重试');
    }
  },

  /**
   * 构建AI匹配理由提示词
   */
  buildMatchReasonPrompt: function(currentUser, targetUser) {
    const currentTheme = this.data.userCards[this.data.currentTrackIndex];
    const themeName = currentTheme?.name || '未知主题';
    
    return `你是一个专业的社交配对分析师。请分析两个用户在"${themeName}"主题下的匹配度，并给出详细的匹配理由。

用户A（当前用户）信息：
- 昵称: ${currentUser.userInfo?.nickName || '匿名用户'}
- 性别: ${currentUser.userInfo?.gender === 1 ? '男' : currentUser.userInfo?.gender === 2 ? '女' : '未知'}
- 城市: ${currentUser.userInfo?.city || '未知'}
- 省份: ${currentUser.userInfo?.province || '未知'}
- 问卷答案: ${JSON.stringify(currentUser.questionnaire || currentUser.questionnaireAnswers || {}, null, 2)}

用户B（匹配对象）信息：
- 昵称: ${targetUser.userInfo?.nickName || '匿名用户'}
- 性别: ${targetUser.userInfo?.gender === 1 ? '男' : targetUser.userInfo?.gender === 2 ? '女' : '未知'}
- 城市: ${targetUser.userInfo?.city || '未知'}
- 省份: ${targetUser.userInfo?.province || '未知'}
- 问卷答案: ${JSON.stringify(targetUser.questionnaire || targetUser.questionnaireAnswers || {}, null, 2)}

请从以下几个维度分析他们的匹配度：
1. **价值观契合度**：分析问卷答案中体现的价值观、生活态度的相似性和互补性
2. **兴趣爱好匹配**：找出共同兴趣点和可以互相学习的领域
3. **性格互补性**：分析两人性格特点，是否能形成良好的互补关系
4. **地理便利性**：考虑地理位置对交流的影响
5. **主题适配度**：在"${themeName}"这个主题下，两人有哪些共同语言和话题

请用温暖、友好、具体的语言写出200-300字的匹配理由，让用户感受到这个配对的意义和价值。避免空泛的描述，要基于具体的信息点来分析。`;
  },

  /**
   * 更新匹配理由成功
   */
  updateMatchReason: function(reason) {
    const selectedMember = this.data.selectedMember;
    selectedMember.isGeneratingReason = false;
    selectedMember.matchReason = reason;
    
    this.setData({
      selectedMember: selectedMember
    });
    
    console.log('AI匹配理由更新成功:', reason);
  },

  /**
   * 更新匹配理由失败
   */
  updateMatchReasonError: function(errorMsg) {
    const selectedMember = this.data.selectedMember;
    selectedMember.isGeneratingReason = false;
    selectedMember.matchReason = errorMsg;
    
    this.setData({
      selectedMember: selectedMember
    });
    
    console.log('AI匹配理由更新失败:', errorMsg);
  },

  /**
   * 生成匹配理由缓存键
   */
  generateMatchReasonCacheKey: function(userOpenid1, userOpenid2, themeName) {
    // 对两个openid进行排序，确保缓存键的一致性（A-B 和 B-A 应该是同一个键）
    const sortedOpenids = [userOpenid1, userOpenid2].sort();
    return `match_reason_${sortedOpenids[0]}_${sortedOpenids[1]}_${themeName}`;
  },

  /**
   * 从本地缓存获取匹配理由
   */
  getMatchReasonFromCache: function(cacheKey) {
    try {
      const cachedData = wx.getStorageSync(cacheKey);
      if (cachedData) {
        const now = Date.now();
        // 缓存有效期：7天（7 * 24 * 60 * 60 * 1000）
        const cacheExpiry = 7 * 24 * 60 * 60 * 1000;
        
        if (now - cachedData.timestamp < cacheExpiry) {
          console.log('匹配理由缓存命中:', cacheKey);
          return cachedData.reason;
        } else {
          console.log('匹配理由缓存已过期，删除:', cacheKey);
          wx.removeStorageSync(cacheKey);
          return null;
        }
      }
      
      console.log('匹配理由缓存未命中:', cacheKey);
      return null;
    } catch (error) {
      console.error('读取匹配理由缓存失败:', error);
      return null;
    }
  },

  /**
   * 保存匹配理由到本地缓存
   */
  saveMatchReasonToCache: function(cacheKey, reason) {
    try {
      const cacheData = {
        reason: reason,
        timestamp: Date.now()
      };
      
      wx.setStorageSync(cacheKey, cacheData);
      console.log('匹配理由已缓存:', cacheKey);
      
      // 清理过期缓存（可选，避免存储空间过大）
      this.cleanExpiredMatchReasonCache();
      
    } catch (error) {
      console.error('保存匹配理由缓存失败:', error);
    }
  },

  /**
   * 清理过期的匹配理由缓存
   */
  cleanExpiredMatchReasonCache: function() {
    try {
      const now = Date.now();
      const cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7天
      
      // 获取所有存储的键
      const storageInfo = wx.getStorageInfoSync();
      const keysToRemove = [];
      
      storageInfo.keys.forEach(key => {
        if (key.startsWith('match_reason_')) {
          try {
            const cachedData = wx.getStorageSync(key);
            if (cachedData && cachedData.timestamp) {
              if (now - cachedData.timestamp >= cacheExpiry) {
                keysToRemove.push(key);
              }
            } else {
              // 数据格式异常，也删除
              keysToRemove.push(key);
            }
          } catch (error) {
            // 读取失败，删除这个键
            keysToRemove.push(key);
          }
        }
      });
      
      // 批量删除过期缓存
      keysToRemove.forEach(key => {
        try {
          wx.removeStorageSync(key);
          console.log('清理过期匹配理由缓存:', key);
        } catch (error) {
          console.error('删除过期缓存失败:', key, error);
        }
      });
      
      if (keysToRemove.length > 0) {
        console.log(`清理了${keysToRemove.length}个过期的匹配理由缓存`);
      }
      
    } catch (error) {
      console.error('清理过期缓存时出错:', error);
    }
  },

  /**
   * 关闭详细名片弹窗
   */
  closeDetailedCard: function() {
    this.setData({
      showDetailedCard: false,
      selectedMember: {}
    });
  },

  /**
   * 发送消息（预留功能）
   */
  sendMessage: function(e) {
    const openid = e.currentTarget.dataset.openid;
    console.log('发送消息给用户:', openid);
    
    // 这里可以后续添加发送消息功能
    wx.showToast({
      title: '消息功能开发中',
      icon: 'none'
    });
  },

  /**
   * 查看社群详情（预留功能）
   */
  viewCommunity: function() {
    console.log('查看社群详情');
    
    // 可以跳转到社群详情页面或者显示更多信息
    wx.showToast({
      title: '社群详情功能开发中',
      icon: 'none'
    });
  },

  /**
   * 检查用户是否已有配对 - 按主题->社群->配对组结构查询
   */
  checkExistingPairs: async function(userOpenid, themeName) {
    try {
      console.log('检查现有配对:', userOpenid, themeName);
      
      const db = wx.cloud.database();
      
      // 查询该主题的记录
      const result = await db.collection('connections')
        .where({
          _id: themeName
        })
        .get();

      console.log('检查配对结果:', result);
      
      if (result.data && result.data.length > 0) {
        const themeRecord = result.data[0];
        
        // 遍历所有社群查找用户配对
        if (themeRecord.communities) {
          for (const communityName in themeRecord.communities) {
            const pairGroups = themeRecord.communities[communityName];
            
            // 在该社群的配对组中查找用户
            for (const pairGroup of pairGroups) {
              if (pairGroup.includes(userOpenid)) {
                // 找到用户所在的配对组
                const otherUserOpenids = pairGroup.filter(openid => openid !== userOpenid);
                
                console.log('发现配对，社群:', communityName, '其他成员openids:', otherUserOpenids);
                
                // 获取其他成员的详细信息
                if (otherUserOpenids.length > 0) {
                  const otherUsersDetails = await this.getUsersDetailFromUsersBar(otherUserOpenids);
                  console.log('发现现有配对:', otherUsersDetails);
                  return otherUsersDetails;
                }
                
                // 如果是单人组，返回空数组表示已配对但无其他成员
                return [];
              }
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('检查配对时出错:', error);
      return null;
    }
  },

  /**
   * 使用AI对整个部落进行分组配对
   */
  performTribeGroupMatching: async function(allCommunityMembers, themeName) {
    try {
      console.log('开始AI部落配对:', '总人数:', allCommunityMembers.length);
      
      // 步骤1：从users_bar获取所有部落成员的详细信息
      const allOpenids = allCommunityMembers.map(member => member.openid);
      
      console.log('准备从users_bar获取部落所有成员详细信息，openids:', allOpenids);
      
      const detailedUsers = await this.getUsersDetailFromUsersBar(allOpenids);
      if (!detailedUsers || detailedUsers.length === 0) {
        console.error('无法获取部落成员详细信息');
        return null;
      }
      
      console.log('获取到部落成员详细信息数量:', detailedUsers.length);
      
      // 步骤2：构建AI部落配对的提示词
      const prompt = this.buildTribeGroupingPrompt(detailedUsers, themeName);
      
      // 步骤3：调用AI模型
      const model = wx.cloud.extend.AI.createModel("deepseek");
      const response = await model.generateText({
        model: "deepseek-v3-function-call",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

      console.log('AI部落配对原始响应:', response);
      
      if (response && response.choices && response.choices.length > 0) {
        const aiResult = response.choices[0].message.content;
        console.log('AI部落配对结果:', aiResult);
        
        // 解析AI返回的配对组结果
        const groupMatchResult = this.parseAIGroupMatchResult(aiResult);
        return groupMatchResult;
      } else {
        console.error('AI响应格式异常:', response);
        return null;
      }
      
    } catch (error) {
      console.error('AI部落配对失败:', error);
      return null;
    }
  },

  /**
   * 从users_bar获取用户详细信息 - 支持大量用户数据获取
   */
  getUsersDetailFromUsersBar: async function(openids) {
    try {
      console.log('=== 调试users_bar数据获取 ===');
      console.log('请求的openids数量:', openids.length);
      console.log('请求的openids:', openids);
      
      const db = wx.cloud.database();
      const MAX_LIMIT = 100; // 小程序端每次查询的最大限制
      const allUsers = [];
      
      // 微信小程序的 db.command.in() 有20个值的限制，所以需要分批查询
      const batchSize = 20; // 每批最多查询20个openid
      const batches = Math.ceil(openids.length / batchSize);
      
      console.log(`需要分${batches}批查询，每批最多${batchSize}个用户`);
      
      for (let i = 0; i < batches; i++) {
        const batchOpenids = openids.slice(i * batchSize, (i + 1) * batchSize);
        console.log(`第${i + 1}批查询，openids:`, batchOpenids);
        
        try {
          const result = await db.collection('users_bar')
            .where({
              openid: db.command.in(batchOpenids)
            })
            .limit(MAX_LIMIT) // 明确设置限制为100，确保不受默认20条限制
            .get();
            
          console.log(`第${i + 1}批查询结果:`, result.data ? result.data.length : 0, '条数据');
          
          if (result.data && result.data.length > 0) {
            allUsers.push(...result.data);
            
            // 详细检查每个用户的数据结构（只在第一批时打印详细信息）
            if (i === 0) {
              result.data.forEach((user, index) => {
                console.log(`用户${index + 1}数据结构:`, {
                  openid: user.openid,
                  有userInfo: !!user.userInfo,
                  有questionnaire: !!user.questionnaire,
                  有questionnaireAnswers: !!user.questionnaireAnswers,
                  questionnaire类型: typeof user.questionnaire,
                  questionnaire内容: user.questionnaire,
                  所有字段: Object.keys(user)
                });
              });
            }
          }
        } catch (batchError) {
          console.error(`第${i + 1}批查询失败:`, batchError);
          // 继续执行下一批，不要因为一批失败就停止
        }
      }

      console.log(`总共成功获取到 ${allUsers.length} 个用户的详细信息（请求了${openids.length}个）`);
      
      if (allUsers.length === 0) {
        console.log('users_bar中未找到对应用户，尝试查看集合是否存在数据');
        
        // 尝试查询所有数据看看集合情况
        const allResult = await db.collection('users_bar').limit(5).get();
        console.log('users_bar集合样本数据（前5条）:', allResult.data);
      }
      
      return allUsers;
    } catch (error) {
      console.error('从users_bar获取用户信息失败:', error);
      return [];
    }
  },

    /**
   * 构建AI部落分组配对提示词
   */
  buildTribeGroupingPrompt: function(allUserDetails, themeName) {
    console.log('=== 调试AI部落配对提示词构建 ===');
    console.log('部落所有成员原始数据:', allUserDetails);
    
    // 格式化所有部落成员信息
    const tribeMembers = allUserDetails.map((user, index) => ({
      序号: index + 1,
      openid: user.openid,
      基本信息: {
        昵称: user.userInfo?.nickName || '未知',
        性别: user.userInfo?.gender === 1 ? '男' : user.userInfo?.gender === 2 ? '女' : '未知',
        城市: user.userInfo?.city || '未知',
        省份: user.userInfo?.province || '未知'
      },
      问卷答案: user.questionnaire || user.questionnaireAnswers || {},
      提交时间: user.createTime || user.submitTime || '未知'
    }));

    console.log('格式化后的部落成员信息:', tribeMembers);
    tribeMembers.forEach((member, index) => {
      console.log(`部落成员${index + 1}问卷答案详情:`, allUserDetails[index]?.questionnaire || allUserDetails[index]?.questionnaireAnswers);
    });

    return `你是一个专业的社交配对AI助手。请对整个部落的所有成员在${themeName}主题下进行智能分组配对。

部落所有成员信息：
${JSON.stringify(tribeMembers, null, 2)}

配对原则：
1. **问卷答案匹配度**：分析问卷回答的相似性和互补性，寻找价值观、兴趣爱好匹配的用户
2. **个性互补**：选择能够互相学习、互补优势的用户组合  
3. **地理位置**：优先考虑同城或同省用户，便于线下交流
4. **主题适配度**：结合${themeName}主题特点，选择在该领域有共同语言的用户
5. **小组构成**：每个配对组2-3人，确保每个人都被分配到组

任务：请将所有${tribeMembers.length}个部落成员分成若干个2-3人的配对小组。

**重要：请直接返回纯净的JSON格式，不要添加任何说明文字或代码块标记。**

{
  "pairGroups": [
    {
      "groupId": 1,
      "openids": ["openid1", "openid2", "openid3"]
    },
    {
      "groupId": 2, 
      "openids": ["openid4", "openid5"]
    }
  ],
  "reason": "详细说明分组逻辑和每个组的匹配理由"
}`;
  },

  /**
   * 解析AI部落分组配对结果
   */
  parseAIGroupMatchResult: function(aiResult) {
    try {
      console.log('开始解析AI部落分组结果:', aiResult);
      
      // 首先尝试直接解析JSON
      let result;
      try {
        result = JSON.parse(aiResult);
      } catch (directParseError) {
        console.log('直接JSON解析失败，尝试提取JSON片段');
        
        // 如果直接解析失败，尝试提取JSON代码块
        const jsonMatch = aiResult.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          console.log('找到JSON代码块:', jsonMatch[1]);
          result = JSON.parse(jsonMatch[1]);
        } else {
          // 尝试查找大括号包围的JSON内容
          const braceMatch = aiResult.match(/\{[\s\S]*\}/);
          if (braceMatch && braceMatch[0]) {
            console.log('找到大括号JSON内容:', braceMatch[0]);
            result = JSON.parse(braceMatch[0]);
          } else {
            throw new Error('无法在AI响应中找到有效的JSON格式');
          }
        }
      }
      
      if (result && result.pairGroups && Array.isArray(result.pairGroups)) {
        // 验证分组结果
        const validGroups = result.pairGroups.filter(group => {
          return group.openids && Array.isArray(group.openids) && group.openids.length > 0;
        });
        
        console.log('AI部落分组解析成功:', {
          总分组数: validGroups.length,
          分组详情: validGroups.map(g => `组${g.groupId}: ${g.openids.length}人`),
          分组理由: result.reason
        });
        
        return {
          pairGroups: validGroups,
          reason: result.reason || '基于AI智能算法对部落进行分组配对'
        };
      }
      
      return null;
    } catch (error) {
      console.error('解析AI部落分组结果失败:', error, '原始结果:', aiResult);
      return null;
    }
  },

  /**
   * 解析AI匹配结果（使用users_bar的详细信息）- 保留原函数用于兼容
   */
  parseAIMatchResult: function(aiResult, candidateDetails) {
    try {
      console.log('开始解析AI结果:', aiResult);
      
      // 首先尝试直接解析JSON
      let result;
      try {
        result = JSON.parse(aiResult);
      } catch (directParseError) {
        console.log('直接JSON解析失败，尝试提取JSON片段');
        
        // 如果直接解析失败，尝试提取JSON代码块
        const jsonMatch = aiResult.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          console.log('找到JSON代码块:', jsonMatch[1]);
          result = JSON.parse(jsonMatch[1]);
        } else {
          // 尝试查找大括号包围的JSON内容
          const braceMatch = aiResult.match(/\{[\s\S]*\}/);
          if (braceMatch && braceMatch[0]) {
            console.log('找到大括号JSON内容:', braceMatch[0]);
            result = JSON.parse(braceMatch[0]);
          } else {
            throw new Error('无法在AI响应中找到有效的JSON格式');
          }
        }
      }
      
      if (result && result.pairedUsers && Array.isArray(result.pairedUsers)) {
        // 验证并补充用户信息（从candidateDetails中获取完整信息）
        const validPairs = result.pairedUsers
          .map(pair => {
            const fullUser = candidateDetails.find(user => user.openid === pair.openid);
            if (fullUser) {
              return {
                ...fullUser, // 包含完整的users_bar信息
                匹配分数: pair.匹配分数 || 0,
                ai推荐昵称: pair.昵称
              };
            }
            return null;
          })
          .filter(Boolean);
        
        // 处理复杂的reason结构
        let reasonText = '';
        if (typeof result.reason === 'string') {
          reasonText = result.reason;
        } else if (result.reason && typeof result.reason === 'object') {
          // 如果reason是对象，提取其中的信息
          if (result.reason.匹配逻辑 && Array.isArray(result.reason.匹配逻辑)) {
            reasonText = result.reason.匹配逻辑.join('; ');
          } else {
            reasonText = JSON.stringify(result.reason);
          }
          
          if (result.reason.注意事项) {
            reasonText += '; ' + result.reason.注意事项;
          }
        } else {
          reasonText = '基于AI智能算法为您匹配';
        }
        
        console.log('AI匹配解析成功:', {
          匹配用户数: validPairs.length,
          匹配理由: reasonText
        });
        
        return {
          pairedUsers: validPairs,
          reason: reasonText
        };
      }
      
      return null;
    } catch (error) {
      console.error('解析AI结果失败:', error, '原始结果:', aiResult);
      
      // 如果JSON解析失败，尝试简单匹配前1-2个用户
      const fallbackPairs = candidateDetails.slice(0, Math.min(2, candidateDetails.length));
      return {
        pairedUsers: fallbackPairs,
        reason: 'AI解析失败，为您随机推荐同社群成员。稍后将基于问卷数据进行更精准匹配。'
      };
    }
  },

  /**
   * 保存所有部落分组到云端 - 按主题->社群->配对组结构存储
   */
  saveAllPairGroupsToCloud: async function(themeName, groupMatchResult) {
    try {
      console.log('保存部落分组结果到云端:', themeName, groupMatchResult);
      
      // 首先需要获取当前用户所在的社群名称
      const classifications = this.data.classifications;
      const currentUserOpenId = this.data.currentUserOpenId;
      
      // 找到当前主题和用户所在社群
      const themeData = classifications.find(t => t.theme === themeName);
      if (!themeData || !themeData.communities) {
        throw new Error('未找到主题数据或社群信息');
      }
      
      let userCommunityName = null;
      for (const community of themeData.communities) {
        if (community.members && community.members.some(member => member.openid === currentUserOpenId)) {
          userCommunityName = community.name;
          break;
        }
      }
      
      if (!userCommunityName) {
        throw new Error('未找到用户所在社群');
      }
      
      console.log('用户所在社群:', userCommunityName);
      
      const db = wx.cloud.database();
      
      // 查找是否已存在该主题的记录
      const existingRecord = await db.collection('connections')
        .where({
          _id: themeName
        })
        .get();
      
      // 准备配对组数据 - 只要openid数组的数组
      const pairGroupsData = groupMatchResult.pairGroups.map(group => group.openids);
      
      if (existingRecord.data && existingRecord.data.length > 0) {
        // 更新现有记录
        const updateData = {};
        updateData[`communities.${userCommunityName}`] = pairGroupsData;
        
        const result = await db.collection('connections')
          .doc(themeName)
          .update({
            data: updateData
          });
          
        console.log('更新主题配对数据成功:', result);
        return result;
      } else {
        // 创建新记录
        const newRecord = {
          _id: themeName,
          communities: {
            [userCommunityName]: pairGroupsData
          }
        };
        
        const result = await db.collection('connections').add({
          data: newRecord
        });
        
        console.log('创建新主题配对数据成功:', result);
        return result;
      }
    } catch (error) {
      console.error('保存部落分组失败:', error);
      throw error;
    }
  },

  /**
   * 总结问卷答案（用于存储摘要）
   */
  summarizeQuestionnaire: function(questionnaireAnswers) {
    if (!questionnaireAnswers || typeof questionnaireAnswers !== 'object') {
      return '暂无问卷数据';
    }
    
    // 简单提取关键信息
    const keys = Object.keys(questionnaireAnswers);
    if (keys.length === 0) {
      return '问卷数据为空';
    }
    
    const summary = keys.slice(0, 3).map(key => {
      const value = questionnaireAnswers[key];
      let displayValue = '';
      
      if (typeof value === 'string') {
        displayValue = value.substring(0, 30);
      } else if (Array.isArray(value)) {
        displayValue = value.join(',').substring(0, 30);
      } else if (typeof value === 'object' && value !== null) {
        displayValue = JSON.stringify(value).substring(0, 30);
      } else {
        displayValue = String(value);
      }
      
      return `${key}: ${displayValue}`;
    }).join('; ');
    
    return summary || '问卷数据格式异常';
  },

  /**
   * 显示配对的用户
   */
  displayPairedUsers: function(theme, pairedUsers) {
    console.log('显示配对用户:', pairedUsers);
    
    this.setData({
      showCardPreview: true,
      selectedCard: {
        ...theme,
        pairedUsers: pairedUsers,
        isPaired: true
      }
    });
  },

  /**
   * 查找当前用户所在的配对组
   */
  findCurrentUserGroup: function(currentUserOpenId, pairGroups) {
    for (const group of pairGroups) {
      if (group.openids && group.openids.includes(currentUserOpenId)) {
        console.log('找到当前用户所在分组:', group);
        return group;
      }
    }
    console.log('未找到当前用户所在的分组');
    return null;
  },

  /**
   * 显示当前用户的配对组
   */
  displayCurrentUserPairGroup: async function(theme, currentUserGroup) {
    try {
      console.log('显示当前用户配对组:', currentUserGroup);
      
      // 获取组内其他成员的详细信息用于显示
      const otherMemberOpenids = currentUserGroup.openids.filter(openid => openid !== this.data.currentUserOpenId);
      
      if (otherMemberOpenids.length > 0) {
        const otherMembersDetails = await this.getUsersDetailFromUsersBar(otherMemberOpenids);
        
        this.setData({
          showCardPreview: true,
          selectedCard: {
            ...theme,
            pairedUsers: otherMembersDetails,
            isPaired: true
          }
        });
        
        console.log('显示配对组成功:', {
          组内总人数: currentUserGroup.openids.length,
          其他成员数: otherMembersDetails.length
        });
      } else {
        console.log('配对组中只有当前用户一人');
        this.setData({
          showCardPreview: true,
          selectedCard: {
            ...theme,
            pairedUsers: [],
            isPaired: true
          }
        });
      }
    } catch (error) {
      console.error('显示配对组失败:', error);
      wx.showToast({
        title: '显示配对信息失败',
        icon: 'none'
      });
    }
  },

  /**
   * 显示所有社群成员（备用方案）
   */
  displayAllCommunityMembers: function(theme, userCommunity, communityMembers) {
    console.log('显示所有社群成员:', communityMembers.length);
    
    this.setData({
      showCardPreview: true,
      selectedCard: {
        ...theme,
        pairedUsers: communityMembers,
        communityName: userCommunity.name,
        communityDescription: userCommunity.description,
        totalMembers: userCommunity.members.length,
        otherMembersCount: communityMembers.length,
        isPaired: false
      }
    });
  },

  /**
   * 分析未匹配设备的信息
   */
  analyzeUnmatchedDevice(device) {
    const deviceName = device.deviceName || '未知设备';
    
    // 分析设备名称是否是Un编码的标签
    if (deviceName.startsWith('Un') && deviceName.length === 16) {
      console.log('[ConnectPage] 分析Un设备标签:', deviceName);
      
      try {
        // 解码设备的标签信息
        const deviceTags = this.decodeUnDeviceName(deviceName);
        const myTags = wx.getStorageSync('myTags') || [];
        
        if (deviceTags && deviceTags.length > 0) {
          // 计算匹配度
          const matchedTags = myTags.filter(tag => deviceTags.includes(tag));
          const matchScore = matchedTags.length;
          
          return {
            displayName: `Un用户 (${deviceTags.length}个标签)`,
            subtitle: matchScore > 0 ? `${matchScore}个共同标签` : '无共同标签',
            description: matchScore > 0 ? 
              `共同兴趣: ${matchedTags.slice(0, 3).join(' · ')}` : 
              `TA的兴趣: ${deviceTags.slice(0, 3).join(' · ')}`,
            theme: matchScore > 0 ? '潜在朋友' : '新朋友',
            color: matchScore > 0 ? '#4CAF50' : '#2196F3',
            matchScore: matchScore,
            matchedTags: matchedTags,
            totalTags: deviceTags.length,
            concept: `标签匹配度: ${matchScore}/${deviceTags.length}`,
            features: matchScore > 0 ? matchedTags : deviceTags.slice(0, 5),
            philosophy: matchScore > 0 ? 
              '你们有共同兴趣！邀请TA注册认识一下' : 
              '发现新朋友！邀请TA注册扩展社交圈'
          };
        }
      } catch (decodeError) {
        console.warn('[ConnectPage] Un设备名称解码失败:', decodeError);
      }
    }
    
    // 本地模式或普通设备的默认处理
    const isLocalMode = device.status === 'local_mode';
    
    return {
      displayName: isLocalMode ? '本地模式设备' : (deviceName.length > 12 ? deviceName.substring(0, 12) + '...' : deviceName),
      subtitle: isLocalMode ? '云函数未部署' : '未注册用户',
      description: isLocalMode ? 
        '等待云端服务部署后匹配用户信息' : 
        '等待用户注册后显示详情',
      theme: isLocalMode ? '本地设备' : '待连接设备',
      color: isLocalMode ? '#ff9800' : '#999999',
      matchScore: 0,
      matchedTags: [],
      totalTags: 0,
      concept: isLocalMode ? '本地模式设备' : '未注册设备',
      features: isLocalMode ? 
        ['需要云函数支持', '等待服务端部署', '设备信息已记录'] :
        ['等待注册'],
      philosophy: isLocalMode ? 
        '云函数部署后可匹配用户' : 
        '邀请TA加入Unian社区'
    };
  },

  /**
   * 解码Un设备名称为标签
   */
  decodeUnDeviceName(deviceName) {
    try {
      // 移除"Un"前缀，获取14字符的编码部分
      const encodedPart = deviceName.substring(2);
      
      // 这里需要实现与你的标签编码算法对应的解码逻辑
      // 暂时返回示例数据，你需要根据实际编码算法修改
      
      // 示例：假设编码规则是base64编码的标签索引
      // 实际实现需要根据你的编码算法
      return ['编程', '音乐', '旅行', '摄影']; // 示例标签
      
    } catch (error) {
      console.error('[ConnectPage] 设备名称解码失败:', error);
      return [];
    }
  },

  /**
   * 格式化碰一碰时间显示
   */
  formatTouchTime: function(timestamp) {
    if (!timestamp) return '未知时间';
    
    // 处理可能的时间戳格式
    let date;
    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      // 如果时间戳小于1000000000000，说明是秒级时间戳，需要转换为毫秒
      date = new Date(timestamp < 1000000000000 ? timestamp * 1000 : timestamp);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return '时间格式错误';
    }
    
    // 检查是否是有效时间（排除1970年等异常时间）
    if (isNaN(date.getTime()) || date.getFullYear() < 2020) {
      return '时间异常';
    }
    
    // 格式化为用户友好的时间显示
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // 今天
      return `今天 ${date.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}`;
    } else if (diffDays === 1) {
      // 昨天
      return `昨天 ${date.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}`;
    } else if (diffDays < 7) {
      // 一周内
      const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
      const weekday = weekdays[date.getDay()];
      return `周${weekday} ${date.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}`;
    } else {
      // 超过一周，显示具体日期
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  },

  /**
   * 获取当前用户的所有标签
   */
  getCurrentUserTags: function() {
    try {
      // 从本地存储获取用户标签数据
      const advancedTags = wx.getStorageSync('advancedTags');
      if (!advancedTags) {
        console.warn('[ConnectPage] 未找到当前用户标签数据');
        return [];
      }

      // 合并所有类型的标签
      const allTags = [
        ...(advancedTags.professionalTags || []),
        ...(advancedTags.interestTags || []),
        ...(advancedTags.personalityTags || []),
        ...(advancedTags.quirkyTags || [])
      ];

      console.log('[ConnectPage] 获取到当前用户标签:', {
        professionalTags: advancedTags.professionalTags?.length || 0,
        interestTags: advancedTags.interestTags?.length || 0,
        personalityTags: advancedTags.personalityTags?.length || 0,
        quirkyTags: advancedTags.quirkyTags?.length || 0,
        total: allTags.length
      });

      return allTags;
    } catch (error) {
      console.error('[ConnectPage] 获取当前用户标签失败:', error);
      return [];
    }
  }
})