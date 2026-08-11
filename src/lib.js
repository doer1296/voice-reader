// lib.js — Voice Reader 公共模块
// 导出: BEEP, beepCmd, extractReadable, cleanText, SPEAK_RATE

import { readFileSync, existsSync } from 'fs';

export const PENDING = 'C:\\Users\\15390\\.trae-cn\\work\\.voice-reader\\pending.txt';
export const CONTROL = 'C:\\Users\\15390\\.trae-cn\\work\\.voice-reader\\stop.flag';
export const PS_PATH = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
export const SPEAK_RATE = 0;
export const POLL_INTERVAL = 2000;

export const BEEP = {
    info:    { start: '800,120;80;1200,120;150',         end: '600,120' },
    success: { start: '600,100;80;800,100;80;1200,120;150', end: '1200,80;60;600,80' },
    error:   { start: '1000,150;80;600,150;80;400,150;200', end: '300,120' },
    warning: { start: '800,200;100;500,200;150',         end: '400,120' }
};

export function beepCmd(pattern) {
    return pattern.split(';').map(p => {
        p = p.trim();
        if (p.includes(',')) {
            const [freq, ms] = p.split(',');
            return `[System.Console]::Beep(${freq}, ${ms})`;
        }
        const ms = parseInt(p);
        if (!isNaN(ms)) return `Start-Sleep -Milliseconds ${ms}`;
        return '';
    }).filter(Boolean).join('\n');
}

export function extractReadable() {
    if (!existsSync(PENDING)) return null;
    const raw = readFileSync(PENDING, 'utf-8');
    if (raw.length === 0) return null;
    const m = raw.match(/\[VOICE_READER_START(?::(\w+))?\]\s*([\s\S]*?)\s*\[VOICE_READER_END\]/);
    if (!m) return null;
    return { type: m[1] || 'info', text: m[2].trim() };
}

export function cleanText(text) {
    return text
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/^#+\s*/gm, '')
        .replace(/\[[^\]]+\]\([^)]+\)/g, '')
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/^[[:space:]]*[-*+]\s+/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\n{2,}/g, '\n')
        .trim();
}