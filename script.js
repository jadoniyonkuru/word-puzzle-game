class WordPuzzleGame {
    constructor() {
        this.gridSize = 10;
        this.grid = [];
        this.words = [];
        this.foundWords = new Set();
        this.score = 0;
        this.level = 1;
        this.timeLeft = 60;
        this.isPaused = false;
        this.isSelecting = false;
        this.selectedCells = [];
        this.timerInterval = null;
        this.hintsUsed = 0;
        this.maxHints = 3;
        this.wordPositions = new Map();
        
        this.wordLists = {
            1: ['CAT', 'DOG', 'BIRD', 'FISH', 'BEAR'],
            2: ['APPLE', 'BANANA', 'ORANGE', 'GRAPE', 'MANGO'],
            3: ['COMPUTER', 'KEYBOARD', 'MONITOR', 'MOUSE', 'SPEAKER'],
            4: ['JAVASCRIPT', 'PYTHON', 'CODING', 'PROGRAM', 'DEVELOP']
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.startNewGame();
    }
    
    setupEventListeners() {
        document.getElementById('new-game-btn').addEventListener('click', () => this.startNewGame());
        document.getElementById('hint-btn').addEventListener('click', () => this.showHint());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('play-again-btn').addEventListener('click', () => {
            document.getElementById('game-over-modal').classList.add('hidden');
            this.startNewGame();
        });
        
        // Mouse events for word selection
        document.addEventListener('mousedown', (e) => this.startSelection(e));
        document.addEventListener('mouseover', (e) => this.continueSelection(e));
        document.addEventListener('mouseup', () => this.endSelection());
        
        // Touch events for mobile
        document.addEventListener('touchstart', (e) => this.startSelection(e));
        document.addEventListener('touchmove', (e) => this.continueSelection(e));
        document.addEventListener('touchend', () => this.endSelection());
    }
    
    startNewGame() {
        this.score = 0;
        this.level = 1;
        this.timeLeft = 60;
        this.foundWords.clear();
        this.hintsUsed = 0;
        this.wordPositions.clear();
        this.isPaused = false;
        
        this.updateDisplay();
        this.updateHintDisplay();
        this.generatePuzzle();
        this.startTimer();
        
        document.getElementById('game-over-modal').classList.add('hidden');
    }
    
    generatePuzzle() {
        const wordList = this.wordLists[this.level] || this.wordLists[1];
        this.words = [...wordList];
        
        // Initialize empty grid
        this.grid = Array(this.gridSize).fill(null).map(() => 
            Array(this.gridSize).fill('')
        );
        
        // Place words in grid
        this.words.forEach(word => {
            this.placeWord(word);
        });
        
        // Fill empty cells with random letters
        this.fillEmptyCells();
        
        this.renderGrid();
        this.renderWordList();
    }
    
    placeWord(word) {
        const directions = [
            [0, 1],   // horizontal
            [1, 0],   // vertical
            [1, 1],   // diagonal down-right
            [-1, 1],  // diagonal up-right
            [0, -1],  // horizontal reverse
            [-1, 0],  // vertical reverse
            [-1, -1], // diagonal up-left
            [1, -1]   // diagonal down-left
        ];
        
        let placed = false;
        let attempts = 0;
        
        while (!placed && attempts < 100) {
            const direction = directions[Math.floor(Math.random() * directions.length)];
            const startRow = Math.floor(Math.random() * this.gridSize);
            const startCol = Math.floor(Math.random() * this.gridSize);
            
            if (this.canPlaceWord(word, startRow, startCol, direction)) {
                // Store word position for hint system
                this.wordPositions.set(word, {
                    startRow,
                    startCol,
                    direction,
                    length: word.length
                });
                
                for (let i = 0; i < word.length; i++) {
                    const row = startRow + direction[0] * i;
                    const col = startCol + direction[1] * i;
                    this.grid[row][col] = word[i];
                }
                placed = true;
            }
            attempts++;
        }
    }
    
    canPlaceWord(word, startRow, startCol, direction) {
        for (let i = 0; i < word.length; i++) {
            const row = startRow + direction[0] * i;
            const col = startCol + direction[1] * i;
            
            if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
                return false;
            }
            
            if (this.grid[row][col] !== '' && this.grid[row][col] !== word[i]) {
                return false;
            }
        }
        return true;
    }
    
    fillEmptyCells() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                if (this.grid[row][col] === '') {
                    this.grid[row][col] = letters[Math.floor(Math.random() * letters.length)];
                }
            }
        }
    }
    
    renderGrid() {
        const gridElement = document.getElementById('puzzle-grid');
        gridElement.innerHTML = '';
        
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.textContent = this.grid[row][col];
                cell.dataset.row = row;
                cell.dataset.col = col;
                gridElement.appendChild(cell);
            }
        }
    }
    
    renderWordList() {
        const wordListElement = document.getElementById('word-list');
        wordListElement.innerHTML = '';
        
        this.words.forEach(word => {
            const wordElement = document.createElement('div');
            wordElement.className = 'word-item';
            wordElement.textContent = word;
            wordElement.dataset.word = word;
            
            if (this.foundWords.has(word)) {
                wordElement.classList.add('found');
            }
            
            wordListElement.appendChild(wordElement);
        });
    }
    
    startSelection(e) {
        if (this.isPaused) return;
        
        const cell = e.target.closest('.grid-cell');
        if (!cell) return;
        
        this.isSelecting = true;
        this.selectedCells = [cell];
        cell.classList.add('selecting');
        e.preventDefault();
    }
    
    continueSelection(e) {
        if (!this.isSelecting || this.isPaused) return;
        
        const cell = e.target.closest('.grid-cell');
        if (!cell) return;
        
        if (!this.selectedCells.includes(cell)) {
            // Check if cell is adjacent to last selected cell
            const lastCell = this.selectedCells[this.selectedCells.length - 1];
            if (this.isAdjacent(lastCell, cell)) {
                this.selectedCells.push(cell);
                cell.classList.add('selecting');
            }
        }
        
        e.preventDefault();
    }
    
    endSelection() {
        if (!this.isSelecting) return;
        
        this.isSelecting = false;
        const selectedWord = this.getSelectedWord();
        
        if (this.words.includes(selectedWord) && !this.foundWords.has(selectedWord)) {
            this.foundWord(selectedWord);
        }
        
        // Clear selection
        this.selectedCells.forEach(cell => {
            cell.classList.remove('selecting');
        });
        this.selectedCells = [];
    }
    
    isAdjacent(cell1, cell2) {
        const row1 = parseInt(cell1.dataset.row);
        const col1 = parseInt(cell1.dataset.col);
        const row2 = parseInt(cell2.dataset.row);
        const col2 = parseInt(cell2.dataset.col);
        
        const rowDiff = Math.abs(row1 - row2);
        const colDiff = Math.abs(col1 - col2);
        
        return rowDiff <= 1 && colDiff <= 1 && (rowDiff !== 0 || colDiff !== 0);
    }
    
    getSelectedWord() {
        return this.selectedCells.map(cell => cell.textContent).join('');
    }
    
    foundWord(word) {
        this.foundWords.add(word);
        this.score += word.length * 10;
        
        // Mark cells as found
        this.selectedCells.forEach(cell => {
            cell.classList.add('found');
        });
        
        // Update word list
        const wordElement = document.querySelector(`[data-word="${word}"]`);
        if (wordElement) {
            wordElement.classList.add('found');
        }
        
        this.updateDisplay();
        
        // Check if level complete
        if (this.foundWords.size === this.words.length) {
            this.levelComplete();
        }
    }
    
    levelComplete() {
        this.level++;
        this.score += 100; // Bonus for completing level
        this.timeLeft = Math.min(this.timeLeft + 30, 120); // Add time but cap at 2 minutes
        
        if (this.level <= 4) {
            this.foundWords.clear();
            this.generatePuzzle();
            this.updateDisplay();
        } else {
            this.gameComplete();
        }
    }
    
    showHint() {
        if (this.isPaused || this.hintsUsed >= this.maxHints) return;
        
        const remainingWords = this.words.filter(word => !this.foundWords.has(word));
        if (remainingWords.length === 0) return;
        
        const hintWord = remainingWords[Math.floor(Math.random() * remainingWords.length)];
        const wordPosition = this.wordPositions.get(hintWord);
        
        if (wordPosition) {
            // Highlight the starting letter cell
            const startCell = document.querySelector(
                `.grid-cell[data-row="${wordPosition.startRow}"][data-col="${wordPosition.startCol}"]`
            );
            
            if (startCell) {
                startCell.classList.add('hint-highlight');
                
                // Remove highlight after 3 seconds
                setTimeout(() => {
                    startCell.classList.remove('hint-highlight');
                }, 3000);
            }
            
            // Also highlight the word in the word list
            const wordElement = document.querySelector(`[data-word="${hintWord}"]`);
            if (wordElement) {
                wordElement.style.animation = 'pulse 1s ease-in-out 3';
                setTimeout(() => {
                    wordElement.style.animation = '';
                }, 3000);
            }
        }
        
        this.hintsUsed++;
        this.updateHintDisplay();
        
        // Deduct points for hint
        this.score = Math.max(0, this.score - 5);
        this.updateDisplay();
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pause-btn');
        pauseBtn.textContent = this.isPaused ? 'Resume' : 'Pause';
        
        if (this.isPaused) {
            clearInterval(this.timerInterval);
        } else {
            this.startTimer();
        }
    }
    
    startTimer() {
        clearInterval(this.timerInterval);
        
        this.timerInterval = setInterval(() => {
            if (!this.isPaused) {
                this.timeLeft--;
                this.updateDisplay();
                
                if (this.timeLeft <= 0) {
                    this.gameOver();
                }
            }
        }, 1000);
    }
    
    updateDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('timer').textContent = this.timeLeft;
    }
    
    updateHintDisplay() {
        const remainingHints = this.maxHints - this.hintsUsed;
        document.getElementById('hints-remaining').textContent = remainingHints;
        
        // Disable hint button if no hints remaining
        const hintBtn = document.getElementById('hint-btn');
        hintBtn.disabled = remainingHints <= 0;
        hintBtn.textContent = remainingHints <= 0 ? 'No Hints' : 'Hint';
    }
    
    gameOver() {
        clearInterval(this.timerInterval);
        
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('words-found').textContent = this.foundWords.size;
        document.getElementById('total-words').textContent = this.words.length;
        document.getElementById('game-over-modal').classList.remove('hidden');
    }
    
    gameComplete() {
        this.score += 500; // Big bonus for completing all levels
        this.gameOver();
        
        // Change modal text for completion
        const modalTitle = document.querySelector('#game-over-modal h2');
        modalTitle.textContent = 'Congratulations! You Won!';
    }
}

// Add pulse animation for hints
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { transform: scale(1); background-color: #f1f3f5; }
        50% { transform: scale(1.1); background-color: #ffd43b; }
    }
`;
document.head.appendChild(style);

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WordPuzzleGame();
});
