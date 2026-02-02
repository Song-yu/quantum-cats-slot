# 🐱⚛️ QUANTUM CATS

> **「觀測改變結果」** — 一款基於量子力學概念的創新 Cluster Pays 老虎機

---

## 📁 專案結構

```
quantum-cats-slot/
├── README.md           # 本文件
├── GDD.md              # 遊戲設計文件 (Game Design Document)
├── PAYTABLE.md         # 詳細賠付表與數學計算
├── WIREFRAMES.md       # UI/UX 線框圖與設計規範
└── simulation/
    └── main.go         # 數學模型模擬程式 (Golang)
```

---

## 🎮 遊戲特色

### 核心機制
- **7x7 Cluster Pays** — 連接 5+ 相同符號獲勝
- **Quantum Tumble** — 連消機制，勝利符號消除後新符號落下
- **Superposition Wild** — 疊加態 Wild，同時呈現多種符號狀態
- **Observer Multiplier** — 觀測貓累積倍數系統
- **Entanglement Link** — 量子糾纏連線，路徑變 Wild

### Free Spins 模式
玩家可選擇三種「觀測模式」：
- 🔴 **粒子模式** — 高波動，5 Spins，起始 3x 倍數
- 🔵 **波動模式** — 中波動，15 Spins，穩定成長
- 🟣 **疊加模式** — 隨機參數，極端波動

### Multiverse Jackpot
- 當 Free Spins 倍數達 100x+ 時觸發
- 畫面分裂為 4 個平行宇宙同時運算
- 取最高結果 ×4 作為最終獎勵

---

## 📊 數學規格

| 參數 | 數值 |
|------|------|
| RTP | 96.50% |
| 波動率 | High (σ = 8.5) |
| Hit Frequency | 25.3% |
| 最大倍數 | 25,000x |
| FS 觸發率 | 1/180 (0.556%) |

---

## 🚀 快速開始

### 執行數學模擬

```bash
cd simulation
go run main.go
```

模擬會執行 10K / 100K / 1M 次 spin 並輸出：
- RTP 驗證
- Hit Rate
- Win Distribution
- 標準差

---

## 📄 文件說明

### GDD.md
完整的遊戲設計文件，包含：
- 遊戲概述與目標受眾
- 完整符號系統與權重
- 所有遊戲機制詳細說明
- Free Spins 與 Jackpot 規則
- 數學模型與 RTP 分解
- 視覺設計規範
- 音效設計
- 本地化字串
- 技術規格與 API
- 合規要求

### PAYTABLE.md
詳細的賠付計算，包含：
- 各符號各 Cluster 大小的精確賠付
- 符號出現頻率與權重
- Expected Value 計算
- Volatility 分析
- Scatter 觸發機率
- Buy Feature 定價邏輯
- 模擬驗證結果

### WIREFRAMES.md
UI/UX 設計規範，包含：
- Desktop/Mobile 佈局
- Free Spins 模式選擇畫面
- Multiverse Jackpot 四分割畫面
- Big Win 慶祝動畫規格
- Paytable 頁面結構
- 特效動畫時序
- 響應式斷點
- 無障礙設計

---

## 🎨 視覺風格

**Neon Noir + 賽博貓咖啡館**

主色調：
- Primary Purple: `#6B4DE6`
- Secondary Blue: `#00D4FF`
- Accent Pink: `#FF2E8C`
- Background Dark: `#0A0A1A`

---

## 📝 待辦事項

- [ ] 完成精確的 Cluster 檢測演算法
- [ ] 設計符號美術資源
- [ ] 製作動畫 Prototype
- [ ] 音效錄製與混音
- [ ] 多語言翻譯
- [ ] GLI 認證送審準備

---

## 📜 授權

本設計文件為概念階段，供內部參考使用。

---

*Created: 2026-02-02*
*Author: Spock (AI Assistant) for Sean Yu*
