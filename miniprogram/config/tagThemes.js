/**
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
            '产品设计', '软件开发', '数据分析', '市场营销',
            '金融投资', '教育培训', '医疗健康', '法律咨询',
            '媒体传播', '艺术创作', '建筑设计', '机械工程'
          ]
        },
        {
          id: 'interest',
          name: '兴趣爱好',
          color: 'warm',
          maxSelect: 10,
          required: true,
          tags: [
            '摄影', '绘画', '音乐', '舞蹈', '阅读', '写作',
            '游戏', '运动', '旅行', '美食', '电影', '手工'
          ]
        },
        {
          id: 'personality',
          name: '性格特质',
          color: 'neutral',
          maxSelect: 8,
          required: false,
          tags: [
            'INTJ战略家', 'INTP逻辑学家', 'ENTJ指挥官', 'ENTP辩论家',
            'INFJ提倡者', 'INFP调停者', 'ENFJ教育家', 'ENFP活动家',
            'ISTJ检查员', 'ISFJ守护者', 'ESTJ总经理', 'ESFJ执政官',
            'ISTP手工匠', 'ISFP探险家', 'ESTP实践者', 'ESFP表演者'
          ]
        },
        {
          id: 'quirky',
          name: '个性彩蛋',
          color: 'special',
          maxSelect: 5,
          required: false,
          tags: [
            '夜猫子', '早起鸟', '咖啡续命', '奶茶上瘾',
            '撸猫达人', '铲屎官', '植物杀手', '收纳狂魔'
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
    return this.themes[this.currentTheme] || this.themes.default;
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
  }
};

// 导出配置
module.exports = tagThemes;