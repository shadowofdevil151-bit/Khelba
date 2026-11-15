import { metrics } from "@opentelemetry/api";

let connectedBattleSockets = 0;

metrics
    .getMeter("khelba")
    .createObservableGauge("khelba_battle_socket_connections", {
        description: "Currently connected authenticated battle namespace sockets on this API instance."
    })
    .addCallback((result) => result.observe(connectedBattleSockets));

export const setBattleSocketConnections = (count) => {
    connectedBattleSockets = count;
};
