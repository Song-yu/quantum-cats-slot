// Quantum Cats Slot - Math Simulation
// 用於驗證 RTP 和波動率計算

package main

import (
	"fmt"
	"math"
	"math/rand"
	"sort"
	"time"
)

// 符號定義
type Symbol int

const (
	H1 Symbol = iota // 疊加貓
	H2               // 觀測貓
	H3               // 糾纏貓A
	H4               // 糾纏貓B
	L1               // 電子
	L2               // 質子
	L3               // 中子
	L4               // 光子
	WD               // Wild
	SC               // Scatter
	EN               // 糾纏連線觸發器 (不參與普通賠付)
)

// 符號名稱
var symbolNames = map[Symbol]string{
	H1: "疊加貓", H2: "觀測貓", H3: "糾纏A", H4: "糾纏B",
	L1: "電子", L2: "質子", L3: "中子", L4: "光子",
	WD: "Wild", SC: "Scatter", EN: "糾纏",
}

// Base Game 符號權重
var baseWeights = map[Symbol]int{
	H1: 3, H2: 5, H3: 8, H4: 8,
	L1: 25, L2: 30, L3: 35, L4: 40,
	WD: 8, SC: 3, EN: 25,
}

// Free Spins 符號權重
var fsWeights = map[Symbol]int{
	H1: 6, H2: 10, H3: 12, H4: 12,
	L1: 22, L2: 25, L3: 28, L4: 32,
	WD: 15, SC: 5, EN: 28,
}

// 賠付表 (cluster size -> multiplier)
var paytable = map[Symbol]map[int]float64{
	H1: {5: 2.0, 6: 3.0, 7: 5.0, 8: 8.0, 9: 15.0, 10: 25.0, 15: 50.0},
	H2: {5: 1.5, 6: 2.0, 7: 3.0, 8: 5.0, 9: 10.0, 10: 18.0, 15: 35.0},
	H3: {5: 1.0, 6: 1.5, 7: 2.0, 8: 3.0, 9: 6.0, 10: 12.0, 15: 25.0},
	H4: {5: 1.0, 6: 1.5, 7: 2.0, 8: 3.0, 9: 6.0, 10: 12.0, 15: 25.0},
	L1: {5: 0.5, 6: 0.6, 7: 0.8, 8: 1.0, 9: 1.5, 10: 2.0, 15: 4.0},
	L2: {5: 0.4, 6: 0.5, 7: 0.6, 8: 0.8, 9: 1.2, 10: 1.8, 15: 3.5},
	L3: {5: 0.3, 6: 0.4, 7: 0.5, 8: 0.6, 9: 1.0, 10: 1.5, 15: 3.0},
	L4: {5: 0.2, 6: 0.3, 7: 0.4, 8: 0.5, 9: 0.8, 10: 1.2, 15: 2.5},
}

const (
	GridWidth  = 7
	GridHeight = 7
	GridSize   = GridWidth * GridHeight
)

// Grid 結構
type Grid [GridHeight][GridWidth]Symbol

// 模擬結果
type SimResult struct {
	TotalSpins      int
	TotalWagered    float64
	TotalWon        float64
	RTP             float64
	HitRate         float64
	WinDistribution map[string]int
	MaxWin          float64
	FSTriggered     int
	Variance        float64
	StdDev          float64
}

// 建立符號選擇器
type SymbolPicker struct {
	symbols     []Symbol
	totalWeight int
}

func newSymbolPicker(weights map[Symbol]int) *SymbolPicker {
	picker := &SymbolPicker{}
	for sym, weight := range weights {
		for i := 0; i < weight; i++ {
			picker.symbols = append(picker.symbols, sym)
		}
		picker.totalWeight += weight
	}
	return picker
}

func (p *SymbolPicker) pick() Symbol {
	return p.symbols[rand.Intn(len(p.symbols))]
}

// 生成隨機 Grid
func generateGrid(picker *SymbolPicker) Grid {
	var grid Grid
	for y := 0; y < GridHeight; y++ {
		for x := 0; x < GridWidth; x++ {
			grid[y][x] = picker.pick()
		}
	}
	return grid
}

