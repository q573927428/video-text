const fs = require('fs');
const axios = require('axios');

const videoUrl = 'https://v26-default.365yg.com/af55c224ace18eaf53c757cc07711b0d/6812e5e8/video/tos/cn/tos-cn-ve-15c001-alinc2/oIgRIEKNoAexTIDxADBuoVbEFilQDIf9bA0cRs/';

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
        const writer = fs.createWriteStream(outputPath);
        console.log('视频下载中...');
        // 将响应数据流写入文件
        // 这里使用了 Node.js 的 fs 模块来创建一个可写流，并将响应数据流管道到这个可写流中
        response.data.pipe(writer);
        // 等待写入完成
        // 这里使用了 Promise 来处理异步操作，确保在写入完成后才返回结果
        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                resolve(`http://127.0.0.1:5500/${outputPath}`); // ✅ 返回视频文件存储路径
                console.log('视频下载完成');
            });
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('下载失败:', error);
    }
}

downloadVideo(videoUrl) 
