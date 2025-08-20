/**
 * 统一配置文件 - JavaScript模块版本
 * 从硬件配置自动生成，与 shared-config.json 保持同步
 * 
 * 生成时间: 2025-08-21T05:41:20.233912
 * 源文件: Unian_esp32c3_ble/NimBLE_Beacon/main/include/common.h
 * 生成器: scripts/extract-config.py
 */

const sharedConfig = {
  metadata: {
    generated_at: "2025-08-21T05:41:20.233912",
    source_file: "Unian_esp32c3_ble/NimBLE_Beacon/main/include/common.h",
    generator: "scripts/extract-config.py",
    version: "1.0.0",
    description: "从硬件配置自动生成的统一配置文件"
  },

  config: {
    DEFAULT_TAG_THRESHOLD: {
      value: 2,
      type: "int",
      description: "默认擦肩信号闪光阈值",
      comment: "默认擦肩信号闪光阈值",
      source: "#define DEFAULT_TAG_THRESHOLD 2"
    },
    MAX_TOUCH_RECORDS: {
      value: 500,
      type: "int",
      description: "碰一碰列表最大记录数",
      comment: "",
      source: "#define MAX_TOUCH_RECORDS 500"
    },
    TOUCH_LIST_BATCH_SIZE: {
      value: 100,
      type: "int",
      description: "每批发送的设备数量",
      comment: "",
      source: "#define TOUCH_LIST_BATCH_SIZE 100"
    },
    TOUCH_LIST_BATCH_INTERVAL_MS: {
      value: 100,
      type: "int",
      description: "批次间隔时间(ms)",
      comment: "",
      source: "#define TOUCH_LIST_BATCH_INTERVAL_MS 100"
    },
    HIGH_PERFORMANCE_MODE: {
      value: 1,
      type: "int",
      description: "高性能模式开关",
      comment: "",
      source: "#define HIGH_PERFORMANCE_MODE  1"
    },
    BLUETOOTH_NAME_LEN: {
      value: 17,
      type: "int",
      description: "蓝牙名称长度",
      comment: "",
      source: "#define BLUETOOTH_NAME_LEN 17"
    }
  },

  // 简化访问接口
  values: {
    DEFAULT_TAG_THRESHOLD: 2,
    MAX_TOUCH_RECORDS: 500,
    TOUCH_LIST_BATCH_SIZE: 100,
    TOUCH_LIST_BATCH_INTERVAL_MS: 100,
    HIGH_PERFORMANCE_MODE: 1,
    BLUETOOTH_NAME_LEN: 17
  }
};

module.exports = sharedConfig;