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
  const SERVICE_UUID = "fffffffffffffffffffffffffffffff0";
  const CHAR_UUID = "fffffffffffffffffffffffffffffff1";
  const _sfc_main$1 = {
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const devices = vue.ref([]);
      const connected = vue.ref(false);
      const receivedData = vue.ref("");
      const connectedDeviceId = vue.ref("");
      const serviceId = vue.ref("");
      const characteristicId = vue.ref("");
      const inputValue = vue.ref("");
      const startScan = () => {
        devices.value = [];
        uni.openBluetoothAdapter({
          success() {
            uni.startBluetoothDevicesDiscovery({
              allowDuplicatesKey: false,
              success() {
                formatAppLog("log", "at pages/index/index.vue:50", "开始扫描");
                uni.onBluetoothDeviceFound((res) => {
                  res.devices.forEach((device) => {
                    if (device.deviceId && !devices.value.find((d) => d.deviceId === device.deviceId)) {
                      devices.value.push(device);
                    }
                  });
                });
              }
            });
          }
        });
      };
      const connectDevice = (device) => {
        connectedDeviceId.value = device.deviceId;
        uni.createBLEConnection({
          deviceId: device.deviceId,
          success() {
            formatAppLog("log", "at pages/index/index.vue:71", "连接成功:", device.name);
            connected.value = true;
            uni.getBLEDeviceServices({
              deviceId: device.deviceId,
              success(res) {
                const service = res.services.find((s) => s.uuid.includes(SERVICE_UUID.slice(
                  0,
                  8
                )));
                if (service) {
                  serviceId.value = service.uuid;
                  uni.getBLEDeviceCharacteristics({
                    deviceId: device.deviceId,
                    serviceId: service.uuid,
                    success(res2) {
                      const char = res2.characteristics.find((c) => c.uuid.includes(CHAR_UUID.slice(0, 8)));
                      if (char) {
                        characteristicId.value = char.uuid;
                        formatAppLog("log", "at pages/index/index.vue:90", "找到特征值:", char.uuid);
                        enableNotify();
                      }
                    }
                  });
                }
              }
            });
          }
        });
      };
      const enableNotify = () => {
        uni.notifyBLECharacteristicValueChange({
          deviceId: connectedDeviceId.value,
          serviceId: serviceId.value,
          characteristicId: characteristicId.value,
          state: true,
          success() {
            formatAppLog("log", "at pages/index/index.vue:111", "已开启通知");
            uni.onBLECharacteristicValueChange((res) => {
              receivedData.value = ab2str(res.value);
              formatAppLog("log", "at pages/index/index.vue:114", "收到通知:", receivedData.value);
            });
          }
        });
      };
      const writeValue = () => {
        if (!inputValue.value)
          return;
        const buffer = str2ab(inputValue.value);
        uni.writeBLECharacteristicValue({
          deviceId: connectedDeviceId.value,
          serviceId: serviceId.value,
          characteristicId: characteristicId.value,
          value: buffer,
          success() {
            formatAppLog("log", "at pages/index/index.vue:130", "写入成功:", inputValue.value);
          }
        });
      };
      function ab2str(buf) {
        return String.fromCharCode.apply(null, new Uint8Array(buf));
      }
      function str2ab(str) {
        const buf = new ArrayBuffer(str.length);
        const bufView = new Uint8Array(buf);
        for (let i = 0; i < str.length; i++) {
          bufView[i] = str.charCodeAt(i);
        }
        return buf;
      }
      const __returned__ = { devices, connected, receivedData, connectedDeviceId, serviceId, characteristicId, inputValue, SERVICE_UUID, CHAR_UUID, startScan, connectDevice, enableNotify, writeValue, ab2str, str2ab, ref: vue.ref };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("button", { onClick: $setup.startScan }, "开始扫描设备"),
      vue.createElementVNode("scroll-view", {
        "scroll-y": "true",
        style: { "height": "400rpx", "border": "1px solid #ccc", "margin": "20rpx 0" }
      }, [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($setup.devices, (dev, index) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              key: index,
              class: "device-item",
              onClick: ($event) => $setup.connectDevice(dev)
            }, [
              vue.createElementVNode(
                "text",
                null,
                vue.toDisplayString(dev.name || dev.localName || "未知设备"),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { style: { "font-size": "24rpx", "color": "#888" } },
                vue.toDisplayString(dev.deviceId),
                1
                /* TEXT */
              )
            ], 8, ["onClick"]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ]),
      vue.createElementVNode(
        "view",
        null,
        "连接状态: " + vue.toDisplayString($setup.connected ? "已连接" : "未连接"),
        1
        /* TEXT */
      ),
      vue.createElementVNode(
        "view",
        null,
        "接收数据: " + vue.toDisplayString($setup.receivedData),
        1
        /* TEXT */
      ),
      $setup.connected ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        style: { "margin-top": "20rpx" }
      }, [
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            type: "text",
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.inputValue = $event),
            placeholder: "输入要发送的数据",
            style: { "border": "1px solid #ccc", "padding": "10rpx" }
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $setup.inputValue]
        ]),
        vue.createElementVNode("button", {
          onClick: $setup.writeValue,
          style: { "margin-top": "10rpx" }
        }, "发送数据")
      ])) : vue.createCommentVNode("v-if", true)
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
