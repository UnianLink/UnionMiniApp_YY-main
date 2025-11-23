// 云函数：获取用户问卷数据
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 🖼️ 头像配置管理 - 简化版
const AvatarConfig = {
  // 🎨 获取统一的默认头像URL
  getDefaultAvatarUrl(seed = 'default', userInfo = {}) {
    // 统一使用本地默认头像，不再动态生成
    return '/assets/default-avatar.svg';
  },
  
  // 🔄 检查头像是否需要更新
  needsRefresh(avatarUrl) {
    if (!avatarUrl) return true;
    
    const oldPatterns = [
      '132.232.99.205',   // 旧的服务器地址
      'bottts-neutral',   // 旧的机器人风格
      'dicebear.com',     // DiceBear动态头像
      'api.dicebear',     // DiceBear API
      'robohash'
    ];
    
    return oldPatterns.some(pattern => avatarUrl.includes(pattern));
  }
};

/**
 * 获取用户数据
 * 支持获取原有问卷数据和高级标签数据
 */
exports.main = async (event, context) => {
  console.log('[getUserData] 接收到数据获取请求', event);
  
  // 优先使用传入的openid，如果没有则使用当前用户的openid
  let openid = event.openid;
  
  if (!openid) {
    const wxContext = cloud.getWXContext();
    openid = wxContext.OPENID;
    console.log('[getUserData] 使用当前用户openid:', openid);
  } else {
    console.log('[getUserData] 使用传入的openid:', openid);
  }
  
  if (!openid) {
    return {
      success: false,
      message: '用户身份验证失败'
    };
  }

  try {
    // 检查请求的数据类型和是否包含朋友数据
    const { dataType, type, includeFriends, action, mbtiData } = event;
    const finalDataType = dataType || type || 'advanced';
    
    console.log('[getUserData] 请求参数:', { finalDataType, includeFriends, action });
    
    // 🎨 新增：处理MBTI数据更新请求
    if (action === 'updateMBTI' && mbtiData) {
      console.log('[getUserData] 处理MBTI数据更新请求:', mbtiData);
      return await updateMBTIData(openid, mbtiData);
    }
    
    if (finalDataType === 'advanced' || !finalDataType) {
      // 获取高级标签数据（默认）
      return await getAdvancedTagsData(openid, includeFriends);
    } else if (finalDataType === 'original') {
      // 获取原有问卷数据
      return await getOriginalQuestionnaireData(openid, includeFriends);
    } else {
      // 获取两种数据
      const advancedResult = await getAdvancedTagsData(openid, includeFriends);
      const originalResult = await getOriginalQuestionnaireData(openid, includeFriends);
      
      return {
        success: true,
        data: {
          advanced: advancedResult.success ? advancedResult.data : null,
          original: originalResult.success ? originalResult.data : null
        }
      };
    }
  } catch (error) {
    console.error('[getUserData] 获取数据失败:', error);
    return {
      success: false,
      message: '获取数据失败，请重试',
      error: error.message
    };
  }
};

/**
 * 获取高级标签数据
 */
