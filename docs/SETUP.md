# 测试网接入

当前网站默认是明确标注的交互演示。演示数据只在当前会话内存中存在，刷新清空。它不会上传 Filecoin、调用 Lit 或发送链上交易。真实模式不会在配置缺失时静默退回演示。

## 1. 部署 Base Sepolia 合约

准备一个仅用于测试网的钱包，领取测试 ETH。禁止使用持有真实资产的钱包私钥。

在自己的本地终端，通过环境变量设置 `DEPLOYER_PRIVATE_KEY`，不要写进源码、Git、聊天或命令历史。运行 `npm run contracts:compile` 和 `npm run deploy:testnet`。脚本强制检查 chain ID 为 84532。

将脚本输出的 `CARDLANE_TOKEN`、`CARDLANE_CONTRACT` 和 `CARDLANE_ARBITER` 设置为网站运行时变量。默认部署者为仲裁地址。合约仅接收自行部署的无价值 testUSDC。

仲裁地址调用 `setSeller(address, true)` 授权卖家。初始仅仲裁地址有卖家资格。合约管理者无法改变已上架的 CID、密文承诺、价格或买家。

## 2. Filecoin / Lighthouse

通过 Lighthouse 创建账户及存储 API key，在网站后台设置 `LIGHTHOUSE_API_KEY`。上传接口只接受卖家签名的加密 JSON 并核验链上卖家资格。API key 不发送到浏览器，卡密也不会进入平台后端。

该服务将密文上传到 Lighthouse 的 IPFS / Filecoin 路径。上传成功和获取 CID不等于 Filecoin 存储证明已经完成。外部联调需确认：上传、Filecoin 存储状态、网关可读取、存储计划到期与续费安排。

官方文档：https://docs.lighthouse.storage/ 。服务账户和费用由项目所有者管理。

## 3. Lit 当前接口：Chipotle Action

旧 Datil 教程与当前 Lit 接口不同。本实现采用官方当前的 Chipotle Action API，结合不可变代码绑定身份密钥。文件内容仍由浏览器使用 AES-256-GCM 加密；内容密钥由浏览器封装给 Action 的 X25519 公钥。Action 通过链上订单和钱包签名检查权限，再将内容密钥重新封装给买家的临时公钥。平台代理只能看到密文，不能看到内容密钥。

1. 创建 Lit 账户、配置服务额度。设置本地 `CARDLANE_CONTRACT` 等公开变量后运行 `node scripts/prepare-lit.mjs`。
2. 通过官方 Dashboard / API 获取 `.sites-runtime/cardlane-action.js` **精确源码**对应的 CID，并把该 CID 加入单独的 Action group。不得批准任意、未知替代 Action。
3. 创建仅能执行该 group 的 usage key，不给予管理 group / API key / PKP 等权限。在网站后台设置 `LIT_USAGE_API_KEY`，绝不使用账户管理 key。
4. 直接向可信 Lit 官方来源取得该 CID 的身份公钥并转换为 EVM 地址，设置 `CARDLANE_LIT_IDENTITY`。不要从未经验证的中间方取公钥；核验 enclave attestation。浏览器核验每次带随机 challenge 的加密公钥绑定签名。
5. 必须保持已发布模板字节及 manifest不变。依赖更新、重新打包、改变 RPC 都可能改变身份密钥，让旧文件无法解密。已有密文需要继续使用原始版本和原始 manifest；版本迁移须显式进行。

官方资料：
- https://developer.litprotocol.com/lit-actions/derived-actions
- https://developer.litprotocol.com/lit-actions/migration/encryption
- https://developer.litprotocol.com/management/api_direct
- https://developer.litprotocol.com/architecture/verification/quick-verify

外部 Lit 网络尚未联调。当前本地测试中的 Lit 身份密钥是测试替身，不能作为真实 enclave 验证结果。

## 4. 完整外部验收

两个独立钱包：卖家上架测试卡 → 买家领取 testUSDC → 授权精确金额 → 付款 → 自动取卡 → 刷新后再次取卡 → 确认收货。确认 seller 已下线仍可取卡。

另测：未付款钱包、其他买家、错误签名、替换密文、第二个购买者、临时网关 / Lit 故障与重试、付款失败后无解密权限。再测争议、仲裁退款、仲裁放款、卖家自愿退款及 2 天后结算。

配置完成不等于验收完成。外部流程成功前，保持测试网和测试卡。

## 已知边界

- 一个挂单只能售出一次，不等于能够阻止卖家用不同挂单重复出售同一真实卡。
- 卖家原本知道卡密。加密存储无法阻止卖家再次使用，也不能验证品牌余额。
- 买家已解密的数据无法收回；退款后的权限撤销只影响未来取密钥。
- 付款与外部解密服务之间并非原子交易。付款已确认而服务故障时，订单仍保留，支持重试；不能仅因用户声称未取卡就自动退款，否则会产生拿卡后退款问题。
- 争议由已公开的仲裁地址处理；目前没有自动余额预言机。争议证据可暂在线下提供，链上只记录状态和裁定。
- 浏览器钱包目前仅支持 EOA 签名；未验证智能账户 / ERC-1271、跨链或 Robinhood 接入。
- 当前新网站为 owner-private。向公众开放前，应加签名请求防重放、速率限制、额度控制及独立安全审查；品牌支持取决于余额验证和转售条款。
