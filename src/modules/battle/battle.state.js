export const createBattleState = ({
    battleId,
    subjectCode,
    chapter,
    questions,
    players,
    botUserId = null,
    botCorrectQuestionIndexes = [],
    botChatProfile = null,
    isFriendBattle = false
}) => {
    const ids = players.map(({ _id }) => _id);

    return {
        battleId,
        subject_code: subjectCode,
        chapter,
        questions,
        total_questions: questions.length,
        current_index: -1,
        phase: "starting",
        players: ids,
        player_profiles: Object.fromEntries(
            players.map((player) => [player._id, {
                username: player.username,
                tier: player.tier,
                avatar_url: player.avatar_url || null
            }])
        ),
        scores: Object.fromEntries(ids.map((userId) => [userId, 0])),
        players_answers: Object.fromEntries(ids.map((userId) => [userId, {}])),
        answered_count: 0,
        round_started_at: null,
        round_timed_out: false,
        players_last_answered_at: Object.fromEntries(ids.map((userId) => [userId, null])),
        players_answered_durations: Object.fromEntries(ids.map((userId) => [userId, {}])),
        isBot: Boolean(botUserId),
        botuserid: botUserId,
        bot_correct_question_indexes: botUserId ? botCorrectQuestionIndexes : [],
        bot_chat_personality: botUserId ? botChatProfile?.personality || null : null,
        bot_can_proactively_chat: botUserId ? Boolean(botChatProfile?.canProactivelyChat) : false,
        isFriendBattle,
        isForfeit: false,
        forfeitedUserId: null
    };
};
