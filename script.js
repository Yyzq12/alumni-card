/* ==========================================
   荆楚理工学院 移动校园 - 核心逻辑脚本
   数据存储：Upstash Redis（云端）
   ========================================== */

// ──────────────────────────────────────────
// 模块1：常量配置区
// ──────────────────────────────────────────

const CONTROL_PASSWORD = "5499";       // 控制台密码

const UPSTASH_URL = "https://social-escargot-66261.upstash.io";
const UPSTASH_TOKEN = "gQAAAAAAAQLVAAIgcDJmYzU1YjliNjUwZTI0ZDZhYWY3ODhiZDlkYzRkNTk1ZA";

async function redis(command, ...args) {
    const url = `${UPSTASH_URL}/${command}/${args.join('/')}`;
    const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    if (!resp.ok) throw new Error('Redis 请求失败: ' + resp.status);
    const data = await resp.json();
    return data.result;
}

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

const firstNames = ["张", "李", "王", "刘", "陈", "杨", "赵", "黄", "周", "吴", "徐", "孙", "马", "胡", "郭", "林"];
const lastNames = ["逸飞", "梦溪", "泽宇", "梓涵", "听风", "晓静", "嘉杰", "雨桐", "博远", "子墨", "瑞霖", "思源", "楚菁", "雪珂", "寒潞"];

// ──────────────────────────────────────────
// 模块2：全局状态
// ──────────────────────────────────────────
let currentConfig = {
    cardId: "--------",
    name: "--",
    stuId: "--",
    department: "--",
    major: "--",
    gradYear: "--"
};
let currentUserId = "";
let isCardDataValid = false;

// ──────────────────────────────────────────
// 模块3：拼音算法
// ──────────────────────────────────────────
function getChinesePinyinInitials(str) {
    if (!str) return "user";
    const pinyinMap = {
        '阿':'a','啊':'a','爱':'a','安':'a','巴':'b','把':'b','白':'b','班':'b','包':'b',
        '擦':'c','才':'c','参':'c','藏':'c','曾':'c','陈':'c','程':'c','查':'c','楚':'c','初':'c',
        '大':'d','代':'d','单':'d','邓':'d','丁':'d','俄':'e','恩':'e','儿':'e',
        '发':'f','范':'f','方':'f','冯':'f','风':'f','高':'g','郭':'g','关':'g','谷':'g','古':'g',
        '哈':'h','海':'h','韩':'h','何':'h','胡':'h','黄':'h','贾':'j','江':'j','金':'j','景':'j','季':'j',
        '卡':'k','康':'k','孔':'k','寇':'k','匡':'k','拉':'l','李':'l','林':'l','刘':'l','罗':'l','龙':'l',
        '马':'m','孟':'m','米':'m','苗':'m','莫':'m','拿':'n','南':'n','宁':'n','牛':'n','年':'n',
        '欧':'o','欧阳':'o','潘':'p','彭':'p','皮':'p','朴':'p','平':'p','钱':'q','秦':'q','邱':'q','屈':'q','权':'q',
        '任':'r','阮':'r','饶':'r','容':'r','荣':'r','撒':'s','孙':'s','宋':'s','苏':'s','沈':'s','石':'s',
        '他':'t','唐':'t','田':'t','佟':'t','涂':'t','王':'w','吴':'w','万':'w','魏':'w','文':'w',
        '西':'x','夏':'x','肖':'x','谢':'x','许':'x','徐':'x','压':'y','杨':'y','叶':'y','于':'y','余':'y','易':'y',
        '匝':'z','张':'z','赵':'z','周':'z','郑':'z','朱':'z','左':'z'
    };
    let result = "";
    for (let char of str) {
        if (/[a-zA-Z]/.test(char)) {
            result += char.toLowerCase();
        } else if (pinyinMap[char]) {
            result += pinyinMap[char];
        } else {
            result += 'x';
        }
    }
    return result || "uid";
}

