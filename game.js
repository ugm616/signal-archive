// ═══════════════════════════════════════════════════════
// SIGNAL ARCHIVE SYSTEM - GAME ENGINE
// ═══════════════════════════════════════════════════════

class Game {
    constructor() {
        this.grid = [];
        this.gridSize = 8;
        this.selectedTile = null;
        this.documents = [];
        this.folders = {
            inbox: [],
            archived: [],
            priority: []
        };
        this.decoders = [];
        this.stats = {
            totalMatches: 0,
            totalDocuments: 0,
            fragments: 0,
            sessionStart: Date.now(),
            lastSave: Date.now()
        };
        this.symbols = [
            { id: 'red', char: '█', color: 'red', unlocked: true },
            { id: 'green', char: '▓', color: 'green', unlocked: true },
            { id: 'blue', char: '▒', color: 'blue', unlocked: true },
            { id: 'yellow', char: '░', color: 'yellow', unlocked: true }
        ];
        
        this.init();
    }

    init() {
        this.initGrid();
        this.initDecoders();
        this.initEventListeners();
        this.startGameLoop();
        this.log('SYSTEM INITIALIZED', 'success');
        this.log('AWAITING TRANSMISSION INPUT...', 'info');
        
        // Check for idle time
        this.checkIdleProgress();
    }

    initGrid() {
        const gridElement = document.getElementById('match3-grid');
        gridElement.innerHTML = '';
        this.grid = [];

        for (let i = 0; i < this.gridSize * this.gridSize; i++) {
            const tile = this.createTile(i);
            this.grid.push(tile);
            gridElement.appendChild(tile.element);
        }
    }

    createTile(index) {
        const availableSymbols = this.symbols.filter(s => s.unlocked);
        const symbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
        
        const element = document.createElement('div');
        element.className = 'tile';
        element.dataset.index = index;
        element.dataset.color = symbol.id;
        element.textContent = symbol.char;
        
        element.addEventListener('click', () => this.handleTileClick(index));
        
        return { element, color: symbol.id, index };
    }

    handleTileClick(index) {
        const tile = this.grid[index];
        
        if (!this.selectedTile) {
            this.selectedTile = tile;
            tile.element.classList.add('selected');
        } else {
            if (this.selectedTile.index === index) {
                // Deselect
                this.selectedTile.element.classList.remove('selected');
                this.selectedTile = null;
            } else if (this.isAdjacent(this.selectedTile.index, index)) {
                // Swap tiles
                this.swapTiles(this.selectedTile, tile);
                this.selectedTile.element.classList.remove('selected');
                this.selectedTile = null;
            } else {
                // Select different tile
                this.selectedTile.element.classList.remove('selected');
                this.selectedTile = tile;
                tile.element.classList.add('selected');
            }
        }
    }

    isAdjacent(index1, index2) {
        const row1 = Math.floor(index1 / this.gridSize);
        const col1 = index1 % this.gridSize;
        const row2 = Math.floor(index2 / this.gridSize);
        const col2 = index2 % this.gridSize;
        
        return (Math.abs(row1 - row2) === 1 && col1 === col2) ||
               (Math.abs(col1 - col2) === 1 && row1 === row2);
    }

    swapTiles(tile1, tile2) {
        const tempColor = tile1.color;
        const tempChar = tile1.element.textContent;
        
        tile1.color = tile2.color;
        tile1.element.dataset.color = tile2.color;
        tile1.element.textContent = tile2.element.textContent;
        
        tile2.color = tempColor;
        tile2.element.dataset.color = tempColor;
        tile2.element.textContent = tempChar;
        
        setTimeout(() => this.checkMatches(), 100);
    }

