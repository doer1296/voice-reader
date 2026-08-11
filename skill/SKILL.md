---
name: voice-reader
description: >
  语音朗读系统。调用时检查并启动后台监听器，朗读用户输入和 AI 回复。
  支持四种差异化提示音：info / success / error / warning。
---

# Voice Reader

## 核心机制

所有任务写入**同一个全局共享文件**，由常驻后台监听器统一朗读。

监听器路径（全局路径，所有任务可访问）：
```
C:\Users\15390\.trae-cn\work\.voice-reader\voice-watcher.mjs
```

共享文件路径：
```
C:\Users\15390\.trae-cn\work\.voice-reader\pending.txt
```

## 文本处理规则（每次写入前执行）

原始文本按以下规则清洗后再写入：

```
去除代码块 ```...```
去除行内代码 `...`
去除加粗 **...**
去除标题 # ...
去除链接 [text](url)
去除 URL
去除列表标记 - * +
合并多余空行
超过 200 字自动截断
```

## 第 0 步：确保监听器运行（每次调用必做）

```powershell
$r = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*voice-watcher.mjs*' }
if (-not $r) {
    Start-Process -WindowStyle Hidden node -ArgumentList "C:\Users\15390\.trae-cn\work\.voice-reader\voice-watcher.mjs"
    Write-Host "监听器已启动"
} else {
    Write-Host "监听器已在运行"
}
```

## 第 1 步：朗读用户输入（先清空再写入）

```powershell
$f = "C:\Users\15390\.trae-cn\work\.voice-reader\pending.txt"
[System.IO.File]::WriteAllText($f, "", [System.Text.Encoding]::UTF8)
$c = @"
[VOICE_READER_START:info]
用户说：XXX
[VOICE_READER_END]
"@
[System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
```

## 第 2 步：朗读回复内容（直接写入）

```powershell
$c = @"
[VOICE_READER_START:info]
回复内容（2-3 句，不超过 100 字，只说结论）
[VOICE_READER_END]
"@
[System.IO.File]::WriteAllText("C:\Users\15390\.trae-cn\work\.voice-reader\pending.txt", $c, [System.Text.Encoding]::UTF8)
```

## 四种类型

| 类型 | 标记 | 开始提示音 | 结束提示音 | 场景 |
|------|------|-----------|-----------|------|
| info | `[:info]` | 800→1200Hz 升调 | 600Hz 单音 | 日常对话 |
| success | `[:success]` | 600→800→1200Hz 三阶升 | 1200→600Hz 降调 | 任务完成 |
| error | `[:error]` | 1000→600→400Hz 三阶降 | 300Hz 低沉 | 报错提醒 |
| warning | `[:warning]` | 800→500Hz 双音警示 | 400Hz 单音 | 重要提醒 |