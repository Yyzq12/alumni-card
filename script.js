/* ==========================================
   荆楚理工学院 移动校园 - 核心逻辑脚本
   数据存储：Upstash Redis（云端）
   功能：校友卡管理、设备锁、控制台增删查
   更新时间：2026年
   ========================================== */

// ╔══════════════════════════════════════════╗
// ║  模块 1：配置区（需要修改时只改这里）      ║
// ╚══════════════════════════════════════════╝

// 控制台密码（三指触摸后输入此密码才能进入管理面板）
// 修改方法：把 "5499" 改成你自己的4位数字密码即可
const CONTROL_PASSWORD = "5499";

// Upstash Redis 连接信息（数据库地址和密钥）
// ⚠️ 重要：如果不小心重置了数据库，只需要更新下面两行
const UPSTASH_URL = "https://becoming-trout-101437.upstash.io";
const UPSTASH_TOKEN = "gQAAAAAAAYw9AAIgcDE2ZjBmNDdkMTIyZTU0MzFlOGNhNTlkYzk1OWU1OTBjOA";

/**
 * Redis 通用请求函数
 * 作用：和 Upstash 云端数据库通信，执行增删查改操作
 * @param {string} command - Redis 命令（如 GET、SET、DEL、KEYS、EXISTS）
 * @param  {...string} args - 命令参数
 * @returns 返回数据库的查询结果
 */
async function redis(command, ...args) {
    const url = `${UPSTASH_URL}/${command}/${args.join('/')}`;
    const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    if (!resp.ok) throw new Error('Redis error: ' + resp.status);
    const data = await resp.json();
    return data.result;
}

// ╔══════════════════════════════════════════╗
// ║  模块 2：数据库（院系专业、随机姓名）      ║
// ╚══════════════════════════════════════════╝

// 院系专业数据库（随机生成时从这里抽取）
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

// 随机姓名的"姓"库（可自行增删）
const firstNames = ["张","李","王","刘","陈","杨","赵","黄","周","吴","徐","孙","马","胡","郭","林"];

// 随机姓名的"名"库（可自行增删）
const lastNames = ["逸飞","梦溪","泽宇","梓涵","听风","晓静","嘉杰","雨桐","博远","子墨","瑞霖","思源","楚菁","雪珂","寒潞"];

// ╔══════════════════════════════════════════╗
// ║  模块 3：全局状态（当前显示的校友信息）    ║
// ╚══════════════════════════════════════════╝

// 当前校友卡上显示的信息（初始值为占位符）
let currentConfig = { 
    cardId: "--------",
    name: "--",
    stuId: "--",
    department: "--",
    major: "--",
    gradYear: "--"
};

// 当前校友的短ID（从 URL 参数 ?id=xxx 中读取）
let currentUserId = "";

// 标记当前链接是否有效（true=有效，false=无效）
let isCardDataValid = false;

// ╔══════════════════════════════════════════╗
// ║  模块 4：拼音算法（中文姓名→拼音首字母）    ║
// ╚══════════════════════════════════════════╝

/**
 * 把中文姓名转成拼音首字母缩写
 * 例如："唐海林" → "thl"、"张逸飞" → "zyf"
 */
