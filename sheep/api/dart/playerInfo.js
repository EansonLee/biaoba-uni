import request from '@/sheep/request';
import {ENDPOINTS, MODULES} from '@/sheep/api/enum/Common';

export const PlayerApi = `${MODULES.DART}${ENDPOINTS.PLAYERINFO}`;

export default {
    PlayerApi : `${MODULES.DART}${ENDPOINTS.PLAYERINFO}`,
    // 玩家相关接口
    Api: {
        // 通过玩家id获取玩家生涯数据
        getPlayerInfo: (payerId) =>
            request({
                url: `${PlayerApi}/getPlayerInfo?payerId=`+payerId,
                method: 'GET',
            }),
        // 保存玩家生涯数据
        updatePlayer: (formData, showError = false) => {
            return request({
                url: `${PlayerApi}/update`,
                method: 'POST',
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                data: formData,
                custom: {
                    showError: showError // 允许控制是否显示错误提示
                }
            })
        }
    },
};
