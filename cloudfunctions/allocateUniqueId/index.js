// 云函数：为具有相同标签配置的用户分配唯一ID
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 为具有相同标签配置的用户分配唯一ID
 * 
 * 业务逻辑：
 * 1. 根据用户的标签配置生成哈希值
 * 2. 查找具有相同哈希值的其他用户
 * 3. 分配下一个可用的唯一ID（0-4095范围）
 * 4. 更新用户记录中的uniqueId字段
 */
exports.main = async (event, context) => {
  console.log('[allocateUniqueId] 接收到请求', JSON.stringify(event, null, 2));
  
  // 获取用户身份
  const wxContext = cloud.getWXContext();
  const openid = event.openid || wxContext.OPENID;
  
  if (!openid) {
    return {
      success: false,
      message: '用户身份验证失败'
    };
  }

  const { tagConfigHash, selectedTags } = event;
  
  if (!tagConfigHash || !Array.isArray(selectedTags)) {
    return {
      success: false,
      message: '参数不完整：需要tagConfigHash和selectedTags'
    };
  }

  try {
    // 1. 查找具有相同标签配置哈希的用户
    const existingUsersQuery = await db.collection('users_adv')
      .where({
        'advancedTags.tagConfigHash': tagConfigHash
      })
      .get();

    console.log(`[allocateUniqueId] 找到 ${existingUsersQuery.data.length} 个具有相同标签配置的用户`);

    // 2. 统计已使用的uniqueId
    const usedIds = new Set();
    let currentUserRecord = null;
    
    for (const user of existingUsersQuery.data) {
      if (user.openid === openid) {
        currentUserRecord = user;
      }
      
      const uniqueId = user.advancedTags?.uniqueId;
      if (typeof uniqueId === 'number' && uniqueId >= 0 && uniqueId <= 4095) {
        usedIds.add(uniqueId);
      }
    }

    // 3. 如果当前用户已有有效的uniqueId，直接返回
    if (currentUserRecord && currentUserRecord.advancedTags?.uniqueId !== undefined) {
      const existingId = currentUserRecord.advancedTags.uniqueId;
      if (existingId >= 0 && existingId <= 4095) {
        console.log(`[allocateUniqueId] 用户已有有效uniqueId: ${existingId}`);
        return {
          success: true,
          uniqueId: existingId,
          message: '用户已有唯一ID',
          totalUsersWithSameConfig: existingUsersQuery.data.length
        };
      }
    }

    // 4. 为新用户分配下一个可用的ID（从0开始，恢复原始设计）
    let assignedId = 0;
    while (assignedId <= 4095) {
      if (!usedIds.has(assignedId)) {
        // 找到可用ID
        break;
      }
      assignedId++;
    }

    if (assignedId > 4095) {
      return {
        success: false,
        message: '相同标签配置的用户数量已达上限（4096）',
        totalUsersWithSameConfig: existingUsersQuery.data.length
      };
    }

    // 5. 更新或创建用户记录
    const updateData = {
      'advancedTags.uniqueId': assignedId,
      'advancedTags.tagConfigHash': tagConfigHash,
      'advancedTags.updateTime': new Date(),
      'updateTime': new Date()
    };

    if (currentUserRecord) {
      // 更新现有记录
      await db.collection('users_adv')
        .doc(currentUserRecord._id)
        .update({
          data: updateData
        });
      
      console.log(`[allocateUniqueId] 为现有用户分配uniqueId: ${assignedId}`);
    } else {
      // 创建新记录
      await db.collection('users_adv')
        .add({
          data: {
            openid: openid,
            advancedTags: {
              uniqueId: assignedId,
              tagConfigHash: tagConfigHash,
              selectedTags: selectedTags,
              updateTime: new Date()
            },
            createTime: new Date(),
            updateTime: new Date()
          }
        });
      
      console.log(`[allocateUniqueId] 为新用户创建记录并分配uniqueId: ${assignedId}`);
    }

    return {
      success: true,
      uniqueId: assignedId,
      message: `成功分配唯一ID: ${assignedId}`,
      totalUsersWithSameConfig: existingUsersQuery.data.length + (currentUserRecord ? 0 : 1),
      isNewAssignment: true
    };

  } catch (error) {
    console.error('[allocateUniqueId] 处理失败:', error);
    return {
      success: false,
      message: '分配唯一ID失败',
      error: error.message
    };
  }
};

/**
 * 生成标签配置哈希值（辅助函数）
 * 这个函数可以在小程序端调用以生成一致的哈希值
 */
function generateTagConfigHash(selectedTags) {
  // 使用标签的排序数组生成哈希
  const sortedTags = [...selectedTags].sort();
  return require('crypto')
    .createHash('md5')
    .update(JSON.stringify(sortedTags))
    .digest('hex')
    .substring(0, 16); // 使用前16位作为哈希
}