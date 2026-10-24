# 动态分镜素材与制作记录

使用内置 image_gen 工具生成三张原创教学虚构画面；未使用 CLI 或外部影视片段。JPEG 是同一生成画面的网页压缩副本，原 PNG 保留在 Codex generated_images 目录。页面明确标注 AI 生成场景与教学虚构。

本版本是动态分镜和场景交互，不是真人表演视频。片头包含镜头推进、两张人物状态画面的切换、模拟手机消息、字幕、合成旁白与提示音。支持暂停、静音和跳过。房间调查包含热点点选、照片拖动对照、合同条款标记与本地调查板。

## 保存位置

项目根目录：`/Users/ccy/Documents/Codex/2026-10-23/codex-threads-01a152d0-85d6-7716-a4e9/work/lvheng-current`

- `images/drama/deposit-room.jpg`：房间全景。
- `images/drama/deposit-reaction.jpg`：小禾转头查看墙面。
- `images/drama/wall-comparison.jpg`：两张模拟墙面照片的对照图。
- `audio/drama/opening-1.m4a`、`opening-2.m4a`、`opening-3.m4a`：使用本机 Tingting 合成语音生成的普通话旁白，非真人录音。

生成的原 PNG：
- `/Users/ccy/.codex/generated_images/01a16873-ec06-7ff2-b4e4-2ebdf603e4d0/exec-5addef94-85df-4e68-962a-12f410e34d6a.png`
- `/Users/ccy/.codex/generated_images/01a16873-ec06-7ff2-b4e4-2ebdf603e4d0/exec-043b1c33-8ac3-44cc-860f-05098c958e31.png`
- `/Users/ccy/.codex/generated_images/01a16873-ec06-7ff2-b4e4-2ebdf603e4d0/exec-1c03462a-f726-4170-a9ad-5290a5c635ac.png`

## 完整生成提示词

### 房间全景

Use case: photorealistic-natural. Asset type: original cinematic establishing frame for a Chinese legal education interactive story, wide landscape 16:9. Scene: a modest rented studio apartment in China at dusk, rain on window at left, warm desk lamp, cardboard moving boxes near doorway on right. A fictional Chinese woman aged 23 wearing a rust-orange cardigan sits at a small wooden desk on the right third, looking pensively at a smartphone in her hand. The left center of the frame clearly shows a pale beige wall with a small gray scuff above the bed, not severe damage. On the desk are a cream paper rental contract folder and a pair of keys. Realistic natural human anatomy, understated acting, cinematic 35mm photography, restrained warm amber practical lighting against cool evening window, actual textured materials, serious quiet mood, no cartoon. Camera wide, space for UI across lower fifth, important subject and objects in center 80%. No text, no words, no watermarks, no brands. Not a screenshot, not a collage. Intended as a fictional dramatization, not a real incident.

### 照片对照

Use the referenced image as a visual reference for the apartment wall, not as an edit target. Generate one cinematic evidence comparison diptych for a fictional educational game, landscape 2:1, exact two equally sized square panels side by side with no gutter. Both panels are close-up photographs of the SAME pale beige wall over the bed seen in the reference, same camera angle and same wall texture, lower edge barely shows dark wooden headboard. Left panel: a small light gray diagonal scuff at the center. Right panel: the same scuff, slightly darker and longer with one additional faint adjacent mark, warmer light. Match physical location and scale carefully, no dramatic destruction. No people, no text, no labels, no time stamps, no borders, no watermark. Full-bleed realistic photo texture. These are simulated evidence images, not real case photos.

参考图：上面的房间全景。

### 转头反应镜头

Create the next cinematic shot of this same fictional scene, preserving the SAME fictional woman, face, orange cardigan, apartment details, warm rainy dusk lighting. Landscape 16:9 medium over-the-shoulder shot from behind her right shoulder at the desk. She has lowered the phone onto the desk and turned her head toward the scuff mark on the pale wall above the bed, with a thoughtful, concerned expression, one hand resting on the cream contract folder. This is a reaction shot for an authored educational interactive drama. Natural anatomical hands, subtle believable acting, coherent room geography, realistic film photography. Keep the visible scuff on the wall. No text, watermark, logos, captions or interface. Do not create a collage.

参考图：上面的房间全景。

## 旁白文本

1. 搬走后的第十天。小禾还在等，那两千元押金。
2. 房东发来消息。墙面有痕迹，整屋重刷，押金不退了。
3. 可那道痕迹，入住时就有吧？现在，手机在你手里。

## 数据边界

新增的照片对照、条款标记和调查板保存在本设备剧情存档。现有课堂提交仍仅提交先前定义的已读材料、分支选择和复盘文字；不把新增操作冒充教师已收到的数据。本次前端升级不要求修改 Worker。
