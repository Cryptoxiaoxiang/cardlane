# CardLane

礼品卡测试网交易应用：加密存储、ERC-20 资金托管、付款后自动交付。

网站： https://cardlane.cryptoxiaoxiang.chatgpt.site （当前仅所有者可访问）。

## 当前可用

- 市场、搜索、类别和地区筛选、排序。
- 明确标注的演示上架、付款、自动解密、订单管理、确认、争议与卖家退款。
- Base Sepolia 钱包与合约交易代码，授权精确额度、唯一买家、白名单卖家、48 小时托管期、买家申诉冻结、卖家 24 小时回复和仲裁。
- 无申诉订单到期自动确认与放款：独立 keeper 代码和 Cron 配置已提供，真实任务待部署。
- 浏览器 AES-GCM 加密，Filecoin / Lighthouse 密文上传，Lit 当前 Chipotle API 交付适配。
- 兑换码不进入链上状态、日志或平台存储。平台代理看到加密文件及重新封装的内容密钥。

**部署网站并不等于部署了链上合约或接通外部服务。** 新版 Base Sepolia 合约已部署并通过独立 RPC 核验；当前未配置服务密钥、未部署定时 keeper、未完成真实 Filecoin / Lit 网络联调。缺失配置时真实模式禁用交易，绝不伪装付款成功。示例商户虚构，示例卡无兑换价值。

## 已部署的测试网合约

网络：Base Sepolia（chain ID 84532），合约 VERSION=2，仅接受无价值 testUSDC。

- 托管合约：[0x7280c672e102751067baa3d6e50a955435ffe072](https://sepolia.basescan.org/address/0x7280c672e102751067baa3d6e50a955435ffe072)
- 测试代币：[0x27888c308e2f555ac31da2da382a77c1cf201023](https://sepolia.basescan.org/address/0x27888c308e2f555ac31da2da382a77c1cf201023)
- 仲裁者和初始授权卖家：`0x6234d654a5927522db05af1052c32526598f4655`。

[部署交易与核验记录](deployments/base-sepolia.json)包含两笔交易、区块号及待注册的 Lit Action 源码摘要。部署字节码和构造参数与仓库产物一致；已读取确认 48 小时托管期限、24 小时回复期限及卖家授权。此核验不等同于安全审计或外部服务联调。

## 本地运行

Node.js >=22.13，`npm ci`、`npm run dev`。

`npm run typecheck`；`npm run contracts:compile`；`npm run action:build`；`npm test`；`npm run build`。

`npm test` 在本地 EVM 测试合约并模拟 Lit 身份接口，验证权限、密文完整性与交付加密协议。这不是外部服务联调或合约审计。

真实测试网接入：[docs/SETUP.md](docs/SETUP.md)。所需变量见 `.env.example`；真实密钥只配置在本地环境或网站后台，不提交 Git。

## 核心文件

- `contracts/CardLane.sol` / `TestUSDC.sol`：托管和无价值测试代币。
- `lib/cardlane/crypto.ts`：AES-GCM 与基于 X25519 + HKDF 的密钥封装。
- `lit/action.ts`：链上权限校验，验证短期钱包签名并绑定接收公钥。
- `generated/action-template.js` / `action-release.json`：固定 Action 发布模板与字节摘要。已有密文不可通过静默更新模板迁移。
- `app/api/storage`：签名和卖家资格核验后上传密文。
- `keeper/worker.ts` / `keeper/wrangler.jsonc`：独立每分钟定时扫描并提交到期订单结算，买卖双方无需在线。
- `app/api/lit`：只代理固定 Action，不允许客户端提供任意 Action 源码。

未承诺礼品卡真实性、品牌余额或防止卖家重复使用，实际运营还需要这些能力。
