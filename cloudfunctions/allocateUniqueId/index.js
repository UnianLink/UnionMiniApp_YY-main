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
    console.log(`[allocateUniqueId] 🔍 开始查询数据库`);
    console.log(`[allocateUniqueId] 🔑 查询条件: tagConfigHash="${tagConfigHash}"`);
    
    const existingUsersQuery = await db.collection('users_adv')
      .where({
        'advancedTags.tagConfigHash': tagConfigHash
      })
      .get();

    console.log(`[allocateUniqueId] 📊 查询结果: 找到 ${existingUsersQuery.data.length} 个相同标签配置的用户`);

    // 2. 统计已使用的uniqueId (实时计算，基于当前数据库状态)
    console.log(`[allocateUniqueId] 📋 开始分析已使用的ID...`);
    
    const usedIds = new Set();
    let currentUserRecord = null;
    const userDetails = [];
    
    for (const user of existingUsersQuery.data) {
      if (user.openid === openid) {
        currentUserRecord = user;
        console.log(`[allocateUniqueId] 👤 找到当前用户记录，现有ID: ${user.advancedTags?.uniqueId}`);
      }
      
      const uniqueId = user.advancedTags?.uniqueId;
      // 🔧 关键修复：只统计当前仍在使用该tagConfigHash的用户的ID
      if (typeof uniqueId === 'number' && uniqueId >= 0 && uniqueId <= 4095 && 
          user.advancedTags?.tagConfigHash === tagConfigHash) {
        usedIds.add(uniqueId);
        userDetails.push({
          openid: user.openid.substring(0, 8) + '...', // 脱敏显示
          uniqueId: uniqueId,
          encoded: encodeUniqueIdForDebug(uniqueId)
        });
      }
    }
    
    // 详细显示已使用的ID
    const sortedUsedIds = Array.from(usedIds).sort((a, b) => a - b);
    console.log(`[allocateUniqueId] 📊 已使用的ID列表 (共${sortedUsedIds.length}个):`, sortedUsedIds);
    console.log(`[allocateUniqueId] 🎯 ID→编码映射:`, 
      sortedUsedIds.map(id => `${id}→"${encodeUniqueIdForDebug(id)}"`));
    
    if (userDetails.length > 0) {
      console.log(`[allocateUniqueId] 👥 用户详情:`, userDetails);
    }

    // 3. 检查当前用户是否已有uniqueId，并分析配置变更情况
    if (currentUserRecord && currentUserRecord.advancedTags?.uniqueId !== undefined) {
      const existingId = currentUserRecord.advancedTags.uniqueId;
      const currentTagConfigHash = currentUserRecord.advancedTags?.tagConfigHash;
      
      if (existingId >= 0 && existingId <= 4095) {
        console.log(`[allocateUniqueId] 🔍 当前用户已有记录分析:`);
        console.log(`[allocateUniqueId] 📊 现有uniqueId: ${existingId} → 编码"${encodeUniqueIdForDebug(existingId)}"`);
        console.log(`[allocateUniqueId] 🆔 现有配置哈希: "${currentTagConfigHash}"`);
        console.log(`[allocateUniqueId] 🆕 新配置哈希: "${tagConfigHash}"`);
        
        // 检查配置是否发生变更
        const configChanged = currentTagConfigHash !== tagConfigHash;
        console.log(`[allocateUniqueId] 🔄 配置变更检查: ${configChanged ? '✅ 配置已变更，需要释放原位置重新分配' : '❌ 配置未变更，继续使用原位置'}`);
        
        if (!configChanged) {
          // 配置未变更，继续使用原位置
          console.log(`[allocateUniqueId] 🎯 ID分配决策详情:`);
          console.log(`[allocateUniqueId] ├─ 决策类型: 保持现有分配`);
          console.log(`[allocateUniqueId] ├─ 决策原因: 标签配置哈希未变更`);
          console.log(`[allocateUniqueId] ├─ 说明: 用户可能只修改了MBTI类型（不影响兴趣匹配）`);
          console.log(`[allocateUniqueId] └─ 结果: 继续使用ID ${existingId} → "${encodeUniqueIdForDebug(existingId)}"`);
          
          console.log(`[allocateUniqueId] 📊 当前标签配置统计:`);
          console.log(`[allocateUniqueId] ├─ 相同配置用户总数: ${existingUsersQuery.data.length}`);
          console.log(`[allocateUniqueId] ├─ 已使用ID数量: ${sortedUsedIds.length}`);
          console.log(`[allocateUniqueId] ├─ 当前用户ID位置: 第${sortedUsedIds.indexOf(existingId) + 1}个`);
          console.log(`[allocateUniqueId] └─ ID池利用率: ${sortedUsedIds.length}/4096 (${(sortedUsedIds.length/4096*100).toFixed(2)}%)`);
          
          console.log(`[allocateUniqueId] 📋 已使用ID完整列表 (${sortedUsedIds.length}个):`, sortedUsedIds);
          console.log(`[allocateUniqueId] 🎯 ID→编码映射详情:`, 
            sortedUsedIds.map(id => `${id}→"${encodeUniqueIdForDebug(id)}"`).join(', '));
          
          return {
            success: true,
            uniqueId: existingId,
            encoded: encodeUniqueIdForDebug(existingId),
            message: `配置未变更，继续使用ID: ${existingId} → "${encodeUniqueIdForDebug(existingId)}"`,
            totalUsersWithSameConfig: existingUsersQuery.data.length,
            isNewAssignment: false,
            usedIdsList: sortedUsedIds,
            debugInfo: {
              tagConfigHash: tagConfigHash,
              beforeAllocation: sortedUsedIds,
              afterAllocation: sortedUsedIds, // 配置未变，ID使用情况不变
              userAlreadyExists: true,
              configChanged: false,
              existingIdPosition: sortedUsedIds.indexOf(existingId),
              decisionType: "保持现有分配",
              decisionReason: "标签配置哈希未变更，可能只修改了MBTI类型"
            }
          };
        } else {
          // 配置已变更，需要释放原位置并重新分配
          console.log(`[allocateUniqueId] 🔄 检测到配置变更，开始位置释放流程:`);
          console.log(`[allocateUniqueId] ├─ 原配置: "${currentTagConfigHash}" → ID ${existingId}`);
          console.log(`[allocateUniqueId] ├─ 新配置: "${tagConfigHash}"`);
          console.log(`[allocateUniqueId] └─ 操作: 释放ID ${existingId}，为新配置重新分配`);
          
          // 将当前用户记录标记为无效，以便重新分配
          currentUserRecord = null;
          // 注意：原位置的释放将通过数据库更新自动实现
        }
      }
    }

    // 4. 为新用户或配置变更用户分配下一个可用的ID（从0开始，恢复原始设计）
    const isConfigChanged = currentUserRecord !== null; // 如果currentUserRecord被重置，说明配置已变更
    const userType = isConfigChanged ? "配置变更用户" : "新用户";
    
    console.log(`[allocateUniqueId] 🆕 为${userType}分配ID...`);
    console.log(`[allocateUniqueId] 🔍 ID分配决策详情:`);
    console.log(`[allocateUniqueId] ├─ 决策类型: 重新分配`);
    console.log(`[allocateUniqueId] ├─ 决策原因: ${isConfigChanged ? '标签配置哈希已变更，释放原位置' : '首次分配，无现有记录'}`);
    console.log(`[allocateUniqueId] └─ 分配策略: 从ID=0开始寻找最小可用位置`);
    
    console.log(`[allocateUniqueId] 📊 分配前标签配置统计:`);
    console.log(`[allocateUniqueId] ├─ 目标配置哈希: "${tagConfigHash}"`);
    console.log(`[allocateUniqueId] ├─ 相同配置用户总数: ${existingUsersQuery.data.length}`);
    console.log(`[allocateUniqueId] ├─ 已使用ID数量: ${sortedUsedIds.length}`);
    console.log(`[allocateUniqueId] └─ 可用位置数量: ${4096 - sortedUsedIds.length}`);
    
    let assignedId = 0;
    while (assignedId <= 4095) {
      if (!usedIds.has(assignedId)) {
        // 找到可用ID
        console.log(`[allocateUniqueId] ✅ 找到可用位置: ID=${assignedId} → 编码"${encodeUniqueIdForDebug(assignedId)}"`);
        break;
      }
      assignedId++;
    }

    if (assignedId > 4095) {
      console.log(`[allocateUniqueId] ❌ ID池已满，无法分配新ID`);
      console.log(`[allocateUniqueId] 📊 容量已满统计: 4096/4096 (100%)`);
      return {
        success: false,
        message: '相同标签配置的用户数量已达上限（4096）',
        totalUsersWithSameConfig: existingUsersQuery.data.length,
        usedIdsList: sortedUsedIds,
        debugInfo: {
          tagConfigHash: tagConfigHash,
          beforeAllocation: sortedUsedIds,
          afterAllocation: sortedUsedIds,
          poolExhausted: true,
          decisionType: "分配失败",
          decisionReason: "ID池容量已满"
        }
      };
    }
    
    console.log(`[allocateUniqueId] 🎯 ${userType}分配结果详情:`);
    console.log(`[allocateUniqueId] ├─ 分配ID: ${assignedId} → 编码"${encodeUniqueIdForDebug(assignedId)}"`);
    console.log(`[allocateUniqueId] ├─ 位置类型: ${assignedId === 0 ? '首位分配' : `第${assignedId + 1}个位置`}`);
    console.log(`[allocateUniqueId] └─ 分配状态: 成功`);
    
    console.log(`[allocateUniqueId] 📈 分配后容量分析:`);
    console.log(`[allocateUniqueId] ├─ 新占用位置: ${usedIds.size + 1}个`);
    console.log(`[allocateUniqueId] ├─ 剩余可用位置: ${4095 - usedIds.size}个`);
    console.log(`[allocateUniqueId] └─ ID池利用率: ${(usedIds.size + 1)}/4096 (${((usedIds.size + 1)/4096*100).toFixed(2)}%)`);

    // 5. 更新或创建用户记录
    const updateData = {
      'advancedTags.uniqueId': assignedId,
      'advancedTags.tagConfigHash': tagConfigHash,
      'advancedTags.updateTime': new Date(),
      'updateTime': new Date()
    };

    console.log(`[allocateUniqueId] 💾 开始写入数据库...`);
    
    if (currentUserRecord) {
      // 更新现有记录
      console.log(`[allocateUniqueId] 🔄 更新现有用户记录 (docId: ${currentUserRecord._id})`);
      const updateResult = await db.collection('users_adv')
        .doc(currentUserRecord._id)
        .update({
          data: updateData
        });
      
      console.log(`[allocateUniqueId] ✅ 现有用户更新成功: ID=${assignedId} → "${encodeUniqueIdForDebug(assignedId)}"`);
      console.log(`[allocateUniqueId] 📝 更新结果:`, updateResult);
    } else {
      // 创建新记录
      console.log(`[allocateUniqueId] 🆕 创建新用户记录`);
      const addResult = await db.collection('users_adv')
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
      
      console.log(`[allocateUniqueId] ✅ 新用户创建成功: ID=${assignedId} → "${encodeUniqueIdForDebug(assignedId)}"`);
      console.log(`[allocateUniqueId] 📝 创建结果:`, addResult);
    }

    // 🔧 修复：正确计算分配后的ID使用情况
    const finalUsedIds = new Set(usedIds);
    finalUsedIds.add(assignedId);
    const finalUsedIdsList = Array.from(finalUsedIds).sort((a, b) => a - b);
    
    console.log(`[allocateUniqueId] 📊 最终ID使用情况统计:`);
    console.log(`[allocateUniqueId] ├─ 分配前已使用: ${sortedUsedIds.length}个`);
    console.log(`[allocateUniqueId] ├─ 分配后已使用: ${finalUsedIdsList.length}个`);
    console.log(`[allocateUniqueId] └─ 新增使用: 1个 (ID ${assignedId})`);
    
    console.log(`[allocateUniqueId] 📋 完整ID使用列表 (${finalUsedIdsList.length}个):`, finalUsedIdsList);
    console.log(`[allocateUniqueId] 🎯 完整ID→编码映射:`, 
      finalUsedIdsList.map(id => `${id}→"${encodeUniqueIdForDebug(id)}"`).join(', '));
    
    const finalResult = {
      success: true,
      uniqueId: assignedId,
      encoded: encodeUniqueIdForDebug(assignedId),
      message: `${userType}成功分配ID: ${assignedId} → "${encodeUniqueIdForDebug(assignedId)}"`,
      totalUsersWithSameConfig: existingUsersQuery.data.length + (isConfigChanged ? 0 : 1),
      isNewAssignment: true,
      usedIdsList: finalUsedIdsList,
      debugInfo: {
        tagConfigHash: tagConfigHash,
        beforeAllocation: sortedUsedIds,
        afterAllocation: finalUsedIdsList,
        userAlreadyExists: isConfigChanged,
        configChanged: isConfigChanged,
        newUserPosition: finalUsedIdsList.indexOf(assignedId),
        decisionType: "重新分配",
        decisionReason: isConfigChanged ? 
          "标签配置哈希已变更，释放原位置重新分配" : 
          "首次分配，无现有记录"
      }
    };
    
    console.log(`[allocateUniqueId] 🎉 ${userType}分配完成！`);
    console.log(`[allocateUniqueId] 📤 返回结果摘要:`);
    console.log(`[allocateUniqueId] ├─ 分配ID: ${assignedId} → "${encodeUniqueIdForDebug(assignedId)}"`);
    console.log(`[allocateUniqueId] ├─ 配置哈希: "${tagConfigHash}"`);
    console.log(`[allocateUniqueId] ├─ 用户类型: ${userType}`);
    console.log(`[allocateUniqueId] └─ 分配状态: 成功`);
    
    return finalResult;

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
 * 将uniqueId编码为Un字符串中的2字符表示（调试用）
 * @param {number} uniqueId 0-4095的唯一ID
 * @returns {string} 2字符编码结果
 */
function encodeUniqueIdForDebug(uniqueId) {
  if (typeof uniqueId !== 'number' || uniqueId < 0 || uniqueId > 4095) {
    return 'XX'; // 无效ID
  }
  
  const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  const base = charSet.length; // 64
  
  const high = Math.floor(uniqueId / base);
  const low = uniqueId % base;
  
  return charSet[high] + charSet[low];
}

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