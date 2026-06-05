class ScoreAPI {
    static async saveScore(winner, player0Score, player1Score) {
        await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ winner, player0Score, player1Score })
        });
    }
    static async getScores() {
        const res = await fetch('/api/scores');
        return res.json();
    }
}