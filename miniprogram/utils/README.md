# miniprogram/utils 目录

此目录包含微信小程序的核心工具和统一配置文件，实现了完整的配置化架构，支持多主题切换和全局文字管理。

## 文件说明

- **config.js**: 统一的全局配置文件，整合了文字配置和问卷配置，是项目配置化架构的核心文件。

## 配置化架构特性

### 🎨 多主题支持
- **主题切换**: 通过修改 `currentTheme` 字段实现一键主题切换
- **主题隔离**: 每个主题拥有独立的文字配置和UI样式
- **预设主题**: 
  - `union-digital-life`: Union数字生活社群主题（默认）
  - `workplace-skills`: 职场技能成长社群主题

### 🔧 统一配置管理
- **文字配置**: 所有页面的文字内容统一管理，支持变量替换
- **问卷配置**: 完整的问卷步骤、字段、验证规则配置
- **UI配置**: 应用名称、描述、按钮文字等界面元素配置

### 📱 页面级配置
- **登录页面**: 欢迎文字、按钮文字、头像上传提示等
- **问卷页面**: 步骤格式、按钮文字、验证消息等
- **社群报告页面**: 标题、成员统计、弹窗文字等
- **社交连接页面**: 搜索提示、加载状态、配对文字等

## 核心API

### 配置获取
```javascript
const Config = require('./config.js');

// 获取当前主题的完整配置
const themeConfig = Config.getCurrentThemeConfig();

// 获取特定路径的文字（支持变量替换）
const text = Config.getText('briefing.members.joined', { count: 5 });
// 结果: "5人已加入"

// 批量获取多个文字配置
const texts = Config.getTexts([
  'login.welcomeTitle',
  'questionnaire.buttons.next',
  'common.loading'
]);
```

### 主题管理
```javascript
// 切换主题
Config.setTheme('workplace-skills');

// 获取可用主题列表
const themes = Config.getAvailableThemes();

// 获取主题信息
const themeInfo = Config.getThemeInfo('union-digital-life');
```

### 问卷配置
```javascript
// 获取问卷配置
const questionnaireConfig = Config.questionnaireConfig;

// 获取特定步骤配置
const step1 = questionnaireConfig.steps[0];

// 获取字段验证规则
const fields = questionnaireConfig.fields;
```

## 变量替换功能

配置支持动态变量替换，使用 `{变量名}` 格式：

```javascript
// 配置示例
briefing: {
  members: {
    joined: '{count}人已加入',
    totalMembers: '共{count}人'
  }
}

// 使用示例
Config.getText('briefing.members.joined', { count: 10 });
// 结果: "10人已加入"
```

## 配置文件结构

### 主配置对象
```javascript
const Config = {
  currentTheme: 'union-digital-life',
  themes: {
    'theme-name': {
      app: { /* 应用基础信息 */ },
      login: { /* 登录页面配置 */ },
      questionnaire: { /* 问卷页面配置 */ },
      briefing: { /* 社群报告页面配置 */ },
      connect: { /* 社交连接页面配置 */ },
      common: { /* 通用文字配置 */ }
    }
  },
  questionnaireConfig: { /* 问卷配置 */ }
}
```

### 问卷配置结构
```javascript
questionnaireConfig: {
  meta: {
    title: '问卷标题',
    description: '问卷描述',
    totalSteps: 8,
    theme: 'union-digital-life'
  },
  fields: { /* 字段定义和验证规则 */ },
  steps: [ /* 步骤配置 */ ],
  validation: { /* 验证配置 */ }
}
```

## 页面集成示例

### 页面中使用配置
```javascript
// pages/index/index.js
const Config = require('../../utils/config.js');

Page({
  data: {
    texts: {}, // 存储页面文字配置
    questionnaireConfig: Config.questionnaireConfig
  },

  onLoad() {
    // 加载页面文字配置
    this.loadTexts();
  },

  loadTexts() {
    const texts = Config.getTexts([
      'login.welcomeTitle',
      'questionnaire.buttons.next',
      'questionnaire.messages.loginRequired'
    ]);
    this.setData({ texts });
  }
});
```

### WXML中使用文字配置
```xml
<!-- 使用配置的文字 -->
<text>{{texts.welcomeTitle}}</text>
<button>{{texts.nextButton}}</button>

<!-- 使用变量替换 -->
<text>{{texts.stepFormat}}</text> <!-- 在JS中处理变量替换 -->
```

## 开发指南

### 添加新主题
1. 在 `themes` 对象中添加新主题配置
2. 复制现有主题结构并修改文字内容
3. 更新 `currentTheme` 或通过API切换

### 添加新页面配置
1. 在主题配置中添加新页面的配置对象
2. 定义页面所需的所有文字内容
3. 在页面中引入并使用配置

### 扩展问卷配置
1. 在 `questionnaireConfig.fields` 中定义新字段
2. 在 `questionnaireConfig.steps` 中添加新问题
3. 更新 `meta.totalSteps` 数量

## 最佳实践

- **统一管理**: 所有文字内容都应该通过配置文件管理，避免硬编码
- **主题一致性**: 确保所有主题的配置结构完全一致
- **变量命名**: 使用清晰的变量名，便于理解和维护
- **缓存优化**: 在页面中缓存常用的文字配置，避免重复调用
- **错误处理**: 为配置获取添加默认值和错误处理逻辑

---

**更新日期**: 2025年8月  
**版本**: v2.0.0 - 统一配置架构  
**重要变更**: 整合文字配置和问卷配置，实现完全配置化的多主题架构 