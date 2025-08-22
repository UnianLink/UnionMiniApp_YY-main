// 云函数：数据分析专用
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 数据分析云函数
 * 提供Un字符串绑定分析、用户统计、朋友关系分析等功能
 */
exports.main = async (event, context) => {
  console.log('[dataAnalytics] 数据分析请求:', event);
  
  const { action, limit = 100, offset = 0 } = event;
  
  try {
    switch (action) {
      case 'unBindings':
        return await analyzeUnBindings(limit, offset);
      case 'userStats':
        return await getUserStats();
      case 'friendsAnalysis':
        return await analyzeFriendsData(limit);
      case 'touchAnalysis':
        return await analyzeTouchData(limit);
      case 'registrationTrend':
        return await getRegistrationTrend();
      case 'deviceActivity':
        return await getDeviceActivity(limit);
      case 'overview':
        return await getCompleteOverview();
      case 'unregisteredDevices':
        return await getUnregisteredDevices(limit);
      default:
        return await getCompleteOverview();
    }
  } catch (error) {
    console.error('[dataAnalytics] 分析失败:', error);
    return {
      success: false,
      message: '数据分析失败',
      error: error.message,
      stack: error.stack
    };
  }
};

/**
 * 分析Un字符串绑定情况
 * 核心功能：查看真实openID绑定的Un字符串
 */
async function analyzeUnBindings(limit = 100, offset = 0) {
  console.log('[dataAnalytics] 开始分析Un字符串绑定情况');
  
  try {
    // 查询所有有bluetoothName的用户
    const usersWithBluetooth = await db.collection('users_adv')
      .where({
        bluetoothName: _.exists(true),
        bluetoothName: _.neq(''),
        bluetoothName: _.neq(null)
      })
      .field({
        openid: true,
        bluetoothName: true,
        encodedTags: true,
        'advancedTags.displayName': true,
        'userInfo.nickName': true,
        'advancedTags.uniqueId': true,
        createTime: true,
        updateTime: true,
        friends: true
      })
      .orderBy('createTime', 'desc')
      .limit(limit)
      .skip(offset)
      .get();

    // 统计总数
    const totalCount = await db.collection('users_adv')
      .where({
        bluetoothName: _.exists(true),
        bluetoothName: _.neq(''),
        bluetoothName: _.neq(null)
      })
      .count();

    // 分析每个绑定记录
    const bindings = usersWithBluetooth.data.map(user => {
      const isValidUn = user.bluetoothName && user.bluetoothName.startsWith('Un');
      const friendsCount = user.friends ? user.friends.length : 0;
      const registeredFriends = user.friends ? 
        user.friends.filter(f => f.friendOpenid && !f.isUnregistered).length : 0;
      const unregisteredDevices = user.friends ? 
        user.friends.filter(f => f.isUnregistered || f.deviceOnly).length : 0;

      return {
        openid: user.openid,
        bluetoothName: user.bluetoothName,
        encodedTags: user.encodedTags,
        displayName: user.advancedTags?.displayName || user.userInfo?.nickName || '未设置昵称',
        uniqueId: user.advancedTags?.uniqueId,
        isValidUnFormat: isValidUn,
        unLength: user.bluetoothName ? user.bluetoothName.length : 0,
        bindTime: user.createTime,
        lastUpdateTime: user.updateTime,
        friendsCount: friendsCount,
        registeredFriends: registeredFriends,
        unregisteredDevices: unregisteredDevices,
        hasSocialData: friendsCount > 0
      };
    });

    // 统计分析
    const validUnBindings = bindings.filter(b => b.isValidUnFormat);
    const invalidBindings = bindings.filter(b => !b.isValidUnFormat);
    const bindingsWithFriends = bindings.filter(b => b.friendsCount > 0);

    return {
      success: true,
      timestamp: new Date(),
      pagination: {
        limit: limit,
        offset: offset,
        total: totalCount.total,
        returned: bindings.length
      },
      summary: {
        totalBindings: totalCount.total,
        validUnBindings: validUnBindings.length,
        invalidBindings: invalidBindings.length,
        bindingsWithFriends: bindingsWithFriends.length,
        avgFriendsPerUser: bindings.length > 0 ? 
          (bindings.reduce((sum, b) => sum + b.friendsCount, 0) / bindings.length).toFixed(2) : 0
      },
      bindings: bindings,
      validUnBindings: validUnBindings,
      invalidBindings: invalidBindings.length > 0 ? invalidBindings : undefined
    };

  } catch (error) {
    console.error('[analyzeUnBindings] 查询失败:', error);
    throw error;
  }
}

/**
 * 获取用户统计信息
 */
