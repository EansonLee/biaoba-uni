import Invite from './offer.vue'
 
export default {
  install(app) {
    const Profile = app.extend(Invite)
    
    // 弹出邀请
    app.prototype.$openInvite = function(params) {
      const instance = new Profile()
      instance._props._specia = params
      instance.vm = instance.$mount()
      const InviteEle = document.body.lastElementChild
      if(InviteEle.className === 'gamePop') return
      setTimeout(() => document.body.appendChild(instance.vm.$el))
      return instance
    }
 
    // 关闭邀请
    app.prototype.$closeInvite = function() {
      const instance = new Profile()
      instance.vm = instance.$mount()
      const InviteEle = document.body.lastElementChild
      if(InviteEle.className !== 'gamePop') return
      document.body.removeChild(InviteEle)
      return instance
    }
  }
}