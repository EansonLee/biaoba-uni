import Toast from '@/sheep/components/util/toast/toast.vue';
import messageToastStore from "@/sheep/stores/message";

// 判断当前环境
const isH5 = process.env.UNI_PLATFORM === 'h5';

let toastInstance = null;
// 显示 toast
const showNativeToast = (options) => {
    // 标记可见
    messageToastStore().visible = true;

    const isString = typeof options === 'string';
    const msg = isString ? options : (options?.message || '');
    const title = isString ? '' : (options?.title || '');
    const duration = isString ? 1500 : (options?.duration ?? 1500);
    const sticky = isString ? false : !!options?.isSticky;

    // 统一写入 Store，避免状态残留（如 isSticky 误保留）
    messageToastStore().title = title;
    messageToastStore().message = msg;
    messageToastStore().isSticky = sticky;
    messageToastStore().duration = duration;

    // const message = typeof options === 'string' ? options : (options.message || options.title || '');
    // plus.nativeUI.toast(message, {
    //     verticalAlign: 'center',
    //     duration: options.duration || 'short'
    // });
};

// 统一的 showToast 方法
export const showToast = (options) => {
    // H5 环境使用自定义组件
    // if (isH5) {
    //   const toast = createH5Toast();
    //   toast.showToast(options);
    //   return;
    // }
    //
    // App 环境使用 plus.nativeUI.toast
    showNativeToast(options);
};

// 统一的 hideToast 方法
export const hideToast = () => {
    if (isH5 && toastInstance) {
        toastInstance.hideToast();
    }
};

export default {
    show: showToast,
    hide: hideToast
};
