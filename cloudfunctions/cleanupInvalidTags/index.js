// 云函数：清理用户数据中的无效标签
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 批量清理用户无效标签数据
 * 解决用户历史标签数据与当前配置不匹配的问题
 */
exports.main = async (event, context) => {
  console.log('🧹 开始批量清理用户无效标签数据');
  
  // 有效标签列表（从 tagThemes.js 提取）
  const validTags = new Set([
    '软件开发', '硬件开发', '人工智能', '数据科学', '网络安全',
    '商业与金融', '教育学', '心理学', '艺术与设计', '法律',
    '产品经理', '管理与经营', '新媒体', '人文社科', '创新创业',
    '摄影', '绘画', '音乐', '表演', '游戏', '二次元', '剧本杀',
    '美食', '宠物', '运动', '手工', '舞蹈', '阅读', '写作',
    '旅行', '电影',
    '外向型', '内向型', '理性型', '感性型', '直觉型', '感知型',
    '思考型', '情感型', '判断型', '计划型', '独立型', '协作型',
    '夜猫子', '早起鸟', '咖啡续命', '奶茶控', '撸猫达人',
    '收纳狂', '脑洞大开', '神秘学爱好者', '社牛', '社恐',
    '情绪稳定', '佛系随缘'
  ]);
  
  try {
    let totalUsers = 0;
    let cleanedUsers = 0;
    let totalInvalidTags = 0;
    
    // 分批处理用户数据
    const batchSize = 100;
    let hasMore = true;
    let lastId = null;
    
    while (hasMore) {
      const query = db.collection('users_adv');
      if (lastId) {
        query.where({ _id: db.command.gt(lastId) });
      }
      
      const result = await query.orderBy('_id', 'asc').limit(batchSize).get();
      
      if (result.data.length === 0) {
        hasMore = false;
        continue;
      }
      
      totalUsers += result.data.length;
      lastId = result.data[result.data.length - 1]._id;
      
      // 处理每个用户
      for (const user of result.data) {
        if (user.advancedTags) {
          let needsUpdate = false;
          const cleanedAdvancedTags = { ...user.advancedTags };
          let userInvalidTags = 0;
          
          ['professionalTags', 'interestTags', 'personalityTags', 'quirkyTags'].forEach(field => {
            if (cleanedAdvancedTags[field] && Array.isArray(cleanedAdvancedTags[field])) {
              const originalLength = cleanedAdvancedTags[field].length;
              cleanedAdvancedTags[field] = cleanedAdvancedTags[field].filter(tag => validTags.has(tag));
              
              const removedCount = originalLength - cleanedAdvancedTags[field].length;
              if (removedCount > 0) {
                needsUpdate = true;
                userInvalidTags += removedCount;
                console.log(`用户 ${user.openid} 清理 ${field}: ${originalLength} -> ${cleanedAdvancedTags[field].length}`);
              }
            }
          });
          
          if (needsUpdate) {
            await db.collection('users_adv').doc(user._id).update({
              data: {
                advancedTags: cleanedAdvancedTags,
                lastCleanupTime: new Date()
              }
            });
            cleanedUsers++;
            totalInvalidTags += userInvalidTags;
            console.log(`✅ 用户 ${user.openid} 清理完成，移除 ${userInvalidTags} 个无效标签`);
          }
        }
      }
      
      console.log(`📊 已处理 ${totalUsers} 个用户，清理 ${cleanedUsers} 个用户数据`);
    }
    
    return {
      success: true,
      message: `批量清理完成！共处理 ${totalUsers} 个用户，清理 ${cleanedUsers} 个用户的无效标签，总计移除 ${totalInvalidTags} 个无效标签`,
      statistics: {
        totalUsers,
        cleanedUsers,
        totalInvalidTags,
        cleanupRate: ((cleanedUsers / totalUsers) * 100).toFixed(1) + '%'
      }
    };
    
  } catch (error) {
    console.error('❌ 批量清理失败:', error);
    return {
      success: false,
      message: '批量清理失败: ' + error.message,
      error: error.toString()
    };
  }
};