    checkMatches() {
        const matches = [];
        
        // Check horizontal matches
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize - 2; col++) {
                const index = row * this.gridSize + col;
                const color = this.grid[index].color;
                
                if (this.grid[index + 1].color === color &&
                    this.grid[index + 2].color === color) {
                    matches.push(index, index + 1, index + 2);
                }
            }
        }
        
        // Check vertical matches
        for (let col = 0; col < this.gridSize; col++) {
            for (let row = 0; row < this.gridSize - 2; row++) {
                const index = row * this.gridSize + col;
                const color = this.grid[index].color;
                
                if (this.grid[index + this.gridSize].color === color &&
                    this.grid[index + this.gridSize * 2].color === color) {
                    matches.push(index, index + this.gridSize, index + this.gridSize * 2);
                }
            }
        }
        
        if (matches.length > 0) {
            this.processMatches([...new Set(matches)]);
        }
    }

    processMatches(matchIndices) {
        matchIndices.forEach(index => {
            this.grid[index].element.classList.add('matched');
        });
        
        const comboSize = matchIndices.length;
        this.stats.totalMatches += comboSize;
        this.stats.fragments += comboSize;
        
        if (comboSize >= 3) {
            this.log(`MATCH DETECTED: ${comboSize} TILES`, 'success');
        }
        if (comboSize >= 5) {
            this.log(`COMBO! +${Math.floor(comboSize / 2)} BONUS FRAGMENTS`, 'warning');
            this.stats.fragments += Math.floor(comboSize / 2);
        }
        
        // Generate document fragments
        if (Math.random() < 0.3 + (comboSize * 0.1)) {
            this.generateDocument('transmission');
        }
        
        setTimeout(() => {
            this.clearMatches(matchIndices);
            this.updateDisplay();
        }, 500);
    }

    clearMatches(matchIndices) {
        matchIndices.sort((a, b) => b - a);
        
        matchIndices.forEach(index => {
            const col = index % this.gridSize;
            
            // Drop tiles above
            for (let row = Math.floor(index / this.gridSize); row > 0; row--) {
                const currentIndex = row * this.gridSize + col;
                const aboveIndex = (row - 1) * this.gridSize + col;
                
                this.grid[currentIndex].color = this.grid[aboveIndex].color;
                this.grid[currentIndex].element.dataset.color = this.grid[aboveIndex].color;
                this.grid[currentIndex].element.textContent = this.grid[aboveIndex].element.textContent;
            }
            
            // Create new tile at top
            const topIndex = col;
            const availableSymbols = this.symbols.filter(s => s.unlocked);
            const symbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
            
            this.grid[topIndex].color = symbol.id;
            this.grid[topIndex].element.dataset.color = symbol.id;
            this.grid[topIndex].element.textContent = symbol.char;
            this.grid[topIndex].element.classList.remove('matched');
        });
        
        setTimeout(() => this.checkMatches(), 100);
    }

    initDecoders() {
        this.decoders = [
            {
                id: 'VLF',
                name: 'VLF - Very Low Frequency',
                rate: 0.5, // docs per minute
                progress: 0,
                unlocked: true,
                active: true
            },
            {
                id: 'LF',
                name: 'LF - Low Frequency',
                rate: 0.3,
                progress: 0,
                unlocked: false,
                active: false
            },
            {
                id: 'MF',
                name: 'MF - Medium Frequency',
                rate: 0.2,
                progress: 0,
                unlocked: false,
                active: false
            }
        ];
        
        this.renderDecoders();
    }

    renderDecoders() {
        const container = document.getElementById('decoders-container');
        container.innerHTML = '';
        
        this.decoders.filter(d => d.unlocked).forEach(decoder => {
            const decoderEl = document.createElement('div');
            decoderEl.className = 'decoder';
            decoderEl.innerHTML = `
                <div class="decoder-header">
                    <span class="decoder-name">[${decoder.id}]</span>
                    <span class="decoder-status ${decoder.active ? 'active' : 'idle'}">
                        ${decoder.active ? 'ACTIVE' : 'IDLE'}
                    </span>
                </div>
                <div class="decoder-progress">
                    <div class="decoder-progress-bar" style="width: ${decoder.progress}%"></div>
                </div>
                <div class="decoder-info">
                    <span>${decoder.name}</span>
                    <span>+${decoder.rate} docs/min</span>
                </div>
            `;
            container.appendChild(decoderEl);
        });
    }

    generateDocument(type = 'transmission', frequency = 'VLF') {
        const docId = `doc_${String(this.stats.totalDocuments).padStart(4, '0')}`;
        const timestamp = new Date().toISOString();
        
        const templates = {
            transmission: [
                `SIGNAL DETECTED AT ${Math.floor(Math.random() * 360)} DEGREES\nSTRENGTH: ${Math.floor(Math.random() * 100)}%\nINTERFERENCE: MINIMAL`,
                `TRANSMISSION LOG ${docId}\nFREQUENCY: ${frequency}\nCOORDINATES: ${Math.random().toFixed(6)}, ${Math.random().toFixed(6)}`,
                `DECODING SEQUENCE INITIATED...\nPATTERN MATCH: ${Math.floor(Math.random() * 100)}%\nSTATUS: INCOMPLETE`,
                `FRAGMENT RECOVERED\nSOURCE: UNKNOWN\nTIMESTAMP: ${new Date().toLocaleTimeString()}\nCONTENT: [ENCRYPTED]`
            ]
        };
        
        const content = templates[type][Math.floor(Math.random() * templates[type].length)];
        
        const doc = {
            id: docId,
            name: `${docId}.txt`,
            type: type,
            frequency: frequency,
            timestamp: timestamp,
            content: content,
            folder: 'inbox'
        };
        
        this.documents.push(doc);
        this.folders.inbox.push(doc);
        this.stats.totalDocuments++;
        
        this.log(`NEW DOCUMENT: ${doc.name}`, 'info');
        this.renderDocuments();
        this.updateDisplay();
    }

    renderDocuments() {
        Object.keys(this.folders).forEach(folderName => {
            const folderEl = document.getElementById(folderName);
            folderEl.innerHTML = '';
            
            this.folders[folderName].forEach(doc => {
                const docEl = document.createElement('div');
                docEl.className = 'document';
                docEl.dataset.type = doc.type;
                docEl.innerHTML = `
                    <span class="doc-name">${doc.name}</span>
                    <span class="doc-meta">[${doc.frequency}]</span>
                `;
                docEl.addEventListener('click', () => this.openDocument(doc));
                folderEl.appendChild(docEl);
            });
            
            // Update folder count
            const folder = document.querySelector(`[data-folder="${folderName}"]`);
            const countSpan = folder.querySelector('.doc-count');
            countSpan.textContent = `(${this.folders[folderName].length})`;
        });
    }

    openDocument(doc) {
        const modal = document.getElementById('doc-modal');
        document.getElementById('doc-title').textContent = doc.name;
        document.getElementById('doc-content').textContent = doc.content;
        document.getElementById('doc-timestamp').textContent = `TIMESTAMP: ${new Date(doc.timestamp).toLocaleString()}`;
        document.getElementById('doc-frequency').textContent = `FREQUENCY: ${doc.frequency}`;
        
        modal.classList.add('active');
    }

    startGameLoop() {
        setInterval(() => {
            // Update decoders
            this.decoders.filter(d => d.active).forEach(decoder => {
                decoder.progress += (decoder.rate / 60) * (1000 / 1000); // per second
                
                if (decoder.progress >= 100) {
                    decoder.progress = 0;
                    this.generateDocument('transmission', decoder.id);
                }
            });
            
            this.renderDecoders();
            this.updateDisplay();
        }, 1000);
        
        // Auto-save every 30 seconds
        setInterval(() => {
            this.autoSave();
        }, 30000);
    }

    updateDisplay() {
        // Session time
        const sessionTime = Date.now() - this.stats.sessionStart;
        const hours = Math.floor(sessionTime / 3600000);
        const minutes = Math.floor((sessionTime % 3600000) / 60000);
        const seconds = Math.floor((sessionTime % 60000) / 1000);
        document.getElementById('session-time').textContent = 
            `SESSION: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        document.getElementById('total-matches').textContent = `MATCHES: ${this.stats.totalMatches}`;
        document.getElementById('total-docs').textContent = `DOCUMENTS: ${this.stats.totalDocuments}`;
        document.getElementById('fragments-count').textContent = `FRAGMENTS: ${this.stats.fragments}`;
        
        // Check for unlocks
        this.checkUnlocks();
    }

    checkUnlocks() {
        // Unlock LF decoder after 50 documents
        if (!this.decoders[1].unlocked && this.stats.totalDocuments >= 50) {
            this.decoders[1].unlocked = true;
            this.decoders[1].active = true;
            this.log('NEW DECODER UNLOCKED: LF', 'warning');
            this.renderDecoders();
        }
        
        // Unlock MF decoder after 150 documents
        if (!this.decoders[2].unlocked && this.stats.totalDocuments >= 150) {
            this.decoders[2].unlocked = true;
            this.decoders[2].active = true;
            this.log('NEW DECODER UNLOCKED: MF', 'warning');
            this.renderDecoders();
        }
    }

    checkIdleProgress() {
        const lastSave = localStorage.getItem('signal_archive_lastsave');
        if (lastSave) {
            const idleTime = Date.now() - parseInt(lastSave);
            const idleMinutes = Math.floor(idleTime / 60000);
            
            if (idleMinutes > 0) {
                this.log(`SYSTEM WAS IDLE FOR ${idleMinutes} MINUTES`, 'info');
                
                // Generate documents based on idle time
                const savedData = JSON.parse(localStorage.getItem('signal_archive_save'));
                if (savedData && savedData.decoders) {
                    savedData.decoders.filter(d => d.active).forEach(decoder => {
                        const docsGenerated = Math.floor(idleMinutes * decoder.rate);
                        for (let i = 0; i < docsGenerated; i++) {
                            this.generateDocument('transmission', decoder.id);
                        }
                    });
                }
                
                this.log(`GENERATED ${idleMinutes} IDLE DOCUMENTS`, 'success');
            }
        }
    }

    log(message, type = 'info') {
        const console = document.getElementById('console');
        const line = document.createElement('div');
        line.className = `console-line ${type}`;
        line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        console.appendChild(line);
        console.scrollTop = console.scrollHeight;
    }

    initEventListeners() {
        // Save button
        document.getElementById('save-btn').addEventListener('click', () => {
            this.saveGame();
            this.log('GAME SAVED', 'success');
        });
        
        // Load button
        document.getElementById('load-btn').addEventListener('click', () => {
            this.loadGame();
            this.log('GAME LOADED', 'success');
        });
        
        // Reset button
        document.getElementById('reset-btn').addEventListener('click', () => {
            if (confirm('RESET ALL PROGRESS? THIS CANNOT BE UNDONE.')) {
                localStorage.removeItem('signal_archive_save');
                localStorage.removeItem('signal_archive_lastsave');
                location.reload();
            }
        });
        
        // Export button
        document.getElementById('export-btn').addEventListener('click', () => {
            const data = this.getSaveData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `signal_archive_${Date.now()}.json`;
            a.click();
            this.log('SAVE EXPORTED', 'success');
        });
        
        // Import button
        document.getElementById('import-btn').addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        localStorage.setItem('signal_archive_save', JSON.stringify(data));
                        this.loadGame();
                        this.log('SAVE IMPORTED', 'success');
                    } catch (err) {
                        this.log('IMPORT FAILED: INVALID FILE', 'error');
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        });
        
        // Modal close button
        document.querySelector('.close-btn').addEventListener('click', () => {
            document.getElementById('doc-modal').classList.remove('active');
        });
        
        // Click outside modal to close
        document.getElementById('doc-modal').addEventListener('click', (e) => {
            if (e.target.id === 'doc-modal') {
                document.getElementById('doc-modal').classList.remove('active');
            }
        });
    }

    getSaveData() {
        return {
            stats: this.stats,
            documents: this.documents,
            folders: this.folders,
            decoders: this.decoders,
            symbols: this.symbols
        };
    }

    saveGame() {
        const data = this.getSaveData();
        localStorage.setItem('signal_archive_save', JSON.stringify(data));
        localStorage.setItem('signal_archive_lastsave', Date.now().toString());
        this.stats.lastSave = Date.now();
    }

    autoSave() {
        this.saveGame();
        this.log('AUTO-SAVED', 'info');
    }

    loadGame() {
        const data = localStorage.getItem('signal_archive_save');
        if (data) {
            const saveData = JSON.parse(data);
            this.stats = saveData.stats;
            this.documents = saveData.documents;
            this.folders = saveData.folders;
            this.decoders = saveData.decoders;
            this.symbols = saveData.symbols;
            
            this.renderDocuments();
            this.renderDecoders();
            this.updateDisplay();
        }
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
