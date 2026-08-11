#!/usr/bin/env node
// voice-watcher.mjs — 常驻语音监听器（公共模块版）
// 持续轮询 pending.txt，有新内容自动朗读

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { BEEP, beepCmd, extractReadable, cleanText, SPEAK_RATE, PENDING, CONTROL, PS_PATH, POLL_INTERVAL } from './lib.js';

console.log('Voice Reader 监听器已启动');
console.log(`轮询路径: ${PENDING}`);
console.log(`支持类型: info / success / error / warning`);

function speak(text, type = 'info') {
    const safe = text.replace(/'/g, "''");
    const b = BEEP[type] || BEEP.info;
    const ps1Path = `C:\\Users\\15390\\AppData\\Local\\Temp\\watcher-ps-${Date.now()}.ps1`;
    const ps = `${beepCmd(b.start)}
$text = @'
${safe}
'@
$voice = New-Object -ComObject SAPI.SpVoice
$voice.Rate = ${SPEAK_RATE}
$voice.Speak($text)
${beepCmd(b.end)}`;

    writeFileSync(ps1Path, ps, 'utf8');
    spawn(PS_PATH, ['-File', ps1Path], { windowsHide: true, stdio: 'ignore' });
    setTimeout(() => { try { unlinkSync(ps1Path); } catch {} }, 30000);
}

let lastHash = '';

setInterval(() => {
    if (existsSync(CONTROL)) return;
    const raw = extractReadable();
    if (raw && raw.text !== lastHash) {
        lastHash = raw.text;
        let cleaned = cleanText(raw.text);
        if (cleaned.length > 200) cleaned = cleaned.slice(0, 200) + ' 内容较长，已截取。';
        if (!cleaned) return;
        console.log(`[${new Date().toLocaleTimeString()}] 朗读 (${cleaned.length} 字, 类型: ${raw.type})`);
        speak(cleaned, raw.type);
        try { writeFileSync(PENDING, '', 'utf8'); } catch {}
    }
}, POLL_INTERVAL);

process.stdin.resume();