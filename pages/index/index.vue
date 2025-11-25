<template>
	<view class="container">
		<view class="header">
			<text class="title">BLE 调试终端</text>
			<text class="subtitle">目标设备: My Node BLE (FFF0/FFF1)</text>
		</view>

		<!-- 连接控制区 -->
		<view class="card">
			<view class="status-box">
				<text class="label">状态:</text>
				<text :class="['value', connected ? 'success' : '']">{{ connectionStatus }}</text>
			</view>

			<button type="primary" @click="startScan" :loading="isScanning" :disabled="connected" class="action-btn">
				{{ connected ? '已连接' : (isScanning ? '正在扫描...' : '扫描并连接') }}
			</button>

			<button v-if="connected" type="warn" @click="closeConnection" class="action-btn disconnect-btn">
				断开连接
			</button>
		</view>

		<!-- 操作区 (连接后显示) -->
		<view v-if="connected" class="card">
			<view class="section-title">数据读写</view>

			<!-- 写入数据 -->
			<view class="input-group">
				<input class="input" v-model="sendMsg" placeholder="输入要发送的内容" />
				<button size="mini" type="primary" @click="writeData">发送</button>
			</view>

			<!-- 读取数据 -->
			<view class="read-group">
				<button size="mini" @click="readData">主动读取一次</button>
				<view class="last-read" v-if="lastReadValue">
					<text>收到: {{ lastReadValue }}</text>
				</view>
			</view>
		</view>

		<!-- 日志区 -->
		<view class="log-area">
			<view class="log-header">
				<text>运行日志</text>
				<text class="clear-btn" @click="logs = []">清空</text>
			</view>
			<scroll-view scroll-y="true" class="log-scroll">
				<view v-for="(log, index) in logs" :key="index" class="log-item">
					<text class="log-time">[{{ log.time }}]</text>
					<text class="log-content">{{ log.msg }}</text>
				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script>
	// 目标服务和特征值的 UUID (对应 Node.js 代码)
	const SERVICE_UUID = 'FFF0';
	const CHAR_UUID = 'FFF1';

	export default {
		data() {
			return {
				// 状态管理
				isScanning: false,
				connected: false,
				connectionStatus: '未连接',

				// 设备信息
				deviceId: '',
				serviceId: '',
				characteristicId: '',

				// 数据交互
				sendMsg: 'Hello from App',
				lastReadValue: '',

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
						this.addLog('蓝牙初始化成功');
						// 监听连接状态变化（如意外断开）
						uni.onBLEConnectionStateChange((res) => {
							this.connected = res.connected;
							this.connectionStatus = res.connected ? '已连接' : '已断开';
							if (!res.connected) {
								this.deviceId = '';
								this.addLog('连接已断开');
							}
						});
						// 监听数据变化（读取和通知都会触发这里）
						uni.onBLECharacteristicValueChange((res) => {
							const hex = this.ab2hex(res.value);
							const str = this.hexCharCodeToStr(hex);
							this.lastReadValue = str;
							this.addLog(`收到数据: ${str} (Hex: ${hex})`);
						});
					},
					fail: (err) => {
						this.addLog('蓝牙初始化失败，请检查蓝牙是否开启');
						uni.showToast({
							title: '请打开蓝牙',
							icon: 'none'
						});
					}
				});
			},

			// --- 2. 扫描设备 ---
			startScan() {
				if (this.isScanning) return;

				this.isScanning = true;
				this.connectionStatus = '正在扫描...';
				this.logs = []; // 清空日志
				this.addLog('开始扫描 My Node BLE...');

				uni.startBluetoothDevicesDiscovery({
					allowDuplicatesKey: false,
					success: () => {
						this.onDeviceFound();
					},
					fail: (err) => {
						this.addLog('扫描启动失败: ' + JSON.stringify(err));
						this.isScanning = false;
					}
				});
			},

			// --- 3. 监听发现设备 ---
			onDeviceFound() {
				uni.onBluetoothDeviceFound((res) => {
					res.devices.forEach(device => {
						// 过滤：只连接名称为 "My Node BLE" 的设备
						if (device.name === 'My Node BLE' || device.localName === 'My Node BLE') {
							this.addLog(`发现目标设备: ${device.deviceId}`);
							// 找到后立即停止扫描并连接
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
				this.connectionStatus = '正在连接...';
				this.addLog(`尝试连接: ${deviceId}`);

				uni.createBLEConnection({
					deviceId,
					success: () => {
						this.connected = true;
						this.deviceId = deviceId;
						this.connectionStatus = '已连接';
						this.addLog('连接成功，正在获取服务...');

						// Android连接后建议延迟一小会儿再获取服务
						setTimeout(() => {
							this.getServices(deviceId);
						}, 1000);
					},
					fail: (err) => {
						this.addLog('连接失败: ' + err.errMsg);
						this.connectionStatus = '连接失败';
					}
				});
			},

			// --- 5. 获取服务 ---
			getServices(deviceId) {
				uni.getBLEDeviceServices({
					deviceId,
					success: (res) => {
						// 查找包含 FFF0 的服务
						const targetService = res.services.find(s => s.uuid.toUpperCase().includes(
							SERVICE_UUID));

						if (targetService) {
							this.serviceId = targetService.uuid;
							this.addLog(`找到服务: ${this.serviceId}`);
							this.getCharacteristics(deviceId, this.serviceId);
						} else {
							this.addLog('未找到 FFF0 服务');
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
						// 查找包含 FFF1 的特征值
						const targetChar = res.characteristics.find(c => c.uuid.toUpperCase().includes(
							CHAR_UUID));

						if (targetChar) {
							this.characteristicId = targetChar.uuid;
							this.addLog(`找到特征值: ${this.characteristicId}`);

							// 启用 Notify (订阅)
							this.notifyCharacteristic(deviceId, serviceId, this.characteristicId);
						} else {
							this.addLog('未找到 FFF1 特征值');
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
						this.addLog('Notify 监听已开启');
					},
					fail: (err) => {
						this.addLog('开启 Notify 失败: ' + err.errMsg);
					}
				});
			},

			// --- 8. 写入数据 ---
			writeData() {
				if (!this.sendMsg) return;

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
						this.addLog('发送失败: ' + err.errMsg);
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
						this.addLog('读取指令已发送...');
					},
					fail: (err) => {
						this.addLog('读取失败: ' + err.errMsg);
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
				this.connectionStatus = '未连接';
			},

			closeBluetooth() {
				uni.closeBluetoothAdapter();
			},

			// --- 工具函数 ---

			// 记录日志
			addLog(msg) {
				const time = new Date().toTimeString().split(' ')[0];
				this.logs.unshift({
					time,
					msg
				});
				console.log(msg);
			},

			// 字符串转 ArrayBuffer
			string2buffer(str) {
				let val = "";
				if (!str) return;
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
						return ('00' + bit.toString(16)).slice(-2);
					}
				);
				return hexArr.join('');
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
</script>

<style>
	.container {
		padding: 20px;
		background-color: #f5f7fa;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.header {
		margin-bottom: 20px;
	}

	.title {
		font-size: 24px;
		font-weight: bold;
		color: #333;
		display: block;
	}

	.subtitle {
		font-size: 14px;
		color: #666;
		margin-top: 5px;
		display: block;
	}

	.card {
		background: white;
		border-radius: 12px;
		padding: 15px;
		margin-bottom: 15px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
	}

	.status-box {
		display: flex;
		justify-content: space-between;
		margin-bottom: 15px;
		font-size: 16px;
	}

	.label {
		color: #666;
	}

	.value {
		font-weight: bold;
		color: #ff9900;
	}

	.value.success {
		color: #07c160;
	}

	.action-btn {
		width: 100%;
	}

	.disconnect-btn {
		margin-top: 10px;
	}

	.section-title {
		font-size: 16px;
		font-weight: bold;
		margin-bottom: 15px;
		border-left: 4px solid #007aff;
		padding-left: 10px;
	}

	.input-group {
		display: flex;
		gap: 10px;
		margin-bottom: 15px;
	}

	.input {
		flex: 1;
		border: 1px solid #ddd;
		padding: 8px 10px;
		border-radius: 6px;
		background: #f9f9f9;
	}

	.read-group {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.last-read {
		background: #eef9fe;
		padding: 10px;
		border-radius: 6px;
		color: #007aff;
		font-size: 14px;
	}

	.log-area {
		flex: 1;
		background: #1e1e1e;
		border-radius: 12px;
		padding: 10px;
		display: flex;
		flex-direction: column;
		height: 300px;
	}

	.log-header {
		display: flex;
		justify-content: space-between;
		color: #888;
		font-size: 12px;
		margin-bottom: 10px;
		border-bottom: 1px solid #333;
		padding-bottom: 5px;
	}

	.clear-btn {
		color: #007aff;
	}

	.log-scroll {
		flex: 1;
		height: 0;
	}

	.log-item {
		margin-bottom: 5px;
		font-family: monospace;
		font-size: 12px;
	}

	.log-time {
		color: #666;
		margin-right: 8px;
	}

	.log-content {
		color: #00ff00;
	}
</style>