function getChinesePinyinInitials(str) {
    if (!str) return "user";
    
    const m = {
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
    for (let c of str) {
        if (/[a-zA-Z]/.test(c)) {
            r += c.toLowerCase();
        } else {
            r += m[c] || 'x';
        }
    }
    return r || "uid";
}

// ╔══════════════════════════════════════════╗
// ║  模块 5：设备锁（防止一个链接多人使用）    ║
// ╚══════════════════════════════════════════╝

/**
 * 获取或创建当前设备的唯一ID
 * 原理：首次访问时生成一个随机码，存入浏览器本地存储
 */
function getDeviceId() {
    const k = 'did';
    let d = localStorage.getItem(k);
    if (!d) {
        d = 'D-' + Date.now() + '-' + Math.random().toString(36).substr(2,6);
        localStorage.setItem(k, d);
    }
    return d;
}

// ╔══════════════════════════════════════════╗
// ║  模块 6：页面导航（首页↔校友卡页面）       ║
// ╚══════════════════════════════════════════╝

// 显示校友卡页面（隐藏首页）
function showCard() {
    document.getElementById('page-home').style.display = 'none';
    document.getElementById('page-card').style.display = 'flex';
    document.getElementById('nav-title').innerText = '校友卡';
    document.getElementById('nav-back-btn').style.visibility = 'visible';
}

// 显示首页（隐藏校友卡页面）
function showHome() {
    document.getElementById('page-card').style.display = 'none';
    document.getElementById('page-home').style.display = 'flex';
    document.getElementById('nav-title').innerText = '首页';
    document.getElementById('nav-back-btn').style.visibility = 'hidden';
}

/**
 * 点击首页热区时触发：验证设备是否有权查看校友卡
 */
async function tryNavigateToCard() {
    if (!isCardDataValid) {
        alert(
            '📭 暂未识别到您的校友信息\n\n' +
            '可能的原因：\n' +
            '① 链接不完整或已失效\n' +
            '② 该校友信息尚未录入系统\n' +
            '③ 网络不稳定导致加载失败\n\n' +
            '💡 解决方法：\n' +
            '请确认您使用的是完整链接\n' +
            '请核实校友信息是否已录入。'
        );
        return;
    }

    const uid = currentUserId;
    const did = getDeviceId();

    try {
        const raw = await redis('GET', `user:${uid}`);
        if (!raw) {
            alert(
                '🔍 未找到该校友卡\n\n' +
                '该链接对应的校友信息不存在。\n\n' +
                '💡 可能原因：\n' +
                '① 链接输入有误\n' +
                '② 校友信息已被管理员删除\n\n' +
                '请重新确认链接。'
            );
            return;
        }

        const u = JSON.parse(raw);

        if (u.activated) {
            if (u.deviceId !== did) {
                alert(
                    '🔒 设备验证失败\n\n' +
                    '该校友卡已在其他设备上激活绑定。\n' +
                    '为保障校友信息安全，一个链接仅限一台设备使用。\n\n' +
                    '💡 如需更换设备，请联系管理员重置绑定。'
                );
                return;
            }
            showCard();
            return;
        }

        if (confirm(
            '🎓 欢迎使用校友卡\n\n' +
            '这是您首次在此设备上打开该链接。\n\n' +
            '📌 设备绑定说明：\n' +
            '点击"确定"后，此校友卡将与当前设备绑定。\n' +
            '绑定后仅限本设备查看，其他设备无法打开。\n\n' +
            '如需更换设备，可联系管理员解除绑定。\n\n' +
            '确认绑定此设备吗？'
        )) {
            u.activated = true;
            u.deviceId = did;
            await redis('SET', `user:${uid}`, JSON.stringify(u));
            showCard();
        }
    } catch (e) {
        console.error('设备锁验证失败:', e);
        alert(
            '🌐 网络连接异常\n\n' +
            '无法连接到服务器验证您的身份。\n\n' +
            '💡 请检查：\n' +
            '① 手机网络是否正常\n' +
            '② 是否处于信号较弱的环境\n\n' +
            '确认网络正常后，请刷新页面重试。'
        );
    }
}

/**
 * 重置设备锁（管理员在控制台使用）
 */
async function resetDeviceLock() {
    const uid = currentUserId;
    if (!uid) {
        alert('未检测到当前校友信息，请先通过链接加载校友数据。');
        return;
    }

    try {
        const raw = await redis('GET', `user:${uid}`);
        if (raw) {
            const u = JSON.parse(raw);
            u.activated = false;
            u.deviceId = null;
            await redis('SET', `user:${uid}`, JSON.stringify(u));
        }
        alert(`✅ 已成功解除 [${uid}] 的设备锁！\n\n下次打开链接将重新弹出激活确认。`);
    } catch (e) {
        alert('重置失败，请稍后重试。');
    }

    showHome();
    document.getElementById('adminPanel').classList.remove('active');
}

// ╔══════════════════════════════════════════╗
// ║  模块 7：数据渲染（更新页面上的信息）      ║
// ╚══════════════════════════════════════════╝

// 把 currentConfig 中的数据更新到校友卡上
function render() {
    document.getElementById('v-cardId').innerText = currentConfig.cardId;
    document.getElementById('v-name').innerText = currentConfig.name;
    document.getElementById('v-stuId').innerText = currentConfig.stuId;
    document.getElementById('v-department').innerText = currentConfig.department;
    document.getElementById('v-major').innerText = currentConfig.major;
    document.getElementById('v-gradYear').innerText = currentConfig.gradYear;
}

// 把 currentConfig 中的数据同步到控制台的输入框里
function sync() {
    document.getElementById('i-cardId').value = currentConfig.cardId === "--------" ? "" : currentConfig.cardId;
    document.getElementById('i-name').value = currentConfig.name === "--" ? "" : currentConfig.name;
    document.getElementById('i-stuId').value = currentConfig.stuId === "--" ? "" : currentConfig.stuId;
    document.getElementById('i-department').value = currentConfig.department === "--" ? "" : currentConfig.department;
    document.getElementById('i-major').value = currentConfig.major === "--" ? "" : currentConfig.major;
    document.getElementById('i-gradYear').value = currentConfig.gradYear === "--" ? "" : currentConfig.gradYear;
}

// ╔══════════════════════════════════════════╗
// ║  模块 8：URL 参数解析（从链接中读取数据）   ║
// ╚══════════════════════════════════════════╝

/**
 * 页面加载时自动执行
 * 读取 URL 中的 ?id=xxx 参数，从云端加载对应的校友数据
 */
async function load() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;

    currentUserId = id;

    try {
        const raw = await redis('GET', `user:${id}`);
        if (raw) {
            const u = JSON.parse(raw);
            currentConfig = {
                cardId: u.cardId || "",
                name: u.name || "",
                stuId: u.stuId || "",
                department: u.department || "",
                major: u.major || "",
                gradYear: u.gradYear || ""
            };
            isCardDataValid = true;
            render();
            sync();
        }
    } catch (e) {
        console.error('从云端加载数据失败:', e);
    }
}

