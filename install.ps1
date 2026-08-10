<#
.SYNOPSIS
    Voice Reader 一键安装脚本
.DESCRIPTION
    自动检测环境、安装依赖、配置环境变量，使 Voice Reader 可在任意目录使用。
    支持从 GitHub 远程调用: irm https://raw.githubusercontent.com/doer1296/voice-reader/main/install.ps1 | iex
.PARAMETER HomeDir
    指定安装目录，默认 %USERPROFILE%\.voice-reader
.PARAMETER SkipEnvVar
    跳过环境变量设置
.PARAMETER SkipTest
    跳过安装后测试
#>

param(
    [string]$HomeDir = "$env:USERPROFILE\.voice-reader",
    [switch]$SkipEnvVar,
    [switch]$SkipTest
)

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# ─── 颜色输出 ─────────────────────────────────────────────────────────────────
function Write-Step($msg) { Write-Host "`n▶ $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Warn($msg){ Write-Host "  ⚠ $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "  ✗ $msg" -ForegroundColor Red }

Write-Host @"

╔══════════════════════════════════════════════╗
║        Voice Reader — 一键安装脚本           ║
╚══════════════════════════════════════════════╝

"@ -ForegroundColor Magenta

# ═══════════════════════════════════════════════════════════════════════════════
# 步骤 1: 操作系统检查
# ═══════════════════════════════════════════════════════════════════════════════
Write-Step "步骤 1/9: 检测操作系统"

if ($env:OS -ne "Windows_NT") {
    Write-Err "Voice Reader 仅支持 Windows 系统"
    Write-Warn "检测到当前系统: $([System.Environment]::OSVersion.Platform)"
    exit 1
}

Write-OK "Windows 系统 ($([System.Environment]::OSVersion.VersionString))"

# ═══════════════════════════════════════════════════════════════════════════════
# 步骤 2: PowerShell 版本检查
# ═══════════════════════════════════════════════════════════════════════════════
Write-Step "步骤 2/9: 检测 PowerShell 版本"

if ($PSVersionTable.PSVersion.Major -lt 5) {
    Write-Err "需要 PowerShell 5.0 或更高版本，当前版本: $($PSVersionTable.PSVersion)"
    Write-Warn "请升级 PowerShell: https://aka.ms/powershell"
    exit 1
}

Write-OK "PowerShell $($PSVersionTable.PSVersion)"

# ═══════════════════════════════════════════════════════════════════════════════
# 步骤 3: Node.js 检查
# ═══════════════════════════════════════════════════════════════════════════════
Write-Step "步骤 3/9: 检测 Node.js"

$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodePath) {
    Write-Err "未找到 Node.js"
    Write-Warn "请先安装 Node.js (>= 18): https://nodejs.org/"
    Write-Warn "安装完成后重新运行此脚本"
    exit 1
}

$nodeVersion = & node --version
Write-OK "Node.js $nodeVersion ($nodePath)"

# ═══════════════════════════════════════════════════════════════════════════════
# 步骤 4: SAPI 语音引擎检查
# ═══════════════════════════════════════════════════════════════════════════════
Write-Step "步骤 4/9: 检测 Windows SAPI 语音引擎"

try {
    $voice = New-Object -ComObject SAPI.SpVoice
    $voiceCount = $voice.GetVoices().Count
    Write-OK "SAPI 语音引擎可用 (已安装 $voiceCount 个语音)"
} catch {
    Write-Err "SAPI 语音引擎不可用: $_"
    exit 1
}

# ═══════════════════════════════════════════════════════════════════════════════
# 步骤 5: 创建安装目录
# ═══════════════════════════════════════════════════════════════════════════════
Write-Step "步骤 5/9: 创建安装目录"

if (-not (Test-Path $HomeDir)) {
    New-Item -ItemType Directory -Path $HomeDir -Force | Out-Null
    Write-OK "已创建目录: $HomeDir"
} else {
    Write-OK "目录已存在: $HomeDir"
}

