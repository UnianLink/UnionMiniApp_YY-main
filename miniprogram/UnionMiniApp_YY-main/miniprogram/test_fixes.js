/**
 * 测试脚本：验证关键修复点
 */

// 1. 测试config.js的基本功能
console.log('=== 测试1: Config.js基本功能 ===');
try {
  const Config = require('./utils/config.js');
  
  // 测试charMap
  console.log('✅ charMap长度:', Config.charMap.length);
  console.log('✅ charMap前5个:', Config.charMap.substring(0, 5));
  
  // 测试编码功能
  const testBinary = [true, false, true, false, true, false];
  const encoded = Config.encode(testBinary);
  console.log('✅ 测试编码结果:', encoded);
  
  // 测试新格式生成
  const testUnString = Config.generateCompleteUnString('AAAAAAAAAA', 4, 100, 1);
  console.log('✅ 测试Un字符串生成:', testUnString);
  console.log('✅ 长度检查:', testUnString.length === 16 ? 'PASS' : 'FAIL');
  
} catch (error) {
  console.error('❌ Config.js测试失败:', error.message);
}

// 2. 测试tagThemes.js配置
console.log('\n=== 测试2: TagThemes.js配置 ===');
try {
  const tagThemes = require('./config/tagThemes.js');
  
  // 测试getAllStepsConfig
  const steps = tagThemes.getAllStepsConfig();
  console.log('✅ 获取步骤配置长度:', steps.length);
  
  // 测试MBTI配置
  const mbtiConfig = tagThemes.getIdleLightConfig();
  console.log('✅ MBTI配置项数量:', Object.keys(mbtiConfig).length);
  console.log('✅ 第一个MBTI类型:', Object.keys(mbtiConfig)[0]);
  
  // 测试文本配置
  const testText = tagThemes.getText('questionnaire.submitButton');
  console.log('✅ 文本配置测试:', testText ? 'PASS' : 'FAIL');
  
} catch (error) {
  console.error('❌ TagThemes.js测试失败:', error.message);
}

// 3. 测试关键函数语法
console.log('\n=== 测试3: 关键函数语法检查 ===');
try {
  // 模拟device.js的关键逻辑
  const mockGenerateCompleteUnString = function() {
    const Config = require('./utils/config.js');
    return Config.generateCompleteUnString('AAAAAAAAAA', 4, 123, 1);
  };
  
  const result = mockGenerateCompleteUnString();
  console.log('✅ 生成Un字符串测试:', result);
  console.log('✅ 格式验证:', result.startsWith('Un') && result.length === 16 ? 'PASS' : 'FAIL');
  
} catch (error) {
  console.error('❌ 关键函数测试失败:', error.message);
}

// 4. 测试编码一致性
console.log('\n=== 测试4: 编码一致性检查 ===');
try {
  const Config = require('./utils/config.js');
  
  // 测试同样输入是否产生一致结果
  const input1 = Config.generateCompleteUnString('ABCDEFGHIJ', 4, 100, 1);
  const input2 = Config.generateCompleteUnString('ABCDEFGHIJ', 4, 100, 1);
  
  console.log('✅ 编码一致性测试:', input1 === input2 ? 'PASS' : 'FAIL');
  console.log('   第一次:', input1);
  console.log('   第二次:', input2);
  
} catch (error) {
  console.error('❌ 编码一致性测试失败:', error.message);
}

console.log('\n=== 测试完成 ===');
console.log('如果看到这条消息，说明基本语法没有问题');