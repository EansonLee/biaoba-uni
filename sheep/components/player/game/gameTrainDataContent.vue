<script setup lang="ts">
	import { ref, unref } from "vue"
	import nextTable from "@/uni_modules/next-table/components/next-table/next-table.vue"
	import gameTrain from "@/sheep/api/dart/gameTrain";
	import $stores from "@/sheep/stores";
	const datalist = ref([])
	const userInfo = $stores('user').getUserInfo();
	const dataNum = ref(0)

	import {useI18n} from 'vue-i18n';
	const {t, locale} = useI18n();

	const getdatalist = async () => {
		const list = await gameTrain.Api.getList(userInfo.id);
		dataNum.value = list.length;
		if (list.length > 0) {
			list.forEach((item, index) => {
				item.round = locale.value === 'zh' ? "第" + (index + 1) + "局" :  index + 1;
				if (item.randomAccuracyTwice === null) {
					item.randomAccuracyTwice = " "
				}
				if (item.randomAccuracyTriple === null) {
					item.randomAccuracyTriple = " "
				}
				if (item.randomAccuracyTwice === null) {
					item.randomAccuracyTwice = " "
				}
				if (item.randomAccuracyRedStar === null) {
					item.randomAccuracyRedStar = " "
				}
			})
		}
		if (list.length < 3) {
			let leng = 5 - list.length
			for (let i = 0; i < leng; i++) {
				let item = {
					round: " ",
					randomAccuracyTwice: " ",
					randomAccuracyTriple: " ",
					randomAccuracyRedStar: " ",
					randomAccuracy: " "
				}
				list.push(item)
			}

		}
		datalist.value = list
	}
	const column = ref([
		// { name: 'round', label: '局数', align: 'center' },
		// { name: 'randomAccuracy', label: '随机分区', align: 'center' },
		// { name: 'randomAccuracyRedStar', label: '随机二倍', align: 'center' },
		// { name: 'randomAccuracyTriple', label: '随机三倍', align: 'center' },
		// { name: 'randomAccuracyTwice', label: '红心', align: 'center' },
		{ name: 'round', label: locale.value === 'zh'?'局数':'Round', align: 'center'},
		{ name: 'randomAccuracy', label: t('selectPlayer.offline.options.partitionRandom'), align: 'center' },
		{ name: 'randomAccuracyRedStar', label: t('selectPlayer.offline.options.partitionRandomTwice'), align: 'center' },
		{ name: 'randomAccuracyTriple', label: t('selectPlayer.offline.options.partitionRandomTriple'), align: 'center' },
		{ name: 'randomAccuracyTwice', label: t('selectPlayer.offline.options.partitionRandomRedStar'), align: 'center' },
	])
	getdatalist()
	const cellStyle = () => {
		const style = {
			height: '45rpx',
			margin: 'auto',
			background: '#17074600'
		}
		return style;
	}

	const cellHeaderStyle = () => {
		const style = {
			height: '50rpx'
		}
		return style;
	}
	const getSummaries = () => {
		const randomAccuracy = datalist.value.reduce((sum, item) => sum + item.randomAccuracy, 0);
		const randomAccuracyRedStar = datalist.value.reduce((sum, item) => sum + item.randomAccuracyRedStar, 0);
		const randomAccuracyTriple = datalist.value.reduce((sum, item) => sum + item.randomAccuracyTriple, 0);
		const randomAccuracyTwice = datalist.value.reduce((sum, item) => sum + item.randomAccuracyTwice, 0);
		const summaries = [
			locale.value === 'zh' ?'平均命中率':'Hit Rate',
			randomAccuracy > 0 ? (randomAccuracy / dataNum.value).toFixed(2)+'%' : " ",
			randomAccuracyRedStar > 0 ? (randomAccuracyRedStar / dataNum.value).toFixed(2)+'%' : " ",
			randomAccuracyTriple > 0 ? (randomAccuracyTriple / dataNum.value).toFixed(2)+'%' : " ",
			randomAccuracyTwice > 0 ? (randomAccuracyTwice / dataNum.value).toFixed(2)+'%' : " ",
		]
		return summaries;
	}
</script>

