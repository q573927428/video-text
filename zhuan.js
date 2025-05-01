const express = require('express');
const axios = require('axios'); // 或使用 node-fetch 等库
const app = express();
const port = 3000;

// 假设你有一个函数可以根据 videoId 获取原始视频URL
async function getOriginalVideoUrl(videoId) {
    // 这里根据你的业务逻辑，可能是查数据库，或者调用上游API获取
    // 示例：
    console.log(`Workspaceing original URL for videoId: ${videoId}`);
    // 硬编码一个示例URL，实际应用中这里是动态获取的
    const originalUrl = 'https://v26-default.365yg.com/af55c224ace18eaf53c757cc07711b0d/6812e5e8/video/tos/cn/tos-cn-ve-15c001-alinc2/oIgRIEKNoAexTIDxADBuoVbEFilQDIf9bA0cRs/';
    return originalUrl;
}

// 设置一个路由来处理视频请求，使用 .mp4 结尾
app.get('/video/:videoId.mp4', async (req, res) => {
    const videoId = req.params.videoId;

    try {
        const originalUrl = await getOriginalVideoUrl(videoId);

        if (!originalUrl) {
            res.status(404).send('Video not found');
            return;
        }

        // 使用 axios 发起流式请求到原始视频URL
        const response = await axios({
            method: 'get',
            url: originalUrl,
            responseType: 'stream' // 关键：将响应作为流处理
        });

        // 设置正确的 Content-Type 头部
        res.setHeader('Content-Type', 'video/mp4');
        // 也可以尝试复制其他相关头部，如 Content-Length, Range 等，以支持视频播放器的seek功能
        if (response.headers['content-length']) {
             res.setHeader('Content-Length', response.headers['content-length']);
        }
        // 如果原始请求带 Range 头部，这里也需要处理并传给原始URL请求

        // 将原始响应的流直接 pipe 到当前响应
        response.data.pipe(res);

        // 监听错误
        response.data.on('error', (err) => {
            console.error('Error piping video stream:', err);
            if (!res.headersSent) { // 避免在响应头已发送后再次发送
                res.status(500).send('Error retrieving video stream.');
            } else {
                 // 如果已经开始传输数据，错误可能导致连接中断
                 res.end(); // 尝试结束响应
            }
        });

        // 监听完成
        response.data.on('end', () => {
            console.log(`Finished streaming video: ${videoId}`);
        });


    } catch (error) {
        console.error('Error fetching original video URL or streaming:', error);
        if (!res.headersSent) {
           res.status(500).send('Internal server error.');
        } else {
            res.end();
        }
    }
});

app.listen(port, () => {
    console.log(`Video proxy service listening at http://localhost:${port}`);
});