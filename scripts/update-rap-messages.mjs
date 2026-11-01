import fs from 'node:fs';

const enPath = 'messages/en.json';
const zhPath = 'messages/zh.json';

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));

// Common App Info
en['common.metadata.title'] =
  'Airap Video - #1 AI Rap Video Generator & Creator';
en['common.metadata.description'] =
  'Turn any photo into a viral AI rap video. Create Migos orange background battles, TikTok meme raps, and narrative music videos in seconds.';

zh['common.metadata.title'] = 'Airap Video - #1 AI 说唱视频生成器与创作平台';
zh['common.metadata.description'] =
  '上传照片一键生成爆款 AI 说唱视频！支持经典 Migos 橙色录音棚双人互怼、抖音走红热梗说唱与叙事音乐短片。';

// Landing Meta
en['landing.meta.title'] =
  'AI Rap Video Generator - Create Viral Rap Videos | Airap';
en['landing.meta.description'] =
  'Best AI rap video generator to create viral rap battles, meme tracks, and music videos in seconds. Generate Migos orange studio clips with beat-sync.';

zh['landing.meta.title'] =
  'AI 说唱视频生成器：制作爆款说唱对决与热门 MV | Airap';
zh['landing.meta.description'] =
  '专业的 AI 说唱视频生成器：数秒内将照片转化为经典 Migos 橙色录音棚互怼、TikTok 热门神曲与叙事说唱 MV，精准对口型与律动卡点。';

// Landing Hero
en['landing.hero.title'] = 'AI Rap Video Generator';
en['landing.hero.desc'] =
  'Turn photos into viral rap music videos, Migos-style orange studio battles, and high-BPM flow with auto lyrics and beat sync.';
en['landing.hero.headline'] = 'AI Rap Video Generator & Creator';
en['landing.hero.subheadline'] =
  'Turn any photo into a viral AI rap battle in seconds. Pick the iconic Migos orange studio, auto-generate hard-hitting bars, and export for TikTok & YouTube.';
en['landing.hero.placeholder_text'] =
  'Enter a topic, friendly roast, or lyrics (e.g. "Two friends roasting each other about always being late, heavy 808 trap beat, Migos orange studio with hanging mic, sharp beat gestures")...';
en['landing.hero.tab_text'] = 'Rap Prompt';
en['landing.hero.tab_image'] = 'Photo to Rap';

zh['landing.hero.title'] = 'AI 说唱视频生成器';
zh['landing.hero.desc'] =
  '上传照片，一键生成爆款说唱 MV、Migos 风格橙色录音棚互怼视频，高密度吐字、精准对口型与骨骼律动卡点。';
zh['landing.hero.headline'] = 'AI 说唱视频生成与创作平台';
zh['landing.hero.subheadline'] =
  '数秒内将照片转化为刷屏级说唱视频。经典橙色录音棚双人开麦、自写押韵 Punchline 歌词，一键导出 9:16 竖屏格式。';
zh['landing.hero.placeholder_text'] =
  '输入主题、互怼吐槽或自定义歌词（例如：“两个损友在经典橙色录音棚吊麦互喷迟到，重低音 Trap 鼓点，节奏点头与手势律动，电影级运镜”）...';
zh['landing.hero.tab_text'] = '说唱提示词';
zh['landing.hero.tab_image'] = '照片做说唱';

// What is
en['landing.what_is.title'] = 'What is an AI Rap Video Generator?';
en['landing.what_is.desc'] =
  'An AI rap video generator combines high-speed vocal synthesis, rhyme-locked lyrics, and advanced diffusion video models to turn static portraits into rhythmic, expressive rap performances with accurate lip-sync and body groove.';
en['landing.what_is.prompt_badge'] = 'Rap Prompt & Beat';
en['landing.what_is.prompt_quote'] =
  '“Two rappers side-by-side in a minimalist bright orange studio with a hanging mic, trading aggressive bars, expressive hip-hop hand gestures, heavy 808 beat drop, cinematic 4K.”';
en['landing.what_is.prompt_hint'] = 'AI prompt to viral rap video';
en['landing.what_is.video_badge'] = 'AI-Generated Rap Video';

zh['landing.what_is.title'] = '什么是 AI 说唱视频生成器？';
zh['landing.what_is.desc'] =
  'AI 说唱视频生成器融合了高速说唱声乐合成、押韵歌词大模型与前沿视频扩散模型，将普通静态照片转化为具备毫秒级唇形对齐、点头晃动和说唱手势的震撼动效成片。';
