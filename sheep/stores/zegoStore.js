import {defineStore} from 'pinia';
// import sheep from "@/sheep";
// #ifdef APP-PLUS
import ZIM from '@/sheep/components/zego-ZIMUniplugin-JS/lib/index.js';
// #endif

// #ifdef H5
import { ZIM } from 'zego-zim-web';
// #endif
import player from "@/sheep/api/dart/player";
import keyCenter from "@/composables/KeyCenter.js";
import eventBus from "@/sheep/util/eventBus";
const zimStore = defineStore('zimStore', {
        state: () => ({
          title: '',
          message: {
			  tobiao:{},
			  changeHands:{},
			  yaoqing:[],
			  endGame:{},
			  rethrow:{},
			  refuse:[],
			  accept:[],
			  cancel:[],
			  returnToLobby:[],
			  addFriend:[],
			  // 线上混合模式-下一局握手
			  readyNext:{},
			  // 线上混合模式-开始下一局显式指令
			  startNext:{},
		  },
          duration: 1500,
          isSticky: false,
		  zim :  null,
		  isLogin:false,
        }),
        actions: {
			initEvent(){
				let _this = this
				if(_this.zim === null){
					_this.zim = ZIM.create({ appID: keyCenter.getAppID(),
					                         appSign:  keyCenter.getAppSign(),
								           })
					// this.zim = ZIM.getInstance();
				}
				// 注册监听“运行时错误信息”的回调  
				_this.zim.on('error', function (zim, errorInfo) {
				    // console.log('error', errorInfo.code, errorInfo.message);
				});
				
				// 注册监听“收到单聊消息”的回调
				_this.zim.on('receivePeerMessage', function (zim, { messageList, fromConversationID }) {
					_this.zim.deleteAllConversationMessages(zim);
					console.log('收到单聊消息', messageList);
					const raw = messageList[0] || {};
					let msgInfo = {};
					try {
						if (typeof raw.message === 'string') {
							msgInfo = JSON.parse(raw.message);
						}
					} catch(e) { msgInfo = {}; }
					// 兼容：若消息体不是JSON，尝试从extendedData读取msgType及附加字段（如modeId）
					try {
						if ((!msgInfo || !msgInfo.msgType) && typeof raw.extendedData === 'string') {
							const ext = JSON.parse(raw.extendedData);
							if (ext && ext.msgType) {
								msgInfo.msgType = ext.msgType;
								msgInfo.value = msgInfo.value || {};
								if (ext.modeId) msgInfo.value.modeId = ext.modeId;
							}
						}
					} catch(e) {}
					msgInfo.messageID = raw.messageID;
					_this.setMessage(msgInfo, fromConversationID);
				});


				
				_this.zim.on('callInvitationCreated', (zim, info) => {
				    // console.log('Call invitation created:', info);
				});
				
				_this.zim.on('callInvitationReceived', (zim, { callID, inviter }) => {
				    // console.log('Call invitation received, callID:', callID, 'from:', inviter);
				});
				
				// 注册监听“网络连接状态变更”的回调
				_this.zim.on('connectionStateChanged', function (zim, { state, event, extendedData }) {
				    console.log('网络连接状态变更：connectionStateChanged', state, event, extendedData);
				});
				
				// 注册监听“Token 即将过期”的回调
				_this.zim.on('tokenWillExpire', function (zim, { second }) {
				    console.log('Token 即将过期', second);
				    // 可以在这里调用 renewToken 接口来更新 token
				    // 新 token 生成可以参考上文
				    _this.zim.renewToken(token)
				        .then(function({ token }){
				            // 更新成功
				        })
				        .catch(function(err){
				            // 更新失败
				        })
				});
			},
			setMessage( messageList, fromConversationID) {
				let msgType = messageList.msgType;
				if(!this.message[msgType]){
					this.message[msgType] = {}
				}
				if(msgType !== "refuse" && msgType !== "yaoqing" && msgType !== "accept" && msgType !== "cancel" && !this.message[msgType][fromConversationID]){
					this.message[msgType][fromConversationID] = []
				}
				if(msgType === "refuse"  || msgType === "yaoqing" || msgType === "accept" || msgType === "cancel"){

					if(!this.message[msgType].some(item => item.messageID === messageList.messageID)){
						this.message[msgType].push(messageList);
					}
				}else if(msgType === "returnToLobby"){
					// 处理返回大厅的消息
					if(!this.message[msgType].some(item => item.messageID === messageList.messageID)){
						this.message[msgType].push(messageList);
					}
				}else if(msgType === "addFriend"){
					if(!this.message[msgType].some(item => item.messageID === messageList.messageID)){
						this.message[msgType].push(messageList);
					}
				} else{
					if(!this.message[msgType][fromConversationID].some(item => item.messageID === messageList.messageID)){
						this.message[msgType][fromConversationID].push(messageList);
					}
				}
				console.log("-------------------",this.message)
			},
			 getMessage() {
				 console.log("获取数据")
				return this.message;
			},
			 getMessageOnType(type) {
			 	return this.message[type];
			},
            /**
             * 初始化登录，用户登录成功后调用
             */
            async initLogin() {
				let _this = this
				// 确保实例已创建
				if(!_this.zim){
					this.initEvent();
				}
				if(!_this.isLogin){
					try{ _this.zim && _this.zim.logout && _this.zim.logout(); }catch(e){}
					const userInfo =uni.getStorageSync('userInfo');
					// 兼容多种token来源，尽可能保证能登录ZIM
					const fallbackToken = uni.getStorageSync('zeGoToken') 
						|| uni.getStorageSync('zeGoTokenThird') 
						|| uni.getStorageSync('ZEGO_TOKEN_BACKUP') 
						|| uni.getStorageSync('ZEGO_SESSION_TOKEN');
					var config = {
					    userName: userInfo?.playerName || '',
					    token: fallbackToken,
					};
					if(!config.token){
						console.warn('[ZIM] 缺少token，跳过登录');
						return;
					}

					_this.zim.login(userInfo.playerOnly, config)
					    .then(function (ref) {
							console.log("登录成功")
							try{ _this.zim.deleteAllConversationMessages(config); }catch(e){}
							console.log("缓存删除成功")
							// _this.updateOnLine(1);
					        // 登录成功 
							_this.isLogin = true;
					    })
					    .catch(function (err) {
							console.log("登录失败",err)
					        // 登录失败
					    });
				}
            },
			async logout() {
				let _this = this
				_this.zim.logout();
			},
			async updateOnLine(satte) {
				console.log("-------------------------------1")
			    player.Api.updateOnLine(satte);
				console.log("-------------------------------")
			},
			/**
			 * 发送单聊 `Text` 信息 userId 地方id
			 */
			async sendMessage(userId,messageTextObj,conversationType = 0) {
				console.log("发送单聊")
				// 发送单聊 `Text` 信息
				var config = { 
				    priority: 1, // 设置消息优先级，取值为 低：1（默认），中：2，高：3
				};
				
				// var messageTextObj = { type: 1, message: '文本消息内容', extendedData: '消息的扩展信息（可选）' };
				var notification = {
				    onMessageAttached: function(message) {
				        // todo: Loading
				    }
				}
				this.zim.sendMessage(messageTextObj, userId, conversationType, config, notification)
				    .then(function ({ message }) {
				        // 发送成功
						console.log("发送成功")
				    })
				    .catch(function (err) {
				        // 发送失败
						console.log("发送失败", err)
						let msgType = undefined;
						try {
							if (messageTextObj && typeof messageTextObj.extendedData === 'object') {
								msgType = messageTextObj.extendedData.msgType;
							}
							if (!msgType && messageTextObj && typeof messageTextObj.message === 'string') {
								const parsed = JSON.parse(messageTextObj.message);
								msgType = parsed && parsed.msgType ? parsed.msgType : msgType;
							}
						} catch (e) {}
						eventBus.emit('sendMessageError', { msgType, error: err, toUserId: userId })

				    });
				 
		},
		// 开启数据持久化
		persist: {
		    enabled: true,
		    strategies: [
		        {
		            key: 'zego-store',
		        },
		    ],
		},
	},
	
	
});

export default zimStore;