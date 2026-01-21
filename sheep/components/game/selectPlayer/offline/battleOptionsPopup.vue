<script setup>
	import { ref, watch } from 'vue';
	import PopUpLayer from "@/sheep/components/util/popUp/popUpLayer.vue";
	import {useI18n} from "vue-i18n";
	const {locale} = useI18n();

	const props = defineProps({
		modalVisible: {
			type: Boolean,
			default: false
		},
		modalContent: {
			type: {},
			default: () => ({})
		},
		handicapModalVisible: {
			type: Boolean,
			default: false
		},
		showHandicap: {
			type: Boolean,
			default: true
		},
		type: {
			type: Number,
		},
		duelMode: {
			type: Number,
		},
		modalButtomVisible: {
			type: Boolean,
			default: false
		},
		modalButtomVisibleSure: {
			type: Boolean,
			default: false
		},
		manualHandicapButton: {
			type: Number,
			default: 0
		},
    isOnline: {
      type: Number,
      default: 0    //0-非线上模式  1-线上模式
    },
		
	});

	const emit = defineEmits(['update:modalVisible', 'selectOption','startGame','startInviteGame']);

	// 响应式的自定义回合数输入值
	const customRoundInput = ref('');

	// 监听props变化，同步输入值
	watch(() => props.modalContent.customRound, (newVal) => {
		customRoundInput.value = newVal ? newVal.toString() : '';
	}, { immediate: true });

	// 确定
	const startGame = (field, value) => {
		emit('startGame');
	};
	
	const startInviteGame = () => {
		emit('startInviteGame');
	};
	
	
	
	// 处理选项选择
	const handleOptionSelect = (field, value) => {
		// 如果选择的是局数相关的选项，清空自定义输入框
		if (field === 'roundNbr' && value !== 0) {
			customRoundInput.value = '';
			// 同时清空自定义局数的值
			emit('selectOption', {
				field: 'customRound',
				value: ''
			});
		}

		emit('selectOption', {
			field,
			value
		});
	};

	// 处理自定义回合输入
	const handleCustomRoundInput = () => {
		let value = customRoundInput.value;

		// 移除非数字字符
		value = value.replace(/[^0-9]/g, '');
		
		// 如果数值大于999，设置为999
		if (value && parseInt(value) > 999) {
			value = '999';
		}

		// 更新响应式变量（这会自动更新输入框）
		customRoundInput.value = value;

		// 更新组件数据
		if (value) {
			emit('selectOption', {
				field: 'customRound',
				value: parseInt(value)
			});
		} else {
			emit('selectOption', {
				field: 'customRound',
				value: ''
			});
		}
	};
</script>

