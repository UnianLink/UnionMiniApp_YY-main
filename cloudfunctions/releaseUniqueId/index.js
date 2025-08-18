// 云函数：释放用户的uniqueId位置，供其他用户重用
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 释放用户的uniqueId位置
 * 
 * 业务逻辑：
 * 1. 验证用户身份和原位置占用情况
 * 2. 删除或标记用户的旧标签配置记录
 * 3. 释放uniqueId位置供后续用户使用
 * 
 * 使用场景：
 * - 用户修改标签配置时调用
 * - 系统清理过期记录时调用
 */
exports.main = async (event, context) => {
  console.log('[releaseUniqueId] 接收到请求', JSON.stringify(event, null, 2));
  
  // 获取用户身份
  const wxContext = cloud.getWXContext();
  const openid = event.openid || wxContext.OPENID;
  
  if (!openid) {
    return {
      success: false,
      message: '用户身份验证失败'
    };
  }

  const { oldTagConfigHash, oldUniqueId } = event;
  
  if (!oldTagConfigHash || typeof oldUniqueId !== 'number') {
    return {
      success: false,
      message: '参数不完整：需要oldTagConfigHash和oldUniqueId'
    };
  }

  try {
    // 1. 查找用户的旧记录
    const userQuery = await db.collection('users_adv')
      .where({
        openid: openid,
        'advancedTags.tagConfigHash': oldTagConfigHash,
        'advancedTags.uniqueId': oldUniqueId
      })
      .get();

    if (userQuery.data.length === 0) {
      console.log(`[releaseUniqueId] 未找到用户的旧记录: openid=${openid}, hash=${oldTagConfigHash}, id=${oldUniqueId}`);
      return {
        success: true,
        message: '旧记录不存在，无需释放',
        released: false
      };
    }

    // 2. 删除旧记录以释放位置
    const userRecord = userQuery.data[0];
    await db.collection('users_adv')
      .doc(userRecord._id)
      .remove();

    console.log(`[releaseUniqueId] ✅ 成功释放位置: tagConfigHash=${oldTagConfigHash}, uniqueId=${oldUniqueId}`);

    return {
      success: true,
      message: `成功释放位置 ${oldUniqueId}`,
      released: true,
      releasedPosition: {
        tagConfigHash: oldTagConfigHash,
        uniqueId: oldUniqueId
      }
    };

  } catch (error) {
    console.error('[releaseUniqueId] 处理失败:', error);
    return {
      success: false,
      message: '释放位置失败',
      error: error.message
    };
  }
};