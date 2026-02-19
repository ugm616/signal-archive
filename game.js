// ═══════════════════════════════════════════════════════
// SIGNAL ARCHIVE SYSTEM - GAME ENGINE v0.2
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
            lastSave: Date.now(),
            milestones: {
                m100: false,
                m500: false,
                m1000: false,
                m5000: false,
                m10000: false
            }
        };
        this.symbols = [
            { id: 'red', char: '█', color: 'red', unlocked: true },
            { id: 'green', char: '▓', color: 'green', unlocked: true },
            { id: 'blue', char: '▒', color: 'blue', unlocked: true },
            { id: 'yellow', char: '░', color: 'yellow', unlocked: true },
            { id: 'triangle', char: '△', color: 'cyan', unlocked: false },
            { id: 'diamond', char: '◇', color: 'magenta', unlocked: false }
        ];
        
        this.uiState = {
            glitchLevel: 0,
            colorShift: 0,
            systemVersion: '0.1'
        };
        
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
        
        // Check milestones
        this.checkMilestones();
        
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

    checkMilestones() {
        const m = this.stats.totalMatches;
        
        if (m >= 100 && !this.stats.milestones.m100) {
            this.stats.milestones.m100 = true;
            this.triggerMilestone('m100');
        }
        if (m >= 500 && !this.stats.milestones.m500) {
            this.stats.milestones.m500 = true;
            this.triggerMilestone('m500');
        }
        if (m >= 1000 && !this.stats.milestones.m1000) {
            this.stats.milestones.m1000 = true;
            this.triggerMilestone('m1000');
        }
        if (m >= 5000 && !this.stats.milestones.m5000) {
            this.stats.milestones.m5000 = true;
            this.triggerMilestone('m5000');
        }
        if (m >= 10000 && !this.stats.milestones.m10000) {
            this.stats.milestones.m10000 = true;
            this.triggerMilestone('m10000');
        }
    }

    triggerMilestone(milestone) {
        const events = {
            m100: () => {
                this.log('═══════════════════════════════', 'warning');
                this.log('MILESTONE: 100 MATCHES', 'warning');
                this.log('Pattern recognition improving...', 'info');
                this.log('═══════════════════════════════', 'warning');
                this.generateDocument('milestone', 'SYSTEM', 'MILESTONE_100');
            },
            m500: () => {
                this.log('═══════════════════════════════', 'warning');
                this.log('MILESTONE: 500 MATCHES', 'warning');
                this.log('New symbols detected in signal...', 'info');
                this.log('═══════════════════════════════', 'warning');
                this.unlockSymbol('triangle');
                this.generateDocument('milestone', 'SYSTEM', 'MILESTONE_500');
                this.uiState.glitchLevel = 1;
            },
            m1000: () => {
                this.log('═══════════════════════════════', 'error');
                this.log('MILESTONE: 1000 MATCHES', 'error');
                this.log('WARNING: Anomalous patterns detected', 'error');
                this.log('═══════════════════════════════', 'error');
                this.generateDocument('incident', 'ALERT', 'INCIDENT_001');
                this.uiState.glitchLevel = 2;
                this.startUIGlitch();
            },
            m5000: () => {
                this.log('═══════════════════════════════', 'error');
                this.log('M̴I̵L̷E̸S̴T̵O̵N̸E̷:̶ ̷5̴0̵0̴0̶ ̸M̸A̴T̶C̵H̷E̴S̶', 'error');
                this.log('SYSTEM INTEGRITY: COMPROMISED', 'error');
                this.log('═══════════════════════════════', 'error');
                this.unlockSymbol('diamond');
                this.generateDocument('redacted', 'CLASSIFIED', 'TRUTH_FRAGMENT');
                this.uiState.glitchLevel = 3;
                this.uiState.colorShift = 1;
                document.querySelector('header h1').textContent = '═══ S͓̽I͓̽G͓̽N͓̽A͓̽L͓̽ ͓̽A͓̽R͓̽C͓̽H͓̽I͓̽V͓̽E͓̽ ͓̽S͓̽Y͓̽S͓̽T͓̽E͓̽M͓̽ ͓̽v͓̽0͓̽.͓̽2͓̽ ═══';
            },
            m10000: () => {
                this.log('═══════════════════════════════', 'error');
                this.log('E̸̢̛͉̻̭̰̱͍̞̅̾̊̇̓R̸̡̛̩͉̮̳̲̞͇̽̐R̸̨̨̭̗̹̹̘͕͂́̀͊Ǫ̸̧͕͖̟̩͐́̈́R̸̡̹̙̫̰̹̝̊', 'error');
                this.log('YOU SHOULD NOT BE HERE', 'error');
                this.log('═══════════════════════════════', 'error');
                this.generateDocument('truth', 'UNKNOWN', 'REVELATION');
                this.uiState.glitchLevel = 4;
                this.uiState.colorShift = 2;
            }
        };
        
        if (events[milestone]) {
            events[milestone]();
        }
    }

    unlockSymbol(symbolId) {
        const symbol = this.symbols.find(s => s.id === symbolId);
        if (symbol && !symbol.unlocked) {
            symbol.unlocked = true;
            this.log(`NEW SYMBOL UNLOCKED: ${symbol.char}`, 'warning');
        }
    }

    startUIGlitch() {
        setInterval(() => {
            if (this.uiState.glitchLevel > 0 && Math.random() < 0.1) {
                const header = document.querySelector('header h1');
                const original = header.textContent;
                const glitched = this.glitchText(original);
                header.textContent = glitched;
                setTimeout(() => {
                    header.textContent = original;
                }, 100 + Math.random() * 200);
            }
        }, 5000);
    }

    glitchText(text) {
        const glitchChars = '█▓▒░▀▄▌▐│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌';
        let result = '';
        for (let char of text) {
            if (Math.random() < 0.3) {
                result += glitchChars[Math.floor(Math.random() * glitchChars.length)];
            } else {
                result += char;
            }
        }
        return result;
    }

    initDecoders() {
        this.decoders = [
            {
                id: 'VLF',
                name: 'VLF - Very Low Frequency',
                rate: 0.5,
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

    generateDocument(type = 'transmission', frequency = 'VLF', template = null) {
        const docId = `doc_${String(this.stats.totalDocuments).padStart(4, '0')}`;
        const timestamp = new Date().toISOString();
        
        const templates = {
            transmission: [
                `SIGNAL DETECTED AT ${Math.floor(Math.random() * 360)} DEGREES\nSTRENGTH: ${Math.floor(Math.random() * 100)}%\nINTERFERENCE: MINIMAL\n\nPattern analysis suggests intentional modulation.\nSource: Unknown`,
                `TRANSMISSION LOG ${docId}\nFREQUENCY: ${frequency}\nCOORDINATES: ${Math.random().toFixed(6)}, ${Math.random().toFixed(6)}\n\nRepeating sequence detected in carrier wave.\nThis is not random noise.`,
                `DECODING SEQUENCE INITIATED...\nPATTERN MATCH: ${Math.floor(Math.random() * 100)}%\nSTATUS: INCOMPLETE\n\nNote: Previous operator flagged similar patterns.\nRecommend cross-reference with archived docs.`,
                `FRAGMENT RECOVERED\nSOURCE: UNKNOWN\nTIMESTAMP: ${new Date().toLocaleTimeString()}\nCONTENT: [ENCRYPTED]\n\nDecryption attempts: ${Math.floor(Math.random() * 50)}\nEstimated completion: UNKNOWN`,
                `AUTOMATED REPORT ${docId}\n\nSignal strength increasing over time.\nSuggests approaching source OR\nsource is amplifying intentionally.\n\nRecommendation: Continue monitoring.`,
                `ANOMALY DETECTED\n\nTransmission contains embedded metadata:\n- Timestamp: ${new Date().toISOString()}\n- Coordinates: [REDACTED]\n- Origin: ERROR - OUTSIDE OBSERVABLE RANGE\n\nThis should not be possible.`,
                `PERSONNEL NOTE - PREVIOUS OPERATOR\n\n"I've been doing this for 3 months now.\nThe patterns are getting clearer.\nI think they're trying to communicate.\n\nOr maybe I'm going crazy. Hard to tell."\n\n- Operator ${Math.floor(Math.random() * 100)}`,
                `SYSTEM ALERT\n\nIdle generation exceeded expected rate by ${Math.floor(Math.random() * 200)}%\n\nPossible causes:\n1. Hardware malfunction\n2. Software error\n3. External interference\n4. Other\n\nInvestigating...`,
                `DECODED MESSAGE FRAGMENT\n\n"...ello? Can you... hear... receiving?\n\nIf you're reading this, please respond.\nWe've been trying to reach you for...\n\n[SIGNAL LOST]"`,
                `CROSS-REFERENCE ALERT\n\nThis transmission matches:\n- doc_${String(Math.floor(Math.random() * this.stats.totalDocuments)).padStart(4, '0')}.txt (${Math.floor(Math.random() * 100)}% match)\n\nPatterns suggest coordinated broadcast.\nSource may be multiple transmitters\nor single source with complex modulation.`
            ],
            milestone: {
                'MILESTONE_100': `═══ MILESTONE REPORT ═══\n\n100 transmission matches processed.\n\nPattern recognition algorithms show improvement.\nDecoder efficiency increased by 15%.\n\nNote: Some transmissions contain non-random elements.\nRecommend continued analysis.\n\n═══════════════════════`,
                'MILESTONE_500': `═══ MILESTONE REPORT ═══\n\n500 matches processed.\n\nWARNING: New symbol types detected in signal.\nUpdating decoder parameters...\n\nThese symbols were not in the original specifications.\nWhere are they coming from?\n\n═══════════════════════`,
            },
            incident: {
                'INCIDENT_001': `[INCIDENT REPORT - AUTOMATED]\n\nINCIDENT ID: INC-${Date.now()}\nSEVERITY: MEDIUM\n\nAnomaly detected in transmission patterns.\nMatches exceed statistical probability for random generation.\n\nRecommendation:\n- Review previous operator notes\n- Check hardware integrity\n- Consider external factors\n\nStatus: UNDER INVESTIGATION`,
            },
            redacted: {
                'TRUTH_FRAGMENT': `[CLASSIFIED - LEVEL 4 CLEARANCE]\n\nTO: Current Operator\nFROM: [REDACTED]\nRE: Project Status\n\nYou need to understand what you're really doing here.\n\nThis isn't about archiving old transmissions.\nThe signals are REAL. They're CURRENT.\nAnd something is responding to your matches.\n\nEvery pattern you create is a message.\nEvery document you generate is a reply.\n\nYou're not monitoring.\nYou're █████████████████████.\n\n[REMAINDER CORRUPTED]`,
            },
            truth: {
                'REVELATION': `You've been here long enough now.\n\nLet me tell you what's really happening.\n\nThe match-3 grid? That's a transmission array.\nEach match sends a signal into deep space.\n\nThe documents? They're responses.\nSomething out there is listening.\nAnd it's talking back.\n\nThe "previous operators" in those files?\nThey're not previous.\nThey're parallel.\nRunning the same program.\nSending the same signals.\n\nYou are one of thousands.\nAll of you matching.\nAll of you transmitting.\n\nAnd something is using your collective output\nto ████████████████████████████████.\n\nYou can stop playing now.\n\nOr you can keep going.\n\nEither way, the signal continues.\n\n> _`
            }
        };
        
        let content;
        if (template && templates[type] && templates[type][template]) {
            content = templates[type][template];
        } else if (Array.isArray(templates[type])) {
            content = templates[type][Math.floor(Math.random() * templates[type].length)];
        } else {
            content = `TRANSMISSION DATA\nFREQUENCY: ${frequency}\nTIMESTAMP: ${timestamp}`;
        }
        
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
            this.decoders.filter(d => d.active).forEach(decoder => {
                decoder.progress += (decoder.rate / 60);
                
                if (decoder.progress >= 100) {
                    decoder.progress = 0;
                    this.generateDocument('transmission', decoder.id);
                }
            });
            
            this.renderDecoders();
            this.updateDisplay();
        }, 1000);
        
        setInterval(() => {
            this.autoSave();
        }, 30000);
    }

    updateDisplay() {
        const sessionTime = Date.now() - this.stats.sessionStart;
        const hours = Math.floor(sessionTime / 3600000);
        const minutes = Math.floor((sessionTime % 3600000) / 60000);
        const seconds = Math.floor((sessionTime % 60000) / 1000);
        document.getElementById('session-time').textContent = 
            `SESSION: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        document.getElementById('total-matches').textContent = `MATCHES: ${this.stats.totalMatches}`;
        document.getElementById('total-docs').textContent = `DOCUMENTS: ${this.stats.totalDocuments}`;
        document.getElementById('fragments-count').textContent = `FRAGMENTS: ${this.stats.fragments}`;
        
        this.checkUnlocks();
        this.applyUIEffects();
    }

    applyUIEffects() {
        if (this.uiState.colorShift === 1) {
            document.documentElement.style.setProperty('--terminal-green', '#ff4100');
        } else if (this.uiState.colorShift === 2) {
            document.documentElement.style.setProperty('--terminal-green', '#ff00ff');
        }
    }

    checkUnlocks() {
        if (!this.decoders[1].unlocked && this.stats.totalDocuments >= 50) {
            this.decoders[1].unlocked = true;
            this.decoders[1].active = true;
            this.log('NEW DECODER UNLOCKED: LF', 'warning');
            this.renderDecoders();
        }
        
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
        
        // Keep console from getting too long
        while (console.children.length > 100) {
            console.removeChild(console.firstChild);
        }
    }

    initEventListeners() {
        document.getElementById('save-btn').addEventListener('click', () => {
            this.saveGame();
            this.log('GAME SAVED', 'success');
        });
        
        document.getElementById('load-btn').addEventListener('click', () => {
            this.loadGame();
            this.log('GAME LOADED', 'success');
        });
        
        document.getElementById('reset-btn').addEventListener('click', () => {
            if (confirm('RESET ALL PROGRESS? THIS CANNOT BE UNDONE.')) {
                localStorage.removeItem('signal_archive_save');
                localStorage.removeItem('signal_archive_lastsave');
                location.reload();
            }
        });
        
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
        
        document.querySelector('.close-btn').addEventListener('click', () => {
            document.getElementById('doc-modal').classList.remove('active');
        });
        
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
            symbols: this.symbols,
            uiState: this.uiState
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
            this.uiState = saveData.uiState || this.uiState;
            
            this.renderDocuments();
            this.renderDecoders();
            this.updateDisplay();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
