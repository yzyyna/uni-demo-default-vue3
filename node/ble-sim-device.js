const bleno = require('@abandonware/bleno');

// 定义名称和服务 UUID
const DEVICE_NAME = 'My Node BLE';
const SERVICE_UUID = 'fff0'; // 自定义服务 UUID
const CHARACTERISTIC_UUID = 'fff1'; // 自定义特征值 UUID

// 1. 定义自定义特征值类
class MyCharacteristic extends bleno.Characteristic {
	constructor() {
		super({
			uuid: CHARACTERISTIC_UUID,
			properties: ['read', 'write', 'notify'], // 支持读、写、通知
			value: null
		});
		this._value = Buffer.from('Hello BLE'); // 初始值
		// https://github.com/noble/bleno
		// Call the updateValueCallback callback (see Notify subscribe), with an argument of type Buffer
		// Can specify notify sent handler via constructor options or by extending Characteristic and overriding onNotify.
		this._updateValueCallback = null;
	}

	// 处理【读】请求：当手机想要读取数据时触发
	onReadRequest(offset, callback) {
		console.log('收到读请求');
		// 返回当前值
		callback(this.RESULT_SUCCESS, this._value);
	}

	// 处理【写】请求：当手机发送数据过来时触发
	onWriteRequest(data, offset, withoutResponse, callback) {
		this._value = data; // 更新本地保存的值
		console.log('收到写请求 | 数据(Hex):', data.toString('hex'), '| 文本:', data.toString('utf-8'));

		// 如果有订阅者（Notify），可以推送新数据
		if (this._updateValueCallback) {
			console.log('正在向订阅者推送新值...');
			this._updateValueCallback(this._value);
		}

		callback(this.RESULT_SUCCESS);
	}

	// 处理【订阅】请求：当手机开启 Notify 时触发
	onSubscribe(maxValueSize, updateValueCallback) {
		console.log('设备已订阅 (Notify 开启)');
		this._updateValueCallback = updateValueCallback;
	}

	// 处理【取消订阅】请求
	onUnsubscribe() {
		console.log('设备取消订阅');
		this._updateValueCallback = null;
	}
}

// 实例化特征值
const myCharacteristic = new MyCharacteristic();

// 2. 监听蓝牙状态变化
bleno.on('stateChange', (state) => {
	console.log('蓝牙适配器状态变更: ' + state);

	if (state === 'poweredOn') {
		// 开启广播：设备名称, [服务UUID列表]
		bleno.startAdvertising(DEVICE_NAME, [SERVICE_UUID]);
	} else {
		bleno.stopAdvertising();
	}
});

// 3. 监听广播开始事件
bleno.on('advertisingStart', (error) => {
	if (!error) {
		console.log('正在广播中... (可以使用 nRF Connect 或 LightBlue 连接)');

		// 广播成功后，设置服务列表
		bleno.setServices([
			new bleno.PrimaryService({
				uuid: SERVICE_UUID,
				characteristics: [myCharacteristic]
			})
		]);
	} else {
		console.error('广播启动失败:', error);
	}
});