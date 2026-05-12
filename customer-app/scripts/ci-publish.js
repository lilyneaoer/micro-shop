const ci = require("miniprogram-ci");
const fs = require("fs");
const axios = require("axios");
const QRCode = require("qrcode");

// 环境变量
const {
  WX_APPID,
  WX_PRIVATE_KEY,
  WECOM_WEBHOOK,
  GITEE_BRANCH,
  GITEE_COMMIT_MSG,
} = process.env;

(async () => {
  try {
    console.log("✅ 开始上传微信小程序...");

    const project = new ci.Project({
      appid: WX_APPID,
      type: "miniProgram",
      projectPath: "./../dist", // taro
      // projectPath: './dist/build/mp-weixin', // uniApp
      privateKey: WX_PRIVATE_KEY,
      ignores: ["node_modules/**/*"],
    });

    const uploadResult = await ci.upload({
      project,
      version: "1.0.0",
      desc: `${GITEE_BRANCH} | ${GITEE_COMMIT_MSG || "自动构建"}`,
      setting: { es6: true, minify: true },
      onProgressUpdate: console.log,
    });

    console.log("✅ 上传成功");

    // 生成二维码
    const qrUrl = `https://open.weixin.qq.com/showqr?appid=${WX_APPID}`;
    const qrBase64 = await QRCode.toDataURL(qrUrl);

    // 推企业微信
    if (WECOM_WEBHOOK) {
      await axios.post(WECOM_WEBHOOK, {
        msgtype: "news",
        news: {
          articles: [
            {
              title: "小程序构建完成",
              description: `分支：${GITEE_BRANCH}\n信息：${GITEE_COMMIT_MSG}`,
              url: qrUrl,
              picurl: qrBase64,
            },
          ],
        },
      });
      console.log("✅ 企业微信推送成功");
    }
  } catch (err) {
    console.error("❌ 发布失败：", err);
    process.exit(1);
  }
})();
