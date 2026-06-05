const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const http = require('http');

// ---------- CZYSTE FUNKCJE (programowanie funkcyjne) ----------
function distributeStones(board, startIdx, playerSide) {
    let newBoard = [...board];
    let stones = newBoard[startIdx];
    if (stones === 0) return null;
    newBoard[startIdx] = 0;
    let idx = startIdx;
    while (stones > 0) {
        idx = (idx + 1) % 14;
        if (playerSide === 0 && idx === 13) continue;
        if (playerSide === 1 && idx === 6) continue;
        newBoard[idx]++;
        stones--;
    }
    return { newBoard, lastPit: idx };
}

function checkCapture(board, lastPit, playerSide) {
    if (playerSide === 0 && lastPit >= 0 && lastPit <= 5 && board[lastPit] === 1) {
        const opposite = 12 - lastPit;
        if (board[opposite] > 0) {
            let newBoard = [...board];
            const captured = newBoard[opposite];
            newBoard[lastPit] = 0;
            newBoard[opposite] = 0;
            newBoard[6] += captured + 1;
            return { newBoard, captured };
        }
    } else if (playerSide === 1 && lastPit >= 7 && lastPit <= 12 && board[lastPit] === 1) {
        const opposite = 12 - lastPit;
        if (board[opposite] > 0) {
            let newBoard = [...board];
            const captured = newBoard[opposite];
            newBoard[lastPit] = 0;
            newBoard[opposite] = 0;
            newBoard[13] += captured + 1;
            return { newBoard, captured };
        }
    }
    return null;
}

function isGameOver(board) {
    let player0Empty = true;
    for (let i = 0; i <= 5; i++) if (board[i] !== 0) { player0Empty = false; break; }
    let player1Empty = true;
    for (let i = 7; i <= 12; i++) if (board[i] !== 0) { player1Empty = false; break; }
    return player0Empty || player1Empty;
}

function finalizeGame(board) {
    let newBoard = [...board];
    let player0Remaining = 0;
    for (let i = 0; i <= 5; i++) { player0Remaining += newBoard[i]; newBoard[i] = 0; }
    newBoard[6] += player0Remaining;
    let player1Remaining = 0;
    for (let i = 7; i <= 12; i++) { player1Remaining += newBoard[i]; newBoard[i] = 0; }
    newBoard[13] += player1Remaining;
    return newBoard;
}

// ---------- KLASA SILNIKA GRY (programowanie obiektowe) ----------
class GameEngine {
    constructor() {
        this.board = [4,4,4,4,4,4,0,4,4,4,4,4,4,0];
        this.currentPlayer = 0;
        this.gameOver = false;
        this.winner = null;
    }

    makeMove(pitIndex, player) {
        if (this.gameOver) return { success: false, reason: "Game already over" };
        if (player !== this.currentPlayer) return { success: false, reason: "Not your turn" };
        if ((player === 0 && (pitIndex < 0 || pitIndex > 5)) ||
            (player === 1 && (pitIndex < 7 || pitIndex > 12)))
            return { success: false, reason: "Invalid pit" };
        if (this.board[pitIndex] === 0) return { success: false, reason: "Pit is empty" };

        let result = distributeStones(this.board, pitIndex, player);
        if (!result) return { success: false, reason: "Distribution error" };
        let newBoard = result.newBoard;
        let lastPit = result.lastPit;

        let captureResult = checkCapture(newBoard, lastPit, player);
        if (captureResult) newBoard = captureResult.newBoard;

        let extraTurn = (player === 0 && lastPit === 6) || (player === 1 && lastPit === 13);
        let nextPlayer = extraTurn ? player : (player === 0 ? 1 : 0);
        let gameOver = isGameOver(newBoard);
        if (gameOver) {
            newBoard = finalizeGame(newBoard);
            let score0 = newBoard[6], score1 = newBoard[13];
            this.winner = score0 > score1 ? 0 : (score1 > score0 ? 1 : null);
            this.gameOver = true;
        }

        this.board = newBoard;
        this.currentPlayer = nextPlayer;
        return { success: true, board: this.board, currentPlayer: this.currentPlayer, gameOver: this.gameOver, winner: this.winner, extraTurn };
    }

    getState() {
        return { board: this.board, currentPlayer: this.currentPlayer, gameOver: this.gameOver, winner: this.winner };
    }
}

// ---------- SERWER HTTP + WEBSOCKET ----------
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Tablica wyników (dla uproszczenia w pamięci)
let scores = [];
app.post('/api/scores', (req, res) => {
    const { winner, player0Score, player1Score } = req.body;
    scores.push({ winner, player0Score, player1Score, date: new Date() });
    res.json({ success: true });
});
app.get('/api/scores', (req, res) => {
    res.json(scores.slice(-10));
});

// Zarządzanie grami
const games = new Map(); // gameId -> { engine, players: [ws], playerIds: [] }
const sockets = new Map(); // socketId -> { gameId, playerIndex }

wss.on('connection', (ws) => {
    const socketId = Date.now() + '-' + Math.random();
    ws.socketId = socketId;

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'join') {
            // Znajdź grę oczekującą
            let existingGame = null;
            for (let [id, game] of games.entries()) {
                if (game.players.length === 1) { existingGame = id; break; }
            }
            if (existingGame) {
                const game = games.get(existingGame);
                game.players.push(ws);
                game.playerIds.push(socketId);
                const playerIndex = game.players.length - 1;
                sockets.set(socketId, { gameId: existingGame, playerIndex });
                const state = game.engine.getState();
                game.players.forEach((player, idx) => {
                    player.send(JSON.stringify({
                        type: 'game_start',
                        playerId: idx,
                        gameId: existingGame,
                        state: state
                    }));
                });
            } else {
                const gameId = 'game_' + Date.now();
                const engine = new GameEngine();
                games.set(gameId, { engine, players: [ws], playerIds: [socketId] });
                sockets.set(socketId, { gameId, playerIndex: 0 });
                ws.send(JSON.stringify({ type: 'waiting', gameId, playerId: 0 }));
            }
        } else if (data.type === 'move') {
            const info = sockets.get(socketId);
            if (!info) return;
            const game = games.get(info.gameId);
            if (!game) return;
            const result = game.engine.makeMove(data.pitIndex, info.playerIndex);
            if (result.success) {
                const state = game.engine.getState();
                const msg = JSON.stringify({
                    type: 'state_update',
                    gameId: info.gameId,
                    state,
                    moveResult: { success: true, extraTurn: result.extraTurn }
                });
                game.players.forEach(p => p.send(msg));
                // Jeśli gra zakończona, zapisz wynik (przez serwer – unikamy duplikatów)
                if (state.gameOver) {
                    const winnerName = state.winner === 0 ? 'Gracz dolny' : (state.winner === 1 ? 'Gracz górny' : 'Remis');
                    scores.push({
                        winner: winnerName,
                        player0Score: state.board[6],
                        player1Score: state.board[13],
                        date: new Date()
                    });
                    // Ograniczenie do 10 ostatnich wyników
                    if (scores.length > 10) scores.shift();
                }
            } else {
                ws.send(JSON.stringify({ type: 'error', message: result.reason }));
            }
        }
    });

    ws.on('close', () => {
        const info = sockets.get(socketId);
        if (info) {
            const game = games.get(info.gameId);
            if (game) {
                const other = game.players.find(p => p.socketId !== socketId);
                if (other) other.send(JSON.stringify({ type: 'opponent_disconnected' }));
                games.delete(info.gameId);
            }
            sockets.delete(socketId);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));