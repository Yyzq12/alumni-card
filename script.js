/* ==========================================
   荆楚理工学院 移动校园 - 最终极致版（含响应式数据绑定）
   特性：Proxy 自动更新 UI、骨架屏、旋转动画、Canvas指纹、动态控制台
   ========================================== */

'use strict';

// ------------------- 1. DOM 节点缓存 -------------------
const DOM = {
    pageHome: document.getElementById('page-home'),
    pageCard: document.getElementById('page-card'),
    navTitle: document.getElementById('nav-title'),
    navBackBtn: document.getElementById('nav-back-btn'),
    vCardId: document.getElementById('v-cardId'),
    vName: document.getElementById('v-name'),
    vStuId: document.getElementById('v-stuId'),
    vDepartment: document.getElementById('v-department'),
    vMajor: document.getElementById('v-major'),
    vGradYear: document.getElementById('v-gradYear'),
    liveClockBar: document.getElementById('live-clock-bar'),
    // 控制台元素（动态注入后赋值）
    iCardId: null,
    iName: null,
    iStuId: null,
    iDepartment: null,
    iMajor: null,
    iGradYear: null,
    adminPanel: null
};

// ------------------- 2. 骨架屏控制 -------------------
function showSkeleton(show) {
    const skeletonElements = [DOM.vName, DOM.vStuId, DOM.vDepartment, DOM.vMajor, DOM.vGradYear];
    skeletonElements.forEach(el => {
        if (el) {
            if (show) el.classList.add('skeleton');
            else el.classList.remove('skeleton');
        }
    });
}

