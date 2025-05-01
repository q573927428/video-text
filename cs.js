// 引入 axios 库
// 如果你还没有安装 axios，请在终端运行 npm install axios
const axios = require('axios');

// 要获取真实地址的视频链接
const videoUrl = 'https://v26-default.365yg.com/7be1031283b42611b78d950cff8ed719/6812648c/video/tos/cn/tos-cn-ve-15c001-alinc2/oIgRIEKNoAexTIDxADBuoVbEFilQDIf9bA0cRs/';

async function getRealVideoUrl(url) {
  try {
    // 发送 GET 请求，axios 默认会跟随重定向
    const response = await axios.get(url);

    // 最终的 URL 可以在响应的 request.res.responseUrl 中找到
    // 或者在 response.request.path 中找到（取决于 axios 版本和具体情况）
    // 经过测试，对于这种重定向，response.request.res.responseUrl 通常是最终地址
    const realUrl = response.request.res.responseUrl;

    if (realUrl) {
      console.log('视频的真实地址是:', realUrl);
      return realUrl;
    } else {
      console.log('未能获取到视频的真实地址，可能没有发生重定向。');
      // 如果没有重定向，原始 URL 可能就是真实地址，或者需要进一步解析响应体
      console.log('原始 URL:', url);
      return url; // 返回原始 URL 或根据需要处理
    }

  } catch (error) {
    console.error('获取视频真实地址时发生错误:', error.message);
    return null; // 发生错误时返回 null
  }
}

// 调用函数获取真实地址
getRealVideoUrl(videoUrl);
