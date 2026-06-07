/* ==========================================
   荆楚理工学院 移动校园 - 样式表（完整修复版）
   包含：基础样式、导航栏、校友卡、控制台、自定义弹窗
   ========================================== */

/* ---------- 全局重置 ---------- */
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
}

body {
    background-color: #EDEBE9;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    position: relative;
}

.wx-container {
    width: 100%;
    max-width: 414px;
    background-color: #F7F7F7;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    position: relative;
}

/* ---------- 顶部导航栏 ---------- */
.wx-nav {
    width: 100%;
    padding-top: max(12px, env(safe-area-inset-top, 12px));
    height: calc(48px + max(12px, env(safe-area-inset-top, 12px)));
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-left: 16px;
    padding-right: 16px;
    color: #FFF;
    font-size: 16px;
    font-weight: bold;
    background-color: #A82E2E;
    position: relative;
    z-index: 100;
}

.wx-capsule {
    background: rgba(0, 0, 0, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    padding: 5px 12px;
    display: flex;
    gap: 12px;
    font-size: 14px;
    align-items: center;
}

.admin-trigger {
    position: fixed;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 414px;
    height: calc(48px + max(12px, env(safe-area-inset-top, 12px)));
    cursor: pointer;
    z-index: 99999;
    user-select: none;
    background: transparent;
}

/* ---------- 首页 ---------- */
#page-home {
    width: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    background: #FFF;
    min-height: calc(100vh - 48px - max(12px, env(safe-area-inset-top, 12px)));
    padding-bottom: 80px;
}

.home-mock-bg {
    width: 100%;
    display: block;
    object-fit: contain;
}

.hotspot-alumni-card {
    position: absolute;
    top: 35%;
    left: 25%;
    width: 20%;
    height: 15%;
    cursor: pointer;
    z-index: 50;
}

/* ---------- 校友卡页面 ---------- */
#page-card {
    width: 100%;
    display: none;
    flex-direction: column;
    align-items: center;
}

.alumni-card {
    width: calc(100% - 24px);
    height: 220px;
    background-color: #BD262A;
    background-image: url('card-bg.png');
    background-size: 100% 100%;
    background-repeat: no-repeat;
    border-radius: 12px;
    overflow: hidden;
    margin-top: 14px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.08);
    position: relative;
}

.card-top-area {
    position: relative;
    width: 100%;
    height: calc(100% - 38px);
}

.card-serial {
    position: absolute;
    top: 16px;
    right: 20px;
    font-size: 13px;
    font-family: "Courier New", Courier, monospace;
    font-weight: bold;
    color: rgba(255,255,255,0.9);
}

.info-fields {
    position: absolute;
    top: 26px;
    left: 109px;
    display: flex;
    flex-direction: column;
    gap: 2.5px;
}

.info-row {
    display: flex;
    align-items: center;
    height: 19px;
    line-height: 19px;
}

.info-label {
    font-size: 14.5px;
    color: rgba(255,255,255,0.95);
    white-space: nowrap;
}

.info-value {
    font-size: 14.5px;
    color: #FFF !important;
    white-space: nowrap;
}

.card-gold-strip {
    height: 38px;
    width: 100%;
    position: absolute;
    bottom: 0;
    left: 0;
    display: flex;
    align-items: center;
    padding-left: 20px;
    font-size: 11px;
    color: #8A1A1D;
    font-weight: bold;
}

/* ---------- 二维码面板 ---------- */
.white-panel {
    width: calc(100% - 24px);
    background: #FFF;
    border-radius: 12px;
    margin-top: 14px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 2px 10px rgba(0,0,0,0.04);
}

.qr-header-title {
    font-size: 15px;
    color: #333;
    margin-bottom: 18px;
    font-weight: bold;
}

.qr-box-border {
    width: 205px;
    height: 205px;
    background: #FFF;
    border: 1px solid #E5E5E5;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
}

.qr-box-border img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.refresh-lnk {
    margin-top: 14px;
    color: #999;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
}

.live-timer-container {
    width: 100%;
    background-color: #5C1315;
    color: #FFF;
    text-align: center;
    padding: 13px 0;
    border-radius: 16px;
    margin-top: 24px;
    font-weight: bold;
}

/* ---------- 控制台面板 ---------- */
.admin-panel {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.96);
    z-index: 100000;
    padding: 20px;
    color: #fff;
    overflow-y: auto;
}

