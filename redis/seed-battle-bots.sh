#!/bin/sh
set -eu
set -f

redis-server --appendonly yes &
redis_pid=$!

shutdown() {
    kill -TERM "$redis_pid" 2>/dev/null || true
    wait "$redis_pid"
}
trap shutdown INT TERM

until redis-cli -h 127.0.0.1 ping >/dev/null 2>&1; do
    if ! kill -0 "$redis_pid" 2>/dev/null; then
        wait "$redis_pid"
        exit 1
    fi
    sleep 1
done

# Hardcoded array of your bot IDs
BOT_IDS="6ad32b0d4e2fd73eeecfc777"

for bot_id in $BOT_IDS; do
    # Validation checks remain intact
    if [ "${#bot_id}" -ne 24 ]; then
        echo "Invalid bot ObjectId: $bot_id" >&2
        exit 1
    fi
    redis-cli -h 127.0.0.1 SADD battle:bots:available "$bot_id" >/dev/null
done

wait "$redis_pid"
