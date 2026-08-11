#!/usr/bin/env node
// voice-reader.mjs — 朗读引擎（公共模块版）
// 用法: node voice-reader.mjs "文字内容"
//       node voice-reader.mjs            (读取 pending.txt)
//       node voice-reader.mjs --stop     (停止朗读)

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { BEEP, beepCmd, extractReadable, cleanText, SPEAK_RATE } from './lib.js';

const PS_PATH = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';

function speak(text, type = 'info') {
    return new Promise((resolve) => {
        const safe = text.replace(/'/g, "''");
        const b = BEEP[type] || BEEP.info;
        const ps1Path = `C:\\Users\\15390\\AppData\\Local\\Temp\\voice-speak-${Date.now()}.ps1`;
        const ps = `${beepCmd(b.start)}
$text = @'
${safe}
'@
$voice = New-Object -ComObject SAPI.SpVoice
$voice.Rate = ${SPEAK_RATE}
$voice.Speak($text)
${beepCmd(b.end)}`;

        writeFileSync(ps1Path, ps, 'utf8');
        const proc = spawn(PS_PATH, ['-File', ps1Path], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        let err = '';
        proc.stderr.on('data', (d) => err += d);
        proc.on('close', (code) => {
            try { unlinkSync(ps1Path); } catch {}
            resolve({ success: code === 0, error: err.trim() });
        });
    });
}

async function main() {
    if (process.argv[2] === '--stop') {
        try { writeFileSync('C:\\Users\\15390\\.trae-cn\\work\\.voice-reader\\stop.flag', 'STOP', 'utf8'); } catch {}
        console.log('已发送停止信号');
        return;
    }

    let text = '', type = 'info';
    if (process.argv[2]) {
        text = process.argv.slice(2).join(' ');
    } else {
        const raw = extractReadable();
        if (!raw) { console.log('没有待朗读内容'); return; }
        type = raw.type;
        text = raw.text;
    }

    text = cleanText(text);
    if (!text) { console.log('内容为空，跳过'); return; }
    if (text.length > 200) text = text.slice(0, 200) + ' 内容较长，已截取。';

    console.log(`准备朗读 (${text.length} 字, 类型: ${type})`);
    const result = await speak(text, type);
    if (result.success) { console.log('朗读完成'); }
    else { console.log(`朗读失败: ${result.error}`); }
}

main().catch(e => { console.error(e); process.exit(1); });