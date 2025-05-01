const fs = require('fs');
const path = require('path');
const axios = require('axios'); // 使用 axios 发送 HTTP 请求
const util = require('util');
const { once } = require('events'); // Node.js 内置模块

const { uploadFile } = require('./qiniu');

async function cst() {
    const henghengmao_api = 'https://h.aaaapp.cn/single_post';       // # 单个帖子提取接口 (如果主页批量提取使用：https://h.aaaapp.cn/posts)
    const userId = '67B46DF8FD1C23206E0572850AC213B5';    //这里改成你自己的 userId
    const secretKey = '1bad32e759478456bdd335fda4730981'; //这里改成你自己的 secretKey

    let url = 'https://v.douyin.com/juNxdQx6Dvs/';

    const henghengmao_params = {
        "userId": userId,
        "secretKey": secretKey,
        "url": url
    };
    try {
        // 使用 axios 发送 POST 请求
        const reqData = await axios.post(henghengmao_api, henghengmao_params, {
            headers: {
                'content-type': 'application/json;charset=UTF-8'
            }
        })
        console.log("视频标题：",reqData.data.data.text);
        const resource_url = reqData.data.data.medias[0].resource_url
        // console.log("视频链接：",resource_url);
        const videoUrl = await downloadVideo(resource_url); // 调用下载函数
        return videoUrl;
    }
    catch (error) {
        console.error('下载失败:', error);
    }
}
async function downloadVideo(videoUrl) {
    const time = Date.now(); // 获取当前时间戳
    const outputPath = `video_${time}.mp4`; // 生成文件名
    try {
        const response = await axios({
        url: videoUrl,
        method: 'get',
        responseType: 'stream',
        });
        // 创建一个可写流，将视频数据写入文件
        console.log('视频下载中...');
        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);

        // 等待 finish 事件
        await once(writer, 'finish');
        console.log('视频下载完成，开始上传到七牛云...');

        // 上传到七牛云
        const file_url = await uploadFile(outputPath, `avideos/video_${time}.mp4`);
        console.log('视频上传成功:', file_url);

        return `https://suo.zuosuo.com/avideos/video_${time}.mp4`

    } catch (error) {
        console.error('视频下载失败:', error);
    }
}

cst(); 
