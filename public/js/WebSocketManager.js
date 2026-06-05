class WebSocketManager {
    constructor(url, onOpen, onMessage, onClose, onError) {
        this.ws = new WebSocket(url);
        this.ws.onopen = onOpen;
        this.ws.onmessage = e => onMessage(JSON.parse(e.data));
        this.ws.onclose = onClose;
        this.ws.onerror = onError;
    }
    send(type, payload) {
        if (this.ws.readyState === WebSocket.OPEN)
            this.ws.send(JSON.stringify({ type, ...payload }));
    }
    join() { this.send('join', {}); }
    move(pitIndex) { this.send('move', { pitIndex }); }
}