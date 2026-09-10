# assets/fonts — 自托管字体（latin 字集）

拉丁字符集（Syne / Space Grotesk / Space Mono / Bricolage Grotesque）从 Google Fonts
下载后放在本目录本地托管，避免：

1. 加载页 FREY 还没等字体下载完就出现（闪一下“原始字体”）
2. `fonts.googleapis.com` 被墙/变慢时整站永久停留在 fallback 字体
3. 渲染阻塞：外部字体 CSS 不再阻塞首页首帧

**为什么只保留 latin？** 站内拉丁字符（FREY / 英文标签等）是视觉重点，必须稳定；
中文走 `Noto Sans SC`（Google Fonts **异步**加载，未到达前用系统 CJK 字体兜底）。

文件说明：

| 文件 | 内容 | 字重 |
| --- | --- | --- |
| syne-600/700/800.woff2 | Syne（展示字体） | 600 / 700 / 800 |
| space-grotesk-300/400/500.woff2 | Space Grotesk（正文） | 300 / 400 / 500 |
| space-mono-400.woff2 | Space Mono（标签） | 400 |
| bricolage-grotesque-600-800.woff2 | Bricolage Grotesque（work 大标题，可变字重） | 600–800 |
| OFL-*.txt | 各字体 OFL 许可证 | — |

来源与许可证：Google Fonts，全部为 SIL Open Font License 1.1（见本目录 OFL-*.txt）。
如需更新/增补字重，可用 `output/fetch_fonts.py` 重新抓取。
