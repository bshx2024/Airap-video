# AI generation and polling

- Keep one normalized contract for `taskStatus`, `taskInfo`, `taskResult`, and deeply nested media URLs. Use `extractMediaUrl` for image/video and `extractAudioUrl` for music; never treat an audio cover image as the audio result.
- Async submission must persist the DB task, start foreground polling, and keep background polling for refresh/route changes. Pollers must stop on success, failure, cancellation, timeout, unmount, and route/media changes.
- Never let an older poll overwrite a newer terminal state. Batch polling must query the exact pending IDs and exclude tasks owned by a foreground poller.
- A provider response marked success without a usable media URL is failure and must revoke consumed credits.
- Mock tasks advance through `taskInfo.mockQueryCount`; do not discard mock `taskInfo/taskResult` while status is `processing`, or the counter freezes forever.
- Preserve explicit generation intent only: unauthenticated “Generate” stores a draft; passive page visits must not auto-submit. After auth, consume the draft once, clean the query string, and submit with the saved model/options/images.
- Separate text-to-video, image-to-video, text-to-image, image-to-image, music, and PNG-maker options. Unsupported image models must receive no stale image parameters.
- Always clear the submit loading state in `finally` when mounted, including auto-resume flows and StrictMode/lifecycle races.
- Validate model-specific limits and contracts (max images/2MB, first/last frame pairing, ratio, duration, resolution) at both UI and API boundaries.
- Generator UI must filter resolution/aspect options from each image model's `supportedResolutions` / `supportedAspectRatios` and reset invalid selections when the model changes. API must clamp the same fields.

## Verified APIMart and KIE contracts & Model Reference (2026-09-16)

- jon has verified all active image, video, and music models. Do not alter their model mappings, request payloads, option fields, or control visibility unless upstream API specs explicitly change.
- Keep provider-specific request construction isolated in `src/core/ai/apimart.ts` and `src/core/ai/kie.ts`; do not mix or restore generic catch-all payloads.

### 1. APIMart (docs.apimart.ai/cn) 模型参考清单

