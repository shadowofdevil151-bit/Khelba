/**
 * Calculates the points a player gains or loses in a single MCQ battle.
 * 
 * @param {string} outcome - The result of the match ('win', 'loss', or 'draw')
 * @param {number} correctCount - Number of correct answers
 * @param {number} wrongCount - Number of wrong or timed-out answers
 * @param {number} timeUsedSeconds - Time spent answering completed rounds
 * @param {number} totalTimeSeconds - Time budget for those completed rounds
 * @returns {number} Net points earned or lost (rounded to nearest integer)
 */
const DEFAULT_TOTAL_TIME_SECONDS = 750;

export function calculateBattlePoints(
    outcome,
    correctCount,
    wrongCount,
    timeUsedSeconds,
    totalTimeSeconds = DEFAULT_TOTAL_TIME_SECONDS
) {
    if (!["win", "loss", "draw"].includes(outcome)) {
        throw new TypeError("Battle outcome must be win, loss, or draw.");
    }
    if (![correctCount, wrongCount, timeUsedSeconds, totalTimeSeconds]
        .every(Number.isFinite)
        || correctCount < 0
        || wrongCount < 0
        || timeUsedSeconds < 0
        || totalTimeSeconds < 0) {
        throw new TypeError("Battle point inputs must be non-negative finite numbers.");
    }

    // 1. Determine base points from match outcome
    let outcomePoints = 0;
    if (outcome === 'win') outcomePoints = 15;
    else if (outcome === 'draw') outcomePoints = 5;
    else if (outcome === 'loss') outcomePoints = -10;

    // 2. Calculate accuracy performance points
    const accuracyPoints = (correctCount * 2) - (wrongCount * 1);

    // 3. Calculate speed bonus based on remaining time
    // Ensure time left doesn't accidentally go below 0 due to edge case latency
    const timeLeft = Math.max(0, totalTimeSeconds - timeUsedSeconds);
    const speedBonus = totalTimeSeconds === 0 ? 0 : (timeLeft / totalTimeSeconds) * 5;

    // 4. Sum up total points earned in this specific match
    let netMatchPoints = outcomePoints + accuracyPoints + speedBonus;

    // Return the rounded integer (e.g., 42.3 becomes 42)
    return Math.max(0, Math.round(netMatchPoints));
}