zh['landing.what_is.prompt_badge'] = '说唱提示词与节拍';
zh['landing.what_is.prompt_quote'] =
  '“双人在极简明亮橙色背景录音棚中并排站立，顶置悬挂式麦克风，轮流开麦吐字互怼，经典说唱手势与卡点点头，重低音 808 鼓点，电影级超清画质。”';
zh['landing.what_is.prompt_hint'] = '输入提示词生成爆款说唱视频';
zh['landing.what_is.video_badge'] = 'AI 生成说唱视频成片';

// Features
en['landing.features.section_title'] =
  'Engineered for High-Energy Rap Performances';
en['landing.features.items.t2v.title'] = 'AI Rhyme & Lyric Engine';
en['landing.features.items.t2v.desc'] =
  'Input any topic or roast. The built-in hip-hop compiler outputs multi-syllabic rhymes, witty punchlines, and cadence structured for trap, boombap, or drill.';
en['landing.features.items.i2v.title'] = 'High-Precision Rap Lip-Sync';
en['landing.features.items.i2v.desc'] =
  'Trained specifically on high-BPM vocals and plosive consonants (B/P/T) so mouth movements never blur or lag behind fast chopper flows.';
en['landing.features.items.reference.title'] = 'Iconic Studio & Battle Presets';
en['landing.features.items.reference.desc'] =
  'Instantly access trending setups: the viral Migos orange studio, COLORS hanging mic booth, underground cyphers, and car passenger freestyles.';
en['landing.features.items.models.title'] = 'Dynamic Hip-Hop Body Groove';
en['landing.features.items.models.desc'] =
  'Move beyond stiff talking heads. Incorporates head-nodding, shoulder bounce, and authentic rap hand gestures synchronized to 808 kicks.';
en['landing.features.items.controls.title'] = '9:16 Vertical & Beat Sync';
en['landing.features.items.controls.desc'] =
  'Tailored for TikTok, Instagram Reels, and YouTube Shorts. Generates ready-to-post vertical videos with auto-generated karaoke subtitles.';
en['landing.features.items.library.title'] = '100% Royalty-Free Beats';
en['landing.features.items.library.desc'] =
  'All generated beats and tracks come with commercial clearance, preventing copyright mutes or monetization flags on social media.';

zh['landing.features.section_title'] = '专为高能说唱量身定制的核心特性';
zh['landing.features.items.t2v.title'] = 'AI 智能押韵与歌词引擎';
zh['landing.features.items.t2v.desc'] =
  '输入任何吐槽主题，内置说唱编译器自动生成多音节双押/三押、高级双关梗（Punchline）与地道律动歌词。';
zh['landing.features.items.i2v.title'] = '毫秒级快嘴对口型对齐';
zh['landing.features.items.i2v.desc'] =
  '针对高 BPM 语速与爆破辅音（B/P/T）深度优化，告别抽搐与卡顿，极速快嘴也能做到音画完美合一。';
zh['landing.features.items.reference.title'] = '经典录音棚与对战预设';
zh['landing.features.items.reference.desc'] =
  '一键套用爆款模板：Migos 经典橙色背景、COLORS 吊麦录音棚、街头地下 8 英里对决与副驾说唱。';
zh['landing.features.items.models.title'] = '真实身体律动与 Swag 姿态';
zh['landing.features.items.models.desc'] =
  '彻底告别“只有嘴在动的僵尸感”，精准捕捉说唱点头节奏、压步浮沉与标志性手势，带来身临其境的现场感。';
zh['landing.features.items.controls.title'] = '9:16 竖屏与自动卡点字幕';
zh['landing.features.items.controls.desc'] =
  '专为抖音、TikTok、快手、Reels 与 Shorts 打造，一键导出带动态高亮字幕与鼓点微震动效的竖屏成片。';
zh['landing.features.items.library.title'] = '100% 免版税原创伴奏';
zh['landing.features.items.library.desc'] =
  '全站伴奏与生成音乐均拥有商业授权，无惧平台下架与版权警告，自媒体创作者可安心变现。';

// How to
en['landing.how_to.title'] = 'How to Create a Viral AI Rap Video in 4 Steps';
en['landing.how_to.desc'] =
  'Go from an idea to a finished, beat-synced rap video in under 60 seconds.';
en['landing.how_to.step_1_title'] = 'Choose a Studio Style';
en['landing.how_to.step_1_desc'] =
  'Select the iconic Orange Studio, Freestyle Battle Booth, or Choreo Dance preset.';
