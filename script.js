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
 * 
 * 使用示例：
 *   redis('GET', 'user:thl08')        → 获取用户数据
 *   redis('SET', 'user:thl08', json)  → 保存用户数据
 *   redis('DEL', 'user:thl08')        → 删除用户
 *   redis('KEYS', 'user:*')           → 列出所有用户
 *   redis('EXISTS', 'user:thl08')     → 检查用户是否存在
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
// 增加新专业：照着格式添加一行即可
// { dept: "学院名", major: "专业名", code: "专业代码" }
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
    cardId: "--------",    // 右上角卡号
    name: "--",             // 姓名
    stuId: "--",            // 学号
    department: "--",       // 院系
    major: "--",            // 专业
    gradYear: "--"          // 毕业年份
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
 * 
 * @param {string} str - 中文姓名
 * @returns {string} 拼音首字母缩写
 */
function getChinesePinyinInitials(str) {
    if (!str) return "user";
    
    // 汉字→拼音首字母映射表（收录了常见姓氏和常用字）
    // 如果遇到没收录的字，会用 'x' 代替
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
            r += c.toLowerCase();      // 英文字母直接转小写
        } else {
            r += m[c] || 'x';          // 中文查找映射表，找不到用 'x'
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
 *       以后每次访问都读取这个码，用于识别设备
 * 
 * @returns {string} 设备唯一标识
 */
function getDeviceId() {
    const k = 'did';
    let d = localStorage.getItem(k);
    if (!d) {
        // 生成格式：D-时间戳-随机字符串
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
 * 
 * 流程：
 * 1. 检查当前链接是否有效
 * 2. 从云端查询校友数据
 * 3. 如果未激活 → 弹窗确认绑定设备
 * 4. 如果已激活 → 验证设备ID是否匹配
 * 5. 匹配成功 → 显示校友卡
 * 6. 匹配失败 → 提示"已绑定其他设备"
 */
async function tryNavigateToCard() {
    // 检查数据是否有效
    if (!isCardDataValid) {
        alert('链接无效，数据未加载。\n\n请确认链接是否正确，或联系管理员。');
        return;
    }

    const uid = currentUserId;   // 当前校友的短ID
    const did = getDeviceId();   // 当前设备的唯一ID

    try {
        // 从云端获取校友数据
        const raw = await redis('GET', `user:${uid}`);
        if (!raw) {
            alert('校友卡不存在。\n\n该链接可能已失效，请联系管理员。');
            return;
        }

        const u = JSON.parse(raw);

        // 情况1：已激活
        if (u.activated) {
            if (u.deviceId !== did) {
                // 设备ID不匹配 → 拦截
                alert('🔒 该校友卡已绑定其他设备。\n\n为保障安全，当前设备无法访问。');
                return;
            }
            // 设备匹配 → 直接进入
            showCard();
            return;
        }

        // 情况2：未激活 → 询问是否绑定
        if (confirm('【首次激活】\n\n该校友卡尚未绑定设备。\n\n点击"确定"将与此设备永久绑定，\n绑定后其他设备无法使用此链接。\n\n确认进行绑定吗？')) {
            // 记录激活状态和设备ID
            u.activated = true;
            u.deviceId = did;
            await redis('SET', `user:${uid}`, JSON.stringify(u));
            showCard();
        }
        // 如果点取消，什么也不做，留在首页
    } catch (e) {
        console.error('设备锁验证失败:', e);
        alert('网络异常，无法验证设备身份。\n\n请检查网络连接后重试。');
    }
}

/**
 * 重置设备锁（管理员在控制台使用）
 * 作用：解除某个校友卡的设备绑定，允许换设备重新激活
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
            u.activated = false;     // 取消激活状态
            u.deviceId = null;        // 清除绑定的设备ID
            await redis('SET', `user:${uid}`, JSON.stringify(u));
        }
        alert(`✅ 已成功解除 [${uid}] 的设备锁！\n\n下次打开链接将重新弹出激活确认。`);
    } catch (e) {
        alert('重置失败，请稍后重试。');
    }

    // 返回首页并关闭控制台
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
 * 
 * 例如：
 *   ?id=thl08 → 从 Redis 查询 user:thl08 → 显示唐海林的校友卡
 *   ?id=hxx24 → 从 Redis 查询 user:hxx24 → 显示胡逸飞的校友卡
 */
async function load() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');      // 从 URL 中提取 id 参数
    if (!id) return;                  // 没有 id 参数，不做处理

    currentUserId = id;

    try {
        const raw = await redis('GET', `user:${id}`);
        if (raw) {
            // 找到了数据 → 更新到页面上
            const u = JSON.parse(raw);
            currentConfig = {
                cardId: u.cardId || "",
                name: u.name || "",
                stuId: u.stuId || "",
                department: u.department || "",
                major: u.major || "",
                gradYear: u.gradYear || ""
            };
            isCardDataValid = true;     // 标记为有效数据
            render();
            sync();
        }
        // 如果没找到数据，保持占位符状态（isCardDataValid = false）
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
 * 
 * 生成规则：
 * - 入学年份：2016-2020 随机
 * - 院系专业：从数据库随机抽取
 * - 班级号：01-03 随机
 * - 座位号：01-40 随机
 * - 姓名：从姓库和名库中随机组合
 * - 毕业年份 = 入学年份 + 4
 */
function random() {
    const y = Math.floor(Math.random() * 5) + 2016;                               // 随机入学年份
    const m = jcMajorDatabase[Math.floor(Math.random() * jcMajorDatabase.length)]; // 随机专业
    const sid = `${y}${m.code}${String(Math.floor(Math.random()*3)+1).padStart(2,'0')}${String(Math.floor(Math.random()*40)+1).padStart(2,'0')}`; // 学号
    const rname = firstNames[Math.floor(Math.random()*firstNames.length)] + lastNames[Math.floor(Math.random()*lastNames.length)]; // 姓名

    // 填入表单
    document.getElementById('i-stuId').value = sid;
    document.getElementById('i-name').value = rname;
    document.getElementById('i-department').value = m.dept;
    document.getElementById('i-major').value = m.major;
    document.getElementById('i-gradYear').value = y + 4;
    document.getElementById('i-cardId').value = `JCCUT${y}0${Math.floor(Math.random() * 80) + 10}`;
}

/**
 * 【🚀 生成并复制链接】功能
 * 将表单中的校友信息保存到云端，生成专属短链接并复制到剪贴板
 * 
 * 流程：
 * 1. 读取表单数据
 * 2. 计算短ID（拼音首字母 + 学号后两位）
 * 3. 检查短ID是否已存在
 * 4. 保存到云端 Redis
 * 5. 生成链接并复制到剪贴板
 */
async function generate() {
    // 读取表单数据
    const c = {
        cardId: document.getElementById('i-cardId').value.trim(),
        name: document.getElementById('i-name').value.trim(),
        stuId: document.getElementById('i-stuId').value.trim(),
        department: document.getElementById('i-department').value.trim(),
        major: document.getElementById('i-major').value.trim(),
        gradYear: document.getElementById('i-gradYear').value.trim()
    };

    // 校验：姓名和学号必填
    if (!c.name || !c.stuId) {
        alert('⚠️ 姓名和学号不能为空！');
        return;
    }

    // 计算短ID：拼音首字母缩写 + 学号最后两位
    const id = getChinesePinyinInitials(c.name) + c.stuId.slice(-2);
    
    // 构建专属链接
    const url = window.location.origin + window.location.pathname.replace(/\/$/, '') + '?id=' + id;

    try {
        // 检查短ID是否已存在
        const exists = await redis('EXISTS', `user:${id}`);
        if (exists) {
            alert(`⚠️ 短ID "${id}" 已存在。\n\n请更换姓名或学号后重试。`);
            return;
        }

        // 保存到云端（初始状态：未激活，未绑定设备）
        await redis('SET', `user:${id}`, JSON.stringify({
            ...c,
            activated: false,     // 未激活
            deviceId: null,       // 未绑定设备
            createdAt: Date.now() // 创建时间
        }));

        // 更新本地预览
        currentConfig = c;
        currentUserId = id;
        isCardDataValid = true;
        render();

        // 复制链接到剪贴板
        try {
            await navigator.clipboard.writeText(url);
            alert(`🎉 生成成功！\n\n短ID：${id}\n链接已自动复制到剪贴板。\n\n将链接发送给校友即可使用。`);
        } catch (e) {
            // 如果浏览器不支持自动复制，弹出手动复制框
            prompt('请手动复制以下链接：', url);
        }
    } catch (e) {
        console.error('保存失败:', e);
        alert('❌ 保存失败：' + e.message + '\n\n请检查网络连接后重试。');
    }
}

/**
 * 【📋 查看所有校友】功能
 * 从云端获取所有校友数据，以列表形式弹窗显示
 */
async function list() {
    try {
        // 获取所有 user:* 开头的 key
        const keys = await redis('KEYS', 'user:*');
        if (!keys || keys.length === 0) {
            alert('📭 暂无校友数据。\n\n请先生成校友卡后再查看。');
            return;
        }

        // 批量获取所有值
        const vals = await redis('MGET', ...keys);
        
        // 格式化显示
        let t = `📋 共 ${keys.length} 位校友：\n\n`;
        keys.forEach((k, i) => {
            const u = JSON.parse(vals[i] || '{}');
            t += `${i + 1}. ${u.name}（${u.stuId}）\n`;
            t += `   短ID: ${k.replace('user:', '')}\n`;
            t += `   院系: ${u.department} | 专业: ${u.major}\n`;
            t += `   毕业年份: ${u.gradYear}届\n`;
            t += `   状态: ${u.activated ? '✅ 已激活' : '⏳ 未激活'}\n`;
            t += `   卡号: ${u.cardId}\n\n`;
        });
        
        alert(t);
    } catch (e) {
        alert('❌ 获取列表失败：' + e.message);
    }
}

/**
 * 【🗑️ 删除校友】功能
 * 从云端删除指定短ID的校友数据
 */
async function del() {
    const id = prompt('请输入要删除的校友短ID：\n（例如：thl08）');
    if (!id) return;    // 用户点了取消

    if (!confirm(`⚠️ 确认删除校友 "${id}" 吗？\n\n此操作不可恢复！`)) return;

    try {
        // 检查是否存在
        const exists = await redis('EXISTS', `user:${id}`);
        if (!exists) {
            alert(`❌ 校友 "${id}" 不存在。`);
            return;
        }

        // 删除
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

// 监听页面顶部的三指触摸事件
document.getElementById('gestureArea').addEventListener('touchstart', (e) => {
    // 判断是否为三指同时触摸
    if (e.touches.length === 3) {
        const p = prompt('🔐 请输入控制台密码：');
        if (p === CONTROL_PASSWORD) {
            // 密码正确 → 打开控制台
            document.getElementById('adminPanel').classList.add('active');
            sync(); // 把当前卡片数据同步到控制台表单
        } else if (p !== null) {
            // 密码错误（null 表示用户点了取消，不提示）
            alert('❌ 密码错误，无法打开控制台');
        }
    }
});

// ╔══════════════════════════════════════════╗
// ║  模块 11：北京时间实时时钟               ║
// ╚══════════════════════════════════════════╝

/**
 * 更新页面底部的时间显示
 * 始终显示北京时间（UTC+8），每秒更新一次
 */
function clock() {
    const d = new Date();
    // 转换为北京时间（本地时间 + 时区偏移 + 8小时）
    const bj = new Date(d.getTime() + d.getTimezoneOffset() * 60000 + 28800000);
    
    // 格式化显示：2026年06月07日 14:30:25
    document.getElementById('live-clock-bar').innerText = 
        `当前时间：${bj.getFullYear()}年${String(bj.getMonth() + 1).padStart(2, '0')}月${String(bj.getDate()).padStart(2, '0')}日 ${String(bj.getHours()).padStart(2, '0')}:${String(bj.getMinutes()).padStart(2, '0')}:${String(bj.getSeconds()).padStart(2, '0')}`;
}

// 手动刷新时间（点击页面上的"刷新"按钮时调用）
function triggerManualRefresh() {
    clock();
}

// ╔══════════════════════════════════════════╗
// ║  模块 12：页面启动（自动执行）            ║
// ╚══════════════════════════════════════════╝

showHome();                          // 默认显示首页
load();                              // 解析 URL 参数，加载校友数据
clock();                             // 立即显示时间
setInterval(clock, 1000);            // 每秒刷新一次时钟
