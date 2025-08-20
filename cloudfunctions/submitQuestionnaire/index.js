// 云函数：提交问卷数据到数据库，支持头像上传
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 获取默认标签阈值
 * 从硬件配置同步的默认值
 */
function getDefaultTagThreshold() {
  // 🔧 与硬件配置同步：DEFAULT_TAG_THRESHOLD = 2
  // 这个值应与硬件端 common.h 中的 DEFAULT_TAG_THRESHOLD 保持一致
  return 2;
}

/**
 * 提交问卷数据到数据库
 * 支持原有问卷数据和新的高级标签数据
 */
exports.main = async (event, context) => {
  console.log('[submitQuestionnaire] 接收到提交请求', JSON.stringify(event, null, 2));
  
  // 优先从前端传递的数据中获取openid，云函数上下文作为备用
  let openid = event.openid;
  
  if (!openid) {
    console.log('[submitQuestionnaire] 前端未提供openid，尝试从云函数上下文获取');
    const wxContext = cloud.getWXContext();
    openid = wxContext.OPENID;
    console.log('[submitQuestionnaire] 云函数上下文获取的openid:', openid);
  } else {
    console.log('[submitQuestionnaire] 使用前端提供的openid:', openid);
  }
  
  if (!openid) {
    console.error('[submitQuestionnaire] 获取openid失败');
    console.error('[submitQuestionnaire] event.openid:', event.openid);
    console.error('[submitQuestionnaire] wxContext:', cloud.getWXContext());
    return {
      success: false,
      message: '用户身份验证失败，请重新登录'
    };
  }

  console.log('[submitQuestionnaire] 最终使用的openid:', openid);

  try {
    // 检查是否为高级标签数据
    if (event.advancedTags) {
      console.log('[submitQuestionnaire] 检测到高级标签数据，调用handleAdvancedTags');
      // 处理高级标签数据 - 保存到 users_adv 集合
      return await handleAdvancedTags(event, openid);
    } else {
      console.log('[submitQuestionnaire] 检测到原有问卷数据，调用handleOriginalQuestionnaire');
      // 处理原有问卷数据 - 保存到 users_bar 集合
      return await handleOriginalQuestionnaire(event, openid);
    }
  } catch (error) {
    console.error('[submitQuestionnaire] 提交失败:', error);
    return {
      success: false,
      message: '数据提交失败，请重试',
      error: error.message,
      stack: error.stack
    };
  }
};

/**
 * 处理高级标签数据
 */