en['landing.how_to.step_2_title'] = 'Upload 1 or 2 Photos';
en['landing.how_to.step_2_desc'] =
  'Upload photos of friends, celebrities, historical figures, or pets to feature on the stage.';
en['landing.how_to.step_3_title'] = 'Enter Topic or Roast';
en['landing.how_to.step_3_desc'] =
  'Type a prompt or choose quick topic pills like [Banter], [Birthday Hype], or [Workplace Grievances].';
en['landing.how_to.step_4_title'] = 'Generate & Export';
en['landing.how_to.step_4_desc'] =
  'Click Generate to get a 9:16 high-definition rap video with synchronized flow and animated subtitles.';

zh['landing.how_to.title'] = '只需 4 步，制作一条爆款 AI 说唱视频';
zh['landing.how_to.desc'] =
  '从灵感到一条音画同步的吸睛说唱短视频，不到 60 秒即可搞定。';
zh['landing.how_to.step_1_title'] = '选择舞台风格';
zh['landing.how_to.step_1_desc'] =
  '选择经典橙色录音棚、双人吊麦互怼对决、或反差唱跳舞蹈模板。';
zh['landing.how_to.step_2_title'] = '上传 1 或 2 张照片';
zh['landing.how_to.step_2_desc'] =
  '上传自己、好友、名人、历史古人或宠物的清晰半身肖像。';
zh['landing.how_to.step_3_title'] = '输入主题或吐槽';
zh['landing.how_to.step_3_desc'] =
  '输入想要表达的梗，或直接点击【损友互黑】、【打工怨气】、【生日祝贺】等快捷标签。';
zh['landing.how_to.step_4_title'] = '一键生成并导出';
zh['landing.how_to.step_4_desc'] =
  '点击生成，数十秒内获取带卡点字幕的高清 9:16 竖屏成片，直接分享至各大平台。';

// FAQ (Aligned for ChatGPT GEO & Google PAA)
en['landing.video_faq.title'] =
  'Frequently Asked Questions about AI Rap Videos';
en['landing.video_faq.1.question'] = 'How to create an AI rap video online?';
en['landing.video_faq.1.answer'] =
  'To create an AI rap video, select a preset like the viral Migos Orange Studio or Freestyle Cypher, upload 1 or 2 portrait photos, and enter a topic or roast idea. Airap Video automatically drafts multisyllabic rhymes, pairs them with an 808 trap beat, and animates characters with synchronized lip-sync and rhythmic head nods in under 60 seconds.';

en['landing.video_faq.2.question'] =
  'What makes Airap Video different from standard AI avatar tools like HeyGen or D-ID?';
en['landing.video_faq.2.answer'] =
  'Unlike traditional AI avatar generators that produce stiff, static talking heads suited only for corporate presentations, Airap Video is purpose-built for high-energy hip-hop performance. It features rhythmic 808 head-bobbing, authentic shoulder bounces, dynamic rap hand gestures, and high-BPM lip-sync engineered specifically for fast chopper flows rather than monotone speech.';

en['landing.video_faq.3.question'] =
  'How to create the viral Migos orange studio rap video?';
en['landing.video_faq.3.answer'] =
  'Step 1: Select the "Iconic Orange Studio" preset on our homepage. Step 2: Upload 1 or 2 front-facing portrait photos. Step 3: Enter your roast or topic prompt. Airap Video automatically synthesizes alternating rhyming bars, drops an 808 trap beat, and renders both MCs around a hanging studio mic in 9:16 vertical format in under 60 seconds.';

en['landing.video_faq.4.question'] =
  'Do I need a microphone, studio equipment, or rap skills to use Airap?';
en['landing.video_faq.4.answer'] =
  "Not at all. You don't need any musical background, songwriting experience, or microphone equipment. Simply upload your photos and type a topic; Airap's full-stack pipeline handles lyric writing, flow arrangement, professional trap vocal synthesis, and synchronized video rendering entirely in the cloud.";

en['landing.video_faq.5.question'] =
  'Can I monetize AI rap videos on TikTok, Instagram Reels, and YouTube Shorts?';
en['landing.video_faq.5.answer'] =
  'Yes, 100%. All instrumental beats, vocal tracks, and videos generated on Airap Video are completely royalty-free with full commercial usage rights. Videos export directly in 9:16 vertical MP4 format with embedded animated subtitles, ready for creator monetization, ad revenue, and sponsorship campaigns without copyright strikes.';

