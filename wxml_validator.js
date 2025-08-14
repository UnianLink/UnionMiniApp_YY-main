#!/usr/bin/env node

/**
 * 专业的WXML语法验证脚本
 * 准确识别和匹配WXML标签
 */

const fs = require('fs');
const path = require('path');

class WXMLValidator {
  constructor() {
    // 微信小程序中的自闭合标签
    this.selfClosingTags = new Set([
      'input', 'slider', 'switch', 'audio', 'video', 'camera', 'live-player', 'live-pusher',
      'map', 'canvas', 'web-view', 'ad', 'official-account', 'open-data', 'navigator'
    ]);
  }

  /**
   * 解析WXML内容，提取所有标签
   */
  parseWXML(content) {
    const tags = [];
    
    // 移除注释
    const cleanContent = content.replace(/<!--[\s\S]*?-->/g, '');
    
    // 匹配所有标签
    const tagRegex = /<\/?[^>]+>/g;
    let match;
    
    while ((match = tagRegex.exec(cleanContent)) !== null) {
      const tag = match[0];
      const position = match.index;
      
      if (tag.startsWith('</')) {
        // 结束标签
        const tagName = tag.match(/<\/(\w+)/)?.[1];
        if (tagName) {
          tags.push({
            type: 'close',
            name: tagName,
            raw: tag,
            position
          });
        }
      } else if (tag.endsWith('/>')) {
        // 自闭合标签，不需要处理
        continue;
      } else {
        // 开始标签
        const tagName = tag.match(/<(\w+)/)?.[1];
        if (tagName) {
          // 检查是否为自闭合标签
          if (!this.selfClosingTags.has(tagName)) {
            tags.push({
              type: 'open',
              name: tagName,
              raw: tag,
              position
            });
          }
        }
      }
    }
    
    return tags;
  }

  /**
   * 验证标签匹配
   */
  validateTags(tags) {
    const stack = [];
    const errors = [];
    
    for (const tag of tags) {
      if (tag.type === 'open') {
        stack.push(tag);
      } else if (tag.type === 'close') {
        if (stack.length === 0) {
          errors.push(`多余的结束标签: ${tag.raw} (位置: ${tag.position})`);
        } else {
          const lastOpen = stack.pop();
          if (lastOpen.name !== tag.name) {
            errors.push(`标签不匹配: 期望 </${lastOpen.name}>，实际 ${tag.raw} (位置: ${tag.position})`);
            // 将错误的标签放回栈中，继续检查
            stack.push(lastOpen);
          }
        }
      }
    }
    
    // 检查未闭合的标签
    for (const unclosedTag of stack) {
      errors.push(`未闭合的标签: ${unclosedTag.raw} (位置: ${unclosedTag.position})`);
    }
    
    return errors;
  }

  /**
   * 验证WXML文件
   */
  validateFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const tags = this.parseWXML(content);
      const errors = this.validateTags(tags);
      
      if (errors.length === 0) {
        console.log(`✅ WXML验证通过: ${path.basename(filePath)}`);
        return true;
      } else {
        console.error(`❌ WXML错误: ${filePath}`);
        errors.forEach(error => console.error(`  - ${error}`));
        return false;
      }
    } catch (err) {
      console.error(`❌ 读取文件失败: ${filePath} - ${err.message}`);
      return false;
    }
  }

  /**
   * 统计标签数量
   */
  getTagStats(content) {
    const tags = this.parseWXML(content);
    const stats = {};
    
    for (const tag of tags) {
      if (!stats[tag.name]) {
        stats[tag.name] = { open: 0, close: 0 };
      }
      stats[tag.name][tag.type]++;
    }
    
    return stats;
  }
}

// 主函数
function main() {
  console.log('🔍 开始WXML语法验证...\n');
  
  const validator = new WXMLValidator();
  const wxmlFile = path.join(__dirname, 'miniprogram/pages/index/index.wxml');
  
  if (fs.existsSync(wxmlFile)) {
    const isValid = validator.validateFile(wxmlFile);
    
    if (!isValid) {
      console.log('\n📊 标签统计:');
      const content = fs.readFileSync(wxmlFile, 'utf-8');
      const stats = validator.getTagStats(content);
      
      for (const [tagName, counts] of Object.entries(stats)) {
        if (counts.open !== counts.close) {
          console.log(`  ${tagName}: 开始标签 ${counts.open} 个, 结束标签 ${counts.close} 个 ❌`);
        } else {
          console.log(`  ${tagName}: 开始标签 ${counts.open} 个, 结束标签 ${counts.close} 个 ✅`);
        }
      }
    }
  } else {
    console.error(`❌ 文件不存在: ${wxmlFile}`);
  }
  
  console.log('\n✨ 验证完成！');
}

if (require.main === module) {
  main();
}

module.exports = WXMLValidator;