# Airap FFmpeg Lineart Transcoder Microservice

专为 `airap-video` SaaS 设计的轻量级线稿提取微服务。
专门配合 Cloudflare Workers / Serverless 边缘环境，负责将用户上传的实拍参考视频秒级转换为**黑白线稿动作骨架视频**，消除人种肤色泄漏与换脸鬼影，保留纯净身体律动与踩拍口型。

---

## 部署方式 (4 选 1)

### 方式 1：Docker 一键运行（推荐，本地测试或任意 VPS）
```bash
cd services/ffmpeg-transcoder
docker build -t airap-ffmpeg-transcoder .
docker run -d -p 8080:8080 --name airap-transcoder airap-ffmpeg-transcoder
```
健康检查：`curl http://localhost:8080/health`

### 方式 2：1-Click 部署到 Railway / Render / Zeabur
直接将当前目录作为独立服务推送到 Railway 或 Render，环境变量设置 `PORT=8080`，获取公开 HTTPS 域名，如 `https://transcoder.yourdomain.com`。

### 方式 3：阿里云函数计算 (FC) / 腾讯云 SCF
使用内置的 Node.js 镜像或 Custom Container 镜像，挂载公共 FFmpeg 层，每秒计费，每月百万次免费调用。

---

## 在主项目中配置

部署完成后，在 `shipany-video-lite` 中配置该服务地址（任选一种）：
1. 在 `.env.development` 或生产环境变量中添加：
   ```env
   LINEART_TRANSCODER_URL=https://transcoder.yourdomain.com
   ```
2. 或者在主站管理后台 **Admin -> Settings -> AI** 中填写 `Lineart Transcoder URL`。

当用户在动作模仿模式（`mimic`）下上传视频时，系统会自动将视频发送到此微服务提取线稿骨架，并存回 Cloudflare R2，再提供给 Wan 3.0 / Kling 生成。

