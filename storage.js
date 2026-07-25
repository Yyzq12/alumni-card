'use strict';

import { STATIC_USERS_URL } from './lib/constants.js';
import { getDeviceId } from './lib/storage.js';
import { DOM, currentUserId, isCardDataValid, setCardData, setCardDataValid, setCurrentUserId } from './state.js';
import { showCard, showConfirm, showHome, showSkeleton, showToast, copyTextToClipboard, escapeHtml, escapeAttr } from './ui.js';

export { getDeviceId };

const DIRECTORY_CACHE_KEY = 'alumni_directory_cache_v1';
const LOCAL_STATE_KEY = 'alumni_static_state_v1';

let baseUsersPromise = null;

function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function createEmptyLocalState() {
    return { users: {}, deleted: [] };
}

function readLocalState() {
    try {
        const raw = localStorage.getItem(LOCAL_STATE_KEY);
        if (!raw) return createEmptyLocalState();
        const parsed = JSON.parse(raw);
        return {
            users: isObject(parsed.users) ? parsed.users : {},
            deleted: Array.isArray(parsed.deleted) ? parsed.deleted : []
        };
    } catch (e) {
        return createEmptyLocalState();
    }
}

function writeLocalState(state) {
    localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify({
        users: isObject(state.users) ? state.users : {},
        deleted: Array.isArray(state.deleted) ? Array.from(new Set(state.deleted)) : []
    }));
    clearCachedDirectory();
}

function clearCachedDirectory() {
    localStorage.removeItem(DIRECTORY_CACHE_KEY);
}

function readCachedDirectory() {
    const raw = localStorage.getItem(DIRECTORY_CACHE_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        return parsed;
    } catch (e) {
        return null;
    }
}

function writeCachedDirectory(list) {
    localStorage.setItem(DIRECTORY_CACHE_KEY, JSON.stringify(list));
}

async function loadBaseUsers() {
    if (!baseUsersPromise) {
        baseUsersPromise = (async () => {
            const resp = await fetch(STATIC_USERS_URL, { cache: 'no-store' });
            if (!resp.ok) {
                throw new Error(`加载静态校友数据失败：HTTP ${resp.status}`);
            }
            const data = await resp.json();
            if (!isObject(data)) {
                throw new Error('静态校友数据格式错误');
            }
            return data;
        })().catch((e) => {
            baseUsersPromise = null;
            throw e;
        });
    }
    return baseUsersPromise;
}

function normalizeUser(id, record = {}, fallbackCreatedAt = 0) {
    const createdAtValue = Number(record.createdAt);
    const createdAt = Number.isFinite(createdAtValue) ? createdAtValue : fallbackCreatedAt;
    const activated = record.activated !== undefined ? Boolean(record.activated) : false;
    return {
        id,
        cardId: record.cardId || '--------',
        name: record.name || '?',
        stuId: record.stuId || '--',
        department: record.department || '--',
        major: record.major || '--',
        gradYear: record.gradYear || '--',
        activated,
        deviceId: record.deviceId ?? null,
        createdAt,
        status: record.status || (activated ? 'active' : 'inactive')
    };
}

async function buildDirectory() {
    const baseUsers = await loadBaseUsers();
    const localState = readLocalState();
    const deleted = new Set(Array.isArray(localState.deleted) ? localState.deleted : []);
    const directory = new Map();

    let baseIndex = 0;
    for (const [id, record] of Object.entries(baseUsers)) {
        if (deleted.has(id)) continue;
        directory.set(id, normalizeUser(id, record, 1000000 + baseIndex));
        baseIndex += 1;
    }

    for (const [id, record] of Object.entries(localState.users || {})) {
        if (deleted.has(id)) continue;
        directory.set(id, normalizeUser(id, record, Number(record.createdAt) || Date.now()));
    }

    return directory;
}

async function getDirectoryList(forceRefresh = false) {
    if (!forceRefresh) {
        const cached = readCachedDirectory();
        if (cached) return cached;
    }

    const directory = await buildDirectory();
    const list = Array.from(directory.values()).sort((a, b) => {
        if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
        return a.id.localeCompare(b.id);
    });
    writeCachedDirectory(list);
    return list;
}

export async function getUserRecord(id) {
    if (!id) return null;
    const directory = await buildDirectory();
    return directory.get(id) || null;
}

export function saveUserRecord(id, record) {
    if (!id) throw new Error('缺少校友短 ID');
    const state = readLocalState();
    state.users[id] = normalizeUser(id, { ...record, id }, Number(record?.createdAt) || Date.now());
    state.deleted = (state.deleted || []).filter((item) => item !== id);
    writeLocalState(state);
}

export function deleteUserRecord(id) {
    if (!id) throw new Error('缺少校友短 ID');
    const state = readLocalState();
    if (state.users && state.users[id]) {
        delete state.users[id];
    }
    if (!state.deleted.includes(id)) {
        state.deleted.push(id);
    }
    writeLocalState(state);
}

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
        const userData = await getUserRecord(uid);
        if (!userData) {
            showToast('未找到该校友卡');
            return;
        }
        if (userData.activated) {
            if (userData.deviceId && userData.deviceId !== deviceId) {
                showToast('设备验证失败，该校友卡已在其他设备绑定');
                return;
            }
            showCard();
            return;
        }
        const ok = await showConfirm('点击"确定"后，此校友卡将与当前设备绑定，他人将无法使用，是否确认绑定。', '欢迎使用校友卡');
        if (ok) {
            const nextUserData = {
                ...userData,
                activated: true,
                deviceId
            };
            saveUserRecord(uid, nextUserData);
            setCardData(nextUserData);
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
        const userData = await getUserRecord(currentUserId);
        if (userData) {
            const nextUserData = {
                ...userData,
                activated: false,
                deviceId: null
            };
            saveUserRecord(currentUserId, nextUserData);
            setCardData(nextUserData);
            setCardDataValid(true);
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
        const userData = await getUserRecord(id);
        if (userData) {
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

export async function loadAlumniTable(forceRefresh = false) {
    // 管理面板中的校友表格。
    // 这里同时负责：
    // - 读取数据
    // - 排序
    // - 缓存
    // - 渲染 HTML
    if (!DOM.alumniTableContainer || !DOM.alumniHeader) return;
    try {
        const alumniList = await getDirectoryList(forceRefresh);
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
            // 否则只要数据源里有恶意字符串，就可能在页面里执行 HTML/JS。
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
        const userData = await getUserRecord(id);
        if (userData) {
            name = userData.name || id;
        }
    } catch (e) {
        // ignore lookup errors
    }

    const confirmed = await showConfirm(`确认删除校友 “${name}” 吗？`, '警告');
    if (!confirmed) return;

    try {
        deleteUserRecord(id);
        showToast(`已从本地目录移除校友 ${name}`);
        await loadAlumniTable(true);
    } catch (e) {
        showToast(`删除失败：${e.message}`);
    }
}
