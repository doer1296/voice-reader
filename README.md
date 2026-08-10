# Voice Reader 分享指南

> 把你的 Windows 变成会说话的 AI 助手  
> 从 GitHub 一键安装，送给朋友也能用

---

## 仓库地址

```
https://github.com/doer1296/voice-reader
```

---

## 给朋友的一键安装命令

```powershell
irm https://raw.githubusercontent.com/doer1296/voice-reader/main/install.ps1 | iex
```

这条命令会：

1. 检测操作系统是否为 Windows
2. 检测 Node.js 是否已安装
3. 检测 SAPI 语音引擎是否可用
4. 检测 PowerShell 版本
5. 创建安装目录 `%USERPROFILE%\.voice-reader`
6. 从 GitHub 拉取所有文件
7. 设置环境变量 `VOICE_READER_HOME`
8. 安装 npm 依赖（零外部依赖）
9. 自动朗读测试语音——确认安装成功

---

## 快速开始

### 启动监听器（后台朗读模式）

```powershell
# 启动后最小化窗口，有新内容自动朗读
node "$env:VOICE_READER_HOME\src\voice-watcher.mjs"
```

### 单次朗读

```powershell
# 直接朗读指定文字
node "$env:VOICE_READER_HOME\src\voice-reader.mjs" 你好，欢迎使用 Voice Reader
```

### 控制监听器

```powershell
# 停止
node "$env:VOICE_READER_HOME\src\voice-reader.mjs" --stop

# 暂停
node "$env:VOICE_READER_HOME\src\voice-reader.mjs" --pause

# 恢复
node "$env:VOICE_READER_HOME\src\voice-reader.mjs" --resume

# 查看状态
node "$env:VOICE_READER_HOME\src\voice-reader.mjs" --status
```

---

## 在 Trae AI 中作为 Skill 使用

### 安装 Skill

```bash
# 在 Trae 工作区中执行
mkdir -p .trae/skills/voice-reader
# 复制 skill/SKILL.md 到 .trae/skills/voice-reader/
```

### Skill 调用指令

当 AI 需要朗读文字时，会自动使用以下逻辑：

**第 0 步：确保监听器运行**

```powershell
$r = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*voice-watcher.mjs*' }
if (-not $r) {
    Start-Process -WindowStyle Hidden node -ArgumentList "$env:VOICE_READER_HOME\src\voice-watcher.mjs"
}
```

**第 1 步：朗读用户输入**

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

**第 2 步：朗读回复内容**

```powershell
$c = @"
[VOICE_READER_START:info]
回复内容（2-3 句，不超过 100 字，只说结论）
[VOICE_READER_END]
"@
[System.IO.File]::WriteAllText("$env:VOICE_READER_HOME\pending.txt", $c, [System.Text.Encoding]::UTF8)
```

---

## 四种提示音效果

| 类型 | 标记 | 开始音效 | 结束音效 | 使用场景 |
|------|------|---------|---------|---------|
| info | `[:info]` | 升调 800→1200Hz | 单音 600Hz | 日常对话信息 |
| success | `[:success]` | 三阶升调 600→800→1200Hz | 降调 1200→600Hz | 任务完成提醒 |
| error | `[:error]` | 三阶降调 1000→600→400Hz | 低沉 300Hz | 错误/异常提醒 |
| warning | `[:warning]` | 双音警示 800→500Hz | 单音 400Hz | 重要提醒 |

---

## 自定义配置

编辑 `%USERPROFILE%\.voice-reader\config.json`：

```json
{
    "rate": 0,           // 朗读速率：-10(慢) ~ 10(快)
    "volume": 100,        // 音量：0(静音) ~ 100(最大)
    "voice": "Microsoft Huihui",  // 语音引擎名称
    "poll_interval": 2000, // 监听轮询间隔(毫秒)
    "max_length": 200     // 单次截断字数
}
```

也可以通过环境变量覆盖：

```powershell
$env:VOICE_READER_RATE = -2
$env:VOICE_READER_VOICE = "Microsoft Zira"
```

---

## 卸载

```powershell
# 一键卸载
& "$env:VOICE_READER_HOME\uninstall.ps1"
```

---

## 系统要求

- **操作系统**: Windows 7 / 8 / 10 / 11
- **Node.js**: >= 18（[下载](https://nodejs.org/)）
- **PowerShell**: 5.0+
- **语音引擎**: Windows SAPI（系统自带，无需安装）

---

## 项目结构

```
voice-reader/
├── README.md              # 项目说明
├── package.json           # Node.js 配置
├── install.ps1            # 一键安装脚本
├── uninstall.ps1          # 卸载脚本
├── config.json            # 用户配置文件
├── src/
│   ├── lib.js             # 公共模块（路径检测、配置加载、文本清洗）
│   ├── voice-watcher.mjs  # 常驻监听器
│   └── voice-reader.mjs   # 单次朗读引擎（含 --help 完整帮助）
├── skill/
│   └── SKILL.md           # Trae Skill 定义
├── docs/
│   └── guide.md           # 使用指南
└── examples/
    └── usage-demo.md      # 使用示例
```

---

## 技术栈

| 组件 | 技术 |
|------|------|
| 语音引擎 | Windows SAPI (SpVoice COM) |
| 运行时 | Node.js (ESM) |
| 脚本语言 | PowerShell |
| 配置文件 | JSON |
| 提示音 | System.Console.Beep() |
| 外部依赖 | 零依赖 |

---

## 致谢 & 版权说明

### 项目起源

本项目源自 **TRAE Voice Reader** 官方 Skill（`voice-reader`），是 TRAE（字节跳动旗下 AI 编程工具）内置的语音朗读技能。

### 版权归属

- **原始 Skill 版权**：© TRAE / 字节跳动。原始的 SKILL.md 定义、核心机制设计（共享文件轮询 + SAPI 朗读 + 四种提示音）由 TRAE 团队设计和开发。
- **本项目改进**：在原始 Skill 基础上进行的路径抽象化、配置系统重构、自动安装脚本、文本清洗增强、控制命令扩展等优化工作。
- **使用许可**：本项目以 MIT 协议开源，但**请尊重原始 Skill 的知识产权**。若你在商业产品中使用此项目，建议保留对 TRAE 原始技能的署名。

### 引用说明

```
原始 Skill: TRAE Voice Reader（voice-reader）
原始来源: TRAE 内置 Skill 系统
版权持有: © TRAE / 字节跳动
改进作者: Nova & Doer
改进范围: 路径抽象、安装脚本、配置系统、文本清洗增强、控制命令
```

---

## License

MIT License

Copyright (c) 2026 Nova & Doer

本项目基于 TRAE Voice Reader 原始 Skill 改进而来。原始技能版权归 TRAE / 字节跳动所有。

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.