<template>
		
	<PopUpLayer :modalVisible="modalVisible" :title="modalContent.title" width="auto" height="auto" :confirm="false"
		:cancel="false" @update:modalVisible="(val) => emit('update:modalVisible', val)">
		<!-- 对战选项 -->
		<view v-if="modalContent.buttonType === 'left'" class="option-group">
			<text class="group-title">{{ $t('selectPlayer.offline.title.duelSetup') }}</text>
			<view class="button-group">
				<button v-clickSound v-if="duelMode!==2" class="uni-button pattern-button"
					:class="{ 'pattern-active-button': modalContent.teamSize === 1 }"
					@click="handleOptionSelect('teamSize', 1)">{{ $t('selectPlayer.offline.battle.oneVsOne') }}
				</button>
				<template v-if="type!==3">
					<button v-clickSound class="uni-button pattern-button"
						:class="{ 'pattern-active-button': modalContent.teamSize === 2 }"
						@click="handleOptionSelect('teamSize', 2)">{{ $t('selectPlayer.offline.battle.twoVsTwo') }}
					</button>
					<!--          <button-->
					<!--              class="uni-button pattern-button"-->
					<!--              :class="{ 'pattern-active-button': modalContent.teamSize === 3 }"-->
					<!--              @click="handleOptionSelect('teamSize', 3)"-->
					<!--          >{{ $t('selectPlayer.offline.battle.threeVsThree') }}-->
					<!--          </button>-->
					<!--          <button-->
					<!--              class="uni-button pattern-button"-->
					<!--              :class="{ 'pattern-active-button': modalContent.teamSize === 4 }"-->
					<!--              @click="handleOptionSelect('teamSize', 4)"-->
					<!--          >{{ $t('selectPlayer.offline.battle.fourVsFour') }}-->
					<!--          </button>-->
				</template>
			</view>
		</view>

		<!-- 游戏选项 -->
		<view v-if="modalContent.buttonType === 'right'" class="option-group">
			<template v-if="type===1">
				<text class="group-title">{{ $t('selectPlayer.offline.options.conditions') }}</text>
				<view class="button-group">
					<button  v-clickSound  class="uni-button pattern-button"
						:class="{ 'pattern-active-button': modalContent.opening === 1 }"
						@click="handleOptionSelect('opening', 1)">{{ $t('selectPlayer.offline.options.doubleStart') }}
					</button>
					<button  v-clickSound  class="uni-button pattern-button"
						:class="{ 'pattern-active-button': modalContent.finish === 1 }"
						@click="handleOptionSelect('finish', 1)">{{ $t('selectPlayer.offline.options.doubleEnd') }}
					</button>
					<button  v-clickSound   class="uni-button pattern-button"
						:class="{ 'pattern-active-button': modalContent.opening === 2 }"
						@click="handleOptionSelect('opening', 2)">{{ $t('selectPlayer.offline.options.multipleStart') }}
					</button>
					<button  v-clickSound  class="uni-button pattern-button"
						:class="{ 'pattern-active-button': modalContent.finish === 2 }"
						@click="handleOptionSelect('finish', 2)">{{ $t('selectPlayer.offline.options.multipleEnd') }}
					</button>

					<button v-if="type!==1" v-clickSound  class="uni-button pattern-button space-nowrap"
						:class="{ 'pattern-active-button': modalContent.bullSEyeFraction === 50 }"
						@click="handleOptionSelect('bullSEyeFraction')">{{ $t('selectPlayer.offline.options.bullEyeScore') }}: {{ modalContent.bullSEyeFraction }}/50
					</button>

          <button v-if="type===1" v-clickSound  class="uni-button pattern-button space-nowrap"
                  :class="{ 'pattern-active-button': modalContent.bullSEyeFraction === 50 || modalContent.bullSEyeFraction === 25 }"
                  @click="handleOptionSelect('bullSEyeFraction')">{{ $t('selectPlayer.offline.options.bullEyeScore') }}: {{ modalContent.bullSEyeFraction }}/50
          </button>
				</view>
			</template>
			<!-- 练习模式 -->
			<template v-if="type===7">
				<text class="group-title">{{ $t('practiceList.partitionTitle') }}</text>
				<view class="button-group">
				<button  v-clickSound   class="uni-button pattern-button" style="width: 186rpx;"
					:class="{ 'pattern-active-button': modalContent.partition === 1 ||  !modalContent.partition}"
					@click="handleOptionSelect('partition', 1)">{{ $t('practiceList.partitionRandom') }}
				</button>
				<button  v-clickSound   class="uni-button pattern-button" style="width: 200rpx;"
					:class="{ 'pattern-active-button': modalContent.partition === 2 }"
					@click="handleOptionSelect('partition', 2)">{{ $t('practiceList.partitionRandomTwice') }}
				</button>
				<button   v-clickSound   class="uni-button pattern-button" style="width: 186rpx;"
					:class="{ 'pattern-active-button': modalContent.partition === 3 }"
					@click="handleOptionSelect('partition', 3)">{{ $t('practiceList.partitionRandomTriple') }}
				</button>
				<!-- <button  v-clickSound   class="uni-button pattern-button"
					:class="{ 'pattern-active-button': modalContent.partition === 4 }"
					@click="handleOptionSelect('partition', 4)">{{ $t('selectPlayer.offline.options.partitionRandomRedStar') }}
				</button> -->
				</view>
			</template>

			<template v-if="type!==6">
				<!-- 局数选项 -->
				<text class="group-title">{{ $t('selectPlayer.offline.options.rounds') }}</text>
				<view class="button-group">
					<button v-clickSound  class="uni-button pattern-button"
						:class="{ 'pattern-active-button': modalContent.roundNbr === 10 }"
						@click="handleOptionSelect('roundNbr', 10)">10 {{ $t('round') }}
					</button>
					<button v-clickSound  class="uni-button pattern-button"
						:class="{ 'pattern-active-button': modalContent.roundNbr === 15 }"
						@click="handleOptionSelect('roundNbr', 15)">15 {{ $t('round') }}
					</button>
					<button v-clickSound  class="uni-button pattern-button"
						:class="{ 'pattern-active-button': modalContent.roundNbr === 20 }"
						@click="handleOptionSelect('roundNbr', 20)">20 {{ $t('round') }}
					</button>
					<template v-if="modalContent.roundNbr === 0">
						<input :class="{ 'uni-input-border': modalContent.roundNbr === 0 }"
							class="uni-button pattern-button" v-model="customRoundInput" type="text" inputmode="numeric"
							:placeholder="$t('selectPlayer.offline.placeholder.rounds')"
							@input="handleCustomRoundInput" />
					</template>
					<template v-else>
						<button  v-clickSound class="uni-button pattern-button"
							:class="{ 'pattern-active-button': modalContent.roundNbr === 0 }"
							@click="handleOptionSelect('roundNbr', 0)">{{ $t('selectPlayer.offline.options.customRounds') }}
						</button>
					</template>
					<button  v-clickSound v-if="type!==4" class="uni-button pattern-button"
						:class="{ 'pattern-active-button': modalContent.roundNbr === -1 }"
						@click="handleOptionSelect('roundNbr', -1)">{{ $t('selectPlayer.offline.options.unlimited') }}
					</button>
				</view>
			</template>

			<template v-if="type===6">
				<text class="group-title">{{ locale === 'zh' ? 'XO胜利条件' : 'Win Conditions'}}</text>
				<view class="button-group">
					<button v-clickSound  class="uni-button pattern-button"
						:class="{ 'pattern-active-button': modalContent.requiredLines === 1 }"
						@click="handleOptionSelect('requiredLines', 1)">{{ locale === 'zh' ? '一条线' : 'One Line'}}
					</button>
					<button v-clickSound  class="uni-button pattern-button"
						:class="{ 'pattern-active-button': modalContent.requiredLines === 2 }"
						@click="handleOptionSelect('requiredLines', 2)">{{ locale === 'zh' ? '两条线' : 'Two Line'}}
					</button>
				</view>
			</template>

			<!-- 让分机制 -->
			<template v-if="(type===1||type===2)&&duelMode!==2&&showHandicap&&isOnline!==1">
				<text class="group-title">{{ $t('selectPlayer.offline.options.handicap') }}</text>
				<view class="button-group" style="margin-bottom: 0">
					<!-- <button v-if="isOnline===1" v-clickSound  class="uni-button pattern-button manualHandicap"
						:class="{ 'pattern-active-button': modalContent.handicap === 'auto' }"
						@click="handleOptionSelect('handicap', 'auto')">{{ $t('selectPlayer.offline.options.autoHandicap') }}
					</button> -->
					<button v-if="manualHandicapButton===0" v-clickSound  class="uni-button pattern-button manualHandicap"

						:class="{ 'pattern-active-button': modalContent.handicap === 'manual' }"
						@click="handleOptionSelect('handicap', 'manual')">{{ $t('selectPlayer.offline.options.manualHandicap') }}
					</button>
					<!--        让分按钮-->

				</view>
				<view class="icon-size-30 in-game-settings">
				<image v-clickSound  v-if="modalContent.handicap === 'manual'" class="uni-img uni-img-scale2"
						src="@/static/images/settings.png" mode="aspectFill"
						@tap="emit('update:handicapModalVisible', true)" />
				</view>
			</template>
			<view v-if="!showHandicap" style="height: 60rpx;"></view>

			<template v-if="type===8">
				<text class="group-title">{{ $t('selectPlayer.offline.options.bidSequence') }}</text>
				<view class="button-group">
					<button v-clickSound  class="uni-button pattern-button"
						:class="{ 'pattern-active-button': modalContent.bidSequence === 1 ||  !modalContent.bidSequence}"
						@click="handleOptionSelect('bidSequence', 1)">{{ $t('selectPlayer.offline.options.exchangeFirstAttack') }}
					</button>
					<button v-clickSound  class="uni-button pattern-button"
						:class="{ 'pattern-active-button': modalContent.bidSequence === 2 }"
						@click="handleOptionSelect('bidSequence', 2)">{{ $t('selectPlayer.offline.options.loserFirst') }}
					</button>
				</view>
			</template>
		</view>
	</PopUpLayer>

	<view  v-clickSound  v-if="modalButtomVisible && modalVisible" class="title left-titleActive juzho" style="" @click="startGame">
		<span class="left-title-span" > {{ $t('selectPlayer.offline.options.sure') }}</span>
	</view>
	<view>
		<view  v-clickSound  v-if="modalButtomVisibleSure && modalVisible" class="titles left-titleActive juzho" style="" @click="startInviteGame">
			<span class="left-title-span"> {{ $t('selectPlayer.offline.buttons.sure') }}</span>
		</view>
	</view>
