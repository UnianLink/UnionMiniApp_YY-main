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
    // 🔧 关键修复：支持匹配正确格式和错误格式（双Un前缀）的设备名
    const correctedDeviceNames = deviceNames.map(name => name.startsWith('UnUn') ? name : `Un${name}`);
    
    const usersRes = await db.collection('users_adv')
      .where(_.or([
        { bluetoothName: _.in(deviceNames) },        // 匹配硬件上报的正确格式
        { bluetoothName: _.in(correctedDeviceNames) }, // 匹配数据库中可能的错误格式 
        { encodedTags: _.in(deviceNames) }           // 备用：通过encodedTags字段匹配
      ]))
      .get();
    
    console.log('[syncTouchList] 查询到已注册用户:', usersRes.data.length);
    
    // 4. 构建设备名到用户的映射
    // 🔧 关键修复：建立正确格式设备名到用户的映射关系
    const deviceToUserMap = {};
    usersRes.data.forEach(user => {
      // 为每个硬件上报的设备名建立映射关系
      deviceNames.forEach(deviceName => {
        // 情况1：直接匹配bluetoothName
        if (user.bluetoothName === deviceName) {
          deviceToUserMap[deviceName] = user;
          console.log('[syncTouchList] ✅ 直接匹配:', deviceName, '->', user.bluetoothName);
        }
        // 情况2：匹配错误格式的bluetoothName（双Un前缀）
        else if (user.bluetoothName === `Un${deviceName}`) {
          deviceToUserMap[deviceName] = user;
          console.log('[syncTouchList] 🔧 修复匹配（双Un前缀）:', deviceName, '->', user.bluetoothName);
        }
        // 情况3：通过encodedTags字段匹配
        else if (user.encodedTags === deviceName) {
          deviceToUserMap[deviceName] = user;
          console.log('[syncTouchList] ✅ 通过encodedTags匹配:', deviceName, '->', user.encodedTags);
        }
      });
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
    
    // 8. 建立双向朋友关系（核心功能）
    console.log('[syncTouchList] 📞 开始建立双向朋友关系，匹配用户数:', matchedUsers.length);
    await establishMutualFriendships(currentUser, matchedUsers);
    
    // 9. 处理未注册设备，添加到当前用户的朋友列表（单向关系）
    console.log('[syncTouchList] 📞 开始处理未注册设备，未注册设备数:', unmatchedDevices.length);
    await addUnmatchedDevicesAsFriends(currentUser, unmatchedDevices);
    
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

/**
 * 建立双向朋友关系（核心功能）
 * 一方上传，双方成友
 */
async function establishMutualFriendships(currentUser, matchedUsers) {
  try {
    console.log('[establishMutualFriendships] 开始建立双向朋友关系，匹配用户数:', matchedUsers.length);
    
    for (const matchedUser of matchedUsers) {
      // 🔧 关键修复：获取对方的完整用户信息，支持多种匹配方式
      const friendRes = await db.collection('users_adv')
        .where(_.or([
          { bluetoothName: matchedUser.deviceName },          // 直接匹配
          { bluetoothName: `Un${matchedUser.deviceName}` },   // 匹配错误格式（双Un前缀）
          { encodedTags: matchedUser.deviceName }             // 通过encodedTags匹配
        ]))
        .limit(1)
        .get();
      
      if (friendRes.data.length === 0) {
        console.log('[establishMutualFriendships] 未找到设备对应用户:', matchedUser.deviceName);
        continue;
      }
      
      const friendUser = friendRes.data[0];
      
      // 1. 在当前用户的朋友列表中添加对方
      await addToFriendsList(currentUser._id, currentUser.openid, {
        friendOpenid: friendUser.openid,
        friendDeviceName: friendUser.bluetoothName || friendUser.encodedTags,
        friendUserInfo: {
          displayName: friendUser.advancedTags?.displayName || '未设置昵称',
          avatarUrl: friendUser.userInfo?.avatarUrl || '',
          nickName: friendUser.userInfo?.nickName || '',
          // 🔥 新增：保存完整名片信息
          contactInfo: friendUser.advancedTags?.contactInfo || '',
          personalTagsText: friendUser.advancedTags?.personalTagsText || '',
          qrCodeUrl: friendUser.advancedTags?.qrCodeUrl || '',
          // 保存标签信息用于详情显示
          professionalTags: friendUser.advancedTags?.professionalTags || [],
          interestTags: friendUser.advancedTags?.interestTags || [],
          personalityTags: friendUser.advancedTags?.personalityTags || [],
          quirkyTags: friendUser.advancedTags?.quirkyTags || [],
          totalTags: friendUser.selectedTags?.length || 0,
          threshold: friendUser.advancedTags?.threshold || 3
        },
        firstMeetTime: new Date(matchedUser.firstTouchTime),
        matchScore: matchedUser.matchScore,
        matchedTags: matchedUser.matchedTags || []
      });
      
      // 2. 在对方的朋友列表中添加当前用户
      await addToFriendsList(friendUser._id, friendUser.openid, {
        friendOpenid: currentUser.openid,
        friendDeviceName: currentUser.bluetoothName || currentUser.encodedTags,
        friendUserInfo: {
          displayName: currentUser.advancedTags?.displayName || '未设置昵称',
          avatarUrl: currentUser.userInfo?.avatarUrl || '',
          nickName: currentUser.userInfo?.nickName || '',
          // 🔥 新增：保存完整名片信息
          contactInfo: currentUser.advancedTags?.contactInfo || '',
          personalTagsText: currentUser.advancedTags?.personalTagsText || '',
          qrCodeUrl: currentUser.advancedTags?.qrCodeUrl || '',
          // 保存标签信息用于详情显示
          professionalTags: currentUser.advancedTags?.professionalTags || [],
          interestTags: currentUser.advancedTags?.interestTags || [],
          personalityTags: currentUser.advancedTags?.personalityTags || [],
          quirkyTags: currentUser.advancedTags?.quirkyTags || [],
          totalTags: currentUser.selectedTags?.length || 0,
          threshold: currentUser.advancedTags?.threshold || 3
        },
        firstMeetTime: new Date(matchedUser.firstTouchTime),
        matchScore: matchedUser.matchScore,
        matchedTags: matchedUser.matchedTags || []
      });
      
      console.log('[establishMutualFriendships] 成功建立双向朋友关系:', 
        currentUser.advancedTags?.displayName, '<->', friendUser.advancedTags?.displayName);
    }
    
    console.log('[establishMutualFriendships] 双向朋友关系建立完成');
    
  } catch (error) {
    console.error('[establishMutualFriendships] 建立双向朋友关系失败:', error);
  }
}

/**
 * 添加朋友到用户的朋友列表
 * 支持防重复和更新逻辑
 */
async function addToFriendsList(userId, userOpenid, friendInfo) {
  try {
    console.log('[addToFriendsList] 🔥 开始添加朋友到列表');
    console.log('[addToFriendsList] 🔥 用户ID:', userId);
    console.log('[addToFriendsList] 🔥 用户OpenID:', userOpenid);
    console.log('[addToFriendsList] 🔥 朋友信息:', JSON.stringify(friendInfo, null, 2));
    
    // 获取用户当前的朋友列表
    const userRes = await db.collection('users_adv')
      .doc(userId)
      .get();
    
    if (!userRes.data) {
      console.error('[addToFriendsList] ❌ 用户不存在:', userOpenid);
      throw new Error(`用户不存在: ${userOpenid}`);
    }
    
    const user = userRes.data;
    const currentFriends = user.friends || [];
    
    console.log('[addToFriendsList] 🔥 当前朋友数量:', currentFriends.length);
    
    // 检查朋友是否已存在（对于未注册设备，用设备名称比较）
    let existingFriendIndex = -1;
    if (friendInfo.friendOpenid) {
      // 注册用户，用openid比较
      existingFriendIndex = currentFriends.findIndex(
        friend => friend.friendOpenid === friendInfo.friendOpenid
      );
    } else {
      // 未注册设备，用设备名称比较
      existingFriendIndex = currentFriends.findIndex(
        friend => friend.friendDeviceName === friendInfo.friendDeviceName
      );
    }
    
    if (existingFriendIndex >= 0) {
      // 朋友已存在，更新见面次数和最后见面时间
      const existingFriend = currentFriends[existingFriendIndex];
      currentFriends[existingFriendIndex] = {
        ...existingFriend,
        meetCount: (existingFriend.meetCount || 1) + 1,
        lastMeetTime: friendInfo.firstMeetTime,
        // 更新用户信息以防有变化
        friendUserInfo: friendInfo.friendUserInfo,
        matchScore: Math.max(existingFriend.matchScore || 0, friendInfo.matchScore || 0)
      };
      
      console.log('[addToFriendsList] ✅ 更新现有朋友关系，见面次数:', currentFriends[existingFriendIndex].meetCount);
    } else {
      // 新朋友，添加到列表
      const newFriend = {
        ...friendInfo,
        meetCount: 1,
        lastMeetTime: friendInfo.firstMeetTime,
        addTime: new Date()
      };
      
      currentFriends.push(newFriend);
      console.log('[addToFriendsList] ✅ 添加新朋友:', friendInfo.friendUserInfo.displayName);
    }
    
    // 限制朋友列表大小，保留最近的500个朋友
    const finalFriendsList = currentFriends.slice(-500);
    
    console.log('[addToFriendsList] 🔥 准备更新数据库，最终朋友数量:', finalFriendsList.length);
    
    // 更新数据库
    const updateResult = await db.collection('users_adv')
      .doc(userId)
      .update({
        data: {
          friends: finalFriendsList,
          friendsUpdateTime: new Date()
        }
      });
    
    console.log('[addToFriendsList] ✅ 数据库更新结果:', updateResult);
    console.log('[addToFriendsList] ✅ 更新朋友列表成功，当前朋友数:', finalFriendsList.length);
    
  } catch (error) {
    console.error('[addToFriendsList] ❌ 添加朋友失败:', error);
    console.error('[addToFriendsList] ❌ 错误详情:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    throw error; // 重新抛出错误
  }
}

/**
 * 处理未注册设备，添加到当前用户的朋友列表
 * 保持原有产品逻辑：只建立单向关系
 */
async function addUnmatchedDevicesAsFriends(currentUser, unmatchedDevices) {
  try {
    console.log('[addUnmatchedDevicesAsFriends] 🔥 开始处理未注册设备，数量:', unmatchedDevices.length);
    console.log('[addUnmatchedDevicesAsFriends] 🔥 当前用户:', {
      _id: currentUser._id,
      openid: currentUser.openid,
      displayName: currentUser.advancedTags?.displayName
    });
    
    if (!unmatchedDevices || unmatchedDevices.length === 0) {
      console.log('[addUnmatchedDevicesAsFriends] ⚠️ 无未注册设备需要处理');
      return;
    }
    
    for (const device of unmatchedDevices) {
      console.log('[addUnmatchedDevicesAsFriends] 🔥 处理未注册设备:', device.deviceName);
      
      // 只在当前用户的朋友列表中添加未注册设备（单向关系）
      const friendInfo = {
        friendOpenid: null, // 未注册设备没有openid
        friendDeviceName: device.deviceName,
        friendUserInfo: {
          displayName: device.deviceName, // 直接使用Un字符串作为显示名
          nickName: `${device.deviceName} (未注册)`, // 添加未注册标记
          avatarUrl: '/images/default-unregistered.png', // 未注册设备专用头像
          isRegistered: false // 明确标记为未注册
        },
        firstMeetTime: new Date(device.firstTouchTime),
        matchScore: 0, // 未注册设备无匹配度
        matchedTags: [], // 未注册设备无匹配标签
        isUnregistered: true, // 标记为未注册设备
        deviceOnly: true // 标记这是纯设备关系，不是用户关系
      };
      
      console.log('[addUnmatchedDevicesAsFriends] 🔥 准备添加朋友信息:', JSON.stringify(friendInfo, null, 2));
      
      await addToFriendsList(currentUser._id, currentUser.openid, friendInfo);
      
      console.log('[addUnmatchedDevicesAsFriends] ✅ 成功添加未注册设备到朋友列表:', device.deviceName);
    }
    
    console.log('[addUnmatchedDevicesAsFriends] ✅ 未注册设备处理完成');
    
  } catch (error) {
    console.error('[addUnmatchedDevicesAsFriends] ❌ 处理未注册设备失败:', error);
    console.error('[addUnmatchedDevicesAsFriends] ❌ 错误堆栈:', error.stack);
    throw error; // 重新抛出错误，让调用方知道失败了
  }
}