async function getUserStats() {
  console.log('[dataAnalytics] 开始用户统计分析');

  try {
    // 基础用户统计
    const totalUsersAdv = await db.collection('users_adv').count();
    const totalUsersBar = await db.collection('users_bar').count();
    
    // 有蓝牙名称的用户
    const usersWithBluetooth = await db.collection('users_adv')
      .where({
        bluetoothName: _.exists(true),
        bluetoothName: _.neq('')
      })
      .count();

    // 有朋友的用户
    const usersWithFriends = await db.collection('users_adv')
      .where({
        friends: _.exists(true),
        friends: _.not(_.size(0))
      })
      .count();

    // 最近7天注册的用户
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentUsers = await db.collection('users_adv')
      .where({
        createTime: _.gte(sevenDaysAgo)
      })
      .count();

    // 活跃用户（有朋友数据的）
    const activeUsers = await db.collection('users_adv')
      .where({
        friends: _.exists(true),
        friends: _.not(_.size(0))
      })
      .field({
        openid: true,
        'advancedTags.displayName': true,
        friends: true,
        updateTime: true
      })
      .orderBy('updateTime', 'desc')
      .limit(10)
      .get();

    return {
      success: true,
      timestamp: new Date(),
      userStats: {
        totalAdvancedUsers: totalUsersAdv.total,
        totalBarUsers: totalUsersBar.total,
        usersWithBluetoothName: usersWithBluetooth.total,
        usersWithFriends: usersWithFriends.total,
        recentRegistrations: recentUsers.total,
        activationRate: totalUsersAdv.total > 0 ? 
          ((usersWithFriends.total / totalUsersAdv.total) * 100).toFixed(2) + '%' : '0%'
      },
      recentActiveUsers: activeUsers.data.map(user => ({
        openid: user.openid,
        displayName: user.advancedTags?.displayName || '未设置',
        friendsCount: user.friends ? user.friends.length : 0,
        lastUpdateTime: user.updateTime
      }))
    };

  } catch (error) {
    console.error('[getUserStats] 统计失败:', error);
    throw error;
  }
}

/**
 * 分析朋友关系数据
 */
async function analyzeFriendsData(limit = 50) {
  console.log('[dataAnalytics] 开始朋友关系分析');

  try {
    // 获取有朋友的用户
    const usersWithFriends = await db.collection('users_adv')
      .where({
        friends: _.exists(true),
        friends: _.not(_.size(0))
      })
      .field({
        openid: true,
        'advancedTags.displayName': true,
        friends: true,
        friendsUpdateTime: true
      })
      .orderBy('friendsUpdateTime', 'desc')
      .limit(limit)
      .get();

    let totalFriendships = 0;
    let totalRegisteredFriends = 0;
    let totalUnregisteredDevices = 0;
    let friendshipDetails = [];

    usersWithFriends.data.forEach(user => {
      const friends = user.friends || [];
      const registeredFriends = friends.filter(f => f.friendOpenid && !f.isUnregistered);
      const unregisteredDevices = friends.filter(f => f.isUnregistered || f.deviceOnly);

      totalFriendships += friends.length;
      totalRegisteredFriends += registeredFriends.length;
      totalUnregisteredDevices += unregisteredDevices.length;

      friendshipDetails.push({
        openid: user.openid,
        displayName: user.advancedTags?.displayName || '未设置',
        totalFriends: friends.length,
        registeredFriends: registeredFriends.length,
        unregisteredDevices: unregisteredDevices.length,
        lastFriendsUpdate: user.friendsUpdateTime,
        topFriends: registeredFriends.slice(0, 3).map(f => ({
          displayName: f.friendUserInfo?.displayName || '未知',
          matchScore: f.matchScore || 0,
          meetCount: f.meetCount || 1
        }))
      });
    });

    return {
      success: true,
      timestamp: new Date(),
      friendsAnalysis: {
        totalUsersWithFriends: usersWithFriends.data.length,
        totalFriendships: totalFriendships,
        totalRegisteredFriends: totalRegisteredFriends,
        totalUnregisteredDevices: totalUnregisteredDevices,
        avgFriendsPerUser: usersWithFriends.data.length > 0 ?
          (totalFriendships / usersWithFriends.data.length).toFixed(2) : 0,
        registeredFriendRatio: totalFriendships > 0 ?
          ((totalRegisteredFriends / totalFriendships) * 100).toFixed(2) + '%' : '0%'
      },
      friendshipDetails: friendshipDetails
    };

  } catch (error) {
    console.error('[analyzeFriendsData] 分析失败:', error);
    throw error;
  }
}

/**
 * 分析碰一碰数据
 */