// ──────────────────────────────────────────
// 模块4：设备ID
// ──────────────────────────────────────────
function getOrCreateDeviceId() {
    const STORAGE_KEY = 'device_unique_id';
    let deviceId = localStorage.getItem(STORAGE_KEY);
    if (!deviceId) {
        deviceId = 'DEV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem(STORAGE_KEY, deviceId);
    }
    return deviceId;
}

// ──────────────────────────────────────────
// 模块5：页面导航
// ──────────────────────────────────────────
function forceGoToCardPage() {
    document.getElementById('page-home').style.display = 'none';
    document.getElementById('page-card').style.display = 'flex';
    document.getElementById('nav-title').innerText = '校友卡';
    document.getElementById('nav-back-btn').style.visibility = 'visible';
}

function navigateToHome() {
    document.getElementById('page-card').style.display = 'none';
    document.getElementById('page-home').style.display = 'flex';
    document.getElementById('nav-title').innerText = '首页';
    document.getElementById('nav-back-btn').style.visibility = 'hidden';
}

// ──────────────────────────────────────────
// 模块6：设备锁
// ──────────────────────────────────────────
async function tryNavigateToCard() {
    if (!isCardDataValid) {
        alert('⚠️ 此链接无效或校友信息未被收录，无法查看电子卡片。\n\n请确认链接是否正确，或联系管理员获取新链接。');
        return;
    }

    const userId = (currentConfig.stuId && currentConfig.stuId !== "--") ? currentConfig.stuId : currentUserId;
    if (!userId || userId === "--") {
        alert('系统错误：未检测到有效用户标识。');
        return;
    }

    const deviceId = getOrCreateDeviceId();

    try {
        const raw = await redis('GET', `user:${userId}`);
        
        if (!raw) {
            alert('❌ 该校友卡不存在。\n\n可能原因：\n1. 链接已失效\n2. 该校友信息已被删除\n\n请联系管理员确认。');
            return;
        }

        const user = JSON.parse(raw);

        if (user.activated) {
            if (user.deviceId !== deviceId) {
                alert('🔒 安全警告：该校友卡已绑定其他设备，当前设备无法访问。');
                return;
            }
            forceGoToCardPage();
            return;
        }

        if (confirm("【首次激活】\n该校友卡尚未绑定设备。\n\n点击确认后，本卡将与当前设备永久绑定。\n绑定后他人无法再用此链接访问。\n\n确认进行绑定吗？")) {
            user.activated = true;
            user.deviceId = deviceId;
            await redis('SET', `user:${userId}`, JSON.stringify(user));
            forceGoToCardPage();
        }
    } catch (e) {
        console.error(e);
        alert('网络异常，无法验证设备身份，请稍后重试。');
    }
}

async function resetDeviceLock() {
    const userId = (currentConfig.stuId && currentConfig.stuId !== "--") ? currentConfig.stuId : currentUserId;
    if (!userId || userId === "--") {
        alert('未检测到有效卡片绑定用户，无需重置。');
        return;
    }

    try {
        const raw = await redis('GET', `user:${userId}`);
        if (raw) {
            const user = JSON.parse(raw);
            user.activated = false;
            user.deviceId = null;
            await redis('SET', `user:${userId}`, JSON.stringify(user));
        }
        alert(`✅ 已成功解除用户 [${userId}] 的设备锁！`);
    } catch (e) {
        alert('重置失败，请稍后重试。');
    }

    if (document.getElementById('page-card').style.display === 'flex') {
        navigateToHome();
    }
    document.getElementById('adminPanel').classList.remove('active');
}

// ──────────────────────────────────────────
// 模块7：数据渲染
// ──────────────────────────────────────────
function renderDomData() {
    document.getElementById('v-cardId').innerText = currentConfig.cardId;
    document.getElementById('v-name').innerText = currentConfig.name;
    document.getElementById('v-stuId').innerText = currentConfig.stuId;
    document.getElementById('v-department').innerText = currentConfig.department;
    document.getElementById('v-major').innerText = currentConfig.major;
    document.getElementById('v-gradYear').innerText = currentConfig.gradYear;
}