async function getAdvancedTagsData(openid, includeFriends = false) {
  console.log('[getUserData] 获取高级标签数据, includeFriends:', includeFriends);
  
  try {
    const result = await db.collection('users_adv')
      .where({
        openid: openid
      })
      .orderBy('updateTime', 'desc')
      .limit(1)
      .get();

    if (result.data.length > 0) {
      const userData = result.data[0];
      
      // 🖼️ 头像存储修复：处理头像URL和FileID
      if (userData.userInfo && userData.userInfo.avatarFileID) {
        try {
          console.log('[getUserData] 🖼️ 发现用户自定义头像FileID:', userData.userInfo.avatarFileID);
          const tempUrlResult = await cloud.getTempFileURL({
            fileList: [userData.userInfo.avatarFileID]
          });
          
          if (tempUrlResult.fileList && tempUrlResult.fileList.length > 0) {
            const fileInfo = tempUrlResult.fileList[0];
            if (fileInfo.status === 0) {
              userData.userInfo.avatarUrl = fileInfo.tempFileURL;
              console.log('[getUserData] ✅ 头像临时URL生成成功');
            } else {
              console.warn('[getUserData] ⚠️ 头像临时URL生成失败，状态:', fileInfo.status);
            }
          }
        } catch (urlError) {
          console.warn('[getUserData] ❌ 获取头像URL失败:', urlError);
          // 继续使用原有的头像URL，确保customAvatar标记正确
          if (!userData.userInfo.avatarUrl || userData.userInfo.avatarUrl.startsWith('cloud://')) {
            // 如果没有有效的URL，生成美观的默认头像但保留customAvatar标记
            userData.userInfo.avatarUrl = AvatarConfig.getDefaultAvatarUrl(
              userData.userInfo.nickName || userData.advancedTags?.displayName || 'default',
              userData.advancedTags
            );
            console.log('[getUserData] 🎭 使用美观默认头像作为fallback');
          }
        }
      } else if (userData.userInfo && !userData.userInfo.customAvatar) {
        // 🎭 用户使用默认头像，确保URL正确且美观
        if (!userData.userInfo.avatarUrl || AvatarConfig.needsRefresh(userData.userInfo.avatarUrl)) {
          userData.userInfo.avatarUrl = AvatarConfig.getDefaultAvatarUrl(
            userData.userInfo.nickName || userData.advancedTags?.displayName || 'default',
            userData.advancedTags
          );
          console.log('[getUserData] 🎭 设置美观默认头像URL');
        }
      }
      
      // 🔥 新增：如果请求包含朋友数据，则添加朋友信息
      if (includeFriends) {
        console.log('[getUserData] 包含朋友数据，当前朋友数量:', userData.friends ? userData.friends.length : 0);
        
        // 确保朋友字段存在，即使为空
        if (!userData.friends) {
          userData.friends = [];
          console.log('[getUserData] 用户暂无朋友数据，返回空数组');
        } else {
          // 🔒 KISS原则用户隔离：过滤出真正属于当前用户的朋友关系
          const originalCount = userData.friends.length;
          userData.friends = userData.friends.filter((friend, index) => {
            // 保留朋友关系的条件：
            // 1. 未注册设备 (isUnregistered=true) - 这些是单向关系，属于当前用户
            // 2. 有明确的朋友关系记录但需要验证是否属于当前用户
            if (friend.isUnregistered || friend.deviceOnly) {
              return true; // 未注册设备保留
            }
            
            // 对于注册用户，暂时保留所有记录（向后兼容）
            // 未来可以通过独立的朋友关系集合进行更严格的验证
            return true;
          });
          
          const filteredCount = userData.friends.length;
          if (originalCount !== filteredCount) {
            console.log(`[getUserData] 🔒 用户隔离过滤：原有${originalCount}个朋友，过滤后${filteredCount}个`);
          }
          
          console.log('[getUserData] 返回朋友数据，数量:', userData.friends.length);
          userData.friends.forEach((friend, index) => {
            console.log(`[getUserData] 朋友${index + 1}:`, {
              deviceName: friend.friendDeviceName,
              displayName: friend.friendUserInfo?.displayName,
              isRegistered: !friend.isUnregistered,
              meetCount: friend.meetCount
            });
          });
        }
      }
      
      console.log('[getUserData] 高级标签数据获取成功');
      return {
        success: true,
        data: userData // 🔥 修复：使用data字段与device.js保持一致
      };
    } else {
      console.log('[getUserData] 用户尚未填写高级标签数据');
      return {
        success: false,
        message: '尚未填写标签数据'
      };
    }
  } catch (dbError) {
    console.error('[getUserData] 数据库查询失败:', dbError);
    throw dbError;
  }
}

/**
 * 获取原有问卷数据（兼容）
 */