#### 【生图 Image Models】
产品参考图上限：UI/产品侧统一最多 **8 张**（供应商允许更高时仍按产品限制 8；低于 8 的模型取供应商更低值，如 Qwen 3）。原因：上传条展示空间有限，超过 8 张难以完整体验。
端点统一为：`POST https://api.apimart.ai/v1/images/generations`，请求头携带 `Authorization: Bearer <API_KEY>`。
- **GPT Image 2** (`gpt-image-2`):
  - 文档 URL: [GPT-Image-2 图像生成](https://docs.apimart.ai/cn/api-reference/images/gpt-image-2/generation)（官方渠道: [官方版](https://docs.apimart.ai/cn/api-reference/images/gpt-image-2/official)）
  - model: `gpt-image-2`
  - 主要参数: `prompt`, `size` (15 种比例，如 `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, 亦支持 `auto`), `resolution` (`1k`/`2k`/`4k`), `image_urls` (参考图数组，供应商最多 15 张), `n: 1`
  - 图生图注意: 不传 `size` 时输出跟随输入图分辨率；传 `size` 则按指定尺寸出图
  - 产品 UI 与双供应商交集: 参考图上限 **产品限制 8 张**（APIMart 15 / KIE 16，UI 封顶 8）
- **GPT Image 2.5 Flare** (`gpt-image-2-5-flare`) / **Sunburst** (`gpt-image-2-5-sunburst`):
  - 文档 URL: [GPT-Image-2.5 图像生成](https://docs.apimart.ai/cn/api-reference/images/gpt-image-2.5/generation)
  - model: 分别传 `gpt-image-2.5-flare`（快速默认款，适合批量生成）或 `gpt-image-2.5-sunburst`（编辑精度优先，适合成品级及多轮精细编辑）。
  - 主要参数: `prompt`, `size`, `resolution` (`1k`/`2k`/`4k`), `quality` (`auto`/`low`/`medium`/`high`/`xhigh`/`max`), `image_urls`（供应商最多 16 张，产品限制 8 张）, `n: 1`
  - 图生图注意: **建议不传 `size`**，由系统按输入图比例与 `resolution` 自动算输出尺寸；若显式传 `size` 则按指定比例出图。
  - 计费积分: `1K` 6、`2K` 10、`4K` 16；文生图和图生图一致。
- **Qwen Image 3.0** (`qwen-image-3.0`):
  - 文档 URL: [Qwen Image 3.0 图像生成](https://docs.apimart.ai/cn/api-reference/images/qwen-image-3.0/generation)
  - model: `qwen-image-3.0`
  - 主要参数: `prompt`, `size`, `resolution` (`1K`/`2K`), `image_urls` (1~3 张参考图), `n: 1`
- **Seedream 5.0 Pro** (`seedream-5-0-pro`):
  - 文档 URL: [Seedream-5.0-Pro 图像生成](https://docs.apimart.ai/cn/api-reference/images/seedream-5-0-pro/generation)
  - model: 推荐 `seedream-5-0-pro`（亦接受 `seedream-5.0-pro`）
  - 主要参数: `prompt`, `size`, `resolution` (`1K`/`1.5K`/`2K`), `output_format` (`png`/`jpeg`), `image_urls` (供应商最多 10 张参考图)
  - 产品 UI 与双供应商交集: 参考图上限 **产品限制 8 张**（供应商 10，UI 封顶 8）
- **Nano Banana 2** (`nano-banana-2`):
  - 文档 URL: [Nano banana2 图像生成](https://docs.apimart.ai/cn/api-reference/images/gemini-3.1-flash/generation)（Lite 版: [Lite 图像生成](https://docs.apimart.ai/cn/api-reference/images/gemini-3.1-flash/generation-lite)）
  - model: `nano-banana-2` (兼容别名 `nano-banana-2-ext` / `gemini-3.1-flash-image-preview`)
  - 主要参数: `prompt`, `size`, `resolution` (`1K`/`2K`/`4K`), `image_urls` (供应商最多 14 张参考图)
  - 产品 UI 与双供应商交集: 参考图上限 **产品限制 8 张**（供应商 14，UI 封顶 8）
- **Nano Banana Pro** (`nano-banana-pro`):
  - 文档 URL: [Nano banana Pro 图像生成](https://docs.apimart.ai/cn/api-reference/images/gemini-3-pro/generation)
  - model: `nano-banana-pro` (兼容别名 `nano-banana-pro-ext` / `gemini-3-pro-image-preview`)
  - 主要参数: `prompt`, `size`, `resolution` (`1K`/`2K`/`4K`), `image_urls` (供应商最多 14 张)
  - 产品 UI 与双供应商交集: 参考图上限 **产品限制 8 张**（APIMart 14 / KIE 10，UI 封顶 8）
- **FLUX.2** (`flux-2` → 供应商 `flux-2-pro`，亦可 `flux-2-flex` / `flux-2-max`):
  - 文档 URL: [FLUX.2 Image Generation](https://docs.apimart.ai/en/api-reference/images/flux-2/generation)
  - model: 产品 ID `flux-2` 映射为 `flux-2-pro`（也可显式传 `flux-2-flex` / `flux-2-max`）
  - 主要参数: `prompt`, `size` (`1:1`/`4:3`/`3:4`/`16:9`/`9:16`/`3:2`/`2:3`/`21:9`/`9:21`/`auto`；`auto` 有参考图时跟随参考图比例，无参考图默认 `1:1`), `resolution` (`1MP`/`2MP` 默认/`3MP`/`4MP`；兼容别名 `1K`→`2MP`、`2K`→`3MP`、`4K`→`4MP`), `image_urls` (最多 8 张), `output_format` (`jpeg`/`png`/`webp`), `n: 1`
  - 产品 UI 与双供应商交集: 分辨率仅暴露 `1K`/`2K`（分别映射到 APIMart `2MP`/`3MP`）；比例不暴露 `21:9`/`9:21`（KIE flex 不支持）；参考图上限 8 张

#### 【生视频 Video Models】
端点统一为：`POST https://api.apimart.ai/v1/videos/generations`
- **Seedance 2.5** (`seedance-2-5`):
  - 文档 URL: [seedance-2.5 视频生成](https://docs.apimart.ai/cn/api-reference/videos/seedance-2-5/generation)
  - model: `seedance-2.5`
  - 主要参数: `prompt`, `resolution` (`480p`/`720p`/`1080p`，注意不支持 4k), `duration` (数值 4~30s，或 -1 自动时长), `size` (`adaptive` 或指定比例), `image_urls` (参考图数组，最多 30 张), `video_urls` (参考视频数组，最多 10 个), `audio_urls` (参考音频数组，最多 10 个), `image_with_roles` (`[{url, role: "first_frame" | "last_frame" | "reference_image"}]`), `generate_audio: true`
- **Seedance 2.0** (`doubao-seedance-2-0`):
  - 文档 URL: [seedance-2.0 视频生成](https://docs.apimart.ai/cn/api-reference/videos/seedance-2-0/generation)
  - model: `seedance-2.0`
  - 主要参数: `prompt`, `resolution` (`480p`/`720p`/`1080p`/`4k`), `duration` (数值 4~15s), `size` (`adaptive` 或宽高比), `image_with_roles`, `generate_audio: true`
- **Wan 3.0** (`wan-3-0`):
  - 文档 URL: [Wan3.0 视频生成](https://docs.apimart.ai/cn/api-reference/videos/wan3.0-video/generation)
  - model: `wan3.0-video`
  - 主要参数: `prompt`, `resolution` (`480P`/`720P`/`1080P`), `duration` (数值 2~30s), `size` (`adaptive` 或宽高比), `image_with_roles`, `audio: true`
- **Wan 2.7** (`wan-2-7`):
  - 文档 URL: [Wan2.7 视频生成](https://docs.apimart.ai/cn/api-reference/videos/wan2.7/generation)
  - model: `wan2.7`
  - 主要参数: `prompt`, `resolution` (`720P`/`1080P`), `duration` (数值 2~15s), `size` (文生视频传宽高比), `image_urls` (图生视频传切片前 2 张), `prompt_extend: true`
- **Kling 3.0 Turbo** (`kling-3-0-turbo`):
  - 文档 URL: [Kling 3.0 Turbo 视频生成](https://docs.apimart.ai/cn/api-reference/videos/kling-3.0-turbo/generation)
  - model: `kling-3.0-turbo`
  - 主要参数: `prompt`, `resolution` (`720p`/`1080p`), `duration` (数值 3~15s), `aspect_ratio` (无图片输入时必传), `first_frame_image` (首帧图)
- **MiniMax H3** (`minimax-h3`):
  - 文档 URL: [MiniMax-H3 视频生成](https://docs.apimart.ai/cn/api-reference/videos/minimax-h3/generation)
  - model: `MiniMax-H3`
  - 主要参数: `prompt`, `resolution` (`768P`/`2K`), `duration` (数值 4~15s), `aspect_ratio` (文生视频必传具体比例；多模态参考生视频默认 `adaptive` 或指定比例), `image_urls` (最多 9 张), `video_urls` (最多 3 个), `audio_urls` (最多 3 个且不能单独使用)。注意：首尾帧 (`first_frame_image`, `last_frame_image`) 与多模态参考素材严格互斥，不能混用。
- **MiniMax Hailuo 2.3** (`minimax-hailuo-2-3`):
  - 文档 URL: [MiniMax-Hailuo-2.3 视频生成](https://docs.apimart.ai/cn/api-reference/videos/minimax-hailuo-2.3/generation)
  - model: `MiniMax-Hailuo-2.3`
  - 主要参数: `prompt`, `resolution` (`768p`/`1080p`), `duration` (1080p 严格仅支持 6s；768p 支持 6s/10s), `first_frame_image`, `prompt_optimizer: true` (无比例传参)

#### 【生音频 Music Models】
端点：`POST https://api.apimart.ai/v1/music/generations`（备用端点 `POST /v1/audio/music`）
- **Flow Music** (`flow-music`):
  - 文档 URL: [Flow Music 生成音乐](https://docs.apimart.ai/cn/api-reference/audios/flow-music/music)
  - model: `flowmusic`
  - 主要参数: `sound_prompt` (提示词), `lyrics` (可选歌词), `instrumental` (布尔值)
- **Suno** (`suno-v5` / `suno-v4`):
  - 文档 URL: [Suno 生成音乐](https://docs.apimart.ai/cn/api-reference/audios/suno/generation)（概览: [通用约定与任务查询](https://docs.apimart.ai/cn/api-reference/audios/suno/overview)）
  - model: `suno`
  - 主要参数: `version` (`v5`/`v4`/`v3.5`), `custom: false` (灵感模式), `prompt` (灵感提示词), `instrumental` (布尔值)。绝不可将 KIE 的 `sound_prompt` 发往 Suno

---

### 2. KIE.AI (docs.kie.ai/cn) 模型参考清单

#### 【生图 Image Models】
产品参考图上限：与 APIMart 侧一致，UI/产品侧统一最多 **8 张**（供应商更高时封顶 8；Qwen 等更低上限保留供应商值）。
端点统一为：`POST https://api.kie.ai/api/v1/jobs/createTask`
- **GPT Image 2** (`gpt-image-2`):
  - 文档 URL: [文生图](https://docs.kie.ai/cn/market/gpt/gpt-image-2-text-to-image) | [图生图](https://docs.kie.ai/cn/market/gpt/gpt-image-2-image-to-image)
  - model: 文生图传 `gpt-image-2-text-to-image`，图生图传 `gpt-image-2-image-to-image`
  - input 参数: `prompt`, `aspect_ratio`, `resolution` (`1K`/`2K`/`4K`，注意大写 K)；图生图参考图字段为 **`input_urls`**（最多 16 张），不要传 `image_input`
  - 产品 UI 与双供应商交集: 参考图上限 **产品限制 8 张**（APIMart 15 / KIE 16，UI 封顶 8）
- **GPT Image 2.5 Flare / Sunburst** (`gpt-image-2-5-{flare|sunburst}-{text-to-image|image-to-image}`):
  - 文档 URL: [Flare 文生图](https://docs.kie.ai/market/gpt/gpt-image-2-5-flare-text-to-image) | [Flare 图生图](https://docs.kie.ai/market/gpt/gpt-image-2-5-flare-image-to-image) | [Sunburst 文生图](https://docs.kie.ai/market/gpt/gpt-image-2-5-sunburst-text-to-image) | [Sunburst 图生图](https://docs.kie.ai/market/gpt/gpt-image-2-5-sunburst-image-to-image)
  - model: 文生图和图生图分别使用对应的 `gpt-image-2-5-flare-text-to-image` / `gpt-image-2-5-flare-image-to-image` / `gpt-image-2-5-sunburst-text-to-image` / `gpt-image-2-5-sunburst-image-to-image`（产品侧 `gpt-image-2-5-flare` / `gpt-image-2-5-sunburst` 提交时映射到上述标识）
  - 文生图 `input` 传 `prompt`、`aspect_ratio`、`resolution` (`1K`/`2K`/`4K`)；图生图将参考图传为 `input_urls`（供应商最多 16 张，产品限制 8 张），不要传通用 Kie 字段 `image_input`
  - 提交响应读取 `data.taskId`；任务查询从 `resultJson.resultUrls` 读取图片 URL，状态为 `success`/`fail`
  - 计费积分: `1K` 6、`2K` 10、`4K` 16；Flare、Sunburst及两种模态一致
- **Qwen Image 3.0** (`qwen-image-3-0`):
  - 文档 URL: [文生图](https://docs.kie.ai/cn/market/qwen3/text-to-image) | [图生图](https://docs.kie.ai/cn/market/qwen3/image-to-image)
  - model: 文生图传 `qwen3/text-to-image`，图生图传 `qwen3/image-to-image`
  - input 参数: `prompt`, **`image_size`**（比例，非 `aspect_ratio`）, `resolution` (`1K`/`2K`)；图生图参考图字段为 **`image_urls`**（最多 3 张），不要传 `image_input`
- **Seedream 5.0 Pro** (`seedream-5-0-pro`):
  - 文档 URL: [文生图](https://docs.kie.ai/cn/market/seedream/5-pro-text-to-image) | [图生图](https://docs.kie.ai/cn/market/seedream/5-pro-image-to-image)
  - model: 文生图传 `seedream/5-pro-text-to-image`，图生图传 `seedream/5-pro-image-to-image`
  - input 参数: `prompt`, `aspect_ratio`, `resolution` (`1K`/`1.5K`/`2K`), `output_format` (`png`/`jpeg`)；图生图参考图字段为 **`image_urls`**（供应商最多 10 张）
  - 产品 UI 与双供应商交集: 参考图上限 **产品限制 8 张**（供应商 10，UI 封顶 8）
- **Nano Banana 2** (`nano-banana-2`):
  - 文档 URL: [Google Nano Banana 2](https://docs.kie.ai/cn/market/google/nanobanana2)（Lite: [nano-banana-2-lite](https://docs.kie.ai/cn/market/google/nano-banana-2-lite)，契约不同：`image_urls` 最多 10、无 `resolution`）
  - model: 产品使用完整版 **`nano-banana-2`**（含 `resolution` 1K/2K/4K + `image_input` 最多 14）；不要误用 lite
  - input 参数: `prompt`, `aspect_ratio`, `resolution` (`1K`/`2K`/`4K`), `image_input` (供应商最多 14 张)
  - 产品 UI 与双供应商交集: 参考图上限 **产品限制 8 张**（供应商 14，UI 封顶 8）
- **Nano Banana Pro** (`nano-banana-pro`):
  - 文档 URL: [Google Nano Banana](https://docs.kie.ai/cn/market/google/nano-banana) | [Edit 图生图](https://docs.kie.ai/cn/market/google/nano-banana-edit) | [Pro 图生图](https://docs.kie.ai/market/google/pro-image-to-image)
  - model: 文生图传 `google/nano-banana`，图生图传 `google/nano-banana-edit`
  - input 参数: `prompt`, `aspect_ratio`；图生图参考图字段为 **`image_urls`**（供应商最多 10 张；产品限制 8）
  - 产品 UI 与双供应商交集: 参考图上限 **产品限制 8 张**（APIMart 14 / KIE 10，UI 封顶 8）
- **FLUX.2 Flex** (`flux-2`):
  - 文档 URL: [文生图](https://docs.kie.ai/market/flux2/flex-text-to-image) | [图生图](https://docs.kie.ai/market/flux2/flex-image-to-image)
  - model: 文生图传 `flux-2/flex-text-to-image`，图生图传 `flux-2/flex-image-to-image`
  - input 参数: `prompt`, `aspect_ratio`（文生图: `1:1`/`4:3`/`3:4`/`16:9`/`9:16`/`3:2`/`2:3`；图生图额外支持 `auto`）, `resolution` (`1K`/`2K`)；图生图参考图用 `input_urls`（1~8 张），不要传通用 `image_input`
  - 产品 UI 与双供应商交集: 分辨率 `1K`/`2K`；比例含 `auto`/`3:2`/`2:3`，不含 `21:9`/`9:21`；参考图上限 **产品限制 8 张**

#### 【生视频 Video Models】
端点统一为：`POST https://api.kie.ai/api/v1/jobs/createTask`
- **Seedance 2.5** (`seedance-2-5`):
  - 文档 URL: [Bytedance Seedance 2.5](https://docs.kie.ai/market/bytedance/seedance-2-5)
  - model: `bytedance/seedance-2-5`
  - input 参数: `prompt`, `reference_image_urls` (参考图数组), `reference_video_urls` (参考视频数组), `reference_audio_urls` (参考音频数组), `aspect_ratio` (默认 `adaptive` 或指定比例), `resolution` (`480p`/`720p`/`1080p`), `duration` (数值类型 4~30, 默认 5), `generate_audio` (bool，默认 true), `return_last_frame` (bool)
- **Seedance 2.0** (`doubao-seedance-2-0`):
  - 文档 URL: [Bytedance Seedance 2.0](https://docs.kie.ai/cn/market/bytedance/seedance-2)
  - model: `bytedance/seedance-2`
  - input 参数: `prompt`, `aspect_ratio`, `resolution` (`480p`/`720p`/`1080p`), `duration` (数值类型), `first_frame_url`, `last_frame_url`, `generate_audio` (bool)
- **Wan 3.0** (`wan-3-0`):
  - 文档 URL: [Wan 3.0 Video](https://docs.kie.ai/cn/market/wan/3-0-video)
  - model: `wan/3-0-video`
  - input 参数: `prompt`, `aspect_ratio` (默认 `adaptive`), `resolution` (`480P`), `duration` (数值类型，如 5), `audio` (bool)
- **Wan 2.7** (`wan-2-7`):
  - 文档 URL: [文生视频](https://docs.kie.ai/cn/market/wan/2-7-text-to-video) | [图生视频](https://docs.kie.ai/cn/market/wan/2-7-image-to-video)
  - model: 文生视频 `wan/2-7-text-to-video`，图生视频 `wan/2-7-image-to-video`
  - input 参数: `prompt`, `resolution` (`720p`/`1080p`), `duration` (数值类型 5~15), `first_frame_url`, `last_frame_url`（不传 aspect_ratio）
- **Kling 3.0 Turbo** (`kling-3-0-turbo`):
  - 文档 URL: [文生视频](https://docs.kie.ai/cn/market/kling/v3-turbo-text-to-video) | [图生视频](https://docs.kie.ai/cn/market/kling/v3-turbo-image-to-video)
  - model: 文生视频 `kling/v3-turbo-text-to-video`，图生视频 `kling/v3-turbo-image-to-video`
  - input 参数: `prompt`, `resolution` (`720p`/`1080p`), `duration` (注意：严格为字符串类型，如 `"5"`, `"10"`), 文生视频传 `aspect_ratio`，图生视频传 `image_urls` 数组（图生视频不传 aspect_ratio）
- **MiniMax H3** (`minimax-h3`):
  - 文档 URL: [文生视频](https://docs.kie.ai/cn/market/minimax-h3/text-to-video) | [图生视频](https://docs.kie.ai/cn/market/minimax-h3/image-to-video) | [多模态参考生视频 (reference-to-video)](https://docs.kie.ai/market/minimax-h3/reference-to-video)
  - model: 文生视频 `minimax-h3/text-to-video`，图生视频 `minimax-h3/image-to-video`，多模态参考生视频 `minimax-h3/reference-to-video`
  - input 参数: 多模态模式传 `prompt`, `reference_image_urls`, `reference_video_urls`, `reference_audio_urls`, `aspect_ratio` (`adaptive` 或指定比例), `duration` (数值类型 4~15, 默认 6), `resolution` (`768P`/`2K`)；普通图生视频传 `first_frame_url`, `last_frame_url`。
- **MiniMax Hailuo 2.3** (`minimax-hailuo-2-3`):
  - 文档 URL: [文生视频 (02-pro)](https://docs.kie.ai/cn/market/hailuo/02-text-to-video-pro) | [图生视频 (2.3-pro)](https://docs.kie.ai/cn/market/hailuo/2-3-image-to-video-pro)
  - model: 文生视频 `hailuo/02-text-to-video-pro`，图生视频 `hailuo/2-3-image-to-video-pro`
  - input 参数: 文生视频仅传 `prompt` 与 `prompt_optimizer: true`（不传 duration/resolution/aspect_ratio）；图生视频传 `prompt`, `image_url`, `duration` (字符串类型如 `"6"`), resolution 固定 `768P`

#### 【生音频 Music Models】
端点为：`POST https://api.kie.ai/api/v1/generate`
- **Suno** (`suno-v5` / `suno-v4`):
  - 文档 URL: [Suno 音乐生成](https://docs.kie.ai/cn/suno-api/generate-music)（快速入门: [Suno Quickstart](https://docs.kie.ai/cn/suno-api/quickstart)，续写: [Extend Music](https://docs.kie.ai/cn/suno-api/extend-music)，歌词: [Generate Lyrics](https://docs.kie.ai/cn/suno-api/generate-lyrics)）
  - model: `V5` / `V4` / `V3_5`
  - 顶层参数: `prompt`, `model`, `instrumental` (bool), `callBackUrl`, `customMode: false`。若启用自定义模式 (`customMode: true`)，则需传入 `title`, `style`，非纯音乐时将歌词置于 `prompt`
