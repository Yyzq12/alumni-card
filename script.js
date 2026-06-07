/* ==========================================
   荆楚理工学院 移动校园 - 核心逻辑脚本
   下面按照功能模块分区，修改时只需找到对应区域
   ========================================== */

// ──────────────────────────────────────────
// 模块1：常量配置区（在这里改密码、数据库等）
// ──────────────────────────────────────────

const CONTROL_PASSWORD = "5499";       // 控制台密码，修改这里的数字即可更换密码
const DATA_URL = "users.json";         // 校友数据文件名，如果改名了记得同步修改

// 专业数据库（随机生成时从这里抽取）
// 如果要增加新专业，照着格式加一行就行，例如：
// { dept: "计算机学院", major: "软件工程", code: "08120" }
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

// 随机姓名的“姓”库，可自行增删
const firstNames = ["张", "李", "王", "刘", "陈", "杨", "赵", "黄", "周", "吴", "徐", "孙", "马", "胡", "郭", "林"];

// 随机姓名的“名”库，可自行增删
const lastNames = ["逸飞", "梦溪", "泽宇", "梓涵", "听风", "晓静", "嘉杰", "雨桐", "博远", "子墨", "瑞霖", "思源", "楚菁", "雪珂", "寒潞"];

// ──────────────────────────────────────────
// 模块2：全局状态（当前显示的校友信息）
// ──────────────────────────────────────────
let currentConfig = {
    cardId: "--------",
    name: "--",
    stuId: "--",
    department: "--",
    major: "--",
    gradYear: "--"
};
let currentUserId = "";                // 短ID（从URL参数中获取）
let isCardDataValid = false;          // 当前链接是否对应一条真实存在的校友数据

// ──────────────────────────────────────────
// 模块3：拼音首字母算法（汉字→拼音首字母）
// 如果想扩展更多汉字，在下面的 pinyinMap 对象里添加即可
// ──────────────────────────────────────────
function getChinesePinyinInitials(str) {
    if (!str) return "user";

    // 汉字到拼音首字母的映射表，目前收录了常见姓氏和常用字
    // 格式：'汉字': '首字母'
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
            // 如果是英文字母，直接转小写
            result += char.toLowerCase();
        } else if (pinyinMap[char]) {
            // 如果字典里有，取对应的首字母
            result += pinyinMap[char];
        } else {
            // 字典里没有的汉字用 'x' 占位，可自行添加映射
            result += 'x';
        }
    }
    return result || "uid";
}

// ──────────────────────────────────────────
// 模块4：设备唯一ID（用于绑定设备，防止多设备登录）
// 原理：第一次访问时生成一个随机码，存入浏览器本地存储，之后都读这个码
// ──────────────────────────────────────────
function getOrCreateDeviceId() {
    const STORAGE_KEY = 'device_unique_id';   // 存储在浏览器里的键名
    let deviceId = localStorage.getItem(STORAGE_KEY);
    if (!deviceId) {
        // 生成一个随机ID：时间戳 + 随机字符串
        deviceId = 'DEV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem(STORAGE_KEY, deviceId);
    }
    return deviceId;
}

// ──────────────────────────────────────────
// 模块5：页面导航（切换首页/卡片页）
// ──────────────────────────────────────────
function forceGoToCardPage() {
    // 隐藏首页，显示卡片页
    document.getElementById('page-home').style.display = 'none';
    document.getElementById('page-card').style.display = 'flex';
    // 修改导航栏标题
    document.getElementById('nav-title').innerText = '校友卡';
    // 显示返回按钮
    document.getElementById('nav-back-btn').style.visibility = 'visible';
}

function navigateToHome() {
    // 隐藏卡片页，显示首页
    document.getElementById('page-card').style.display = 'none';
    document.getElementById('page-home').style.display = 'flex';
    document.getElementById('nav-title').innerText = '首页';
    document.getElementById('nav-back-btn').style.visibility = 'hidden';
}

