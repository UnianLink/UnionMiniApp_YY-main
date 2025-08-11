# 📱 小程序配置文件说明

这个文件夹包含了小程序的各种配置文件，开发者可以通过修改这些配置文件来调整程序行为，无需修改源码。

## 📋 配置文件列表

### `device-selection-config.js` - 智能设备选择配置
控制小程序端的RSSI滤波和智能设备识别算法的所有参数。

**主要配置项：**
- RSSI信号强度判断阈值
- 信号稳定性检测参数  
- 设备推荐置信度计算参数
- 推荐撤回控制参数

**使用方法：**
1. 修改配置文件中的参数值
2. 保存文件
3. 重新启动小程序即可生效（无需重新编译）

## 🔧 配置修改流程

### 快速调整场景

#### 1. 设备识别太敏感，频繁切换推荐
```javascript
// 在 device-selection-config.js 中修改：
RSSI_STRONG_THRESHOLD: 12,        // 从8增加到12
RSSI_STABLE_TIME: 6000,          // 从4000增加到6000
RSSI_STABILITY_THRESHOLD: 2.0,   // 从3.0降低到2.0
```

#### 2. 很难触发推荐，总是在等待状态
```javascript
// 在 device-selection-config.js 中修改：
RSSI_CONFIDENCE_MIN: 0.7,        // 从0.8降低到0.7
RSSI_STABILITY_THRESHOLD: 4.0,   // 从3.0提高到4.0
RSSI_STABLE_TIME: 3000,          // 从4000减少到3000
```

#### 3. 推荐了错误的远距离设备  
```javascript
// 在 device-selection-config.js 中修改：
RSSI_PROXIMITY_THRESHOLD: -35,   // 从-40提高到-35
RSSI_STRONG_THRESHOLD: 10,       // 从8增加到10
RSSI_CANDIDATE_MIN: -65,         // 从-70提高到-65
```

#### 4. 贴近的设备识别不出来
```javascript
// 在 device-selection-config.js 中修改：
RSSI_PROXIMITY_THRESHOLD: -45,   // 从-40降低到-45
RSSI_CONFIDENCE_MIN: 0.7,        // 从0.8降低到0.7
MIN_SAMPLES_FOR_STABILITY: 3,    // 从4降低到3
```

#### 5. 算法响应太慢
```javascript
// 在 device-selection-config.js 中修改：
RSSI_HISTORY_SIZE: 6,            // 从8降低到6
RSSI_STABLE_TIME: 3000,          // 从4000减少到3000
MIN_SAMPLES_FOR_STABILITY: 3,    // 从4降低到3
```

## 🎯 配置参数详解

### RSSI信号强度参数
- `RSSI_STRONG_THRESHOLD`: 设备间信号强度差异阈值（dBm）
- `RSSI_PROXIMITY_THRESHOLD`: 判定为"贴近手机"的信号阈值（dBm）
- `RSSI_CANDIDATE_MIN`: 参与算法的最小信号强度（dBm）

### 稳定性检测参数
- `RSSI_HISTORY_SIZE`: 用于计算滤波的历史样本数量
- `RSSI_STABILITY_THRESHOLD`: 信号标准差阈值（dBm）
- `RSSI_STABLE_TIME`: 需要稳定观察的时间（毫秒）
- `MIN_SAMPLES_FOR_STABILITY`: 计算稳定性的最小样本数

### 置信度计算参数
- `RSSI_CONFIDENCE_MIN`: 推荐设备的最小置信度（0-1）
- `CONFIDENCE_WEIGHT_TIME`: 时间因子在置信度中的权重
- `CONFIDENCE_WEIGHT_STABILITY`: 稳定性因子在置信度中的权重
- `CONFIDENCE_WEIGHT_SAMPLES`: 样本数因子在置信度中的权重

### 推荐控制参数
- `REVOCATION_CONFIDENCE_THRESHOLD`: 撤回推荐的置信度阈值
- `DEVICE_SELECTION_WAIT_TIME`: 等待更强设备出现的时间

## ⚠️ 注意事项

1. **参数范围**：请确保参数在合理范围内，参考配置文件中的建议值
2. **测试验证**：修改参数后建议在实际环境中测试效果
3. **备份原值**：修改前建议备份原配置，方便回滚
4. **重启生效**：修改配置后需要重新启动小程序才能生效

## 🚀 高级配置

### 调试模式
```javascript
// 启用详细日志和UI调试信息
ENABLE_SELECTION_DEBUG_LOG: true,
ENABLE_UI_DEBUG_INFO: true,
```

### 性能优化
```javascript
// 调整设备历史数据清理策略
DEVICE_HISTORY_CLEANUP_INTERVAL: 30000,  // 清理周期
DEVICE_HISTORY_RETENTION_TIME: 60000,    // 保留时间
```

## 📞 技术支持

如果遇到配置问题或需要进一步调整，请：
1. 查看配置文件中的详细注释和调试指南
2. 启用调试日志模式进行问题排查
3. 联系技术团队获取支持

---

**版本**：v1.0  
**最后更新**：2025年1月  
**兼容性**：小程序端智能设备选择系统