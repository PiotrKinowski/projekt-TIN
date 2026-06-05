// Generowanie losowych wartości
function randomRange(min, max) {
    return min + Math.random() * (max - min);
}

// Klasa pojedynczego kamienia
class Stone {
    constructor(id, baseHoleIndex) {
        this.id = id;
        this.color = `hsl(${Math.floor(Math.random() * 360)}, 70%, 55%)`; // losowy kolor
        // Pozycja względem środka dołka (x, y) w zakresie -12..12 pikseli (dla czytelności)
        this.offsetX = randomRange(-10, 10);
        this.offsetY = randomRange(-10, 10);
        this.rotation = randomRange(-Math.PI / 3, Math.PI / 3); // radiany
        this.currentHole = baseHoleIndex; // początkowy dołek
    }
}

// Generuje wszystkie kamienie dla nowej gry
export function createStones() {
    const stones = [];
    let id = 0;
    // Dla dołków 0-5 (gracz dolny) i 7-12 (gracz górny) – każdy zaczyna z 4 kamieniami
    const pits = [0,1,2,3,4,5, 7,8,9,10,11,12];
    for (let pit of pits) {
        for (let i = 0; i < 4; i++) {
            stones.push(new Stone(id++, pit));
        }
    }
    return stones;
}

// Inicjalizuje stan gry: tablicę board (każda komórka to tablica kamieni)
export function initGameBoard(stones) {
    const board = Array(14).fill().map(() => []);
    for (let stone of stones) {
        board[stone.currentHole].push(stone);
    }
    return board;
}

// Kopiuje stan gry (do cofania i porównań)
export function copyBoard(board) {
    return board.map(cell => [...cell]);
}

// Przesuwa kamienie z dołka src do kolejnych dołków według reguł mankali
// Zwraca nową planszę, informację o dodatkowej turze i zakończeniu gry
export function applyMove(board, player, srcHole) {
    const newBoard = copyBoard(board);
    const stonesToMove = [...newBoard[srcHole]];
    newBoard[srcHole] = [];
    
    let currentIdx = srcHole;
    let extraTurn = false;
    
    // Rozsiewanie
    for (let i = 0; i < stonesToMove.length; i++) {
        currentIdx = (currentIdx + 1) % 14;
        // Pomijamy mankal przeciwnika
        if (player === 0 && currentIdx === 13) {
            currentIdx = (currentIdx + 1) % 14;
        }
        if (player === 1 && currentIdx === 6) {
            currentIdx = (currentIdx + 1) % 14;
        }
        newBoard[currentIdx].push(stonesToMove[i]);
        // Uaktualnij currentHole każdego kamienia
        stonesToMove[i].currentHole = currentIdx;
    }
    
    const lastHole = currentIdx;
    
    // Dodatkowa tura
    if ((player === 0 && lastHole === 6) || (player === 1 && lastHole === 13)) {
        extraTurn = true;
    }
    
    // Bicie
    if (lastHole !== 6 && lastHole !== 13) {
        const isPlayer0Hole = (player === 0 && lastHole >= 0 && lastHole <= 5);
        const isPlayer1Hole = (player === 1 && lastHole >= 7 && lastHole <= 12);
        if ((isPlayer0Hole || isPlayer1Hole) && newBoard[lastHole].length === 1) {
            const opposite = 12 - lastHole;
            const capturedStones = [...newBoard[opposite]];
            const targetMancala = player === 0 ? 6 : 13;
            // Przesuń zbite kamienie do mankala
            for (let s of capturedStones) {
                s.currentHole = targetMancala;
                newBoard[targetMancala].push(s);
            }
            newBoard[opposite] = [];
            // Przesuń również kamień, który spowodował bicie (ten w lastHole)
            const capturingStone = newBoard[lastHole].pop();
            capturingStone.currentHole = targetMancala;
            newBoard[targetMancala].push(capturingStone);
        }
    }
    
    // Sprawdzenie zakończenia gry
    let gameEnded = false;
    const player0Empty = newBoard.slice(0,6).every(cell => cell.length === 0);
    const player1Empty = newBoard.slice(7,13).every(cell => cell.length === 0);
    
    if (player0Empty || player1Empty) {
        gameEnded = true;
        // Zbierz pozostałe kamienie do mankali
        if (player0Empty) {
            for (let i = 7; i <= 12; i++) {
                for (let s of newBoard[i]) {
                    s.currentHole = 13;
                    newBoard[13].push(s);
                }
                newBoard[i] = [];
            }
        }
        if (player1Empty) {
            for (let i = 0; i <= 5; i++) {
                for (let s of newBoard[i]) {
                    s.currentHole = 6;
                    newBoard[6].push(s);
                }
                newBoard[i] = [];
            }
        }
    }
    
    return { newBoard, extraTurn, gameEnded };
}

// Pomocnicze: liczba kamieni w dołku
export function getStoneCount(board, hole) {
    return board[hole].length;
}

// Zwycięzca
export function getWinner(board) {
    const left = board[6].length;
    const right = board[13].length;
    if (left > right) return 0;
    if (right > left) return 1;
    return -1;
}