// ──────────────────────────────────────────
// 模块6：设备锁（核心安全逻辑）
// 点击首页热区时调用，验证设备是否有权查看卡片
// ──────────────────────────────────────────
async function tryNavigateToCard() {
    // 第一步：检查当前链接是否真的对应一个校友
    if (!isCardDataValid) {
        alert('此链接无效或校友信息未被收录，无法查看电子卡片。');
        return;
    }

    // 第二步：获取当前用户的唯一标识（学号优先，其次是短ID）
    const userId = (currentConfig.stuId && currentConfig.stuId !== "--") ? currentConfig.stuId : currentUserId;
    if (!userId || userId === "--") {
        alert('系统错误：未检测到有效用户标识。');
        return;
    }

    const deviceId = getOrCreateDeviceId();
    const key = `lock_device_${userId}`;   // 存储锁的键名，如 lock_device_2016211020208

    // 第三步：检查是否首次激活
    if (!localStorage.getItem(key)) {
        // 从未激活过，弹窗让用户确认绑定
        if (confirm("【首次打开安全激活】\n系统检测到这是您第一次在当前设备上访问该专属链接。\n\n⚠️ 设备安全绑定机制：\n点击确认后，本校友卡将与当前设备物理绑定，防止他人转发劫持盗刷。确认进行绑定吗？")) {
            localStorage.setItem(key, deviceId);    // 记录当前设备ID
            forceGoToCardPage();                   // 进入卡片页
        }
        // 如果用户点了取消，什么也不做，留在首页
    } else if (localStorage.getItem(key) === deviceId) {
        // 设备ID匹配，已经绑定过，直接进入
        forceGoToCardPage();
    } else {
        // 设备ID不匹配，说明是其他设备，拒绝访问
        alert('安全警告：检测到当前设备环境与绑定的安全设备不一致。为保障账户安全，已限制该设备访问卡片。');
    }
}

// 重置设备锁（管理员在控制台使用）
function resetDeviceLock() {
    const userId = (currentConfig.stuId && currentConfig.stuId !== "--") ? currentConfig.stuId : currentUserId;
    if (!userId || userId === "--") {
        alert('未检测到有效卡片绑定用户，无需重置。');
        return;
    }
    // 删除锁记录
    localStorage.removeItem(`lock_device_${userId}`);
    alert(`已成功解除用户 [${userId}] 的防转发设备锁！下次打开将自动重新建立首次绑定。`);
    // 如果正在卡片页，返回首页
    if (document.getElementById('page-card').style.display === 'flex') {
        navigateToHome();
    }
    // 关闭控制台
    document.getElementById('adminPanel').classList.remove('active');
}

// ──────────────────────────────────────────
// 模块7：数据渲染（把 currentConfig 里的数据更新到页面卡片上）
// ──────────────────────────────────────────
function renderDomData() {
    document.getElementById('v-cardId').innerText = currentConfig.cardId;
    document.getElementById('v-name').innerText = currentConfig.name;
    document.getElementById('v-stuId').innerText = currentConfig.stuId;
    document.getElementById('v-department').innerText = currentConfig.department;
    document.getElementById('v-major').innerText = currentConfig.major;
    document.getElementById('v-gradYear').innerText = currentConfig.gradYear;
}

// 把 currentConfig 同步到控制台的输入框里（打开控制台时用）
function syncConfigToInputs() {
    document.getElementById('i-cardId').value = currentConfig.cardId === "--------" ? "" : currentConfig.cardId;
    document.getElementById('i-name').value = currentConfig.name === "--" ? "" : currentConfig.name;
    document.getElementById('i-stuId').value = currentConfig.stuId === "--" ? "" : currentConfig.stuId;
    document.getElementById('i-department').value = currentConfig.department === "--" ? "" : currentConfig.department;
    document.getElementById('i-major').value = currentConfig.major === "--" ? "" : currentConfig.major;
    document.getElementById('i-gradYear').value = currentConfig.gradYear === "--" ? "" : currentConfig.gradYear;
}

