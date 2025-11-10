// 安装依赖：npm install bleno
// 运行：sudo node ble-sim-device.js

const bleno = require('@abandonware/bleno');

const DEVICE_NAME = 'SimBLEDevice';

// 定义一个特征值，支持 Read / Write / Notify
class SimCharacteristic extends bleno.Characteristic {
	constructor() {
		super({
			uuid: 'fffffffffffffffffffffffffffffff1', // 自定义 UUID
			properties: ['read', 'write', 'notify'],
			value: null
		});
		this._value = Buffer.from('Hello BLE');
		this._updateValueCallback = null;
	}

	// 主机读取
	onReadRequest(offset, callback) {
		console.log('Read request');
		callback(this.RESULT_SUCCESS, this._value);
	}

	// 主机写入
	onWriteRequest(data, offset, withoutResponse, callback) {
		this._value = data;
		console.log('Write request: ' + data.toString());
		callback(this.RESULT_SUCCESS);

		// 写入后立即通知主机
		if (this._updateValueCallback) {
			this._updateValueCallback(this._value);
		}
	}

	// 主机订阅通知
	onSubscribe(maxValueSize, updateValueCallback) {
		console.log('Device subscribed');
		this._updateValueCallback = updateValueCallback;

		// 模拟定时推送数据
		this.timer = setInterval(() => {
			const msg = Buffer.from('Notify:' + Date.now());
			console.log('Notify ->', msg.toString());
			updateValueCallback(msg);
		}, 3000);
	}

	// 主机取消订阅
	onUnsubscribe() {
		console.log('Device unsubscribed');
		this._updateValueCallback = null;
		clearInterval(this.timer);
	}
}

// 定义一个服务
const simService = new bleno.PrimaryService({
	uuid: 'fffffffffffffffffffffffffffffff0',
	characteristics: [new SimCharacteristic()]
});

// 启动广播
bleno.on('stateChange', (state) => {
	if (state === 'poweredOn') {
		bleno.startAdvertising(DEVICE_NAME, [simService.uuid]);
	} else {
		bleno.stopAdvertising();
	}
});

bleno.on('advertisingStart', (error) => {
	if (!error) {
		console.log('Advertising as', DEVICE_NAME);
		bleno.setServices([simService]);
	} else {
		console.error('Advertising error:', error);
	}
});