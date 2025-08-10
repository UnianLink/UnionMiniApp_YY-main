// 云函数：同步碰一碰设备列表
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 同步碰一碰设备列表
 * 1. 接收硬件上传的碰一碰设备列表
 * 2. 根据蓝牙名称查询已注册用户
 * 3. 计算标签匹配度
 * 4. 返回匹配结果供前端展示
 */
exports.main = async (event, context) => {
  console.log('[syncTouchList] 接收到同步请求', JSON.stringify(event, null, 2));
  
  const { openid, touchList } = event;
  
  if (!openid) {
    return {
      success: false,
      message: '缺少用户标识'
    };
  }
  
  if (!touchList || !Array.isArray(touchList)) {
    return {
      success: false,
      message: '缺少或无效的设备列表'
    };
  }
  
  try {
    // 1. 获取当前用户的标签信息
    const currentUserRes = await db.collection('users_adv')
      .where({ openid })
      .limit(1)
      .get();
    
    if (currentUserRes.data.length === 0) {
      return {
        success: false,
        message: '当前用户未注册'
      };
    }
    
    const currentUser = currentUserRes.data[0];
    const myBinaryArray = currentUser.binaryArray || [];
    const mySelectedTags = currentUser.selectedTags || [];
    
    console.log('[syncTouchList] 当前用户标签数:', mySelectedTags.length);
    
    // 2. 提取所有设备的蓝牙名称
    const deviceNames = touchList.map(device => device.name);
    console.log('[syncTouchList] 待查询设备:', deviceNames);
    
    // 3. 批量查询数据库中的用户
    const usersRes = await db.collection('users_adv')
      .where({
        bluetoothName: _.in(deviceNames)
      })
      .get();
    
    console.log('[syncTouchList] 查询到已注册用户:', usersRes.data.length);
    
    // 4. 构建设备名到用户的映射
    const deviceToUserMap = {};
    usersRes.data.forEach(user => {
      if (user.bluetoothName) {
        deviceToUserMap[user.bluetoothName] = user;
      }
    });
    
    // 5. 处理每个碰一碰设备
    const matchedUsers = [];
    const unmatchedDevices = [];
    
    for (const device of touchList) {
      const user = deviceToUserMap[device.name];
      
      if (user) {
        // 已注册用户 - 计算标签匹配度
        const matchScore = calculateMatchScore(myBinaryArray, user.binaryArray || []);
        const matchedTags = getMatchedTags(mySelectedTags, user.selectedTags || []);
        
        matchedUsers.push({
          deviceName: device.name,
          openid: user.openid,
          displayName: user.advancedTags?.displayName || '未设置昵称',
          avatarUrl: user.userInfo?.avatarUrl || '',
          totalTags: user.selectedTags?.length || 0,
          matchScore: matchScore,
          matchedTags: matchedTags, // 匹配的具体标签
          firstTouchTime: device.first_touch || Date.now()
        });
      } else {
        // 未注册设备
        unmatchedDevices.push({
          deviceName: device.name,
          firstTouchTime: device.first_touch || Date.now()
        });
      }
    }
    
    // 6. 更新当前用户的touchList（避免重复）
    await updateUserTouchList(openid, touchList);
    
    // 7. 记录碰一碰事件（可选，用于数据分析）
    await recordTouchEvents(openid, touchList, deviceToUserMap);
    
    console.log('[syncTouchList] 处理完成 - 匹配用户:', matchedUsers.length, '未匹配设备:', unmatchedDevices.length);
    
    return {
      success: true,
      matchedUsers: matchedUsers.sort((a, b) => b.matchScore - a.matchScore), // 按匹配度排序
      unmatchedDevices: unmatchedDevices,
      summary: {
        total: touchList.length,
        matched: matchedUsers.length,
        unmatched: unmatchedDevices.length
      }
    };
    
  } catch (error) {
    console.error('[syncTouchList] 处理失败:', error);
    return {
      success: false,
      message: '处理失败',
      error: error.message
    };
  }
};

/**
 * 计算两个用户的标签匹配度
 */
function calculateMatchScore(binaryArray1, binaryArray2) {
  if (!binaryArray1 || !binaryArray2) return 0;
  
  let matchCount = 0;
  const minLength = Math.min(binaryArray1.length, binaryArray2.length);
  
  for (let i = 0; i < minLength; i++) {
    if (binaryArray1[i] === 1 && binaryArray2[i] === 1) {
      matchCount++;
    }
  }
  
  return matchCount;
}

/**
 * 获取匹配的具体标签
 */
function getMatchedTags(tags1, tags2) {
  if (!tags1 || !tags2) return [];
  
  // 找出两个数组的交集
  const matched = tags1.filter(tag => tags2.includes(tag));
  
  // 限制返回数量，避免数据过大
  return matched.slice(0, 10); // 最多返回10个匹配标签
}

/**
 * 更新用户的碰一碰列表
 */
async function updateUserTouchList(openid, newDevices) {
  try {
    // 获取当前用户的touchList
    const userRes = await db.collection('users_adv')
      .where({ openid })
      .limit(1)
      .get();
    
    if (userRes.data.length === 0) return;
    
    const user = userRes.data[0];
    const existingList = user.touchList || [];
    
    // 构建现有设备名称集合
    const existingDeviceNames = new Set(existingList.map(d => d.deviceName));
    
    // 添加新设备（避免重复）
    const updatedList = [...existingList];
    for (const device of newDevices) {
      if (!existingDeviceNames.has(device.name)) {
        updatedList.push({
          deviceName: device.name,
          firstTouchTime: device.first_touch || Date.now()
        });
      }
    }
    
    // 限制列表大小，保留最近的100个设备
    const finalList = updatedList.slice(-100);
    
    // 更新数据库
    await db.collection('users_adv')
      .doc(user._id)
      .update({
        data: {
          touchList: finalList,
          lastTouchUpdate: new Date()
        }
      });
    
    console.log('[updateUserTouchList] 更新touchList成功，当前设备数:', finalList.length);
    
  } catch (error) {
    console.error('[updateUserTouchList] 更新失败:', error);
  }
}

/**
 * 记录碰一碰事件（用于数据分析）
 */
async function recordTouchEvents(openid, devices, userMap) {
  try {
    // 批量创建记录
    const records = devices.map(device => ({
      deviceA: openid, // 当前用户
      deviceB: device.name,
      openidB: userMap[device.name]?.openid || null,
      touchTime: new Date(device.first_touch || Date.now()),
      status: userMap[device.name] ? 'matched' : 'pending',
      createTime: new Date()
    }));
    
    // 限制批量写入数量
    const batchSize = 20;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await db.collection('touch_records').add({
        data: batch
      });
    }
    
    console.log('[recordTouchEvents] 记录碰一碰事件成功:', records.length);
    
  } catch (error) {
    console.error('[recordTouchEvents] 记录失败:', error);
    // 不影响主流程
  }
}