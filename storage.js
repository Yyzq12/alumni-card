'use strict';

import { DOM, currentUserId, isCardDataValid, setCardData, setCardDataValid, setCurrentUserId } from './state.js';
import { showCard, showConfirm, showHome, showSkeleton, showToast, copyTextToClipboard, escapeHtml, escapeAttr } from './ui.js';
import { redis, getCanvasFingerprint, getDeviceId } from './lib/storage.js';

// 数据层逻辑集中在这里：
// - 从 URL 加载当前校友卡
// - 处理设备锁
// - 读写 Redis
// - 拉取、缓存、删除管理员列表
//
// 这样 UI 层和数据层就不会互相缠绕得太厉害。
export { redis, getCanvasFingerprint, getDeviceId };

const ALUMNI_CACHE_KEY = 'alumni_list_cache';
const CACHE_TTL = 5 * 60 * 1000;

export async function tryNavigateToCard() {
    // 点击首页热点后进入这里。
    // 先判断当前 URL 对应的校友数据有没有成功加载，再决定是否继续。
    if (!isCardDataValid) {
        showToast('暂未识别到您的校友信息，请确认卡片已录入');
        return;
    }
    const uid = currentUserId;
    const deviceId = await getDeviceId();
    try {
        const raw = await redis('GET', `user:${uid}`);
        if (!raw) {
            showToast('未找到该校友卡');
            return;
        }
        const userData = JSON.parse(raw);
        if (userData.activated) {
            if (userData.deviceId !== deviceId) {
                showToast('设备验证失败，该校友卡已在其他设备绑定');
                return;
            }
            showCard();
            return;
        }
        const ok = await showConfirm('点击"确定"后，此校友卡将与当前设备绑定，他人将无法使用，是否确认绑定。', '欢迎使用校友卡');
        if (ok) {
            userData.activated = true;
            userData.deviceId = deviceId;
            await redis('SET', `user:${uid}`, JSON.stringify(userData));
            showCard();
        }
    } catch (e) {
        showToast('网络异常，请刷新重试');
    }
}

export async function resetDeviceLock() {
    // 管理员在控制台里点击“重置设备锁”时会走这里。
    // 重置后，记录回到未绑定状态，下次访问要重新激活。
    if (!currentUserId) {
        showToast('未检测到当前校友信息');
        return;
    }
    try {
        const raw = await redis('GET', `user:${currentUserId}`);
        if (raw) {
            const userData = JSON.parse(raw);
            userData.activated = false;
            userData.deviceId = null;
            await redis('SET', `user:${currentUserId}`, JSON.stringify(userData));
            showToast(`已解除 ${currentUserId} 的设备锁`);
        }
    } catch (e) {
        showToast('重置失败');
    }
    showHome();
}

export async function load() {
    // 页面启动时根据 ?id=xxx 读取对应数据。
    // 这是整个“打开链接直接看到某个人校友卡”的核心入口。
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;
    setCurrentUserId(id);
    showSkeleton(true);
    try {
        const raw = await redis('GET', `user:${id}`);
        if (raw) {
            const userData = JSON.parse(raw);
            setCardData(userData);
            setCardDataValid(true);
        } else {
            setCardData(null);
            setCardDataValid(false);
        }
    } catch (e) {
        console.error(e);
        setCardData(null);
        setCardDataValid(false);
    } finally {
        showSkeleton(false);
    }
}

function getCachedAlumniList() {
    // localStorage 里的列表只是缓存，不是主数据。
    // 过期就重新向 Redis 拉，避免后台数据变更后前台还显示旧内容。
    const cached = localStorage.getItem(ALUMNI_CACHE_KEY);
    if (!cached) return null;
    try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
            return Array.isArray(data) ? data : null;
        }
    } catch (e) {
        // ignore malformed cache
    }
    return null;
}

