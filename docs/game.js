// Quantum Cats - Slot Game Logic
// Mobile-optimized version

class QuantumCatsGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Grid settings
        this.gridSize = 7;
        this.grid = [];
        
        // Game state
        this.balance = 1000;
        this.bet = 1;
        this.currentWin = 0;
        this.isSpinning = false;
        this.isAutoPlay = false;
        this.energy = 0;
        this.multiplier = 1;
        
        // Free spins
        this.freeSpins = 0;
        this.freeSpinMode = null;
        this.totalFreeSpinWin = 0;
        
        // Symbols
        this.symbols = {
            H1: { emoji: '😺', name: '疊加貓', pays: { 5: 2, 6: 3, 7: 5, 8: 8, 9: 15, 10: 25, 15: 50 }, weight: 3 },
            H2: { emoji: '🐱', name: '觀測貓', pays: { 5: 1.5, 6: 2, 7: 3, 8: 5, 9: 10, 10: 18, 15: 35 }, weight: 5 },
            H3: { emoji: '😸', name: '糾纏貓A', pays: { 5: 1, 6: 1.5, 7: 2, 8: 3, 9: 6, 10: 12, 15: 25 }, weight: 8 },
            H4: { emoji: '😹', name: '糾纏貓B', pays: { 5: 1, 6: 1.5, 7: 2, 8: 3, 9: 6, 10: 12, 15: 25 }, weight: 8 },
            L1: { emoji: '🔴', name: '電子', pays: { 5: 0.5, 6: 0.6, 7: 0.8, 8: 1, 9: 1.5, 10: 2, 15: 4 }, weight: 25 },
            L2: { emoji: '🔵', name: '質子', pays: { 5: 0.4, 6: 0.5, 7: 0.6, 8: 0.8, 9: 1.2, 10: 1.8, 15: 3.5 }, weight: 30 },
            L3: { emoji: '🟣', name: '中子', pays: { 5: 0.3, 6: 0.4, 7: 0.5, 8: 0.6, 9: 1, 10: 1.5, 15: 3 }, weight: 35 },
            L4: { emoji: '⚪', name: '光子', pays: { 5: 0.2, 6: 0.3, 7: 0.4, 8: 0.5, 9: 0.8, 10: 1.2, 15: 2.5 }, weight: 40 },
            WD: { emoji: '📦', name: 'Wild', pays: {}, weight: 8, isWild: true },
            SC: { emoji: '🌀', name: 'Scatter', pays: {}, weight: 3, isScatter: true }
        };
        
        // Build weighted symbol array
        this.weightedSymbols = [];
        for (const [key, sym] of Object.entries(this.symbols)) {
            for (let i = 0; i < sym.weight; i++) {
                this.weightedSymbols.push(key);
            }
        }
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.generateGrid();
        this.render();
        this.bindEvents();
        this.updateUI();
        
        // Handle resize
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleResize(), 100);
        });
    }
    
    setupCanvas() {
        // Get the computed grid size from CSS
        const computedStyle = getComputedStyle(document.documentElement);
        const gridSizeStr = computedStyle.getPropertyValue('--grid-size').trim();
        
        // Parse the size (handle min(), calc(), etc.)
        let size;
        if (gridSizeStr.includes('min(') || gridSizeStr.includes('calc(')) {
            // Fallback to container-based calculation
            const container = this.canvas.parentElement;
            const maxSize = Math.min(window.innerWidth * 0.85, window.innerHeight * 0.5, 490);
            size = Math.floor(maxSize);
        } else {
            size = parseInt(gridSizeStr) || 490;
        }
        
        // Ensure minimum size
        size = Math.max(size, 280);
        
        // Set canvas size (use higher resolution for retina displays)
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        this.canvas.style.width = size + 'px';
        this.canvas.style.height = size + 'px';
        
        // Scale context for retina
        this.ctx.scale(dpr, dpr);
        
        // Calculate cell size
        this.cellSize = size / this.gridSize;
        this.canvasSize = size;
    }
    
    handleResize() {
        this.setupCanvas();
        this.render();
    }
    
    bindEvents() {
        // Touch-friendly event handling
        const addTouchEvent = (element, handler) => {
            element.addEventListener('click', handler);
            element.addEventListener('touchend', (e) => {
                e.preventDefault();
                handler(e);
            }, { passive: false });
        };
        
        addTouchEvent(document.getElementById('spinBtn'), () => this.spin());
        addTouchEvent(document.getElementById('betUp'), () => this.changeBet(1));
        addTouchEvent(document.getElementById('betDown'), () => this.changeBet(-1));
        addTouchEvent(document.getElementById('autoBtn'), () => this.toggleAutoPlay());
        
        // Modals
        addTouchEvent(document.getElementById('paytableBtn'), () => {
            document.getElementById('paytableModal').classList.add('show');
        });
        addTouchEvent(document.getElementById('rulesBtn'), () => {
            document.getElementById('rulesModal').classList.add('show');
        });
        addTouchEvent(document.getElementById('closePaytable'), () => {
            document.getElementById('paytableModal').classList.remove('show');
        });
        addTouchEvent(document.getElementById('closeRules'), () => {
            document.getElementById('rulesModal').classList.remove('show');
        });
        
        // Free spins mode selection
        document.querySelectorAll('.fs-mode-btn').forEach(btn => {
            addTouchEvent(btn, (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.startFreeSpins(mode);
            });
        });
        
        // Close modals on background click/touch
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });
        
        // Close big win on tap
        document.getElementById('bigWinOverlay').addEventListener('click', () => {
            document.getElementById('bigWinOverlay').classList.remove('show');
        });
    }
    
    generateGrid() {
        this.grid = [];
        for (let y = 0; y < this.gridSize; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridSize; x++) {
                this.grid[y][x] = this.getRandomSymbol();
            }
        }
    }
    
    getRandomSymbol() {
        const idx = Math.floor(Math.random() * this.weightedSymbols.length);
        return this.weightedSymbols[idx];
    }
    
    render() {
        const size = this.canvasSize;
        this.ctx.clearRect(0, 0, size, size);
        
        // Draw background
        this.ctx.fillStyle = '#0A0A1A';
        this.ctx.fillRect(0, 0, size, size);
        
        // Draw grid
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                this.drawCell(x, y);
            }
        }
    }
    
    drawCell(x, y, highlight = false, winning = false) {
        const cellSize = this.cellSize;
        const px = x * cellSize;
        const py = y * cellSize;
        const symbol = this.grid[y][x];
        const symData = this.symbols[symbol];
        const padding = Math.max(1, cellSize * 0.03);
        
        // Cell background
        this.ctx.fillStyle = highlight ? 'rgba(107, 77, 230, 0.3)' : 'rgba(30, 30, 60, 0.8)';
        if (winning) {
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
        }
        this.ctx.fillRect(px + padding, py + padding, cellSize - padding * 2, cellSize - padding * 2);
        
        // Cell border
        this.ctx.strokeStyle = winning ? '#FFD700' : '#3a3a5a';
        this.ctx.lineWidth = winning ? 2 : 1;
        this.ctx.strokeRect(px + padding, py + padding, cellSize - padding * 2, cellSize - padding * 2);
        
        // Symbol - scale font based on cell size
        const fontSize = Math.floor(cellSize * 0.55);
        this.ctx.font = `${fontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(symData.emoji, px + cellSize / 2, py + cellSize / 2);
    }
    
    async spin() {
        if (this.isSpinning) return;
        
        // Check balance
        if (this.freeSpins <= 0 && this.balance < this.bet) {
            alert('餘額不足！');
            return;
        }
        
        this.isSpinning = true;
        document.getElementById('spinBtn').disabled = true;
        
        // Deduct bet (not during free spins)
        if (this.freeSpins <= 0) {
            this.balance -= this.bet;
        } else {
            this.freeSpins--;
            this.updateFreeSpinsDisplay();
        }
        
        this.currentWin = 0;
        this.updateUI();
        
        // Animate spin
        await this.animateSpin();
        
        // Check for wins
        await this.evaluateWins();
        
        // Check for scatter (free spins trigger)
        if (this.freeSpins <= 0) {
            this.checkScatter();
        }
        
        // Update final state
        this.balance += this.currentWin;
        this.updateUI();
        
        // Show big win if applicable
        if (this.currentWin >= this.bet * 20) {
            await this.showBigWin();
        }
        
        // Free spins ended?
        if (this.freeSpinMode && this.freeSpins <= 0) {
            this.endFreeSpins();
        }
        
        this.isSpinning = false;
        document.getElementById('spinBtn').disabled = false;
        
        // Auto play
        if (this.isAutoPlay && this.balance >= this.bet) {
            setTimeout(() => this.spin(), 1000);
        }
    }
    
    async animateSpin() {
        const frames = 15;
        for (let i = 0; i < frames; i++) {
            this.generateGrid();
            this.render();
            await this.sleep(50);
        }
    }
    
    async evaluateWins() {
        let hasWin = true;
        let tumbleCount = 0;
        
        while (hasWin) {
            const clusters = this.findClusters();
            
            if (clusters.length === 0) {
                hasWin = false;
                break;
            }
            
            tumbleCount++;
            
            // Calculate wins
            let roundWin = 0;
            const winningPositions = new Set();
            
            for (const cluster of clusters) {
                const payout = this.calculatePayout(cluster.symbol, cluster.positions.length);
                roundWin += payout * this.bet * this.multiplier;
                
                cluster.positions.forEach(pos => {
                    winningPositions.add(`${pos.x},${pos.y}`);
                });
            }
            
            // Highlight winning cells
            await this.highlightWins(winningPositions);
            
            this.currentWin += roundWin;
            
            // Update energy
            this.energy = Math.min(100, this.energy + 10 + tumbleCount * 5);
            this.updateEnergy();
            
            // Check for observer burst
            if (this.energy >= 100) {
                await this.observerBurst();
            }
            
            // Remove winning symbols and tumble
            await this.tumble(winningPositions);
            
            this.updateUI();
        }
        
        // Reset energy after spin complete (not during free spins)
        if (this.freeSpins <= 0 && !this.freeSpinMode) {
            this.energy = Math.max(0, this.energy - 20);
            this.updateEnergy();
        }
    }
    
    findClusters() {
        const visited = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(false));
        const clusters = [];
        
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (visited[y][x]) continue;
                
                const symbol = this.grid[y][x];
                const symData = this.symbols[symbol];
                
                // Skip wild and scatter for cluster initiation
                if (symData.isWild || symData.isScatter) {
                    visited[y][x] = true;
                    continue;
                }
                
                const positions = [];
                this.floodFill(x, y, symbol, visited, positions);
                
                if (positions.length >= 5) {
                    clusters.push({ symbol, positions });
                }
            }
        }
        
        return clusters;
    }
    
    floodFill(x, y, targetSymbol, visited, positions) {
        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) return;
        if (visited[y][x]) return;
        
        const currentSymbol = this.grid[y][x];
        const currentData = this.symbols[currentSymbol];
        
        // Match if same symbol or wild
        if (currentSymbol !== targetSymbol && !currentData.isWild) return;
        
        visited[y][x] = true;
        positions.push({ x, y });
        
        // Check adjacent cells (no diagonals)
        this.floodFill(x + 1, y, targetSymbol, visited, positions);
        this.floodFill(x - 1, y, targetSymbol, visited, positions);
        this.floodFill(x, y + 1, targetSymbol, visited, positions);
        this.floodFill(x, y - 1, targetSymbol, visited, positions);
    }
    
    calculatePayout(symbol, clusterSize) {
        const symData = this.symbols[symbol];
        if (!symData || !symData.pays) return 0;
        
        // Find applicable payout tier
        const tiers = [15, 10, 9, 8, 7, 6, 5];
        for (const tier of tiers) {
            if (clusterSize >= tier && symData.pays[tier]) {
                return symData.pays[tier];
            }
        }
        return 0;
    }
    
    async highlightWins(winningPositions) {
        // Flash winning cells
        for (let i = 0; i < 3; i++) {
            this.ctx.clearRect(0, 0, this.canvasSize, this.canvasSize);
            for (let y = 0; y < this.gridSize; y++) {
                for (let x = 0; x < this.gridSize; x++) {
                    const isWinning = winningPositions.has(`${x},${y}`);
                    this.drawCell(x, y, false, isWinning && i % 2 === 0);
                }
            }
            await this.sleep(150);
        }
    }
    
    async tumble(winningPositions) {
        // Remove winning symbols
        for (const posStr of winningPositions) {
            const [x, y] = posStr.split(',').map(Number);
            this.grid[y][x] = null;
        }
        
        // Drop symbols down
        for (let x = 0; x < this.gridSize; x++) {
            let writeY = this.gridSize - 1;
            
            // Move existing symbols down
            for (let y = this.gridSize - 1; y >= 0; y--) {
                if (this.grid[y][x] !== null) {
                    this.grid[writeY][x] = this.grid[y][x];
                    if (writeY !== y) {
                        this.grid[y][x] = null;
                    }
                    writeY--;
                }
            }
            
            // Fill empty spaces with new symbols
            for (let y = writeY; y >= 0; y--) {
                this.grid[y][x] = this.getRandomSymbol();
            }
        }
        
        // Animate
        this.render();
        await this.sleep(300);
    }
    
    checkScatter() {
        let scatterCount = 0;
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.grid[y][x] === 'SC') {
                    scatterCount++;
                }
            }
        }
        
        if (scatterCount >= 3) {
            document.getElementById('freeSpinsModal').classList.add('show');
        }
    }
    
    startFreeSpins(mode) {
        document.getElementById('freeSpinsModal').classList.remove('show');
        
        this.freeSpinMode = mode;
        this.totalFreeSpinWin = 0;
        
        switch (mode) {
            case 'particle':
                this.freeSpins = 5;
                this.multiplier = 3;
                break;
            case 'wave':
                this.freeSpins = 15;
                this.multiplier = 1;
                break;
            case 'superposition':
                this.freeSpins = Math.floor(Math.random() * 18) + 3;
                this.multiplier = Math.floor(Math.random() * 5) + 1;
                break;
        }
        
        this.updateFreeSpinsDisplay();
        this.updateMultiplier();
        
        // Auto start spinning
        setTimeout(() => this.spin(), 500);
    }
    
    updateFreeSpinsDisplay() {
        let indicator = document.querySelector('.free-spins-active');
        
        if (this.freeSpinMode && this.freeSpins > 0) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.className = 'free-spins-active';
                document.body.appendChild(indicator);
            }
            indicator.textContent = `FREE SPINS: ${this.freeSpins} | ${this.freeSpinMode.toUpperCase()}`;
        } else if (indicator) {
            indicator.remove();
        }
    }
    
    endFreeSpins() {
        this.freeSpinMode = null;
        this.multiplier = 1;
        this.updateMultiplier();
        this.updateFreeSpinsDisplay();
        
        if (this.totalFreeSpinWin > 0) {
            // Show total free spin win
            setTimeout(() => {
                alert(`🎉 Free Spins 結束！\n總獲利: $${this.totalFreeSpinWin.toFixed(2)}`);
            }, 500);
        }
    }
    
    async observerBurst() {
        // Visual effect
        const cat = document.getElementById('observerCat');
        const catMini = document.getElementById('observerCatMini');
        
        if (cat) cat.textContent = '🙀';
        if (catMini) catMini.textContent = '🙀';
        
        // Random multiplier boost
        const boosts = [2, 2, 2, 3, 3, 4, 5];
        const boost = boosts[Math.floor(Math.random() * boosts.length)];
        this.multiplier *= boost;
        this.updateMultiplier();
        
        // Show effect
        const display = document.getElementById('winDisplay');
        display.textContent = `BURST x${boost}!`;
        display.classList.add('show');
        
        await this.sleep(1500);
        
        display.classList.remove('show');
        if (cat) cat.textContent = '😺';
        if (catMini) catMini.textContent = '😺';
        
        // Reset energy
        this.energy = 0;
        this.updateEnergy();
        
        // Reset multiplier after burst (unless in free spins)
        if (!this.freeSpinMode) {
            setTimeout(() => {
                this.multiplier = 1;
                this.updateMultiplier();
            }, 2000);
        }
    }
    
    async showBigWin() {
        const overlay = document.getElementById('bigWinOverlay');
        const title = document.getElementById('bigWinTitle');
        const amount = document.getElementById('bigWinAmount');
        
        let winLevel = 'BIG WIN!';
        if (this.currentWin >= this.bet * 100) winLevel = '🌟 LEGENDARY! 🌟';
        else if (this.currentWin >= this.bet * 50) winLevel = '⚡ EPIC WIN! ⚡';
        else if (this.currentWin >= this.bet * 30) winLevel = '🔥 MEGA WIN! 🔥';
        
        title.textContent = winLevel;
        amount.textContent = `$${this.currentWin.toFixed(2)}`;
        
        overlay.classList.add('show');
        
        await this.sleep(3000);
        
        overlay.classList.remove('show');
    }
    
    changeBet(delta) {
        const bets = [0.20, 0.50, 1, 2, 5, 10, 20, 50, 100];
        const currentIdx = bets.indexOf(this.bet);
        const newIdx = Math.max(0, Math.min(bets.length - 1, currentIdx + delta));
        this.bet = bets[newIdx];
        this.updateUI();
    }
    
    toggleAutoPlay() {
        this.isAutoPlay = !this.isAutoPlay;
        const btn = document.getElementById('autoBtn');
        btn.classList.toggle('active', this.isAutoPlay);
        
        if (this.isAutoPlay && !this.isSpinning) {
            this.spin();
        }
    }
    
    updateUI() {
        document.getElementById('balance').textContent = `$${this.balance.toFixed(2)}`;
        document.getElementById('currentWin').textContent = `$${this.currentWin.toFixed(2)}`;
        document.getElementById('betAmount').textContent = this.bet.toFixed(2);
    }
    
    updateEnergy() {
        // Desktop elements
        const fill = document.getElementById('energyFill');
        const text = document.getElementById('energyText');
        if (fill) fill.style.height = `${this.energy}%`;
        if (text) text.textContent = `${Math.floor(this.energy)}%`;
        
        // Mobile elements
        const fillMini = document.getElementById('energyFillMini');
        if (fillMini) fillMini.style.width = `${this.energy}%`;
    }
    
    updateMultiplier() {
        // Desktop
        const mult = document.getElementById('multValue');
        if (mult) mult.textContent = `x${this.multiplier.toFixed(1)}`;
        
        // Mobile
        const multMini = document.getElementById('multValueMini');
        if (multMini) multMini.textContent = `x${this.multiplier.toFixed(1)}`;
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Start game when page loads
window.addEventListener('load', () => {
    window.game = new QuantumCatsGame();
});

// Prevent pull-to-refresh on mobile
document.body.addEventListener('touchmove', function(e) {
    if (e.target.closest('.modal-content')) return;
    if (e.touches.length > 1) return;
    e.preventDefault();
}, { passive: false });
