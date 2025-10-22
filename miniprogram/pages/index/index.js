// 引入全局配置
const Config = require('../../utils/config.js');
// 引入标签主题配置
const tagThemes = require('../../config/tagThemes.js');
// 引入MBTI颜色管理器
const MBTIColorManager = require('../../utils/mbti-color-manager.js');

Page({
  // 去抖定时器（在页面实例级别，不放在data中）
  _refreshTimers: {
    refreshAllTags: null,
    updateTotalTags: null
  },
  
  data: {
    // 基础状态
    hasUserInfo: false,
    userInfo: {},
    isSubmitting: false,
    
    // 页面状态
    viewMode: 'questionnaire', // 'questionnaire' | 'profile'
    
    // 高级标签数据
    advancedTags: {
      professionalTags: [],
      interestTags: [],
      personalityTags: [],  // 性格特质标签（多选，建议2-3个）
      quirkyTags: [],
      threshold: (() => {
        try {
          const sharedConfig = require('../../utils/shared-config-loader.js');
          return sharedConfig.getDefaultTagThreshold();
        } catch (error) {
          console.warn('[Index] 无法加载配置，使用降级值2:', error.message);
          return 2;
        }
      })(),
      displayName: '',
      contactInfo: '',
      personalTagsText: '',
      qrCodeUrl: '',
      photos: [],
      // 新增：独立的MBTI字段（不参与兴趣编码）
      mbtiType: null  // 单选，存储一个MBTI类型
    },
    
    // 编码信息
    encodingInfo: {
      encoded: '',
      length: 0,
      totalTags: 0,
      selectedCount: 0
    },
    // 原有问卷数据（兼容）
    questionnaire: {
      nickname: '',
      ageGroup: '',
      gender: '',
      city: '',
      region: [],
      profession: '',
      professionOther: '',
      currentStatus: '',
      interactionWillingness: '',
      constellation: '',
      constellationDate: { month: '', day: '' },
      mbtiType: '',
      mbtiKnown: '',
      interestTags: [],
      interestOther: '',
      techTrends: [],
      firstDevice: '',
      mostImportantDevice: '',
      aiAttitude: '',
      smartDeviceCount: '',
      immersivePreference: '',
      exhibitionPreference: '',
      learningPreference: '',
      energyTime: '',
      contactWillingness: '',
      contactInfo: ''
    },
    currentStep: 0, // 🔧 从第0步MBTI选择开始
    totalSteps: 6, // 🔧 更新为6步（第0步MBTI，第1-3步标签，第4步个人信息，第5步彩蛋）
    // 使用新的标签系统
    useAdvancedTags: true, // 标识使用新的标签系统
    config: tagThemes.meta || Config.advancedTagsConfig,
    currentStepConfig: null,
    // 文字配置
    texts: {},
    
    // 标签选项状态管理
    tagOptions: {
      professional: [], // 专业领域标签选项
      interest: [], // 兴趣爱好标签选项
      personality: [], // 性格标签选项
      quirky: [] // 彩蛋标签选项
    },
    
    // 标签主题相关
    currentTheme: null, // 当前主题配置
    themeCategories: [], // 主题分类
    
    // MBTI选择器相关
    showMBTISelectorModal: false, // 是否显示MBTI选择器弹窗
    mbtiOptions: [], // MBTI选项列表
    mbtiSelectedColor: '#66ccff', // 当前选中的MBTI颜色
    
    // 选择统计
    totalSelectedTags: 0,
    uploadedAvatarFileID: null,
    
    // 新增：当前选中的分类（用于分类选择界面）
    currentCategory: {
      1: '', // 专业领域当前分类
      2: '', // 兴趣爱好当前分类  
      3: '', // 性格当前分类
      4: ''  // 彩蛋当前分类
    },
    
    // 昵称编辑相关
    editingNickname: false, // 是否正在编辑昵称
    tempNickname: '', // 临时昵称内容
  },

  onShow: function() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected('/pages/index/index');
    }
    
    // 🖼️ 头像修复：页面显示时检查头像状态
    setTimeout(() => {
      const currentUserInfo = this.data.userInfo;
      if (currentUserInfo && currentUserInfo.customAvatar && currentUserInfo.avatarFileID) {
        console.log('[onShow] 检查用户头像状态');
        this.checkAndRefreshAvatar(currentUserInfo);
      }
    }, 200);
  },

  /**
   * 加载标签主题配置
   */
  loadTagTheme: function() {
    console.log('[loadTagTheme] 加载标签主题配置');
    
    // 获取当前主题
    const currentTheme = tagThemes.getCurrentTheme();
    console.log('[loadTagTheme] 当前主题:', currentTheme.name);
    
    // 验证标签数量
    if (!tagThemes.validateTagCount()) {
      console.warn('[loadTagTheme] 标签数量验证警告');
    }
    
    // 设置主题数据
    this.setData({
      currentTheme: currentTheme,
      themeCategories: currentTheme.categories
    });
    
    // 🎯 加载MBTI配置
    this.initMBTIOptions();
    
    // 更新步骤配置以使用主题标签
    this.updateStepsWithTheme(currentTheme);
  },
  
  /**
   * 使用主题更新步骤配置
   */
  updateStepsWithTheme: function(theme) {
    console.log('[updateStepsWithTheme] 更新步骤配置');
    
    // 映射主题分类到步骤
    const categoryMapping = {
      'professional': 1,  // 专业领域 -> 步骤1
      'genre': 1,        // 音乐流派 -> 步骤1
      'anime_type': 1,   // 作品类型 -> 步骤1
      'tech_field': 1,   // 技术领域 -> 步骤1
      'art_form': 1,     // 艺术形式 -> 步骤1
      
      'interest': 2,     // 兴趣爱好 -> 步骤2
      'instrument': 2,   // 乐器技能 -> 步骤2
      'artist': 2,       // 喜爱艺人 -> 步骤2
      'favorite_works': 2, // 喜爱作品 -> 步骤2
      'programming': 2,  // 编程技能 -> 步骤2
      'creative': 2,     // 创作领域 -> 步骤2
      
      'personality': 3,  // 性格特质 -> 步骤3
      'festival': 3,     // 音乐节经历 -> 步骤3
      'cosplay': 3,      // Cosplay相关 -> 步骤3
      'innovation': 3,   // 创新方向 -> 步骤3
      'art_style': 3,    // 艺术流派 -> 步骤3
      
      'quirky': 5,       // 个性彩蛋 -> 步骤5
      'music_quirky': 5, // 音乐怪癖 -> 步骤5
      'anime_quirky': 5, // 宅属性 -> 步骤5
      'tech_quirky': 5,  // 极客属性 -> 步骤5
      'art_quirky': 5,   // 艺术怪癖 -> 步骤5
      
      'acg_culture': 2   // 二次元文化 -> 步骤2（额外分类）
    };
    
    // 清空现有标签选项
    const newTagOptions = {
      professional: [],
      interest: [],
      personality: [],
      quirky: []
    };
    
    // 根据主题分类填充标签选项
    theme.categories.forEach(category => {
      const step = categoryMapping[category.id];
      
      if (step === 1) {
        // 专业领域类
        newTagOptions.professional = newTagOptions.professional.concat(
          category.tags.map(tag => ({
            name: tag,
            category: category.name,
            color: category.color
          }))
        );
      } else if (step === 2) {
        // 兴趣爱好类
        newTagOptions.interest = newTagOptions.interest.concat(
          category.tags.map(tag => ({
            name: tag,
            category: category.name,
            color: category.color
          }))
        );
      } else if (step === 3) {
        // 性格特质类
        newTagOptions.personality = newTagOptions.personality.concat(
          category.tags.map(tag => ({
            name: tag,
            category: category.name,
            color: category.color
          }))
        );
      } else if (step === 5) {
        // 彩蛋类
        newTagOptions.quirky = newTagOptions.quirky.concat(
          category.tags.map(tag => ({
            name: tag,
            category: category.name,
            color: category.color
          }))
        );
      }
    });
    
    // 更新标签选项
    this.setData({
      tagOptions: newTagOptions
    });
    
    console.log('[updateStepsWithTheme] 标签选项已更新:', {
      professional: newTagOptions.professional.length,
      interest: newTagOptions.interest.length,
      personality: newTagOptions.personality.length,
      quirky: newTagOptions.quirky.length
    });
  },

  // 🔧 KISS原则：简化后的页面初始化
  onLoad: function(options) {
    console.log('[Index] 页面加载 - 使用高级标签系统', options);
    
    // 加载标签主题配置
    this.loadTagTheme();
    
    // 🎯 特殊情况：从connect页面跳转查看其他用户资料
    if (options.openid && options.viewMode === 'profile') {
      console.log('[Index] 从connect页面跳转，显示用户问卷:', options.openid);
      this.loadUserProfile(options.openid);
      return;
    }
    
    // 🎯 KISS静默登录：页面加载时立即开始初始化
    console.log('[Index] 正常加载页面，开始静默身份识别');
    this.initTextConfig();
    this.initAdvancedTagsFromConfig();
    this.initMBTIOptions();
    
    // 🎯 核心改进：静默登录 + 数据检查
    this.silentLogin();
    
    // 🖼️ 头像修复：页面加载完成后进行头像状态初始检查
    setTimeout(() => {
      console.log('[onLoad] 执行头像状态初始检查');
      const userInfo = this.data.userInfo || wx.getStorageSync('userInfo');
      if (userInfo && userInfo.customAvatar && userInfo.avatarFileID) {
        this.checkAndRefreshAvatar(userInfo);
      }
    }, 1000);
  },

  /**
   * 加载用户问卷页面
   */
  loadUserProfile: async function(targetOpenid) {
    try {
      console.log('[Index] 开始加载用户问卷:', targetOpenid);
      
      // 调用云函数获取用户数据
      const result = await wx.cloud.callFunction({
        name: 'getUserData',
        data: {
          openid: targetOpenid,
          dataType: 'advanced'
        }
      });
      
      if (result.result && result.result.success && result.result.data) {
        const userData = result.result.data;
        console.log('[Index] 获取到用户数据:', userData);
        
        // 设置用户数据
        this.setData({
          userInfo: userData.userInfo || {},
          advancedTags: userData.advancedTags || {},
          viewMode: 'profile'
        });
        
        // 初始化文字配置
        this.initTextConfig();
        this.initAdvancedTagsFromConfig();
        
        // 生成编码信息用于显示
        const encodingInfo = {
          encoded: userData.encodedTags || '',
          length: userData.encodedTags ? userData.encodedTags.length : 0,
          totalTags: userData.advancedTags?.totalTags || 0,
          selectedCount: userData.advancedTags?.totalTags || 0
        };
        
        this.setData({ encodingInfo });
        
        console.log('[Index] 用户问卷加载完成');
      } else {
        console.error('[Index] 获取用户数据失败:', result.result);
        wx.showToast({
          title: '用户数据不存在',
          icon: 'none'
        });
        
        // 返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('[Index] 加载用户问卷失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 初始化文字配置
  initTextConfig() {
    // 根据问卷主题设置文字主题
    const questionnaireTheme = Config.questionnaireConfig.meta.theme;
    if (Config.setTheme(questionnaireTheme)) {
      console.log('[Index] 文字主题已设置为:', questionnaireTheme);
    }

    // 初始化所有需要的文字
    const tagThemes = require('../../config/tagThemes.js');
    const texts = tagThemes.getTexts({
      // 登录页面文字
      welcomeTitle: 'login.welcomeTitle',
      welcomeDesc: 'login.welcomeDesc',
      loginButton: 'login.loginButton',
      avatarUploadTip: 'login.avatar.uploadTip',
      avatarUploadSuccess: 'login.avatar.uploadSuccess',
      avatarUploadFail: 'login.avatar.uploadFail',
      avatarProcessingFail: 'login.avatar.processingFail',
      
      // 问卷页面文字
      stepFormat: 'questionnaire.stepFormat',
      minTagsHint: 'questionnaire.minTagsHint',
      maxTagsHint: 'questionnaire.maxTagsHint',
      tagCountHint: 'questionnaire.tagCountHint',
      thresholdHint: 'questionnaire.thresholdHint',
      prevButton: 'questionnaire.buttons.prev',
      nextButton: 'questionnaire.buttons.next',
      submitButton: 'questionnaire.buttons.submit',
      loginRequired: 'questionnaire.messages.loginRequired',
      validateError: 'questionnaire.messages.validateError',
      submitSuccess: 'questionnaire.messages.submitSuccess',
      submitError: 'questionnaire.messages.submitError',
      saveSuccess: 'questionnaire.messages.saveSuccess',
      
      // 通用文字
      confirm: 'common.confirm',
      cancel: 'common.cancel',
      loading: 'common.loading',
      error: 'common.error',
      retry: 'common.retry'
    });

    this.setData({ texts });
  },

  // 从高级标签配置初始化页面数据
  initAdvancedTagsFromConfig() {
    // 🎯 关键修改：优先使用外部配置
    const encoding = Config.advancedTagsConfig.encoding;
    
    try {
      console.log('[initAdvancedTagsFromConfig] 检查配置源:', encoding.configSource);
      
      // 检查配置源
      if (encoding.configSource === 'external') {
        console.log('[initAdvancedTagsFromConfig] 开始加载外部tagThemes.js配置');
        const tagThemes = require('../../config/tagThemes.js');
        console.log('[initAdvancedTagsFromConfig] tagThemes.js加载成功');
        
        const currentTheme = tagThemes.getCurrentTheme();
        console.log('[initAdvancedTagsFromConfig] 当前主题:', currentTheme.name);
        console.log('[initAdvancedTagsFromConfig] 分类数量:', currentTheme.categories.length);
        
        // 验证外部配置的有效性
        const totalExternalTags = tagThemes.getTagCount();
        console.log('[initAdvancedTagsFromConfig] 外部配置标签总数:', totalExternalTags);
        
        if (totalExternalTags === 0) {
          throw new Error('外部配置中没有找到有效标签');
        }
        
        if (totalExternalTags > 60) {
          console.warn(`[initAdvancedTagsFromConfig] 外部配置标签数量${totalExternalTags}超过60限制`);
        }
        
        // 从外部配置构建标签选项
        const tagOptions = this.buildTagOptionsFromTheme(currentTheme);
        console.log('[initAdvancedTagsFromConfig] 标签选项构建完成');
        
        // 构建步骤配置（模拟原有的步骤结构）
        const stepConfigs = this.buildStepConfigsFromTheme(currentTheme);
        console.log('[initAdvancedTagsFromConfig] 步骤配置构建完成');
        
        const finalTagCount = tagOptions.professional.length + tagOptions.interest.length + 
                              tagOptions.personality.length + tagOptions.quirky.length;
        
        console.log('[initAdvancedTagsFromConfig] 最终标签统计:', {
          professional: tagOptions.professional.length,
          interest: tagOptions.interest.length,
          personality: tagOptions.personality.length,
          quirky: tagOptions.quirky.length,
          total: finalTagCount
        });
        
        // 确保标签数量在合理范围内
        if (finalTagCount > 60) {
          console.error(`[initAdvancedTagsFromConfig] ❌ 最终标签数量${finalTagCount}超过60限制，系统可能出现问题`);
        }
        
        // 🔧 KISS修复：检查现有用户数据，避免无条件删除
        console.log('[initAdvancedTagsFromConfig] 🔍 检查现有用户数据');
        let existingUserData = null;
        try {
          existingUserData = wx.getStorageSync('advancedTags');
          console.log('[initAdvancedTagsFromConfig] 📦 现有数据状态:', {
            hasData: !!existingUserData,
            hasValidStructure: existingUserData && existingUserData.professionalTags,
            totalTags: existingUserData ? (
              (existingUserData.professionalTags?.length || 0) +
              (existingUserData.interestTags?.length || 0) +
              (existingUserData.personalityTags?.length || 0) +
              (existingUserData.quirkyTags?.length || 0)
            ) : 0
          });
        } catch (error) {
          console.warn('[initAdvancedTagsFromConfig] ⚠️ 读取现有数据失败:', error);
        }
        
        // 🎯 智能数据处理：保留有效用户数据，只重置配置相关部分
        let advancedTags;
        if (existingUserData && existingUserData.professionalTags && 
            (existingUserData.professionalTags.length > 0 || existingUserData.interestTags?.length > 0 ||
             existingUserData.personalityTags?.length > 0 || existingUserData.quirkyTags?.length > 0)) {
          // 有有效用户数据，保留用户选择，只更新必要的配置
          console.log('[initAdvancedTagsFromConfig] ✅ 保留现有用户数据，仅更新配置');
          advancedTags = {
            ...existingUserData,
            // 确保阈值使用配置默认值（如果用户没有设置）
            threshold: existingUserData.threshold || Config.advancedTagsConfig.threshold.default,
            updateTime: existingUserData.updateTime || new Date().toISOString()
          };
        } else {
          // 无有效用户数据，初始化空状态
          console.log('[initAdvancedTagsFromConfig] 🆕 初始化新用户数据');
          advancedTags = {
            professionalTags: [],
            interestTags: [],
            personalityTags: [],
            quirkyTags: [],
            threshold: Config.advancedTagsConfig.threshold.default,
            updateTime: new Date().toISOString()
          };
        }
        
        console.log('[initAdvancedTagsFromConfig] 🔥 初始化阈值:', {
          配置默认值: Config.advancedTagsConfig.threshold.default,
          最终阈值: advancedTags.threshold,
          阈值类型: typeof advancedTags.threshold,
          数据来源: existingUserData ? '保留用户数据' : '新建数据'
        });
        
        // 初始化当前分类
        const currentCategory = {};
        stepConfigs.forEach((step, index) => {
          if (step.categories && step.categories.length > 0) {
            currentCategory[index + 1] = step.categories[0].name;
          }
        });
        
        console.log('[initAdvancedTagsFromConfig] 🎉 外部配置设置完成，标签数量:', finalTagCount);
        const userDataStatus = existingUserData && (existingUserData.professionalTags?.length > 0 || 
          existingUserData.interestTags?.length > 0 || existingUserData.personalityTags?.length > 0 || 
          existingUserData.quirkyTags?.length > 0) ? '保留用户数据' : '初始化新数据';
        console.log('[initAdvancedTagsFromConfig] 📊 数据处理结果:', userDataStatus);
        
        this.setData({
          tagOptions,
          currentCategory,
          currentStepConfig: stepConfigs[0] || null,
          totalSteps: stepConfigs.length,
          advancedTags: advancedTags
        }, () => {
          this.refreshAllTagsActive();
          // 保存更新后的数据到本地存储
          this.saveAdvancedTags();
        });
        
        return;
      } else {
        console.log('[initAdvancedTagsFromConfig] 📦 配置源为内置配置，不使用外部配置');
      }
    } catch (error) {
      console.error('[initAdvancedTagsFromConfig] ❌ 外部配置加载失败，使用内置配置:', error);
      console.error('[initAdvancedTagsFromConfig] 错误详情:', error.stack);
    }
    
    // 降级：使用内置配置
    console.log('[initAdvancedTagsFromConfig] 使用内置配置');
    const tagThemes = require('../../config/tagThemes.js');
    const steps = tagThemes.getAllStepsConfig();
    
    const tagOptions = {
      professional: this.initCategoryOptions(steps[0]),
      interest: this.initCategoryOptions(steps[1]),
      personality: this.initCategoryOptions(steps[2]),
      quirky: this.initCategoryOptions(steps[4])
    };
    
    const currentCategory = {};
    steps.forEach((step, index) => {
      if (step.categories && step.categories.length > 0) {
        currentCategory[index + 1] = step.categories[0].name;
      }
    });
    
    this.setData({
      tagOptions,
      currentCategory,
      currentStepConfig: this.getAdvancedStepConfig(0), // 🔧 从第0步开始
      totalSteps: tagThemes.meta.totalSteps || Config.advancedTagsConfig.meta.totalSteps,
      'advancedTags.threshold': tagThemes.threshold.default || Config.advancedTagsConfig.threshold.default
    }, () => {
      this.refreshAllTagsActive();
    });
  },

  // 从外部主题配置构建标签选项
  buildTagOptionsFromTheme(themeConfig) {
    const tagOptions = {
      professional: [],
      interest: [],
      personality: [],
      quirky: []
    };
    
    // 根据分类ID映射到对应的标签选项
    themeConfig.categories.forEach(category => {
      category.tags.forEach(tag => {
        const option = {
          name: tag,
          category: category.name,
          active: false
        };
        
        // 根据分类ID分配到对应的标签组
        switch(category.id) {
          case 'professional':
            tagOptions.professional.push(option);
            break;
          case 'interest':
            tagOptions.interest.push(option);
            break;
          case 'personality':
            tagOptions.personality.push(option);
            break;
          case 'quirky':
            tagOptions.quirky.push(option);
            break;
          default:
            console.warn(`[buildTagOptionsFromTheme] 未知分类ID: ${category.id}`);
        }
      });
    });
    
    return tagOptions;
  },

  // 从外部主题配置构建步骤配置
  buildStepConfigsFromTheme(themeConfig) {
    const stepConfigs = [];
    
    // 按照分类ID顺序创建步骤
    const categoryOrder = ['professional', 'interest', 'personality', 'quirky'];
    const stepTitles = ['MBTI', '兴趣爱好', 'MBTI性格', '个性彩蛋'];
    
    categoryOrder.forEach((categoryId, index) => {
      const category = themeConfig.categories.find(cat => cat.id === categoryId);
      if (category) {
        stepConfigs.push({
          id: index + 1,
          title: stepTitles[index] || category.name,
          categories: [{
            name: category.name,
            tags: category.tags
          }]
        });
      }
    });
    
    return stepConfigs;
  },

  // 初始化分类选项（包含分类信息）
  initCategoryOptions(stepConfig) {
    const options = [];
    if (stepConfig && stepConfig.categories) {
      stepConfig.categories.forEach(category => {
        category.tags.forEach(tag => {
          options.push({
            name: tag,
            category: category.name,
            note: category.note || '',
            active: false
          });
        });
      });
    }
    
    console.log('[initCategoryOptions] 步骤配置:', stepConfig?.id, '生成的选项数量:', options.length);
    if (options.length > 0) {
      console.log('[initCategoryOptions] 示例选项:', options[0]);
    }
    
    return options;
  },

  // 获取高级标签步骤配置（适配层 - 从tagThemes获取）
  getAdvancedStepConfig(step) {
    // 优先使用tagThemes的配置
    try {
      const stepConfig = tagThemes.getStepConfig(step);
      if (stepConfig) {
        console.log(`[getAdvancedStepConfig] ✅ 从tagThemes获取步骤${step}配置:`, stepConfig.title);
        return stepConfig;
      }
    } catch (error) {
      console.warn(`[getAdvancedStepConfig] ⚠️ tagThemes获取步骤配置失败，回退到config.js:`, error);
    }
    
    // 回退到原有配置（保证兼容性）
    console.log(`[getAdvancedStepConfig] 🔄 回退到config.js配置`);
    if (Config.advancedTagsConfig && Config.advancedTagsConfig.steps) {
      const steps = Config.advancedTagsConfig.steps;
      return steps.find(s => s.id === step) || null;
    }
    
    return null;
  },
  
  // 适配层：获取配置项（统一访问入口）
  getConfigValue(path) {
    try {
      // 路径映射：将config.js的路径映射到tagThemes
      const pathMapping = {
        'meta.totalSteps': 'meta.totalSteps',
        'meta.minTotalTags': 'meta.minTotalTags', 
        'meta.theme': 'meta.theme',
        'threshold.default': 'threshold.default',
        'threshold.min': 'threshold.min',
        'threshold.max': 'threshold.max',
        'encoding': null // encoding需要特殊处理
      };
      
      const mappedPath = pathMapping[path];
      if (mappedPath && tagThemes[mappedPath.split('.')[0]]) {
        const parts = mappedPath.split('.');
        let value = tagThemes;
        for (let part of parts) {
          value = value[part];
          if (value === undefined) break;
        }
        if (value !== undefined) {
          return value;
        }
      }
    } catch (error) {
      console.warn(`[getConfigValue] tagThemes获取${path}失败:`, error);
    }
    
    // 回退到原有配置
    if (Config.advancedTagsConfig) {
      const parts = path.split('.');
      let value = Config.advancedTagsConfig;
      for (let part of parts) {
        value = value[part];
        if (value === undefined) break;
      }
      return value;
    }
    
    return undefined;
  },

  // 刷新所有标签的激活状态
  refreshAllTagsActive() {
    const { professionalTags, interestTags, personalityTags, quirkyTags } = this.data.advancedTags;
    
    console.log('[refreshAllTagsActive] 当前标签状态:', {
      professionalTags,
      interestTags,
      personalityTags,
      quirkyTags
    });
    
    const updatedProfessional = this.data.tagOptions.professional.map(o => ({ 
      ...o, 
      active: professionalTags.indexOf(o.name) > -1 
    }));
    
    const updatedInterest = this.data.tagOptions.interest.map(o => ({ 
      ...o, 
      active: interestTags.indexOf(o.name) > -1 
    }));
    
    const updatedPersonality = this.data.tagOptions.personality.map(o => ({ 
      ...o, 
      active: personalityTags.indexOf(o.name) > -1 
    }));
    
    const updatedQuirky = this.data.tagOptions.quirky.map(o => ({ 
      ...o, 
      active: quirkyTags.indexOf(o.name) > -1 
    }));
    
    console.log('[refreshAllTagsActive] 更新后的标签选项:', {
      professional: updatedProfessional.filter(t => t.active).map(t => t.name),
      interest: updatedInterest.filter(t => t.active).map(t => t.name),
      personality: updatedPersonality.filter(t => t.active).map(t => t.name),
      quirky: updatedQuirky.filter(t => t.active).map(t => t.name)
    });
    
    this.setData({
      'tagOptions.professional': updatedProfessional,
      'tagOptions.interest': updatedInterest,
      'tagOptions.personality': updatedPersonality,
      'tagOptions.quirky': updatedQuirky
    });
    // 🚀 移除嵌套调用，由去抖机制统一处理
  },

  // 更新总选择标签数量（基于实际用户选择，支持动态配置）
  updateTotalSelectedTags() {
    const { professionalTags, interestTags, personalityTags, quirkyTags } = this.data.advancedTags;
    const total = (professionalTags?.length || 0) + (interestTags?.length || 0) + 
                  (personalityTags?.length || 0) + (quirkyTags?.length || 0);
    
    // 🔍 调试信息：验证标签统计的准确性（精简版）
    console.log('[updateTotalSelectedTags] 📊 标签统计:', {
      total: total,
      breakdown: `专业${professionalTags?.length || 0} + 兴趣${interestTags?.length || 0} + 性格${personalityTags?.length || 0} + 彩蛋${quirkyTags?.length || 0}`
    });
    
    // 🚀 优化：只在必要时进行配置验证（总数变化或超出预期范围）
    const shouldValidate = !this.data.totalSelectedTags || 
                          Math.abs(total - this.data.totalSelectedTags) > 0 ||
                          total > 50; // 只在接近限制时验证
    
    if (shouldValidate) {
      try {
        const encoding = Config.advancedTagsConfig.encoding;
        const allTagsList = encoding.getAllTagsList();
        const maxAvailableTags = Math.min(allTagsList.length, 60);
        
        console.log('[updateTotalSelectedTags] 🏷️ 配置验证 (按需):', {
          userSelected: total,
          maxAvailable: maxAvailableTags,
          withinLimit: total <= maxAvailableTags
        });
        
        if (total > maxAvailableTags) {
          console.warn(`[updateTotalSelectedTags] ⚠️ 用户选择标签数${total}超过可用标签数${maxAvailableTags}`);
        }
      } catch (error) {
        console.warn('[updateTotalSelectedTags] 配置验证失败:', error);
      }
    } else {
      console.log('[updateTotalSelectedTags] ⚡ 跳过配置验证（无需重复检查）');
    }
    
    this.setData({
      totalSelectedTags: total
    });
  },

  // 🔧 KISS原则：简单的数据完整性检查
  isUserDataComplete() {
    const { advancedTags } = this.data;
    
    // 🎯 优化：基于实际问卷数据判断完整性，不依赖openid
    // 这样有问卷数据的用户可以直接显示名片页，避免重复填写
    
    // 检查标签数据完整性
    const totalSelectedTags = (advancedTags.professionalTags?.length || 0) + 
                             (advancedTags.interestTags?.length || 0) + 
                             (advancedTags.personalityTags?.length || 0) + 
                             (advancedTags.quirkyTags?.length || 0);
    
    // 检查基本个人信息：显示名称 + 至少4个标签
    const hasDisplayName = !!(advancedTags.displayName && advancedTags.displayName.trim());
    const hasEnoughTags = totalSelectedTags >= 4;
    const isComplete = hasDisplayName && hasEnoughTags;
    
    console.log('[isUserDataComplete] 数据完整性检查（优化版）:', {
      hasDisplayName,
      totalSelectedTags,
      hasEnoughTags,
      isComplete
    });
    
    return isComplete;
  },

  // 🔧 KISS原则：简化后的登录状态检查
  // 🎯 KISS静默登录：用户无感知的身份识别和数据同步
  silentLogin() {
    console.log('[silentLogin] 开始静默身份识别，用户完全无感知');
    
    // 首先加载本地数据，让用户立即看到内容
    this.loadAdvancedTags();
    
    // 检查本地是否有数据，设置初始视图
    const hasLocalData = this.isUserDataComplete();
    
    // 🖼️ 头像修复：优先使用本地存储的用户信息，避免覆盖头像数据
    const localUserInfo = wx.getStorageSync('userInfo') || {};
    console.log('[silentLogin] 🖼️ 检查本地用户信息:', {
      hasLocalUserInfo: !!localUserInfo.nickName,
      hasAvatarUrl: !!localUserInfo.avatarUrl,
      hasAvatarFileID: !!localUserInfo.avatarFileID,
      customAvatar: localUserInfo.customAvatar
    });
    
    // 🎯 设置基础用户信息（静默模式），优先保留本地头像信息
    const initialUserInfo = {
      nickName: localUserInfo.nickName || '匿名用户',
      avatarUrl: localUserInfo.avatarUrl || '',
      avatarFileID: localUserInfo.avatarFileID || null,
      customAvatar: localUserInfo.customAvatar || false,
      ...localUserInfo,  // 保留本地存储的完整信息
      ...this.data.userInfo  // 保留可能存在的其他信息
    };
    
    this.setData({
      hasUserInfo: true,  // 静默模式下视为有用户信息
      userInfo: initialUserInfo,
      viewMode: hasLocalData ? 'profile' : 'questionnaire',
      silentMode: true  // 标识静默模式
    });
    
    console.log('[silentLogin] 🖼️ 初始化用户信息完成:', {
      nickName: initialUserInfo.nickName,
      hasAvatarUrl: !!initialUserInfo.avatarUrl,
      hasAvatarFileID: !!initialUserInfo.avatarFileID,
      customAvatar: initialUserInfo.customAvatar
    });
    
    console.log('[silentLogin] 用户界面已显示，开始后台身份识别');
    
    // 后台静默获取身份标识
    wx.login({
      success: (res) => {
        if (res.code) {
          console.log('[silentLogin] 获取到登录凭证，调用云函数获取身份');
          this.getOpenIdSilently(res.code);
        } else {
          console.warn('[silentLogin] 获取登录凭证失败，降级到本地模式');
          this.fallbackToLocalMode();
        }
      },
      fail: (error) => {
        console.error('[silentLogin] wx.login失败，降级到本地模式:', error);
        this.fallbackToLocalMode();
      }
    });
    
    // 初始化当前步骤的分类
    this.initStepCategory(this.data.currentStep);
  },

  // 🎯 静默获取openid（用户无感知）
  getOpenIdSilently(code) {
    console.log('[getOpenIdSilently] 静默调用云函数获取身份标识');
    
    wx.cloud.callFunction({
      name: 'login',
      data: { code: code },
      success: (res) => {
        console.log('[getOpenIdSilently] 云函数调用成功:', res.result);
        
        if (res.result && res.result.openid) {
          const openid = res.result.openid;
          
          // 保存身份标识到本地存储
          wx.setStorageSync('openid', openid);
          
          // 更新状态（用户仍感觉匿名）
          this.setData({
            hasIdentity: true,     // 技术上有身份
            silentMode: true,      // 用户感觉静默
            openid: openid
          });
          
          console.log('[getOpenIdSilently] ✅ 身份识别成功，开始数据同步');
          
          // 开始智能数据同步
          this.smartDataSync();
          
        } else {
          console.warn('[getOpenIdSilently] 云函数返回格式异常，降级到本地模式');
          this.fallbackToLocalMode();
        }
      },
      fail: (error) => {
        console.error('[getOpenIdSilently] 云函数调用失败，降级到本地模式:', error);
        this.fallbackToLocalMode();
      }
    });
  },

  // 🎯 智能数据同步（有身份时云端，无身份时本地）
  smartDataSync() {
    console.log('[smartDataSync] 开始智能数据同步');
    
    const openid = this.data.openid || wx.getStorageSync('openid');
    
    if (openid) {
      console.log('[smartDataSync] 有身份标识，使用云端同步');
      this.syncDataFromCloud();
    } else {
      console.log('[smartDataSync] 无身份标识，使用本地模式');
      this.fallbackToLocalMode();
      
      // 🖼️ 头像修复：即使是本地模式，也要检查本地头像数据
      setTimeout(() => {
        const currentUserInfo = this.data.userInfo;
        if (currentUserInfo) {
          console.log('[smartDataSync] 🖼️ 本地模式下检查用户头像数据');
          this.checkAndRefreshAvatar(currentUserInfo);
        }
      }, 500);
    }
  },

  // 🎯 降级到本地模式（网络问题时的兜底）
  fallbackToLocalMode() {
    console.log('[fallbackToLocalMode] 降级到本地存储模式');
    
    this.setData({
      hasIdentity: false,
      silentMode: true,
      localOnlyMode: true  // 标识纯本地模式
    });
    
    // 用户界面保持不变，只是数据不会云端同步
    console.log('[fallbackToLocalMode] 本地模式已激活，用户体验不受影响');
  },

  // 保存高级标签数据到本地
  saveAdvancedTags() {
    try {
      wx.setStorageSync('advancedTags', this.data.advancedTags);
      console.log('[Index] 高级标签数据已保存到本地');
    } catch (error) {
      console.error('[Index] 保存高级标签数据失败:', error);
    }
  },

  // 🧹 检查并清理无效标签数据
  cleanupInvalidTags() {
    console.log('🧹 检查并清理无效标签数据');
    
    try {
      const savedData = wx.getStorageSync('advancedTags');
      if (savedData) {
        // 从配置中获取有效标签列表
        const Config = require('../../utils/config.js');
        const allConfigTags = Config.advancedTagsConfig.encoding.getAllTagsList();
        const validTags = new Set(allConfigTags);
        
        let hasInvalidTags = false;
        const cleanedData = { ...savedData };
        
        ['professionalTags', 'interestTags', 'personalityTags', 'quirkyTags'].forEach(field => {
          if (cleanedData[field]) {
            const originalLength = cleanedData[field].length;
            cleanedData[field] = cleanedData[field].filter(tag => validTags.has(tag));
            
            if (cleanedData[field].length !== originalLength) {
              hasInvalidTags = true;
              console.log(`🧹 清理 ${field}: ${originalLength} -> ${cleanedData[field].length}`);
            }
          }
        });
        
        if (hasInvalidTags) {
          wx.setStorageSync('advancedTags', cleanedData);
          console.log('✅ 无效标签已清理');
          
          // 显示用户友好提示
          wx.showModal({
            title: '标签数据更新',
            content: '检测到旧版本标签，已自动清理。建议重新选择标签以获得最佳匹配效果。',
            showCancel: false,
            confirmText: '知道了'
          });
          
          return true; // 返回true表示进行了清理
        }
      }
      return false; // 返回false表示无需清理
    } catch (error) {
      console.error('❌ 清理无效标签失败:', error);
      return false;
    }
  },

  // 从本地加载高级标签数据
  loadAdvancedTags() {
    try {
      // 🧹 先清理无效标签
      this.cleanupInvalidTags();
      
      const savedData = wx.getStorageSync('advancedTags');
      if (savedData) {
        // 🔍 验证本地数据是否来自新配置系统
        const hasValidStructure = savedData.professionalTags && savedData.interestTags && 
                                  savedData.personalityTags && savedData.quirkyTags;
        
        // 🧹 额外检查：如果本地数据的标签数量异常（可能是旧系统数据），直接忽略
        const totalLocalTags = (savedData.professionalTags?.length || 0) + 
                              (savedData.interestTags?.length || 0) + 
                              (savedData.personalityTags?.length || 0) + 
                              (savedData.quirkyTags?.length || 0);
        
        console.log('[loadAdvancedTags] 🔍 本地数据验证:', {
          hasValidStructure,
          totalLocalTags,
          savedDataKeys: Object.keys(savedData)
        });
        
        // 💥 如果本地数据异常（超过合理范围或结构不对），直接忽略
        if (!hasValidStructure || totalLocalTags > 60) {
          console.warn('[loadAdvancedTags] ⚠️ 本地数据异常，忽略旧数据:', {
            hasValidStructure,
            totalLocalTags,
            reason: '数据结构无效或标签数量超出限制'
          });
          // 清除异常数据
          wx.removeStorageSync('advancedTags');
          return;
        }
        
        // 设置默认的闪光阈值
        if (!savedData.threshold) {
          savedData.threshold = Config.advancedTagsConfig.threshold.default;
        }
        
        this.setData({
          advancedTags: { ...this.data.advancedTags, ...savedData }
        }, () => {
          this.refreshAllTagsActive();
          this.updateTotalSelectedTags(); // 🎯 强制重新计算
        });
        console.log('[loadAdvancedTags] ✅ 已加载本地高级标签数据，标签总数:', totalLocalTags);
      } else {
        console.log('[loadAdvancedTags] 📭 本地无标签数据，使用默认空状态');
        // 🔄 确保totalSelectedTags正确初始化为0
        this.updateTotalSelectedTags();
      }
    } catch (error) {
      console.error('[loadAdvancedTags] ❌ 加载本地高级标签数据失败:', error);
      // 发生错误时，确保清空数据并重新计算
      this.updateTotalSelectedTags();
    }
  },

  // 从云端同步数据
  syncDataFromCloud() {
    console.log('[syncDataFromCloud] 💡 开始增强版数据同步，包含一致性检查');
    
    // 💡 优化：记录同步开始时间和本地数据状态用于一致性检查
    const syncStartTime = Date.now();
    const localDataSnapshot = {
      userInfo: { ...this.data.userInfo },
      advancedTags: { ...this.data.advancedTags },
      totalLocalTags: (this.data.advancedTags.professionalTags?.length || 0) + 
                     (this.data.advancedTags.interestTags?.length || 0) + 
                     (this.data.advancedTags.personalityTags?.length || 0) + 
                     (this.data.advancedTags.quirkyTags?.length || 0)
    };
    
    console.log('[syncDataFromCloud] 📊 本地数据快照:', {
      totalLocalTags: localDataSnapshot.totalLocalTags,
      hasDisplayName: !!localDataSnapshot.advancedTags.displayName,
      hasAvatar: !!localDataSnapshot.userInfo.avatarUrl
    });

    wx.cloud.callFunction({
      name: 'getUserData',
      data: {
        dataType: 'advanced' // 请求高级标签数据
      },
      success: (res) => {
        console.log('[Index] 云端数据获取成功', res);
        if (res.result && res.result.success && res.result.data) {
          const cloudData = res.result.data;
          
          // 比较云端和本地数据的更新时间
          const localUpdateTime = this.data.advancedTags.updateTime || 0;
          const cloudUpdateTime = cloudData.updateTime ? new Date(cloudData.updateTime).getTime() : 0;
          
          if (cloudUpdateTime > localUpdateTime && cloudData.advancedTags) {
            // 🔍 验证云端数据是否异常
            const cloudTags = cloudData.advancedTags;
            const totalCloudTags = (cloudTags.professionalTags?.length || 0) + 
                                  (cloudTags.interestTags?.length || 0) + 
                                  (cloudTags.personalityTags?.length || 0) + 
                                  (cloudTags.quirkyTags?.length || 0);
            
            console.log('[syncDataFromCloud] 🔍 云端数据验证:', {
              totalCloudTags,
              hasValidStructure: !!(cloudTags.professionalTags && cloudTags.interestTags)
            });
            
            // 💥 如果云端数据异常，忽略云端数据
            if (totalCloudTags > 60) {
              console.warn('[syncDataFromCloud] ⚠️ 云端数据异常，忽略云端更新:', totalCloudTags);
              return;
            }
            
            console.log('[syncDataFromCloud] ✅ 使用云端数据（更新），标签数:', totalCloudTags);
            
            // 🖼️ 头像修复：构建完整的userInfo数据，包含头像信息
            let updatedUserInfo = { ...this.data.userInfo };
            if (cloudData.userInfo) {
              console.log('[syncDataFromCloud] 🖼️ 发现云端用户信息，同步头像数据');
              updatedUserInfo = {
                ...updatedUserInfo,
                ...cloudData.userInfo,
                // 确保头像关键字段被正确同步
                avatarUrl: cloudData.userInfo.avatarUrl || updatedUserInfo.avatarUrl,
                avatarFileID: cloudData.userInfo.avatarFileID || updatedUserInfo.avatarFileID,
                customAvatar: cloudData.userInfo.customAvatar !== undefined ? cloudData.userInfo.customAvatar : updatedUserInfo.customAvatar
              };
              console.log('[syncDataFromCloud] 🖼️ 头像数据同步完成:', {
                hasAvatarUrl: !!updatedUserInfo.avatarUrl,
                hasAvatarFileID: !!updatedUserInfo.avatarFileID,
                customAvatar: updatedUserInfo.customAvatar
              });
            }
            
            this.setData({
              advancedTags: { ...this.data.advancedTags, ...cloudData.advancedTags },
              userInfo: updatedUserInfo  // 🖼️ 头像修复：同步用户信息包括头像数据
            }, () => {
              this.refreshAllTagsActive();
              this.updateTotalSelectedTags(); // 🎯 强制重新计算
              this.saveAdvancedTags();
              
              // 🖼️ 头像修复：同步userInfo到本地存储
              wx.setStorageSync('userInfo', updatedUserInfo);
              
              // 🖼️ 头像修复：检查并刷新头像URL
              this.checkAndRefreshAvatar(updatedUserInfo);
              
              // 🎯 KISS原则关键改进：云端数据同步后立即检查并切换视图模式
              if (this.isUserDataComplete()) {
                console.log('[syncDataFromCloud] 云端数据完整，自动切换到profile模式');
                this.setData({ viewMode: 'profile' });
              } else {
                console.log('[syncDataFromCloud] 云端数据不完整，保持questionnaire模式');
              }
              
              // 🎨 如果云端数据包含MBTI类型，自动应用常亮灯颜色设置
              if (cloudData.advancedTags && cloudData.advancedTags.mbtiType) {
                console.log('[syncDataFromCloud] 🎨 检测到云端MBTI数据，应用常亮灯颜色:', cloudData.advancedTags.mbtiType);
                const mbtiCode = this.extractMBTICode(cloudData.advancedTags.mbtiType);
                this.sendIdleLightColor(mbtiCode);
              }
            });
          } else {
            console.log('[syncDataFromCloud] 📦 使用本地数据（较新或云端数据不存在）');
            // 🎯 即使使用本地数据，也要检查数据完整性并设置正确的视图模式
            if (this.isUserDataComplete()) {
              console.log('[syncDataFromCloud] 本地数据完整，切换到profile模式');
              this.setData({ viewMode: 'profile' });
            }
            
            // 🖼️ 头像修复：即使使用本地数据，也要检查和刷新头像
            const currentUserInfo = this.data.userInfo;
            if (currentUserInfo) {
              console.log('[syncDataFromCloud] 🖼️ 检查本地用户头像数据');
              this.checkAndRefreshAvatar(currentUserInfo);
            }
          }
          
          // 💡 优化：数据同步完成后进行一致性检查
          this.performDataConsistencyCheck(localDataSnapshot, syncStartTime);
        }
      },
      fail: (error) => {
        console.error('[Index] 云端数据同步失败:', error);
        wx.showToast({
          title: '数据同步失败',
          icon: 'none'
        });
      }
    });
  },

  // 💡 新增：数据同步一致性检查
  performDataConsistencyCheck(localSnapshot, syncStartTime) {
    const syncDuration = Date.now() - syncStartTime;
    const currentTotalTags = (this.data.advancedTags.professionalTags?.length || 0) + 
                            (this.data.advancedTags.interestTags?.length || 0) + 
                            (this.data.advancedTags.personalityTags?.length || 0) + 
                            (this.data.advancedTags.quirkyTags?.length || 0);
                            
    console.log('[performDataConsistencyCheck] 🔍 数据一致性检查开始:', {
      syncDuration: `${syncDuration}ms`,
      totalTagsChange: `${localSnapshot.totalLocalTags} → ${currentTotalTags}`,
      displayNameChange: localSnapshot.advancedTags.displayName !== this.data.advancedTags.displayName,
      avatarChange: localSnapshot.userInfo.avatarUrl !== this.data.userInfo.avatarUrl
    });
    
    // 检查1: 标签数量合理性
    if (currentTotalTags > 60) {
      console.warn('[performDataConsistencyCheck] ⚠️ 异常：标签总数过多 (' + currentTotalTags + ')');
      wx.showToast({
        title: '数据异常，请重新设置标签',
        icon: 'none',
        duration: 3000
      });
    }
    
    // 检查2: 用户信息完整性
    const hasRequiredFields = this.data.userInfo.nickName && 
                               this.data.advancedTags.displayName && 
                               this.data.userInfo.avatarUrl;
    
    if (!hasRequiredFields) {
      console.warn('[performDataConsistencyCheck] ⚠️ 警告：用户信息不完整');
      // 尝试修复缺失的显示名称
      if (!this.data.advancedTags.displayName && this.data.userInfo.nickName) {
        this.setData({
          'advancedTags.displayName': this.data.userInfo.nickName
        });
        console.log('[performDataConsistencyCheck] ✅ 已修复显示名称');
      }
      
      // 尝试修复缺失的头像
      if (!this.data.userInfo.avatarUrl) {
        this.setData({
          'userInfo.avatarUrl': '/assets/default-avatar.svg',
          'userInfo.customAvatar': false
        });
        console.log('[performDataConsistencyCheck] ✅ 已设置默认头像');
      }
    }
    
    // 检查3: 本地存储一致性
    try {
      const storedUserInfo = wx.getStorageSync('userInfo');
      const storedAdvancedTags = wx.getStorageSync('advancedTags');
      
      if (!storedUserInfo || !storedAdvancedTags) {
        console.warn('[performDataConsistencyCheck] ⚠️ 本地存储缺失，重新保存');
        wx.setStorageSync('userInfo', this.data.userInfo);
        wx.setStorageSync('advancedTags', this.data.advancedTags);
      }
    } catch (error) {
      console.error('[performDataConsistencyCheck] ❌ 本地存储检查失败:', error);
    }
    
    // 检查4: 界面状态一致性
    const shouldBeProfileMode = this.isUserDataComplete();
    if (shouldBeProfileMode && this.data.viewMode !== 'profile') {
      console.log('[performDataConsistencyCheck] 💡 数据完整但界面未切换，自动修正');
      this.setData({ viewMode: 'profile' });
    }
    
    console.log('[performDataConsistencyCheck] ✅ 数据一致性检查完成:', {
      totalTags: currentTotalTags,
      isDataComplete: shouldBeProfileMode,
      viewMode: this.data.viewMode,
      syncSuccess: true
    });
  },

  // 去抖辅助函数
  _debouncedRefresh() {
    // 清除之前的定时器
    if (this._refreshTimers.refreshAllTags) {
      clearTimeout(this._refreshTimers.refreshAllTags);
    }
    if (this._refreshTimers.updateTotalTags) {
      clearTimeout(this._refreshTimers.updateTotalTags);
    }
    
    // 设置新的去抖定时器
    this._refreshTimers.refreshAllTags = setTimeout(() => {
      this.refreshAllTagsActive();
    }, 50); // 50ms去抖延迟
    
    this._refreshTimers.updateTotalTags = setTimeout(() => {
      this.updateTotalSelectedTags();
    }, 50);
  },

  // 专业领域标签切换
  onProfessionalTagToggle(e) {
    const value = e.currentTarget.dataset.value;
    let tags = [...this.data.advancedTags.professionalTags];
    const index = tags.indexOf(value);
    
    console.log('[onProfessionalTagToggle] 切换标签:', value, '当前状态:', index > -1 ? '已选中' : '未选中');
    
    if (index > -1) {
      tags.splice(index, 1);
      console.log('[onProfessionalTagToggle] 移除标签:', value);
    } else {
      tags.push(value);
      console.log('[onProfessionalTagToggle] 添加标签:', value);
    }
    
    console.log('[onProfessionalTagToggle] 更新后的标签列表:', tags);
    
    this.setData({
      'advancedTags.professionalTags': tags
    }, () => {
      // 🚀 使用去抖刷新替代直接调用
      this._debouncedRefresh();
      this.saveAdvancedTags();
    });
  },

  // 兴趣爱好标签切换
  onInterestTagToggle(e) {
    const value = e.currentTarget.dataset.value;
    let tags = [...this.data.advancedTags.interestTags];
    const index = tags.indexOf(value);
    
    if (index > -1) {
      tags.splice(index, 1);
    } else {
      tags.push(value);
    }
    
    this.setData({
      'advancedTags.interestTags': tags
    }, () => {
      // 🚀 使用去抖刷新替代直接调用
      this._debouncedRefresh();
      this.saveAdvancedTags();
    });
  },

  // 性格标签切换（多选，建议2-3个）
  onPersonalityTagToggle(e) {
    const value = e.currentTarget.dataset.value;
    let tags = [...this.data.advancedTags.personalityTags];
    const index = tags.indexOf(value);
    
    if (index > -1) {
      tags.splice(index, 1);
    } else {
      // 多选：支持选择多个性格特质（建议2-3个）
      tags.push(value);
    }
    
    this.setData({
      'advancedTags.personalityTags': tags
    }, () => {
      // 🚀 使用去抖刷新替代直接调用
      this._debouncedRefresh();
      this.saveAdvancedTags();
    });
  },

  // 彩蛋标签切换
  onQuirkyTagToggle(e) {
    const value = e.currentTarget.dataset.value;
    let tags = [...this.data.advancedTags.quirkyTags];
    const index = tags.indexOf(value);
    
    if (index > -1) {
      tags.splice(index, 1);
    } else {
      tags.push(value);
    }
    
    this.setData({
      'advancedTags.quirkyTags': tags
    }, () => {
      // 🚀 使用去抖刷新替代直接调用
      this._debouncedRefresh();
      this.saveAdvancedTags();
    });
  },

  // 闪光阈值调整（滑动结束）
  onThresholdChange(e) {
    const value = parseInt(e.detail.value);
    const threshold = Config.advancedTagsConfig.threshold;
    const finalValue = Math.max(threshold.min, Math.min(threshold.max, value));
    
    console.log('[onThresholdChange] 🔥 阈值修改:', {
      原始输入: e.detail.value,
      解析数值: value,
      阈值限制: threshold,
      最终值: finalValue,
      最终值类型: typeof finalValue
    });
    
    this.setData({
      'advancedTags.threshold': finalValue
    });
    this.saveAdvancedTags();
    
    console.log('[onThresholdChange] ✅ 阈值已保存，当前值:', this.data.advancedTags.threshold);
    
    // 显示提示
    wx.showToast({
      title: `阈值设为 ${finalValue}`,
      icon: 'success',
      duration: 1500
    });
  },
  
  // 闪光阈值调整（滑动中）
  onThresholdChanging(e) {
    const value = parseInt(e.detail.value);
    this.setData({
      'advancedTags.threshold': value
    });
  },

  // 通用输入处理（第5页）
  onContactInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    
    this.setData({
      [`advancedTags.${field}`]: value
    });
    this.saveAdvancedTags();
  },

  // 上传二维码图片
  uploadQRCode() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res.tempFilePaths[0];
        this.uploadToCloud(filePath, 'qrcode').then(fileID => {
          if (fileID) {
            this.setData({
              'advancedTags.qrCodeUrl': fileID
            });
            this.saveAdvancedTags();
            wx.showToast({
              title: '二维码上传成功',
              icon: 'success'
                });
              }
        });
      },
      fail: (error) => {
        console.log('选择二维码图片失败:', error);
        if (error.errMsg.includes('cancel')) return;
        
        wx.showModal({
          title: '权限提示',
          content: '上传二维码需要相册和摄像头权限，请在设置中开启',
          confirmText: '去设置',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) wx.openSetting();
          }
        });
      }
    });
  },

  // 预览二维码大图
  previewQRCode() {
    if (this.data.advancedTags.qrCodeUrl) {
      wx.previewImage({
        current: this.data.advancedTags.qrCodeUrl,
        urls: [this.data.advancedTags.qrCodeUrl]
      });
    }
  },

  // 上传个人照片
  uploadPhotos() {
    const currentPhotos = this.data.advancedTags.photos || [];
    const maxCount = 3;
    const remainCount = maxCount - currentPhotos.length;
    
    if (remainCount <= 0) {
      wx.showToast({
        title: `最多只能上传${maxCount}张照片`,
        icon: 'none'
      });
      return;
    }
    
    wx.chooseImage({
      count: remainCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const uploadPromises = res.tempFilePaths.map(filePath => 
          this.uploadToCloud(filePath, 'photo')
        );
        
        Promise.all(uploadPromises).then(fileIDs => {
          const validFileIDs = fileIDs.filter(id => id);
          if (validFileIDs.length > 0) {
            this.setData({
              'advancedTags.photos': [...currentPhotos, ...validFileIDs]
            });
            this.saveAdvancedTags();
            wx.showToast({
              title: `成功上传${validFileIDs.length}张照片`,
              icon: 'success'
            });
          }
        });
      }
    });
  },

  // 删除照片
  deletePhoto(e) {
    const index = e.currentTarget.dataset.index;
    const photos = [...this.data.advancedTags.photos];
    photos.splice(index, 1);
    
    this.setData({
      'advancedTags.photos': photos
    });
    this.saveAdvancedTags();
  },

  // 上传文件到云存储
  uploadToCloud(filePath, type) {
    return new Promise((resolve) => {
      const openid = this.data.userInfo.openid;
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const fileName = `${type}_${openid}_${timestamp}_${random}.jpg`;
      
      wx.cloud.uploadFile({
        cloudPath: `${type}s/${fileName}`,
        filePath: filePath,
        success: (uploadRes) => {
          console.log(`[Index] ${type}上传成功:`, uploadRes.fileID);
          resolve(uploadRes.fileID);
        },
        fail: (error) => {
          console.error(`[Index] ${type}上传失败:`, error);
          wx.showToast({
            title: `${type}上传失败`,
            icon: 'none'
          });
          resolve(null);
        }
      });
    });
  },

  // 步骤切换
  nextStep() {
    // 验证当前步骤是否完成
    if (!this.validateAdvancedStep()) {
      return;
    }
    
    console.log('[nextStep] 当前状态:', {
      currentStep: this.data.currentStep,
      totalSelectedTags: this.data.totalSelectedTags
    });
    
    // 正常步骤切换
    if (this.data.currentStep < this.data.totalSteps) {
      const newStep = this.data.currentStep + 1;
      console.log('[nextStep] 步骤切换到:', newStep);
      this.setData({
        currentStep: newStep,
        currentStepConfig: this.getAdvancedStepConfig(newStep)
      }, () => {
        this.refreshAllTagsActive();
        // 初始化新步骤的分类
        this.initStepCategory(newStep);
      });
      this.scrollToTop();
    }
  },

  prevStep() {
    if (this.data.currentStep > 0) { // 🔧 从第0步开始，不能再往前
      const newStep = this.data.currentStep - 1;
      this.setData({
        currentStep: newStep,
        currentStepConfig: this.getAdvancedStepConfig(newStep)
      }, () => {
        this.refreshAllTagsActive();
        // 初始化返回步骤的分类
        this.initStepCategory(newStep);
      });
      this.scrollToTop();
      }
  },

  scrollToTop() {
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    });
  },

  // 验证高级标签步骤
  validateAdvancedStep() {
    const step = this.data.currentStep;
    const config = this.data.currentStepConfig;
    
    if (!config) return true;
    
    // 🔧 第0步MBTI选择：始终允许通过（可选步骤）
    if (step === 0) {
      return true;
    }
    
    // 第1-3步：验证标签选择
    if (step <= 3) {
      const tagField = this.getTagFieldByStep(step);
      const selectedTags = this.data.advancedTags[tagField] || [];
      
      // 检查最小标签数量
      if (config.minTags > 0 && selectedTags.length < config.minTags) {
        wx.showToast({
          title: `请至少选择${config.minTags}个标签`,
          icon: 'none'
        });
        return false;
      }
      
      // 第3步完成后检查总标签数量
      if (step === 3) {
        const totalTags = this.data.totalSelectedTags;
        const minTotalTags = config.minTotalTags || tagThemes.meta.minTotalTags || 4; // 优先从步骤配置获取
        if (totalTags < minTotalTags) {
          wx.showToast({
            title: this.data.texts.validateError || `请至少选择${minTotalTags}个标签才能继续`,
            icon: 'none'
          });
          return false;
        }
      }
    }
    
    // 第4步：验证必填信息
    if (step === 4) {
      if (!this.data.advancedTags.displayName || this.data.advancedTags.displayName.trim() === '') {
        wx.showToast({
          title: '请填写称呼',
          icon: 'none'
        });
        return false;
      }
    }
    
    // 第5步：彩蛋标签（可选，不需要验证）
    if (step === 5) {
      return true;
    }
    
    return true;
  },

  // 根据步骤获取对应的标签字段名
  getTagFieldByStep(step) {
    const fieldMap = {
      1: 'professionalTags',
      2: 'interestTags', 
      3: 'personalityTags',
      5: 'quirkyTags' // 第5步是彩蛋标签，第4步是个人信息设置
    };
    return fieldMap[step];
  },

  // 解码验证功能（只验证前3页）
  verifyEncoding(encodedString) {
    try {
      const tagThemes = require('../../config/tagThemes.js');
      const encoding = Config.advancedTagsConfig.encoding;
      const steps = tagThemes.getAllStepsConfig();
      // 只获取前3页的标签列表
      const encodingSteps = steps.slice(0, 3);
      const allTagsList = encoding.getAllTagsList(encodingSteps);
      
      console.log('[verifyEncoding] 开始解码（前3页）:', encodedString);
      
      // 解码
      const decodedBinary = encoding.decode(encodedString);
      console.log('[verifyEncoding] 解码二进制数组长度:', decodedBinary.length);
      
      // 获取选中的标签
      const selectedTags = [];
      decodedBinary.forEach((isSelected, index) => {
        if (isSelected && index < allTagsList.length) {
          selectedTags.push(allTagsList[index].tag);
        }
      });
      
      console.log('[verifyEncoding] 解码得到的选中标签（前3页）:', selectedTags);
      
      return {
        success: true,
        selectedTags: selectedTags,
        binaryArray: decodedBinary,
        totalTags: allTagsList.length
      };
    } catch (error) {
      console.error('[verifyEncoding] 解码失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // 🔍 验证用户标签与配置的一致性
  validateTagsAgainstConfig() {
    console.log('🔍 验证用户标签与配置的一致性');
    
    try {
      // 获取当前配置的所有标签
      const Config = require('../../utils/config.js');
      const allConfigTags = Config.advancedTagsConfig.encoding.getAllTagsList();
      const validTags = new Set(allConfigTags);
      
      // 检查用户选择的标签
      const userSelectedTags = [
        ...(this.data.advancedTags.professionalTags || []),
        ...(this.data.advancedTags.interestTags || []),
        ...(this.data.advancedTags.personalityTags || []),
        ...(this.data.advancedTags.quirkyTags || [])
      ];
      
      const invalidTags = userSelectedTags.filter(tag => !validTags.has(tag));
      
      if (invalidTags.length > 0) {
        console.warn('⚠️ 检测到无效标签:', invalidTags);
        console.log('💡 可用标签列表前10个:', allConfigTags.slice(0, 10), '...');
        
        // 自动清理无效标签
        this.cleanupInvalidTags();
        
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ 标签验证失败:', error);
      return false;
    }
  },

  // 生成标签编码（支持动态标签数量，最多60个）
  generateTagsEncoding() {
    // 🔍 先验证标签有效性
    if (!this.validateTagsAgainstConfig()) {
      console.warn('⚠️ 标签验证失败，编码可能不准确');
    }
    
    const encoding = Config.advancedTagsConfig.encoding;
    
    // 🎯 关键修改：直接使用getAllTagsList()，它会自动使用外部配置
    const allTagsList = encoding.getAllTagsList();
    console.log('[generateTagsEncoding] 使用的标签列表:', allTagsList);
    console.log('[generateTagsEncoding] 实际标签数量:', allTagsList.length);
    
    // 获取用户选择的所有标签（排除MBTI，只用于兴趣编码）
    const userSelectedTags = [
      ...(this.data.advancedTags.professionalTags || []),
      ...(this.data.advancedTags.interestTags || []),
      ...(this.data.advancedTags.personalityTags || []), // 性格特质标签（多选）
      ...(this.data.advancedTags.quirkyTags || [])
    ];
    
    // 🔥 重要：MBTI不参与兴趣编码，独立处理常亮灯颜色
    console.log('[generateTagsEncoding] 🎯 MBTI类型（不参与编码）:', this.data.advancedTags.mbtiType);
    
    console.log('[generateTagsEncoding] 用户选择的标签:', userSelectedTags);
    console.log('[generateTagsEncoding] 📊 详细诊断: 用户标签数量=', userSelectedTags.length, ', 可用标签数量=', allTagsList.length);
    
    // 🚀 关键：创建固定60位的二进制数组
    const binaryArray = new Array(60).fill(false);
    
    // 🔍 诊断计数器
    let successMatches = 0;
    let failedMatches = [];
    
    // 🔒 安全映射：将用户选择的标签映射到对应位置
    userSelectedTags.forEach(selectedTag => {
      // 🐛 修复：allTagsList现在是字符串数组，不是对象数组
      const tagIndex = allTagsList.findIndex(tag => tag === selectedTag);
      
      // 🎯 关键安全检查：确保索引在有效范围内
      if (tagIndex >= 0 && tagIndex < allTagsList.length && tagIndex < 60) {
        binaryArray[tagIndex] = true;
        successMatches++;
        console.log(`[generateTagsEncoding] ✅ 标签 "${selectedTag}" 映射到位置 ${tagIndex}`);
      } else if (tagIndex >= 0 && tagIndex >= 60) {
        failedMatches.push({tag: selectedTag, reason: '超出60位限制', index: tagIndex});
        console.warn(`[generateTagsEncoding] ⚠️ 标签 "${selectedTag}" 位置 ${tagIndex} 超出60位限制，跳过`);
      } else if (tagIndex >= 0 && tagIndex >= allTagsList.length) {
        failedMatches.push({tag: selectedTag, reason: '超出标签列表范围', index: tagIndex});
        console.error(`[generateTagsEncoding] ❌ 标签 "${selectedTag}" 位置 ${tagIndex} 超出标签列表范围 ${allTagsList.length}，跳过`);
      } else {
        failedMatches.push({tag: selectedTag, reason: '在配置中未找到', index: tagIndex});
        console.warn(`[generateTagsEncoding] 🔍 标签 "${selectedTag}" 在配置中未找到，跳过`);
      }
    });
    
    // 🚨 详细诊断报告
    console.log(`[generateTagsEncoding] 🎯 匹配统计: 成功=${successMatches}, 失败=${failedMatches.length}`);
    if (failedMatches.length > 0) {
      console.error('[generateTagsEncoding] ❌ 失败的标签匹配:', failedMatches);
      console.log('[generateTagsEncoding] 💡 可用标签列表前10个:', allTagsList.slice(0, 10));
    }
    
    // ⚠️ 零匹配警告
    if (successMatches === 0 && userSelectedTags.length > 0) {
      console.error('[generateTagsEncoding] 🚨 严重错误：没有任何用户标签匹配到编码系统！');
      console.error('[generateTagsEncoding] 🔍 用户选择的标签:', userSelectedTags);
      console.error('[generateTagsEncoding] 🔍 系统可用标签:', allTagsList.slice(0, 20));
      console.error('[generateTagsEncoding] 💊 建议：清除本地存储后重新选择标签');
    }
    
    const selectedCount = binaryArray.filter(x => x).length;
    console.log('[generateTagsEncoding] 60位二进制数组长度:', binaryArray.length);
    console.log('[generateTagsEncoding] 选中标签数量:', selectedCount);
    console.log('[generateTagsEncoding] 选中的位置:', 
      binaryArray.map((selected, index) => selected ? index : -1).filter(index => index !== -1)
    );
    
    // 调用编码函数（应该产生10字节编码）
    const encodedTags = encoding.encode(binaryArray);
    console.log('[generateTagsEncoding] 生成编码:', encodedTags);
    console.log('[generateTagsEncoding] 编码长度:', encodedTags.length, '(预期10字节)');
    
    // 🎯 保存编码到本地存储，供硬件连接时使用
    try {
      wx.setStorageSync('lastGeneratedEncoding', encodedTags);
      wx.setStorageSync('lastEncodingTime', Date.now());
      console.log('🎯 [编码保存] 已保存编码到本地存储:', encodedTags);
    } catch (error) {
      console.error('❌ [编码保存] 保存失败:', error);
    }
    
    return {
      encoded: encodedTags,
      binaryArray: binaryArray,
      allTagsList: allTagsList,
      selectedTags: userSelectedTags
    };
  },

  // 生成标签配置哈希值
  generateTagConfigHash(selectedTags) {
    // 使用标签的排序数组生成哈希
    const sortedTags = [...selectedTags].sort();
    const jsonString = JSON.stringify(sortedTags);
    
    // 简单的哈希函数（小程序环境没有crypto模块）
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    // 转换为16进制字符串并取前16位
    return Math.abs(hash).toString(16).substring(0, 16).padStart(16, '0');
  },

  // 生成新格式编码
  generateNewFormatEncoding(oldFormatEncoded, threshold, uniqueId) {
    console.log('[generateNewFormatEncoding] 🚀 开始生成新格式编码');
    console.log('[generateNewFormatEncoding] 📥 接收到的参数:', {
      oldFormatEncoded: oldFormatEncoded,
      oldFormatLength: oldFormatEncoded?.length,
      threshold: threshold,
      thresholdType: typeof threshold,
      uniqueId: uniqueId,
      uniqueIdType: typeof uniqueId,
      状态位: '固定为0'
    });
    
    const encoding = Config.advancedTagsConfig.encoding;
    
    // 将编码解码为二进制数组
    const decodedArray = encoding.decode(oldFormatEncoded);
    console.log('[generateNewFormatEncoding] 🔄 解码的二进制数组长度:', decodedArray.length);
    console.log('[generateNewFormatEncoding] 🔍 解码结果前10位:', decodedArray.slice(0, 10));
    
    // 确保数组长度为60位
    const paddedArray = [...decodedArray];
    while (paddedArray.length < 60) {
      paddedArray.push(false);
    }
    // 如果超过60位，截取前60位
    const finalArray = paddedArray.slice(0, 60);
    
    console.log('[generateNewFormatEncoding] 📊 60位数组处理结果:', {
      原始长度: decodedArray.length,
      填充后长度: paddedArray.length,
      最终长度: finalArray.length,
      选中位数: finalArray.filter(x => x).length,
      选中位置: finalArray.map((val, idx) => val ? idx : -1).filter(idx => idx !== -1).slice(0, 10)
    });
    
    // 🔍 特别检查threshold的数据来源
    console.log('[generateNewFormatEncoding] 🔥 阈值数据来源追踪:', {
      传入阈值: threshold,
      数据类型: typeof threshold,
      是否为数字: typeof threshold === 'number',
      是否有效: !isNaN(threshold) && threshold > 0,
      字符映射预览: `阈值${threshold}应映射为'${encoding.charMap[threshold] || '无效'}'`
    });
    
    // 使用config.js中的新格式编码函数
    const newFormatString = encoding.encodeNewFormat(finalArray, threshold, uniqueId);
    
    console.log('[generateNewFormatEncoding] 🎯 编码完成:', {
      输入参数: { threshold, uniqueId },
      输出结果: newFormatString,
      结果长度: newFormatString.length,
      最后4位: newFormatString.slice(-4)
    });
    
    // 🚨 立即进行解码验证
    try {
      const decoded = encoding.decodeNewFormat(newFormatString);
      console.log('[generateNewFormatEncoding] ✅ 解码验证成功:', {
        解码阈值: decoded.threshold,
        原始阈值: threshold,
        阈值匹配: decoded.threshold === threshold,
        解码ID: decoded.uniqueId,
        原始ID: uniqueId,
        ID匹配: decoded.uniqueId === uniqueId
      });
      
      // 🚨 检查关键不匹配
      if (decoded.threshold !== threshold) {
        console.error('[generateNewFormatEncoding] ❌ 阈值编码失败！编码前后不一致');
      }
      if (decoded.uniqueId !== uniqueId) {
        console.error('[generateNewFormatEncoding] ❌ 唯一ID编码失败！编码前后不一致');
      }
      // 状态位固定为'0'，无需验证
    } catch (decodeError) {
      console.error('[generateNewFormatEncoding] ❌ 解码验证失败:', decodeError);
    }
    
    return newFormatString;
  },

  // 提交表单 - 🎯 KISS适配静默登录
  async submitForm() {
    if (!this.validateAdvancedStep()) {
      return;
    }
    
    // 🎯 获取身份标识（静默登录模式）
    let currentOpenId = this.data.openid || wx.getStorageSync('openid');
    
    console.log('[submitForm] 🔍 身份标识检查:', {
      silentMode: this.data.silentMode,
      hasIdentity: this.data.hasIdentity,
      openidFromData: this.data.openid,
      openidFromStorage: wx.getStorageSync('openid'),
      finalOpenId: currentOpenId
    });
    
    // 🎯 如果没有身份标识，尝试快速获取（用户仍无感知）
    if (!currentOpenId) {
      console.log('[submitForm] 无身份标识，尝试快速获取');
      
      try {
        const loginRes = await new Promise((resolve, reject) => {
          wx.login({
            success: resolve,
            fail: reject
          });
        });
        
        if (loginRes.code) {
          const cloudRes = await wx.cloud.callFunction({
            name: 'login',
            data: { code: loginRes.code }
          });
          
          if (cloudRes.result && cloudRes.result.openid) {
            currentOpenId = cloudRes.result.openid;
            wx.setStorageSync('openid', currentOpenId);
            this.setData({ openid: currentOpenId, hasIdentity: true });
            console.log('[submitForm] ✅ 快速获取身份成功');
          }
        }
      } catch (error) {
        console.warn('[submitForm] 快速获取身份失败，使用本地模式:', error);
      }
    }
    
    // 🎯 如果仍然没有身份标识，使用匿名提交模式
    if (!currentOpenId) {
      console.log('[submitForm] 无法获取身份，启用匿名提交模式');
      currentOpenId = 'anonymous_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      this.setData({ localOnlyMode: true });
    }
    
    this.setData({ isSubmitting: true });
    
    // 生成标签编码
    const tagEncoding = this.generateTagsEncoding();
    
    // 检查是否启用新格式
    const enableNewFormat = true; // 默认启用新格式
    
    // 🔍 详细检查threshold的获取过程
    console.log('[submitForm] 🔥 阈值获取分析:', {
      'advancedTags对象': this.data.advancedTags,
      '阈值字段存在': 'threshold' in this.data.advancedTags,
      '阈值原始值': this.data.advancedTags.threshold,
      '阈值类型': typeof this.data.advancedTags.threshold,
      '是否为undefined': this.data.advancedTags.threshold === undefined,
      '是否为null': this.data.advancedTags.threshold === null,
      '是否为0': this.data.advancedTags.threshold === 0,
      '配置默认值': Config.advancedTagsConfig.threshold.default
    });
    
    const threshold = this.data.advancedTags.threshold;
    console.log('[submitForm] 🎯 最终使用的阈值:', threshold, typeof threshold);
    
    let newFormatData = null;
    if (enableNewFormat) {
      // 生成标签配置哈希
      const tagConfigHash = this.generateTagConfigHash(tagEncoding.selectedTags);
      
      // 为新格式准备数据（将通过分配云函数获取uniqueId）
      newFormatData = {
        enabled: true,
        threshold: threshold,
        uniqueId: 0, // 临时值，后续通过allocateUniqueId云函数获取
        tagConfigHash: tagConfigHash
      };
    }
    
    // 准备提交数据 - 🎯 使用静默获取的身份标识
    const submitData = {
      openid: currentOpenId,
      userInfo: {
        ...this.data.userInfo,
        openid: currentOpenId,
        // 🖼️ 头像存储修复：确保头像关键字段被包含在提交中
        avatarFileID: this.data.userInfo.avatarFileID || null,
        customAvatar: this.data.userInfo.customAvatar || false
      },
      advancedTags: {
        professionalTags: this.data.advancedTags.professionalTags || [],
        interestTags: this.data.advancedTags.interestTags || [],
        personalityTags: this.data.advancedTags.personalityTags || [],
        quirkyTags: this.data.advancedTags.quirkyTags || [],
        mbtiType: this.data.advancedTags.mbtiType || null, // 添加MBTI类型字段
        idleLightColor: this.data.advancedTags.mbtiType ? 
          MBTIColorManager.getMBTIColor(this.extractMBTICode(this.data.advancedTags.mbtiType)) : 
          MBTIColorManager.getMBTIColor(''), // 使用统一颜色管理器，空值时返回春樱落霞色
        threshold: threshold,
        displayName: this.data.advancedTags.displayName || this.data.userInfo.nickName || '',
        contactInfo: this.data.advancedTags.contactInfo || '',
        personalTagsText: this.data.advancedTags.personalTagsText || '',
        qrCodeUrl: this.data.advancedTags.qrCodeUrl || '',
        photos: this.data.advancedTags.photos || [],
        updateTime: new Date(),
        // 添加编码数据
        encodedTags: tagEncoding.encoded,
        binaryArray: tagEncoding.binaryArray,
        allTagsList: tagEncoding.allTagsList,
        selectedTags: tagEncoding.selectedTags
      },
      // 新格式数据
      newFormat: newFormatData
    };
    
    console.log('[submitForm] 提交数据:', submitData);
    console.log('[submitForm] openid:', submitData.openid);
    console.log('[submitForm] 标签编码:', submitData.advancedTags.encodedTags);
    
    // 🔧 强制使用新格式，确保newFormatData存在
    if (!newFormatData) {
      console.warn('[submitForm] ⚠️ newFormatData为空，创建默认新格式数据');
      // 创建默认新格式数据
      const tagConfigHash = this.generateTagConfigHash(tagEncoding.selectedTags);
      newFormatData = {
        enabled: true,
        threshold: threshold,
        uniqueId: 0,
        tagConfigHash: tagConfigHash
      };
    }
    
    // 统一使用新格式，尝试分配uniqueId（带降级机制）
    if (true) { // 🔧 强制进入新格式分支
      console.log('[submitForm] 启用新格式，尝试分配uniqueId');
      
      console.log('[submitForm] 🆔 开始分配唯一ID，调用云函数allocateUniqueId');
      
      // 🎯 检查身份标识（静默登录模式）
      if (!submitData.openid) {
        console.warn('[submitForm] ⚠️ 身份标识缺失，使用降级方案');
        this.handleUniqueIdFailure(submitData, tagEncoding, newFormatData);
        return;
      }
      
      console.log('[submitForm] 📊 唯一ID分配参数:', {
        openid: submitData.openid,
        tagConfigHash: newFormatData.tagConfigHash,
        encodedTags: tagEncoding.encoded,
        encodedLength: tagEncoding.encoded.length,
        selectedTags: tagEncoding.selectedTags,
        threshold: newFormatData.threshold
      });
      
      wx.cloud.callFunction({
        name: 'allocateUniqueId',
        data: {
          openid: submitData.openid,
          tagConfigHash: newFormatData.tagConfigHash,
          selectedTags: tagEncoding.selectedTags,
          encodedTags: tagEncoding.encoded, // 添加编码用于数据库匹配
          threshold: newFormatData.threshold, // 传入阈值供云函数参考
          tagCount: tagEncoding.selectedTags.length // 传入标签数量
        },
        success: (allocateRes) => {
          console.log('[submitForm] 🆔 uniqueId分配云函数响应:', allocateRes);
          
          if (allocateRes.result && allocateRes.result.success) {
            // 更新新格式数据中的uniqueId
            newFormatData.uniqueId = allocateRes.result.uniqueId;
            submitData.newFormat = newFormatData;
            
            // 详细的ID分配结果解析
            console.log('[submitForm] ✅ 已获取uniqueId:', {
              分配的ID: newFormatData.uniqueId,
              ID类型: typeof newFormatData.uniqueId,
              ID范围检查: newFormatData.uniqueId >= 0 && newFormatData.uniqueId <= 4095,
              云函数返回: allocateRes.result
            });
            
            // 显示数据库分配的详细过程
            if (allocateRes.result.debugInfo) {
              console.log('[submitForm] 🔍 ID分配过程详情:', {
                标签配置哈希: allocateRes.result.debugInfo.tagConfigHash,
                分配前已用ID: allocateRes.result.debugInfo.beforeAllocation,
                分配后所有ID: allocateRes.result.debugInfo.afterAllocation,
                相同配置用户数: allocateRes.result.totalUsersWithSameConfig,
                是否新分配: allocateRes.result.isNewAssignment
              });
            }
            
            // 显示编码映射
            if (allocateRes.result.encoded) {
              console.log('[submitForm] 🎯 ID编码映射:', {
                数字ID: newFormatData.uniqueId,
                编码结果: allocateRes.result.encoded,
                完整说明: `ID ${newFormatData.uniqueId} → "${allocateRes.result.encoded}"`
              });
            }
            
            // 显示ID使用统计信息
            if (allocateRes.result.usedIdsList !== undefined || allocateRes.result.debugInfo) {
              // 计算当前ID使用情况
              const usedIds = allocateRes.result.usedIdsList || [];
              const totalCapacity = 4096;
              const usageRate = (allocateRes.result.totalUsersWithSameConfig / totalCapacity * 100).toFixed(2);
              
              console.log('[submitForm] 📊 当前ID使用情况:', {
                已使用ID列表: usedIds,
                总用户数: allocateRes.result.totalUsersWithSameConfig,
                ID池容量: totalCapacity,
                利用率: `${allocateRes.result.totalUsersWithSameConfig}/${totalCapacity} (${usageRate}%)`,
                是否新分配: allocateRes.result.isNewAssignment,
                当前分配ID: newFormatData.uniqueId
              });
            }
            
            // 使用新格式生成最终的编码
            const finalEncoding = this.generateNewFormatEncoding(
              tagEncoding.encoded, 
              newFormatData.threshold,
              newFormatData.uniqueId
            );
            
            console.log('[submitForm] 🎯 生成最终编码:', finalEncoding);
            
            // 更新编码
            submitData.advancedTags.encodedTags = finalEncoding;
            
            // 🔄 尝试同步新的Un字符串到设备页面（finalEncoding已经是16字节的完整Un字符串）
            try {
              console.log('[submitForm] 🔄 直接使用已生成的完整Un字符串:', finalEncoding);
              this.syncUnStringToDevice(finalEncoding);
            } catch (error) {
              console.error('[submitForm] ❌ 同步Un字符串失败:', error);
            }
            
            // 继续提交问卷
            this.doSubmitQuestionnaire(submitData, tagEncoding);
          } else {
            console.error('[submitForm] ❌ uniqueId分配失败，使用降级方案:', allocateRes.result);
            this.handleUniqueIdFailure(submitData, tagEncoding, newFormatData);
          }
        },
        fail: (error) => {
          console.error('[submitForm] ❌ uniqueId云函数调用失败，使用降级方案:', error);
          this.handleUniqueIdFailure(submitData, tagEncoding, newFormatData);
        }
      });
    }
  },

  // 处理uniqueId分配失败的降级方案
  handleUniqueIdFailure(submitData, tagEncoding, newFormatData) {
    console.log('[handleUniqueIdFailure] 🔄 使用改进的降级方案生成uniqueId');
    
    // 🚀 v5.3.0 改进的降级算法：增加多重随机因子确保唯一性
    const openid = this.data.userInfo.openid || '';
    const timestamp = Date.now();
    const microTimestamp = Date.now() + Math.random() * 1000; // 微秒级时间戳
    const randomSeed = Math.random().toString(36).substring(2, 15); // 随机字符串
    const userAgent = wx.getSystemInfoSync().model || 'unknown'; // 设备型号作为指纹
    const sessionId = wx.getStorageSync('sessionId') || Math.random().toString(36); // 会话ID
    
    // 生成设备指纹（基于openid + 设备信息）
    let deviceFingerprint = 0;
    const deviceString = openid + userAgent + sessionId;
    for (let i = 0; i < deviceString.length; i++) {
      deviceFingerprint = ((deviceFingerprint << 3) - deviceFingerprint) + deviceString.charCodeAt(i);
      deviceFingerprint = deviceFingerprint & deviceFingerprint;
    }
    
    // 组合所有随机因子
    const combinedString = openid + microTimestamp + tagEncoding.encoded + randomSeed + deviceFingerprint;
    
    // 使用多重hash算法增强随机性
    let hash1 = 0, hash2 = 0;
    for (let i = 0; i < combinedString.length; i++) {
      const char = combinedString.charCodeAt(i);
      hash1 = ((hash1 << 5) - hash1) + char;
      hash2 = ((hash2 << 7) + hash2) + char;
      hash1 = hash1 & hash1;
      hash2 = hash2 & hash2;
    }
    
    // 组合两个hash值，使用完整的0-4095范围
    const combinedHash = Math.abs(hash1 ^ hash2);
    let fallbackUniqueId = combinedHash % 4096; // 使用完整的0-4095范围
    
    console.log('[handleUniqueIdFailure] 🆔 改进降级uniqueId生成:', {
      输入openid: openid,
      时间戳: timestamp,
      微秒时间戳: microTimestamp,
      随机种子: randomSeed,
      设备型号: userAgent,
      会话ID: sessionId,
      设备指纹: deviceFingerprint,
      组合字符串长度: combinedString.length,
      hash1: hash1,
      hash2: hash2,
      组合hash: combinedHash,
      最终uniqueId: fallbackUniqueId,
      ID范围检查: fallbackUniqueId >= 0 && fallbackUniqueId <= 4095
    });
    
    newFormatData.uniqueId = fallbackUniqueId;
    submitData.newFormat = newFormatData;
    
    // 生成新格式编码（使用降级uniqueId）
    const finalEncoding = this.generateNewFormatEncoding(
      tagEncoding.encoded, 
      newFormatData.threshold,
      newFormatData.uniqueId
    );
    
    console.log('[handleUniqueIdFailure] 🎯 降级方案生成的最终编码:', finalEncoding);
    
    // 更新编码
    submitData.advancedTags.encodedTags = finalEncoding;
    
    // 显示降级提示但不阻断流程
    wx.showToast({
      title: `使用本地ID ${fallbackUniqueId} 提交`,
      icon: 'none',
      duration: 2000
    });
    
    // 继续提交问卷
    this.doSubmitQuestionnaire(submitData, tagEncoding);
  },

  // 实际提交问卷数据
  doSubmitQuestionnaire(submitData, tagEncoding) {
    wx.cloud.callFunction({
      name: 'submitQuestionnaire',
      data: submitData,
      success: (res) => {
        console.log('[Index] 高级标签提交成功', res);
        
        // 🔐 数据库最终写入确认（来自submitQuestionnaire云函数）
        console.log('[Index] 🔐 最终数据库写入确认:', {
          操作成功: res.result && res.result.success,
          云函数响应: res.result,
          提交的数据: {
            用户openid: submitData.openid ? submitData.openid.substring(0, 8) + '...' : '未提供',
            蓝牙名称: submitData.advancedTags.encodedTags,
            uniqueId: submitData.newFormat ? submitData.newFormat.uniqueId : null,
            阈值: submitData.newFormat ? submitData.newFormat.threshold : null,
            编码长度: submitData.advancedTags.encodedTags ? submitData.advancedTags.encodedTags.length : 0
          }
        });
        
        this.setData({ isSubmitting: false });
        
        if (res.result && res.result.success) {
          // 显示编码结果并切换到个人名片视图
          wx.showModal({
            title: '提交成功！',
            content: ` 编码统计:\n` +
                    `• 前3页标签数: ${tagEncoding.allTagsList.length}\n` +
                    `• 已选标签: ${tagEncoding.selectedTags.length}\n` +
                    ` 你的设备蓝牙:\n${submitData.advancedTags.encodedTags}\n\n` +
                    ` 即将切换到个人名片视图！\n`,
            showCancel: false,
            confirmText: '查看名片',
            success: () => {
              // 切换到个人名片视图
              this.switchToProfileView();
              
              // 🔄 新增：问卷提交成功后自动同步到BLE设备
              this.autoSyncToBleDevice();
            }
          });
        } else {
          console.error('[Index] 提交失败:', res.result);
          wx.showToast({
            title: res.result?.message || this.data.texts.submitError || '提交失败，请重试',
            icon: 'none',
            duration: 3000
          });
        }
      },
      fail: (error) => {
        console.error('[Index] 高级标签提交失败', error);
        this.setData({ isSubmitting: false });
        wx.showToast({
          title: `提交失败: ${error.errMsg || '网络错误'}`,
          icon: 'none',
          duration: 3000
        });
      }
    });
  },

  // 登录功能
  login() {
    // 💡 用户体验优化：在获取权限前先显示说明
    wx.showModal({
      title: '个人信息授权说明',
      content: '为了给您更好的体验，我们需要获取您的微信昵称和头像：\n\n• 自动填写您的显示名称\n• 生成个人数字名片\n• 方便朋友识别您的身份\n\n所有信息仅用于UnionLink功能，不会用于其他用途',
      confirmText: '我同意',
      cancelText: '取消',
      success: (modalRes) => {
        if (modalRes.confirm) {
          // 用户同意后再获取权限
          wx.getUserProfile({
            desc: '用于完善个人信息和生成数字名片',
      success: (res) => {
        console.log('[Index] 用户授权成功', res);
        const userInfo = res.userInfo;
        
        // 调用登录云函数获取openid
        wx.cloud.callFunction({
          name: 'login',
          success: (loginRes) => {
            console.log('[Index] 登录成功', loginRes);
            if (loginRes.result && loginRes.result.openid) {
              userInfo.openid = loginRes.result.openid;
            
              // 🎨 使用统一的默认头像
              if (!userInfo.avatarUrl || userInfo.avatarUrl.indexOf('132.232.99.205') > -1 || userInfo.avatarUrl.includes('bottts-neutral') || userInfo.avatarUrl.includes('dicebear')) {
                userInfo.avatarUrl = '/assets/default-avatar.svg';
                userInfo.customAvatar = false;
              }
              
              // 设置默认显示名称
              if (!this.data.advancedTags.displayName) {
                this.setData({
                  'advancedTags.displayName': userInfo.nickName
                });
                
                // 💡 用户体验优化：显示昵称自动填写提示
                wx.showToast({
                  title: `已自动使用您的微信昵称：${userInfo.nickName}`,
                  icon: 'success',
                  duration: 2500,
                  success: () => {
                    setTimeout(() => {
                      wx.showToast({
                        title: '可在下方点击昵称进行修改',
                        icon: 'none',
                        duration: 2000
                      });
                    }, 2600);
                  }
                });
              }
              
              // 保存用户信息
              wx.setStorageSync('userInfo', userInfo);
            this.setData({
              hasUserInfo: true,
                userInfo: userInfo
            });
            
              this.saveAdvancedTags();
            this.syncDataFromCloud();
            }
          },
          fail: (error) => {
            console.error('[Index] 登录失败', error);
            wx.showToast({
              title: '登录失败，请重试',
              icon: 'none'
            });
          }
        });
      },
      fail: (error) => {
        console.log('[Index] 用户取消授权', error);
        wx.showToast({
          title: '需要授权才能使用',
          icon: 'none'
        });
      }
    });
        } else {
          // 用户取消授权
          wx.showToast({
            title: '需要授权个人信息才能使用完整功能',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: () => {
        wx.showToast({
          title: '操作被取消',
          icon: 'none'
        });
      }
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后问卷数据将保留，确认退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo');
          getApp().globalData.userInfo = null;
          getApp().globalData.openid = '';
          getApp().globalData.logged = false;
          
          this.setData({
            hasUserInfo: false,
            userInfo: {},
            uploadedAvatarFileID: null
          });
        }
      }
    });
  },

  // 上传头像
  uploadAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res.tempFilePaths[0];
        
        wx.showLoading({
          title: '上传中...',
          mask: true
        });
        
        this.uploadToCloud(filePath, 'avatar').then(fileID => {
          wx.hideLoading();
          
          if (fileID) {
            // 获取临时访问URL
            wx.cloud.getTempFileURL({
              fileList: [fileID],
              success: (urlRes) => {
                if (urlRes.fileList && urlRes.fileList.length > 0) {
                  const tempURL = urlRes.fileList[0].tempFileURL;
                  
                  // 更新用户信息
                  const updatedUserInfo = {
                    ...this.data.userInfo,
                    avatarUrl: tempURL,
                    avatarFileID: fileID,
                    customAvatar: true
                  };

                  wx.setStorageSync('userInfo', updatedUserInfo);
                  this.setData({
                    userInfo: updatedUserInfo
                  });
                  
                  wx.showToast({
                    title: this.data.texts.avatarUploadSuccess || '头像上传成功',
                    icon: 'success'
                  });
                } else {
              wx.showToast({
                    title: this.data.texts.avatarProcessingFail || '头像处理失败',
                    icon: 'none'
              });
            }
          },
              fail: () => {
            wx.showToast({
                  title: this.data.texts.avatarProcessingFail || '头像处理失败',
                  icon: 'none'
            });
          }
        });
          } else {
          wx.showToast({
              title: this.data.texts.avatarUploadFail || '头像上传失败',
              icon: 'none'
          });
        }
        });
      },
      fail: (error) => {
        console.log('选择头像失败:', error);
        if (error.errMsg.includes('cancel')) return;
        
        wx.showModal({
          title: '权限提示',
          content: '上传头像需要相册和摄像头权限，请在设置中开启',
          confirmText: '去设置', 
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) wx.openSetting();
          }
        });
      }
    });
  },

  // 昵称编辑相关方法
  startEditNickname() {
    console.log('[Index] 开始编辑昵称');
    const currentName = this.data.advancedTags.displayName || this.data.userInfo.nickName || '';
    
    this.setData({
      editingNickname: true,
      tempNickname: currentName
    });
  },

  onNicknameInput(e) {
    this.setData({
      tempNickname: e.detail.value
    });
  },

  saveNickname() {
    console.log('[Index] 保存昵称:', this.data.tempNickname);
    
    const trimmedNickname = this.data.tempNickname.trim();
    
    // 验证昵称长度
    if (trimmedNickname.length === 0) {
      wx.showToast({
        title: '昵称不能为空',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    if (trimmedNickname.length > 20) {
      wx.showToast({
        title: '昵称长度不能超过20字符',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 简单敏感词过滤（可根据需要扩展）
    const sensitiveWords = ['管理员', '系统', '客服'];
    const hasSensitiveWord = sensitiveWords.some(word => trimmedNickname.includes(word));
    
    if (hasSensitiveWord) {
      wx.showToast({
        title: '昵称包含敏感词，请重新输入',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 保存昵称到advancedTags.displayName
    this.setData({
      'advancedTags.displayName': trimmedNickname,
      editingNickname: false,
      tempNickname: ''
    });
    
    // 触发标签刷新以重新编码
    this.refreshAllTags();
    
    // 显示保存成功提示
    wx.showToast({
      title: '昵称已更新',
      icon: 'success',
      duration: 1500
    });
    
    console.log('[Index] 昵称已保存:', trimmedNickname);
  },

  // 获取云存储文件的临时访问URL
  async getCloudFileURL(fileID) {
    try {
      const result = await wx.cloud.getTempFileURL({
        fileList: [fileID]
      });
      
      if (result.fileList && result.fileList.length > 0) {
        const fileInfo = result.fileList[0];
        if (fileInfo.status === 0) {
          return fileInfo.tempFileURL;
        }
      }
      return null;
    } catch (error) {
      console.error('[Index] 获取云存储文件URL失败', error);
      return null;
    }
  },

  // 刷新头像URL
  async refreshAvatarURL(fileID) {
    try {
      const tempURL = await this.getCloudFileURL(fileID);
      if (tempURL) {
        const updatedUserInfo = {
          ...this.data.userInfo,
          avatarUrl: tempURL
        };
        
        this.setData({
          userInfo: updatedUserInfo
        });
        
        wx.setStorageSync('userInfo', updatedUserInfo);
        console.log('[Index] 头像URL已刷新');
      } else {
        console.warn('[Index] 无法获取头像URL，切换到默认头像');
        const seed = this.data.userInfo.nickName || 'default';
        const updatedUserInfo = {
          ...this.data.userInfo,
          avatarUrl: '/assets/default-avatar.svg',
          customAvatar: false
        };
        
        this.setData({
          userInfo: updatedUserInfo
        });
        
        wx.setStorageSync('userInfo', updatedUserInfo);
      }
    } catch (error) {
      console.error('[Index] 刷新头像URL失败', error);
    }
  },

  // 检查并刷新头像
  async checkAndRefreshAvatar(userInfo) {
    try {
      console.log('[checkAndRefreshAvatar] 开始检查头像:', {
        hasCustomAvatar: userInfo.customAvatar,
        hasAvatarFileID: !!userInfo.avatarFileID,
        hasAvatarUrl: !!userInfo.avatarUrl,
        avatarUrlPreview: userInfo.avatarUrl?.substring(0, 50) + '...'
      });
      
      if (!userInfo.customAvatar || !userInfo.avatarFileID) {
        // 没有自定义头像，确保使用默认头像
        if (!userInfo.avatarUrl || userInfo.avatarUrl.startsWith('cloud://')) {
          const updatedUserInfo = {
            ...userInfo,
            avatarUrl: '/assets/default-avatar.svg',
            customAvatar: false
          };
          this.setData({ userInfo: updatedUserInfo });
          wx.setStorageSync('userInfo', updatedUserInfo);
          console.log('[checkAndRefreshAvatar] 已设置默认头像');
        }
        return;
      }

      // 有自定义头像，检查URL是否有效
      const needRefresh = !userInfo.avatarUrl || 
                         userInfo.avatarUrl.startsWith('cloud://') ||
                         userInfo.avatarUrl.includes('expired') ||
                         this.isAvatarUrlExpired(userInfo.avatarUrl);

      if (needRefresh) {
        console.log('[checkAndRefreshAvatar] 头像URL需要刷新，正在获取新URL...');
        
        // 💡 优化：增加重试机制
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            await this.refreshAvatarURL(userInfo.avatarFileID);
            console.log('[checkAndRefreshAvatar] 头像URL刷新成功');
            break;
          } catch (error) {
            retryCount++;
            console.warn(`[checkAndRefreshAvatar] 第${retryCount}次刷新失败:`, error);
            
            if (retryCount >= maxRetries) {
              console.error('[checkAndRefreshAvatar] 重试次数已达上限，降级到默认头像');
              const fallbackUserInfo = {
                ...userInfo,
                avatarUrl: '/assets/default-avatar.svg',
                customAvatar: false
              };
              this.setData({ userInfo: fallbackUserInfo });
              wx.setStorageSync('userInfo', fallbackUserInfo);
            } else {
              // 等待1秒后重试
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
      } else {
        // URL看起来正常，但验证一下是否真的能访问
        this.validateAvatarUrl(userInfo.avatarUrl, userInfo.avatarFileID);
      }
    } catch (error) {
      console.error('[checkAndRefreshAvatar] 头像检查过程发生错误:', error);
      
      // 💡 优化：发生错误时确保有合适的降级处理
      const fallbackUserInfo = {
        ...userInfo,
        avatarUrl: '/assets/default-avatar.svg',
        customAvatar: false
      };
      this.setData({ userInfo: fallbackUserInfo });
      wx.setStorageSync('userInfo', fallbackUserInfo);
    }
  },

  // 检查头像URL是否过期
  isAvatarUrlExpired(url) {
    if (!url || !url.includes('tcb-')) return true;
    
    // 微信云存储的临时URL一般有有效期，可以通过URL中的时间参数判断
    try {
      const urlObj = new URL(url);
      const expires = urlObj.searchParams.get('sign') || urlObj.searchParams.get('expires');
      if (expires) {
        const expiresTime = parseInt(expires) * 1000; // 转换为毫秒
        return Date.now() > expiresTime;
      }
    } catch (error) {
      console.log('[Index] 无法解析头像URL过期时间', error);
    }
    
    return false;
  },

  // 验证头像URL有效性
  async validateAvatarUrl(url, fileID) {
    try {
      console.log('[validateAvatarUrl] 开始验证头像URL有效性');
      
      // 💡 优化：使用wx.getImageInfo来验证图片是否可访问
      await new Promise((resolve, reject) => {
        wx.getImageInfo({
          src: url,
          success: (res) => {
            console.log('[validateAvatarUrl] 头像URL验证成功:', {
              width: res.width,
              height: res.height,
              type: res.type
            });
            resolve(res);
          },
          fail: (error) => {
            console.warn('[validateAvatarUrl] 头像URL验证失败:', error);
            reject(error);
          }
        });
      });
    } catch (error) {
      // URL无效，需要刷新
      console.log('[validateAvatarUrl] 头像URL无效，正在刷新...');
      try {
        await this.refreshAvatarURL(fileID);
      } catch (refreshError) {
        console.error('[validateAvatarUrl] 刷新头像URL也失败了:', refreshError);
        
        // 💡 优化：最终降级处理
        const fallbackUserInfo = {
          ...this.data.userInfo,
          avatarUrl: '/assets/default-avatar.svg',
          customAvatar: false
        };
        this.setData({ userInfo: fallbackUserInfo });
        wx.setStorageSync('userInfo', fallbackUserInfo);
      }
    }
  },

  // 通用输入事件处理
  onGenericInput(e) {
    const field = e.currentTarget.dataset.field;
    if (field) {
      this.setData({
        [`questionnaire.${field}`]: e.detail.value
      });
      this.saveQuestionnaire();
    }
  },

  // 通用选择事件处理
  onGenericSelect(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.currentTarget.dataset.value;
    if (field) {
      this.setData({
        [`questionnaire.${field}`]: value
      });
      this.saveQuestionnaire();
    }
  },

  // 保存问卷数据
  saveQuestionnaire() {
    wx.setStorageSync('questionnaire', this.data.questionnaire);
    wx.setStorageSync('questionnaireUpdateTime', new Date().toISOString());
  },

  // 切换到个人名片视图
  switchToProfileView() {
    console.log('[switchToProfileView] 切换到个人名片视图');
    
    // 生成编码信息用于显示
    const tagEncoding = this.generateTagsEncoding();
    
    this.setData({
      viewMode: 'profile',
      encodingInfo: {
        encoded: tagEncoding.encoded,
        length: tagEncoding.encoded.length,
        totalTags: tagEncoding.allTagsList.length,
        selectedCount: tagEncoding.selectedTags.length
      }
    });
    
    // 保存状态到本地
    wx.setStorageSync('viewMode', 'profile');
  },
  
  // 🔄 新增：问卷完成后自动同步到BLE设备
  async autoSyncToBleDevice() {
    try {
      console.log('🔄 [自动同步] 检查BLE设备连接状态，准备自动同步...');
      
      // 检查设备页面是否存在且已连接
      const pages = getCurrentPages();
      let devicePage = null;
      
      console.log('🔍 [自动同步] 当前页面栈:', pages.map(p => p.route));
      
      // 查找设备页面实例
      for (let page of pages) {
        if (page.route === 'pages/device/device') {
          devicePage = page;
          console.log('✅ [自动同步] 找到设备页面实例');
          break;
        }
      }
      
      if (!devicePage) {
        console.log('️ [自动同步] 设备页面未打开，跳过自动同步');
        return;
      }
      
      if (!devicePage.data.connected) {
        console.log('️ [自动同步] 设备未连接，跳过自动同步。连接状态:', devicePage.data.connected);
        return;
      }
      
      console.log('✅ [自动同步] 设备页面已打开且已连接，开始自动同步...');
      
      let successCount = 0;
      let totalItems = 1; // 蓝牙名称同步
      
      // 1. 同步Un字符串（蓝牙名称）
      const syncResult = await devicePage.syncUnStringToBle();
      if (syncResult) {
        successCount++;
        console.log('✅ 蓝牙名称同步成功');
      } else {
        console.log('⚠️ 蓝牙名称同步失败');
      }
      
      // 2. 🎨 新增：同步MBTI颜色设置（如果存在）
      if (this.data.advancedTags.mbtiType) {
        totalItems++;
        try {
          console.log('🎨 [自动同步] 检测到MBTI类型，开始同步颜色设置:', this.data.advancedTags.mbtiType);
          
          // 使用统一的MBTI颜色管理器同步颜色
          const colorResult = await MBTIColorManager.saveMBTIColor({
            mbtiType: this.data.advancedTags.mbtiType,
            source: 'questionnaire_submit',
            syncToCloud: false, // 云端已经在submitForm时保存了
            sendToDevice: true, // 发送到设备
            showFeedback: false // 不显示单独的反馈，统一在最后显示
          });
          
          if (colorResult.deviceSent) {
            successCount++;
            console.log('✅ MBTI颜色同步成功');
            
            if (devicePage.addNotification) {
              devicePage.addNotification(`🎨 MBTI颜色已同步: ${this.data.advancedTags.mbtiType}`);
            }
          } else {
            console.log('⚠️ MBTI颜色同步失败:', colorResult);
            
            if (devicePage.addNotification) {
              devicePage.addNotification(`⚠️ MBTI颜色同步失败，将在下次连接时重试`);
            }
          }
          
        } catch (colorError) {
          console.error('❌ MBTI颜色同步异常:', colorError);
          
          if (devicePage.addNotification) {
            devicePage.addNotification(`❌ MBTI颜色同步异常: ${colorError.message}`);
          }
        }
      }
      
      // 3. 显示综合结果
      if (successCount === totalItems) {
        console.log(`✅ 问卷更新后自动同步成功 (${successCount}/${totalItems})`);
        
        wx.showToast({
          title: '已全部同步到设备',
          icon: 'success',
          duration: 2000
        });
        
        if (devicePage.addNotification) {
          devicePage.addNotification(`✅ 问卷更新，所有设置已自动同步 (${successCount}/${totalItems})`);
        }
        
      } else if (successCount > 0) {
        console.log(`⚠️ 问卷更新后部分同步成功 (${successCount}/${totalItems})`);
        
        wx.showToast({
          title: `部分同步成功 (${successCount}/${totalItems})`,
          icon: 'none',
          duration: 3000
        });
        
        if (devicePage.addNotification) {
          devicePage.addNotification(`⚠️ 问卷更新，部分设置同步成功 (${successCount}/${totalItems})`);
        }
        
      } else {
        console.log('⚠️ 问卷更新后自动同步全部失败');
        
        wx.showToast({
          title: '设备同步失败',
          icon: 'none',
          duration: 2000
        });
        
        if (devicePage.addNotification) {
          devicePage.addNotification('⚠️ 问卷更新，但设备同步失败，请手动刷新');
        }
      }
      
    } catch (error) {
      console.error('❌ 自动同步过程中发生异常:', error);
      
      // 显示异常提示
      wx.showToast({
        title: '同步异常',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 切换到问卷编辑视图
  switchToQuestionnaireView() {
    console.log('[switchToQuestionnaireView] 切换到问卷编辑视图');
    
    // 刷新标签状态和统计
    this.refreshAllTagsActive();
    this.updateTotalSelectedTags();
    
    // 确保在合适的步骤
    if (this.data.currentStep === 4 && this.data.totalSelectedTags >= 4) {
      // 如果在第4步且已有足够标签，保持在第4步
      console.log('[switchToQuestionnaireView] 保持在第4步进行信息编辑');
    } else if (this.data.totalSelectedTags < 4) {
      // 如果标签不足，回到第一步（现在是第0步MBTI）
      this.setData({
        currentStep: 0
      });
      console.log('[switchToQuestionnaireView] 标签不足，回到第0步');
    }
    
    this.setData({
      viewMode: 'questionnaire'
    });
    
    // 保存状态到本地
    wx.setStorageSync('viewMode', 'questionnaire');
    
    // 初始化当前步骤的分类
    this.initStepCategory(this.data.currentStep);
    
    // 显示提示
    wx.showToast({
      title: '进入编辑模式',
      icon: 'success',
      duration: 1500
    });
  },

  // 检查用户是否已完成问卷
  checkUserCompletionStatus() {
    const totalSelectedTags = this.data.totalSelectedTags;
    const hasDisplayName = this.data.advancedTags.displayName && this.data.advancedTags.displayName.trim() !== '';
    
    // 判断用户是否已完成基本填写（有标签且有显示名称）
    const isCompleted = totalSelectedTags >= 4 && hasDisplayName;
    
    // 如果已完成且之前保存的视图模式是profile，则切换到profile视图
    const savedViewMode = wx.getStorageSync('viewMode');
    if (isCompleted && savedViewMode === 'profile') {
      this.switchToProfileView();
    }
    
    return isCompleted;
  },

  // 分享个人名片
  shareProfile() {
    console.log('[shareProfile] 分享个人名片');
    
    // 获取标签统计
    const totalTags = [
      ...(this.data.advancedTags.professionalTags || []),
      ...(this.data.advancedTags.interestTags || []),
      ...(this.data.advancedTags.personalityTags || []),
      ...(this.data.advancedTags.quirkyTags || [])
    ].length;
    
    // 生成分享内容（不包含编码信息）
    const shareContent = `🏷️ ${this.data.advancedTags.displayName || this.data.userInfo.nickName}的UnionLink数字名片\n\n` +
                        `📊 已选择标签: ${totalTags} 个\n` +
                        `🔥 闪光阈值: ${this.data.advancedTags.threshold} 个标签相同即闪光\n\n` +
                        `💡 扫码了解UnionLink数字身份系统`;
    
    // 复制到剪贴板
    wx.setClipboardData({
      data: shareContent,
      success: () => {
        wx.showToast({
          title: '名片信息已复制',
          icon: 'success'
        });
      }
    });
  },

  // 跳转到社群页面
  goToBriefing() {
    console.log('[goToBriefing] 跳转到社群页面');
    
    wx.switchTab({
      url: '/pages/briefing/briefing'
    });
  },

  // 初始化指定步骤的分类
  initStepCategory(step) {
    const stepConfig = this.getAdvancedStepConfig(step);
    if (stepConfig && stepConfig.categories && stepConfig.categories.length > 0) {
      // 如果当前步骤还没有选中的分类，则设置为第一个分类
      if (!this.data.currentCategory[step]) {
        this.setData({
          [`currentCategory.${step}`]: stepConfig.categories[0].name
        });
      }
    }
  },

  // 分类选择事件
  onCategorySelect(e) {
    const step = this.data.currentStep;
    const categoryName = e.currentTarget.dataset.category;
    
    console.log('[onCategorySelect] 选择分类:', {
      step: step,
      category: categoryName
    });
    
    this.setData({
      [`currentCategory.${step}`]: categoryName
    });
  },
  
  /**
   * 切换活动主题
   */
  switchTheme: function(themeName) {
    console.log('[switchTheme] 切换主题:', themeName);
    
    if (tagThemes.setTheme(themeName)) {
      // 重新加载主题
      this.loadTagTheme();
      
      // 清空已选择的标签
      this.setData({
        advancedTags: {
          professionalTags: [],
          interestTags: [],
          personalityTags: [],
          quirkyTags: [],
          threshold: (() => {
            try {
              const sharedConfig = require('../../utils/shared-config-loader.js');
              return sharedConfig.getDefaultTagThreshold();
            } catch (error) {
              console.warn('[Index] 无法加载配置，使用降级值2:', error.message);
              return 2;
            }
          })(),
          displayName: '',
          contactInfo: '',
          personalTagsText: '',
          qrCodeUrl: '',
          photos: []
        }
      });
      
      wx.showToast({
        title: `已切换到${this.data.currentTheme.name}`,
        icon: 'success'
      });
    } else {
      wx.showToast({
        title: '主题切换失败',
        icon: 'none'
      });
    }
  },
  
  /**
   * 预测LED灯光效果
   */
  predictLedEffect: function() {
    const { advancedTags } = this.data;
    
    // 收集所有已选择的标签
    const selectedTags = [
      ...advancedTags.professionalTags,
      ...advancedTags.interestTags,
      ...advancedTags.personalityTags,
      ...advancedTags.quirkyTags
    ];
    
    if (selectedTags.length === 0) {
      return '请先选择标签';
    }
    
    // 预测LED效果
    const effect = tagThemes.predictLedEffect(selectedTags);
    console.log('[predictLedEffect] LED效果预测:', effect);
    
    return effect;
  },

  /**
   * 同步Un字符串到设备页面
   * 当问卷提交成功生成新的Un格式后，尝试同步到已打开的设备页面
   */
  syncUnStringToDevice(newUnString) {
    console.log('[syncUnStringToDevice] 调用更新设备蓝牙名称服务');
    console.log('[syncUnStringToDevice] 处理更新蓝牙名称:', newUnString);
    
    try {
      // 获取当前页面栈
      const pages = getCurrentPages();
      console.log('[syncUnStringToDevice] 当前页面栈长度:', pages.length);
      
      // 查找设备页面
      let devicePage = null;
      for (let i = pages.length - 1; i >= 0; i--) {
        const page = pages[i];
        if (page.route === 'pages/device/device') {
          devicePage = page;
          console.log('[syncUnStringToDevice] 找到设备页面，位置:', i);
          break;
        }
      }
      
      if (devicePage && typeof devicePage.updateDeviceBluetoothName === 'function') {
        console.log('[syncUnStringToDevice] ✅ 找到设备页面更新函数，开始同步');
        
        const result = devicePage.updateDeviceBluetoothName(newUnString);
        
        console.log('[syncUnStringToDevice] 🔄 设备同步结果:', result);
        
        if (result.success) {
          console.log('[syncUnStringToDevice] ✅ 设备名称同步成功');
        } else {
          console.warn('[syncUnStringToDevice] ⚠️ 设备名称同步失败:', result.message);
        }
        
        return result;
      } else {
        const message = devicePage ? '设备页面未提供更新函数' : '找不到设备页面';
        console.warn('[syncUnStringToDevice] ⚠️', message + '，同步失败');
        
        return {
          success: false,
          message: message,
          fallback: '用户需要手动在设备页面更新'
        };
      }
      
    } catch (error) {
      console.error('[syncUnStringToDevice] ❌ 同步过程出错:', error);
      
      return {
        success: false,
        message: '同步过程出错: ' + error.message,
        error: error
      };
    }
  },
  
  // ===================== MBTI 选择器相关 =====================
  
  /**
   * 初始化MBTI选项
   */
  initMBTIOptions() {
    console.log('[initMBTIOptions] 初始化MBTI选项');
    
    try {
      const mbtiConfig = tagThemes.idleLightConfig;
      if (mbtiConfig && mbtiConfig.options) {
        this.setData({
          mbtiOptions: mbtiConfig.options,
          mbtiSelectedColor: this.data.advancedTags.mbtiType ? 
            MBTIColorManager.getMBTIColor(this.extractMBTICode(this.data.advancedTags.mbtiType)) : 
            MBTIColorManager.getMBTIColor('') // 使用统一颜色管理器，空值时返回春樱落霞色
        });
        console.log('[initMBTIOptions] ✅ MBTI选项初始化成功，共', mbtiConfig.options.length, '个选项');
      } else {
        console.error('[initMBTIOptions] ❌ 无法获取MBTI配置');
      }
    } catch (error) {
      console.error('[initMBTIOptions] ❌ 初始化MBTI选项失败:', error);
    }
  },
  
  /**
   * 显示MBTI选择器
   * 只允许在问卷编辑的第0步中调用
   */
  showMBTISelector() {
    // 🔒 权限检查：只允许在问卷编辑的第0步中修改常亮灯颜色
    if (this.data.currentStep !== 0) {
      console.log('[showMBTISelector] ❌ 权限受限：常亮灯颜色只能在问卷编辑过程中修改');
      wx.showToast({
        title: '请在编辑模式下修改',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    console.log('[showMBTISelector] ✅ 显示MBTI选择器 - 编辑模式');
    this.setData({
      showMBTISelectorModal: true
    });
  },
  
  /**
   * 关闭MBTI选择器
   */
  closeMBTISelector() {
    console.log('[closeMBTISelector] 关闭MBTI选择器');
    this.setData({
      showMBTISelectorModal: false
    });
  },
  
  /**
   * 选择MBTI类型
   */
  selectMBTI(e) {
    const { mbti, color } = e.currentTarget.dataset;
    console.log('[selectMBTI] 选择MBTI类型:', mbti, '颜色:', color);
    
    this.setData({
      'advancedTags.mbtiType': mbti,
      mbtiSelectedColor: color
    });
  },
  
  /**
   * 提取MBTI纯英文代码（去掉中文描述）
   * @param {string} mbtiFullName - 完整的MBTI名称，如"INTJ战略家"
   * @returns {string} - 纯英文MBTI代码，如"INTJ"
   */
  extractMBTICode(mbtiFullName) {
    if (!mbtiFullName || typeof mbtiFullName !== 'string') {
      return '';
    }
    
    // 使用正则表达式提取前4位英文字母
    const match = mbtiFullName.match(/^([A-Z]{4})/);
    return match ? match[1] : '';
  },
  
  /**
   * 确认MBTI选择
   */
  async confirmMBTISelection() {
    console.log('[confirmMBTISelection] 确认MBTI选择:', this.data.advancedTags.mbtiType);
    
    if (this.data.advancedTags.mbtiType) {
      // 🔧 转换MBTI格式：从"INTJ战略家"提取为"INTJ"
      const mbtiCode = this.extractMBTICode(this.data.advancedTags.mbtiType);
      console.log('[confirmMBTISelection] MBTI格式转换:', this.data.advancedTags.mbtiType, '->', mbtiCode);
      
      // 🚀 使用统一的MBTI颜色管理器保存
      try {
        const result = await MBTIColorManager.saveMBTIColor({
          mbtiType: mbtiCode,
          source: 'mbti_selection',
          syncToCloud: true,  // 保存到云数据库
          sendToDevice: true, // 立即发送到设备
          showFeedback: true  // 显示用户反馈
        });
        
        console.log('[confirmMBTISelection] MBTI颜色保存结果:', result);
        
        // 如果保存成功，更新本地显示的颜色
        if (result.success && result.color) {
          this.setData({
            mbtiSelectedColor: result.color
          });
        }
        
      } catch (error) {
        console.error('[confirmMBTISelection] MBTI颜色保存失败:', error);
        // 降级到原有的发送逻辑
        console.log('[confirmMBTISelection] 降级到原有发送逻辑');
        this.sendIdleLightColor(mbtiCode);
      }
    }
    
    this.closeMBTISelector();
  },
  
  /**
   * 获取MBTI类型对应的颜色
   * @deprecated 已废弃！请使用 MBTIColorManager.getMBTIColor() 替代
   * 此方法使用tagThemes.js颜色系统，与硬件传输的颜色不一致
   */
  getMBTIColor(mbtiType) {
    console.warn('[getMBTIColor] ⚠️ 此方法已废弃！请使用 MBTIColorManager.getMBTIColor() 替代');
    console.warn('[getMBTIColor] ⚠️ 当前方法使用tagThemes.js颜色，与硬件颜色不一致');
    
    try {
      const mbtiConfig = tagThemes.idleLightConfig;
      if (mbtiConfig && mbtiConfig.options) {
        const option = mbtiConfig.options.find(opt => opt.name === mbtiType);
        return option ? option.color : '#66ccff';
      }
    } catch (error) {
      console.error('[getMBTIColor] 获取MBTI颜色失败:', error);
    }
    return '#66ccff'; // 修复返回值bug
  },
  
  /**
   * 发送常亮灯颜色设置命令到硬件
   */
  async sendIdleLightColor(mbtiType) {
    console.log('[sendIdleLightColor] 🎨 发送常亮灯颜色设置:', mbtiType);
    
    try {
      // 🎯 彻底解决：统一使用MBTI颜色管理器，无降级逻辑
      const mbtiCode = this.extractMBTICode(mbtiType);
      const color = MBTIColorManager.getMBTIColor(mbtiCode);
      
      console.log('[sendIdleLightColor] 🎯 统一颜色系统 - MBTI格式转换和颜色获取:', {
        原始类型: mbtiType,
        提取代码: mbtiCode,
        最终颜色: color
      });
      
      // 解析十六进制颜色为RGB值（color现在永远不会为null）
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      
      // 构建颜色设置命令（使用正确的命令格式）
      const command = {
        type: 'set_idle_light_color',
        color: { r, g, b },
        brightness: 100,
        mbtiType: mbtiType,
        timestamp: Date.now()
      };
      
      const commandStr = JSON.stringify(command);
      console.log('[sendIdleLightColor] 🎨 发送的颜色命令:', commandStr);
      
      // 记录消息到列表
      const timestamp = new Date().toLocaleString();
      const sendMessage = `🎨 设置常亮灯颜色: ${mbtiType} (${color}) [${timestamp}]`;
      
      // 🔧 修复跨页面通信：总是保存到本地存储，让device页面在合适时机发送
      console.log('[sendIdleLightColor] 💾 保存颜色设置到本地存储，设备连接时自动发送');
      
      // 保存到本地存储（使用与device.js兼容的格式）
      wx.setStorageSync('pendingIdleLightColor', {
        color: command.color,  // RGB对象格式 {r, g, b}
        mbtiType: mbtiType,
        timestamp: Date.now()
      });
      
      // 🚀 尝试立即发送（如果设备页面可用且已连接）
      try {
        const pages = getCurrentPages();
        const devicePage = pages.find(page => page.route === 'pages/device/device');
        
        if (devicePage && devicePage.checkAndSendPendingIdleLightColor && devicePage.data.connected) {
          console.log('[sendIdleLightColor] 🔄 设备已连接，立即尝试发送颜色设置');
          await devicePage.checkAndSendPendingIdleLightColor();
        } else {
          console.log('[sendIdleLightColor] ⏳ 设备未连接，将在连接时自动发送');
        }
      } catch (deviceError) {
        console.warn('[sendIdleLightColor] ⚠️ 立即发送失败，将在设备连接时重试:', deviceError.message);
      }
      
      // 显示成功提示
      wx.showToast({
        title: `已设置为${mbtiType}常亮灯`,
        icon: 'success',
        duration: 2000
      });
      
    } catch (error) {
      console.error('[sendIdleLightColor] ❌ 发送常亮灯颜色失败:', error);
      
      wx.showToast({
        title: '颜色设置失败',
        icon: 'error',
        duration: 2000
      });
    }
  }
});