en['landing.video_faq.6.question'] =
  'Can AI create an entire rap song and video from photos alone?';
en['landing.video_faq.6.answer'] =
  'Yes! Airap Video generates the entire rap from photos: original lyrics with multisyllabic rhyme schemes, royalty-free trap and boombap beats, expressive rap vocals, and dynamic performance videos with animated karaoke subtitles.';

en['landing.video_faq.7.question'] = 'Is Airap Video free to use online?';
en['landing.video_faq.7.answer'] =
  'Yes, Airap Video is 100% web-based and free to try. Every new account receives free welcome credits to create AI rap music videos directly in your browser without software downloads or credit cards. Upgrading to a Pro plan unlocks unlimited high-priority generations and watermark-free downloads.';

en['landing.video_faq.8.question'] =
  'Can I export high-definition AI rap videos without watermarks from MP3 or audio?';
en['landing.video_faq.8.answer'] =
  'Yes! While free preview generations may include a standard identifier, Pro and Creator plans allow you to export crisp 1080p AI rap videos completely without watermarks. You can generate raps from prompts, uploaded photos, or custom audio and MP3 tracks with 100% commercial clearance.';

zh['landing.video_faq.title'] = '关于 AI 说唱视频的常见问题';
zh['landing.video_faq.1.question'] = 'How to create an AI rap video online?';
zh['landing.video_faq.1.answer'] =
  '在 Airap Video 首页选择“经典橙色录音棚”或“双人对战”模板，上传 1 到 2 张人物照片，输入吐槽主题或提示词，点击生成即可。系统会在 60 秒内全自动完成写词、编曲、唇形对齐与身体律动渲染，输出带字幕的高清成片。';
zh['landing.video_faq.2.question'] =
  'What makes Airap Video different from standard AI avatar tools like HeyGen or D-ID?';
zh['landing.video_faq.2.answer'] =
  '不同于 HeyGen 或 D-ID 等仅适合做企业口播、呆板站桩说话的传统数字人，Airap Video 专为说唱视听表演定制。它具备随 808 鼓点律动的真实点头、耸肩反弹、专业 Hip-Hop 破框手势以及针对高 BPM 快节奏说唱深度优化的音画同步，呈现出极具视觉张力的爆款 MV 效果。';
zh['landing.video_faq.3.question'] =
  'How to create the viral Migos orange studio rap video?';
zh['landing.video_faq.3.answer'] =
  '第一步：在首页选择【经典橙色录音棚（Orange Studio）】预设；第二步：上传 1 到 2 张正脸人物照片；第三步：输入互怼吐槽主题或直接使用推荐词。Airap 将在 60 秒内全自动生成押韵歌词、808 伴奏以及置身于标志性明亮橙色背景与单只吊麦前的双人轮流开麦对战视频。';
zh['landing.video_faq.4.question'] =
  'Do I need a microphone, studio equipment, or rap skills to use Airap?';
zh['landing.video_faq.4.answer'] =
  '完全不需要。你无需任何乐理知识、作词能力或录音设备。只需上传照片并输入一句你想吐槽的话或想法，Airap 的全流程云端引擎就会全自动完成押韵词创作、Flow 编排、Trap 拟真人声录制与视频音画渲染。';
zh['landing.video_faq.5.question'] =
  'Can I monetize AI rap videos on TikTok, Instagram Reels, and YouTube Shorts?';
zh['landing.video_faq.5.answer'] =
  '完全可以，100% 支持商业变现。Airap Video 生成的所有伴奏编曲、人声与视频素材均为原创免版税授权。成片直接输出 9:16 竖屏高清 MP4 并内嵌酷炫动态卡点字幕，可无缝用于 TikTok、YouTube Shorts、抖音、快手等平台的创作者激励与商业接单。';
zh['landing.video_faq.6.question'] =
  'Can AI create an entire rap song and video from photos alone?';
zh['landing.video_faq.6.answer'] =
  '完全可以！Airap Video 涵盖从词、曲、唱到演的全流程：原创多音节押韵歌词、免版税 Trap/Boombap 节拍、拟真说唱声线以及音画同步的高清 MV 视频。';
zh['landing.video_faq.7.question'] = 'Is Airap Video free to use online?';
zh['landing.video_faq.7.answer'] =
  'Yes, Airap Video is 100% online and free to try. Every new account receives free welcome credits to create AI rap music videos right in your browser without software downloads or credit cards. Upgrading to a Pro plan unlocks unlimited high-priority generations and watermark-free downloads.';
