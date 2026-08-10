#!/usr/bin/env node
// voice-reader.mjs — 朗读引擎（可分发版）
// 用法:
//   node src/voice-reader.mjs "文字内容"        朗读指定文字
//   node src/voice-reader.mjs                   读取 pending.txt
//   node src/voice-reader.mjs --stop            停止监听器
//   node src/voice-reader.mjs --pause           暂停监听器
//   node src/voice-reader.mjs --resume          恢复监听器
//   node src/voice-reader.mjs --status          查看状态

import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { BEEP, beepCmd, extractReadable, cleanText, SPEAK_RATE, SPEAK_VOLUME, SPEAK_VOICE, MAX_LENGTH, PENDING, CONTROL, PS_PATH, HOME, getStatus } from './lib.js';

function speak(text, type = 'info') {
    return new Promise((resolve) => {
        const safe = text.replace(/'/g, "''");
        const b = BEEP[type] || BEEP.info;
        const ps1File = join(tmpdir(), `voice-speak-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.ps1`);
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
        const proc = spawn(PS_PATH, ['-File', ps1File], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        let err = '';
        proc.stderr.on('data', (d) => err += d);
        proc.on('close', (code) => {
            try { unlinkSync(ps1File); } catch {}
            resolve({ success: code === 0, error: err.trim() });
        });
    });
}

async function main() {
    const arg = process.argv[2];

    // ── 控制命令 ──
    if (arg === '--stop') {
        try { writeFileSync(CONTROL, 'STOP', 'utf8'); } catch {}
        console.log('✓ 已发送停止信号，监听器将停止');
        return;
    }

    if (arg === '--pause') {
        try { writeFileSync(CONTROL, 'PAUSE', 'utf8'); } catch {}
        console.log('✓ 已发送暂停信号，监听器将暂停');
        return;
    }

    if (arg === '--resume') {
        try { writeFileSync(CONTROL, 'RESUME', 'utf8'); } catch {}
        console.log('✓ 已发送恢复信号，监听器将恢复');
        return;
    }

    if (arg === '--status') {
        const s = getStatus();
        console.log('Voice Reader 状态:');
        console.log(`  数据目录:  ${s.home}`);
        console.log(`  运行状态:  ${s.running}`);
        console.log(`  配置文件:  速率=${s.config.rate}, 音量=${s.config.volume}, 语音=${s.config.voice}`);
        console.log(`  待朗读文件: ${s.pending_exists ? s.pending_size + ' 字节' : '不存在'}`);
        return;
    }

    if (arg === '--help' || arg === '-h') {
        console.log(`Voice Reader — Windows TTS 语音朗读工具`);
        console.log('');
        console.log('用法:');
        console.log('  node src/voice-reader.mjs "文字内容"    朗读指定文字');
        console.log('  node src/voice-reader.mjs              读取 pending.txt 朗读');
        console.log('  node src/voice-reader.mjs --stop       停止监听器');
        console.log('  node src/voice-reader.mjs --pause      暂停监听器');
        console.log('  node src/voice-reader.mjs --resume     恢复监听器');
        console.log('  node src/voice-reader.mjs --status     查看运行状态');
        console.log('  node src/voice-reader.mjs --help       显示此帮助');
        console.log('');
        console.log('环境变量:');
        console.log('  VOICE_READER_HOME    数据目录（默认: %USERPROFILE%\\.voice-reader）');
        console.log('  VOICE_READER_RATE    朗读速率（-10 ~ 10，默认: 0）');
        console.log('  VOICE_READER_VOLUME  音量（0 ~ 100，默认: 100）');
        console.log('  VOICE_READER_VOICE   语音引擎名称');
        console.log('  VOICE_READER_POLL    轮询间隔（毫秒，默认: 2000）');
        console.log('  VOICE_READER_MAX_LEN 截断字数（默认: 200）');
        return;
    }

    // ── 朗读 ──
    let text = '', type = 'info';
    if (arg) {
        text = process.argv.slice(2).join(' ');
    } else {
        const raw = extractReadable();
        if (!raw) { console.log('没有待朗读内容'); return; }
        type = raw.type;
        text = raw.text;
    }

    text = cleanText(text);
    if (!text) { console.log('内容为空，跳过'); return; }
    if (text.length > MAX_LENGTH) text = text.slice(0, MAX_LENGTH) + ' 内容较长，已截取。';

    console.log(`准备朗读 (${text.length} 字, 类型: ${type})`);
    const result = await speak(text, type);
    if (result.success) {
        console.log('✓ 朗读完成');
    } else {
        console.log(`✗ 朗读失败: ${result.error}`);
        process.exit(1);
    }
}

main().catch(e => { console.error('运行时错误:', e.message); process.exit(1); });