/* ==========================================
   荆楚理工学院 移动校园 - 核心逻辑脚本
   数据存储：Upstash Redis（云端）
   ========================================== */

const CONTROL_PASSWORD = "5499";

const UPSTASH_URL = "https://safe-drake-66708.upstash.io";
const UPSTASH_TOKEN = "gQAAAAAAAQSUAAIgcDI3MmM4Njc1OWU4NjQ0YTQ4YjExNTM3MjM3YTY4ZGY2OQ";

async function redis(command, ...args) {
    const url = `${UPSTASH_URL}/${command}/${args.join('/')}`;
    const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    if (!resp.ok) throw new Error('Redis error: ' + resp.status);
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

const firstNames = ["张","李","王","刘","陈","杨","赵","黄","周","吴","徐","孙","马","胡","郭","林"];
const lastNames = ["逸飞","梦溪","泽宇","梓涵","听风","晓静","嘉杰","雨桐","博远","子墨","瑞霖","思源","楚菁","雪珂","寒潞"];

let currentConfig = { cardId: "--------", name: "--", stuId: "--", department: "--", major: "--", gradYear: "--" };
let currentUserId = "";
let isCardDataValid = false;

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
        if (/[a-zA-Z]/.test(c)) r += c.toLowerCase();
        else r += m[c] || 'x';
    }
    return r || "uid";
}

function getDeviceId() {
    const k = 'did';
    let d = localStorage.getItem(k);
    if (!d) { d = 'D-' + Date.now() + '-' + Math.random().toString(36).substr(2,6); localStorage.setItem(k, d); }
    return d;
}

function showCard() {
    document.getElementById('page-home').style.display = 'none';
    document.getElementById('page-card').style.display = 'flex';
    document.getElementById('nav-title').innerText = '校友卡';
    document.getElementById('nav-back-btn').style.visibility = 'visible';
}

function showHome() {
    document.getElementById('page-card').style.display = 'none';
    document.getElementById('page-home').style.display = 'flex';
    document.getElementById('nav-title').innerText = '首页';
    document.getElementById('nav-back-btn').style.visibility = 'hidden';
}

async function tryNavigateToCard() {
    if (!isCardDataValid) { alert('链接无效，数据未加载。'); return; }
    const uid = currentUserId;
    const did = getDeviceId();
    try {
        const raw = await redis('GET', `user:${uid}`);
        if (!raw) { alert('校友卡不存在。'); return; }
        const u = JSON.parse(raw);
        if (u.activated) {
            if (u.deviceId !== did) { alert('已绑定其他设备。'); return; }
            showCard(); return;
        }
        if (confirm('首次激活，绑定此设备？')) {
            u.activated = true; u.deviceId = did;
            await redis('SET', `user:${uid}`, JSON.stringify(u));
            showCard();
        }
    } catch(e) { alert('网络错误'); }
}

async function resetDeviceLock() {
    const uid = currentUserId;
    if (!uid) return;
    try {
        const raw = await redis('GET', `user:${uid}`);
        if (raw) { const u = JSON.parse(raw); u.activated = false; u.deviceId = null; await redis('SET', `user:${uid}`, JSON.stringify(u)); }
        alert('已重置');
    } catch(e) { alert('失败'); }
    showHome();
    document.getElementById('adminPanel').classList.remove('active');
}

function render() {
    document.getElementById('v-cardId').innerText = currentConfig.cardId;
    document.getElementById('v-name').innerText = currentConfig.name;
    document.getElementById('v-stuId').innerText = currentConfig.stuId;
    document.getElementById('v-department').innerText = currentConfig.department;
    document.getElementById('v-major').innerText = currentConfig.major;
    document.getElementById('v-gradYear').innerText = currentConfig.gradYear;
}

function sync() {
    document.getElementById('i-cardId').value = currentConfig.cardId === "--------" ? "" : currentConfig.cardId;
    document.getElementById('i-name').value = currentConfig.name === "--" ? "" : currentConfig.name;
    document.getElementById('i-stuId').value = currentConfig.stuId === "--" ? "" : currentConfig.stuId;
    document.getElementById('i-department').value = currentConfig.department === "--" ? "" : currentConfig.department;
    document.getElementById('i-major').value = currentConfig.major === "--" ? "" : currentConfig.major;
    document.getElementById('i-gradYear').value = currentConfig.gradYear === "--" ? "" : currentConfig.gradYear;
}

