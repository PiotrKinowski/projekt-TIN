class UIRenderer {
    constructor(container, statusEl, onPitClick) {
        this.container = container;
        this.statusEl = statusEl;
        this.onPitClick = onPitClick;
        this.myPlayerId = null;
    }
    setPlayerId(id) { this.myPlayerId = id; }
    render(board, currentPlayer, gameOver, winner) {
        this.container.innerHTML = '';

        // Górny rząd
        const topRow = document.createElement('div');
        topRow.className = 'row';
        const store1 = this.createStore(board[13], 'store-left');
        topRow.appendChild(store1);
        for (let i = 12; i >= 7; i--)
            topRow.appendChild(this.createPit(i, board[i]));
        this.container.appendChild(topRow);

        // Dolny rząd
        const bottomRow = document.createElement('div');
        bottomRow.className = 'row';
        for (let i = 0; i <= 5; i++)
            bottomRow.appendChild(this.createPit(i, board[i]));
        const store0 = this.createStore(board[6], 'store-right');
        bottomRow.appendChild(store0);
        this.container.appendChild(bottomRow);

        if (gameOver) {
            const winnerText = winner !== null ? `Wygrał ${winner === 0 ? 'gracz dolny' : 'gracz górny'}` : 'Remis';
            this.statusEl.innerText = `Koniec gry! ${winnerText} (${board[6]}:${board[13]})`;
        } else {
            const turn = currentPlayer === 0 ? 'Gracz dolny' : 'Gracz górny';
            let info = `Tura: ${turn}`;
            if (this.myPlayerId !== null && currentPlayer !== this.myPlayerId) info += ' (czekaj)';
            else if (this.myPlayerId !== null && currentPlayer === this.myPlayerId) info += ' (Twój ruch!)';
            this.statusEl.innerText = info;
        }
        this.updateDisabledState(gameOver, currentPlayer);
    }
    createPit(index, stones) {
        const div = document.createElement('div');
        div.className = 'pit';
        div.textContent = stones;
        div.dataset.index = index;
        div.addEventListener('click', () => {
            if (!div.classList.contains('disabled')) this.onPitClick(index);
        });
        return div;
    }
    createStore(stones, className) {
        const div = document.createElement('div');
        div.className = `store ${className}`;
        div.textContent = stones;
        return div;
    }
    updateDisabledState(gameOver, currentPlayer) {
        document.querySelectorAll('.pit').forEach(pit => {
            const idx = parseInt(pit.dataset.index);
            if (gameOver) pit.classList.add('disabled');
            else if (this.myPlayerId !== null && currentPlayer === this.myPlayerId) {
                const isMyPit = (this.myPlayerId === 0 && idx >=0 && idx <=5) ||
                                (this.myPlayerId === 1 && idx >=7 && idx <=12);
                if (isMyPit) pit.classList.remove('disabled');
                else pit.classList.add('disabled');
            } else pit.classList.add('disabled');
        });
    }
    showWaiting() { this.statusEl.innerText = 'Oczekiwanie na drugiego gracza...'; }
    showError(msg) { this.statusEl.innerText = `Błąd: ${msg}`; }
    opponentDisconnected() {
        this.statusEl.innerText = 'Przeciwnik rozłączony. Odśwież stronę.';
        document.querySelectorAll('.pit').forEach(p => p.classList.add('disabled'));
    }
}