// ──────────────────────────────────────────
// 模块8：URL参数解析（读取链接里的 ?id=xxx 或完整参数）
// 这是页面加载时最先执行的逻辑之一
// ──────────────────────────────────────────
function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    isCardDataValid = false;   // 先假设无效

    // 模式A：链接里直接携带完整信息（例如 ?cardId=xxx&name=唐海林&stuId=...）
    if (params.get('cardId') || params.get('name') || params.get('stuId')) {
        currentConfig.cardId = params.get('cardId') || currentConfig.cardId;
        currentConfig.name = params.get('name') || currentConfig.name;
        currentConfig.stuId = params.get('stuId') || currentConfig.stuId;
        currentConfig.department = params.get('department') || currentConfig.department;
        currentConfig.major = params.get('major') || currentConfig.major;
        currentConfig.gradYear = params.get('gradYear') || currentConfig.gradYear;
        isCardDataValid = true;   // 直接标记有效
        renderDomData();
        syncConfigToInputs();
        return;
    }

    // 模式B：只有短 id（例如 ?id=thl08），需要从 users.json 里查找对应数据
    const id = params.get('id');
    if (id) {
        currentUserId = id;
        // 从服务器加载 users.json（加上时间戳避免缓存）
        fetch(DATA_URL + '?t=' + Date.now())
            .then(r => r.json())
            .then(data => {
                if (data && data[id]) {
                    // 找到了对应数据，填充到 currentConfig
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
                    // 没找到，重置为占位符，保持无效状态
                    currentConfig = { cardId: "--------", name: "--", stuId: "--", department: "--", major: "--", gradYear: "--" };
                    renderDomData();
                }
            })
            .catch(() => {
                // 网络错误或文件不存在，也重置
                currentConfig = { cardId: "--------", name: "--", stuId: "--", department: "--", major: "--", gradYear: "--" };
                renderDomData();
            });
    }
}

// ──────────────────────────────────────────
// 模块9：控制台功能（随机生成、生成链接等）
// ──────────────────────────────────────────

// 随机生成一组完整的校友数据，并填入控制台表单
function generateRandomStuId() {
    // 随机入学年份（2016-2020）
    const startYear = Math.floor(Math.random() * (2020 - 2016 + 1)) + 2016;
    // 随机选择一个专业
    const randomMajorMeta = jcMajorDatabase[Math.floor(Math.random() * jcMajorDatabase.length)];
    // 随机班级号（01-03）
    const classNum = String(Math.floor(Math.random() * 3) + 1).padStart(2, '0');
    // 随机座位号（01-40）
    const seatNum = String(Math.floor(Math.random() * 40) + 1).padStart(2, '0');
    
    // 拼接学号：年份 + 专业代码 + 班级 + 座位号
    const finalStuId = `${startYear}${randomMajorMeta.code}${classNum}${seatNum}`;
    // 毕业年份 = 入学年份 + 4
    const gradYear = startYear + 4;
    // 随机姓名
    const randomName = firstNames[Math.floor(Math.random() * firstNames.length)] + lastNames[Math.floor(Math.random() * lastNames.length)];

    // 填入表单
    document.getElementById('i-stuId').value = finalStuId;
    document.getElementById('i-name').value = randomName;
    document.getElementById('i-department').value = randomMajorMeta.dept;
    document.getElementById('i-major').value = randomMajorMeta.major;
    document.getElementById('i-gradYear').value = gradYear;
    // 随机生成一个卡号
    document.getElementById('i-cardId').value = `JCCUT${startYear}0${Math.floor(Math.random() * 80) + 10}`;
}