// 找出所有 Cluster (使用 Flood Fill)
func findClusters(grid Grid) map[Symbol][]int {
	visited := make([][]bool, GridHeight)
	for i := range visited {
		visited[i] = make([]bool, GridWidth)
	}

	clusters := make(map[Symbol][]int)

	var floodFill func(x, y int, sym Symbol) int
	floodFill = func(x, y int, sym Symbol) int {
		if x < 0 || x >= GridWidth || y < 0 || y >= GridHeight {
			return 0
		}
		if visited[y][x] {
			return 0
		}
		cellSym := grid[y][x]
		// Wild 可以作為任何符號
		if cellSym != sym && cellSym != WD {
			return 0
		}
		visited[y][x] = true
		count := 1
		count += floodFill(x+1, y, sym)
		count += floodFill(x-1, y, sym)
		count += floodFill(x, y+1, sym)
		count += floodFill(x, y-1, sym)
		return count
	}

	for y := 0; y < GridHeight; y++ {
		for x := 0; x < GridWidth; x++ {
			if visited[y][x] {
				continue
			}
			sym := grid[y][x]
			if sym == WD || sym == SC || sym == EN {
				continue // 這些符號不單獨形成 cluster
			}
			size := floodFill(x, y, sym)
			if size >= 5 {
				clusters[sym] = append(clusters[sym], size)
			}
			// Reset visited for next symbol check (簡化版，實際要更精確)
		}
	}

	return clusters
}

// 計算賠付
func calculatePayout(sym Symbol, clusterSize int) float64 {
	table, exists := paytable[sym]
	if !exists {
		return 0
	}

	// 找到適用的賠付等級
	sizes := []int{15, 10, 9, 8, 7, 6, 5}
	for _, size := range sizes {
		if clusterSize >= size {
			if payout, ok := table[size]; ok {
				return payout
			}
		}
	}
	return 0
}

// 計數 Scatter
func countScatters(grid Grid) int {
	count := 0
	for y := 0; y < GridHeight; y++ {
		for x := 0; x < GridWidth; x++ {
			if grid[y][x] == SC {
				count++
			}
		}
	}
	return count
}

// 模擬單次 Spin (簡化版，不含 Tumble)
func simulateSpin(picker *SymbolPicker, isFreeSpins bool, multiplier float64) (float64, bool, int) {
	grid := generateGrid(picker)
	
	// 計算 Scatter
	scatterCount := countScatters(grid)
	triggeredFS := !isFreeSpins && scatterCount >= 3
	
	// 簡化的 Cluster 計算
	// 實際版本需要更精確的 flood fill
	totalPayout := 0.0
	
	// 統計每種符號的數量
	symbolCounts := make(map[Symbol]int)
	for y := 0; y < GridHeight; y++ {
		for x := 0; x < GridWidth; x++ {
			sym := grid[y][x]
			if sym != SC && sym != EN {
				symbolCounts[sym]++
			}
		}
	}
	
	// 簡化的贏獎計算：如果某符號出現 5+ 次，假設有機率形成 cluster
	for sym, count := range symbolCounts {
		if sym == WD {
			continue
		}
		if count >= 5 {
			// 簡化：假設有 30% 機率這些符號真的相連
			if rand.Float64() < 0.30 {
				clusterSize := min(count, 15)
				payout := calculatePayout(sym, clusterSize)
				totalPayout += payout
			}
		}
	}
	
	// 套用倍數
	totalPayout *= multiplier
	
	// Observer 加成 (簡化)
	if rand.Float64() < 0.05 {
		totalPayout *= 1.5
	}
	
	return totalPayout, triggeredFS, scatterCount
}

