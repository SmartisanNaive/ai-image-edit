# AI-Image-Edit - AI图片生成编辑

[![Version](https://img.shields.io/badge/version-v1.0.0-blue.svg)](./VERSION)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/hugohe3/ppt-master.svg)](https://github.com/hugohe3/ppt-master/stargazers)

[English](./README_EN.md) | 中文

一个功能较为丰富的AI图片生成、编辑网站。

对复杂图形有概率会修改到原图其他元素

## 🚀 快速使用指南
> 💡 **AI 生成图片注意**：支持各种绘图模型，需要模型支持通用OpenAI API格式，编辑的话也是一样。

```
1️⃣ 克隆仓库
   git clone https://github.com/chunxiuxiamo/ai-image-edit.git

```

### 代表作品展示
v2作品：
<img width="633" height="275" alt="image" src="https://github.com/user-attachments/assets/97108237-77a2-4d34-bf37-e537b98e2585" />
<img width="1521" height="761" alt="image" src="https://github.com/user-attachments/assets/2564e09d-e795-4296-98ea-cee7fe8c44a4" />
<img width="1523" height="757" alt="image" src="https://github.com/user-attachments/assets/63f1434f-0fcd-497a-8bbd-ab07e49a96c2" />
<img width="1527" height="759" alt="image" src="https://github.com/user-attachments/assets/46f60727-1475-4f6b-aa86-cd189722577b" />
<img width="1706" height="872" alt="image" src="https://github.com/user-attachments/assets/c2410025-579c-4856-866f-41e3e6a8bbf6" />
<img width="1664" height="845" alt="image" src="https://github.com/user-attachments/assets/d751ccb4-586a-4bec-8014-cf8b1759e046" />
<img width="690" height="330" alt="image" src="https://github.com/user-attachments/assets/532d96c4-432d-4fb0-928c-a70219e6e363" />


v1作品：
<img width="1920" height="919" alt="image" src="https://github.com/user-attachments/assets/ece324f0-573d-452e-a976-afdb326e8de4" />
<img width="1920" height="1288" alt="image" src="https://github.com/user-attachments/assets/d245e284-741c-4036-a803-fa86ec185c06" />
<img width="1824" height="640" alt="d3075cef64f2032c0caaf76b474a964a" src="https://github.com/user-attachments/assets/9ebf0442-00ec-49ae-bde9-14330b280b46" />
<img width="1824" height="593" alt="af2a473247a552b48b5ddc290173e1c4" src="https://github.com/user-attachments/assets/9bc0b64f-de30-44a5-bd3c-ecbf74289265" />
<img width="928" height="1232" alt="0ed9e4ca3805ccf611058a161287c46f" src="https://github.com/user-attachments/assets/8bbdaf84-a028-45ab-bc56-53cdca833a7b" />
<img width="928" height="1232" alt="35e3ba86e00fcfa1b1b6c57975244182" src="https://github.com/user-attachments/assets/13f366ac-995c-48df-9c85-e9a3f6543e63" />


## 项目简介
本项目是一个简约的图片局部编辑工具，编辑会参考原图画风，编辑后完美符合原图风格，不违和，可以修改一张图中的指定文字内容，也可以修改图中局部元素。可以应用在各种仅需图片局部区域修改微调的场景，例如使用AI生成图片之后，整体满意，细节有问题，则可以直接对不满意区域框选之后输入修改指令编辑重绘。

## 核心特性

🎨 **智能生图** - 文字生成图片，连续对话生图
🎨 **图片局部编辑** - 画笔涂抹或框选局部区域，输入编辑指令进行局部修改，可以一次性框选多处同时修改
🎨 **增加无限画布** - 无限画布，体验观感更优
🎨 **实现选区工具** - 实现多种套索工具、抠图、蒙版生成功能
🎨 **AI抠图功能** - 多种方式抠图功能


# 2026-1-28 20:30 更新日志：
支持原生Gemini接口，多图层编辑系统、AI抠图、遮罩跟随及Docker部署优化

## 核心功能
- 增加无限画布
- 多图层系统
- 实现选区工具实现多种套索工具、抠图、蒙版生成功能
- AI抠图功能
- 优化预设提示词
- 添加清空提示词按钮

## 多图层系统
- 支持多张图片作为独立图层叠加
- 图层面板显示缩略图、名称、可见性、锁定状态
- 支持图层顺序调整（上移/下移）
- 支持图层重命名、删除、显示/隐藏、锁定/解锁

## 图片编辑功能
- 支持无遮罩的连续对话式图片编辑
- 优化提示词系统，强调遮罩优先级解决模型错位问题
- 修复坐标系统错位（改用图层相对坐标替代全局坐标）
- 添加遮罩预览功能，可视化验证遮罩正确性
- 支持矩形框选工具的归一化坐标（0-1000）和结构化JSON提示词

## 选区工具
- 实现自由套索工具（Free Lasso）：手绘自由选区
- 实现多边形套索工具（Polygonal Lasso）：点击创建多边形选区
- 实现磁性套索工具（Magnetic Lasso）：基于边缘检测的智能选区
- 所有套索工具支持遮罩跟随图层移动

## AI抠图功能
- 集成 @imgly/background-removal 浏览器端AI抠图
- 支持一键移除图片背景
- 抠图结果自动添加为新图层
- 支持下载透明背景PNG图片
- 显示模型加载和处理进度

## 技术改进
- 优化模型选择组件
- 给所有遮罩对象添加 maskLayerId 属性关联图层
- 重写图层移动监听器，实现独立图层遮罩跟随
- 优化 API 调用：支持 base64 直接传输、外部URL获取、Markdown格式解析
- 修复图层 URL 变化时的自动重载逻辑
- 实现边缘检测算法支持磁性套索工具

## Docker 部署优化
- 添加健康检查配置（30s间隔）
- 优化 Nginx 配置：安全头部、Gzip压缩、智能缓存策略
- 添加资源限制（CPU 1核/内存512M）
- 完善 .dockerignore 排除规则
- 添加 --legacy-peer-deps 支持 React 19

## 依赖更新
- 添加 @imgly/background-removal ^1.7.0（AI抠图）
- 更新 React 19.2.0 和 React DOM 19.2.0
- 更新 Fabric.js 7.0.0（画布引擎）
- 添加 lucide-react 图标库

## 文件变更
- 新增：src/lib/backgroundRemoval.js（抠图功能）
- 新增：src/lib/edgeDetection.js（边缘检测）
- 新增：src/components/LayerPanel.jsx（图层面板）
- 修改：src/components/CanvasEditor.jsx（核心画布逻辑）
- 修改：src/components/ControlPanel.jsx（控制面板UI）
- 修改：src/lib/api.js（API调用优化）
- 优化：Dockerfile、docker-compose.yml、nginx/default.conf

### 🚀 开始你的项目

# 克隆仓库
   git clone https://github.com/chunxiuxiamo/ai-image-edit.git

#### 本地化开发（推荐）

```bash
# 1. 初始化新项目安装依赖项
npm install

# 2. 运行项目
npm run dev

# 访问方式地址
http://localhost:5173
```

#### docker-compose（推荐）

```bash
# 1. docker运行项目
初次构建运行： docker-compose up -d --build

后续启动
docker-compose up -d

停止项目
docker-compose down

# 2. 运行项目
npm run dev

# 本地docker访问方式地址(服务器上需要自行修改nginx配置)
http://localhost:8890

```


## 常见问题

<details>
<summary><b>Q: 为什么选择我的自定义生图模型报错？</b></summary>

A: 当前需要模型支持OpenAI API通用参数格式

</details>

<details>
<summary><b>Q: 为什么我的图片不需要修改的地方也被改动了？</b></summary>

A: 图片元素如果比较多比较复杂，可能会导致不稳定，影响到其不需要编辑修改的位置。

</details>

## 贡献指南

我们欢迎各种形式的贡献！

### 如何贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 贡献方向

- 🎨 兼容gemini-3绘图模型
- 🎨 兼容其他绘图模型
- 📝 完善文档和教程
- 🐛 报告 bug 和问题
- 💡 提出新功能建议
- 🌍 多语言支持
- 📁 分享你的项目案例到 `examples/` 目录

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

你可以自由地：

- ✅ 商业使用
- ✅ 修改源代码
- ✅ 分发和再授权
- ✅ 私人使用

但需要：

- 📋 保留版权声明
- 📋 保留许可证声明


## 📮 联系方式

- **Issue**: [GitHub Issues](https://github.com/chunxiuxiamo/ai-image-edit/issues)
- **GitHub**: [@chunxiuxiamo](https://github.com/chunxiuxiamo)
- **项目链接**: [https://github.com/chunxiuxiamo/ai-image-edit](https://github.com/chunxiuxiamo/ai-image-edit)
- **个人微信**：![8aeeaae52f366b19e7bfe05b07e0920a](https://github.com/user-attachments/assets/4d601a83-d19e-48e2-85f6-f36d957cebfc)

## 🌟 Star History

如果这个项目对你有帮助，请给一个 ⭐ Star 支持一下！
---
