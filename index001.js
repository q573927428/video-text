const fs = require('fs');
const path = require('path');
const axios = require('axios'); // 使用 axios 发送 HTTP 请求
const util = require('util');

const { uploadFile } = require('./qiniu');

// 将 fs.readFile 包装成 Promise，方便使用 async/await
const readFile = util.promisify(fs.readFile);

const API_KEY = 'sk-669d0e217f044268aa9c484807eef1a8';
const SUBMISSION_URL = 'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription'; // 假设的提交任务接口地址
const POLLING_INTERVAL_MS = 5000; // 轮询间隔，单位毫秒

async function transcribeAudio() {
    //http://v.baqiwu.com/202503/ee7d5155c493b.mp4
    try {
        // 1. 准备提交任务的请求体
        const submissionPayload = {
            model: 'paraformer-v2', // 使用 paraformer-v2 模型
            input: {
              file_urls: [
                // "https://dashscope.oss-cn-beijing.aliyuncs.com/samples/audio/paraformer/hello_world_female2.wav"
                "https://suo.zuosuo.com/avideos/video_1746069478875.mp4"
              ] // 使用 Base64 编码的音频文件数据
            },
            parameters: {
                channel_id: [0] // 指定通道 ID
            }
        };

        // 2. 提交语音识别任务
        console.log('正在提交语音识别任务...');
        const submissionResponse = await axios.post(SUBMISSION_URL, submissionPayload, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`, // 使用 Bearer token 进行鉴权
                'Content-Type': 'application/json', // 请求体类型为 JSON
                'X-DashScope-Async': 'enable' // 启用异步模式
            }
        });

        console.log('任务提交成功');

        const taskId = submissionResponse.data.output.task_id;
        if (!taskId) {
            throw new Error('从提交响应中未能获取任务 ID。');
        }

        console.log(`获取到任务 ID: ${taskId}. 正在轮询结果...`);

        // 3. 轮询任务结果
        let taskStatus = submissionResponse.data.output.task_status;
        let recognizedText = null;

        while (taskStatus === 'PENDING' || taskStatus === 'RUNNING') {
            await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS)); // 等待一段时间再轮询

            // 更新轮询请求的 URL 和头部信息，使其与 curl 命令一致
            const pollingUrl = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`; // 查询任务结果的接口地址
            const pollingHeaders = {
                'Authorization': `Bearer ${API_KEY}` // 轮询时同样需要鉴权
            };

            console.log(`正在查询任务状态，URL: ${pollingUrl}`);
            
            const pollingResponse = await axios.get(pollingUrl, {
                headers: pollingHeaders
            });

            taskStatus = pollingResponse.data.output.task_status;
            console.log(`任务状态: ${taskStatus}`);

            const results = pollingResponse.data.output.results;
            // console.log('results',results );

            const transcription_url = pollingResponse.data.output.results[0].transcription_url;
            // console.log('transcription_url',transcription_url );
            
            const properties = await axios.get(transcription_url);
            // console.log('properties',properties.data.transcripts );

            if (taskStatus === 'SUCCEEDED') {
                recognizedText = properties.data.transcripts[0].text; // 获取识别结果文字
                break; // 任务成功，退出轮询
            } else if (taskStatus === 'FAILED') {
                throw new Error(`语音识别任务失败: ${pollingResponse.data.message}`);
            }
            // 如果是 PENDING 或 RUNNING，则继续下一次轮询
        }

        // 4. 返回识别到的文字
        return recognizedText;

    } catch (error) {
        console.error('语音识别过程中发生错误:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        throw error; // 将错误向上抛出
    }
}

// 执行转写过程并打印结果
transcribeAudio()
    .then(text => {
        if (text) {
            console.log('\n最终识别到的文字:');
            console.log(text);
        } else {
            console.log('\n转写未能获取到文字结果。');
        }
    })
    .catch(() => {
        console.error('\n语音识别过程失败。');
    });