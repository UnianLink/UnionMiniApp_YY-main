#!/usr/bin/env node

/**
 * 简单的微信小程序语法验证脚本
 */

const fs = require('fs');
const path = require('path');

// 验证CSS文件括号匹配
function validateCSS(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let openBraces = 0;
  let lineNum = 0;
  const lines = content.split('\n');
  
  for (const line of lines) {
    lineNum++;
    openBraces += (line.match(/{/g) || []).length;
    openBraces -= (line.match(/}/g) || []).length;
    
    if (openBraces < 0) {
      console.error(`❌ CSS错误: ${filePath}:${lineNum} - 多余的闭括号`);
      return false;
    }
  }
  
  if (openBraces !== 0) {
    console.error(`❌ CSS错误: ${filePath} - 括号不匹配 (差值: ${openBraces})`);
    return false;
  }
  
  console.log(`✅ CSS验证通过: ${path.basename(filePath)}`);
  return true;
}

// 验证WXML文件标签匹配
function validateWXML(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const tagStack = [];
  const selfClosingTags = ['input'];
  
  // 简单的标签匹配检查
  const openTags = content.match(/<(\w+)[^>]*>/g) || [];
  const closeTags = content.match(/<\/(\w+)>/g) || [];
  
  let errors = [];
  
  for (const tag of openTags) {
    const tagName = tag.match(/<(\w+)/)[1];
    if (!selfClosingTags.includes(tagName) && !tag.includes('/>')) {
      tagStack.push(tagName);
    }
  }
  
  for (const tag of closeTags) {
    const tagName = tag.match(/<\/(\w+)/)[1];
    const lastTag = tagStack.pop();
    if (lastTag !== tagName) {
      errors.push(`标签不匹配: 期望</${lastTag}>，实际</${tagName}>`);
    }
  }
  
  if (tagStack.length > 0) {
    errors.push(`未闭合的标签: ${tagStack.join(', ')}`);
  }
  
  if (errors.length > 0) {
    console.error(`❌ WXML错误: ${filePath}`);
    errors.forEach(err => console.error(`  - ${err}`));
    return false;
  }
  
  console.log(`✅ WXML验证通过: ${path.basename(filePath)}`);
  return true;
}

// 主函数
function main() {
  console.log('🔍 开始验证小程序文件语法...\n');
  
  const indexDir = path.join(__dirname, 'miniprogram/pages/index');
  
  // 验证CSS文件
  const wxssFile = path.join(indexDir, 'index.wxss');
  if (fs.existsSync(wxssFile)) {
    validateCSS(wxssFile);
  }
  
  // 验证WXML文件
  const wxmlFile = path.join(indexDir, 'index.wxml');
  if (fs.existsSync(wxmlFile)) {
    validateWXML(wxmlFile);
  }
  
  console.log('\n✨ 验证完成！');
}

main();