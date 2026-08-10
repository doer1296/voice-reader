---
name: "voice-reader"
description: "Voice Reader - Windows TTS 语音朗读系统。基于 SAPI 引擎，支持四种提示音(info/success/error/warning)。当用户需要朗读文字、语音反馈、或需要 TTS 朗读功能时调用。"
---

# Voice Reader

> 基于 Windows SAPI 的语音朗读系统，支持四种提示音，零外部依赖。

## 核心机制

所有任务写入**同一个全局共享文件**，由常驻后台监听器统一朗读。

- 数据目录：`%VOICE_READER_HOME%`（默认 `%USERPROFILE%\.voice-reader`）
- 共享文件：`<HOME>/pending.txt`
- 监听器：`<HOME>/src/voice-watcher.mjs`
- 配置文件：`<HOME>/config.json`

## 文本处理规则（每次写入前执行）

原始文本按以下规则清洗后再写入：

```
去除代码块 ```...```
去除行内代码 `...`
去除加粗/斜体 **...** *...*
去除标题 # ...
去除链接 [text](url) 和图片 ![alt](url)
去除 URL
去除引用块 > ...
去除列表标记 - * + 和数字列表 1. 2.
去除任务列表 - [x] ...
简化表格 | ... |
合并多余空行
超过 200 字自动截断（可配置）
```

## 四种提示音

| 类型 | 标记 | 开始提示音 | 结束提示音 | 场景 |
|------|------|-----------|-----------|------|
| info | `[:info]` | 800→1200Hz 升调 | 600Hz 单音 | 日常对话 |
| success | `[:success]` | 600→800→1200Hz 三阶升 | 1200→600Hz 降调 | 任务完成 |
| error | `[:error]` | 1000→600→400Hz 三阶降 | 300Hz 低沉 | 报错提醒 |
| warning | `[:warning]` | 800→500Hz 双音警示 | 400Hz 单音 | 重要提醒 |

## 安装方法

### 方式一：一键安装（推荐）

```powershell
irm https://raw.githubusercontent.com/doer1296/voice-reader/main/install.ps1 | iex
```

### 方式二：手动安装

```powershell
git clone https://github.com/doer1296/voice-reader.git
cd voice-reader
.\install.ps1
```

## 使用方法

### 第一步：确保监听器运行

```powershell
$r = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*voice-watcher.mjs*' }
if (-not $r) {
    Start-Process -WindowStyle Hidden node -ArgumentList "$env:VOICE_READER_HOME\src\voice-watcher.mjs"
    Write-Host "监听器已启动"
} else {
    Write-Host "监听器已在运行"
}
```

### 第二步：朗读用户输入（先清空再写入）

```powershell
$f = "$env:VOICE_READER_HOME\pending.txt"
[System.IO.File]::WriteAllText($f, "", [System.Text.Encoding]::UTF8)
$c = @"
[VOICE_READER_START:info]
用户说：XXX
[VOICE_READER_END]
"@
[System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
```

### 第三步：朗读回复内容（直接写入）

```powershell
$c = @"
[VOICE_READER_START:info]
回复内容（2-3 句，不超过 100 字，只说结论）
[VOICE_READER_END]
"@
[System.IO.File]::WriteAllText("$env:VOICE_READER_HOME\pending.txt", $c, [System.Text.Encoding]::UTF8)
```

## 命令行用法

```bash
# 启动监听器
node src/voice-watcher.mjs

# 单次朗读
node src/voice-reader.mjs "你好，世界"

# 停止监听器
node src/voice-reader.mjs --stop

# 暂停/恢复监听器
node src/voice-reader.mjs --pause
node src/voice-reader.mjs --resume

# 查看状态
node src/voice-reader.mjs --status

# 查看帮助
node src/voice-reader.mjs --help
```

## 环境变量配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VOICE_READER_HOME` | 数据目录 | `%USERPROFILE%\.voice-reader` |
| `VOICE_READER_RATE` | 朗读速率(-10~10) | 0 |
| `VOICE_READER_VOLUME` | 音量(0~100) | 100 |
| `VOICE_READER_VOICE` | 语音引擎名称 | Microsoft Huihui |
| `VOICE_READER_POLL` | 轮询间隔(ms) | 2000 |
| `VOICE_READER_MAX_LEN` | 截断字数 | 200 |

## 配置示例

`config.json` 文件内容：

```json
{
    "rate": 0,
    "volume": 100,
    "voice": "Microsoft Huihui",
    "poll_interval": 2000,
    "max_length": 200
}
```

## 系统要求

- Windows 7 及以上版本
- Node.js >= 18
- PowerShell 5.0+
- Windows SAPI 语音引擎（系统自带）

---

## 版权声明

**原始来源**：本项目源自 **TRAE Voice Reader** 官方 Skill（`voice-reader`），是 TRAE（字节跳动旗下 AI 编程工具）内置的语音朗读技能。

**版权归属**：原始 Skill 的核心机制设计（共享文件轮询 + SAPI 朗读 + 四种提示音）由 TRAE 团队设计和开发，版权归 © TRAE / 字节跳动所有。

**改进范围**：本版本在原始 Skill 基础上进行了路径抽象化、配置系统重构、自动安装脚本、文本清洗增强、控制命令扩展等优化工作。改进部分的代码以 MIT 协议开源。

```
原始 Skill: TRAE Voice Reader（voice-reader）
原始来源: TRAE 内置 Skill 系统
版权持有: © TRAE / 字节跳动
改进作者: Nova & Doer
改进范围: 路径抽象、安装脚本、配置系统、文本清洗增强、控制命令
```