async function handleAdvancedTags(event, openid) {
  console.log('[submitQuestionnaire] 处理高级标签数据');
  console.log('[handleAdvancedTags] 接收数据:', JSON.stringify(event, null, 2));
  
  const { userInfo, advancedTags, newFormat } = event;
  
  // 验证必填数据
  if (!advancedTags.displayName || advancedTags.displayName.trim() === '') {
    console.error('[handleAdvancedTags] 显示名称为空');
    return {
      success: false,
      message: '显示名称不能为空'
    };
  }

  // 计算总标签数量
  const totalTags = (advancedTags.professionalTags || []).length +
                   (advancedTags.interestTags || []).length +
                   (advancedTags.personalityTags || []).length +
                   (advancedTags.quirkyTags || []).length;

  console.log('[handleAdvancedTags] 总标签数量:', totalTags);

  if (totalTags < 4) {
    console.error('[handleAdvancedTags] 标签数量不足:', totalTags);
    return {
      success: false,
      message: '至少需要选择4个标签'
    };
  }

  // 验证编码数据
  const encodedTags = advancedTags.encodedTags;
  console.log('[handleAdvancedTags] 接收到的编码:', encodedTags, '长度:', encodedTags ? encodedTags.length : 0);
  
  // 处理新格式和旧格式的编码长度验证
  let expectedLength, bluetoothName;
  
  if (newFormat && newFormat.enabled) {
    // 新格式：Un + 10字节编码 + 1字节阈值 + 2字节唯一ID + 1字节状态码 = 16字符
    expectedLength = 14; // 除去"Un"前缀，剩余14字符
    console.log('[handleAdvancedTags] 🆕 检测到新格式数据');
    
    // 验证新格式特有字段
    const threshold = newFormat.threshold || getDefaultTagThreshold();
    const uniqueId = newFormat.uniqueId || 0;
    const status = newFormat.status || '0';
    
    if (threshold < 0 || threshold > 63) {
      return {
        success: false,
        message: '阈值必须在0-63范围内'
      };
    }
    
    if (uniqueId < 0 || uniqueId > 4095) {
      return {
        success: false,
        message: '唯一ID必须在0-4095范围内'
      };
    }
    
    if (status !== '0' && status !== '1') {
      return {
        success: false,
        message: '状态码必须是0或1'
      };
    }
    
    bluetoothName = `Un${encodedTags}`;
    console.log('[handleAdvancedTags] 新格式蓝牙名称:', bluetoothName);
  } else {
    // 旧格式：前3页编码应该是14字符左右
    expectedLength = 14;
    bluetoothName = encodedTags ? `Un${encodedTags}` : '';
    console.log('[handleAdvancedTags] 🔄 使用旧格式兼容模式');
  }
  
  if (encodedTags && (encodedTags.length < 10 || encodedTags.length > 25)) {
    console.warn('[handleAdvancedTags] 编码长度异常:', encodedTags.length, '期望10-25字符范围');
  } else if (encodedTags) {
    console.log('[handleAdvancedTags] ✅ 编码长度正常:', encodedTags.length, '字符');
  }

  // 构建保存数据
  const saveData = {
    openid: openid,
    userInfo: userInfo,
    advancedTags: {
      ...advancedTags,
      totalTags: totalTags,
      updateTime: new Date()
    },
    // 编码数据存储在专门的字段中，便于硬件访问
    encodedTags: encodedTags || '',
    // 蓝牙名称（旧格式或新格式）
    bluetoothName: bluetoothName,
    binaryArray: advancedTags.binaryArray || [],
    allTagsList: advancedTags.allTagsList || [],
    selectedTags: advancedTags.selectedTags || [],
    // 新格式特有字段
    formatVersion: newFormat && newFormat.enabled ? 'v2.0' : 'v1.0',
    newFormatData: newFormat && newFormat.enabled ? {
      threshold: newFormat.threshold || getDefaultTagThreshold(),
      uniqueId: newFormat.uniqueId || 0,
      status: newFormat.status || '0',
      tagConfigHash: newFormat.tagConfigHash || '',
      generatedAt: new Date()
    } : null,
    // 添加编码元数据
    encodingMeta: {
      version: newFormat && newFormat.enabled ? 'v2.0-new-format' : 'v2.0-legacy',
      algorithm: '6bit-flat-binary',
      charSet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-',
      totalTagsCount: (advancedTags.allTagsList || []).length,
      selectedTagsCount: (advancedTags.selectedTags || []).length,
      encodingLength: encodedTags ? encodedTags.length : 0,
      expectedLength: expectedLength,
      isNewFormat: newFormat && newFormat.enabled,
      generatedAt: new Date()
    },
    createTime: new Date(),
    updateTime: new Date()
  };

  console.log('[handleAdvancedTags] 准备保存数据:', JSON.stringify(saveData, null, 2));
  console.log('[handleAdvancedTags] 编码信息:', {
    encodedTags: encodedTags,
    length: encodedTags ? encodedTags.length : 0,
    selectedTagsCount: (advancedTags.selectedTags || []).length,
    totalTagsCount: (advancedTags.allTagsList || []).length
  });

  const collection = db.collection('users_adv');

  try {
    console.log('[handleAdvancedTags] 开始查询现有数据...');
    
    // 先测试集合访问权限
    try {
      await collection.count();
      console.log('[handleAdvancedTags] users_adv集合访问正常');
    } catch (permissionError) {
      console.error('[handleAdvancedTags] users_adv集合访问失败:', permissionError);
      throw new Error(`数据库访问权限错误: ${permissionError.message}`);
    }
    
    // 查询是否已存在
    const queryResult = await collection.where({
      openid: openid
    }).get();

    console.log('[handleAdvancedTags] 查询结果:', queryResult.data.length, '条记录');

    if (queryResult.data.length > 0) {
      // 更新现有数据
      const docId = queryResult.data[0]._id;
      console.log('[handleAdvancedTags] 更新现有数据, docId:', docId);
      
      const updateResult = await collection.doc(docId).update({
        data: {
          userInfo: saveData.userInfo,
          advancedTags: saveData.advancedTags,
          encodedTags: saveData.encodedTags,
          bluetoothName: saveData.bluetoothName,
          binaryArray: saveData.binaryArray,
          allTagsList: saveData.allTagsList,
          selectedTags: saveData.selectedTags,
          formatVersion: saveData.formatVersion,
          newFormatData: saveData.newFormatData,
          encodingMeta: saveData.encodingMeta,
          updateTime: saveData.updateTime
        }
      });
      
      console.log('[handleAdvancedTags] 📝 更新结果:', updateResult);
      console.log('[submitQuestionnaire] ✅ 高级标签数据更新成功');
      console.log('[submitQuestionnaire] 🔐 数据库写入确认:', {
        操作类型: '更新现有用户',
        用户openid: openid.substring(0, 8) + '...',
        docId: docId,
        蓝牙名称: bluetoothName,
        uniqueId: newFormat && newFormat.enabled ? newFormat.uniqueId : null,
        编码长度: encodedTags ? encodedTags.length : 0,
        格式版本: saveData.formatVersion
      });
    } else {
      // 创建新数据
      console.log('[handleAdvancedTags] 创建新数据记录');
      
      const addResult = await collection.add({
        data: saveData
      });
      
      console.log('[handleAdvancedTags] 📝 创建结果:', addResult);
      console.log('[submitQuestionnaire] ✅ 高级标签数据创建成功');
      console.log('[submitQuestionnaire] 🔐 数据库写入确认:', {
        操作类型: '创建新用户',
        用户openid: openid.substring(0, 8) + '...',
        新docId: addResult._id,
        蓝牙名称: bluetoothName,
        uniqueId: newFormat && newFormat.enabled ? newFormat.uniqueId : null,
        编码长度: encodedTags ? encodedTags.length : 0,
        格式版本: saveData.formatVersion
      });
    }

    const result = {
      success: true,
      message: '标签设置成功',
      data: {
        totalTags: totalTags,
        threshold: newFormat && newFormat.enabled ? newFormat.threshold : (advancedTags.threshold || getDefaultTagThreshold()),
        encodedTags: encodedTags,
        encodingLength: encodedTags ? encodedTags.length : 0,
        bluetoothName: bluetoothName,
        formatVersion: saveData.formatVersion,
        isNewFormat: newFormat && newFormat.enabled,
        uniqueId: newFormat && newFormat.enabled ? newFormat.uniqueId : null,
        status: newFormat && newFormat.enabled ? newFormat.status : null
      }
    };
    
    console.log('[handleAdvancedTags] 返回成功结果:', result);
    return result;
  } catch (dbError) {
    console.error('[handleAdvancedTags] 数据库操作失败:', dbError);
    console.error('[handleAdvancedTags] 错误详情:', dbError.message);
    console.error('[handleAdvancedTags] 错误堆栈:', dbError.stack);
    throw dbError;
  }
}

