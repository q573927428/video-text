const fs = require('fs');
const path = require('path');
const qiniu = require('qiniu');


console.log(process.env.ACCESSKEY);

// const accessKey = process.env.ACCESSKEY;
// const secretKey = process.env.SECRETKEY;
// const bucket = process.env.BUCKET;

const accessKey = 'IQIe_CdDc13n65BAyhGfQs8KGSXtk';
const secretKey = 'eunuh3lx_yk1rdnZRoThN2eh_6tOJSEAD7uupYsd';
const bucket = 'yisuoyi';

console.log('accessKey:', accessKey);
const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);

function uploadFile(filePath, keyName) {
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

  formUploader.putFile(uploadToken, keyName, filePath, putExtra, function(respErr, respBody, respInfo) {
    if (respErr) {
      throw respErr;
    }
    if (respInfo.statusCode === 200) {
      console.log('上传成功:', respBody);
    //   const file_url = `https://suo.zuosuo.com/${respBody.key}`;
    //   console.log('视频链接:', file_url);
    //   return file_url;
    } else {
      console.log('上传失败:', respBody);
    }
  });
}

// 调用上传
const videoPath = path.resolve(__dirname, 'video_1746070373030.mp4');
uploadFile(videoPath, `avideos/video_1746070373030.mp4`);

// module.exports = { uploadFile };