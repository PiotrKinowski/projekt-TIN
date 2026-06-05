import { getStoneCount } from './gameState.js';

// Stałe geometryczne
const CANVAS_W = 1000;
const CANVAS_H = 500;
const PIT_RADIUS = 38;
const MANCALA_W = 80;
const PIT_COLS = 6;
const PIT_ROW_Y_TOP = 130;
const PIT_ROW_Y_BOTTOM = 340;
const FIRST_PIT_X = 180;
const PIT_SPACING = 92;

let canvas, ctx;

export function initCanvas() {
    canvas = document.getElementById('mancala-canvas');
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
}

// Rysuje pojedynczą fasolkę
function drawBean(x, y, rotation, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    // Kształt fasolki: elipsa z przewężeniem
    ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.shadowBlur = 0;
    // Ciemniejsza krawędź
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // Dodaj mały połysk
    ctx.beginPath();
    ctx.ellipse(-2, -1, 2, 1.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,200,0.5)';
    ctx.fill();
    ctx.restore();
}

// Rysuje dołek (okrąg)
function drawPit(x, y, radius, isHighlight = false) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = isHighlight ? '#d4a373' : '#8b5a2b';
    ctx.fill();
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
}

// Rysuje mankalę (prostokąt z zaokrągleniem)
function drawMancala(x, y, width, height, count, isHighlight = false) {
    ctx.fillStyle = isHighlight ? '#b87c4f' : '#6f4e2e';
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 20);
    ctx.fill();
    ctx.fillStyle = '#f9e0a8';
    ctx.font = 'bold 24px "Segoe UI"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(count, x + width/2, y + height/2);
}

// Helper roundRect
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.moveTo(x+r, y);
        this.lineTo(x+w-r, y);
        this.quadraticCurveTo(x+w, y, x+w, y+r);
        this.lineTo(x+w, y+h-r);
        this.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
        this.lineTo(x+r, y+h);
        this.quadraticCurveTo(x, y+h, x, y+h-r);
        this.lineTo(x, y+r);
        this.quadraticCurveTo(x, y, x+r, y);
        return this;
    };
}

// Główna funkcja rysowania planszy
export function drawBoard(board, currentPlayer, gameActive, highlightedPits, onPitClickCallback) {
    if (!ctx) initCanvas();
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    
    // Tło planszy
    ctx.fillStyle = '#c9a87b';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    
    // Mankale
    drawMancala(40, CANVAS_H/2 - 60, MANCALA_W, 120, getStoneCount(board, 6), highlightedPits.includes(6));
    drawMancala(CANVAS_W - 120, CANVAS_H/2 - 60, MANCALA_W, 120, getStoneCount(board, 13), highlightedPits.includes(13));
    
    // Dołki górne (od prawej do lewej logicznie, ale rysujemy od lewej do prawej z odpowiednimi indeksami)
    const topIndices = [12,11,10,9,8,7];  // wizualnie od lewej do prawej: index 12,11,...,7
    for (let i = 0; i < PIT_COLS; i++) {
        const x = FIRST_PIT_X + i * PIT_SPACING;
        const y = PIT_ROW_Y_TOP;
        const holeIdx = topIndices[i];
        const isHighlight = highlightedPits.includes(holeIdx);
        drawPit(x, y, PIT_RADIUS, isHighlight);
        // Rysuj kamienie w dołku
        const stones = board[holeIdx];
        for (let stone of stones) {
            drawBean(x + stone.offsetX, y + stone.offsetY, stone.rotation, stone.color);
        }
        // Liczba kamieni nad dołkiem
        ctx.fillStyle = '#2c3e2b';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(stones.length, x, y - PIT_RADIUS - 5);
    }
    
    // Dołki dolne (od lewej do prawej: indeksy 0..5)
    for (let i = 0; i < PIT_COLS; i++) {
        const x = FIRST_PIT_X + i * PIT_SPACING;
        const y = PIT_ROW_Y_BOTTOM;
        const holeIdx = i;
        const isHighlight = highlightedPits.includes(holeIdx);
        drawPit(x, y, PIT_RADIUS, isHighlight);
        const stones = board[holeIdx];
        for (let stone of stones) {
            drawBean(x + stone.offsetX, y + stone.offsetY, stone.rotation, stone.color);
        }
        // Liczba kamieni pod dołkiem
        ctx.fillStyle = '#2c3e2b';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(stones.length, x, y + PIT_RADIUS + 18);
    }
    
    // Mapowanie kliknięć – zapisujemy współrzędne dołków w celu obsługi eventu
    if (onPitClickCallback) {
        // Usuń poprzedni nasłuch i dodaj nowy
        canvas.removeEventListener('click', window._currentCanvasClick);
        const clickHandler = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;
            
            // Sprawdź mankale (ale mankale nie są klikalne)
            // Sprawdź dołki górne
            for (let i = 0; i < PIT_COLS; i++) {
                const x = FIRST_PIT_X + i * PIT_SPACING;
                const y = PIT_ROW_Y_TOP;
                const dx = mouseX - x;
                const dy = mouseY - y;
                if (Math.hypot(dx, dy) < PIT_RADIUS) {
                    const holeIdx = topIndices[i];
                    if (gameActive && ((currentPlayer === 1 && getStoneCount(board, holeIdx) > 0))) {
                        onPitClickCallback(holeIdx);
                    }
                    return;
                }
            }
            // Sprawdź dołki dolne
            for (let i = 0; i < PIT_COLS; i++) {
                const x = FIRST_PIT_X + i * PIT_SPACING;
                const y = PIT_ROW_Y_BOTTOM;
                const dx = mouseX - x;
                const dy = mouseY - y;
                if (Math.hypot(dx, dy) < PIT_RADIUS) {
                    const holeIdx = i;
                    if (gameActive && ((currentPlayer === 0 && getStoneCount(board, holeIdx) > 0))) {
                        onPitClickCallback(holeIdx);
                    }
                    return;
                }
            }
        };
        canvas.addEventListener('click', clickHandler);
        window._currentCanvasClick = clickHandler;
    }
}