</template>

<style  lang="scss" scoped>
	.left-titleActive {
		width: 150rpx;
		height: 30rpx;
		z-index: 100;
		border-radius: 10rpx;
		background: rgba(142, 77, 190, 0.2);
		border: 1rpx solid #8857FF;
		box-shadow: 0 0 1rpx rgba(136, 87, 255, 0.3), 0 0 1rpx rgba(136, 87, 255, 0.2), 0 0 1rpx rgba(136, 87, 255, 0.1);
	}

	.juzho {
		justify-content: center;
		align-items: center;
		display: flex;
	}
	.titles{
		position: fixed;
		font-size: 18rpx;
		font-weight: 300;
		/* 适当减小字体粗细 */
		color: #ffffff;
		// -webkit-text-stroke: 0.3rpx #8856FF;
		/* 更细的描边 */
		text-shadow: 0 0 3px #8856FF,
			/* 核心光晕，减小扩散半径 */
			0 0 6px #8856FF,
			/* 外层光晕 */
			0 0 10px #8856FF,
			/* 更外层散光 */
			0 0 20px #8856FF;
		/* 扩展散光层，弱化散光 */
		left: 50%;
		transform: translateX(-50%);
		bottom: 5%;
	}

	.title {
		position: absolute;
		bottom: 5rpx;
		font-size: 18rpx;
		font-weight: 300;
		/* 适当减小字体粗细 */
		color: #ffffff;
		// -webkit-text-stroke: 0.3rpx #8856FF;
		/* 更细的描边 */
		text-shadow: 0 0 3px #8856FF,
			/* 核心光晕，减小扩散半径 */
			0 0 6px #8856FF,
			/* 外层光晕 */
			0 0 10px #8856FF,
			/* 更外层散光 */
			0 0 20px #8856FF;
		/* 扩展散光层，弱化散光 */
	}

	.option-group {
		margin: -10rpx 0;
	}


	.button-group {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 10rpx;
		margin: 10rpx 0;
		align-items: center;
	}

	.uni-input-border {
		box-sizing: border-box;
		background: rgba(136, 87, 255, 0.14) !important;

		/* 背景模糊 */
		backdrop-filter: blur(5px);
		/* 使用 backdrop-filter 来模糊背景 */
		/* 边框阴影效果（散光） */
		box-shadow: 0 4px 8px rgba(136, 87, 255, 0.5), 0 0 10px rgba(136, 87, 255, 0.25) !important;

		border-radius: 10rpx;
		border: 3rpx solid #8857FF !important;
		// 过渡动画
		transition: all 0.3s;
	}

  .uni-button{
    width: 110rpx;
  }

  .manualHandicap{
    width: 200rpx;
    height: 45rpx;
  }
</style>