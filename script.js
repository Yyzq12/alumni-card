/* ==========================================
   荆楚理工学院 移动校园 - 核心脚本
   模块：配置、拼音、设备锁、渲染、控制台、时钟
   ========================================== */

// ---------- 1. 常量配置 ----------
const CONTROL_PASSWORD = "5499";
const DATA_URL = "users.json";

// 专业数据库
const jcMajorDatabase = [
    { dept: "经济与管理学院", major: "财务管理", code: "21102" },
    { dept: "经济与管理学院", major: "大数据与会计", code: "30502" },
    { dept: "医学部", major: "口腔医学（专升本）", code: "21102" },
    { dept: "师范学院", major: "小学教育", code: "40850" },
    { dept: "新能源学院", major: "印刷工程（专升本）", code: "2420101" },
    { dept: "食品与生物学院", major: "植物科学与技术（专升本）", code: "2420703" },
    { dept: "食品与生物学院", major: "食品科学与工程", code: "2424407" },
    { dept: "数理学院", major: "数学与应用数学", code: "09500" },
    { dept: "艺术学院", major: "环境设计", code: "12050" },
    { dept: "外国语学院", major: "外国语言文学", code: "10500" }
];

const firstNames = ["张", "李", "王", "刘", "陈", "杨", "赵", "黄", "周", "吴", "徐", "孙", "马", "胡", "郭", "林"];
const lastNames = ["逸飞", "梦溪", "泽宇", "梓涵", "听风", "晓静", "嘉杰", "雨桐", "博远", "子墨", "瑞霖", "思源", "楚菁", "雪珂", "海林"];

// ---------- 2. 全局状态 ----------
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