// 模擬 Free Spins
func simulateFreeSpins(picker *SymbolPicker) float64 {
	// 隨機選擇模式
	modes := []struct {
		name       string
		spins      int
		startMult  float64
		multGrowth float64
	}{
		{"Particle", 5, 3.0, 1.0},
		{"Wave", 15, 1.0, 0.167},
		{"Superposition", rand.Intn(18) + 3, float64(rand.Intn(5) + 1), rand.Float64()},
	}
	
	mode := modes[rand.Intn(len(modes))]
	totalWin := 0.0
	currentMult := mode.startMult
	
	for spin := 0; spin < mode.spins; spin++ {
		payout, _, scatters := simulateSpin(picker, true, currentMult)
		totalWin += payout
		currentMult += mode.multGrowth
		
		// Retrigger
		if scatters >= 3 {
			mode.spins += 3
		}
	}
	
	// Multiverse Jackpot (簡化)
	if currentMult >= 100 && rand.Float64() < 0.05 {
		// 模擬 4 個宇宙
		maxWin := 0.0
		for i := 0; i < 4; i++ {
			win, _, _ := simulateSpin(picker, true, currentMult)
			if win > maxWin {
				maxWin = win
			}
		}
		totalWin += maxWin * 4
	}
	
	return totalWin
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// 主要模擬函數
func runSimulation(numSpins int) SimResult {
	basePicker := newSymbolPicker(baseWeights)
	fsPicker := newSymbolPicker(fsWeights)
	
	result := SimResult{
		TotalSpins:      numSpins,
		WinDistribution: make(map[string]int),
	}
	
	var allWins []float64
	hitCount := 0
	
	for i := 0; i < numSpins; i++ {
		result.TotalWagered += 1.0 // 每次投注 1 單位
		
		payout, triggeredFS, _ := simulateSpin(basePicker, false, 1.0)
		
		if triggeredFS {
			result.FSTriggered++
			fsWin := simulateFreeSpins(fsPicker)
			payout += fsWin
		}
		
		result.TotalWon += payout
		allWins = append(allWins, payout)
		
		if payout > 0 {
			hitCount++
		}
		
		if payout > result.MaxWin {
			result.MaxWin = payout
		}
		
		// 分類贏獎
		switch {
		case payout == 0:
			result.WinDistribution["0x"]++
		case payout < 1:
			result.WinDistribution["0.01-1x"]++
		case payout < 5:
			result.WinDistribution["1-5x"]++
		case payout < 20:
			result.WinDistribution["5-20x"]++
		case payout < 100:
			result.WinDistribution["20-100x"]++
		case payout < 500:
			result.WinDistribution["100-500x"]++
		default:
			result.WinDistribution["500x+"]++
		}
	}
	
	result.RTP = (result.TotalWon / result.TotalWagered) * 100
	result.HitRate = float64(hitCount) / float64(numSpins) * 100
	
	// 計算變異數和標準差
	mean := result.TotalWon / float64(numSpins)
	sumSquares := 0.0
	for _, win := range allWins {
		diff := win - mean
		sumSquares += diff * diff
	}
	result.Variance = sumSquares / float64(numSpins)
	result.StdDev = math.Sqrt(result.Variance)
	
	return result
}

func main() {
	rand.Seed(time.Now().UnixNano())
	
	fmt.Println("╔════════════════════════════════════════════════════════════╗")
	fmt.Println("║           QUANTUM CATS - Math Simulation                   ║")
	fmt.Println("╚════════════════════════════════════════════════════════════╝")
	fmt.Println()
	
	// 不同模擬規模
	simSizes := []int{10000, 100000, 1000000}
	
	for _, size := range simSizes {
		fmt.Printf("▶ Running %d spins simulation...\n", size)
		start := time.Now()
		result := runSimulation(size)
		elapsed := time.Since(start)
		
		fmt.Println()
		fmt.Println("┌─────────────────────────────────────────────────────┐")
		fmt.Printf("│ Spins: %d (took %v)\n", size, elapsed)
		fmt.Println("├─────────────────────────────────────────────────────┤")
		fmt.Printf("│ RTP: %.2f%%\n", result.RTP)
		fmt.Printf("│ Hit Rate: %.2f%%\n", result.HitRate)
		fmt.Printf("│ Max Win: %.2fx\n", result.MaxWin)
		fmt.Printf("│ Std Dev: %.2f\n", result.StdDev)
		fmt.Printf("│ FS Triggered: %d (%.3f%%)\n", result.FSTriggered, float64(result.FSTriggered)/float64(size)*100)
		fmt.Println("├─────────────────────────────────────────────────────┤")
		fmt.Println("│ Win Distribution:")
		
		// 排序並顯示分布
		keys := make([]string, 0, len(result.WinDistribution))
		for k := range result.WinDistribution {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		
		for _, k := range keys {
			count := result.WinDistribution[k]
			pct := float64(count) / float64(size) * 100
			bar := ""
			barLen := int(pct / 2)
			for i := 0; i < barLen && i < 20; i++ {
				bar += "█"
			}
			fmt.Printf("│   %10s: %8d (%5.2f%%) %s\n", k, count, pct, bar)
		}
		fmt.Println("└─────────────────────────────────────────────────────┘")
		fmt.Println()
	}
	
	fmt.Println("╔════════════════════════════════════════════════════════════╗")
	fmt.Println("║  Note: This is a simplified simulation.                    ║")
	fmt.Println("║  Actual game requires proper cluster detection algorithm.  ║")
	fmt.Println("╚════════════════════════════════════════════════════════════╝")
}
