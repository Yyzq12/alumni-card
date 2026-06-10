import { initDomRefs } from './state.js';
import { bindStaticEvents, showHome, updateClock } from './ui.js';

'use strict';

// 入口只负责启动和按需转发，不承载具体业务。

let storageModulePromise;
let adminModulePromise;

function loadStorageModule() {
    // 数据层按需加载，避免首屏一次性拉太多代码。
    if (!storageModulePromise) {
        storageModulePromise = import('./storage.js');
    }
    return storageModulePromise;
}

function loadAdminModule() {
    // 管理模块只在真的需要时加载。
    if (!adminModulePromise) {
        adminModulePromise = import('./admin.js');
    }
    return adminModulePromise;
}

async function handleActionClick(event) {
    const trigger = event.target.closest('[data-action]');
    if (!trigger) return;

    const action = trigger.dataset.action;
    if (action === 'show-home') {
        showHome();
        return;
    }

    if (action === 'manual-refresh') {
        updateClock();
        return;
    }

    if (action === 'open-card') {
        const { tryNavigateToCard } = await loadStorageModule();
        await tryNavigateToCard();
        return;
    }

    if (action === 'copy-link' || action === 'delete-link' || action === 'reset-device-lock') {
        const storage = await loadStorageModule();
        if (action === 'copy-link') {
            await storage.copyAlumniLink?.(trigger.dataset.id);
        } else if (action === 'delete-link') {
            await storage.deleteAlumniById?.(trigger.dataset.id);
        } else if (action === 'reset-device-lock') {
            await storage.resetDeviceLock?.();
            adminModulePromise = adminModulePromise || import('./admin.js');
            const admin = await adminModulePromise;
            admin.closePanel?.();
        }
        return;
    }

    const admin = await loadAdminModule();
    switch (action) {
        case 'randomize':
            admin.random?.();
            break;
        case 'generate-link':
            void admin.generate();
            break;
        case 'close-panel':
            admin.closePanel?.();
            break;
        default:
            break;
    }
}

async function handleAdminGesture(event) {
    const admin = await loadAdminModule();
    await admin.handleAdminGesture(event);
}

async function boot() {
    initDomRefs();
    bindStaticEvents(handleActionClick, handleAdminGesture);
    showHome();

    const params = new URLSearchParams(window.location.search);
    if (params.get('id')) {
        const { load } = await loadStorageModule();
        void load();
    }

    updateClock();
    setInterval(updateClock, 1000);
}

void boot();