zh['landing.video_faq.8.question'] =
  'Can I export high-definition AI rap videos without watermarks from MP3 or audio?';
zh['landing.video_faq.8.answer'] =
  'Yes! While free preview generations may include a standard identifier, Pro and Creator plans allow you to export crisp 1080p AI rap videos completely without watermarks. You can generate raps from prompts, uploaded photos, or custom audio and MP3 tracks with 100% commercial clearance.';

// Use Cases
en['landing.use_cases.title'] = 'What You Can Create with Airap Video';
en['landing.use_cases.1.badge'] = 'Viral Battles & Roasts';
en['landing.use_cases.1.title'] = 'Duo Rap Battles & Social Banter';
en['landing.use_cases.1.desc'] =
  'Drop friends, coworkers, or famous rivals into the iconic orange studio to trade hilarious bars, settle workplace debates, or roast each other.';
en['landing.use_cases.2.badge'] = 'Meme & Historical Icons';
en['landing.use_cases.2.title'] = 'From Lin Daiyu to Historical Icons';
en['landing.use_cases.2.desc'] =
  'Reimagine historical masters (Du Fu, Su Shi), classic literary figures, or pets delivering unexpected, hard-hitting drill and trap flows that break the internet.';
en['landing.use_cases.3.badge'] = 'Creators & Social Growth';
en['landing.use_cases.3.title'] = 'High-Retention TikTok & Shorts Content';
en['landing.use_cases.3.desc'] =
  'Hook viewers in the first 3 seconds with high-tempo rap beats, comedic punchlines, and eye-catching aesthetics that maximize watch time.';

zh['landing.use_cases.title'] = '使用 Airap Video 可以创作哪些内容？';
zh['landing.use_cases.1.badge'] = '爆款对决与社交整活';
zh['landing.use_cases.1.title'] = '双人录音棚互怼与损友互黑';
zh['landing.use_cases.1.desc'] =
  '把闺蜜、兄弟、同事或名人放入经典橙色录音棚，生成针锋相对、幽默爆笑的 Bar-for-bar 说唱对决，在朋友圈与社群疯传。';
zh['landing.use_cases.2.badge'] = '反差萌与文化出圈';
zh['landing.use_cases.2.title'] = '从林黛玉唱跳到古人走心倾诉';
zh['landing.use_cases.2.desc'] =
  '让古代文豪（苏轼、杜甫如《过来人》）、古典文学人物或萌宠唱出当代打工人的酸甜苦辣，极致反差感带来千万级播放。';
zh['landing.use_cases.3.badge'] = '自媒体与商业增长';
zh['landing.use_cases.3.title'] = '高完播率的短视频吸睛利器';
zh['landing.use_cases.3.desc'] =
  '利用说唱的高能量开场黄金 3 秒与密集信息量，轻松打破短视频完播率与互动率瓶颈，助推账号快速涨粉。';

// CTA
en['landing.cta.headline'] = 'Drop Your First Viral AI Rap Video Today';
en['landing.cta.subheadline'] =
  'Select the iconic orange studio or freestyle battle, upload photos, and watch AI spit fire in seconds.';
en['landing.cta.button'] = 'Create AI Rap Video Now';
en['landing.cta.title'] = 'Ready to Make Your First AI Rap Video?';
en['landing.cta.desc'] =
  'Join thousands of creators, meme makers, and hip-hop fans producing viral rap videos in one click.';
en['landing.cta.btn_generate'] = 'Start Creating Rap Videos';
en['landing.cta.btn_examples'] = 'Explore Rap Showcase';

zh['landing.cta.headline'] = '立即生成你的第一支爆款 AI 说唱视频';
zh['landing.cta.subheadline'] =
  '选择经典橙色录音棚或自由对战，上传照片，数十秒见证 AI 开麦炸场。';
zh['landing.cta.button'] = '立即制作 AI 说唱视频';
zh['landing.cta.title'] = '准备好开启你的 AI 说唱创作了吗？';
zh['landing.cta.desc'] =
  '加入数万名创作者与幽默爱好者的行列，一键生成席卷各大社交平台的爆款说唱短片。';
zh['landing.cta.btn_generate'] = '立即开始生成';
zh['landing.cta.btn_examples'] = '浏览精选作品库';

fs.writeFileSync(enPath, JSON.stringify(en, null, 2), 'utf8');
fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2), 'utf8');

console.log(
  'SUCCESS: Updated messages/en.json and messages/zh.json with AI Rap Video copywriting!'
);
