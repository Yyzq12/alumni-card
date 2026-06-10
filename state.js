'use strict';

// 这个文件只放“状态”，不要把请求、弹窗、样式等逻辑混进来。
// 维护时可以把它理解成三类东西：
// - DOM: 页面上有哪些元素
// - data: 当前显示什么内容
// - flags: 当前处于什么状态
export const DOM = {
    pageHome: null,
    pageCard: null,
    navTitle: null,
    navBackBtn: null,
    vCardId: null,
    vName: null,
    vStuId: null,
    vDepartment: null,
    vMajor: null,
    vGradYear: null,
    liveClockBar: null,
    iCardId: null,
    iName: null,
    iStuId: null,
    iDepartment: null,
    iMajor: null,
    iGradYear: null,
    adminPanel: null,
    alumniHeader: null,
    alumniTableContainer: null
};

export let currentUserId = '';
export let isCardDataValid = false;

// rawConfig 是当前页面显示数据的“原始真值”。
// 所有展示层最终都应该从这里来，避免每个函数都自己维护一份副本。
export const rawConfig = {
    cardId: '--------',
    name: '--',
    stuId: '--',
    department: '--',
    major: '--',
    gradYear: '--'
};

export function updateUI() {
    // 把状态同步到页面上。
    // 这一步只做“写界面”，不做业务判断。
    if (DOM.vCardId) DOM.vCardId.innerText = rawConfig.cardId;
    if (DOM.vName) DOM.vName.innerText = rawConfig.name;
    if (DOM.vStuId) DOM.vStuId.innerText = rawConfig.stuId;
    if (DOM.vDepartment) DOM.vDepartment.innerText = rawConfig.department;
    if (DOM.vMajor) DOM.vMajor.innerText = rawConfig.major;
    if (DOM.vGradYear) DOM.vGradYear.innerText = rawConfig.gradYear;

    if (DOM.iCardId) {
        DOM.iCardId.value = rawConfig.cardId === '--------' ? '' : rawConfig.cardId;
        DOM.iName.value = rawConfig.name === '--' ? '' : rawConfig.name;
        DOM.iStuId.value = rawConfig.stuId === '--' ? '' : rawConfig.stuId;
        DOM.iDepartment.value = rawConfig.department === '--' ? '' : rawConfig.department;
        DOM.iMajor.value = rawConfig.major === '--' ? '' : rawConfig.major;
        DOM.iGradYear.value = rawConfig.gradYear === '--' ? '' : rawConfig.gradYear;
    }
}

// 用 Proxy 包一层后，只要 reactiveConfig.xxx 被改了，
// 就会自动调用 updateUI()。
// 这能减少很多“改了数据忘记刷新界面”的问题。
export const reactiveConfig = new Proxy(rawConfig, {
    set(target, prop, value) {
        target[prop] = value;
        updateUI();
        return true;
    }
});

export function initDomRefs() {
    // 页面固定元素只需要在启动时查一次。
    // 这样后续逻辑直接用 DOM.xxx 即可，不用重复 document.getElementById。
    DOM.pageHome = document.getElementById('page-home');
    DOM.pageCard = document.getElementById('page-card');
    DOM.navTitle = document.getElementById('nav-title');
    DOM.navBackBtn = document.getElementById('nav-back-btn');
    DOM.vCardId = document.getElementById('v-cardId');
    DOM.vName = document.getElementById('v-name');
    DOM.vStuId = document.getElementById('v-stuId');
    DOM.vDepartment = document.getElementById('v-department');
    DOM.vMajor = document.getElementById('v-major');
    DOM.vGradYear = document.getElementById('v-gradYear');
    DOM.liveClockBar = document.getElementById('live-clock-bar');
    updateUI();
    return DOM;
}

export function bindAdminDomRefs() {
    // 管理面板是运行时动态插入的，所以打开控制台后必须重新抓取引用。
    DOM.adminPanel = document.getElementById('adminPanel');
    DOM.iCardId = document.getElementById('i-cardId');
    DOM.iName = document.getElementById('i-name');
    DOM.iStuId = document.getElementById('i-stuId');
    DOM.iDepartment = document.getElementById('i-department');
    DOM.iMajor = document.getElementById('i-major');
    DOM.iGradYear = document.getElementById('i-gradYear');
    DOM.alumniHeader = document.getElementById('alumni-header');
    DOM.alumniTableContainer = document.getElementById('alumni-table-container');
    updateUI();
    return DOM;
}

export function clearAdminDomRefs() {
    // 关闭控制台时清空引用，避免后续误用已经被移除的节点。
    DOM.adminPanel = null;
    DOM.iCardId = null;
    DOM.iName = null;
    DOM.iStuId = null;
    DOM.iDepartment = null;
    DOM.iMajor = null;
    DOM.iGradYear = null;
    DOM.alumniHeader = null;
    DOM.alumniTableContainer = null;
}

export function setCurrentUserId(id) {
    // 统一入口，方便以后加日志或额外联动逻辑。
    currentUserId = id || '';
}

export function setCardDataValid(valid) {
    // 强制转成布尔值，避免字符串/数字混进来。
    isCardDataValid = Boolean(valid);
}

export function setCardData(userData = null) {
    // 把外部数据规范化成界面需要的默认结构。
    // 即使字段缺失，页面也不会因为 undefined 而渲染异常。
    reactiveConfig.cardId = userData?.cardId || '--------';
    reactiveConfig.name = userData?.name || '--';
    reactiveConfig.stuId = userData?.stuId || '--';
    reactiveConfig.department = userData?.department || '--';
    reactiveConfig.major = userData?.major || '--';
    reactiveConfig.gradYear = userData?.gradYear || '--';
}