// ------------------- 3. 自定义弹窗 -------------------
function showToast(message, duration = 2000) {
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function showConfirm(message, title = '提示') {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'custom-modal';
        modal.innerHTML = `
            <div class="custom-modal-mask"></div>
            <div class="custom-modal-container">
                <div class="custom-modal-header">${title}</div>
                <div class="custom-modal-body">${message}</div>
                <div class="custom-modal-footer">
                    <button class="custom-modal-btn cancel">取消</button>
                    <button class="custom-modal-btn confirm">确定</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const confirmBtn = modal.querySelector('.confirm');
        const cancelBtn = modal.querySelector('.cancel');
        const mask = modal.querySelector('.custom-modal-mask');
        const close = (result) => {
            modal.remove();
            resolve(result);
        };
        confirmBtn.onclick = () => close(true);
        cancelBtn.onclick = () => close(false);
        mask.onclick = () => close(false);
    });
}

// ------------------- 4. 配置 & Redis -------------------
const CONTROL_PASSWORD = "5499";
const UPSTASH_URL = "https://becoming-trout-101437.upstash.io";
const UPSTASH_TOKEN = "gQAAAAAAAYw9AAIgcDE2ZjBmNDdkMTIyZTU0MzFlOGNhNTlkYzk1OWU1OTBjOA";

const ADMIN_PANEL_HTML = `
    <div class="admin-panel" id="adminPanel" style="display: block;">
        <div class="admin-panel-header">
            <h3 style="color:#C9262B; font-size:18px;">荆楚理工学院控制台</h3>
        </div>
        <div class="disclaimer">⚠️ 免责提示：本项目仅供技术交流与娱乐演示，严禁用于非法用途。</div>
        <div class="form-group"><label>右上角卡号</label><input type="text" id="i-cardId" value="JCCUT20160892"></div>
        <div class="form-group"><label>姓名</label><input type="text" id="i-name" value="唐海林"></div>
        <div class="form-group"><label>学号</label><input type="text" id="i-stuId" value="2016211020208" inputmode="numeric"></div>
        <div class="form-group"><label>院系</label><input type="text" id="i-department" value="经济与管理学院"></div>
        <div class="form-group"><label>专业</label><input type="text" id="i-major" value="财务管理"></div>
        <div class="form-group"><label>毕业年份</label><input type="text" id="i-gradYear" value="2020" inputmode="numeric"></div>
        <button class="random-badge-btn-block" onclick="window.random()">🎲 随机专业与学号(2016-2020)</button>
        <button class="panel-btn" style="background:#28a745;" onclick="window.generate()">🚀 生成并复制链接</button>
        <button class="panel-btn" style="background:#5bc0de;" onclick="window.list()">📋 查看所有校友</button>
        <button class="panel-btn" style="background:#d9534f;" onclick="window.del()">🗑️ 删除校友</button>
        <button class="panel-btn" style="background:#ff9f43;" onclick="window.resetDeviceLock()">🔓 重置设备锁</button>
        <button class="panel-btn" style="background:#444;" onclick="window.closePanel()">关闭控制台</button>
    </div>
`;

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500;

async function redis(command, ...args) {
    const now = Date.now();
    if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
        throw new Error('操作过于频繁，请稍后再试');
    }
    lastRequestTime = now;
    const url = `${UPSTASH_URL}/${command}/${args.join('/')}`;
    const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    if (!resp.ok) throw new Error(`Redis HTTP ${resp.status}`);
    const data = await resp.json();
    return data.result;
}

// ------------------- 5. 数据字典 -------------------
const jcMajorDatabase = [
    { dept: "经济与管理学院", major: "财务管理", code: "21102" },
    { dept: "经济与管理学院", major: "大数据与会计", code: "30502" },
    { dept: "医学部", major: "口腔医学", code: "21102" },
    { dept: "师范学院", major: "小学教育", code: "40850" },
    { dept: "新能源学院", major: "印刷工程", code: "2420101" },
    { dept: "食品与生物学院", major: "植物科学与技术", code: "2420703" },
    { dept: "食品与生物学院", major: "食品科学与工程", code: "2424407" },
    { dept: "数理学院", major: "数学与应用数学", code: "09500" },
    { dept: "艺术学院", major: "环境设计", code: "12050" },
    { dept: "外国语学院", major: "外国语言文学", code: "10500" }
];
const firstNames = ["张","李","王","刘","陈","杨","赵","黄","周","吴","徐","孙","马","胡","郭","林"];
const lastNames = ["逸飞","梦溪","泽宇","梓涵","听风","晓静","嘉杰","雨桐","博远","子墨","瑞霖","思源","楚菁","雪珂","寒潞"];

// ------------------- 6. 响应式数据（Proxy） -------------------
// 原始数据对象
const rawConfig = {
    cardId: "--------",
    name: "--",
    stuId: "--",
    department: "--",
    major: "--",
    gradYear: "--"
};

// 定义更新 UI 的函数（不依赖手动调用）
function updateUI() {
    if (DOM.vCardId) DOM.vCardId.innerText = rawConfig.cardId;
    if (DOM.vName) DOM.vName.innerText = rawConfig.name;
    if (DOM.vStuId) DOM.vStuId.innerText = rawConfig.stuId;
    if (DOM.vDepartment) DOM.vDepartment.innerText = rawConfig.department;
    if (DOM.vMajor) DOM.vMajor.innerText = rawConfig.major;
    if (DOM.vGradYear) DOM.vGradYear.innerText = rawConfig.gradYear;
    // 如果控制台已注入，同步表单
    if (DOM.iCardId) {
        DOM.iCardId.value = rawConfig.cardId === "--------" ? "" : rawConfig.cardId;
        DOM.iName.value = rawConfig.name === "--" ? "" : rawConfig.name;
        DOM.iStuId.value = rawConfig.stuId === "--" ? "" : rawConfig.stuId;
        DOM.iDepartment.value = rawConfig.department === "--" ? "" : rawConfig.department;
        DOM.iMajor.value = rawConfig.major === "--" ? "" : rawConfig.major;
        DOM.iGradYear.value = rawConfig.gradYear === "--" ? "" : rawConfig.gradYear;
    }
}

// 创建代理，拦截属性修改并自动刷新 UI
const reactiveConfig = new Proxy(rawConfig, {
    set(target, prop, value) {
        target[prop] = value;
        updateUI();  // 任何属性变化都自动重新渲染
        return true;
    }
});

// 批量更新时避免频繁触发 UI（例如 load 时一次设置多个字段）
function batchUpdate(callback) {
    // 暂时解除代理（直接修改 rawConfig），或者使用防抖，这里简单起见允许多次触发，性能影响不大
    callback();
    updateUI(); // 最后保证一次刷新
}

// ------------------- 7. 拼音首字母 -------------------
function getChinesePinyinInitials(str) {
    if (!str) return "user";
    const map = {
        '阿':'a','巴':'b','擦':'c','大':'d','俄':'e','发':'f','高':'g','哈':'h','贾':'j','卡':'k','拉':'l','马':'m',
        '拿':'n','欧':'o','潘':'p','钱':'q','任':'r','撒':'s','他':'t','王':'w','西':'x','压':'y','匝':'z',
        '陈':'c','胡':'h','林':'l','刘':'l','孙':'s','唐':'t','徐':'x','杨':'y','张':'z','赵':'z','周':'z',
        '吴':'w','郭':'g','黄':'h','罗':'l','龙':'l','孟':'m','米':'m','苗':'m','莫':'m','南':'n','宁':'n',
        '牛':'n','年':'n','彭':'p','皮':'p','朴':'p','平':'p','秦':'q','邱':'q','屈':'q','权':'q',
        '阮':'r','饶':'r','容':'r','荣':'r','宋':'s','苏':'s','沈':'s','石':'s','田':'t','佟':'t','涂':'t',
        '万':'w','魏':'w','文':'w','夏':'x','肖':'x','谢':'x','许':'x','叶':'y','于':'y','余':'y','易':'y',
        '郑':'z','朱':'z','左':'z'
    };
    let r = "";
    for (let ch of str) {
        if (/[a-zA-Z]/.test(ch)) r += ch.toLowerCase();
        else r += map[ch] || 'x';
    }
    return r || "uid";
}

// ------------------- 8. 设备锁（Canvas指纹） -------------------
async function getCanvasFingerprint() {
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
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function getDeviceId() {
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

// ------------------- 9. 页面导航 -------------------
function showCard() {
    if (DOM.pageHome) DOM.pageHome.style.display = 'none';
    if (DOM.pageCard) DOM.pageCard.style.display = 'flex';
    if (DOM.navTitle) DOM.navTitle.innerText = '校友卡';
    if (DOM.navBackBtn) DOM.navBackBtn.style.visibility = 'visible';
}
function showHome() {
    if (DOM.pageCard) DOM.pageCard.style.display = 'none';
    if (DOM.pageHome) DOM.pageHome.style.display = 'flex';
    if (DOM.navTitle) DOM.navTitle.innerText = '首页';
    if (DOM.navBackBtn) DOM.navBackBtn.style.visibility = 'hidden';
}

async function tryNavigateToCard() {
    if (!isCardDataValid) {
        showToast('暂未识别到您的校友信息。');
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
                showToast('设备验证失败，该校友卡已在其他设备激活绑定');
                return;
            }
            showCard();
            return;
        }
        const ok = await showConfirm('这是您首次在此设备上打开该链接点击"确定"后，此校友卡将与当前设备锁定绑定。', '欢迎使用校友卡');
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

async function resetDeviceLock() {
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
    closePanel();
}

// ------------------- 10. 加载链接数据（使用响应式） -------------------
let currentUserId = "";
let isCardDataValid = false;

async function load() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;
    currentUserId = id;
    showSkeleton(true); // 显示骨架屏
    try {
        const raw = await redis('GET', `user:${id}`);
        if (raw) {
            const u = JSON.parse(raw);
            // 批量更新数据（触发响应式，但会多次更新UI，性能可接受）
            reactiveConfig.cardId = u.cardId || "";
            reactiveConfig.name = u.name || "--";
            reactiveConfig.stuId = u.stuId || "--";
            reactiveConfig.department = u.department || "--";
            reactiveConfig.major = u.major || "--";
            reactiveConfig.gradYear = u.gradYear || "--";
            isCardDataValid = true;
        } else {
            isCardDataValid = false;
            // 清空占位数据
            reactiveConfig.cardId = "--------";
            reactiveConfig.name = "--";
            reactiveConfig.stuId = "--";
            reactiveConfig.department = "--";
            reactiveConfig.major = "--";
            reactiveConfig.gradYear = "--";
        }
    } catch (e) {
        console.error(e);
        isCardDataValid = false;
    } finally {
        showSkeleton(false); // 隐藏骨架屏
    }
}

// ------------------- 11. 控制台功能 -------------------
// 随机生成（直接操作控制台输入框，但为了响应式，应该修改 reactiveConfig？不，这里只填充表单，不改变当前显示的卡片）
function random() {
    const y = Math.floor(Math.random() * 5) + 2016;
    const m = jcMajorDatabase[Math.floor(Math.random() * jcMajorDatabase.length)];
    const sid = `${y}${m.code}${String(Math.floor(Math.random()*3)+1).padStart(2,'0')}${String(Math.floor(Math.random()*40)+1).padStart(2,'0')}`;
    const rname = firstNames[Math.floor(Math.random()*firstNames.length)] + lastNames[Math.floor(Math.random()*lastNames.length)];
    if (DOM.iStuId) DOM.iStuId.value = sid;
    if (DOM.iName) DOM.iName.value = rname;
    if (DOM.iDepartment) DOM.iDepartment.value = m.dept;
    if (DOM.iMajor) DOM.iMajor.value = m.major;
    if (DOM.iGradYear) DOM.iGradYear.value = y + 4;
    if (DOM.iCardId) DOM.iCardId.value = `JCCUT${y}0${Math.floor(Math.random() * 80) + 10}`;
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
        } catch {
            return false;
        }
    }
}

async function generate() {
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
    const copied = await copyToClipboard(fullUrl);
    if (copied) showToast('链接已复制到剪贴板');
    else await showConfirm('复制失败，请手动复制链接', fullUrl);
    
    try {
        const exists = await redis('EXISTS', `user:${shortId}`);
        if (exists === 1) {
            showToast(`短ID "${shortId}" 已存在，链接已复制但无法重复保存`);
            return;
        }
        await redis('SET', `user:${shortId}`, JSON.stringify({
            cardId, name, stuId, department, major, gradYear,
            activated: false, deviceId: null, createdAt: Date.now()
        }));
        await redis('SADD', 'alumni:index', shortId);
        // 更新当前显示的数据（响应式）
        reactiveConfig.cardId = cardId;
        reactiveConfig.name = name;
        reactiveConfig.stuId = stuId;
        reactiveConfig.department = department;
        reactiveConfig.major = major;
        reactiveConfig.gradYear = gradYear;
        currentUserId = shortId;
        isCardDataValid = true;
        showToast(`生成成功！短ID：${shortId}`);
    } catch (e) {
        showToast(`云端保存失败：${e.message}`);
    }
}

// 使用 SSCAN 迭代
async function getAllAlumniIds() {
    let cursor = '0';
    let ids = [];
    do {
        const [nextCursor, members] = await redis('SSCAN', 'alumni:index', cursor, 'COUNT', 100);
        ids.push(...members);
        cursor = nextCursor;
    } while (cursor !== '0');
    return ids;
}

async function list() {
    try {
        const ids = await getAllAlumniIds();
        if (!ids || ids.length === 0) {
            showToast('暂无校友数据');
            return;
        }
        const batchSize = 50;
        let allUsers = [];
        for (let i = 0; i < ids.length; i += batchSize) {
            const batch = ids.slice(i, i + batchSize);
            const vals = await redis('MGET', ...batch.map(id => `user:${id}`));
            allUsers.push(...vals);
        }
        let msg = `共 ${ids.length} 位校友\n\n`;
        ids.forEach((id, idx) => {
            const u = JSON.parse(allUsers[idx] || '{}');
            const dot = u.activated ? '🟢' : '🔴';
            let name = u.name || '?';
            if (name.length === 2) name = name[0] + '　' + name[1];
            msg += `${dot} ${name} · ${id}\n`;
        });
        msg += `\n点击确定可输入ID删除`;
        const wantDelete = await showConfirm(msg, '校友列表');
        if (wantDelete) {
            const id = prompt('输入要删除的短ID：');
            if (id && await showConfirm(`确认删除 ${id} ？`, '警告')) {
                await redis('DEL', `user:${id}`);
                await redis('SREM', 'alumni:index', id);
                showToast(`${id} 已删除`);
            }
        }
    } catch (e) {
        showToast(`加载失败：${e.message}`);
    }
}

async function del() {
    const id = prompt('请输入要删除的校友短ID：');
    if (!id) return;
    const confirmed = await showConfirm(`确认删除 "${id}" ？不可恢复！`, '警告');
    if (!confirmed) return;
    try {
        const exists = await redis('EXISTS', `user:${id}`);
        if (exists === 0) {
            showToast(`校友 "${id}" 不存在`);
            return;
        }
        await redis('DEL', `user:${id}`);
        await redis('SREM', 'alumni:index', id);
        showToast(`已删除`);
    } catch (e) {
        showToast(`删除失败：${e.message}`);
    }
}

function closePanel() {
    const panel = document.getElementById('adminPanel');
    if (panel) panel.remove();
    DOM.iCardId = DOM.iName = DOM.iStuId = DOM.iDepartment = DOM.iMajor = DOM.iGradYear = null;
}

// 控制台表单双向绑定：当控制台注入后，监听输入事件同步到 reactiveConfig
function bindConsoleEvents() {
    if (!DOM.iName) return;
    DOM.iCardId.addEventListener('input', (e) => { reactiveConfig.cardId = e.target.value; });
    DOM.iName.addEventListener('input', (e) => { reactiveConfig.name = e.target.value; });
    DOM.iStuId.addEventListener('input', (e) => { reactiveConfig.stuId = e.target.value; });
    DOM.iDepartment.addEventListener('input', (e) => { reactiveConfig.department = e.target.value; });
    DOM.iMajor.addEventListener('input', (e) => { reactiveConfig.major = e.target.value; });
    DOM.iGradYear.addEventListener('input', (e) => { reactiveConfig.gradYear = e.target.value; });
}

// ------------------- 12. 三指手势打开控制台（动态注入） -------------------
const gestureArea = document.getElementById('gestureArea');
if (gestureArea) {
    gestureArea.addEventListener('touchstart', async (e) => {
        if (e.touches.length === 3) {
            if (document.getElementById('adminPanel')) return;
            const pwd = prompt('🔐 请输入控制台密码：');
            if (pwd === CONTROL_PASSWORD) {
                document.body.insertAdjacentHTML('beforeend', ADMIN_PANEL_HTML);
                // 重新获取控制台 DOM 元素并绑定事件
                DOM.iCardId = document.getElementById('i-cardId');
                DOM.iName = document.getElementById('i-name');
                DOM.iStuId = document.getElementById('i-stuId');
                DOM.iDepartment = document.getElementById('i-department');
                DOM.iMajor = document.getElementById('i-major');
                DOM.iGradYear = document.getElementById('i-gradYear');
                bindConsoleEvents();
                // 同步当前数据显示到表单
                updateUI();
            } else if (pwd !== null) {
                showToast('密码错误');
            }
        }
    });
}

// ------------------- 13. 北京时间时钟 + 刷新按钮旋转动画 -------------------
function updateClock() {
    const now = new Date();
    const beijing = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 28800000);
    const str = `${beijing.getFullYear()}年${String(beijing.getMonth()+1).padStart(2,'0')}月${String(beijing.getDate()).padStart(2,'0')}日 ${String(beijing.getHours()).padStart(2,'0')}:${String(beijing.getMinutes()).padStart(2,'0')}:${String(beijing.getSeconds()).padStart(2,'0')}`;
    if (DOM.liveClockBar) DOM.liveClockBar.innerText = `当前时间：${str}`;
}

function triggerManualRefresh() {
    const refreshBtn = document.querySelector('.refresh-lnk');
    if (refreshBtn) {
        refreshBtn.classList.add('rotating');
        setTimeout(() => refreshBtn.classList.remove('rotating'), 500);
    }
    updateClock();
}

// ------------------- 14. 启动 -------------------
showHome();
load();
updateClock();
setInterval(updateClock, 1000);

// 暴露全局函数供内联事件调用
window.showHome = showHome;
window.tryNavigateToCard = tryNavigateToCard;
window.triggerManualRefresh = triggerManualRefresh;
window.random = random;
window.generate = generate;
window.list = list;
window.del = del;
window.resetDeviceLock = resetDeviceLock;
window.closePanel = closePanel;