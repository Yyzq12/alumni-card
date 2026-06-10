'use strict';

import { CONTROL_PASSWORD } from './lib/constants.js';
import { firstNames, lastNames, jcMajorDatabase, getChinesePinyinInitials } from './lib/catalog.js';
import { DOM, bindAdminDomRefs, clearAdminDomRefs, reactiveConfig, setCardData, setCardDataValid, setCurrentUserId } from './state.js';
import { showHome, triggerManualRefresh, showToast, showConfirm } from './ui.js';
import { redis, loadAlumniTable, resetDeviceLock as resetDeviceLockFromStorage, tryNavigateToCard, copyAlumniLink, deleteAlumniById } from './storage.js';
import { copyTextToClipboard } from './ui.js';

const ADMIN_PANEL_HTML = `
    <div class="admin-panel admin-panel--open" id="adminPanel">
        <div class="admin-panel-header">
            <h3 class="admin-title">荆楚理工学院控制台</h3>
        </div>
        <div class="disclaimer">⚠️ 免责提示：本项目仅供技术交流与娱乐演示，严禁用于非法用途。</div>
        <div class="form-group"><label>右上角卡号</label><input type="text" id="i-cardId" value="JCCUT20160892"></div>
        <div class="form-group"><label>姓名</label><input type="text" id="i-name" value="唐海林"></div>
        <div class="form-group"><label>学号</label><input type="text" id="i-stuId" value="2016211020208" inputmode="numeric"></div>
        <div class="form-group"><label>院系</label><input type="text" id="i-department" value="经济与管理学院"></div>
        <div class="form-group"><label>专业</label><input type="text" id="i-major" value="财务管理"></div>
        <div class="form-group"><label>毕业年份</label><input type="text" id="i-gradYear" value="2020" inputmode="numeric"></div>
        <div class="admin-panel-tools">
            <button class="random-badge-btn-block admin-action-btn--alt" data-action="randomize">🎲 随机专业与学号(2016-2020)</button>
            <button class="panel-btn admin-action-btn admin-action-btn--success" data-action="generate-link">🚀 生成并复制链接</button>
            <button class="panel-btn admin-action-btn admin-action-btn--warning" data-action="reset-device-lock">🔓 重置设备锁</button>
            <button class="panel-btn admin-action-btn admin-action-btn--neutral" data-action="close-panel">关闭控制台</button>
        </div>

        <div id="alumni-header" class="alumni-header">加载中...</div>
        <div id="alumni-table-container" class="alumni-table-shell"></div>
    </div>
`;

function random() {
    // 随机生成一组“看起来像真的”测试数据。
    // 这个功能主要是为了快速演示，方便用户不用手工填每个字段。
    const year = Math.floor(Math.random() * 5) + 2016;
    const major = jcMajorDatabase[Math.floor(Math.random() * jcMajorDatabase.length)];
    const sid = `${year}${major.code}${String(Math.floor(Math.random() * 3) + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 40) + 1).padStart(2, '0')}`;
    const randomName = firstNames[Math.floor(Math.random() * firstNames.length)] + lastNames[Math.floor(Math.random() * lastNames.length)];

    if (DOM.iStuId) DOM.iStuId.value = sid;
    if (DOM.iName) DOM.iName.value = randomName;
    if (DOM.iDepartment) DOM.iDepartment.value = major.dept;
    if (DOM.iMajor) DOM.iMajor.value = major.major;
    if (DOM.iGradYear) DOM.iGradYear.value = year + 4;
    if (DOM.iCardId) {
        const randomNum = Math.floor(Math.random() * 900) + 100;
        DOM.iCardId.value = `JCUT1${year}00${randomNum}`;
    }
}

export { random };

function bindConsoleEvents() {
    if (!DOM.iName) return;
    DOM.iCardId.addEventListener('input', (event) => { reactiveConfig.cardId = event.target.value; });
    DOM.iName.addEventListener('input', (event) => { reactiveConfig.name = event.target.value; });
    DOM.iStuId.addEventListener('input', (event) => { reactiveConfig.stuId = event.target.value; });
    DOM.iDepartment.addEventListener('input', (event) => { reactiveConfig.department = event.target.value; });
    DOM.iMajor.addEventListener('input', (event) => { reactiveConfig.major = event.target.value; });
    DOM.iGradYear.addEventListener('input', (event) => { reactiveConfig.gradYear = event.target.value; });
}

export function closePanel() {
    if (DOM.adminPanel) DOM.adminPanel.remove();
    clearAdminDomRefs();
}

export async function generate() {
    const cardId = DOM.iCardId?.value.trim() || '';
    const name = DOM.iName?.value.trim() || '';
    const stuId = DOM.iStuId?.value.trim() || '';
    const department = DOM.iDepartment?.value.trim() || '';
    const major = DOM.iMajor?.value.trim() || '';
    const gradYear = DOM.iGradYear?.value.trim() || '';

    if (!name || !stuId) {
        showToast('姓名和学号不能为空');
        return;
    }

    const shortId = getChinesePinyinInitials(name) + stuId.slice(-2);
    const fullUrl = `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}?id=${shortId}`;
    const copied = await copyTextToClipboard(fullUrl);

    if (copied) {
        showToast('链接已复制到剪贴板，正在后台保存...');
    } else {
        await showConfirm('自动复制失败，请手动复制下方链接', fullUrl);
    }

    (async () => {
        try {
            const exists = await redis('EXISTS', `user:${shortId}`);
            if (exists === 1) {
                showToast(`短ID "${shortId}" 已存在，链接已复制但无法重复保存`);
                return;
            }
            await redis('SET', `user:${shortId}`, JSON.stringify({
                cardId,
                name,
                stuId,
                department,
                major,
                gradYear,
                activated: false,
                deviceId: null,
                createdAt: Date.now()
            }));
            await redis('SADD', 'alumni:index', shortId);
            setCurrentUserId(shortId);
            setCardDataValid(true);
            setCardData({ cardId, name, stuId, department, major, gradYear });
            showToast(`生成成功！短ID：${shortId}`);
            await loadAlumniTable(true);
        } catch (e) {
            showToast(`云端保存失败：${e.message}`);
        }
    })();
}

export async function handleAdminGesture(event) {
    if (event.touches.length !== 3) return;
    if (document.getElementById('adminPanel')) return;

    const pwd = prompt('🔐 请输入控制台密码：');
    if (pwd === CONTROL_PASSWORD) {
        document.body.insertAdjacentHTML('beforeend', ADMIN_PANEL_HTML);
        bindAdminDomRefs();
        bindConsoleEvents();
        await loadAlumniTable();
    } else if (pwd !== null) {
        showToast('密码错误');
    }
}

export async function handleActionClick(event) {
    const trigger = event.target.closest('[data-action]');
    if (!trigger) return;

    const action = trigger.dataset.action;
    switch (action) {
        case 'show-home':
            showHome();
            break;
        case 'open-card':
            void tryNavigateToCard();
            break;
        case 'manual-refresh':
            triggerManualRefresh();
            break;
        case 'randomize':
            random();
            break;
        case 'generate-link':
            void generate();
            break;
        case 'reset-device-lock':
            void (async () => {
                await resetDeviceLockFromStorage();
                closePanel();
            })();
            break;
        case 'close-panel':
            closePanel();
            break;
        case 'copy-link':
            void copyAlumniLink(trigger.dataset.id);
            break;
        case 'delete-link':
            void deleteAlumniById(trigger.dataset.id);
            break;
        default:
            break;
    }
}
