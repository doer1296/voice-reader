# Voice Reader 使用指南

> 完整的使用教程，从安装到高级配置

---

## 安装

### 方法一：一键安装（推荐）

```powershell
irm https://raw.githubusercontent.com/doer1296/voice-reader/main/install.ps1 | iex
```

安装脚本会自动完成：
1. 检测操作系统是否为 Windows
2. 检查 Node.js 及版本
3. 检查 SAPI 语音引擎
4. 检查 PowerShell 版本
5. 创建安装目录 `%USERPROFILE%\.voice-reader`
6. 从 GitHub 拉取文件
7. 设置用户环境变量 `VOICE_READER_HOME`
8. 安装 npm 依赖
9. 朗读测试语音确认安装成功

### 方法二：手动安装

```powershell
git clone https://github.com/doer1296/voice-reader.git
cd voice-reader
.\install.ps1
```

### 方法三：仅作为 Trae Skill 安装

```bash
# 在 Trae 工作区中执行
mkdir -p .trae/skills/voice-reader
# 复制 skill/SKILL.md 到 .trae/skills/voice-reader/
```

---

## 基础使用

### 启动监听器（后台模式）

```powershell
node "$env:VOICE_READER_HOME\src\voice-watcher.mjs"
```

监听器启动后会持续轮询 `pending.txt`，有新内容自动朗读。建议最小化窗口运行。

### 单次朗读

```powershell
node "$env:VOICE_READER_HOME\src\voice-reader.mjs" 你好，欢迎使用 Voice Reader
```

### 查看帮助

```powershell
node "$env:VOICE_READER_HOME\src\voice-reader.mjs" --help
```

---

## 控制命令

| 命令 | 说明 |
|------|------|
| `--stop` | 停止监听器 |
| `--pause` | 暂停监听器（保留后台进程） |
| `--resume` | 恢复已暂停的监听器 |
| `--status` | 查看运行状态和配置信息 |
| `--help` | 显示完整帮助 |

---

## 在 AI 工作流中集成

### 步骤 1：确保监听器运行

```powershell
$r = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*voice-watcher.mjs*' }
if (-not $r) {
    Start-Process -WindowStyle Hidden node -ArgumentList "$env:VOICE_READER_HOME\src\voice-watcher.mjs"
}
```

### 步骤 2：朗读内容

写入 `pending.txt` 即可触发朗读。

**朗读用户输入**（先清空再写入）：

```powershell
$f = "$env:VOICE_READER_HOME\pending.txt"
[System.IO.File]::WriteAllText($f, "", [System.Text.Encoding]::UTF8)
$c = @"
[VOICE_READER_START:info]
用户说：你好
[VOICE_READER_END]
"@
[System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
```

**朗读回复**（直接写入）：

```powershell
$c = @"
[VOICE_READER_START:success]
任务已完成，请查收结果。
[VOICE_READER_END]
"@
[System.IO.File]::WriteAllText("$env:VOICE_READER_HOME\pending.txt", $c, [System.Text.Encoding]::UTF8)
```

### 提示音类型选择

| 类型标记 | 场景 | 示例 |
|----------|------|------|
| `[:info]` | 日常对话 | 用户输入、普通信息 |
| `[:success]` | 任务完成 | 代码运行成功、文件保存 |
| `[:error]` | 错误提醒 | 编译失败、网络异常 |
| `[:warning]` | 重要警示 | 磁盘空间不足、权限变更 |

---

## 配置

### 配置文件

编辑 `%USERPROFILE%\.voice-reader\config.json`：

```json
{
    "rate": 0,             // 朗读速率：-10(慢) ~ 10(快)
    "volume": 100,         // 音量：0(静音) ~ 100(最大)
    "voice": "Microsoft Huihui",  // 语音引擎名称
    "poll_interval": 2000, // 监听轮询间隔(毫秒)
    "max_length": 200      // 单次截断字数
}
```

### 环境变量

环境变量优先级高于配置文件：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VOICE_READER_HOME` | 数据目录 | `%USERPROFILE%\.voice-reader` |
| `VOICE_READER_RATE` | 朗读速率 | 0 |
| `VOICE_READER_VOLUME` | 音量 | 100 |
| `VOICE_READER_VOICE` | 语音引擎名称 | Microsoft Huihui |
| `VOICE_READER_POLL` | 轮询间隔(ms) | 2000 |
| `VOICE_READER_MAX_LEN` | 截断字数 | 200 |

---

## 常见问题

### Q: 朗读没有声音？
- 检查扬声器是否开启
- 运行 `node src/voice-reader.mjs --status` 查看状态
- 确认 SAPI 语音引擎可用：PowerShell 中执行 `New-Object -ComObject SAPI.SpVoice`

### Q: 如何查看可用语音引擎？
```powershell
Add-Type -AssemblyName System.Speech
(New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
```

### Q: 如何更改语音为英文？
设置环境变量 `VOICE_READER_VOICE=Microsoft Zira` 或修改 `config.json` 中的 `voice` 字段。

### Q: 监听器启动后如何关闭？
运行 `node src/voice-reader.mjs --stop`。

### Q: 如何卸载？
```powershell
& "$env:VOICE_READER_HOME\uninstall.ps1"
```

---

## 卸载

```powershell
# 一键卸载
& "$env:VOICE_READER_HOME\uninstall.ps1"
```

卸载脚本会：
1. 停止运行中的监听器
2. 移除环境变量 `VOICE_READER_HOME`
3. 询问是否删除安装目录