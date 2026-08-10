# Voice Reader 使用示例

> 各种场景下的实际用法展示

---

## 场景一：日常语音助手

监听器启动后，AI 助手在对话中使用语音反馈。

```powershell
# 用户提问
$c = @"
[VOICE_READER_START:info]
用户问：今天天气怎么样？
[VOICE_READER_END]
"@
[System.IO.File]::WriteAllText("$env:VOICE_READER_HOME\pending.txt", $c, [System.Text.Encoding]::UTF8)

# AI 回复时朗读
$c = @"
[VOICE_READER_START:info]
今天北京天气晴朗，气温 25 到 30 度，适合外出活动。
[VOICE_READER_END]
"@
[System.IO.File]::WriteAllText("$env:VOICE_READER_HOME\pending.txt", $c, [System.Text.Encoding]::UTF8)
```

---

## 场景二：任务完成提醒

代码编译通过或长时间任务完成后，用 success 音效提醒。

```powershell
$c = @"
[VOICE_READER_START:success]
项目构建成功！用时 45 秒，0 个错误，0 个警告。
[VOICE_READER_END]
"@
[System.IO.File]::WriteAllText("$env:VOICE_READER_HOME\pending.txt", $c, [System.Text.Encoding]::UTF8)
```

---

## 场景三：错误报警

编译失败或异常时，用 error 音效提醒。

```powershell
$c = @"
[VOICE_READER_START:error]
检测到 3 个编译错误，请检查控制台输出。
[VOICE_READER_END]
"@
[System.IO.File]::WriteAllText("$env:VOICE_READER_HOME\pending.txt", $c, [System.Text.Encoding]::UTF8)
```

---

## 场景四：重要提醒

磁盘空间不足或权限变更时，用 warning 音效引起注意。

```powershell
$c = @"
[VOICE_READER_START:warning]
磁盘空间不足 10%，请及时清理。
[VOICE_READER_END]
"@
[System.IO.File]::WriteAllText("$env:VOICE_READER_HOME\pending.txt", $c, [System.Text.Encoding]::UTF8)
```

---

## 场景五：定时播报（配合计划任务）

通过 Windows 任务计划程序定时播报。

```powershell
# 创建 PowerShell 脚本 C:\daily-report.ps1
$c = @"
[VOICE_READER_START:info]
现在是上午 9 点，今日待办事项有 5 项，请查看你的任务列表。
[VOICE_READER_END]
"@
[System.IO.File]::WriteAllText("$env:VOICE_READER_HOME\pending.txt", $c, [System.Text.Encoding]::UTF8)
```

然后在任务计划程序中创建基本任务，触发器设为每天 9:00，操作设为 `powershell -File C:\daily-report.ps1`。

---

## 场景六：文件内容朗读

读取文本文件内容并朗读。

```powershell
$content = Get-Content "C:\notes\today.txt" -Raw
# 截断过长的内容
if ($content.Length -gt 200) { $content = $content.Substring(0, 200) + " 内容较长，已截取。" }
$c = @"
[VOICE_READER_START:info]
$content
[VOICE_READER_END]
"@
[System.IO.File]::WriteAllText("$env:VOICE_READER_HOME\pending.txt", $c, [System.Text.Encoding]::UTF8)
```

---

## 场景七：朗读中英文混合内容

```powershell
node "$env:VOICE_READER_HOME\src\voice-reader.mjs" "Hello! 欢迎使用 Voice Reader，Your AI voice assistant."
```

---

## 场景八：在 Trae 中作为 Skill 的完整工作流

```powershell
# 第 0 步：确保监听器运行
$r = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*voice-watcher.mjs*' }
if (-not $r) {
    Start-Process -WindowStyle Hidden node -ArgumentList "$env:VOICE_READER_HOME\src\voice-watcher.mjs"
}

# 第 1 步：朗读用户输入
$f = "$env:VOICE_READER_HOME\pending.txt"
[System.IO.File]::WriteAllText($f, "", [System.Text.Encoding]::UTF8)
$c = @"
[VOICE_READER_START:info]
用户说：帮我写一个 Python 爬虫
[VOICE_READER_END]
"@
[System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)

# ... AI 处理中 ...

# 第 2 步：朗读 AI 回复
$c = @"
[VOICE_READER_START:success]
Python 爬虫已编写完成，代码已保存到桌面，包含异常处理和反爬措施。
[VOICE_READER_END]
"@
[System.IO.File]::WriteAllText("$env:VOICE_READER_HOME\pending.txt", $c, [System.Text.Encoding]::UTF8)
```