function syncConfigToInputs() {
    document.getElementById('i-cardId').value = currentConfig.cardId === "--------" ? "" : currentConfig.cardId;
    document.getElementById('i-name').value = currentConfig.name === "--" ? "" : currentConfig.name;
    document.getElementById('i-stuId').value = currentConfig.stuId === "--" ? "" : currentConfig.stuId;
    document.getElementById('i-department').value = currentConfig.department === "--" ? "" : currentConfig.department;
    document.getElementById('i-major').value = currentConfig.major === "--" ? "" : currentConfig.major;
    document.getElementById('i-gradYear').value = currentConfig.gradYear === "--" ? "" : currentConfig.gradYear;
}

// ──────────────────────────────────────────
// 模块8：URL参数解析
// ──────────────────────────────────────────
async function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    isCardDataValid = false;

    // 获取id参数
    const id = params.get('id');
    
    // 调试模式：显示当前id值
    if (params.get('debug') === '1') {
        alert('当前URL中的id参数：' + id);
    }

    if (!id) return;

    currentUserId = id;
    console.log('正在加载校友，id:', id);

    try {
        const raw = await redis('GET', `user:${id}`);
        console.log('Redis返回数据:', raw);

        if (raw) {
            const u = JSON.parse(raw);
            currentConfig = {
                cardId: u.cardId || "JCCUT000000",
                name: u.name || "未命名",
                stuId: u.stuId || "未设定",
                department: u.department || "未设定",
                major: u.major || "未设定",
                gradYear: u.gradYear || "2020"
            };
            isCardDataValid = true;
            renderDomData();
            syncConfigToInputs();
            console.log('✅ 校友数据加载成功:', currentConfig.name);
        } else {
            console.warn('⚠️ Redis中未找到该key:', `user:${id}`);
            // 重置显示
            currentConfig = { cardId: "--------", name: "--", stuId: "--", department: "--", major: "--", gradYear: "--" };
            renderDomData();
        }
    } catch (e) {
        console.error('❌ 加载失败:', e);
        currentConfig = { cardId: "--------", name: "--", stuId: "--", department: "--", major: "--", gradYear: "--" };
        renderDomData();
    }
}

// ──────────────────────────────────────────
// 模块9：控制台功能
// ──────────────────────────────────────────

function generateRandomStuId() {
    const startYear = Math.floor(Math.random() * (2020 - 2016 + 1)) + 2016;
    const randomMajorMeta = jcMajorDatabase[Math.floor(Math.random() * jcMajorDatabase.length)];
    const classNum = String(Math.floor(Math.random() * 3) + 1).padStart(2, '0');
    const seatNum = String(Math.floor(Math.random() * 40) + 1).padStart(2, '0');
    const finalStuId = `${startYear}${randomMajorMeta.code}${classNum}${seatNum}`;
    const gradYear = startYear + 4;
    const randomName = firstNames[Math.floor(Math.random() * firstNames.length)] + lastNames[Math.floor(Math.random() * lastNames.length)];

    document.getElementById('i-stuId').value = finalStuId;
    document.getElementById('i-name').value = randomName;
    document.getElementById('i-department').value = randomMajorMeta.dept;
    document.getElementById('i-major').value = randomMajorMeta.major;
    document.getElementById('i-gradYear').value = gradYear;
    document.getElementById('i-cardId').value = `JCCUT${startYear}0${Math.floor(Math.random() * 80) + 10}`;
}

