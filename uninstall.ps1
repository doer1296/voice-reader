<#
.SYNOPSIS
    Voice Reader 卸载脚本
.DESCRIPTION
    移除环境变量、清理安装目录
#>

param(
    [string]$HomeDir = "$env:USERPROFILE\.voice-reader",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host "Voice Reader 卸载中..." -ForegroundColor Yellow

# 停止监听器
if (Test-Path "$HomeDir\src\voice-reader.mjs") {
    try {
        & node "$HomeDir\src\voice-reader.mjs" --stop 2>&1 | Out-Null
    } catch {}
}

# 移除环境变量
$target = [EnvironmentVariableTarget]::User
$current = [Environment]::GetEnvironmentVariable("VOICE_READER_HOME", $target)
if ($current) {
    [Environment]::SetEnvironmentVariable("VOICE_READER_HOME", $null, $target)
    Write-Host "  ✓ 已移除环境变量 VOICE_READER_HOME" -ForegroundColor Green
}

# 删除安装目录
if (Test-Path $HomeDir) {
    if ($Force) {
        Remove-Item $HomeDir -Recurse -Force
        Write-Host "  ✓ 已删除安装目录: $HomeDir" -ForegroundColor Green
    } else {
        $confirm = Read-Host "确认删除 $HomeDir 目录? (y/N)"
        if ($confirm -eq 'y' -or $confirm -eq 'Y') {
            Remove-Item $HomeDir -Recurse -Force
            Write-Host "  ✓ 已删除安装目录: $HomeDir" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ 已跳过删除目录" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n卸载完成" -ForegroundColor Green