// ╔══════════════════════════════════════════╗
// ║  模块 9：控制台功能（增删查改）            ║
// ╚══════════════════════════════════════════╝

/**
 * 【🎲 随机生成】功能
 * 随机生成一组完整的校友信息，并填入控制台表单
 */
function random() {
    const y = Math.floor(Math.random() * 5) + 2016;
    const m = jcMajorDatabase[Math.floor(Math.random() * jcMajorDatabase.length)];
    const sid = `${y}${m.code}${String(Math.floor(Math.random()*3)+1).padStart(2,'0')}${String(Math.floor(Math.random()*40)+1).padStart(2,'0')}`;
    const rname = firstNames[Math.floor(Math.random()*firstNames.length)] + lastNames[Math.floor(Math.random()*lastNames.length)];

    document.getElementById('i-stuId').value = sid;
    document.getElementById('i-name').value = rname;
    document.getElementById('i-department').value = m.dept;
    document.getElementById('i-major').value = m.major;
    document.getElementById('i-gradYear').value = y + 4;
    document.getElementById('i-cardId').value = `JCCUT${y}0${Math.floor(Math.random() * 80) + 10}`;
}

/**
 * 【🚀 生成并复制链接】功能
 * 先同步复制链接，再异步保存到云端
 */
function generate() {
    // 读取表单数据
    const c = {
        cardId: document.getElementById('i-cardId').value.trim(),
        name: document.getElementById('i-name').value.trim(),
        stuId: document.getElementById('i-stuId').value.trim(),
        department: document.getElementById('i-department').value.trim(),
        major: document.getElementById('i-major').value.trim(),
        gradYear: document.getElementById('i-gradYear').value.trim()
    };

    if (!c.name || !c.stuId) {
        alert('⚠️ 姓名和学号不能为空！');
        return;
    }

    // 计算短ID和链接（同步）
    const id = getChinesePinyinInitials(c.name) + c.stuId.slice(-2);
    const url = window.location.origin + window.location.pathname.replace(/\/$/, '') + '?id=' + id;

    // 🔧 第一步：同步复制链接
    let copied = false;
    try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        copied = true;
    } catch(e) {}

    if (!copied) {
        try {
            navigator.clipboard.writeText(url);
            copied = true;
        } catch(e) {}
    }

    // 🔧 第二步：异步保存到云端（不阻塞复制）
    (async () => {
        try {
            const exists = await redis('EXISTS', `user:${id}`);
            if (exists) {
                alert(`⚠️ 短ID "${id}" 已存在。\n\n链接已复制，但无法重复保存。`);
                return;
            }
            await redis('SET', `user:${id}`, JSON.stringify({
                ...c,
                activated: false,
                deviceId: null,
                createdAt: Date.now()
            }));
            currentConfig = c;
            currentUserId = id;
            isCardDataValid = true;
            render();
            alert(`🎉 生成成功！\n\n短ID：${id}\n链接已复制到剪贴板。`);
        } catch (e) {
            alert('⚠️ 云端保存失败，但链接已复制。\n\n错误：' + e.message);
        }
    })();

    // 先反馈复制结果
    if (copied) {
        alert('✅ 链接已复制到剪贴板！\n\n正在后台保存...');
    } else {
        prompt('请手动复制以下链接：', url);
    }
}

