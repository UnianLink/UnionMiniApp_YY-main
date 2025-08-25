/**
 * BLE消息预处理器 - 简单容错处理
 * 目标：清理明显的损坏，不做复杂修复
 */

class BleMessagePreprocessor {
  /**
   * 预处理BLE接收到的JSON字符串
   * @param {string} rawMessage - 原始消息
   * @returns {string} 清理后的消息
   */
  static preprocessMessage(rawMessage) {
    if (!rawMessage || typeof rawMessage !== 'string') {
      console.warn('📱 BLE预处理：无效消息类型');
      return rawMessage;
    }

    let cleanMessage = rawMessage;
    let processSteps = [];

    // 1. 基础清理：去除首尾空白和无效字符
    const originalLength = cleanMessage.length;
    cleanMessage = cleanMessage.trim();
    if (cleanMessage.length !== originalLength) {
      processSteps.push('清理空白字符');
    }

    // 🚨 [JSON格式错乱修复] 检测和修复混合JSON消息
    const multiJsonPattern = /\{"type":"[^"]*\{"type":/g;
    if (multiJsonPattern.test(cleanMessage)) {
      console.warn('🚨 检测到JSON消息混合，尝试提取第一个完整JSON');
      processSteps.push('检测到消息混合');
      
      // 尝试提取第一个完整的JSON
      try {
        const firstBracePos = cleanMessage.indexOf('{');
        if (firstBracePos >= 0) {
          let braceCount = 0;
          let endPos = -1;
          let inString = false;
          let escaped = false;
          
          for (let i = firstBracePos; i < cleanMessage.length; i++) {
            const char = cleanMessage[i];
            
            if (escaped) {
              escaped = false;
              continue;
            }
            
            if (char === '\\' && inString) {
              escaped = true;
              continue;
            }
            
            if (char === '"' && !escaped) {
              inString = !inString;
            } else if (!inString) {
              if (char === '{') {
                braceCount++;
              } else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                  endPos = i;
                  break;
                }
              }
            }
          }
          
          if (endPos > firstBracePos) {
            const extractedJson = cleanMessage.substring(firstBracePos, endPos + 1);
            console.log('🔧 提取的JSON:', extractedJson);
            cleanMessage = extractedJson;
            processSteps.push('提取第一个完整JSON');
          }
        }
      } catch (error) {
        console.error('❌ 提取JSON失败:', error);
      }
    }

    // 2. 修复明显的双引号问题（处理v6.0.0的错误修复输出）
    if (cleanMessage.includes('"type":""')) {
      // 处理类似 {"type":""touch_list_ 的情况
      cleanMessage = cleanMessage.replace(/("type":"")([^"]*)/g, '"type":"$2"');
      processSteps.push('修复双引号');
    }

    // 3. 确保JSON以正确的括号开始和结束
    if (cleanMessage.startsWith('{') && !cleanMessage.endsWith('}')) {
      // 查找最后一个有意义的字符
      let lastMeaningfulPos = cleanMessage.length - 1;
      while (lastMeaningfulPos > 0 && 
             (cleanMessage[lastMeaningfulPos] === '\0' || 
              cleanMessage[lastMeaningfulPos] === ' ' ||
              cleanMessage[lastMeaningfulPos] === '\n' ||
              cleanMessage[lastMeaningfulPos] === '\r')) {
        lastMeaningfulPos--;
      }
      
      // 如果最后有字母或数字，可能是截断，添加结束
      const lastChar = cleanMessage[lastMeaningfulPos];
      if (/[a-zA-Z0-9_]/.test(lastChar)) {
        // 检查是否需要补全引号和大括号
        if (!cleanMessage.includes('"', cleanMessage.lastIndexOf(':'))) {
          cleanMessage = cleanMessage.substring(0, lastMeaningfulPos + 1) + '"}';
        } else {
          cleanMessage = cleanMessage.substring(0, lastMeaningfulPos + 1) + '}';
        }
        processSteps.push('补全截断结束');
      }
    }

    // 4. 日志记录处理过程
    if (processSteps.length > 0) {
      console.log(`📱 BLE预处理完成: ${processSteps.join(' → ')}`);
      console.log(`📱 处理前: ${rawMessage}`);
      console.log(`📱 处理后: ${cleanMessage}`);
    } else {
      console.log('📱 BLE消息无需预处理');
    }

    return cleanMessage;
  }

  /**
   * 智能JSON解析 - 多重策略
   * @param {string} message - 要解析的消息
   * @returns {Object|null} 解析结果或null
   */
  static safeParseJSON(message) {
    if (!message || typeof message !== 'string') {
      console.error('📱 JSON解析：无效输入');
      return null;
    }

    // 策略1：直接解析
    try {
      const result = JSON.parse(message);
      console.log('📱 JSON解析成功（直接）');
      return result;
    } catch (directError) {
      console.log('📱 直接解析失败，尝试预处理');
    }

    // 策略2：预处理后解析
    try {
      const preprocessed = this.preprocessMessage(message);
      const result = JSON.parse(preprocessed);
      console.log('📱 JSON解析成功（预处理后）');
      return result;
    } catch (preprocessError) {
      console.error('📱 JSON解析失败:', preprocessError.message);
      console.error('📱 原始消息:', message);
      return null;
    }
  }

  /**
   * 验证JSON消息的基本完整性
   * @param {string} message - 要验证的消息
   * @returns {boolean} 是否完整
   */
  static validateMessageIntegrity(message) {
    if (!message || typeof message !== 'string') {
      return false;
    }

    // 基础检查：JSON结构
    if (!message.startsWith('{') || !message.endsWith('}')) {
      console.warn('📱 消息完整性：JSON结构不完整');
      return false;
    }

    // 检查必要字段
    if (!message.includes('"type"')) {
      console.warn('📱 消息完整性：缺少type字段');
      return false;
    }

    // 简单的括号匹配检查
    let braceCount = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < message.length; i++) {
      const char = message[i];
      
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\' && inString) {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
      } else if (!inString) {
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
      }
    }

    if (braceCount !== 0 || inString) {
      console.warn('📱 消息完整性：括号不匹配或字符串未闭合');
      return false;
    }

    return true;
  }
}

module.exports = BleMessagePreprocessor;