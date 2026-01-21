<script setup>
	import PopBackground from "@/sheep/components/common/popBackground.vue";
	import {
		ref,
		reactive
	} from "vue";
	import playerInfo from "@/sheep/api/dart/playerInfo";
	import grade from "@/sheep/api/dart/grade";
	import $stores from "@/sheep/stores";
	const userInfo = $stores('user').getUserInfo();


	const state = reactive({
		data: {},
		grade: {}
	});
	const getDate = async () => {
		state.data = await playerInfo.Api.getPlayerInfo(userInfo.id);
		state.grade= await grade.Api.getAllGrade();
		state.data.offline01=findGradeImage(state.data.offlinePpd,1);//线下01
		state.data.offlineCr=findGradeImage(state.data.offlinePpr,2);//线下cr
		state.data.online01=findGradeImage(state.data.onlinePpd,1);//线上01
		state.data.onlineCr=findGradeImage(state.data.onlinePpr,2);//线上cr
	}
	
	const findGradeImage = (number,type)=>{
		//numder代表传递的分数   type判断是01还是cr 1.01 2.cr
	   for(let i in state.grade){
		   if(number>=state.grade[i].upperInterval && number<=state.grade[i].lowerRange && type==state.grade[i].gameType){
			  return state.grade[i].gradeImage;
		   }
	   }
		return "没有匹配到相应的段位";
	}
	getDate()
</script>

<template>
	<view class="game-data-container">
		<!-- 线下数据 -->
		<view class="data-section">
			<PopBackground>
				<view class="data-content">
					<view class="section-title">{{ $t('offlineData') }}</view>
					<view class="data-list">
						<!-- <view v-for="(value, key) in offlineData" 
                  :key="key" 
                  class="data-item">
              <text class="label">{{ key }}</text>
              <text class="value">{{ value }}</text>
            </view> -->
						<view class="data-item">
							<text class="label">{{$t('ppd_score')}}</text>
							<text class="value">{{state.data.offlinePpd}}
							<span>
								<image
								    :src="state.data.online01"
								    class="gradeImage"
								    mode="aspectFill"
								/>
							</span>
							</text>
						</view>
						<view class="data-item">
							<text class="label">{{$t('cpmpd_score')}}</text>
							<text class="value">{{state.data.offlinePpr}} 
							<span>
								<image
								    :src="state.data.offlineCr"
								    class="gradeImage"
								    mode="aspectFill"
								/>
							</span>
							</text>
						</view>
					</view>
				</view>
			</PopBackground>
		</view>

		<!-- 线上数据 -->
		<view class="data-section">
			<PopBackground>
				<view class="data-content">
					<view class="section-title">{{ $t('onlineData') }}</view>
					<view class="data-list">
						<view class="data-item">
							<text class="label">{{$t('online_games')}}</text>
							<text class="value">{{state.data.onlineTotal === null?0:state.data.onlineTotal}}</text>
						</view>
						<view class="data-item">
							<text class="label">{{$t('ppd_score')}}</text>
							<text class="value">{{state.data.onlinePpd=== null?0:state.data.onlinePpd}} 
							<span>
								<image
								    :src="state.data.online01"
								    class="gradeImage"
								    mode="aspectFill"
								/>
							</span>
							</text>
						</view>
						<view class="data-item">
							<text class="label">{{$t('cpmpd_score')}}</text>
							<text class="value">{{state.data.onlinePpr === null?0:state.data.onlinePpr}}
							<span>
								<image
								    :src="state.data.onlineCr"
								    class="gradeImage"
								    mode="aspectFill"
								/>
							</span>
							</text>
						</view>


					</view>
				</view>
			</PopBackground>
		</view>
	</view>
</template>

<style scoped lang="scss">
	
	.gradeImage{
		width: 20px;
		height: 20px;
		display: block;
		vertical-align: middle;
	}
	
	.game-data-container {
		height: 100%;
		padding: 0 20rpx;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		gap: 40rpx;
	}

	.data-section {
		width: 35%; // 固定宽度
		height: 70%; // 固定高度
	}

	.data-content {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.section-title {
		color: #c7b5f8;
		font-size: 16rpx;
		text-align: center;
		margin-top: 10rpx;
	}

	.data-list {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center; // 垂直居中
		gap: 15rpx;
	}

	.data-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 10rpx;

		.label {
			color: #c7b5f8;
			font-size: 14rpx;
			width: 100rpx; // 固定标签宽度
			text-align: left;
		}

	.value {
		color: #FFFFFF;
		font-size: 14rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 5rpx;
	}
	}
</style>