/**
 * TextEncoder/TextDecoder Polyfill for WeChat Mini Program
 * 为微信小程序提供 UTF-8 文本编码/解码功能
 */

/**
 * UTF-8 编码函数（替代 TextEncoder.encode）
 * @param {string} str - 要编码的字符串
 * @returns {Uint8Array} - UTF-8 字节数组
 */
function encodeUTF8(str) {
  if (!str || typeof str !== 'string') {
    return new Uint8Array(0);
  }

  const bytes = [];
  
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    
    // 处理代理对（Unicode 高代理和低代理）
    if (code >= 0xD800 && code <= 0xDBFF && i + 1 < str.length) {
      const high = code;
      const low = str.charCodeAt(++i);
      if (low >= 0xDC00 && low <= 0xDFFF) {
        code = 0x10000 + ((high & 0x3FF) << 10) + (low & 0x3FF);
      }
    }
    
    if (code < 0x80) {
      // ASCII 字符 (0-127)
      bytes.push(code);
    } else if (code < 0x800) {
      // 2 字节 UTF-8 (128-2047)
      bytes.push(0xC0 | (code >> 6));
      bytes.push(0x80 | (code & 0x3F));
    } else if (code < 0x10000) {
      // 3 字节 UTF-8 (2048-65535)
      bytes.push(0xE0 | (code >> 12));
      bytes.push(0x80 | ((code >> 6) & 0x3F));
      bytes.push(0x80 | (code & 0x3F));
    } else {
      // 4 字节 UTF-8 (65536-1114111)
      bytes.push(0xF0 | (code >> 18));
      bytes.push(0x80 | ((code >> 12) & 0x3F));
      bytes.push(0x80 | ((code >> 6) & 0x3F));
      bytes.push(0x80 | (code & 0x3F));
    }
  }
  
  return new Uint8Array(bytes);
}

/**
 * UTF-8 解码函数（替代 TextDecoder.decode）
 * @param {Uint8Array|ArrayBuffer} bytes - UTF-8 字节数组
 * @returns {string} - 解码后的字符串
 */
function decodeUTF8(bytes) {
  if (!bytes) {
    return '';
  }
  
  // 处理 ArrayBuffer
  if (bytes instanceof ArrayBuffer) {
    bytes = new Uint8Array(bytes);
  }
  
  // 处理普通数组
  if (Array.isArray(bytes)) {
    bytes = new Uint8Array(bytes);
  }
  
  let result = '';
  let i = 0;
  
  while (i < bytes.length) {
    let byte1 = bytes[i++];
    
    if (byte1 < 0x80) {
      // 1 字节字符 (ASCII)
      result += String.fromCharCode(byte1);
    } else if ((byte1 & 0xE0) === 0xC0) {
      // 2 字节字符
      if (i >= bytes.length) break;
      let byte2 = bytes[i++];
      let code = ((byte1 & 0x1F) << 6) | (byte2 & 0x3F);
      result += String.fromCharCode(code);
    } else if ((byte1 & 0xF0) === 0xE0) {
      // 3 字节字符
      if (i + 1 >= bytes.length) break;
      let byte2 = bytes[i++];
      let byte3 = bytes[i++];
      let code = ((byte1 & 0x0F) << 12) | ((byte2 & 0x3F) << 6) | (byte3 & 0x3F);
      result += String.fromCharCode(code);
    } else if ((byte1 & 0xF8) === 0xF0) {
      // 4 字节字符
      if (i + 2 >= bytes.length) break;
      let byte2 = bytes[i++];
      let byte3 = bytes[i++];
      let byte4 = bytes[i++];
      let code = ((byte1 & 0x07) << 18) | ((byte2 & 0x3F) << 12) | ((byte3 & 0x3F) << 6) | (byte4 & 0x3F);
      
      // 处理代理对
      if (code > 0xFFFF) {
        code -= 0x10000;
        let high = 0xD800 + (code >> 10);
        let low = 0xDC00 + (code & 0x3FF);
        result += String.fromCharCode(high, low);
      } else {
        result += String.fromCharCode(code);
      }
    } else {
      // 无效字节，跳过
      continue;
    }
  }
  
  return result;
}

/**
 * 兼容性 TextEncoder 类
 */
class TextEncoderPolyfill {
  encode(str) {
    return encodeUTF8(str);
  }
}

/**
 * 兼容性 TextDecoder 类
 */
class TextDecoderPolyfill {
  decode(bytes) {
    return decodeUTF8(bytes);
  }
}

/**
 * 自动安装 polyfill（如果环境中不存在）
 */
function installPolyfill() {
  if (typeof TextEncoder === 'undefined') {
    global.TextEncoder = TextEncoderPolyfill;
  }
  if (typeof TextDecoder === 'undefined') {
    global.TextDecoder = TextDecoderPolyfill;
  }
}

module.exports = {
  encodeUTF8,
  decodeUTF8,
  TextEncoderPolyfill,
  TextDecoderPolyfill,
  installPolyfill
};