async function getOriginalQuestionnaireData(openid, includeFriends = false) {
  console.log('[getUserData] 获取原有问卷数据, includeFriends:', includeFriends);
  
  try {
    const result = await db.collection('users_bar')
      .where({
        openid: openid
      })
      .orderBy('updateTime', 'desc')
      .limit(1)
      .get();

    if (result.data.length > 0) {
      const userData = result.data[0];
      
      // 🖼️ 头像存储修复：处理头像URL和FileID（原有问卷数据）
      if (userData.userInfo && userData.userInfo.avatarFileID) {
        try {
          console.log('[getUserData] 🖼️ 发现原有问卷用户自定义头像FileID:', userData.userInfo.avatarFileID);
          const tempUrlResult = await cloud.getTempFileURL({
            fileList: [userData.userInfo.avatarFileID]
          });
          
          if (tempUrlResult.fileList && tempUrlResult.fileList.length > 0) {
            const fileInfo = tempUrlResult.fileList[0];
            if (fileInfo.status === 0) {
              userData.userInfo.avatarUrl = fileInfo.tempFileURL;
              console.log('[getUserData] ✅ 原有问卷头像临时URL生成成功');
            } else {
              console.warn('[getUserData] ⚠️ 原有问卷头像临时URL生成失败，状态:', fileInfo.status);
            }
          }
        } catch (urlError) {
          console.warn('[getUserData] ❌ 获取原有问卷头像URL失败:', urlError);
          // 继续使用原有的头像URL，确保customAvatar标记正确
          if (!userData.userInfo.avatarUrl || userData.userInfo.avatarUrl.startsWith('cloud://')) {
            // 如果没有有效的URL，生成美观的默认头像但保留customAvatar标记
            userData.userInfo.avatarUrl = AvatarConfig.getDefaultAvatarUrl(
              userData.userInfo.nickName || 'default',
              userData.questionnaire
            );
            console.log('[getUserData] 🎭 原有问卷使用美观默认头像作为fallback');
          }
        }
      } else if (userData.userInfo && !userData.userInfo.customAvatar) {
        // 🎭 原有问卷用户使用默认头像，确保URL正确且美观
        if (!userData.userInfo.avatarUrl || AvatarConfig.needsRefresh(userData.userInfo.avatarUrl)) {
          userData.userInfo.avatarUrl = AvatarConfig.getDefaultAvatarUrl(
            userData.userInfo.nickName || 'default',
            userData.questionnaire
          );
          console.log('[getUserData] 🎭 原有问卷设置美观默认头像URL');
        }
      }
      
      // 🔥 新增：如果请求包含朋友数据，则添加朋友信息
      if (includeFriends) {
        console.log('[getUserData] 包含朋友数据（users_bar），当前朋友数量:', userData.friends ? userData.friends.length : 0);
        
        // 确保朋友字段存在，即使为空
        if (!userData.friends) {
          userData.friends = [];
          console.log('[getUserData] users_bar用户暂无朋友数据，返回空数组');
        } else {
          console.log('[getUserData] users_bar返回朋友数据，数量:', userData.friends.length);
        }
      }
      
      console.log('[getUserData] 原有问卷数据获取成功');
      return {
        success: true,
        data: userData // 🔥 修复：使用data字段与device.js保持一致
      };
    } else {
      console.log('[getUserData] 用户尚未填写问卷数据');
      return {
        success: false,
        message: '尚未填写问卷数据'
      };
    }
  } catch (dbError) {
    console.error('[getUserData] 数据库查询失败:', dbError);
    throw dbError;
  }
}

/**
 * 🎨 新增：更新用户MBTI数据
 * @param {string} openid 用户openid
 * @param {Object} mbtiData MBTI更新数据
 */
async function updateMBTIData(openid, mbtiData) {
  console.log('[getUserData] 开始更新MBTI数据:', { openid, mbtiData });
  
  try {
    // 1. 查找用户在users_adv集合中的数据
    const queryResult = await db.collection('users_adv')
      .where({
        openid: openid
      })
      .limit(1)
      .get();
    
    if (queryResult.data.length === 0) {
      console.warn('[getUserData] 用户不存在于users_adv集合，无法更新MBTI数据');
      return {
        success: false,
        message: '用户数据不存在，请先完成问卷'
      };
    }
    
    const userData = queryResult.data[0];
    const docId = userData._id;
    
    console.log('[getUserData] 找到用户数据，准备更新:', { docId, currentMBTI: userData.advancedTags?.mbtiType });
    
    // 2. 准备更新数据
    const updateFields = {
      ...mbtiData,
      updateTime: new Date()
    };
    
    console.log('[getUserData] 更新字段:', updateFields);
    
    // 3. 执行更新操作
    const updateResult = await db.collection('users_adv')
      .doc(docId)
      .update({
        data: updateFields
      });
    
    console.log('[getUserData] MBTI数据更新完成:', updateResult);
    
    // 4. 验证更新结果
    if (updateResult.stats && updateResult.stats.updated > 0) {
      console.log('[getUserData] ✅ MBTI数据更新成功');
      
      // 返回更新后的数据预览
      const updatedMBTI = mbtiData['advancedTags.mbtiType'];
      const updatedColor = mbtiData['advancedTags.idleLightColor'];
      
      return {
        success: true,
        message: 'MBTI数据更新成功',
        data: {
          mbtiType: updatedMBTI,
          idleLightColor: updatedColor,
          updateTime: updateFields.updateTime
        }
      };
      
    } else {
      console.warn('[getUserData] ⚠️ MBTI数据更新无变化或失败');
      return {
        success: false,
        message: 'MBTI数据更新失败，请重试'
      };
    }
    
  } catch (updateError) {
    console.error('[getUserData] ❌ MBTI数据更新异常:', updateError);
    return {
      success: false,
      message: 'MBTI数据更新异常，请重试',
      error: updateError.message
    };
  }
} 