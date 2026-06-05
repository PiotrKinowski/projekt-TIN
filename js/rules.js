import { getStoneCount } from './gameState.js';

export function isValidMove(board, player, holeIndex) {
    if (player === 0 && (holeIndex < 0 || holeIndex > 5)) return false;
    if (player === 1 && (holeIndex < 7 || holeIndex > 12)) return false;
    return getStoneCount(board, holeIndex) > 0;
}