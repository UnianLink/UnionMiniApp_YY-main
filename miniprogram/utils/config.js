// 全局配置系统
// 支持多主题文字切换和问卷配置，所有页面的文字内容和问卷配置统一管理

const Config = {
  // 当前主题（可通过切换不同主题来改变所有文字）
  currentTheme: 'union-advanced-tags',

  // 主题配置
  themes: {
    // Union数字生活主题
    'union-digital-life': {
      // 应用基础信息
      app: {
        name: 'UnionLink',
        fullName: 'Union 数字生活社群',
        description: '探索数字生活的无限可能'
      },

      // 登录页面
      login: {
        welcomeTitle: 'Union 问卷调查',
        welcomeDesc: '了解您的数字生活偏好，为您推荐更精准的展会内容',
        loginButton: '微信快速登录',
        avatar: {
          uploadTip: '点击更换头像',
          uploadSuccess: '头像上传成功',
          uploadFail: '头像上传失败',
          processingFail: '头像处理失败'
        }
      },

      // 问卷页面
      questionnaire: {
        stepFormat: '第 {current} / {total} 步',
        buttons: {
          login: '微信快速登录',
          prev: '上一步',
          next: '下一步',
          submit: '提交问卷'
        },
        messages: {
          loginRequired: '请先登录',
          validateError: '请完成当前步骤的必填项',
          submitSuccess: '问卷提交成功！正在跳转...',
          submitError: '提交失败，请重试',
          saveSuccess: '数据已保存'
        }
      },

      // 社群报告页面 (briefing)
      briefing: {
        title: '社群漫游指南',
        titleWithTheme: '{theme} 社群广场',
        subtitle: '看看你在哪个有趣的"次元"',
        subtitleWithTheme: '探索同主题下的部落成员',
        loading: '正在加载社群信息...',
        empty: '暂无社群信息',
        members: {
          joined: '{count}人已加入',
          noMembers: '暂无成员',
          sectionTitle: '社群成员',
          scrollHint: '上下滑动查看更多成员',
          viewProfile: '查看详情'
        },
        modal: {
          close: '×',
          unknownCommunity: '未知社群',
          unknownTheme: '未知主题',
          noDescription: '暂无社群描述',
          anonymousUser: '匿名用户',
          totalMembers: '共{count}人'
        }
      },

      // 社交连接页面 (connect)
      connect: {
        search: {
          placeholder: '去广场，看看大家所在的部落',
          hint: '探索当前主题下的社群分类'
        },
        loading: {
          text: '加载中...',
          error: '加载失败，请重试',
          retry: '重试',
          empty: '暂无主题',
          emptySubtext: '主题正在加载中...'
        },
        pairing: {
          title: '与你本主题智能配对的伙伴',
          tapHint: '碰',
          modalTitle: 'AI配对理由',
          unknownUser: '匿名用户'
        },
        community: {
          unknownTheme: '未知主题',
          unknownCommunity: '未知社群',
          noDescription: '暂无社群描述',
          memberCount: '共{total}人，其他成员{other}人',
          memberStatus: '社群伙伴',
          sectionTitle: '社群成员',
          featuresTitle: '主题特征',
          scrollHint: '上下滑动查看更多成员'
        },
        detailedCard: {
          basicInfo: '基本信息',
          commonTags: '共同标签',
          communityInfo: '社群信息',
          contactAction: '联系TA',
          viewMore: '查看更多'
        }
      },

      // 通用提示信息
      common: {
        confirm: '确认',
        cancel: '取消',
        close: '关闭',
        loading: '加载中...',
        error: '加载失败',
        retry: '重试',
        noData: '暂无数据',
        networkError: '网络连接失败',
        serverError: '服务器错误',
        unknownError: '未知错误',
        success: '操作成功',
        fail: '操作失败'
      }
    },

    // 职场技能主题示例
    'workplace-skills': {
      app: {
        name: 'SkillLink',
        fullName: '职场技能成长社群',
        description: '提升职场竞争力，共同成长'
      },

      login: {
        welcomeTitle: '职场技能调研',
        welcomeDesc: '了解您的职业技能现状，为您匹配成长伙伴',
        loginButton: '开始职场评估',
        avatar: {
          uploadTip: '上传职业头像',
          uploadSuccess: '头像更新成功',
          uploadFail: '头像上传失败',
          processingFail: '头像处理失败'
        }
      },

      questionnaire: {
        stepFormat: '评估进度 {current} / {total}',
        buttons: {
          login: '开始职场评估',
          prev: '返回',
          next: '继续',
          submit: '完成评估'
        },
        messages: {
          loginRequired: '请先开始评估',
          validateError: '请完成当前评估项目',
          submitSuccess: '评估完成！正在为您匹配...',
          submitError: '提交失败，请重试',
          saveSuccess: '进度已保存'
        }
      },

      briefing: {
        title: '技能成长地图',
        titleWithTheme: '{theme} 专业圈',
        subtitle: '发现你的职场成长路径',
        subtitleWithTheme: '探索同领域的专业伙伴',
        loading: '正在分析技能匹配...',
        empty: '暂无匹配结果',
        members: {
          joined: '{count}位伙伴',
          noMembers: '暂无伙伴',
          sectionTitle: '成长伙伴',
          scrollHint: '滑动查看更多伙伴',
          viewProfile: '查看资料'
        }
      },

      connect: {
        search: {
          placeholder: '探索专业圈，寻找成长伙伴',
          hint: '发现同技能领域的专业人士'
        },
        pairing: {
          title: '技能互补的成长伙伴',
          tapHint: '互动',
          modalTitle: '匹配原因',
          unknownUser: '匿名用户'
        }
      }
    },

    // Union高级标签主题
    'union-advanced-tags': {
      // 应用基础信息
      app: {
        name: 'UnionLink',
        fullName: 'Union 智能标签社群',
        description: '通过标签找到志同道合的朋友'
      },

      // 登录页面
      login: {
        welcomeTitle: 'Union 智能标签配对',
        welcomeDesc: '选择你的标签，找到志同道合的朋友',
        loginButton: '微信快速登录',
        avatar: {
          uploadTip: '点击更换头像',
          uploadSuccess: '头像上传成功',
          uploadFail: '头像上传失败',
          processingFail: '头像处理失败'
        }
      },

      // 问卷页面
      questionnaire: {
        stepFormat: '第 {current} / {total} 步',
        minTagsHint: '至少选择 {min} 个标签',
        maxTagsHint: '最多选择 {max} 个标签',
        tagCountHint: '已选择 {selected} 个标签',
        thresholdHint: '选择 {count} 个标签相同即可闪光连接',
        buttons: {
          login: '微信快速登录',
          prev: '上一步',
          next: '下一步',
          submit: '完成设置'
        },
        messages: {
          loginRequired: '请先登录',
          validateError: '请至少选择4个标签才能继续',
          submitSuccess: '标签设置成功！正在跳转...',
          submitError: '提交失败，请重试',
          saveSuccess: '数据已保存'
        }
      },

      // 社群报告页面 (briefing)
      briefing: {
        title: '社群漫游指南',
        titleWithTheme: '{theme} 社群广场',
        subtitle: '看看你在哪个有趣的"次元"',
        subtitleWithTheme: '探索同主题下的部落成员',
        loading: '正在加载社群信息...',
        empty: '暂无社群信息',
        members: {
          joined: '{count}人已加入',
          noMembers: '暂无成员',
          sectionTitle: '社群成员',
          scrollHint: '上下滑动查看更多成员',
          viewProfile: '查看详情'
        },
        modal: {
          close: '×',
          unknownCommunity: '未知社群',
          unknownTheme: '未知主题',
          noDescription: '暂无社群描述',
          anonymousUser: '匿名用户',
          totalMembers: '共{count}人'
        }
      },

      // 社交连接页面 (connect)
      connect: {
        search: {
          placeholder: '去广场，看看大家所在的部落',
          hint: '探索当前主题下的社群分类'
        },
        loading: {
          text: '加载中...',
          error: '加载失败，请重试',
          retry: '重试',
          empty: '暂无主题',
          emptySubtext: '主题正在加载中...'
        },
        pairing: {
          title: '与你本主题智能配对的伙伴',
          tapHint: '碰',
          modalTitle: 'AI配对理由',
          unknownUser: '匿名用户'
        },
        community: {
          unknownTheme: '未知主题',
          unknownCommunity: '未知社群',
          noDescription: '暂无社群描述',
          memberCount: '共{total}人，其他成员{other}人',
          memberStatus: '社群伙伴',
          sectionTitle: '社群成员',
          featuresTitle: '主题特征',
          scrollHint: '上下滑动查看更多成员'
        },
        detailedCard: {
          basicInfo: '基本信息',
          commonTags: '共同标签',
          communityInfo: '社群信息',
          contactAction: '联系TA',
          viewMore: '查看更多'
        }
      },

      // 通用提示信息
      common: {
        confirm: '确认',
        cancel: '取消',
        close: '关闭',
        loading: '加载中...',
        error: '加载失败',
        retry: '重试',
        noData: '暂无数据',
        networkError: '网络连接失败',
        serverError: '服务器错误',
        unknownError: '未知错误',
        success: '操作成功',
        fail: '操作失败'
      }
    }
  },

  // 获取当前主题的文字配置
  getCurrentThemeConfig() {
    return this.themes[this.currentTheme] || this.themes['union-digital-life'];
  },

  // 切换主题
  setTheme(themeName) {
    if (this.themes[themeName]) {
      this.currentTheme = themeName;
      return true;
    }
    return false;
  },

  // 获取指定路径的文字，支持变量替换
  getText(path, variables = {}) {
    const config = this.getCurrentThemeConfig();
    const keys = path.split('.');
    let value = config;

    // 逐层获取配置值
    for (const key of keys) {
      if (value && typeof value === 'object' && value.hasOwnProperty(key)) {
        value = value[key];
      } else {
        console.warn(`Text config not found for path: ${path}`);
        return path; // 返回路径作为后备
      }
    }

    // 如果值是字符串，进行变量替换
    if (typeof value === 'string') {
      return this.replaceVariables(value, variables);
    }

    return value;
  },

  // 变量替换功能
  replaceVariables(text, variables) {
    if (!variables || typeof variables !== 'object') {
      return text;
    }

    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return variables.hasOwnProperty(key) ? variables[key] : match;
    });
  },

  // 批量获取文字配置（用于页面初始化）
  getTexts(paths) {
    const result = {};
    for (const key in paths) {
      result[key] = this.getText(paths[key]);
    }
    return result;
  },

  // 获取所有可用主题
  getAvailableThemes() {
    return Object.keys(this.themes);
  },

  // 获取主题信息
  getThemeInfo(themeName = this.currentTheme) {
    const theme = this.themes[themeName];
    return theme ? theme.app : null;
  },

  // 问卷配置
  questionnaireConfig: {
    // 基础配置
    meta: {
      title: 'Union 问卷调查',
      description: '了解您的数字生活偏好，为您推荐更精准的展会内容',
      totalSteps: 8,
      theme: 'union-digital-life' // 主题标识
    },

    // 问卷字段定义
    fields: {
      // 第1步：基础信息
      nickname: { type: 'string', required: true, step: 1 },
      ageGroup: { type: 'string', required: true, step: 1 },
      gender: { type: 'string', required: false, step: 1 },
      city: { type: 'string', required: true, step: 1 },
      region: { type: 'array', required: true, step: 1 },
      
      // 第2步：职业信息
      profession: { type: 'string', required: true, step: 2 },
      professionOther: { type: 'string', required: false, step: 2 },
      currentStatus: { type: 'string', required: false, step: 2 },
      
      // 第3步：社交偏好
      interactionWillingness: { type: 'string', required: true, step: 3 },
      constellation: { type: 'string', required: false, step: 3 },
      constellationDate: { type: 'object', required: false, step: 3 },
      
      // 第4步：性格探索
      mbtiKnown: { type: 'string', required: true, step: 4 },
      mbtiType: { type: 'string', required: false, step: 4 },
      
      // 第5步：兴趣标签
      interestTags: { type: 'array', required: true, step: 5, minLength: 1 },
      interestOther: { type: 'string', required: false, step: 5 },
      
      // 第6步：科技关注
      techTrends: { type: 'array', required: true, step: 6, minLength: 1 },
      
      // 第7步：综合探索
      firstDevice: { type: 'string', required: true, step: 7 },
      mostImportantDevice: { type: 'string', required: true, step: 7 },
      aiAttitude: { type: 'string', required: true, step: 7 },
      learningPreference: { type: 'string', required: true, step: 7 },
      
      // 第8步：联系方式
      contactWillingness: { type: 'string', required: true, step: 8 },
      contactInfo: { type: 'string', required: false, step: 8 }
    },

    // 问卷步骤配置
    steps: [
      {
        id: 1,
        title: '基础与个人信息',
        description: '让我们先了解一些基本信息',
        questions: [
          {
            field: 'nickname',
            label: '你的昵称 / 胸牌名是？',
            type: 'input',
            placeholder: '请输入昵称',
            required: true
          },
          {
            field: 'ageGroup',
            label: '年龄段',
            type: 'radio',
            options: ['18-24', '25-34', '35-44', '45+'],
            required: true
          },
          {
            field: 'gender',
            label: '性别认同 (可选)',
            type: 'radio',
            options: ['男', '女', '非二元', '不愿透露'],
            required: false
          },
          {
            field: 'city',
            label: '当前所在城市',
            type: 'region-picker',
            placeholder: '请选择省 / 市',
            required: true
          }
        ]
      },
      {
        id: 2,
        title: '职业与状态',
        description: '了解您的职业背景',
        questions: [
          {
            field: 'profession',
            label: '职业类型',
            type: 'radio',
            options: ['IT / 科技行业', '教育 / 医疗', '学生', '创意产业', '商业 / 营销', '自由职业者', '其他'],
            required: true,
            hasOther: true,
            otherField: 'professionOther',
            otherPlaceholder: '请输入其他职业'
          },
          {
            field: 'currentStatus',
            label: '当前状态',
            type: 'radio',
            options: ['在职', '自由职业', '在校学生', '求职中', '其他'],
            required: false
          }
        ]
      },
      {
        id: 3,
        title: '社交偏好',
        description: '了解您的社交倾向',
        questions: [
          {
            field: 'interactionWillingness',
            label: '是否愿意在展会中与他人互动？',
            type: 'radio',
            options: ['愿意', '仅观展', '看情况而定'],
            required: true
          },
          {
            field: 'constellation',
            label: '你的星座是？ (可选)',
            type: 'radio',
            options: ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座', '不确定'],
            required: false,
            hasDateInput: true,
            dateField: 'constellationDate'
          }
        ]
      },
      {
        id: 4,
        title: '性格探索',
        description: '了解您的性格特征',
        questions: [
          {
            field: 'mbtiKnown',
            label: '你的 MBTI 性格类型？',
            type: 'radio',
            options: [
              { value: 'known', label: '我知道' },
              { value: 'test', label: '想测一测' },
              { value: 'skip', label: '不感兴趣' }
            ],
            required: true,
            hasInput: true,
            inputField: 'mbtiType',
            inputCondition: 'known',
            inputPlaceholder: '如 INFP',
            inputMaxLength: 4,
            hasButton: true,
            buttonCondition: 'test',
            buttonText: '跳转测试页',
            buttonAction: 'takeMbtiTest'
          }
        ]
      },
      {
        id: 5,
        title: '兴趣标签',
        description: '选择您感兴趣的主题',
        questions: [
          {
            field: 'interestTags',
            label: '你感兴趣的主题标签 (可多选)',
            type: 'checkbox',
            options: ['科技','科技2', '艺术', '旅行', '美食', '游戏', '音乐', '电影', '运动', '设计', '播客', '阅读', '二次元', '写作', '摄影', 'AI', '心理学', '人文', '健康', '其他'],
            required: true,
            minSelection: 1,
            hasOther: true,
            otherField: 'interestOther',
            otherPlaceholder: '请输入其他兴趣'
          }
        ]
      },
      {
        id: 6,
        title: '科技关注',
        description: '了解您关注的科技趋势',
        questions: [
          {
            field: 'techTrends',
            label: '你最近关注的科技趋势 (可多选)',
            type: 'checkbox',
            options: ['AI生成内容', '可穿戴设备', 'VR/AR', '智能家居', '脑机接口', '元宇宙', '智能交通', '家庭机器人', 'Web3', '新能源', '生物科技', '量子计算', '数字孪生'],
            required: true,
            minSelection: 1
          }
        ]
      },
      {
        id: 7,
        title: '综合探索',
        description: '了解您的数字设备使用习惯',
        questions: [
          {
            field: 'firstDevice',
            label: '第一台数码设备是？',
            type: 'radio',
            options: ['BB机/寻呼机', '功能手机', 'MP3/PSP/iPod', '智能手机', '智能手环/VR', '最近才接触'],
            required: true
          },
          {
            field: 'mostImportantDevice',
            label: '最离不开的设备是？',
            type: 'radio',
            options: ['手机', '平板/笔记本', '智能手表/手环', '智能音箱', '无设备主义'],
            required: true
          },
          {
            field: 'aiAttitude',
            label: '看到新 AI 产品时，你会？',
            type: 'radio',
            options: ['马上尝试', '理性观望', '让朋友先试', '拒绝使用'],
            required: true
          },
          {
            field: 'learningPreference',
            label: '学习新科技时倾向于？',
            type: 'radio',
            options: ['看视频', '读说明', '直接上手', '听人推荐'],
            required: true
          }
        ]
      },
      {
        id: 8,
        title: '联系方式',
        description: '便于线下匹配后的联系',
        questions: [
          {
            field: 'contactWillingness',
            label: '如果线下匹配成功，是否愿意展示联系方式？',
            type: 'radio',
            options: ['愿意', '不愿意'],
            required: true,
            hasInput: true,
            inputField: 'contactInfo',
            inputCondition: '愿意',
            inputPlaceholder: '如：微信号 abc123 或 手机号 138****8888',
            inputDescription: '可以是微信号、手机号、邮箱等任意联系方式'
          }
        ]
      }
    ],

    // 验证规则配置
    validation: {
      // 验证消息
      messages: {
        step1: '请完善基础信息',
        step2: '请选择职业类型',
        step3: '请选择社交偏好',
        step4: '请选择MBTI相关选项',
        step5: '请至少选择一个兴趣标签',
        step6: '请至少选择一个科技趋势',
        step7: '请完善综合探索信息',
        step8_willingness: '请选择是否愿意展示联系方式',
        step8_contact: '请输入联系方式'
      },
      
      // 特殊验证规则
      rules: {
        contactInfo: {
          requiredWhen: {
            field: 'contactWillingness',
            value: '愿意'
          }
        }
      }
    },

    // UI配置
    ui: {
      colors: {
        primary: '#667eea',
        secondary: '#764ba2',
        gradient: 'linear-gradient(135deg, #00d4ff, #7b68ee)'
      },
      buttonTexts: {
        next: '下一步',
        prev: '上一步',
        submit: '提交问卷',
        login: '微信登录开始问卷'
      }
    }
  },

  // 高级标签问卷配置（已迁移到 tagThemes.js，此处仅保留编码功能）
  // ⚠️ 重要：问卷配置已统一使用 tagThemes.js，请勿在此处修改标签和步骤配置
  advancedTagsConfig: {
    // 标签编码配置（核心功能，保留）
    encoding: {
      // 配置源选择器：'embedded'使用内置配置 | 'external'使用tagThemes.js
      configSource: 'external', // 默认使用tagThemes.js
      
      // 字符映射表：6-bit (0-63) -> 字符
      charMap: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-',
      
      // 扁平化外部配置函数
      flattenExternalConfig: function(themeConfig) {
        const allTags = [];
        if (themeConfig && themeConfig.categories) {
          console.log('[flattenExternalConfig] 🔍 处理外部主题配置:', themeConfig.name);
          console.log('[flattenExternalConfig] 📊 分类数量:', themeConfig.categories.length);
          
          themeConfig.categories.forEach(category => {
            console.log(`[flattenExternalConfig] 📂 处理分类 "${category.name}": ${category.tags.length}个标签`);
            category.tags.forEach(tag => {
              // 🎯 关键修改：直接推入标签字符串，不是对象
              allTags.push(tag);
            });
          });
        }
        
        console.log(`[flattenExternalConfig] ✅ 扁平化完成，总标签数: ${allTags.length}`);
        console.log('[flattenExternalConfig] 🏷️ 前5个标签:', allTags.slice(0, 5));
        return allTags;
      },
      
      // 编码函数：将所有用户选择的标签转换为编码字符串
      encode: function(allSelectedTags) {
        const charMap = this.charMap;
        let result = '';
        
        // 按每6个标签为一组进行编码
        for (let i = 0; i < allSelectedTags.length; i += 6) {
          const group = allSelectedTags.slice(i, i + 6);
          
          // 将6个标签的0/1状态转换为6位二进制
          let binaryStr = '';
          for (let j = 0; j < 6; j++) {
            binaryStr += (j < group.length && group[j]) ? '1' : '0';
          }
          
          // 转换为十进制并映射到字符
          const decimal = parseInt(binaryStr, 2);
          result += charMap[decimal];
        }
        
        return result;
      },
      
      // 解码函数：将编码字符串还原为标签状态数组
      decode: function(encodedString) {
        const charMap = this.charMap;
        const result = [];
        
        for (let i = 0; i < encodedString.length; i++) {
          const char = encodedString[i];
          const decimal = charMap.indexOf(char);
          
          if (decimal === -1) continue;
          
          // 转换为6位二进制
          const binaryStr = decimal.toString(2).padStart(6, '0');
          
          // 解析每一位
          for (let j = 0; j < 6; j++) {
            result.push(binaryStr[j] === '1');
          }
        }
        
        return result;
      },
      
      // 获取所有标签的扁平化列表（用于编码映射）
      getAllTagsList: function(stepsConfig) {
        // 🎯 智能配置源选择
        console.log(`[getAllTagsList] 🔍 配置源选择: ${this.configSource}`);
        
        if (this.configSource === 'external') {
          try {
            console.log('[getAllTagsList] 🚀 开始使用外部配置（tagThemes.js）');
            // 动态加载tagThemes.js配置
            const tagThemes = require('../config/tagThemes.js');
            
            // 验证tagThemes模块
            if (!tagThemes || typeof tagThemes.getCurrentTheme !== 'function') {
              throw new Error('tagThemes.js模块无效或缺少getCurrentTheme方法');
            }
            
            const currentTheme = tagThemes.getCurrentTheme();
            console.log('[getAllTagsList] 📋 获取到当前主题:', currentTheme?.name || '未知主题');
            
            // 验证主题结构
            if (!currentTheme || !currentTheme.categories || !Array.isArray(currentTheme.categories)) {
              throw new Error('主题配置结构无效：缺少categories数组');
            }
            
            const externalTags = this.flattenExternalConfig(currentTheme);
            
            if (!externalTags || externalTags.length === 0) {
              throw new Error('外部配置返回空标签列表');
            }
            
            console.log(`[getAllTagsList] ✅ 外部配置加载成功，共${externalTags.length}个标签`);
            console.log('[getAllTagsList] 🏷️ 外部标签前5个:', externalTags.slice(0, 5));
            
            // 确保不超过60个标签
            if (externalTags.length > 60) {
              console.warn(`[getAllTagsList] ⚠️ 外部标签数量${externalTags.length}超过60个限制，已截取前60个`);
              return externalTags.slice(0, 60);
            }
            
            console.log(`[getAllTagsList] 🎉 外部配置使用成功，返回${externalTags.length}个标签`);
            return externalTags;
            
          } catch (error) {
            console.error('[getAllTagsList] ❌ 外部配置加载失败，启用降级机制:', error);
            console.error('[getAllTagsList] 🔧 错误详情:', error.message);
            console.error('[getAllTagsList] 📍 错误堆栈:', error.stack);
            console.log('[getAllTagsList] 🔄 开始使用内置配置作为降级方案');
            // 继续执行内置配置逻辑
          }
        } else {
          console.log('[getAllTagsList] 📦 配置源为内置配置，直接使用steps数据');
        }
        
        // 🎯 内置配置逻辑（降级方案）
        console.log('[getAllTagsList] 📦 使用内置配置（降级方案）');
        const allTags = [];
        const steps = stepsConfig || [];
        
        console.log(`[getAllTagsList] 🔢 内置配置步骤数量: ${steps.length}`);
        
        steps.forEach((step, stepIndex) => {
          if (step.categories) {
            console.log(`[getAllTagsList] 📝 处理第${stepIndex + 1}步: "${step.title}" (${step.categories.length}个分类)`);
            
            step.categories.forEach((category, categoryIndex) => {
              if (category.tags && Array.isArray(category.tags)) {
                console.log(`[getAllTagsList] 📂 处理分类"${category.name}": ${category.tags.length}个标签`);
                category.tags.forEach((tag, tagIndex) => {
                  // 🎯 关键修改：直接推入标签字符串，与外部配置保持一致
                  allTags.push(tag);
                });
              }
            });
          }
        });
        
        console.log(`[getAllTagsList] ✅ 内置配置处理完成，总标签数: ${allTags.length}`);
        console.log('[getAllTagsList] 🏷️ 内置标签前5个:', allTags.slice(0, 5));
        
        // 🚨 验证内置配置标签数量
        if (allTags.length > 60) {
          console.error(`[getAllTagsList] ❌ 内置配置标签数量${allTags.length}超过60限制！这是系统配置错误！`);
          console.error('[getAllTagsList] 🛑 将截取前60个标签以避免编码错误');
          return allTags.slice(0, 60);
        }
        
        console.log(`[getAllTagsList] 🎉 内置配置使用成功，返回${allTags.length}个标签`);
        return allTags;
      },
      
      // 计算编码后的字符串长度（只计算前3页）
      getEncodedLength: function(stepsConfig) {
        // 只取前3页的标签进行编码
        const encodingSteps = stepsConfig.slice(0, 3);
        const totalTags = this.getAllTagsList(encodingSteps).length;
        return Math.ceil(totalTags / 6);
      },
      
      // 新格式编码：Un + 10字节标签 + 1字节阈值 + 2字节唯一ID + 1字节固定'0'
      encodeNewFormat: function(allSelectedTags, threshold, uniqueId = 0) {
        // 如果未提供threshold，使用硬件同步的默认值
        if (threshold === undefined || threshold === null) {
          try {
            const sharedConfig = require('./shared-config-loader.js');
            threshold = sharedConfig.getDefaultTagThreshold();
            console.log(`[encodeNewFormat] 🔧 使用硬件同步的默认阈值: ${threshold}`);
          } catch (error) {
            threshold = 2; // 🔧 降级默认值改为与硬件同步的2
            console.warn('[encodeNewFormat] ⚠️ 无法获取硬件配置，使用降级阈值: 2');
          }
        }
        console.log('[encodeNewFormat] 🚀 开始编码新格式Un字符串');
        console.log('[encodeNewFormat] 📊 输入参数:', {
          tagsLength: allSelectedTags.length,
          threshold: threshold,
          thresholdType: typeof threshold,
          uniqueId: uniqueId,
          uniqueIdType: typeof uniqueId,
          固定状态位: '0'
        });
        
        // 限制标签到前60个（10字节 = 60位）
        const limitedTags = allSelectedTags.slice(0, 60);
        while (limitedTags.length < 60) {
          limitedTags.push(false); // 补齐到60位
        }
        
        // 复用现有encode函数，但只编码前60个标签
        const tagEncoding = this.encode(limitedTags);
        console.log('[encodeNewFormat] 🏷️ 标签编码结果:', tagEncoding, '长度:', tagEncoding.length);
        
        // 🚨 关键修复：确保标签编码正好是10字节，但避免全A问题
        const targetTagLength = 10;
        let finalTagEncoding = '';
        
        if (tagEncoding.length >= targetTagLength) {
          // 如果编码长度足够，直接截取第2～12字节
          finalTagEncoding = tagEncoding.substring(0, targetTagLength);
        } else if (tagEncoding.length > 0) {
          // 如果编码长度不足但不为空，用'A'补齐
          finalTagEncoding = tagEncoding;
          while (finalTagEncoding.length < targetTagLength) {
            finalTagEncoding += this.charMap[0]; // 用'A'补齐
          }
        } else {
          // 🚨 特殊处理：如果编码为空（所有标签都未选中），生成默认编码而不是全A
          console.warn('[encodeNewFormat] ⚠️ 标签编码为空，可能是所有标签都未选中');
          console.warn('[encodeNewFormat] 🔧 将生成默认的最小编码，避免全A问题');
          // 生成一个有意义的默认编码：第一位设为true，其余为false
          const defaultBinary = new Array(60).fill(false);
          defaultBinary[0] = true; // 设置第一位为true，避免全零
          finalTagEncoding = this.encode(defaultBinary).substring(0, targetTagLength);
          // 如果还是不足10字节，继续补齐
          while (finalTagEncoding.length < targetTagLength) {
            finalTagEncoding += this.charMap[1]; // 用'B'补齐，避免与'A'混淆
          }
        }
        
        console.log('[encodeNewFormat] 🎯 最终标签编码:', finalTagEncoding, '长度:', finalTagEncoding.length);
        console.log('[encodeNewFormat] 🔍 编码来源:', {
          原始编码长度: tagEncoding.length,
          原始编码: tagEncoding,
          是否为空编码: tagEncoding.length === 0,
          处理方式: tagEncoding.length >= targetTagLength ? '截取' : 
                   tagEncoding.length > 0 ? '补齐' : '默认编码'
        });
        
        // 编码阈值（0-63映射到64进制字符）
        const normalizedThreshold = Math.min(Math.max(threshold, 0), 63);
        const thresholdChar = this.charMap[normalizedThreshold];
        console.log('[encodeNewFormat] 🔥 阈值编码:', {
          原始阈值: threshold,
          标准化阈值: normalizedThreshold,
          字符索引: normalizedThreshold,
          映射字符: thresholdChar,
          期望字符_阈值4: this.charMap[4]
        });
        
        // 编码2字节唯一ID（0-4095）
        const clampedId = Math.min(Math.max(uniqueId, 0), 4095);
        const id1 = Math.floor(clampedId / 64);
        const id2 = clampedId % 64;
        const uniqueIdChars = this.charMap[id1] + this.charMap[id2];
        console.log('[encodeNewFormat] 🆔 唯一ID编码:', {
          原始ID: uniqueId,
          标准化ID: clampedId,
          高位: id1,
          低位: id2,
          高位字符: this.charMap[id1],
          低位字符: this.charMap[id2],
          最终字符: uniqueIdChars
        });
        
        // 🚨 修复：状态位固定为字符'0'，不使用charMap映射
        const statusChar = '0';
        console.log('[encodeNewFormat] 📡 状态编码:', {
          固定状态位: statusChar,
          说明: '状态位恒定为字符0，不再使用动态状态'
        });
        
        // 组装最终Un字符串
        const result = `Un${finalTagEncoding}${thresholdChar}${uniqueIdChars}${statusChar}`;
        console.log('[encodeNewFormat] 🎉 最终Un字符串组装:', {
          前缀: 'Un',
          标签部分: finalTagEncoding,
          阈值部分: thresholdChar,
          ID部分: uniqueIdChars,
          状态部分: statusChar,
          完整结果: result,
          长度: result.length
        });
        
        // 验证长度
        if (result.length !== 16) {
          console.error(`[encodeNewFormat] ❌ 编码长度异常: ${result.length}, 期望16字符`);
          console.error(`[encodeNewFormat] 🔧 组成分析: Un(2) + 标签(${finalTagEncoding.length}) + 阈值(1) + ID(2) + 状态(1)`);
        } else {
          console.log('[encodeNewFormat] ✅ 编码长度正确: 16字符');
        }
        
        // 状态位固定为字符'0'，这是设计决定，不是错误
        
        return result;
      },
      
      // 新格式解码：解析Un字符串为各个组件
      decodeNewFormat: function(unString) {
        if (!unString || unString.length !== 16 || !unString.startsWith('Un')) {
          throw new Error('无效的Un字符串格式');
        }
        
        try {
          // 提取各部分
          const tagPart = unString.substring(2, 12);        // 10字节标签编码
          const thresholdChar = unString.charAt(12);        // 1字节阈值
          const uniqueIdChars = unString.substring(13, 15); // 2字节唯一ID
          const statusChar = unString.charAt(15);           // 1字节状态
          
          // 解码标签（返回60位二进制数组）
          const tagsBinary = this.decode(tagPart);
          
          // 解码阈值
          const threshold = this.charMap.indexOf(thresholdChar);
          if (threshold === -1) {
            throw new Error(`无效的阈值字符: ${thresholdChar}`);
          }
          
          // 解码唯一ID
          const id1 = this.charMap.indexOf(uniqueIdChars[0]);
          const id2 = this.charMap.indexOf(uniqueIdChars[1]);
          if (id1 === -1 || id2 === -1) {
            throw new Error(`无效的唯一ID字符: ${uniqueIdChars}`);
          }
          const uniqueId = id1 * 64 + id2;
          
          // 🚨 修复：状态位固定验证，必须是字符'0'
          if (statusChar !== '0') {
            throw new Error(`无效的状态字符: ${statusChar}，期望固定字符'0'`);
          }
          
          return {
            tags: tagsBinary,
            threshold: threshold,
            uniqueId: uniqueId,
            isNewFormat: true
          };
        } catch (error) {
          throw new Error(`解码失败: ${error.message}`);
        }
      }
    },
    
    // ✅ 【配置迁移完成】steps配置已迁移至tagThemes.js
    // 
    // 📊 迁移状态: 已完成 ✅
    // 🎯 新配置位置: /config/tagThemes.js
    // 🔄 访问方式: tagThemes.getAllStepsConfig()
    //
    // 🎉 迁移完成记录:
    //    ✅ 已替换 device.js 中的 4处直接引用
    //    ✅ 已替换 index.js 中的 3处直接引用  
    //    ✅ 已补全 tagThemes.js 中的步骤4-5配置
    //    ✅ 已删除 steps 重复配置
    //
    // 📚 开发指南: 
    //    - 新代码请使用: const tagThemes = require('../../config/tagThemes.js')
    //    - 获取步骤配置: tagThemes.getAllStepsConfig()
    //    - 获取单步配置: tagThemes.getStepConfig(stepId)
    //
    // 🔗 相关文档: /docs/config-migration-guide.md
    
    // steps配置已迁移到tagThemes.js，此处仅保留注释作为迁移记录
    // 原steps配置已迁移到tagThemes.js

    // 闪光阈值设置 - 从硬件配置同步
    threshold: (function() {
      // 动态加载硬件同步的配置
      try {
        const sharedConfig = require('./shared-config-loader.js');
        const defaultThreshold = sharedConfig.getDefaultTagThreshold();
        console.log(`[Config] ✅ 使用硬件同步的默认阈值: ${defaultThreshold}`);
        
        return {
          default: defaultThreshold, // 从硬件配置同步
          min: 1,
          max: 20,
          description: '设置多少个标签相同时开始闪光连接',
          source: 'hardware-synced'
        };
      } catch (error) {
        console.warn('[Config] ⚠️ 无法加载硬件配置，使用降级默认值 4');
        return {
          default: 2, // 🔧 降级默认值改为与硬件同步的2
          min: 1,
          max: 20,
          description: '设置多少个标签相同时开始闪光连接',
          source: 'fallback'
        };
      }
    })()
  }
};

module.exports = Config;