function saveCachedAlumniList(data) {
    // 统一缓存写入格式，方便以后调试和扩展。
    localStorage.setItem(ALUMNI_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
}

export async function loadAlumniTable(forceRefresh = false) {
    // 管理面板中的校友表格。
    // 这里同时负责：
    // - 读取数据
    // - 排序
    // - 缓存
    // - 渲染 HTML
    if (!DOM.alumniTableContainer || !DOM.alumniHeader) return;
    try {
        let alumniList = null;
        if (!forceRefresh) {
            alumniList = getCachedAlumniList();
        }

        if (!alumniList) {
            // 先走索引集合 alumni:index。
            // 如果老数据还没建索引，再回退到 KEYS 做兼容。
            let ids = await redis('SMEMBERS', 'alumni:index');
            if (!ids || ids.length === 0) {
                const allKeys = await redis('KEYS', 'user:*');
                ids = (allKeys || []).map((key) => key.replace('user:', ''));
            }

            if (!ids || ids.length === 0) {
                DOM.alumniHeader.textContent = '共 0 位校友';
                DOM.alumniTableContainer.innerHTML = '<div class="alumni-empty">暂无校友数据</div>';
                return;
            }

            const batchSize = 50;
            const list = [];
            for (let i = 0; i < ids.length; i += batchSize) {
                // 批量分片读取，避免一次性请求过大。
                const batchIds = ids.slice(i, i + batchSize);
                const userKeys = batchIds.map((id) => `user:${id}`);
                const vals = await redis('MGET', ...userKeys);
                for (let j = 0; j < batchIds.length; j += 1) {
                    const user = JSON.parse(vals[j] || '{}');
                    list.push({
                        id: batchIds[j],
                        name: user.name || '?',
                        major: user.major || '—',
                        activated: user.activated || false,
                        createdAt: user.createdAt || 0
                    });
                }
            }
            alumniList = list.sort((a, b) => b.createdAt - a.createdAt);
            saveCachedAlumniList(alumniList);
        } else {
            alumniList.sort((a, b) => b.createdAt - a.createdAt);
        }

        DOM.alumniHeader.textContent = `共 ${alumniList.length} 位校友`;
        if (alumniList.length === 0) {
            DOM.alumniTableContainer.innerHTML = '<div class="alumni-empty">暂无校友数据</div>';
            return;
        }

        let html = `<table class="alumni-table">
            <thead>
                <tr>
                    <th class="col-status">状态</th>
                    <th class="col-name">姓名</th>
                    <th class="col-id">短ID</th>
                    <th class="col-major">专业</th>
                    <th class="col-copy">复制</th>
                    <th class="col-delete">删除</th>
                </tr>
            </thead>
            <tbody>`;

        for (const item of alumniList) {
            // 注意：这里所有可变文本都必须转义。
            // 否则只要 Redis 中有恶意字符串，就可能在页面里执行 HTML/JS。
            const statusIcon = item.activated ? '🟢' : '🔴';
            let displayName = item.name || '?';
            if (displayName.length === 2) displayName = `${displayName[0]}　${displayName[1]}`;
            html += `<tr>
                <td>${statusIcon}</td>
                <td>${escapeHtml(displayName)}</td>
                <td class="mono">${escapeHtml(item.id)}</td>
                <td>${escapeHtml(item.major)}</td>
                <td>
                    <button data-action="copy-link" data-id="${escapeAttr(item.id)}" class="action-btn action-btn--copy">复制</button>
                </td>
                <td>
                    <button data-action="delete-link" data-id="${escapeAttr(item.id)}" class="action-btn action-btn--delete">删除</button>
                </td>
            </tr>`;
        }
        html += `</tbody></table>`;
        DOM.alumniTableContainer.innerHTML = html;
    } catch (e) {
        console.error('加载校友表格失败', e);
        DOM.alumniHeader.textContent = '加载失败';
        DOM.alumniTableContainer.innerHTML = `<div class="alumni-error">错误：${e.message}</div>`;
    }
}

export async function copyAlumniLink(id) {
    // 表格里的“复制”按钮，复制的是某位校友的公开访问链接。
    const link = `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}?id=${id}`;
    try {
        const success = await copyTextToClipboard(link);
        if (success) {
            showToast('链接已复制到剪贴板');
        } else {
            await showConfirm('复制失败，请手动复制链接', link);
        }
    } catch (e) {
        await showConfirm('复制失败，请手动复制链接', link);
    }
}

export async function deleteAlumniById(id) {
    // 删除前先查询名字，弹窗提示会更友好，也更不容易误删。
    let name = id;
    try {
        const raw = await redis('GET', `user:${id}`);
        if (raw) {
            const userData = JSON.parse(raw);
            name = userData.name || id;
        }
    } catch (e) {
        // ignore lookup errors
    }

    const confirmed = await showConfirm(`确认删除校友 “${name}” 吗？`, '警告');
    if (!confirmed) return;

    try {
        // 删除主记录之后，别忘了同步移除索引集合。
        // 否则列表会留下“空引用”。
        await redis('DEL', `user:${id}`);
        await redis('SREM', 'alumni:index', id);
        localStorage.removeItem(ALUMNI_CACHE_KEY);
        showToast(`已删除校友 ${name}`);
        await loadAlumniTable(true);
    } catch (e) {
        showToast(`删除失败：${e.message}`);
    }
}