async function generateStandaloneUrl() {
    const cfg = {
        cardId: document.getElementById('i-cardId').value.trim(),
        name: document.getElementById('i-name').value.trim(),
        stuId: document.getElementById('i-stuId').value.trim(),
        department: document.getElementById('i-department').value.trim(),
        major: document.getElementById('i-major').value.trim(),
        gradYear: document.getElementById('i-gradYear').value.trim()
    };

    if (!cfg.name || !cfg.stuId) {
        alert('姓名和学号不能为空！');
        return;
    }

    const initials = getChinesePinyinInitials(cfg.name);
    const lastTwoDigits = cfg.stuId.length >= 2 ? cfg.stuId.slice(-2) : "00";
    const computedId = initials + lastTwoDigits;

    // 构建链接（去掉末尾斜杠）
    let baseUrl = window.location.origin + window.location.pathname;
    baseUrl = baseUrl.replace(/\/$/, '');
    const standaloneUrl = `${baseUrl}?id=${computedId}`;

    try {
        const exists = await redis('EXISTS', `user:${computedId}`);
        if (exists) {
            alert(`短ID "${computedId}" 已存在，请更换姓名或学号后重试。`);
            return;
        }

        const user = {
            name: cfg.name,
            stuId: cfg.stuId,
            cardId: cfg.cardId,
            department: cfg.department,
            major: cfg.major,
            gradYear: cfg.gradYear,
            activated: false,
            deviceId: null,
            createdAt: Date.now()
        };
        await redis('SET', `user:${computedId}`, JSON.stringify(user));

        currentConfig = cfg;
        currentUserId = computedId;
        isCardDataValid = true;
        renderDomData();

        // 复制链接
        try {
            await navigator.clipboard.writeText(standaloneUrl);
            alert(`🎉 生成成功！\n\n短ID：${computedId}\n链接已自动复制到剪贴板。`);
        } catch (clipErr) {
            alert(`🎉 生成成功！\n\n短ID：${computedId}\n\n请手动复制以下链接：\n${standaloneUrl}`);
        }
    } catch (e) {
        console.error(e);
        alert('保存失败：' + e.message);
    }
}

async function listAlumni() {
    try {
        const keys = await redis('KEYS', 'user:*');
        if (!keys || keys.length === 0) {
            alert('当前没有任何校友数据。');
            return;
        }
        const values = await redis('MGET', ...keys);
        let text = `共 ${keys.length} 位校友：\n\n`;
        keys.forEach((key, i) => {
            const u = JSON.parse(values[i] || '{}');
            text += `${i + 1}. ${u.name} (${u.stuId})\n   短ID: ${key.replace('user:', '')} | ${u.department} ${u.major}\n   ${u.gradYear}届 | ${u.activated ? '已激活' : '未激活'}\n\n`;
        });
        alert(text);
    } catch (e) {
        alert('获取列表失败：' + e.message);
    }
}

async function deleteAlumni() {
    const id = prompt('请输入要删除的校友短ID（例如 thl08）：');
    if (!id) return;
    if (!confirm(`⚠️ 确认删除校友 "${id}" 吗？此操作不可恢复！`)) return;

    try {
        const exists = await redis('EXISTS', `user:${id}`);
        if (!exists) {
            alert(`校友 "${id}" 不存在。`);
            return;
        }
        await redis('DEL', `user:${id}`);
        alert(`✅ 校友 "${id}" 已成功删除。`);
    } catch (e) {
        alert('删除失败：' + e.message);
    }
}

function closePanel() {
    document.getElementById('adminPanel').classList.remove('active');
}

// ──────────────────────────────────────────
// 模块10：三指手势 + 密码
// ──────────────────────────────────────────
document.getElementById('gestureArea').addEventListener('touchstart', (e) => {
    if (e.touches.length == 3) {
        const pwd = prompt('请输入控制台密码：');
        if (pwd === CONTROL_PASSWORD) {
            document.getElementById('adminPanel').classList.add('active');
            syncConfigToInputs();
        } else if (pwd !== null) {
            alert('密码错误');
        }
    }
});

// ──────────────────────────────────────────
// 模块11：北京时间
// ──────────────────────────────────────────
function runClock() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const bj = new Date(utc + (3600000 * 8));
    document.getElementById('live-clock-bar').innerText =
        `当前时间：${bj.getFullYear()}年${String(bj.getMonth()+1).padStart(2,'0')}月${String(bj.getDate()).padStart(2,'0')}日 ${String(bj.getHours()).padStart(2,'0')}:${String(bj.getMinutes()).padStart(2,'0')}:${String(bj.getSeconds()).padStart(2,'0')}`;
}

function triggerManualRefresh() { runClock(); }

// ──────────────────────────────────────────
// 模块12：启动
// ──────────────────────────────────────────
navigateToHome();
parseUrlParams();
runClock();
setInterval(runClock, 1000);
