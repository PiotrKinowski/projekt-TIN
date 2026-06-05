let wsManager, uiRenderer;
let myPlayerId = null, gameActive = false, currentGameId = null, myNick = null;

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('rules-modal');
    const rulesBtn = document.getElementById('rules-btn');
    const closeBtn = document.querySelector('.close-btn');
    const joinBtn = document.getElementById('join-btn');
    const nickInput = document.getElementById('nick-input');
    const gameArea = document.getElementById('game-area');
    const statusDiv = document.getElementById('game-status');

    rulesBtn.addEventListener('click', () => {
        modal.style.display = 'flex';   // lub 'block', ale flex ładniej centruje
    });
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    joinBtn.addEventListener('click', () => {
        const nick = nickInput.value.trim();
        if (!nick) {
            alert('Wprowadź nick!');
            return;
        }
        myNick = nick;
        document.getElementById('nick-section').style.display = 'none';
        gameArea.style.display = 'block';

        uiRenderer = new UIRenderer(
            document.getElementById('board'),
            statusDiv,
            (pitIndex) => { if (gameActive) wsManager.move(pitIndex); }
        );
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsManager = new WebSocketManager(
            `${protocol}//${location.host}`,
            () => { wsManager.join(myNick); uiRenderer.showWaiting(); },
            handleMessage,
            () => uiRenderer.showError('Połączenie przerwane'),
            console.error
        );
    });

    document.getElementById('refresh-scores').addEventListener('click', refreshScores);
    refreshScores();
});

function handleMessage(data) {
    switch (data.type) {
        case 'waiting':
            myPlayerId = data.playerId;
            uiRenderer.setPlayerId(myPlayerId);
            gameActive = false;
            uiRenderer.showWaiting();
            break;
        case 'game_start':
            myPlayerId = data.playerId;
            currentGameId = data.gameId;
            uiRenderer.setPlayerId(myPlayerId);
            uiRenderer.setNicks(data.myNick, data.opponentNick, myPlayerId);
            gameActive = true;
            uiRenderer.render(data.state.board, data.state.currentPlayer, data.state.gameOver, data.state.winner);
            let opponent = data.opponentNick || 'przeciwnik';
            uiRenderer.statusEl.innerText = `Gra rozpoczęta! Ty: ${data.myNick}, przeciwnik: ${opponent}. ${data.state.currentPlayer === myPlayerId ? 'Twój ruch!' : 'Czekaj na ruch przeciwnika.'}`;
            break;
        case 'state_update':
            if (!currentGameId) currentGameId = data.gameId;
            uiRenderer.render(data.state.board, data.state.currentPlayer, data.state.gameOver, data.state.winner);
            gameActive = !data.state.gameOver;
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
        const dateStr = new Date(s.date).toLocaleDateString();
        li.textContent = `${dateStr} - Zwycięzca: ${s.winner} (${s.player0Nick}:${s.player1Nick} ${s.player0Score}:${s.player1Score})`;
        list.appendChild(li);
    });
}