// 生成独立链接 + JSON 代码，复制到剪贴板
function generateStandaloneUrl() {
    // 读取表单里的值
    const cfg = {
        cardId: document.getElementById('i-cardId').value.trim(),
        name: document.getElementById('i-name').value.trim(),
        stuId: document.getElementById('i-stuId').value.trim(),
        department: document.getElementById('i-department').value.trim(),
        major: document.getElementById('i-major').value.trim(),
        gradYear: document.getElementById('i-gradYear').value.trim()
    };

    // 简单校验：姓名和学号不能为空
    if (!cfg.name || !cfg.stuId) {
        alert('数据校验错误：姓名和学号不能为空！');
        return;
    }

    // 计算短ID：拼音缩写 + 学号后两位
    const initials = getChinesePinyinInitials(cfg.name);
    const lastTwoDigits = cfg.stuId.length >= 2 ? cfg.stuId.slice(-2) : "00";
    const computedId = initials + lastTwoDigits;

    // 构建短链接
    const standaloneUrl = window.location.origin + window.location.pathname + '?id=' + computedId;

    // 构建可直接粘贴到 users.json 的代码段
    const jsonTemplate = `"${computedId}": {\n    "name": "${cfg.name}",\n    "stuId": "${cfg.stuId}",\n    "cardId": "${cfg.cardId}",\n    "department": "${cfg.department}",\n    "major": "${cfg.major}",\n    "gradYear": "${cfg.gradYear}"\n  }`;

    // 合并成要复制的内容
    const clipboardText = `专属独立链接：\n${standaloneUrl}\n\n---------------------------\n可直接追加粘贴到 users.json 的免排版代码：\n\n  ${jsonTemplate},`;

    // 复制到剪贴板
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(clipboardText).then(() => {
            alert(`🎉 生成成功！\n\n1. 短ID已计算为：${computedId}\n2. 链接及 JSON 代码已复制到剪贴板。\n请先将 JSON 粘贴到 users.json，再手动访问短链接。`);
            // 更新当前预览
            currentConfig = cfg;
            isCardDataValid = true;
            renderDomData();
        }).catch(() => {
            // 复制失败时的备用方案
            prompt('自动复制失败，请手动复制以下内容：', clipboardText);
        });
    } else {
        prompt('请手动复制以下内容：', clipboardText);
    }
}

// 关闭控制台
function closePanel() {
    document.getElementById('adminPanel').classList.remove('active');
}

// ──────────────────────────────────────────
// 模块10：三指手势识别 + 密码验证
// 监听页面顶部的触摸事件
// ──────────────────────────────────────────
document.getElementById('gestureArea').addEventListener('touchstart', (e) => {
    // 判断是否为三指同时触摸
    if (e.touches.length == 3) {
        // 弹出密码输入框
        const pwd = prompt('请输入控制台密码：');
        if (pwd === CONTROL_PASSWORD) {
            // 密码正确，打开控制台
            document.getElementById('adminPanel').classList.add('active');
            syncConfigToInputs();   // 把当前卡片数据同步到表单
        } else if (pwd !== null) {
            // 密码错误（null 表示用户点了取消）
            alert('密码错误，无法打开控制台');
        }
    }
});

// ──────────────────────────────────────────
// 模块11：北京时间实时时钟
// 页面底部的时间栏，每秒钟更新一次
// ──────────────────────────────────────────
function runClock() {
    const now = new Date();
    // 转换为 UTC 毫秒数
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    // 北京时间 = UTC + 8小时
    const bj = new Date(utc + (3600000 * 8));
    // 拼接显示字符串
    document.getElementById('live-clock-bar').innerText =
        `当前时间：${bj.getFullYear()}年${String(bj.getMonth()+1).padStart(2,'0')}月${String(bj.getDate()).padStart(2,'0')}日 ${String(bj.getHours()).padStart(2,'0')}:${String(bj.getMinutes()).padStart(2,'0')}:${String(bj.getSeconds()).padStart(2,'0')}`;
}

// 手动刷新时间（用户点击“刷新”时调用）
function triggerManualRefresh() {
    runClock();
}

// ──────────────────────────────────────────
// 模块12：页面启动
// 以下代码在页面加载完成后自动执行
// ──────────────────────────────────────────
navigateToHome();           // 默认显示首页
parseUrlParams();           // 解析 URL 中的参数（如果有）
runClock();                 // 立即显示时间
setInterval(runClock, 1000); // 每 1000 毫秒（1秒）刷新一次时钟
