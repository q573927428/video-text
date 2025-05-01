require('dotenv').config();
const { log } = require('console');
const fs = require('fs');
const path = require('path');
const qiniu = require('qiniu');

const accessKey = process.env.ACCESSKEY;
const secretKey = process.env.SECRETKEY;
const bucket = process.env.BUCKET;

const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);

async function uploadFile(filePath, keyName) {
  const options = {
    scope: bucket,
    deadline: Math.floor(Date.now() / 1000) + 3600
  };

  const putPolicy = new qiniu.rs.PutPolicy(options);
  const uploadToken = putPolicy.uploadToken(mac);

  const config = new qiniu.conf.Config();
  config.zone = qiniu.zone.Z2; // 华东地区

  const formUploader = new qiniu.form_up.FormUploader(config);
  const putExtra = new qiniu.form_up.PutExtra();

  try { 
    const file_url = await formUploader.putFile(uploadToken, keyName, filePath, putExtra );
    // console.log('视频链接:', file_url.data.key);
    const v_url = `https://suo.zuosuo.com/${file_url.data.key}`;
    return v_url;
  } catch (error) {
    console.error('上传失败:', error);
  }
}

// 调用上传
// const videoPath = path.resolve(__dirname, 'video_1746070373030.mp4');
// uploadFile(videoPath, `avideos/video_1746070373030.mp4`);

module.exports = { uploadFile };