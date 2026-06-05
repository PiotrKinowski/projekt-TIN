let wsManager, uiRenderer;
let myPlayerId = null, gameActive = false, currentGameId = null, scoreSaved = false;

document.addEventListener('DOMContentLoaded', () => {
    uiRenderer = new UIRenderer(
        document.getElementById('board'),
        document.getElementById('game-status'),
        (pitIndex) => { if (gameActive) wsManager.move(pitIndex); }
    );
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    wsManager = new WebSocketManager(
        `${protocol}//${location.host}`,
        () => { wsManager.join(); uiRenderer.showWaiting(); },
        handleMessage,
        () => uiRenderer.showError('Połączenie przerwane'),
        () => console.error
    );
    document.getElementById('refresh-scores').addEventListener('click', refreshScores);
    refreshScores();
});

function handleMessage(data) {
    switch (data.type) {
        case 'waiting':
            myPlayerId = data.playerId;
            uiRenderer.setPlayerId(myPlayerId);
            gameActive = false;
            break;
        case 'game_start':
            myPlayerId = data.playerId;
            currentGameId = data.gameId;
            scoreSaved = false;
            uiRenderer.setPlayerId(myPlayerId);
            gameActive = true;
            uiRenderer.render(data.state.board, data.state.currentPlayer, data.state.gameOver, data.state.winner);
            break;
        case 'state_update':
            if (!currentGameId) currentGameId = data.gameId;
            uiRenderer.render(data.state.board, data.state.currentPlayer, data.state.gameOver, data.state.winner);
            gameActive = !data.state.gameOver;
            if (data.state.gameOver && !scoreSaved) {
                scoreSaved = true;
                const winnerName = data.state.winner === 0 ? 'Gracz dolny' : (data.state.winner === 1 ? 'Gracz górny' : 'Remis');
                ScoreAPI.saveScore(winnerName, data.state.board[6], data.state.board[13]).then(refreshScores);
            }
            break;
        case 'error':
            uiRenderer.showError(data.message);
            break;
        case 'opponent_disconnected':
            uiRenderer.opponentDisconnected();
            gameActive = false;
            break;
    }
}

async function refreshScores() {
    const scores = await ScoreAPI.getScores();
    const list = document.getElementById('scores-list');
    list.innerHTML = '';
    scores.slice().reverse().forEach(s => {
        const li = document.createElement('li');
        li.textContent = `${new Date(s.date).toLocaleString()} - ${s.winner} (${s.player0Score}:${s.player1Score})`;
        list.appendChild(li);
    });
}