async function load() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return;
    currentUserId = id;
    try {
        const raw = await redis('GET', `user:${id}`);
        if (raw) {
            const u = JSON.parse(raw);
            currentConfig = { cardId: u.cardId||"", name: u.name||"", stuId: u.stuId||"", department: u.department||"", major: u.major||"", gradYear: u.gradYear||"" };
            isCardDataValid = true;
            render();
            sync();
        }
    } catch(e) { console.error(e); }
}

function random() {
    const y = Math.floor(Math.random()*5)+2016;
    const m = jcMajorDatabase[Math.floor(Math.random()*jcMajorDatabase.length)];
    const sid = `${y}${m.code}${String(Math.floor(Math.random()*3)+1).padStart(2,'0')}${String(Math.floor(Math.random()*40)+1).padStart(2,'0')}`;
    document.getElementById('i-stuId').value = sid;
    document.getElementById('i-name').value = firstNames[Math.floor(Math.random()*firstNames.length)] + lastNames[Math.floor(Math.random()*lastNames.length)];
    document.getElementById('i-department').value = m.dept;
    document.getElementById('i-major').value = m.major;
    document.getElementById('i-gradYear').value = y+4;
    document.getElementById('i-cardId').value = `JCCUT${y}0${Math.floor(Math.random()*80)+10}`;
}

async function generate() {
    const c = {
        cardId: document.getElementById('i-cardId').value.trim(),
        name: document.getElementById('i-name').value.trim(),
        stuId: document.getElementById('i-stuId').value.trim(),
        department: document.getElementById('i-department').value.trim(),
        major: document.getElementById('i-major').value.trim(),
        gradYear: document.getElementById('i-gradYear').value.trim()
    };
    if (!c.name || !c.stuId) { alert('姓名和学号必填'); return; }
    const id = getChinesePinyinInitials(c.name) + c.stuId.slice(-2);
    const url = window.location.origin + window.location.pathname.replace(/\/$/,'') + '?id=' + id;
    try {
        const exists = await redis('EXISTS', `user:${id}`);
        if (exists) { alert('短ID已存在'); return; }
        await redis('SET', `user:${id}`, JSON.stringify({...c, activated: false, deviceId: null, createdAt: Date.now()}));
        currentConfig = c; currentUserId = id; isCardDataValid = true; render();
        try { await navigator.clipboard.writeText(url); alert('✅ 成功！链接已复制。'); }
        catch(e) { prompt('请手动复制：', url); }
    } catch(e) { alert('保存失败：' + e.message); }
}

async function list() {
    try {
        const keys = await redis('KEYS', 'user:*');
        if (!keys || !keys.length) { alert('暂无数据，请先生成校友卡。'); return; }
        const vals = await redis('MGET', ...keys);
        let t = `共${keys.length}条：\n\n`;
        keys.forEach((k,i) => { const u = JSON.parse(vals[i]||'{}'); t += `${i+1}. ${u.name} ${u.stuId}\n   ID:${k.replace('user:','')} ${u.activated?'已激活':'未激活'}\n\n`; });
        alert(t);
    } catch(e) { alert('获取失败：' + e.message); }
}

async function del() {
    const id = prompt('输入要删除的短ID:');
    if (!id) return;
    if (!confirm('确认删除 '+id+' ?')) return;
    try { await redis('DEL', `user:${id}`); alert('已删除'); }
    catch(e) { alert('失败'); }
}

function closePanel() { document.getElementById('adminPanel').classList.remove('active'); }

document.getElementById('gestureArea').addEventListener('touchstart', e => {
    if (e.touches.length === 3) {
        const p = prompt('密码:');
        if (p === CONTROL_PASSWORD) { document.getElementById('adminPanel').classList.add('active'); sync(); }
        else if (p !== null) alert('密码错误');
    }
});

function clock() {
    const d = new Date();
    const bj = new Date(d.getTime() + d.getTimezoneOffset()*60000 + 28800000);
    document.getElementById('live-clock-bar').innerText = `当前时间：${bj.getFullYear()}年${String(bj.getMonth()+1).padStart(2,'0')}月${String(bj.getDate()).padStart(2,'0')}日 ${String(bj.getHours()).padStart(2,'0')}:${String(bj.getMinutes()).padStart(2,'0')}:${String(bj.getSeconds()).padStart(2,'0')}`;
}

showHome();
load();
clock();
setInterval(clock, 1000);
