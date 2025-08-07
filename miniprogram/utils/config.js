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

  // 高级标签问卷配置
  advancedTagsConfig: {
    meta: {
      theme: 'union-advanced-tags',
      totalSteps: 5,
      minTotalTags: 4, // 至少选择4个标签
      maxTotalTags: -1 // 无上限
    },

    // 标签编码配置
    encoding: {
      // 字符映射表：6-bit (0-63) -> 字符
      charMap: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-',
      
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
        const allTags = [];
        
        // 遍历所有步骤和分类，收集所有标签
        stepsConfig.forEach(step => {
          if (step.categories) {
            step.categories.forEach(category => {
              category.tags.forEach(tag => {
                allTags.push({
                  tag: tag,
                  category: category.name,
                  step: step.id
                });
              });
            });
          }
        });
        
        return allTags;
      },
      
      // 计算编码后的字符串长度（只计算前3页）
      getEncodedLength: function(stepsConfig) {
        // 只取前3页的标签进行编码
        const encodingSteps = stepsConfig.slice(0, 3);
        const totalTags = this.getAllTagsList(encodingSteps).length;
        return Math.ceil(totalTags / 6);
      }
    },

    steps: [
      {
        id: 1,
        title: '专业领域 Tags',
        subtitle: '你熟悉或工作的方向',
        description: '选择你擅长或正在从事的专业领域',
        minTags: 1,
        maxTags: -1,
        categories: [
          {
            name: '软件与算法',
            tags: [
              '前端开发', '后端开发', '移动端开发', 'Web3 / 区块链',
              '人工智能', '数据科学', '算法竞赛', '大模型 / AIGC', '网络安全 / 渗透'
            ]
          },
          {
            name: '硬件与工程',
            tags: [
              '嵌入式开发/单片机', '电路设计', '机器人', '3D建模 / 打印',
              '工业自动化', '材料工程', '可穿戴设备', '通信 / 射频'
            ]
          },
          {
            name: '设计与体验',
            tags: [
              '平面设计', 'UI/UX设计', '产品/工业设计', '动效设计',
              '建筑/空间/展陈设计', '交互艺术', '游戏设计', '服务设计'
            ]
          },
          {
            name: '产品与商业',
            tags: [
              '产品经理', '项目管理', '品牌与增长', '用研、市场分析',
              '公共关系', '一级市场投资', '二级市场投资'
            ]
          },
          {
            name: '人文与跨界',
            tags: [
              '心理学', '教育学', '社会学', '法律 / 知识产权',
              '艺术策展', '哲学 & 思辨', '科学传播', '创业经验者'
            ]
          }
        ]
      },
      {
        id: 2,
        title: '兴趣爱好 Tags',
        subtitle: '你平时喜欢做什么',
        description: '选择你真正喜欢和享受的活动',
        minTags: 1,
        maxTags: -1,
        categories: [
          {
            name: '创作与表达',
            tags: [
              '摄影&剪辑', '绘画', '写作', '播客', '乐器与歌唱',
              '表演&舞台', '模型佬', '脑洞设定狂'
            ]
          },
          {
            name: '游戏',
            tags: [
              '主机游戏', '独立游戏', '二次元', '剧本杀',
              '桌游 / 卡牌', '音游'
            ]
          },
          {
            name: '身体与生活',
            tags: [
              '烹饪 / 美食', '宠物控', '植物 / 园艺', '跑步', '徒步',
              '健身', '瑜伽 / 冥想', '手工 / DIY', '穿搭 / 美学', '收纳 / 整理'
            ]
          }
        ]
      },
      {
        id: 3,
        title: '性格 / MBTI Tags',
        subtitle: '你是什么样的人',
        description: '选择最符合你性格特征的MBTI类型',
        minTags: 1,
        maxTags: 1, // 单选
        categories: [
          {
            name: 'MBTI 维度',
            note: '请选择一个最符合你的MBTI类型',
            tags: [
              'INTJ：战略家', 'INTP：逻辑学者', 'INFJ：提灯者', 'INFP：理想主义者',
              'ISTJ：检察官', 'ISTP：工匠', 'ISFJ：守护者', 'ISFP：艺术家',
              'ENTJ：指挥官', 'ENTP：辩论者', 'ENFJ：主人公', 'ENFP：竞选者',
              'ESTJ：执行者', 'ESTP：挑战者', 'ESFJ：照料者', 'ESFP：表演者'
            ]
          }
        ]
      },
      {
        id: 4,
        title: '个人信息设置',
        subtitle: '让朋友更好地认识你',
        description: '设置你的联系方式和个人介绍',
        minTags: 0,
        maxTags: 0,
        fields: [
          {
            name: 'qrCode',
            label: '微信二维码',
            type: 'image',
            required: false,
            placeholder: '上传微信二维码图片'
          },
          {
            name: 'contactInfo',
            label: '联系方式',
            type: 'input',
            required: false,
            placeholder: '微信号、电话号码等'
          },
          {
            name: 'displayName',
            label: '你希望线下和你互换了信息的朋友怎么称呼你',
            type: 'input',
            required: true,
            defaultValue: '微信昵称',
            placeholder: '默认是微信昵称'
          },
          {
            name: 'personalTags',
            label: '个性tag',
            type: 'textarea',
            required: false,
            placeholder: '如：不喝咖啡会死星人'
          }
        ]
      },
      {
        id: 5,
        title: '性格关键词 / 星座 / 彩蛋型标签',
        subtitle: '你是什么样的人 + 用于灯光联动、彩蛋机制、特殊配对、引发共鸣与惊喜破冰',
        description: '选择你的性格特征、星座和一些有趣的个人特质',
        minTags: 0,
        maxTags: -1,
        categories: [
          {
            name: '性格关键词',
            note: '请选择一个最符合你的性格特征',
            tags: [
              '社牛', '社恐', '情绪稳定', '情绪起伏大', '安静细腻', '热情外放',
              '控制欲强', '佛系随缘', '思辨型', '行动力强', '拖延症', '爱爆改计划',
              '话多有点吵', '安静不出声', '自我要求高', '喜欢照顾别人'
            ]
          },
          {
            name: '星座',
            note: '请选择你的星座',
            tags: [
              '白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座',
              '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'
            ]
          },
          {
            name: '🧠 脑内小宇宙类',
            note: '选择符合你内心世界的标签',
            tags: [
              '睡前一定要脑补一部自己的剧',
              '经常跟自己对话并觉得对方很懂我',
              '会突然陷入对某个无解问题的思考（比如：我是谁？）',
              '曾经认真思考过穿越回古代能靠什么谋生',
              '看过"象牙塔"之类冷门纪录片并爱上了它'
            ]
          },
          {
            name: '🍵 怪癖型生活习惯',
            note: '选择你的独特生活习惯',
            tags: [
              '不喝咖啡活不了',
              '一天不洗头就浑身难受',
              '手机铃声一定要静音（响铃焦虑）',
              '一定要带自己专属的水杯/枕头出门',
              '喜欢把时间精确到分钟：13:47出门才刚刚好'
            ]
          },
          {
            name: '🧙‍♀️ 神秘力量派',
            note: '选择你对神秘学的兴趣',
            tags: [
              '会算塔罗 / 星盘 / 紫微斗数',
              '知道自己上升星座并知道这代表什么',
              '有个命名过的水晶（而且相信它）',
              '会背周易六十四卦顺序',
              '曾尝试主动记录梦境，还真有灵感出现'
            ]
          },
          {
            name: '🍜 生活技能彩蛋',
            note: '选择你的实用技能',
            tags: [
              '擅长做饭 / 泡茶 / 调酒',
              '会修各种奇奇怪怪的小东西',
              '会五笔打字 / 会打算盘 / 会写毛笔字',
              '能徒手换灯泡、解乱码、接wifi',
              '有自己独门泡面配方'
            ]
          },
          {
            name: '🎨 感性体验者',
            note: '选择你的感性特质',
            tags: [
              '对颜色特别敏感（#E6A9EC是心头好）',
              '喜欢孤独，但不拒绝热闹',
              '写过诗 or 歌词，并偷偷保存了下来',
              '有收藏配色灵感图的癖好',
              '看剧只看配角演技，爱上冷门角色'
            ]
          },
          {
            name: '🌀 社交怪咖系',
            note: '选择你的社交特点',
            tags: [
              '记不住脸，只记气质',
              '朋友圈从不点赞，但全都认真看完',
              '能社交，但之后需要恢复能量两天',
              '明明是INFP但社牛得像ENFJ',
              '拥有多个小号，只用来观察世界'
            ]
          },
          {
            name: '🎁 彩蛋型身份',
            note: '选择你的隐藏身份',
            tags: [
              '有豆瓣账号并且认真写过短评',
              '曾匿名发过爆款帖子 / 作品',
              '一年总有几天会消失社交网络',
              '有一首"人生BGM"，在心中反复播放',
              '是朋友眼中的"万能解决机 / 核心陪跑者 / 情绪回收站"之一'
            ]
          }
        ]
      }
    ],

    // 闪光阈值设置
    threshold: {
      default: 4, // 默认4个标签相同
      min: 1,
      max: 20,
      description: '设置多少个标签相同时开始闪光连接'
    }
  }
};

module.exports = Config;