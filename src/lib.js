// lib.js — Voice Reader 公共模块（可分发版）
// 所有路径通过环境变量 VOICE_READER_HOME 配置，不再硬编码
// 导出: BEEP, beepCmd, extractReadable, cleanText, SPEAK_RATE, POLL_INTERVAL, MAX_LENGTH, PENDING, CONTROL, PS_PATH

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { resolve, join } from 'path';

// ─── 路径检测 ────────────────────────────────────────────────────────────────
// 优先级：环境变量 VOICE_READER_HOME > 当前目录下的 .voice-reader > %USERPROFILE%\.voice-reader
function detectHome() {
    if (process.env.VOICE_READER_HOME) {
        return process.env.VOICE_READER_HOME;
    }
    // 尝试从当前工作目录检测
    const cwdHome = join(process.cwd(), '.voice-reader');
    if (existsSync(cwdHome)) return cwdHome;
    // 默认 fallback：用户目录
    return join(homedir(), '.voice-reader');
}

export const HOME = detectHome();
export const PENDING = join(HOME, 'pending.txt');
export const CONTROL = join(HOME, 'stop.flag');
export const CONFIG_PATH = join(HOME, 'config.json');
export const PS_PATH = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';

// ─── 配置加载 ─────────────────────────────────────────────────────────────────
function loadConfig() {
    const defaults = { rate: 0, volume: 100, voice: 'Microsoft Huihui', poll_interval: 2000, max_length: 200 };
    try {
        if (existsSync(CONFIG_PATH)) {
            const raw = readFileSync(CONFIG_PATH, 'utf-8');
            const user = JSON.parse(raw);
            return { ...defaults, ...user };
        }
    } catch { /* 忽略配置错误，回退默认值 */ }
    return defaults;
}

const cfg = loadConfig();

// 环境变量优先于配置文件
export const SPEAK_RATE = parseInt(process.env.VOICE_READER_RATE, 10) || cfg.rate;
export const SPEAK_VOLUME = parseInt(process.env.VOICE_READER_VOLUME, 10) || cfg.volume;
export const SPEAK_VOICE = process.env.VOICE_READER_VOICE || cfg.voice;
export const POLL_INTERVAL = parseInt(process.env.VOICE_READER_POLL, 10) || cfg.poll_interval;
export const MAX_LENGTH = parseInt(process.env.VOICE_READER_MAX_LEN, 10) || cfg.max_length;

// ─── 提示音定义 ───────────────────────────────────────────────────────────────
// 格式: "频率,时长;间隔;频率,时长;间隔;..."
export const BEEP = {
    info:    { start: '800,120;80;1200,120;150',                           end: '600,120' },
    success: { start: '600,100;80;800,100;80;1200,120;150',               end: '1200,80;60;600,80' },
    error:   { start: '1000,150;80;600,150;80;400,150;200',               end: '300,120' },
    warning: { start: '800,200;100;500,200;150',                          end: '400,120' }
};

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/**
 * 将提示音模式字符串转换为 PowerShell Beep 命令
 * @param {string} pattern - 格式: "频率,时长;间隔;频率,时长"
 * @returns {string} PowerShell 命令字符串
 */
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

/**
 * 从 pending.txt 中提取可朗读内容
 * @returns {{ type: string, text: string } | null}
 */
export function extractReadable() {
    if (!existsSync(PENDING)) return null;
    try {
        const raw = readFileSync(PENDING, 'utf-8');
        if (raw.length === 0) return null;
        const m = raw.match(/\[VOICE_READER_START(?::(\w+))?\]\s*([\s\S]*?)\s*\[VOICE_READER_END\]/);
        if (!m) return null;
        return { type: m[1] || 'info', text: m[2].trim() };
    } catch {
        return null;
    }
}

/**
 * 清洗文本：去除 Markdown 标记，返回纯文本
 * @param {string} text - 原始文本
 * @returns {string} 清洗后的纯文本
 */
export function cleanText(text) {
    if (!text) return '';
    return text
        // 代码块
        .replace(/```[\s\S]*?```/g, '')
        // 行内代码
        .replace(/`([^`]+)`/g, '$1')
        // 加粗 / 斜体
        .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        // 标题
        .replace(/^#{1,6}\s+/gm, '')
        // 链接 [text](url) → text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // 图片 ![alt](url)
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        // URL
        .replace(/https?:\/\/[^\s]+/g, '')
        // 引用块
        .replace(/^>\s+/gm, '')
        // 列表标记
        .replace(/^[\s]*[-*+]\s+/gm, '')
        .replace(/^[\s]*\d+\.\s+/gm, '')
        // 任务列表
        .replace(/^[\s]*[-*+]\s+\[[ x]\]\s*/gm, '')
        // 表格分隔行
        .replace(/^\|[\s:-]+\|$/gm, '')
        // 表格行 → 用空格连接单元格
        .replace(/^\|(.+)\|$/gm, '$1')
        .replace(/\|/g, ' ')
        // 合并多余空行
        .replace(/\n{3,}/g, '\n\n')
        // 多余空格
        .replace(/[ \t]+/g, ' ')
        .trim();
}

/**
 * 获取 Voice Reader 系统状态信息
 * @returns {object} 状态信息
 */
export function getStatus() {
    return {
        home: HOME,
        running: existsSync(CONTROL) ? 'stopped' : 'running',
        config: cfg,
        pending_exists: existsSync(PENDING),
        pending_size: existsSync(PENDING) ? readFileSync(PENDING, 'utf-8').length : 0
    };
}