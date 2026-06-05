import { createStones, initGameBoard, applyMove, getWinner, copyBoard, getStoneCount } from './gameState.js';
import { isValidMove } from './rules.js';
import { initCanvas, drawBoard } from './boardRenderer.js';

let stones = [];
let board = [];
let currentPlayer = 0;   // 0 - dolny, 1 - górny
let gameActive = true;
let highlightedPits = [];

const statusSpan = document.getElementById('current-player');

function updateStatus() {
    if (!gameActive) {
        const winner = getWinner(board);
        if (winner === 0) statusSpan.textContent = "Gracz 1 (dół) wygrywa! 🎉";
        else if (winner === 1) statusSpan.textContent = "Gracz 2 (góra) wygrywa! 🎉";
        else statusSpan.textContent = "Remis! 🤝";
        return;
    }
    statusSpan.textContent = currentPlayer === 0 ? "Gracz 1 (dół)" : "Gracz 2 (góra)";
}

function refreshUI() {
    drawBoard(board, currentPlayer, gameActive, highlightedPits, handlePitClick);
    updateStatus();
}

function handlePitClick(holeIndex) {
    if (!gameActive) return;
    if (!isValidMove(board, currentPlayer, holeIndex)) return;
    
    const oldBoard = copyBoard(board);
    const { newBoard, extraTurn, gameEnded } = applyMove(board, currentPlayer, holeIndex);
    board = newBoard;
    
    // Znajdź dołki, które zmieniły liczbę kamieni (dla podświetlenia)
    const changed = [];
    for (let i = 0; i < board.length; i++) {
        if (getStoneCount(oldBoard, i) !== getStoneCount(board, i)) {
            changed.push(i);
        }
    }
    highlightedPits = changed;
    
    if (gameEnded) {
        gameActive = false;
        refreshUI();
        return;
    }
    
    if (!extraTurn) {
        currentPlayer = currentPlayer === 0 ? 1 : 0;
    }
    refreshUI();
}

function resetGame() {
    stones = createStones();
    board = initGameBoard(stones);
    currentPlayer = 0;
    gameActive = true;
    highlightedPits = [];
    refreshUI();
}

// Inicjalizacja
initCanvas();
resetGame();

document.getElementById('reset-btn').addEventListener('click', resetGame);