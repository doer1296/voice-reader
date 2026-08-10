#!/usr/bin/env node
// voice-watcher.mjs — 常驻语音监听器（可分发版）
// 持续轮询 pending.txt，有新内容自动朗读
// 用法: node src/voice-watcher.mjs

import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { BEEP, beepCmd, extractReadable, cleanText, SPEAK_RATE, SPEAK_VOLUME, SPEAK_VOICE, POLL_INTERVAL, MAX_LENGTH, PENDING, CONTROL, PS_PATH, HOME } from './lib.js';

console.log('╔══════════════════════════════════════════════╗');
console.log('║       Voice Reader 监听器已启动              ║');
console.log('╠══════════════════════════════════════════════╣');
console.log(`║  数据目录: ${HOME.padEnd(35)}║`);
console.log(`║  轮询路径: ${PENDING.padEnd(35)}║`);
console.log(`║  轮询间隔: ${String(POLL_INTERVAL) + 'ms'.padEnd(33)}║`);
console.log(`║  朗读速率: ${String(SPEAK_RATE).padEnd(35)}║`);
console.log(`║  语音引擎: ${SPEAK_VOICE.padEnd(35)}║`);
console.log('║  支持类型: info / success / error / warning   ║');
console.log('╚══════════════════════════════════════════════╝');

function speak(text, type = 'info') {
    const safe = text.replace(/'/g, "''");
    const b = BEEP[type] || BEEP.info;
    const ps1File = join(tmpdir(), `watcher-ps-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.ps1`);
    const ps = `${beepCmd(b.start)}
$text = @'
${safe}
'@
try {
    $voice = New-Object -ComObject SAPI.SpVoice
    $voice.Rate = ${SPEAK_RATE}
    $voice.Volume = ${SPEAK_VOLUME}
    $voice.Speak($text)
} catch {
    Write-Host "SAPI 朗读失败: $_"
}
${beepCmd(b.end)}`;

    writeFileSync(ps1File, ps, 'utf8');
    spawn(PS_PATH, ['-File', ps1File], { windowsHide: true, stdio: 'ignore' });
    setTimeout(() => { try { unlinkSync(ps1File); } catch {} }, 30000);
}

let lastHash = '';
let pauseFlag = false;

// 处理停止信号
setInterval(() => {
    if (existsSync(CONTROL)) {
        try {
            const flag = process._readFileSync ? '' : require('fs').readFileSync(CONTROL, 'utf-8').trim();
            if (flag === 'STOP' || flag === 'PAUSE') {
                pauseFlag = flag === 'PAUSE';
                console.log(`[${new Date().toLocaleTimeString()}] 收到 ${flag} 信号`);
                try { require('fs').unlinkSync(CONTROL); } catch {}
            }
        } catch {}
    }
}, 1000);

setInterval(() => {
    if (pauseFlag) return;
    if (existsSync(CONTROL)) return;
    try {
        const raw = extractReadable();
        if (raw && raw.text !== lastHash) {
            lastHash = raw.text;
            let cleaned = cleanText(raw.text);
            if (cleaned.length > MAX_LENGTH) {
                cleaned = cleaned.slice(0, MAX_LENGTH) + ' 内容较长，已截取。';
            }
            if (!cleaned) return;
            console.log(`[${new Date().toLocaleTimeString()}] 朗读 (${cleaned.length} 字, 类型: ${raw.type})`);
            speak(cleaned, raw.type);
            try { writeFileSync(PENDING, '', 'utf8'); } catch {}
        }
    } catch (err) {
        console.error(`[${new Date().toLocaleTimeString()}] 错误: ${err.message}`);
    }
}, POLL_INTERVAL);

// 优雅退出
process.on('SIGINT', () => {
    console.log('\n正在停止监听器...');
    process.exit(0);
});

process.stdin.resume();