// ---------- 3. 拼音首字母算法 ----------
function getChinesePinyinInitials(str) {
    if (!str) return "user";
    const pinyinMap = {
        '阿':'a','啊':'a','爱':'a','安':'a','巴':'b','把':'b','白':'b','班':'b','包':'b','擦':'c','才':'c','参':'c','藏':'c','曾':'c',
        '陈':'c','程':'c','查':'c','楚':'c','初':'c','大':'d','代':'d','单':'d','邓':'d','丁':'d','俄':'e','恩':'e','儿':'e',
        '发':'f','范':'f','方':'f','冯':'f','风':'f','高':'g','郭':'g','关':'g','谷':'g','古':'g','哈':'h','海':'h','韩':'h','何':'h',
        '胡':'h','黄':'h','贾':'j','江':'j','金':'j','景':'j','季':'j','卡':'k','康':'k','孔':'k','寇':'k','匡':'k','拉':'l','李':'l',
        '林':'l','刘':'l','罗':'l','龙':'l','马':'m','孟':'m','米':'m','苗':'m','莫':'m','拿':'n','南':'n','宁':'n','牛':'n','年':'n',
        '欧':'o','欧阳':'o','潘':'p','彭':'p','皮':'p','朴':'p','平':'p','钱':'q','秦':'q','邱':'q','屈':'q','权':'q','任':'r','阮':'r',
        '饶':'r','容':'r','荣':'r','撒':'s','孙':'s','宋':'s','苏':'s','沈':'s','石':'s','他':'t','唐':'t','田':'t','佟':'t','涂':'t',
        '王':'w','吴':'w','万':'w','魏':'w','文':'w','西':'x','夏':'x','肖':'x','谢':'x','许':'x','徐':'x','压':'y','杨':'y','叶':'y',
        '于':'y','余':'y','易':'y','匝':'z','张':'z','赵':'z','周':'z','郑':'z','朱':'z','左':'z'
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

// ---------- 4. 设备唯一ID ----------
function getOrCreateDeviceId() {
    const STORAGE_KEY = 'device_unique_id';
    let deviceId = localStorage.getItem(STORAGE_KEY);
    if (!deviceId) {
        deviceId = 'DEV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem(STORAGE_KEY, deviceId);
    }
    return deviceId;
}

// ---------- 5. 页面导航 ----------
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

// ---------- 6. 设备锁核心 ----------
async function tryNavigateToCard() {
    if (!isCardDataValid) {
        alert('此链接无效或校友信息未被收录，无法查看电子卡片。');
        return;
    }

    const userId = (currentConfig.stuId && currentConfig.stuId !== "--") ? currentConfig.stuId : currentUserId;
    if (!userId || userId === "--") {
        alert('系统错误：未检测到有效用户标识。');
        return;
    }

    const deviceId = getOrCreateDeviceId();
    const key = `lock_device_${userId}`;

    if (!localStorage.getItem(key)) {
        if (confirm("【首次打开安全激活】\n系统检测到这是您第一次在当前设备上访问该专属链接。\n\n⚠️ 设备安全绑定机制：\n点击确认后，本校友卡将与当前设备物理绑定，防止他人转发劫持盗刷。确认进行绑定吗？")) {
            localStorage.setItem(key, deviceId);
            forceGoToCardPage();
        }
    } else if (localStorage.getItem(key) === deviceId) {
        forceGoToCardPage();
    } else {
        alert('安全警告：检测到当前设备环境与绑定的安全设备不一致。为保障账户安全，已限制该设备访问卡片。');
    }
}

function resetDeviceLock() {
    const userId = (currentConfig.stuId && currentConfig.stuId !== "--") ? currentConfig.stuId : currentUserId;
    if (!userId || userId === "--") {
        alert('未检测到有效卡片绑定用户，无需重置。');
        return;
    }
    localStorage.removeItem(`lock_device_${userId}`);
    alert(`已成功解除用户 [${userId}] 的防转发设备锁！下次打开将自动重新建立首次绑定。`);
    if (document.getElementById('page-card').style.display === 'flex') {
        navigateToHome();
    }
    document.getElementById('adminPanel').classList.remove('active');
}

// ---------- 7. 数据渲染 ----------
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

// ---------- 8. URL参数解析 ----------
function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    isCardDataValid = false;

    // 模式A：独立链接携带完整参数
    if (params.get('cardId') || params.get('name') || params.get('stuId')) {
        currentConfig.cardId = params.get('cardId') || currentConfig.cardId;
        currentConfig.name = params.get('name') || currentConfig.name;
        currentConfig.stuId = params.get('stuId') || currentConfig.stuId;
        currentConfig.department = params.get('department') || currentConfig.department;
        currentConfig.major = params.get('major') || currentConfig.major;
        currentConfig.gradYear = params.get('gradYear') || currentConfig.gradYear;
        isCardDataValid = true;
        renderDomData();
        syncConfigToInputs();
        return;
    }

    // 模式B：短id从users.json加载
    const id = params.get('id');
    if (id) {
        currentUserId = id;
        fetch(DATA_URL + '?t=' + Date.now())
            .then(r => r.json())
            .then(data => {
                if (data && data[id]) {
                    const u = data[id];
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
                } else {
                    currentConfig = { cardId: "--------", name: "--", stuId: "--", department: "--", major: "--", gradYear: "--" };
                    renderDomData();
                }
            })
            .catch(() => {
                currentConfig = { cardId: "--------", name: "--", stuId: "--", department: "--", major: "--", gradYear: "--" };
                renderDomData();
            });
    }
}

// ---------- 9. 控制台功能 ----------
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

function generateStandaloneUrl() {
    const cfg = {
        cardId: document.getElementById('i-cardId').value.trim(),
        name: document.getElementById('i-name').value.trim(),
        stuId: document.getElementById('i-stuId').value.trim(),
        department: document.getElementById('i-department').value.trim(),
        major: document.getElementById('i-major').value.trim(),
        gradYear: document.getElementById('i-gradYear').value.trim()
    };
    if (!cfg.name || !cfg.stuId) {
        alert('数据校验错误：姓名和学号不能为空！');
        return;
    }

    const initials = getChinesePinyinInitials(cfg.name);
    const lastTwoDigits = cfg.stuId.length >= 2 ? cfg.stuId.slice(-2) : "00";
    const computedId = initials + lastTwoDigits;
    const standaloneUrl = window.location.origin + window.location.pathname + '?id=' + computedId;
    const jsonTemplate = `"${computedId}": {\n    "name": "${cfg.name}",\n    "stuId": "${cfg.stuId}",\n    "cardId": "${cfg.cardId}",\n    "department": "${cfg.department}",\n    "major": "${cfg.major}",\n    "gradYear": "${cfg.gradYear}"\n  }`;
    const clipboardText = `专属独立链接：\n${standaloneUrl}\n\n---------------------------\n可直接追加粘贴到 users.json 的免排版代码：\n\n  ${jsonTemplate},`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(clipboardText).then(() => {
            alert(`🎉 生成成功！\n\n1. 短ID已计算为：${computedId}\n2. 链接及 JSON 代码已复制到剪贴板。\n请先将 JSON 粘贴到 users.json，再手动访问短链接。`);
            currentConfig = cfg;
            isCardDataValid = true;
            renderDomData();
        }).catch(() => {
            prompt('自动复制失败，请手动复制以下内容：', clipboardText);
        });
    } else {
        prompt('请手动复制以下内容：', clipboardText);
    }
}

function closePanel() {
    document.getElementById('adminPanel').classList.remove('active');
}

// ---------- 10. 三指手势 + 密码验证 ----------
document.getElementById('gestureArea').addEventListener('touchstart', (e) => {
    if (e.touches.length == 3) {
        const pwd = prompt('请输入控制台密码：');
        if (pwd === CONTROL_PASSWORD) {
            document.getElementById('adminPanel').classList.add('active');
            syncConfigToInputs();
        } else if (pwd !== null) {
            alert('密码错误，无法打开控制台');
        }
    }
});

// ---------- 11. 时钟（北京时间） ----------
function runClock() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const bj = new Date(utc + (3600000 * 8));
    document.getElementById('live-clock-bar').innerText =
        `当前时间：${bj.getFullYear()}年${String(bj.getMonth()+1).padStart(2,'0')}月${String(bj.getDate()).padStart(2,'0')}日 ${String(bj.getHours()).padStart(2,'0')}:${String(bj.getMinutes()).padStart(2,'0')}:${String(bj.getSeconds()).padStart(2,'0')}`;
}

function triggerManualRefresh() {
    runClock();
}

// ---------- 12. 启动 ----------
navigateToHome();
parseUrlParams();
runClock();
setInterval(runClock, 1000);
