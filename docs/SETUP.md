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
- 争议由已公开的仲裁地址处理；目前没有自动余额预言机。争议证据可暂在线下提供，申诉原因和卖家回复公开记录在链上；回复不得包含兑换码、PIN 或个人信息。敏感证据应通过私密渠道提供。
- 浏览器钱包目前仅支持 EOA 签名；未验证智能账户 / ERC-1271、跨链或 Robinhood 接入。
- 当前新网站为 owner-private。向公众开放前，应加签名请求防重放、速率限制、额度控制及独立安全审查；品牌支持取决于余额验证和转售条款。

## 5. 新版订单托管及独立定时结算

合约 VERSION=2。旧版没有申诉回复字段，也不能由独立 keeper 结算，需要新部署；此网站会拒绝旧版合约配置。已有旧合约订单应继续使用原合约完成，不得迁移或替换旧密文所绑定的 Lit manifest。新合约需另行准备其 Lit Action 身份。

- 付款 testUSDC 进入合约托管；买家确认才放款，重复确认或结算不能重复支付。
- 买家在付款后 48 小时内可按原因申诉，立即暂停自动结算。
- 卖家需在申诉发起后 24 小时内回复（限一次，最多 1024 UTF-8 字节）或退款。回复公开保存到链上，不得提供卡密、PIN 或个人信息。回复不会放款。
- 回复后或 24 小时逾期未回复后可以仲裁，期间资金仍冻结。逾期不擅自判为退款，也不自动给卖家放款。问题解决后买家可主动确认。
- 无申诉且付款满 48 小时，任意执行者均可调用 settleAfterWindow。收款人和金额只能来自原订单，调用者无法改变。区块链不会自行定时发送交易，因此必须运行独立 keeper。

`keeper/worker.ts` 是独立 Cloudflare Worker，`keeper/wrangler.jsonc` 配置每分钟 Cron。它不需要网站打开或买卖双方在线，也不调用受私有登录保护的网站页面。

在自己的 Cloudflare 账户内部署 keeper（需账户授权，当前尚未部署）：

1. 在 keeper 配置的 `vars` 中设置公开的 CARDLANE_RPC、CARDLANE_CONTRACT、CARDLANE_TOKEN、CARDLANE_ARBITER。
2. 通过 Cloudflare secret 设置 CARDLANE_KEEPER_PRIVATE_KEY，使用独立、仅持有少量测试 ETH 的钱包。它不需卖家或仲裁权限；只支付 Base Sepolia 结算 gas。不得把密钥放进 vars、网站、Git 或聊天。
3. 运行 `npx wrangler deploy --config keeper/wrangler.jsonc` 并验证 Cron 实际触发和交易确认。仅写在配置中不代表 Cron 已生效。
4. 每轮轮换检查 100 个挂单，最多发送 10 笔结算，失败记录日志并在后续轮次重试。大规模挂单需要增加吞吐或专门索引；实际放款可能比 48 小时截止稍晚，受扫描、gas、RPC、任务和区块确认影响。
5. 在两个测试钱包完成正常确认、超时自动结算、申诉冻结及回复的外部验收后，把网站 CARDLANE_SETTLEMENT_ENABLED 设置为 true。该开关只表示人工配置确认，不是 keeper 在线健康证明。完整真实模式同时要求合约、Lighthouse 和 Lit 配置成功。

官方 Cron 文档：https://developers.cloudflare.com/workers/configuration/cron-triggers/ 。网站发布不会自动部署这个独立 keeper；当前只有本地 EVM 定时结算测试通过后才算代码验证，真实定时任务仍待上述配置。

## 已部署实例

2026-10-07 已完成 Base Sepolia VERSION=2 部署，公开地址、交易与核验记录见 [deployments/base-sepolia.json](../deployments/base-sepolia.json)。网站已配置该实例的 RPC、合约、代币和仲裁者；定时结算开关保持关闭，直至 keeper 部署和外部验收完成。通常可直接使用此实例，无需再次部署。

此合约绑定的 Lit Action 已在本地准备；尚未上传或注册，身份和 usage key 也尚未配置。按第 3 节完成注册时，使用此合约地址和固定模板重现源码，并核对部署记录中的 sourceKeccak256。不得改变已注册版本来处理已有密文。

## 浏览器钱包部署（无需导出私钥）

运行 `npm run deploy:browser`，在安装钱包扩展的浏览器打开 http://127.0.0.1:5175/ 。依次连接钱包、部署测试代币、部署托管合约，两笔部署交易均由用户在钱包内确认。页面仅允许 Base Sepolia。连接的账号为托管合约仲裁者和初始授权卖家。部署结果经独立 RPC 核验交易收据、完整部署字节码及构造参数后，保存在忽略目录 `.sites-runtime/browser-deploy/deployment.json`，不包含私钥。

内置浏览器通常没有钱包扩展；请使用装有 MetaMask、OKX 或 Rabby 的浏览器。部署成功后仍需按本文配置 Lit、Lighthouse 和 keeper，不能把部署成功视为外部服务联调成功。