/**
 * 处理原有问卷数据（兼容）
 */
async function handleOriginalQuestionnaire(event, openid) {
  console.log('[submitQuestionnaire] 处理原有问卷数据');
  
  const { userInfo, questionnaire } = event;

  // 基本验证
  if (!questionnaire.nickname || questionnaire.nickname.trim() === '') {
    return {
      success: false,
      message: '昵称不能为空'
    };
  }

  // 构建保存数据
  const saveData = {
    openid: openid,
    userInfo: userInfo,
    questionnaire: {
      ...questionnaire,
      updateTime: new Date()
    },
    createTime: new Date(),
    updateTime: new Date()
  };

  const collection = db.collection('users_bar');

  try {
    // 查询是否已存在
    const queryResult = await collection.where({
      openid: openid
    }).get();

    if (queryResult.data.length > 0) {
      // 更新现有数据
      const docId = queryResult.data[0]._id;
      await collection.doc(docId).update({
        data: {
          userInfo: saveData.userInfo,
          questionnaire: saveData.questionnaire,
          updateTime: saveData.updateTime
        }
      });
      
      console.log('[submitQuestionnaire] 原有问卷数据更新成功');
    } else {
      // 创建新数据
      await collection.add({
        data: saveData
      });
      
      console.log('[submitQuestionnaire] 原有问卷数据创建成功');
    }

    return {
      success: true,
      message: '问卷提交成功'
    };
  } catch (dbError) {
    console.error('[submitQuestionnaire] 数据库操作失败:', dbError);
    throw dbError;
  }
} 