.admin-panel.active {
    display: block;
}

.admin-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.form-group {
    margin-bottom: 12px;
}
.form-group label {
    display: block;
    font-size: 12px;
    margin-bottom: 4px;
    color: #ccc;
}
.form-group input {
    width: 100%;
    height: 38px;
    border: none;
    border-radius: 4px;
    padding: 0 10px;
    font-size: 14px;
    color: #333;
    outline: none;
}

.panel-btn {
    width: 100%;
    height: 44px;
    background: #C9262B;
    color: #fff;
    border: none;
    border-radius: 4px;
    margin-top: 10px;
    font-weight: bold;
    font-size: 14px;
    cursor: pointer;
}

.random-badge-btn-block {
    width: 100%;
    height: 44px;
    background: #5C1315;
    color: #fff;
    border: 1px solid #C9262B;
    border-radius: 4px;
    margin-top: 15px;
    font-weight: bold;
    font-size: 14px;
    cursor: pointer;
}

/* ---------- 骨架屏 ---------- */
.skeleton {
    background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.2s infinite;
    border-radius: 4px;
    color: transparent !important;
    user-select: none;
    min-width: 4em;
    display: inline-block;
}
@keyframes skeleton-loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

/* ---------- 刷新按钮旋转 ---------- */
.refresh-lnk.rotating {
    animation: rotate360 0.5s ease-in-out;
}
@keyframes rotate360 {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

/* ---------- 自定义弹窗（Toast & Modal） ---------- */
.custom-toast {
    position: fixed;
    bottom: 20%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.85);
    color: #fff;
    padding: 10px 20px;
    border-radius: 30px;
    font-size: 14px;
    z-index: 100001;
    white-space: nowrap;
    animation: fadeInUp 0.2s ease;
}
.custom-toast.fade-out {
    animation: fadeOutDown 0.2s forwards;
}
@keyframes fadeInUp {
    from { opacity: 0; transform: translateX(-50%) translateY(10px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
@keyframes fadeOutDown {
    from { opacity: 1; transform: translateX(-50%) translateY(0); }
    to { opacity: 0; transform: translateX(-50%) translateY(10px); }
}

.custom-modal-mask {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 100002;
}
.custom-modal-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 280px;
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    z-index: 100003;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
}
.custom-modal-header {
    background: #A82E2E;
    color: #fff;
    padding: 12px;
    text-align: center;
    font-weight: bold;
    font-size: 16px;
}
.custom-modal-body {
    padding: 20px;
    text-align: center;
    color: #333;
    font-size: 14px;
    line-height: 1.4;
}
.custom-modal-footer {
    display: flex;
    border-top: 1px solid #eee;
}
.custom-modal-btn {
    flex: 1;
    padding: 12px;
    border: none;
    background: #fff;
    font-size: 15px;
    cursor: pointer;
    transition: background 0.2s;
}
.custom-modal-btn.cancel {
    color: #999;
    border-right: 1px solid #eee;
}
.custom-modal-btn.confirm {
    color: #A82E2E;
    font-weight: bold;
}
.custom-modal-btn:active {
    background: #f5f5f5;
}

/* ---------- 辅助 ---------- */
.help-doc-box {
    background: rgba(255,255,255,0.08);
    border: 1px dashed rgba(255,255,255,0.2);
    padding: 14px;
    border-radius: 6px;
    margin-top: 20px;
    font-size: 12.5px;
    line-height: 1.6;
    color: #e0e0e0;
}
.help-doc-box h4 {
    color: #ff9f43;
    margin-bottom: 8px;
    font-size: 14px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    padding-bottom: 4px;
}
.help-doc-box ul, .help-doc-box ol {
    padding-left: 18px;
    margin-bottom: 12px;
}
.code-mark {
    font-family: monospace;
    background: rgba(0,0,0,0.4);
    padding: 1px 4px;
    border-radius: 3px;
    color: #28a745;
    margin: 0 2px;
}

/* ---------- 响应式 ---------- */
@media (max-width: 374px) {
    .info-label, .info-value { font-size: 13px; }
    .card-serial { font-size: 11px; }
    .white-panel { padding: 18px; }
}
@media (min-width: 415px) {
    body { background-color: #d0cfce; }
}