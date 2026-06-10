'use strict';

import { DOM } from './state.js';

// UI 层只负责展示，不负责数据来源。

export function showToast(message, duration = 2000) {
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

export function showConfirm(message, title = '提示') {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'custom-modal';

        const mask = document.createElement('div');
        mask.className = 'custom-modal-mask';

        const container = document.createElement('div');
        container.className = 'custom-modal-container';

        const header = document.createElement('div');
        header.className = 'custom-modal-header';
        header.textContent = title;

        const body = document.createElement('div');
        body.className = 'custom-modal-body';
        body.textContent = message;

        const footer = document.createElement('div');
        footer.className = 'custom-modal-footer';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'custom-modal-btn cancel';
        cancelBtn.type = 'button';
        cancelBtn.textContent = '取消';

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'custom-modal-btn confirm';
        confirmBtn.type = 'button';
        confirmBtn.textContent = '确定';

        footer.append(cancelBtn, confirmBtn);
        container.append(header, body, footer);
        modal.append(mask, container);
        document.body.appendChild(modal);

        const close = (result) => {
            modal.remove();
            resolve(result);
        };
        confirmBtn.onclick = () => close(true);
        cancelBtn.onclick = () => close(false);
        mask.onclick = () => close(false);
    });
}

export async function copyTextToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch (e) {
        // fallback below
    }

    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const success = document.execCommand('copy');
        document.body.removeChild(ta);
        return success;
    } catch (e) {
        return false;
    }
}

export function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, (m) => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

export function escapeAttr(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export function showSkeleton(show) {
    const skeletonElements = [DOM.vName, DOM.vStuId, DOM.vDepartment, DOM.vMajor, DOM.vGradYear];
    skeletonElements.forEach((el) => {
        if (!el) return;
        if (show) el.classList.add('skeleton');
        else el.classList.remove('skeleton');
    });
}

export function showCard() {
    if (DOM.pageHome) DOM.pageHome.style.display = 'none';
    if (DOM.pageCard) DOM.pageCard.style.display = 'flex';
    if (DOM.navTitle) DOM.navTitle.innerText = '校友卡';
    if (DOM.navBackBtn) DOM.navBackBtn.classList.remove('is-hidden');
}

export function showHome() {
    if (DOM.pageCard) DOM.pageCard.style.display = 'none';
    if (DOM.pageHome) DOM.pageHome.style.display = 'flex';
    if (DOM.navTitle) DOM.navTitle.innerText = '首页';
    if (DOM.navBackBtn) DOM.navBackBtn.classList.add('is-hidden');
}

export function updateClock() {
    const now = new Date();
    const beijing = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 28800000);
    const str = `${beijing.getFullYear()}年${String(beijing.getMonth() + 1).padStart(2, '0')}月${String(beijing.getDate()).padStart(2, '0')}日 ${String(beijing.getHours()).padStart(2, '0')}:${String(beijing.getMinutes()).padStart(2, '0')}:${String(beijing.getSeconds()).padStart(2, '0')}`;
    if (DOM.liveClockBar) DOM.liveClockBar.innerText = `当前时间：${str}`;
}

export function triggerManualRefresh() {
    const icon = document.querySelector('.refresh-icon');
    if (icon) {
        icon.classList.add('rotating');
        setTimeout(() => {
            icon.classList.remove('rotating');
        }, 500);
    }
    updateClock();
    const timerBar = document.querySelector('#live-clock-bar');
    if (timerBar) {
        timerBar.classList.add('live-timer-flash');
        setTimeout(() => {
            timerBar.classList.remove('live-timer-flash');
        }, 80);
    }
}

export function bindStaticEvents(onActionClick, onAdminGesture) {
    const gestureArea = document.getElementById('gestureArea');
    if (gestureArea && typeof onAdminGesture === 'function') {
        gestureArea.addEventListener('touchstart', onAdminGesture, { passive: true });
    }
    if (typeof onActionClick === 'function') {
        document.addEventListener('click', onActionClick);
    }
}
