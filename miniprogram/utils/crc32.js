/**
 * CRC32校验工具
 * 用于BLE数据传输的完整性验证
 */

// 引入文本编码 polyfill
const { encodeUTF8 } = require('./text-encoding-polyfill');

// CRC32查找表
const CRC32_TABLE = (() => {
  const table = new Array(256);
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xEDB88320;
      } else {
        crc = crc >>> 1;
      }
    }
    table[i] = crc;
  }
  return table;
})();

/**
 * 计算字符串的CRC32校验码
 * @param {string} str - 要计算校验码的字符串
 * @returns {string} - 8位十六进制校验码
 */
function calculateCRC32(str) {
  if (!str || typeof str !== 'string') {
    return '00000000';
  }

  // 转换为UTF-8字节数组
  const utf8Bytes = encodeUTF8(str);
  
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < utf8Bytes.length; i++) {
    const byte = utf8Bytes[i];
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xFF];
  }
  
  // 取反并转换为8位十六进制
  crc = (crc ^ 0xFFFFFFFF) >>> 0;
  return crc.toString(16).padStart(8, '0').toUpperCase();
}

/**
 * 验证CRC32校验码
 * @param {string} str - 原始字符串
 * @param {string} expectedCRC - 期望的CRC32校验码
 * @returns {boolean} - 校验是否通过
 */
function verifyCRC32(str, expectedCRC) {
  const actualCRC = calculateCRC32(str);
  return actualCRC === expectedCRC.toUpperCase();
}

/**
 * 生成消息ID（用于重传识别）
 * @returns {string} - 唯一消息ID
 */
function generateMessageId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `msg_${timestamp}_${random}`;
}

/**
 * 验证UTF-8字符串的完整性
 * @param {string} str - 要验证的字符串
 * @returns {object} - 验证结果
 */
function validateUTF8String(str) {
  if (!str || typeof str !== 'string') {
    return { valid: false, reason: 'Empty or non-string input' };
  }

  // 检查控制字符
  const hasControlChars = /[\x00-\x1F\x7F-\x9F]/.test(str);
  if (hasControlChars) {
    return { valid: false, reason: 'Contains control characters' };
  }

  // 检查null字符
  const hasNullChars = str.includes('\u0000');
  if (hasNullChars) {
    return { valid: false, reason: 'Contains null characters' };
  }

  // 验证JSON格式（如果看起来像JSON）
  if (str.trim().startsWith('{') && str.trim().endsWith('}')) {
    try {
      JSON.parse(str);
    } catch (e) {
      return { valid: false, reason: 'Invalid JSON format' };
    }
  }

  return { valid: true };
}

/**
 * 清理字符串中的无效字符
 * @param {string} str - 要清理的字符串
 * @returns {string} - 清理后的字符串
 */
function sanitizeString(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // 移除控制字符
    .replace(/\u0000/g, '')              // 移除null字符
    .trim();
}

module.exports = {
  calculateCRC32,
  verifyCRC32,
  generateMessageId,
  validateUTF8String,
  sanitizeString
};