/**
 * 【📋 查看所有校友】功能
 * 只显示姓名、短ID、激活状态
 */
async function list() {
    try {
        const keys = await redis('KEYS', 'user:*');
        if (!keys || keys.length === 0) {
            alert('📭 暂无校友数据。\n\n请先生成校友卡后再查看。');
            return;
        }

        const vals = await redis('MGET', ...keys);
        
        let t = `📋 共 ${keys.length} 位校友：\n\n`;
        keys.forEach((k, i) => {
            const u = JSON.parse(vals[i] || '{}');
            t += `${i + 1}. ${u.name}\n`;
            t += `   短ID: ${k.replace('user:', '')}\n`;
            t += `   状态: ${u.activated ? '✅ 已激活' : '⏳ 未激活'}\n\n`;
        });
        
        alert(t);
    } catch (e) {
        alert('❌ 获取列表失败：' + e.message);
    }
}

/**
 * 【🗑️ 删除校友】功能
 */
async function del() {
    const id = prompt('请输入要删除的校友短ID：\n（例如：thl08）');
    if (!id) return;

    if (!confirm(`⚠️ 确认删除校友 "${id}" 吗？\n\n此操作不可恢复！`)) return;

    try {
        const exists = await redis('EXISTS', `user:${id}`);
        if (!exists) {
            alert(`❌ 校友 "${id}" 不存在。`);
            return;
        }

        await redis('DEL', `user:${id}`);
        alert(`✅ 校友 "${id}" 已成功删除。`);
    } catch (e) {
        alert('❌ 删除失败：' + e.message);
    }
}

// 关闭控制台面板
function closePanel() {
    document.getElementById('adminPanel').classList.remove('active');
}

// ╔══════════════════════════════════════════╗
// ║  模块 10：三指手势 + 密码验证            ║
// ╚══════════════════════════════════════════╝

document.getElementById('gestureArea').addEventListener('touchstart', (e) => {
    if (e.touches.length === 3) {
        const p = prompt('🔐 请输入控制台密码：');
        if (p === CONTROL_PASSWORD) {
            document.getElementById('adminPanel').classList.add('active');
            sync();
        } else if (p !== null) {
            alert('❌ 密码错误，无法打开控制台');
        }
    }
});

// ╔══════════════════════════════════════════╗
// ║  模块 11：北京时间实时时钟               ║
// ╚══════════════════════════════════════════╝

function clock() {
    const d = new Date();
    const bj = new Date(d.getTime() + d.getTimezoneOffset() * 60000 + 28800000);
    document.getElementById('live-clock-bar').innerText = 
        `当前时间：${bj.getFullYear()}年${String(bj.getMonth() + 1).padStart(2, '0')}月${String(bj.getDate()).padStart(2, '0')}日 ${String(bj.getHours()).padStart(2, '0')}:${String(bj.getMinutes()).padStart(2, '0')}:${String(bj.getSeconds()).padStart(2, '0')}`;
}

function triggerManualRefresh() {
    clock();
}

// ╔══════════════════════════════════════════╗
// ║  模块 12：页面启动（自动执行）            ║
// ╚══════════════════════════════════════════╝

showHome();
load();
clock();
setInterval(clock, 1000);
