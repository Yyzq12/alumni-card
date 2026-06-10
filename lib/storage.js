import { UPSTASH_TOKEN, UPSTASH_URL } from './constants.js';

export async function redis(command, ...args) {
    // 最薄的一层 Redis HTTP 包装。
    // 统一负责拼 URL、带鉴权、解析 JSON，让别的模块不用重复写这些模板代码。
    const url = `${UPSTASH_URL}/${command}/${args.join('/')}`;
    const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    if (!resp.ok) throw new Error(`Redis HTTP ${resp.status}`);
    const data = await resp.json();
    return data.result;
}

export async function getCanvasFingerprint() {
    // 用 canvas 的绘制结果生成设备指纹。
    // 这个指纹不是绝对稳定，但作为“同设备识别”已经够用了。
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '20px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(0, 0, 100, 100);
    ctx.fillStyle = '#069';
    ctx.fillText('荆楚理工学院', 20, 30);
    ctx.shadowBlur = 5;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.fillStyle = '#0ac';
    ctx.fillRect(120, 50, 80, 60);
    ctx.beginPath();
    ctx.arc(250, 80, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#c96';
    ctx.fill();
    const dataURL = canvas.toDataURL();
    const buffer = new TextEncoder().encode(dataURL);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

export async function getDeviceId() {
    // 设备 ID 的获取顺序：
    // 1. 先读本地缓存
    // 2. 没有就尝试生成 canvas 指纹
    // 3. 如果浏览器限制太多，再回退到随机 ID
    // 这样可以提高兼容性。
    const STORAGE_KEY = 'canvasFingerprint';
    const LEGACY_KEY = 'did';
    let fingerprint = localStorage.getItem(STORAGE_KEY);
    if (fingerprint && fingerprint.length >= 16) return fingerprint;
    try {
        fingerprint = await getCanvasFingerprint();
        if (fingerprint && fingerprint.length >= 16) {
            localStorage.setItem(STORAGE_KEY, fingerprint);
            localStorage.removeItem(LEGACY_KEY);
            return fingerprint;
        }
        throw new Error('Invalid fingerprint');
    } catch (e) {
        console.warn('Canvas指纹失败，回退随机ID', e);
        let legacyId = localStorage.getItem(LEGACY_KEY);
        if (!legacyId) {
            legacyId = 'D-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
            localStorage.setItem(LEGACY_KEY, legacyId);
        }
        return legacyId;
    }
}
