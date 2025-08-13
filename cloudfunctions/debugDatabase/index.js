// 云函数：调试数据库中的碰一碰数据
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 调试数据库数据
 * 用于检查碰一碰数据存储情况
 */
exports.main = async (event, context) => {
  console.log('[debugDatabase] 调试请求:', event);
  
  const { action, openid } = event;
  
  try {
    switch (action) {
      case 'checkUser':
        return await checkUserData(openid);
      case 'listUsers':
        return await listAllUsers();
      case 'checkFriends':
        return await checkFriendsData(openid);
      case 'collections':
        return await listCollections();
      default:
        return await getOverview();
    }
  } catch (error) {
    console.error('[debugDatabase] 调试失败:', error);
    return {
      success: false,
      message: '调试失败',
      error: error.message
    };
  }
};

/**
 * 检查特定用户的数据
 */
async function checkUserData(targetOpenid) {
  console.log('[debugDatabase] 检查用户数据:', targetOpenid);
  
  if (!targetOpenid) {
    return {
      success: false,
      message: '需要提供用户openid'
    };
  }
  
  // 检查 users_adv
  const userAdvData = await db.collection('users_adv')
    .where({ openid: targetOpenid })
    .get();
    
  // 检查 users_bar
  const userBarData = await db.collection('users_bar')
    .where({ openid: targetOpenid })
    .get();
  
  const result = {
    success: true,
    openid: targetOpenid,
    users_adv: {
      count: userAdvData.data.length,
      data: userAdvData.data.map(user => ({
        _id: user._id,
        openid: user.openid,
        hasFriends: !!user.friends,
        friendsCount: user.friends ? user.friends.length : 0,
        friends: user.friends || [],
        hasAdvancedTags: !!user.advancedTags,
        hasTouchList: !!user.touchList,
        touchListCount: user.touchList ? user.touchList.length : 0,
        updateTime: user.updateTime,
        friendsUpdateTime: user.friendsUpdateTime
      }))
    },
    users_bar: {
      count: userBarData.data.length,
      data: userBarData.data.map(user => ({
        _id: user._id,
        openid: user.openid,
        hasFriends: !!user.friends,
        friendsCount: user.friends ? user.friends.length : 0,
        hasQuestionnaire: !!user.questionnaire,
        updateTime: user.updateTime
      }))
    }
  };
  
  console.log('[debugDatabase] 用户数据检查结果:', result);
  return result;
}

/**
 * 列出所有用户概况
 */
async function listAllUsers() {
  console.log('[debugDatabase] 列出所有用户');
  
  // 从 users_adv 获取用户列表
  const usersAdv = await db.collection('users_adv')
    .field({
      openid: true,
      'advancedTags.displayName': true,
      'userInfo.nickName': true,
      friends: true,
      touchList: true,
      updateTime: true
    })
    .limit(20)
    .get();
    
  const users = usersAdv.data.map(user => ({
    openid: user.openid,
    displayName: user.advancedTags?.displayName || user.userInfo?.nickName || '未设置',
    friendsCount: user.friends ? user.friends.length : 0,
    touchListCount: user.touchList ? user.touchList.length : 0,
    hasTouchData: (user.friends && user.friends.length > 0) || (user.touchList && user.touchList.length > 0),
    updateTime: user.updateTime
  }));
  
  return {
    success: true,
    totalUsers: usersAdv.data.length,
    users: users,
    usersWithTouchData: users.filter(u => u.hasTouchData).length
  };
}

/**
 * 检查朋友数据详情
 */
async function checkFriendsData(targetOpenid) {
  console.log('[debugDatabase] 检查朋友数据详情:', targetOpenid);
  
  if (!targetOpenid) {
    return {
      success: false,
      message: '需要提供用户openid'
    };
  }
  
  const userData = await db.collection('users_adv')
    .where({ openid: targetOpenid })
    .get();
    
  if (userData.data.length === 0) {
    return {
      success: false,
      message: '用户不存在'
    };
  }
  
  const user = userData.data[0];
  const friends = user.friends || [];
  const touchList = user.touchList || [];
  
  return {
    success: true,
    openid: targetOpenid,
    displayName: user.advancedTags?.displayName || user.userInfo?.nickName || '未设置',
    friendsData: {
      count: friends.length,
      details: friends.map(friend => ({
        friendOpenid: friend.friendOpenid,
        friendDeviceName: friend.friendDeviceName,
        displayName: friend.friendUserInfo?.displayName,
        isRegistered: !friend.isUnregistered,
        isUnregistered: friend.isUnregistered,
        deviceOnly: friend.deviceOnly,
        meetCount: friend.meetCount,
        matchScore: friend.matchScore,
        firstMeetTime: friend.firstMeetTime,
        addTime: friend.addTime
      }))
    },
    touchListData: {
      count: touchList.length,
      details: touchList.map(device => ({
        deviceName: device.deviceName,
        firstTouchTime: device.firstTouchTime
      }))
    }
  };
}

/**
 * 列出所有集合
 */
async function listCollections() {
  console.log('[debugDatabase] 列出数据库集合');
  
  // 获取主要集合的统计信息
  const collections = ['users_adv', 'users_bar', 'class_bar', 'touch_records'];
  const stats = {};
  
  for (const collectionName of collections) {
    try {
      const count = await db.collection(collectionName).count();
      stats[collectionName] = {
        exists: true,
        count: count.total
      };
    } catch (error) {
      stats[collectionName] = {
        exists: false,
        error: error.message
      };
    }
  }
  
  return {
    success: true,
    collections: stats
  };
}

/**
 * 获取数据库概览
 */
async function getOverview() {
  console.log('[debugDatabase] 获取数据库概览');
  
  const collections = await listCollections();
  const users = await listAllUsers();
  
  return {
    success: true,
    overview: {
      totalCollections: Object.keys(collections.collections).length,
      collectionsInfo: collections.collections,
      totalUsers: users.totalUsers,
      usersWithTouchData: users.usersWithTouchData,
      recentUsers: users.users.slice(0, 5)
    }
  };
}