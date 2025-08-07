// 引入全局配置
const Config = require('../../utils/config.js');

Page({
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
      personalityTags: [],
      quirkyTags: [],
      threshold: 3,
      displayName: '',
      contactInfo: '',
      personalTagsText: '',
      qrCodeUrl: '',
      photos: []
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
    currentStep: 1,
    totalSteps: 5, // 更新为5步（第4步是个人信息，第5步是彩蛋）
    // 使用新的标签系统
    useAdvancedTags: true, // 标识使用新的标签系统
    config: Config.advancedTagsConfig,
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
  },

  onShow: function() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected('/pages/index/index');
    }
  },

  onLoad: function(options) {
    console.log('[Index] 页面加载 - 使用高级标签系统', options);
    
    // 检查是否是从connect页面跳转过来的
    if (options.openid && options.viewMode === 'profile') {
      console.log('[Index] 从connect页面跳转，显示用户问卷:', options.openid);
      this.loadUserProfile(options.openid);
    } else {
      console.log('[Index] 正常加载页面');
    this.initTextConfig();
      this.initAdvancedTagsFromConfig();
    this.checkLoginStatus();
    }
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
    const questionnaireTheme = Config.advancedTagsConfig.meta.theme;
    if (Config.setTheme(questionnaireTheme)) {
      console.log('[Index] 文字主题已设置为:', questionnaireTheme);
    }

    // 初始化所有需要的文字
    const texts = Config.getTexts({
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
    const steps = Config.advancedTagsConfig.steps;
    
    console.log('[initAdvancedTagsFromConfig] 步骤配置:', steps.map(s => ({ id: s.id, title: s.title })));
    
    // 初始化各步骤的标签选项
    const tagOptions = {
      professional: this.initCategoryOptions(steps[0]), // 第1步：专业领域
      interest: this.initCategoryOptions(steps[1]), // 第2步：兴趣爱好
      personality: this.initCategoryOptions(steps[2]), // 第3步：性格
      quirky: this.initCategoryOptions(steps[4]) // 第5步：彩蛋标签（现在是第5步）
    };
    
    console.log('[initAdvancedTagsFromConfig] 初始化的标签选项:', {
      professional: tagOptions.professional.length,
      interest: tagOptions.interest.length,
      personality: tagOptions.personality.length,
      quirky: tagOptions.quirky.length
    });
    
    // 检查第5步配置
    console.log('[initAdvancedTagsFromConfig] 第5步配置:', steps[4]);
    console.log('[initAdvancedTagsFromConfig] 第5步标签选项:', tagOptions.quirky);
    
    // 初始化当前分类，为每步设置默认的第一个分类
    const currentCategory = {};
    steps.forEach((step, index) => {
      if (step.categories && step.categories.length > 0) {
        currentCategory[index + 1] = step.categories[0].name;
      }
    });
    
    console.log('[initAdvancedTagsFromConfig] 初始化的分类:', currentCategory);
    
    this.setData({
      tagOptions,
      currentCategory,
      currentStepConfig: this.getAdvancedStepConfig(1),
      totalSteps: Config.advancedTagsConfig.meta.totalSteps,
      'advancedTags.threshold': Config.advancedTagsConfig.threshold.default
    }, () => {
      // 初始化后刷新选项状态
      this.refreshAllTagsActive();
    });
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

  // 获取高级标签步骤配置
  getAdvancedStepConfig(step) {
    const steps = Config.advancedTagsConfig.steps;
    return steps.find(s => s.id === step) || null;
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
    }, () => {
      this.updateTotalSelectedTags();
    });
  },

  // 更新总选择标签数量
  updateTotalSelectedTags() {
    const { professionalTags, interestTags, personalityTags, quirkyTags } = this.data.advancedTags;
    const total = professionalTags.length + interestTags.length + personalityTags.length + quirkyTags.length;
    
    this.setData({
      totalSelectedTags: total
    });
  },

  // 检查登录状态
  checkLoginStatus() {
    // 首先加载本地数据
    this.loadAdvancedTags();
    
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.openid) {
      this.setData({
        hasUserInfo: true,
        userInfo: userInfo
      });
      
      // 同步云端数据
      this.syncDataFromCloud();
      
      // 检查用户完成状态并设置合适的视图模式
      setTimeout(() => {
        this.checkUserCompletionStatus();
        // 初始化当前步骤的分类
        this.initStepCategory(this.data.currentStep);
      }, 500); // 等待数据加载完成
    } else {
      console.log('[Index] 用户未登录');
      // 确保在未登录状态下显示问卷视图
      this.setData({
        viewMode: 'questionnaire'
      });
      // 初始化当前步骤的分类
      this.initStepCategory(this.data.currentStep);
    }
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

  // 从本地加载高级标签数据
  loadAdvancedTags() {
    try {
      const savedData = wx.getStorageSync('advancedTags');
      if (savedData) {
        // 设置默认的闪光阈值
        if (!savedData.threshold) {
          savedData.threshold = Config.advancedTagsConfig.threshold.default;
        }
        
        this.setData({
          advancedTags: { ...this.data.advancedTags, ...savedData }
        }, () => {
          this.refreshAllTagsActive();
        });
        console.log('[Index] 已加载本地高级标签数据');
      }
    } catch (error) {
      console.error('[Index] 加载本地高级标签数据失败:', error);
    }
  },

  // 从云端同步数据
  syncDataFromCloud() {
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
            console.log('[Index] 使用云端数据（更新）');
            this.setData({
              advancedTags: { ...this.data.advancedTags, ...cloudData.advancedTags }
            }, () => {
              this.refreshAllTagsActive();
              this.saveAdvancedTags();
            });
          } else {
            console.log('[Index] 使用本地数据（较新或云端数据不存在）');
          }
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
      this.refreshAllTagsActive();
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
      this.refreshAllTagsActive();
      this.saveAdvancedTags();
    });
  },

  // 性格标签切换（MBTI单选）
  onPersonalityTagToggle(e) {
    const value = e.currentTarget.dataset.value;
    let tags = [...this.data.advancedTags.personalityTags];
    const index = tags.indexOf(value);
    
    if (index > -1) {
      tags.splice(index, 1);
    } else {
      // 单选：清空之前的选择，只保留当前选择
      tags = [value];
    }
    
    this.setData({
      'advancedTags.personalityTags': tags
    }, () => {
      this.refreshAllTagsActive();
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
      this.refreshAllTagsActive();
      this.saveAdvancedTags();
    });
  },

  // 闪光阈值调整
  onThresholdChange(e) {
    const value = parseInt(e.detail.value);
    const threshold = Config.advancedTagsConfig.threshold;
    const finalValue = Math.max(threshold.min, Math.min(threshold.max, value));
    
    this.setData({
      'advancedTags.threshold': finalValue
    });
    this.saveAdvancedTags();
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
      }
    });
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
    if (this.data.currentStep > 1) {
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
        if (totalTags < Config.advancedTagsConfig.meta.minTotalTags) {
          wx.showToast({
            title: this.data.texts.validateError || '请至少选择4个标签才能继续',
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
      const encoding = Config.advancedTagsConfig.encoding;
      const steps = Config.advancedTagsConfig.steps;
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

  // 测试编码功能（只测试前3页）
  testEncoding() {
    console.log('=== 开始测试编码功能（前3页） ===');
    
    try {
      const encoding = Config.advancedTagsConfig.encoding;
      const steps = Config.advancedTagsConfig.steps;
      
      // 只获取前3页的标签列表
      const encodingSteps = steps.slice(0, 3);
      const allTagsList = encoding.getAllTagsList(encodingSteps);
      console.log('前3页标签列表:', allTagsList);
      console.log('前3页总标签数量:', allTagsList.length);
      
      // 创建测试数据：选中前10个标签
      const testBinaryArray = allTagsList.map((_, index) => index < 10);
      console.log('测试二进制数组:', testBinaryArray.slice(0, 20), '...(共' + testBinaryArray.length + '个)');
      
      // 测试编码
      const encoded = encoding.encode(testBinaryArray);
      console.log('编码结果:', encoded);
      console.log('编码长度:', encoded.length);
      console.log('预期长度:', encoding.getEncodedLength(steps));
      
      // 测试解码
      const decoded = encoding.decode(encoded);
      console.log('解码结果前20位:', decoded.slice(0, 20));
      console.log('解码数组长度:', decoded.length);
      
      // 验证解码功能
      const verifyResult = this.verifyEncoding(encoded);
      console.log('解码验证结果:', verifyResult);
      
      // 验证一致性
      let isConsistent = true;
      const minLength = Math.min(testBinaryArray.length, decoded.length);
      for (let i = 0; i < minLength; i++) {
        if (testBinaryArray[i] !== decoded[i]) {
          console.error(`位置 ${i} 编解码不一致:`, testBinaryArray[i], '->', decoded[i]);
          isConsistent = false;
          break;
        }
      }
      
      if (isConsistent && verifyResult.success) {
        console.log('✅ 编码功能测试通过！');
        wx.showModal({
          title: '编码测试成功 ✅',
          content: `📊 测试结果（前3页）:\n` +
                  `• 前3页标签数: ${allTagsList.length}\n` +
                  `• 测试选中: 前10个标签\n` +
                  `• 编码长度: ${encoded.length}字符\n` +
                  `• 解码验证: ${verifyResult.selectedTags.length}个标签\n\n` +
                  `🔐 编码结果: ${encoded}\n\n` +
                  `💡 编码/解码一致性验证通过！\n` +
                  `📝 注意：第5页彩蛋标签不参与编码`,
          showCancel: false
        });
      } else {
        console.error('❌ 编码功能测试失败！');
        wx.showToast({
          title: '编码功能异常',
          icon: 'error'
        });
      }
      
    } catch (error) {
      console.error('编码测试出错:', error);
      wx.showToast({
        title: '编码测试失败',
        icon: 'error'
      });
    }
    
    console.log('=== 编码功能测试结束 ===');
  },

  // 生成标签编码（只对前3页进行编码）
  generateTagsEncoding() {
    const encoding = Config.advancedTagsConfig.encoding;
    const steps = Config.advancedTagsConfig.steps;
    
    // 只获取前3页的标签列表（专业领域、兴趣爱好、MBTI性格）
    const encodingSteps = steps.slice(0, 3); // 只取前3步
    const allTagsList = encoding.getAllTagsList(encodingSteps);
    console.log('[generateTagsEncoding] 编码标签列表（前3页）:', allTagsList);
    
    // 获取用户选择的前3页标签（不包括彩蛋标签）
    const userSelectedTags = [
      ...(this.data.advancedTags.professionalTags || []),
      ...(this.data.advancedTags.interestTags || []),
      ...(this.data.advancedTags.personalityTags || [])
    ];
    
    console.log('[generateTagsEncoding] 用户选择的前3页标签:', userSelectedTags);
    
    // 创建二进制数组：每个标签对应一个位，选中为true，未选为false
    const binaryArray = allTagsList.map(tagInfo => 
      userSelectedTags.includes(tagInfo.tag)
    );
    
    console.log('[generateTagsEncoding] 二进制数组长度:', binaryArray.length);
    console.log('[generateTagsEncoding] 选中的标签位置:', 
      binaryArray.map((selected, index) => selected ? index : -1).filter(index => index !== -1)
    );
    
    // 调用编码函数
    const encodedTags = encoding.encode(binaryArray);
    console.log('[generateTagsEncoding] 生成编码:', encodedTags);
    console.log('[generateTagsEncoding] 编码长度:', encodedTags.length);
    
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

  // 提交表单
  submitForm() {
    if (!this.validateAdvancedStep()) {
      return;
    }
    
    if (!this.data.hasUserInfo) {
      wx.showToast({
        title: this.data.texts.loginRequired || '请先登录',
        icon: 'none'
      });
      return;
    }
    
    // 检查用户信息和openid
    console.log('[submitForm] 用户信息检查:', {
      hasUserInfo: this.data.hasUserInfo,
      userInfo: this.data.userInfo,
      openid: this.data.userInfo.openid
    });
    
    if (!this.data.userInfo.openid) {
      console.error('[submitForm] openid不存在，尝试重新登录');
      wx.showToast({
        title: '登录状态异常，请重新登录',
        icon: 'none'
      });
      this.setData({
        hasUserInfo: false,
        userInfo: {}
      });
      return;
    }
    
    this.setData({ isSubmitting: true });
    
    // 生成标签编码
    const tagEncoding = this.generateTagsEncoding();
    
    // 准备提交数据 - 确保数据结构完整
    const submitData = {
      openid: this.data.userInfo.openid,
      userInfo: {
        ...this.data.userInfo
      },
      advancedTags: {
        professionalTags: this.data.advancedTags.professionalTags || [],
        interestTags: this.data.advancedTags.interestTags || [],
        personalityTags: this.data.advancedTags.personalityTags || [],
        quirkyTags: this.data.advancedTags.quirkyTags || [],
        threshold: this.data.advancedTags.threshold || 3,
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
      }
    };
    
    console.log('[submitForm] 提交数据:', submitData);
    console.log('[submitForm] openid:', submitData.openid);
    console.log('[submitForm] 标签编码:', submitData.advancedTags.encodedTags);
    
    // 调用云函数提交数据
    wx.cloud.callFunction({
      name: 'submitQuestionnaire',
      data: submitData,
      success: (res) => {
        console.log('[Index] 高级标签提交成功', res);
        this.setData({ isSubmitting: false });
        
        if (res.result && res.result.success) {
          // 显示编码结果并切换到个人名片视图
          wx.showModal({
            title: '提交成功！🎉',
            content: `📊 编码统计（前3页）:\n` +
                    `• 前3页标签数: ${tagEncoding.allTagsList.length}\n` +
                    `• 已选标签: ${tagEncoding.selectedTags.length}\n` +
                    `• 编码长度: ${tagEncoding.encoded.length} 字符\n\n` +
                    `🔐 你的标签编码:\n${tagEncoding.encoded}\n\n` +
                    `💡 即将切换到个人名片视图！\n` +
                    `📝 注意：第5页彩蛋标签不参与编码`,
            showCancel: false,
            confirmText: '查看名片',
            success: () => {
              // 切换到个人名片视图
              this.switchToProfileView();
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
    wx.getUserProfile({
      desc: '用于完善个人信息',
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
            
              // 生成默认头像
              if (!userInfo.avatarUrl || userInfo.avatarUrl.indexOf('132.232.99.205') > -1) {
                userInfo.avatarUrl = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(userInfo.nickName || 'default')}`;
                userInfo.customAvatar = false;
              }
              
              // 设置默认显示名称
              if (!this.data.advancedTags.displayName) {
                this.setData({
                  'advancedTags.displayName': userInfo.nickName
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
      }
    });
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
        const updatedUserInfo = {
          ...this.data.userInfo,
          avatarUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${this.data.userInfo.nickName || 'default'}`,
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
    if (!userInfo.customAvatar || !userInfo.avatarFileID) {
      // 没有自定义头像，确保使用默认头像
      if (!userInfo.avatarUrl || userInfo.avatarUrl.startsWith('cloud://')) {
        const updatedUserInfo = {
          ...userInfo,
          avatarUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${userInfo.nickName || 'default'}`,
          customAvatar: false
        };
        this.setData({ userInfo: updatedUserInfo });
        wx.setStorageSync('userInfo', updatedUserInfo);
      }
      return;
    }

    // 有自定义头像，检查URL是否有效
    const needRefresh = !userInfo.avatarUrl || 
                       userInfo.avatarUrl.startsWith('cloud://') ||
                       userInfo.avatarUrl.includes('expired') ||
                       this.isAvatarUrlExpired(userInfo.avatarUrl);

    if (needRefresh) {
      console.log('[Index] 头像URL需要刷新，正在获取新URL...');
      await this.refreshAvatarURL(userInfo.avatarFileID);
    } else {
      // URL看起来正常，但验证一下是否真的能访问
      this.validateAvatarUrl(userInfo.avatarUrl, userInfo.avatarFileID);
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
  validateAvatarUrl(url, fileID) {
    // 创建一个Image对象来测试URL是否可访问
    const img = new Image();
    img.onload = () => {
      console.log('[Index] 头像URL验证成功');
    };
    img.onerror = () => {
      console.log('[Index] 头像URL验证失败，需要刷新');
      this.refreshAvatarURL(fileID);
    };
    img.src = url;
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
      // 如果标签不足，回到第一步
      this.setData({
        currentStep: 1
      });
      console.log('[switchToQuestionnaireView] 标签不足，回到第1步');
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
  }
});