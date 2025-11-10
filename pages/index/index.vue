<template>
	<view class="container">
		<button @click="startScan">开始扫描设备</button>

		<!-- 滚动列表展示扫描到的设备 -->
		<scroll-view scroll-y="true" style="height: 400rpx; border: 1px solid #ccc; margin: 20rpx 0;">
			<view v-for="(dev, index) in devices" :key="index" class="device-item" @click="connectDevice(dev)">
				<text>{{ dev.name || dev.localName  || '未知设备' }}</text>
				<text style="font-size:24rpx;color:#888;">{{ dev.deviceId }}</text>
			</view>
		</scroll-view>

		<view>连接状态: {{ connected ? '已连接' : '未连接' }}</view>
		<view>接收数据: {{ receivedData }}</view>

		<!-- 写入数据输入框 -->
		<view v-if="connected" style="margin-top:20rpx;">
			<input type="text" v-model="inputValue" placeholder="输入要发送的数据"
				style="border:1px solid #ccc;padding:10rpx;" />
			<button @click="writeValue" style="margin-top:10rpx;">发送数据</button>
		</view>
	</view>
</template>

<script setup>
	import {
		ref
	} from 'vue'

	const devices = ref([]) // 扫描到的设备列表
	const connected = ref(false)
	const receivedData = ref('')
	const connectedDeviceId = ref('')
	const serviceId = ref('')
	const characteristicId = ref('')
	const inputValue = ref('')

	// 模拟服务和特征值 UUID（要和 bleno 模拟设备保持一致）
	const SERVICE_UUID = 'fffffffffffffffffffffffffffffff0'
	const CHAR_UUID = 'fffffffffffffffffffffffffffffff1'

	// 开始扫描
	const startScan = () => {
		devices.value = []
		uni.openBluetoothAdapter({
			success() {
				uni.startBluetoothDevicesDiscovery({
					allowDuplicatesKey: false,
					success() {
						console.log('开始扫描')
						uni.onBluetoothDeviceFound((res) => {
							res.devices.forEach((device) => {
								if (device.deviceId && !devices.value.find(d => d
										.deviceId === device.deviceId)) {
									devices.value.push(device)
								}
							})
						})
					}
				})
			}
		})
	}

	// 连接设备
	const connectDevice = (device) => {
		connectedDeviceId.value = device.deviceId
		uni.createBLEConnection({
			deviceId: device.deviceId,
			success() {
				console.log('连接成功:', device.name)
				connected.value = true
				// 获取服务
				uni.getBLEDeviceServices({
					deviceId: device.deviceId,
					success(res) {
						const service = res.services.find(s => s.uuid.includes(SERVICE_UUID.slice(0,
							8)))
						if (service) {
							serviceId.value = service.uuid
							// 获取特征值
							uni.getBLEDeviceCharacteristics({
								deviceId: device.deviceId,
								serviceId: service.uuid,
								success(res2) {
									const char = res2.characteristics.find(c => c.uuid
										.includes(CHAR_UUID.slice(0, 8)))
									if (char) {
										characteristicId.value = char.uuid
										console.log('找到特征值:', char.uuid)
										// 开启通知
										enableNotify()
									}
								}
							})
						}
					}
				})
			}
		})
	}

	// 开启通知
	const enableNotify = () => {
		uni.notifyBLECharacteristicValueChange({
			deviceId: connectedDeviceId.value,
			serviceId: serviceId.value,
			characteristicId: characteristicId.value,
			state: true,
			success() {
				console.log('已开启通知')
				uni.onBLECharacteristicValueChange((res) => {
					receivedData.value = ab2str(res.value)
					console.log('收到通知:', receivedData.value)
				})
			}
		})
	}

	// 写入数据
	const writeValue = () => {
		if (!inputValue.value) return
		const buffer = str2ab(inputValue.value)
		uni.writeBLECharacteristicValue({
			deviceId: connectedDeviceId.value,
			serviceId: serviceId.value,
			characteristicId: characteristicId.value,
			value: buffer,
			success() {
				console.log('写入成功:', inputValue.value)
			}
		})
	}

	// 工具函数：ArrayBuffer <-> String
	function ab2str(buf) {
		return String.fromCharCode.apply(null, new Uint8Array(buf))
	}

	function str2ab(str) {
		const buf = new ArrayBuffer(str.length)
		const bufView = new Uint8Array(buf)
		for (let i = 0; i < str.length; i++) {
			bufView[i] = str.charCodeAt(i)
		}
		return buf
	}
</script>

<style>
	.container {
		padding: 20rpx;
	}

	.device-item {
		padding: 10rpx;
		border-bottom: 1px solid #eee;
	}

	.device-item:hover {
		background-color: #f5f5f5;
	}
</style>