<template>
	<view class="game-data-container">
		<view class="next-table-container">
			<next-table height="200px" :cell-style="cellStyle" :cell-header-style="cellHeaderStyle" :show-header="true"
				:columns="column" :stripe="true" :fit="false" show-summary :summary-method="getSummaries" :border="true"
				:data="datalist">
			</next-table>
		</view>
	</view>
</template>

<style scoped lang="scss">
	.game-data-container {
		height: 100%;
		padding: 0 20rpx;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		gap: 40rpx;
	}

	:deep(.table-empty) {
		border-bottom: 0px !important;
		min-height: 200rpx !important;
		border-top: 2px solid #8856FF !important;
	}

	:deep(.next-table .next-table-header) {
		background: transparent
	}

	:deep(.table-h5-footer) {
		background: transparent
	}

	:deep(.next-table-headers) {
		background: transparent !important;
		border-bottom: 1px solid #FFF;
	}

	:deep(.item-th) {
		border-top: 0px !important;
		border-right: 2px solid #8856FF !important;
		border-bottom: 0px !important;
		font-size: 13rpx;
		padding-right: 8px !important;
		width: 20% !important;
	}

	:deep(.even) {
		width: 20% !important;
		// border-right: 0px  !important;
		border-right: 2px solid #8856FF !important;
		font-size: 11rpx;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	:deep(.odd) {
		width: 20% !important;
		// border-right: 0px  !important;
		border-right: 2px solid #8856FF !important;
		font-size: 11rpx;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	:deep(.next-table .item-td) {
		border-bottom: 1px solid #8856FF;
		// -webkit-text-stroke: 0.3rpx #8856FF;
		// /* 更细的描边 */
		// text-shadow: 0 0 3px #8856FF,
		// 	/* 核心光晕，减小扩散半径 */
		// 	0 0 6px #8856FF,
		// 	/* 外层光晕 */
		// 	0 0 10px #8856FF,
		// 	/* 更外层散光 */
		// 	0 0 20px #8856FF;
	}

	:deep(.next-table-fixed-header) {
		border-radius: 20px;
		border: 2.5px solid #8856FF;
		// -webkit-text-stroke: 0.3rpx #8856FF;
		///* 更细的描边 */
		//text-shadow: 0 0 3px #8856FF,
		//	/* 核心光晕，减小扩散半径 */
		//	0 0 6px #8856FF,
		//	/* 外层光晕 */
		//	0 0 10px #8856FF,
		//	/* 更外层散光 */
		//	0 0 20px #8856FF;
	}



	:deep(.next-table .next-table-body) {
		background: transparent
	}

	:deep(.next-table .next-table-tbody) {
		background: transparent
	}

	:deep(.next-table) {
		height: 250rpx;
		border-left: 2.5px solid #8856FF;
		// -webkit-text-stroke: 0.3rpx #8856FF;
		///* 更细的描边 */
		//text-shadow: 0 0 3px #8856FF,
		//	/* 核心光晕，减小扩散半径 */
		//	0 0 6px #8856FF,
		//	/* 外层光晕 */
		//	0 0 10px #8856FF,
		//	/* 更外层散光 */
		//	0 0 20px #8856FF;
		// background:no-repeat;
	}

	:deep(.next-table-body) {
		// height: 200rpx
	}

	:deep(.next-table-header) {
		// height: 45rpx
		background: no-repeat;
	}

	.next-table-container {
		width: 80vw;
		height: 70vh;
		box-sizing: border-box;
		font-size: 18rpx;
		font-weight: 300;
		/* 适当减小字体粗细 */
		color: #ffffff;
		// -webkit-text-stroke: 0.3rpx #8856FF;
		///* 更细的描边 */
		//text-shadow: 0 0 3px #8856FF,
		//	/* 核心光晕，减小扩散半径 */
		//	0 0 6px #8856FF,
		//	/* 外层光晕 */
		//	0 0 10px #8856FF,
		//	/* 更外层散光 */
		//	0 0 20px #8856FF;
		///* 扩展散光层，弱化散光 */
	}

	.flex-btns {
		display: flex;
		position: fixed;
		width: 100%;
		left: 0;
		bottom: 0;
	}
</style>