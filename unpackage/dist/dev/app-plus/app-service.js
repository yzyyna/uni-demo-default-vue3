if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global = uni.requireGlobal();
  ArrayBuffer = global.ArrayBuffer;
  Int8Array = global.Int8Array;
  Uint8Array = global.Uint8Array;
  Uint8ClampedArray = global.Uint8ClampedArray;
  Int16Array = global.Int16Array;
  Uint16Array = global.Uint16Array;
  Int32Array = global.Int32Array;
  Uint32Array = global.Uint32Array;
  Float32Array = global.Float32Array;
  Float64Array = global.Float64Array;
  BigInt64Array = global.BigInt64Array;
  BigUint64Array = global.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const SERVICE_UUID = "FFF0";
  const CHAR_UUID = "FFF1";
  const _sfc_main$1 = {
    data() {
      return {
        // 状态管理
        isScanning: false,
        connected: false,
        connectionStatus: "未连接",
        // 设备信息
        deviceId: "",
        serviceId: "",
        characteristicId: "",
        // 数据交互
        sendMsg: "Hello from App",
        lastReadValue: "",
        // 日志
        logs: []
      };
    },
    onLoad() {
      this.initBluetooth();
    },
    onUnload() {
      this.closeConnection();
      this.closeBluetooth();
    },
    methods: {
      // --- 1. 初始化蓝牙模块 ---
      initBluetooth() {
        uni.openBluetoothAdapter({
          success: (res) => {
            this.addLog("蓝牙初始化成功");
            uni.onBLEConnectionStateChange((res2) => {
              this.connected = res2.connected;
              this.connectionStatus = res2.connected ? "已连接" : "已断开";
              if (!res2.connected) {
                this.deviceId = "";
                this.addLog("连接已断开");
              }
            });
            uni.onBLECharacteristicValueChange((res2) => {
              const hex = this.ab2hex(res2.value);
              const str = this.hexCharCodeToStr(hex);
              this.lastReadValue = str;
              this.addLog(`收到数据: ${str} (Hex: ${hex})`);
            });
          },
          fail: (err) => {
            this.addLog("蓝牙初始化失败，请检查蓝牙是否开启");
            uni.showToast({
              title: "请打开蓝牙",
              icon: "none"
            });
          }
        });
      },
      // --- 2. 扫描设备 ---
      startScan() {
        if (this.isScanning)
          return;
        this.isScanning = true;
        this.connectionStatus = "正在扫描...";
        this.logs = [];
        this.addLog("开始扫描 My Node BLE...");
        uni.startBluetoothDevicesDiscovery({
          allowDuplicatesKey: false,
          success: () => {
            this.onDeviceFound();
          },
          fail: (err) => {
            this.addLog("扫描启动失败: " + JSON.stringify(err));
            this.isScanning = false;
          }
        });
      },
      // --- 3. 监听发现设备 ---
      onDeviceFound() {
        uni.onBluetoothDeviceFound((res) => {
          res.devices.forEach((device) => {
            if (device.name === "My Node BLE" || device.localName === "My Node BLE") {
              this.addLog(`发现目标设备: ${device.deviceId}`);
              this.stopScan();
              this.connect(device.deviceId);
            }
          });
        });
      },
      stopScan() {
        uni.stopBluetoothDevicesDiscovery();
        this.isScanning = false;
      },
      // --- 4. 建立连接 ---
      connect(deviceId) {
        this.connectionStatus = "正在连接...";
        this.addLog(`尝试连接: ${deviceId}`);
        uni.createBLEConnection({
          deviceId,
          success: () => {
            this.connected = true;
            this.deviceId = deviceId;
            this.connectionStatus = "已连接";
            this.addLog("连接成功，正在获取服务...");
            setTimeout(() => {
              this.getServices(deviceId);
            }, 1e3);
          },
          fail: (err) => {
            this.addLog("连接失败: " + err.errMsg);
            this.connectionStatus = "连接失败";
          }
        });
      },
      // --- 5. 获取服务 ---
      getServices(deviceId) {
        uni.getBLEDeviceServices({
          deviceId,
          success: (res) => {
            const targetService = res.services.find((s) => s.uuid.toUpperCase().includes(
              SERVICE_UUID
            ));
            if (targetService) {
              this.serviceId = targetService.uuid;
              this.addLog(`找到服务: ${this.serviceId}`);
              this.getCharacteristics(deviceId, this.serviceId);
            } else {
              this.addLog("未找到 FFF0 服务");
            }
          }
        });
      },
      // --- 6. 获取特征值 ---
      getCharacteristics(deviceId, serviceId) {
        uni.getBLEDeviceCharacteristics({
          deviceId,
          serviceId,
          success: (res) => {
            const targetChar = res.characteristics.find((c) => c.uuid.toUpperCase().includes(
              CHAR_UUID
            ));
            if (targetChar) {
              this.characteristicId = targetChar.uuid;
              this.addLog(`找到特征值: ${this.characteristicId}`);
              this.notifyCharacteristic(deviceId, serviceId, this.characteristicId);
            } else {
              this.addLog("未找到 FFF1 特征值");
            }
          }
        });
      },
      // --- 7. 开启 Notify ---
      notifyCharacteristic(deviceId, serviceId, characteristicId) {
        uni.notifyBLECharacteristicValueChange({
          deviceId,
          serviceId,
          characteristicId,
          state: true,
          success: () => {
            this.addLog("Notify 监听已开启");
          },
          fail: (err) => {
            this.addLog("开启 Notify 失败: " + err.errMsg);
          }
        });
      },
      // --- 8. 写入数据 ---
      writeData() {
        if (!this.sendMsg)
          return;
        const buffer = this.string2buffer(this.sendMsg);
        uni.writeBLECharacteristicValue({
          deviceId: this.deviceId,
          serviceId: this.serviceId,
          characteristicId: this.characteristicId,
          value: buffer,
          success: () => {
            this.addLog(`发送成功: ${this.sendMsg}`);
          },
          fail: (err) => {
            this.addLog("发送失败: " + err.errMsg);
          }
        });
      },
      // --- 9. 读取数据 ---
      readData() {
        uni.readBLECharacteristicValue({
          deviceId: this.deviceId,
          serviceId: this.serviceId,
          characteristicId: this.characteristicId,
          success: () => {
            this.addLog("读取指令已发送...");
          },
          fail: (err) => {
            this.addLog("读取失败: " + err.errMsg);
          }
        });
      },
      closeConnection() {
        if (this.deviceId) {
          uni.closeBLEConnection({
            deviceId: this.deviceId
          });
        }
        this.connected = false;
        this.connectionStatus = "未连接";
      },
      closeBluetooth() {
        uni.closeBluetoothAdapter();
      },
      // --- 工具函数 ---
      // 记录日志
      addLog(msg) {
        const time = (/* @__PURE__ */ new Date()).toTimeString().split(" ")[0];
        this.logs.unshift({
          time,
          msg
        });
        formatAppLog("log", "at pages/index/index.vue:308", msg);
      },
      // 字符串转 ArrayBuffer
      string2buffer(str) {
        if (!str)
          return;
        let length = str.length;
        let index = 0;
        let array = [];
        while (index < length) {
          array.push(str.charCodeAt(index));
          index++;
        }
        return new Uint8Array(array).buffer;
      },
      // ArrayBuffer 转 16进制字符串
      ab2hex(buffer) {
        const hexArr = Array.prototype.map.call(
          new Uint8Array(buffer),
          function(bit) {
            return ("00" + bit.toString(16)).slice(-2);
          }
        );
        return hexArr.join("");
      },
      // 16进制转字符串
      hexCharCodeToStr(hexCharCodeStr) {
        var trimedStr = hexCharCodeStr.trim();
        var rawStr = trimedStr.substr(0, 2).toLowerCase() === "0x" ? trimedStr.substr(2) : trimedStr;
        var len = rawStr.length;
        if (len % 2 !== 0) {
          return "";
        }
        var curCharCode;
        var resultStr = [];
        for (var i = 0; i < len; i = i + 2) {
          curCharCode = parseInt(rawStr.substr(i, 2), 16);
          resultStr.push(String.fromCharCode(curCharCode));
        }
        return resultStr.join("");
      }
    }
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("text", { class: "title" }, "BLE 调试终端"),
        vue.createElementVNode("text", { class: "subtitle" }, "目标设备: My Node BLE (FFF0/FFF1)")
      ]),
      vue.createElementVNode("view", { class: "card" }, [
        vue.createElementVNode("view", { class: "status-box" }, [
          vue.createElementVNode("text", { class: "label" }, "状态:"),
          vue.createElementVNode(
            "text",
            {
              class: vue.normalizeClass(["value", $data.connected ? "success" : ""])
            },
            vue.toDisplayString($data.connectionStatus),
            3
            /* TEXT, CLASS */
          )
        ]),
        vue.createElementVNode("button", {
          type: "primary",
          onClick: _cache[0] || (_cache[0] = (...args) => $options.startScan && $options.startScan(...args)),
          loading: $data.isScanning,
          disabled: $data.connected,
          class: "action-btn"
        }, vue.toDisplayString($data.connected ? "已连接" : $data.isScanning ? "正在扫描..." : "扫描并连接"), 9, ["loading", "disabled"]),
        $data.connected ? (vue.openBlock(), vue.createElementBlock("button", {
          key: 0,
          type: "warn",
          onClick: _cache[1] || (_cache[1] = (...args) => $options.closeConnection && $options.closeConnection(...args)),
          class: "action-btn disconnect-btn"
        }, " 断开连接 ")) : vue.createCommentVNode("v-if", true)
      ]),
      $data.connected ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "card"
      }, [
        vue.createElementVNode("view", { class: "section-title" }, "数据读写"),
        vue.createElementVNode("view", { class: "input-group" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.sendMsg = $event),
              placeholder: "输入要发送的内容"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $data.sendMsg]
          ]),
          vue.createElementVNode("button", {
            size: "mini",
            type: "primary",
            onClick: _cache[3] || (_cache[3] = (...args) => $options.writeData && $options.writeData(...args))
          }, "发送")
        ]),
        vue.createElementVNode("view", { class: "read-group" }, [
          vue.createElementVNode("button", {
            size: "mini",
            onClick: _cache[4] || (_cache[4] = (...args) => $options.readData && $options.readData(...args))
          }, "主动读取一次"),
          $data.lastReadValue ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "last-read"
          }, [
            vue.createElementVNode(
              "text",
              null,
              "收到: " + vue.toDisplayString($data.lastReadValue),
              1
              /* TEXT */
            )
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ])) : vue.createCommentVNode("v-if", true),
      vue.createElementVNode("view", { class: "log-area" }, [
        vue.createElementVNode("view", { class: "log-header" }, [
          vue.createElementVNode("text", null, "运行日志"),
          vue.createElementVNode("text", {
            class: "clear-btn",
            onClick: _cache[5] || (_cache[5] = ($event) => $data.logs = [])
          }, "清空")
        ]),
        vue.createElementVNode("scroll-view", {
          "scroll-y": "true",
          class: "log-scroll"
        }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.logs, (log, index) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: index,
                class: "log-item"
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "log-time" },
                  "[" + vue.toDisplayString(log.time) + "]",
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "log-content" },
                  vue.toDisplayString(log.msg),
                  1
                  /* TEXT */
                )
              ]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])
      ])
    ]);
  }
  const PagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__file", "/Users/fortrust/Documents/HBuilderProjects/uni-demo-default-vue3/pages/index/index.vue"]]);
  __definePage("pages/index/index", PagesIndexIndex);
  const _sfc_main = {
    onLaunch: function() {
      formatAppLog("log", "at App.vue:4", "App Launch");
    },
    onShow: function() {
      formatAppLog("log", "at App.vue:7", "App Show");
    },
    onHide: function() {
      formatAppLog("log", "at App.vue:10", "App Hide");
    }
  };
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/Users/fortrust/Documents/HBuilderProjects/uni-demo-default-vue3/App.vue"]]);
  function createApp() {
    const app = vue.createVueApp(App);
    return {
      app
    };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);
