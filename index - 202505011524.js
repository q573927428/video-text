require('dotenv').config();
const express = require('express');
const axios = require('axios');
const util = require('util');
const fs = require('fs');
const path = require('path');
const { once } = require('events');
const { uploadFile } = require('./qiniu');

// 引入 cors 模块
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// 将 fs.readFile 包装成 Promise
const readFile = util.promisify(fs.readFile);

// 从环境变量中读取 API_KEY
const API_KEY = process.env.API_KEY;
console.log(API_KEY);

const SUBMISSION_URL = 'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription';
const POLLING_INTERVAL_MS = 20000;


// 中间件：解析JSON请求体
app.use(express.json());

// 使用 cors 中间件
app.use(cors());

// 提供静态文件服务
app.use(express.static(path.join(__dirname)));

// 路由：处理语音识别请求
app.post('/api/transcribe', async (req, res) => {
    const { audioUrl } = req.body;
    console.log('接收到的音频URL:', audioUrl);
    
    if (!audioUrl) {
        return res.status(400).json({ error: '缺少音频URL' });
    }

    try {
        // const videoUrl = 'https://suo.zuosuo.com/avideos/video_1746083428087.mp4'; // 调用视频下载函数
        // const recognizedText = await transcribeAudio(videoUrl);
        const recognizedText = await cst(audioUrl);
        res.json({ text: recognizedText });
    } catch (error) {
        console.error('语音识别过程中发生错误:', error);
        res.status(500).json({ error: '语音识别失败', message: error.message });
    }
});

// 语音识别核心逻辑
async function transcribeAudio(audioUrl) {
    console.log('当前transcribeAudio：',audioUrl);
    try {
        // 提交语音识别任务
        const submissionPayload = {
            model: 'paraformer-v2',
            input: { file_urls: [audioUrl] },
            parameters: { channel_id: [0] }
        };

        console.log('正在提交语音识别任务...');
        const submissionResponse = await axios.post(SUBMISSION_URL, submissionPayload, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'X-DashScope-Async': 'enable'
            }
        });

        console.log('任务提交成功');
        console.log('提交结果:', submissionResponse.data);
        const taskId = submissionResponse.data.output.task_id;
        if (!taskId) {
            throw new Error('未能获取任务ID');
        }

        console.log(`获取到任务ID: ${taskId}. 正在轮询结果...`);
        // 轮询任务结果
        let taskStatus = submissionResponse.data.output.task_status;
        let recognizedText = null;

        while (taskStatus === 'PENDING' || taskStatus === 'RUNNING' ) {
            await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));

            const pollingUrl = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;
            const pollingHeaders = { 'Authorization': `Bearer ${API_KEY}` };

            console.log(`正在查询任务状态，URL: ${pollingUrl}`);
            const pollingResponse = await axios.get(pollingUrl, { headers: pollingHeaders });
            taskStatus = pollingResponse.data.output.task_status;
            console.log(`任务状态: ${taskStatus}`);

            const transcription_url = pollingResponse.data.output.results[0].transcription_url;
            const properties = await axios.get(transcription_url);

            if (taskStatus === 'SUCCEEDED') {
                recognizedText = properties.data.transcripts[0].text;
                break;
            } else if (taskStatus === 'FAILED') {
                throw new Error(`语音识别任务失败: ${pollingResponse.data.message}`);
            }
        }

        console.log('语音识别结果:', recognizedText);
        
        return recognizedText;

    } catch (error) {
        // 添加: 更详细的错误信息记录
        console.error('语音识别过程中发生错误:', error.response ? error.response.data : error);
        throw error;
    }
}

async function cst(videoUrl) {
    console.log('当前cst：',videoUrl);
    const henghengmao_api = 'https://h.aaaapp.cn/single_post';       // # 单个帖子提取接口 (如果主页批量提取使用：https://h.aaaapp.cn/posts)
    const userId = '67B46DF8FD1C23206E0572850AC213B5';    //这里改成你自己的 userId
    const secretKey = '1bad32e759478456bdd335fda4730981'; //这里改成你自己的 secretKey

    const henghengmao_params = {
        "userId": userId,
        "secretKey": secretKey,
        "url": videoUrl
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

        const audioUrl = `https://suo.zuosuo.com/avideos/video_${time}.mp4`
        transcribeAudio(audioUrl); // 调用语音识别函数
        return audioUrl;    
    } catch (error) {
        console.error('视频下载失败:', error);
    }
}

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
}).on('error', (error) => {
    // 添加: 服务器启动错误处理
    console.error('服务器启动失败:', error);
});