# ── 创建子目录 ──
$subDirs = @("src", "skill", "docs", "examples")
foreach ($dir in $subDirs) {
    $target = "$HomeDir\$dir"
    if (-not (Test-Path $target)) {
        New-Item -ItemType Directory -Path $target -Force | Out-Null
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# 步骤 6: 复制文件
# ═══════════════════════════════════════════════════════════════════════════════
Write-Step "步骤 6/9: 复制项目文件"

# 如果脚本是从 GitHub 远程运行的（没有本地文件），则通过 git clone
if (-not (Test-Path "$scriptRoot\src\lib.js")) {
    Write-Warn "未检测到本地项目文件，尝试从 GitHub 克隆..."
    if (Get-Command git -ErrorAction SilentlyContinue) {
        $tempDir = "$env:TEMP\voice-reader-$(Get-Random)"
        & git clone --depth 1 "https://github.com/doer1296/voice-reader.git" $tempDir 2>$null
        if ($LASTEXITCODE -eq 0) {
            Copy-Item "$tempDir\*" $HomeDir -Recurse -Force
            Remove-Item $tempDir -Recurse -Force
            Write-OK "文件已从 GitHub 克隆到 $HomeDir"
        } else {
            Write-Err "GitHub 克隆失败，请手动下载项目"
            exit 1
        }
    } else {
        Write-Err "未找到 Git，请安装 Git 或手动下载项目文件放置到 $HomeDir"
        exit 1
    }
} else {
    # 本地复制
    Copy-Item "$scriptRoot\src\*" "$HomeDir\src\" -Recurse -Force
    if (Test-Path "$scriptRoot\skill") { Copy-Item "$scriptRoot\skill\*" "$HomeDir\skill\" -Recurse -Force }
    if (Test-Path "$scriptRoot\docs")  { Copy-Item "$scriptRoot\docs\*" "$HomeDir\docs\" -Recurse -Force }
    if (Test-Path "$scriptRoot\config.json") { Copy-Item "$scriptRoot\config.json" "$HomeDir\" -Force }
    if (Test-Path "$scriptRoot\package.json") { Copy-Item "$scriptRoot\package.json" "$HomeDir\" -Force }
    Write-OK "项目文件已复制到 $HomeDir"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 步骤 7: 设置环境变量
# ═══════════════════════════════════════════════════════════════════════════════
Write-Step "步骤 7/9: 配置环境变量"

if (-not $SkipEnvVar) {
    $target = [EnvironmentVariableTarget]::User
    $current = [Environment]::GetEnvironmentVariable("VOICE_READER_HOME", $target)
    if ($current -ne $HomeDir) {
        [Environment]::SetEnvironmentVariable("VOICE_READER_HOME", $HomeDir, $target)
        Write-OK "已设置用户环境变量 VOICE_READER_HOME = $HomeDir"
        Write-Warn "请重启终端或重新打开 PowerShell 使环境变量生效"
    } else {
        Write-OK "环境变量 VOICE_READER_HOME 已正确配置"
    }
} else {
    Write-Warn "已跳过环境变量设置（使用 --SkipEnvVar）"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 步骤 8: 安装 npm 依赖
# ═══════════════════════════════════════════════════════════════════════════════
Write-Step "步骤 8/9: 安装 npm 依赖"

if (Test-Path "$HomeDir\package.json") {
    Push-Location $HomeDir
    & npm install --production 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq $null) {
        Write-OK "npm 依赖安装完成（零外部依赖）"
    } else {
        Write-Warn "npm install 出现警告，但不影响核心功能"
    }
    Pop-Location
} else {
    Write-OK "无 package.json，跳过 npm 安装"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 步骤 9: 测试朗读
# ═══════════════════════════════════════════════════════════════════════════════
Write-Step "步骤 9/9: 测试朗读"

if (-not $SkipTest) {
    try {
        $testText = "Voice Reader 安装成功！欢迎使用语音朗读系统。"
        & node "$HomeDir\src\voice-reader.mjs" $testText 2>&1 | Out-Null
        Write-OK "测试朗读完成（请检查扬声器）"
        Write-Host "  朗读内容: 「$testText」" -ForegroundColor Gray
    } catch {
        Write-Warn "测试朗读失败: $_"
        Write-Warn "请确保扬声器已开启，稍后可以手动测试"
    }
} else {
    Write-Warn "已跳过安装后测试（使用 --SkipTest）"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 安装完成
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host @"

╔══════════════════════════════════════════════╗
║       Voice Reader 安装完成！                ║
╚══════════════════════════════════════════════╝

"@ -ForegroundColor Green

Write-Host "安装信息:" -ForegroundColor Cyan
Write-Host "  安装目录:  $HomeDir"
Write-Host "  配置文件:  $HomeDir\config.json"
Write-Host "  环境变量:  VOICE_READER_HOME"

Write-Host "`n快速开始:" -ForegroundColor Cyan
Write-Host "  1. 启动监听器（后台朗读）:"
Write-Host "     node `"$HomeDir\src\voice-watcher.mjs`""
Write-Host ""
Write-Host "  2. 单次朗读:"
Write-Host "     node `"$HomeDir\src\voice-reader.mjs`" 你好，世界"
Write-Host ""
Write-Host "  3. 查看帮助:"
Write-Host "     node `"$HomeDir\src\voice-reader.mjs`" --help"
Write-Host ""
Write-Host "  4. 卸载:"
Write-Host "     & `"$HomeDir\uninstall.ps1`""
Write-Host ""
Write-Host "  5. 配置: 编辑 $HomeDir\config.json 调整语音、速率、音量等"