async function analyzeTouchData(limit = 50) {
  console.log('[dataAnalytics] 开始碰一碰数据分析');

  try {
    // 获取有touchList的用户
    const usersWithTouchList = await db.collection('users_adv')
      .where({
        touchList: _.exists(true),
        touchList: _.not(_.size(0))
      })
      .field({
        openid: true,
        'advancedTags.displayName': true,
        touchList: true,
        lastTouchUpdate: true
      })
      .orderBy('lastTouchUpdate', 'desc')
      .limit(limit)
      .get();

    let totalTouchEvents = 0;
    let uniqueDevices = new Set();
    let touchDetails = [];

    usersWithTouchList.data.forEach(user => {
      const touchList = user.touchList || [];
      totalTouchEvents += touchList.length;

      touchList.forEach(device => {
        uniqueDevices.add(device.deviceName);
      });

      touchDetails.push({
        openid: user.openid,
        displayName: user.advancedTags?.displayName || '未设置',
        touchCount: touchList.length,
        lastTouchUpdate: user.lastTouchUpdate,
        recentTouches: touchList.slice(-5).map(device => ({
          deviceName: device.deviceName,
          touchTime: device.firstTouchTime
        }))
      });
    });

    return {
      success: true,
      timestamp: new Date(),
      touchAnalysis: {
        totalUsersWithTouches: usersWithTouchList.data.length,
        totalTouchEvents: totalTouchEvents,
        uniqueDevicesDetected: uniqueDevices.size,
        avgTouchesPerUser: usersWithTouchList.data.length > 0 ?
          (totalTouchEvents / usersWithTouchList.data.length).toFixed(2) : 0
      },
      touchDetails: touchDetails,
      topDevices: Array.from(uniqueDevices).slice(0, 20) // 显示前20个设备
    };

  } catch (error) {
    console.error('[analyzeTouchData] 分析失败:', error);
    throw error;
  }
}

/**
 * 获取注册趋势
 */
async function getRegistrationTrend() {
  console.log('[dataAnalytics] 开始注册趋势分析');

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRegistrations = await db.collection('users_adv')
      .where({
        createTime: _.gte(thirtyDaysAgo)
      })
      .field({
        createTime: true,
        'advancedTags.displayName': true
      })
      .orderBy('createTime', 'desc')
      .get();

    // 按天分组
    const dailyStats = {};
    recentRegistrations.data.forEach(user => {
      const dateKey = user.createTime.toISOString().split('T')[0];
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = 0;
      }
      dailyStats[dateKey]++;
    });

    return {
      success: true,
      timestamp: new Date(),
      registrationTrend: {
        totalLast30Days: recentRegistrations.data.length,
        dailyBreakdown: dailyStats,
        recentRegistrations: recentRegistrations.data.slice(0, 10).map(user => ({
          displayName: user.advancedTags?.displayName || '未设置',
          registrationTime: user.createTime
        }))
      }
    };

  } catch (error) {
    console.error('[getRegistrationTrend] 分析失败:', error);
    throw error;
  }
}

/**
 * 获取设备活跃度分析
 */
async function getDeviceActivity(limit = 100) {
  console.log('[dataAnalytics] 开始设备活跃度分析');

  try {
    // 统计所有出现的设备名称
    const allUsers = await db.collection('users_adv')
      .field({
        bluetoothName: true,
        touchList: true,
        friends: true,
        'advancedTags.displayName': true
      })
      .get();

    const deviceActivity = new Map();

    allUsers.data.forEach(user => {
      // 统计自己的设备
      if (user.bluetoothName) {
        const device = user.bluetoothName;
        if (!deviceActivity.has(device)) {
          deviceActivity.set(device, {
            deviceName: device,
            ownerDisplayName: user.advancedTags?.displayName || '未设置',
            appearsInTouchLists: 0,
            appearsInFriendsList: 0,
            isRegistered: true
          });
        }
      }

      // 统计出现在touchList中的设备
      if (user.touchList) {
        user.touchList.forEach(touch => {
          const device = touch.deviceName;
          if (!deviceActivity.has(device)) {
            deviceActivity.set(device, {
              deviceName: device,
              ownerDisplayName: '未知',
              appearsInTouchLists: 0,
              appearsInFriendsList: 0,
              isRegistered: false
            });
          }
          deviceActivity.get(device).appearsInTouchLists++;
        });
      }

      // 统计出现在朋友列表中的设备
      if (user.friends) {
        user.friends.forEach(friend => {
          const device = friend.friendDeviceName;
          if (device) {
            if (!deviceActivity.has(device)) {
              deviceActivity.set(device, {
                deviceName: device,
                ownerDisplayName: friend.friendUserInfo?.displayName || '未知',
                appearsInTouchLists: 0,
                appearsInFriendsList: 0,
                isRegistered: !friend.isUnregistered
              });
            }
            deviceActivity.get(device).appearsInFriendsList++;
            
            // 更新注册状态
            if (!friend.isUnregistered && friend.friendOpenid) {
              deviceActivity.get(device).isRegistered = true;
              deviceActivity.get(device).ownerDisplayName = friend.friendUserInfo?.displayName || '未知';
            }
          }
        });
      }
    });

    // 转换为数组并排序
    const deviceStats = Array.from(deviceActivity.values())
      .map(device => ({
        ...device,
        totalAppearances: device.appearsInTouchLists + device.appearsInFriendsList,
        popularity: device.appearsInTouchLists + device.appearsInFriendsList
      }))
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);

    return {
      success: true,
      timestamp: new Date(),
      deviceActivity: {
        totalUniqueDevices: deviceActivity.size,
        registeredDevices: deviceStats.filter(d => d.isRegistered).length,
        unregisteredDevices: deviceStats.filter(d => !d.isRegistered).length,
        mostPopularDevices: deviceStats.slice(0, 10)
      },
      allDeviceStats: deviceStats
    };

  } catch (error) {
    console.error('[getDeviceActivity] 分析失败:', error);
    throw error;
  }
}

