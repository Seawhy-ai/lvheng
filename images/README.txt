=== SeaWhy AI 图片文件夹 ===

AI 角色可以通过 [img:文件名.jpg] 语法在聊天中发送图片。

## 各角色的建议图片文件名：

### Ahy（王晗）- 女大学生
  ahy-selfie1.jpg, ahy-selfie2.jpg, ahy-selfie3.jpg  （自拍）
  ahy-food1.jpg, ahy-food2.jpg                       （美食）
  ahy-view1.jpg, ahy-view2.jpg                       （风景）
  ahy-meme1.jpg, ahy-meme2.jpg                       （表情包）
  ahy-ps1.jpg, ahy-ps2.jpg                           （P图作品）
  ahy-sticker1.gif, ahy-sticker2.gif, ahy-sticker3.gif  （动图表情包）

### kute - 男生
  kute-meme1.jpg, kute-meme2.jpg                     （梗图）
  kute-game1.jpg                                     （游戏截图）
  kute-weird1.jpg                                    （奇怪东西）

### 暖日蓝恬 - 女大学生
  nuanri-campus1.jpg                                 （校园）
  nuanri-study1.jpg                                  （学习备考）
  nuanri-food1.jpg                                   （食堂美食）
  nuanri-activity1.jpg                               （活动照）
  nuanri-meme1.jpg                                   （表情包）

### Swai - AI助手
  swai-diagram1.jpg                                  （示意图/图表）

## 使用方式：

1. 把你的图片文件放到这个文件夹里
2. 文件名要和上面的一致（或者你自定义，但也要更新 system prompt）
3. 聊天时 AI 会自动在合适的时候发送图片
4. 点击聊天中的图片可以放大查看
5. 支持的格式：jpg, png, gif, webp

## 动图/表情包 (GIF)：

GIF 动图会自动以「贴纸样式」显示（较小、无边框、透明底），像微信表情包。
- 用法：[img:xxx.gif]  →  自动识别为动图，贴纸样式
- 或者：[sticker:xxx.gif]  →  强制贴纸样式
- 用法：[img:xxx.gif|说明]  →  加了说明文字就按普通图片样式显示

## 自定义图片：

如果你想添加其他图片，只需：
1. 把图片放进这个文件夹
2. 在 index.html 中更新对应角色的 prompt，告诉 AI 可以用 [img:你的文件名.jpg|描述]
