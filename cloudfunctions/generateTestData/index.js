// 云函数：生成测试用户数据
const cloud = require('wx-server-sdk')
const TestDataConfig = require('./questionnaire-config')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 随机选择函数
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// 随机选择多个元素
function randomChoices(arr, min = 1, max = 3) {
  const count = Math.floor(Math.random() * (max - min + 1)) + min
  const shuffled = [...arr].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

// 生成随机昵称
function generateNickname() {
  const nameConfig = TestDataConfig.nameGeneration
  
  return randomChoice(nameConfig.prefixes) + 
         randomChoice(nameConfig.names) + 
         randomChoice(nameConfig.suffixes)
}

// 生成随机城市
function generateCity() {
  const cityConfig = TestDataConfig.cityGeneration
  
  const province = randomChoice(cityConfig.provinces)
  const city = randomChoice(cityConfig.cities)
  return `${province} - ${city}`
}

// 生成虚拟openid
function generateOpenid() {
  return 'test_' + Math.random().toString(36).substr(2, 15) + Math.random().toString(36).substr(2, 15)
}



// 生成单个用户数据
function generateUser() {
  // 从配置获取选项数据
  const config = TestDataConfig
  const opts = config.options
  const probs = config.probabilities
  const ranges = config.multiSelectRanges
  
  const nickname = generateNickname()
  const city = generateCity()
  const region = city.split(' - ')
  
  // 生成问卷数据
  const questionnaire = {
    nickname: nickname,
    ageGroup: randomChoice(opts.ageGroups),
    gender: Math.random() > (1 - probs.genderFillRate) ? randomChoice(opts.genders) : '', // 配置概率填写性别
    city: city,
    region: region,
    profession: randomChoice(opts.professions),
    professionOther: '',
    currentStatus: randomChoice(opts.currentStatuses),
    interactionWillingness: randomChoice(opts.interactionWillingness),
    constellation: Math.random() > (1 - probs.constellationFillRate) ? randomChoice(opts.constellations) : '', // 配置概率填写星座
    constellationDate: { month: '', day: '' },
    mbtiKnown: randomChoice(opts.mbtiKnown),
    : Math.random() > (1 - probs.mbtiTypeFillRate) ? randomChoice(opts.mbtiTypes) : '', // 配置概率有MBTI类型
    interestTags: randomChoices(opts.interests, ranges.interests.min, ranges.interests.max),
    interestOther: '',
    techTrends: randomChoices(opts.techTrends, ranges.techTrends.min, ranges.techTrends.max),
    firstDevice: randomChoice(opts.firstDevices),
    mostImportantDevice: randomChoice(opts.mostImportantDevices),
    aiAttitude: randomChoice(opts.aiAttitudes),
    learningPreference: randomChoice(opts.learningPreferences),
    // 新增第8步：联系方式字段
    contactWillingness: randomChoice(opts.contactWillingness),
    contactInfo: ''
  }
  
  // 如果愿意展示联系方式，则生成随机联系方式
  if (questionnaire.contactWillingness === '愿意') {
    const templates = config.contactInfoTemplates
    const randomTemplate = randomChoice(templates)
    questionnaire.contactInfo = randomTemplate()
  }
  
  // 生成用户信息
  const userInfo = {
    nickName: nickname,
    avatarUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${nickname}`,
    openid: generateOpenid()
  }
  
  return {
    openid: userInfo.openid,
    userInfo: userInfo,
    questionnaire: questionnaire,
    createTime: db.serverDate(),
    updateTime: db.serverDate()
  }
}

exports.main = async (event, context) => {
  try {
    const userCount = TestDataConfig.meta.testUsersCount
    const batchSize = TestDataConfig.meta.batchSize
    
    console.log(`开始生成${userCount}个测试用户数据...`)
    
    // 生成配置数量的用户数据
    const users = []
    for (let i = 0; i < userCount; i++) {
      users.push(generateUser())
    }
    
    // 批量插入数据
    let successCount = 0
    let errorCount = 0
    
    // 分批插入，使用配置的批次大小
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize)
      try {
        await db.collection('users_bar').add({
          data: batch
        })
        successCount += batch.length
        console.log(`成功插入第 ${Math.floor(i/batchSize) + 1} 批数据，共 ${batch.length} 条`)
      } catch (error) {
        console.error(`第 ${Math.floor(i/batchSize) + 1} 批数据插入失败:`, error)
        errorCount += batch.length
      }
    }
    
    return {
      success: true,
      message: `测试数据生成完成`,
      details: {
        totalGenerated: userCount,
        successCount: successCount,
        errorCount: errorCount,
        theme: TestDataConfig.meta.theme
      }
    }
    
  } catch (error) {
    console.error('生成测试数据失败：', error)
    return {
      success: false,
      message: '生成测试数据失败',
      error: error.message
    }
  }
} 