/**
 * 获取未注册设备详情
 */
async function getUnregisteredDevices(limit = 50) {
  console.log('[dataAnalytics] 开始未注册设备分析');

  try {
    // 获取所有朋友列表中的未注册设备
    const usersWithFriends = await db.collection('users_adv')
      .where({
        friends: _.exists(true)
      })
      .field({
        openid: true,
        'advancedTags.displayName': true,
        friends: true
      })
      .get();

    const unregisteredDevices = new Map();

    usersWithFriends.data.forEach(user => {
      if (user.friends) {
        user.friends.forEach(friend => {
          if (friend.isUnregistered || friend.deviceOnly || !friend.friendOpenid) {
            const deviceName = friend.friendDeviceName;
            if (!unregisteredDevices.has(deviceName)) {
              unregisteredDevices.set(deviceName, {
                deviceName: deviceName,
                detectedBy: [],
                firstSeen: friend.firstMeetTime || friend.addTime,
                lastSeen: friend.lastMeetTime || friend.firstMeetTime || friend.addTime,
                totalDetections: 0
              });
            }

            const device = unregisteredDevices.get(deviceName);
            device.detectedBy.push({
              userDisplayName: user.advancedTags?.displayName || '未设置',
              userOpenid: user.openid,
              meetCount: friend.meetCount || 1,
              detectTime: friend.firstMeetTime || friend.addTime
            });
            device.totalDetections++;

            // 更新时间范围
            const currentTime = friend.firstMeetTime || friend.addTime;
            if (currentTime < device.firstSeen) {
              device.firstSeen = currentTime;
            }
            if (currentTime > device.lastSeen) {
              device.lastSeen = currentTime;
            }
          }
        });
      }
    });

    const unregisteredList = Array.from(unregisteredDevices.values())
      .sort((a, b) => b.totalDetections - a.totalDetections)
      .slice(0, limit);

    return {
      success: true,
      timestamp: new Date(),
      unregisteredAnalysis: {
        totalUnregisteredDevices: unregisteredDevices.size,
        avgDetectionsPerDevice: unregisteredList.length > 0 ?
          (unregisteredList.reduce((sum, d) => sum + d.totalDetections, 0) / unregisteredList.length).toFixed(2) : 0,
        mostFrequentUnregistered: unregisteredList.slice(0, 10)
      },
      unregisteredDevices: unregisteredList
    };

  } catch (error) {
    console.error('[getUnregisteredDevices] 分析失败:', error);
    throw error;
  }
}

/**
 * 获取完整概览
 */
async function getCompleteOverview() {
  console.log('[dataAnalytics] 开始完整数据概览');

  try {
    const userStats = await getUserStats();
    const unBindings = await analyzeUnBindings(20, 0);
    const friendsAnalysis = await analyzeFriendsData(20);

    return {
      success: true,
      timestamp: new Date(),
      overview: {
        userStats: userStats.userStats,
        unBindings: {
          total: unBindings.summary.totalBindings,
          valid: unBindings.summary.validUnBindings,
          withFriends: unBindings.summary.bindingsWithFriends,
          recent: unBindings.bindings.slice(0, 5)
        },
        friendsStats: friendsAnalysis.friendsAnalysis,
        quickActions: [
          { action: 'unBindings', description: '查看Un字符串绑定详情' },
          { action: 'userStats', description: '查看用户统计信息' },
          { action: 'friendsAnalysis', description: '查看朋友关系分析' },
          { action: 'unregisteredDevices', description: '查看未注册设备列表' },
          { action: 'deviceActivity', description: '查看设备活跃度分析' }
        ]
      }
    };

  } catch (error) {
    console.error('[getCompleteOverview] 概览分析失败:', error);
    throw error;
  }
}