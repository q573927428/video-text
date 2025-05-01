const express = require('express');
const axios = require('axios');
const util = require('util');
const fs = require('fs');
const path = require('path');

// 引入 cors 模块
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// 将 fs.readFile 包装成 Promise
const readFile = util.promisify(fs.readFile);

// 从环境变量中读取 API_KEY
const API_KEY = 'sk-669d0e217f044268aa9c484807eef1a8';
const SUBMISSION_URL = 'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription';
const POLLING_INTERVAL_MS = 5000;

// 中间件：解析JSON请求体
app.use(express.json());

// 使用 cors 中间件
app.use(cors());

// 提供静态文件服务
app.use(express.static(path.join(__dirname)));

// 路由：处理语音识别请求
app.post('/api/transcribe', async (req, res) => {
    const { audioUrl } = req.body;
    if (!audioUrl) {
        return res.status(400).json({ error: '缺少音频URL' });
    }

    try {
        const recognizedText = await transcribeAudio(audioUrl);
        res.json({ text: recognizedText });
    } catch (error) {
        console.error('语音识别过程中发生错误:', error);
        res.status(500).json({ error: '语音识别失败', message: error.message });
    }
});

// 语音识别核心逻辑
async function transcribeAudio(audioUrl) {
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
        const taskId = submissionResponse.data.output.task_id;
        if (!taskId) {
            throw new Error('未能获取任务ID');
        }

        console.log(`获取到任务ID: ${taskId}. 正在轮询结果...`);

        // 轮询任务结果
        let taskStatus = submissionResponse.data.output.task_status;
        let recognizedText = null;

        while (taskStatus === 'PENDING' || taskStatus === 'RUNNING') {
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

        return recognizedText;

    } catch (error) {
        // 添加: 更详细的错误信息记录
        console.error('语音识别过程中发生错误:', error.response ? error.response.data : error);
        throw error;
    }
}

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
}).on('error', (error) => {
    // 添加: 服务器启动错误处理
    console.error('服务器启动失败:', error);
});