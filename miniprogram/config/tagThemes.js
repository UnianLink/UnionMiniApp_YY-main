/**
 * ⚠️ 重要：这是问卷配置的唯一来源！
 * 
 * 当前激活主题：default（第19行）
 * 
 * 如何切换主题：
 * 1. 修改第19行 currentTheme 的值
 * 2. 可选值：'default', 'music', 'anime', 'tech', 'art'
 * 3. 或在运行时调用 tagThemes.setTheme('主题名')
 * 
 * 标签主题配置文件
 * 
 * 使用说明：
 * 1. 每个主题对应一种活动类型（音乐节、漫展、科技展等）
 * 2. 通过修改 currentTheme 切换当前使用的主题
 * 3. 标签总数不超过72个，可根据需要缩减
 * 4. 颜色属性决定硬件LED灯光效果
 * 
 * 颜色映射规则：
 * - cold (冷色): 蓝色、紫色、青色系 - 适合专业、技术类标签
 * - warm (暖色): 红色、橙色、黄色系 - 适合兴趣、爱好类标签
 * - neutral (中性): 绿色、白色系 - 适合性格、特质类标签
 * - special (特殊): 彩虹、渐变效果 - 适合彩蛋、特殊标签
 */

const tagThemes = {
  // 当前激活的主题
  currentTheme: 'default', // 可选: 'default', 'music', 'anime', 'tech', 'art'
  
  // 通用配置
  config: {
    maxTags: 72,          // 最大标签数
    minTags: 4,           // 最小标签数（建议值）
    defaultThreshold: 3,  // 默认匹配阈值
    
    // 颜色映射（HSV色相值）
    colorMapping: {
      cold: {
        name: '冷色系',
        hueRange: [180, 280],  // 青色到紫色
        description: '专业、理性、技术',
        ledEffect: '蓝紫渐变'
      },
      warm: {
        name: '暖色系', 
        hueRange: [0, 60],     // 红色到黄色
        description: '热情、活力、兴趣',
        ledEffect: '红橙渐变'
      },
      neutral: {
        name: '中性色',
        hueRange: [60, 180],   // 黄绿到青色
        description: '平衡、自然、性格',
        ledEffect: '绿白呼吸'
      },
      special: {
        name: '特殊效果',
        hueRange: [0, 360],    // 全色谱
        description: '独特、个性、彩蛋',
        ledEffect: '彩虹流动'
      }
    }
  },
  
  // 主题定义
  themes: {
    // 默认主题（通用活动）
    default: {
      name: '通用主题',
      description: '适合各类社交活动',
      categories: [
        {
          id: 'professional',
          name: '专业领域',
          color: 'cold',
          maxSelect: 10,
          required: true,
          tags: [
            '软件开发', '硬件开发', '人工智能', '数据科学', '网络安全',
            '商业与金融', '教育学', '心理学', '艺术与设计', '法律',
            '产品经理', '管理与经营', '新媒体', '人文社科', '创新创业'
          ]
        },
        {
          id: 'interest',
          name: '兴趣爱好',
          color: 'warm',
          maxSelect: 10,
          required: true,
          tags: [
            '摄影', '绘画', '音乐', '表演', '游戏', '二次元', '剧本杀',
            '美食', '宠物', '运动', '手工', '舞蹈', '阅读', '写作',
            '旅行', '电影'
          ]
        },
        {
          id: 'personality',
          name: '性格特质',
          color: 'neutral',
          maxSelect: 6,
          required: true,
          tags: [
            '外向型', '内向型', '理性型', '感性型', '直觉型', '感知型',
            '思考型', '情感型', '判断型', '计划型', '独立型', '协作型'
          ]
        },
        {
          id: 'quirky',
          name: '个性彩蛋',
          color: 'special',
          maxSelect: 5,
          required: false,
          tags: [
            '夜猫子', '早起鸟', '咖啡续命', '奶茶控',
            '撸猫达人', '收纳狂', '脑洞大开', '神秘学爱好者',
            '社牛', '社恐', '情绪稳定', '佛系随缘'
          ]
        }
      ]
    },
    
    // 音乐节主题
    music: {
      name: '音乐节主题',
      description: '专为音乐节和演出活动设计',
      categories: [
        {
          id: 'genre',
          name: '音乐流派',
          color: 'warm',
          maxSelect: 15,
          required: true,
          tags: [
            '流行', '摇滚', '民谣', '电子', '嘻哈', 'R&B',
            '爵士', '古典', '朋克', '金属', '雷鬼', '布鲁斯',
            '乡村', '拉丁', '世界音乐', '实验音乐', '后摇', '迷幻'
          ]
        },
        {
          id: 'instrument',
          name: '乐器技能',
          color: 'cold',
          maxSelect: 10,
          required: false,
          tags: [
            '吉他', '贝斯', '架子鼓', '键盘', '小提琴', '大提琴',
            '萨克斯', '小号', '钢琴', '尤克里里', 'DJ混音', '电子合成器'
          ]
        },
        {
          id: 'artist',
          name: '喜爱艺人',
          color: 'warm',
          maxSelect: 12,
          required: true,
          tags: [
            '周杰伦', '五月天', '陈奕迅', 'Taylor Swift', 'Ed Sheeran',
            'Radiohead', 'Daft Punk', 'Coldplay', '李宗盛', '窦唯',
            '痛仰', '万能青年旅店', '草东没有派对', '落日飞车'
          ]
        },
        {
          id: 'festival',
          name: '音乐节经历',
          color: 'neutral',
          maxSelect: 8,
          required: false,
          tags: [
            '草莓音乐节', '迷笛音乐节', '麦田音乐节', 'Summer Sonic',
            'Coachella', 'Glastonbury', 'Ultra', 'Tomorrowland'
          ]
        },
        {
          id: 'music_quirky',
          name: '音乐怪癖',
          color: 'special',
          maxSelect: 6,
          required: false,
          tags: [
            '歌单收藏狂', '黑胶唱片控', '演唱会前排', '乐队主唱',
            '浴室歌手', '随时在抖腿', '会背所有歌词', '音响发烧友'
          ]
        }
      ]
    },
    
    // 漫展主题
    anime: {
      name: '漫展主题',
      description: '专为动漫展和二次元活动设计',
      categories: [
        {
          id: 'anime_type',
          name: '作品类型',
          color: 'warm',
          maxSelect: 12,
          required: true,
          tags: [
            '热血少年', '青春恋爱', '科幻机战', '奇幻冒险',
            '悬疑推理', '日常治愈', '运动竞技', '音乐偶像',
            '搞笑吐槽', '美食番', '异世界', '百合/耽美'
          ]
        },
        {
          id: 'favorite_works',
          name: '喜爱作品',
          color: 'warm',
          maxSelect: 15,
          required: true,
          tags: [
            '进击的巨人', '鬼灭之刃', '咒术回战', '海贼王',
            'EVA', '命运石之门', '紫罗兰永恒花园', '辉夜大小姐',
            '电锯人', 'JOJO', '间谍过家家', '孤独摇滚',
            '原神', '崩坏', '明日方舟', '碧蓝航线'
          ]
        },
        {
          id: 'cosplay',
          name: 'Cosplay相关',
          color: 'cold',
          maxSelect: 8,
          required: false,
          tags: [
            'Coser', '摄影师', '化妆师', '道具师',
            '服装制作', '后期修图', '舞台表演', '宅舞'
          ]
        },
        {
          id: 'acg_culture',
          name: '二次元文化',
          color: 'neutral',
          maxSelect: 10,
          required: false,
          tags: [
            'B站大会员', '追番列表爆满', '手办收藏家', '同人创作',
            'Galgame玩家', 'Vtuber推', '声优厨', '漫画收藏',
            '圣地巡礼', '痛车主', 'C位常客', '本子画师'
          ]
        },
        {
          id: 'anime_quirky',
          name: '宅属性',
          color: 'special',
          maxSelect: 6,
          required: false,
          tags: [
            '老婆换季度', '本命永不变', 'DD斩', '真香警告',
            'awsl', '这很可以', '球球了', '泪目'
          ]
        }
      ]
    },
    
    // 科技展主题
    tech: {
      name: '科技展主题',
      description: '专为科技展会和创新活动设计',
      categories: [
        {
          id: 'tech_field',
          name: '技术领域',
          color: 'cold',
          maxSelect: 12,
          required: true,
          tags: [
            'AI人工智能', '机器学习', '区块链', 'Web3',
            'AR/VR', '物联网', '云计算', '量子计算',
            '5G通信', '自动驾驶', '机器人', '生物科技'
          ]
        },
        {
          id: 'programming',
          name: '编程技能',
          color: 'cold',
          maxSelect: 10,
          required: false,
          tags: [
            'Python', 'JavaScript', 'Java', 'C++',
            'Go', 'Rust', 'Swift', 'Kotlin',
            'React', 'Vue', 'Flutter', 'Unity'
          ]
        },
        {
          id: 'innovation',
          name: '创新方向',
          color: 'warm',
          maxSelect: 8,
          required: true,
          tags: [
            '智能家居', '可穿戴设备', '无人机', '新能源',
            '太空探索', '脑机接口', '基因编辑', '碳中和'
          ]
        },
        {
          id: 'tech_quirky',
          name: '极客属性',
          color: 'special',
          maxSelect: 6,
          required: false,
          tags: [
            'GitHub贡献墙全绿', 'Stack Overflow大神',
            '树莓派玩家', '机械键盘收藏', 'Linux死忠',
            '代码洁癖', '深夜Debug', '买显卡挖矿'
          ]
        }
      ]
    },
    
    // 艺术展主题
    art: {
      name: '艺术展主题',
      description: '专为艺术展览和创意活动设计',
      categories: [
        {
          id: 'art_form',
          name: '艺术形式',
          color: 'warm',
          maxSelect: 12,
          required: true,
          tags: [
            '油画', '水彩', '素描', '版画', '雕塑', '装置艺术',
            '行为艺术', '数字艺术', '摄影', '陶艺', '书法', '涂鸦'
          ]
        },
        {
          id: 'art_style',
          name: '艺术流派',
          color: 'neutral',
          maxSelect: 10,
          required: false,
          tags: [
            '印象派', '抽象派', '现实主义', '超现实主义',
            '波普艺术', '极简主义', '未来主义', '表现主义',
            '立体主义', '野兽派', '达达主义', '新媒体艺术'
          ]
        },
        {
          id: 'creative',
          name: '创作领域',
          color: 'warm',
          maxSelect: 8,
          required: true,
          tags: [
            '插画设计', '品牌设计', 'UI/UX', '建筑设计',
            '服装设计', '珠宝设计', '产品设计', '动画制作'
          ]
        },
        {
          id: 'art_quirky',
          name: '艺术怪癖',
          color: 'special',
          maxSelect: 6,
          required: false,
          tags: [
            '美术馆常客', '收藏癖', '颜料囤积症', '灵感深夜来',
            '速写本不离身', '看展必拍', '艺术史百科', '调色强迫症'
          ]
        }
      ]
    }
  },
  
  // 获取当前主题配置
  getCurrentTheme() {
    return this.themes[this.currentTheme] || this.themes.default;//这一行配置了主题组！
  },
  
  // 切换主题
  setTheme(themeName) {
    if (this.themes[themeName]) {
      this.currentTheme = themeName;
      return true;
    }
    return false;
  },
  
  // 获取所有标签（扁平化）
  getAllTags() {
    const theme = this.getCurrentTheme();
    let allTags = [];
    theme.categories.forEach(category => {
      allTags = allTags.concat(category.tags);
    });
    return allTags;
  },
  
  // 获取标签总数
  getTagCount() {
    return this.getAllTags().length;
  },
  
  // 验证标签数量
  validateTagCount() {
    const count = this.getTagCount();
    if (count > this.config.maxTags) {
      console.warn(`标签总数 ${count} 超过最大限制 ${this.config.maxTags}`);
      return false;
    }
    if (count < this.config.minTags) {
      console.warn(`标签总数 ${count} 少于建议最小值 ${this.config.minTags}`);
    }
    return true;
  },
  
  // 根据标签获取颜色属性
  getTagColor(tagName) {
    const theme = this.getCurrentTheme();
    for (let category of theme.categories) {
      if (category.tags.includes(tagName)) {
        return this.config.colorMapping[category.color];
      }
    }
    return this.config.colorMapping.neutral;
  },
  
  // 预测LED效果
  predictLedEffect(matchedTags) {
    const colorTypes = new Set();
    matchedTags.forEach(tag => {
      const color = this.getTagColor(tag);
      if (color) {
        colorTypes.add(color.name);
      }
    });
    
    if (colorTypes.size === 0) return '无匹配效果';
    if (colorTypes.size === 1) return Array.from(colorTypes)[0] + '单色呼吸';
    if (colorTypes.has('特殊效果')) return '彩虹流动效果';
    if (colorTypes.has('暖色系') && colorTypes.has('冷色系')) return '冷暖渐变效果';
    return '多彩混合效果';
  },
  
  // ===================== 兼容性配置（与config.js保持一致） =====================
  
  // 系统元配置
  meta: {
    theme: 'union-advanced-tags',
    totalSteps: 6, // 🔧 增加到6步：第0步MBTI + 原5步（1-5）
    minTotalTags: 4,
    maxTotalTags: -1
  },
  
  // 阈值配置
  threshold: {
    default: (() => {
      try {
        const sharedConfig = require('../utils/shared-config-loader.js');
        return sharedConfig.getDefaultTagThreshold();
      } catch (error) {
        console.warn('[TagThemes] 无法加载配置，使用降级值2:', error.message);
        return 2; // 🔧 降级值改为与硬件同步的2
      }
    })(),
    min: 1,
    max: 10,
    description: '设置多少个标签相同时开始闪光连接'
  },
  
  // 文本配置（添加缺失的提示文本）
  texts: {
    login: {
      welcomeTitle: '欢迎使用 Union 智能匹配',
      welcomeDesc: '通过标签匹配找到志同道合的朋友',
      loginButton: '微信登录开始匹配',
      avatar: {
        uploadTip: '点击上传头像',
        uploadSuccess: '头像上传成功',
        uploadFail: '头像上传失败',
        processingFail: '头像处理失败'
      }
    },
    questionnaire: {
      stepFormat: '第 {current} 步，共 {total} 步',
      minTagsHint: '至少选择 {min} 个标签',
      maxTagsHint: '最多选择 {max} 个标签',
      tagCountHint: '已选择 {current} 个标签',
      thresholdHint: '当匹配 {threshold} 个或以上标签时设备将闪光',
      submitButton: '完成问卷',
      buttons: {
        next: '下一步',
        prev: '上一步',
        submit: '完成问卷'
      },
      messages: {
        loginRequired: '请先登录后再填写问卷',
        validateError: '请检查问卷填写是否完整',
        submitSuccess: '问卷提交成功',
        submitError: '问卷提交失败，请重试',
        saveSuccess: '问卷保存成功'
      }
    },
    common: {
      confirm: '确认',
      cancel: '取消',
      loading: '加载中...',
      error: '出错了',
      retry: '重试',
      success: '成功',
      close: '关闭'
    }
  },
  
  // ===================== 独立的常亮灯配置 =====================
  
  // 常亮灯颜色配置（独立于兴趣编码系统）
  idleLightConfig: {
    questionType: 'single_select',  // 单选题
    questionId: 'mbti_personality',
    questionTitle: 'MBTI性格类型',
    subtitle: '选择你的性格类型',
    description: '你的选择将决定设备常亮灯颜色，不影响兴趣匹配',
    excludeFromEncoding: true,  // 关键标记：不参与兴趣编码
    required: false,  // 可选
    options: [
      { name: 'INTJ战略家', color: '#E695FF', description: '独立思考，追求完美' },//ll
      { name: 'INTP逻辑家', color: '#E695FF', description: '理性分析，热爱真理' },//yy
      { name: 'ENTJ指挥官', color: '#E695FF', description: '天生领袖，目标明确' },
      { name: 'ENTP辩论家', color: '#E695FF', description: '创新思维，善于辩论' },//jx
      { name: 'INFJ提倡者', color: '#86EB8E', description: '理想主义，富有洞察力' },
      { name: 'INFP调停者', color: '#86EB8E', description: '价值驱动，追求和谐' },
      { name: 'ENFJ教育家', color: '#86EB8E', description: '关爱他人，善于激励' },
      { name: 'ENFP活动家', color: '#86EB8E', description: '热情洋溢，富有创意' },//pp
      { name: 'ISTJ检查员', color: '#92B8FF', description: '务实可靠，注重细节' },
      { name: 'ISFJ守护者', color: '#92B8FF', description: '温暖贴心，乐于助人' },
      { name: 'ESTJ总经理', color: '#92B8FF', description: '组织能力强，执行力佳' },//vv
      { name: 'ESFJ执政官', color: '#92B8FF', description: '社交达人，关心他人' },
      { name: 'ISTP手工匠', color: '#F2DA70', description: '动手能力强，逻辑清晰' },
      { name: 'ISFP探险家', color: '#F2DA70', description: '艺术天赋，追求自由' },
      { name: 'ESTP实践者', color: '#F2DA70', description: '行动力强，适应性佳' },
      { name: 'ESFP表演者', color: '#F2DA70', description: '活泼开朗，富有感染力' }
    ]
  },
  
  // 获取问卷步骤配置（适配现有系统）
  getStepConfig(stepId) {
    const theme = this.getCurrentTheme();
    if (!theme || !theme.categories) return null;
    
    // 将categories映射为steps格式
    const stepMapping = {
      0: {
        id: 0,
        title: '🧠 选择你的MBTI性格类型',
        subtitle: ' ',
        description: ' ',
        type: 'mbti', // 🆕 MBTI专用步骤类型
        required: false,
        skipable: true // 可以跳过
      },
      1: {
        id: 1,
        title: '你擅长或感兴趣的领域 Tags',
        subtitle: '帮你找到【想匹配的】或【能力互补】的人！',
        description: ' ',
        minTags: 1,
        maxTags: -1,
        categories: theme.categories.filter(cat => cat.id === 'professional' || cat.color === 'cold')
      },
      2: {
        id: 2,
        title: '兴趣爱好 Tags',
        subtitle: '帮你找到兴趣搭子！',
        description: ' ',
        minTags: 1,
        maxTags: -1,
        categories: theme.categories.filter(cat => cat.id === 'interest' || cat.color === 'warm')
      },
      3: {
        id: 3,
        title: '性格特质 Tags',
        subtitle: '选择最符合你性格特征的类型',
        description: ' ',
        minTags: 1,
        maxTags: -1,
        //minTotalTags: this.meta.minTotalTags, // 添加总标签最小值验证
        categories: theme.categories.filter(cat => cat.id === 'personality' || cat.color === 'neutral')
      },
      4: {
        id: 4,
        title: '基础与个人信息',
        subtitle: '让我们了解一些基本信息',
        description: ' ',
        minTags: 0,
        maxTags: -1,
        type: 'form', // 表单类型而非标签选择
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
      5: {
        id: 5,
        title: '个性彩蛋 & 深入了解',
        subtitle: '让朋友更好地认识你',
        description: '选择有趣的个人特质和习惯，同时完善更多信息',
        minTags: 0,
        maxTags: -1,
        type: 'mixed', // 混合类型：既有标签选择又有表单
        categories: theme.categories.filter(cat => cat.id === 'quirky' || cat.color === 'special'),
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
            field: 'constellation',
            label: '你的星座是？ (可选)',
            type: 'radio',
            options: ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座', '不确定'],
            required: false
          },
          {
            field: 'interactionWillingness',
            label: '是否愿意在展会中与他人互动？',
            type: 'radio',
            options: ['愿意', '仅观展', '看情况而定'],
            required: true
          }
        ]
      }
    };
    
    return stepMapping[stepId] || null;
  },
  
  // 获取所有步骤配置
  getAllStepsConfig() {
    return [0, 1, 2, 3, 4, 5].map(stepId => this.getStepConfig(stepId)).filter(Boolean);
  },
  
  // 获取文本配置（兼容Config.getText调用）
  getText(path, variables = {}) {
    const keys = path.split('.');
    let value = this.texts;
    
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
      return value.replace(/\{(\w+)\}/g, (match, key) => {
        return variables.hasOwnProperty(key) ? variables[key] : match;
      });
    }
    
    return value;
  },
  
  // 批量获取文字配置（兼容Config.getTexts调用）
  getTexts(paths) {
    const result = {};
    for (const key in paths) {
      result[key] = this.getText(paths[key]);
    }
    return result;
  }
};

// 导出配置
module.exports = tagThemes;