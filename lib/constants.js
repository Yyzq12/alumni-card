// 稳定配置集中放这里。
// 以后如果要改控制台密码、接口地址、默认常量，先看这个文件。
export const CONTROL_PASSWORD = "5499";
export const UPSTASH_URL = "https://becoming-trout-101437.upstash.io";
// 重要提醒：
// 这个 token 目前还在前端里，适合内测，不适合公开生产环境。
// 只要浏览器能拿到它，就等于暴露了 Redis 访问能力。
export const UPSTASH_TOKEN = "gQAAAAAAAYw9AAIgcDE2ZjBmNDdkMTIyZTU0MzFlOGNhNTlkYzk1OWU1OTBjOA";
