const fs = require('fs');
const path = require('path');
const axios = require('axios'); // 使用 axios 发送 HTTP 请求
const util = require('util');

const henghengmao_api = 'https://h.aaaapp.cn/single_post';       // # 单个帖子提取接口 (如果主页批量提取使用：https://h.aaaapp.cn/posts)
const userId = '67B46DF8FD1C23206E0572850AC213B5';    //这里改成你自己的 userId
const secretKey = '1bad32e759478456bdd335fda4730981'; //这里改成你自己的 secretKey

let url = 'https://v.douyin.com/juNxdQx6Dvs/';

const henghengmao_params = {
    "userId": userId,
    "secretKey": secretKey,
    "url": url
};

async function cst() {

    // 使用 axios 发送 POST 请求
    const reqData = await axios.post(henghengmao_api, henghengmao_params, {
        headers: {
            'content-type': 'application/json;charset=UTF-8'
        }
    })
    console.log("视频标题：",reqData.data.data.text);
    const resource_url = reqData.data.data.medias[0].resource_url
    return resource_url;
}

cst();