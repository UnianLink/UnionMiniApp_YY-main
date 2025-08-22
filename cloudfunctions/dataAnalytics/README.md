# 📊 dataAnalytics 数据分析云函数

## 🎯 功能概述

专门用于Unian项目数据分析的云函数，提供Un字符串绑定分析、用户统计、朋友关系分析等核心数据分析功能。

## 🔧 使用方法

### 1. 在微信开发者工具中部署
1. 右键点击 `cloudfunctions/dataAnalytics/` 文件夹
2. 选择 "创建并部署：云端安装依赖"
3. 等待部署完成

### 2. 调用方式

#### A. 云开发控制台测试（推荐）
1. 打开微信开发者工具 → 云开发 → 云函数
2. 找到 `dataAnalytics` → 点击"测试"
3. 输入测试参数，例如：

**查看Un字符串绑定情况：**
```json
{
  "action": "unBindings"
}
```

**获取完整数据概览：**
```json
{
  "action": "overview"
}
```

#### B. 小程序中调用
```javascript
wx.cloud.callFunction({
  name: 'dataAnalytics',
  data: {
    action: 'unBindings',
    limit: 50
  }
}).then(res => {
  console.log('数据分析结果:', res.result);
});
```

## 📋 支持的分析功能

### 🎯 核心功能：Un字符串绑定分析
```json
{
  "action": "unBindings",
  "limit": 100,
  "offset": 0
}
```
**返回内容：**
- 所有真实openID绑定的Un字符串列表
- 每条绑定的创建时间和更新时间
- 用户显示名称和社交数据统计
- 有效/无效Un格式统计

### 📊 用户统计信息
```json
{
  "action": "userStats"
}
```
**返回内容：**
- 总用户数、活跃用户数
- 有蓝牙名称的用户数
- 最近7天注册趋势
- 用户激活率统计

### 👥 朋友关系分析
```json
{
  "action": "friendsAnalysis",
  "limit": 50
}
```
**返回内容：**
- 朋友关系总数统计
- 注册用户vs未注册设备比例
- 用户朋友数分布
- 热门朋友关系详情

### 📱 碰一碰数据分析
```json
{
  "action": "touchAnalysis",
  "limit": 50
}
```
**返回内容：**
- 碰一碰事件总数
- 检测到的独特设备数
- 用户碰一碰活跃度
- 最近碰一碰记录

### 📈 注册趋势分析
```json
{
  "action": "registrationTrend"
}
```
**返回内容：**
- 过去30天注册趋势
- 每日注册数据分布
- 最近注册用户列表

### 🔍 设备活跃度分析
```json
{
  "action": "deviceActivity",
  "limit": 100
}
```
**返回内容：**
- 所有设备出现频率统计
- 注册vs未注册设备分布
- 最受欢迎的设备排行
- 设备社交网络分析

### 🔍 未注册设备分析
```json
{
  "action": "unregisteredDevices",
  "limit": 50
}
```
**返回内容：**
- 所有未注册设备列表
- 每个设备被检测到的次数
- 检测到该设备的用户列表
- 设备首次/最后出现时间

### 🌟 完整数据概览
```json
{
  "action": "overview"
}
```
**返回内容：**
- 用户统计概要
- Un字符串绑定概要
- 朋友关系概要
- 快速操作建议

## 📖 使用示例

### 查看当前所有Un字符串绑定情况
**最常用的功能，直接回答你的核心问题**

```json
{
  "action": "unBindings"
}
```

**期待返回示例：**
```json
{
  "success": true,
  "summary": {
    "totalBindings": 15,
    "validUnBindings": 12,
    "invalidBindings": 3,
    "bindingsWithFriends": 8
  },
  "bindings": [
    {
      "openid": "o1234567890abcdef",
      "bluetoothName": "Un3aZ4qWe8R2Ty",
      "displayName": "张三",
      "bindTime": "2024-08-20T10:30:00.000Z",
      "friendsCount": 5,
      "registeredFriends": 3,
      "unregisteredDevices": 2
    }
  ]
}
```

### 快速查看数据概览
```json
{
  "action": "overview"
}
```

## ⚠️ 注意事项

1. **数据量限制**：默认限制每次查询100条记录，可通过`limit`和`offset`参数分页
2. **性能考虑**：大数据量分析可能需要几秒钟处理时间
3. **权限要求**：需要数据库读取权限
4. **错误处理**：所有函数都包含完整的错误处理和日志记录

## 🚀 快速开始

1. **部署云函数**
2. **测试基础功能**：
   ```json
   {
     "action": "overview"
   }
   ```
3. **查看Un字符串绑定**：
   ```json
   {
     "action": "unBindings"
   }
   ```
4. **根据需要使用其他分析功能**

这个云函数将完全满足你对Un字符串绑定分析和其他数据分析的需求！



# JSON格式规定来源解析

  📋 格式规定的层次结构

  1. JSON基础语法规则（国际标准）

  {
    "字符串": "用双引号",
    "数字": 123,
    "布尔值": true,
    "数组": [1, 2, 3],
    "对象": {"嵌套": "对象"}
  }
  来源： https://tools.ietf.org/html/rfc7159 - JSON官方标准
  - 这是国际标准，不是我们定义的
  - 所有编程语言都遵循这个标准

  2. 微信云函数调用格式（微信规定）

  wx.cloud.callFunction({
    name: '云函数名',
    data: {
      // 这里的data对象就是JSON参数
      "参数1": "值1",
      "参数2": "值2"
    }
  })
  来源： https://developers.weixin.qq.com/miniprogram/dev/wxcloud/guide/function
  s/call.html
  - 微信规定云函数接收data对象作为参数
  - 这个data会作为event参数传给云函数

  3. 我们云函数的API设计（我们自定义）

  // 在dataAnalytics云函数中，我们设计的参数结构
  exports.main = async (event, context) => {
    const { action, limit = 100, offset = 0 } = event;
    //       ^^^^^^  ^^^^^         ^^^^^^
    //       这些是我们自己定义的参数名
  }

  🔍 具体分析每个层次

  JSON标准规则（不可改变）

  ❌ 错误写法：
  {
    name: "张三",        // 缺少引号
    age: "25",          // 数字用了引号
    active: "true",     // 布尔值用了引号
    hobbies: [1,2,3,]   // 最后多了逗号
  }

  ✅ 正确写法：
  {
    "name": "张三",
    "age": 25,
    "active": true,
    "hobbies": [1,2,3]
  }

  微信云函数规则（微信规定）

  // 微信规定的调用方式
  wx.cloud.callFunction({
    name: 'dataAnalytics',  // 云函数名（必须）
    data: {                 // 参数对象（必须叫data）
      // 内容由我们自定义
    }
  })

  我们的API设计（完全自定义）

  // 我们在云函数中定义的参数格式
  switch (action) {
    case 'unBindings':     // ← 我们定义的action值
      return await analyzeUnBindings(limit, offset);
    case 'userStats':      // ← 我们定义的action值
      return await getUserStats();
    // ...
  }