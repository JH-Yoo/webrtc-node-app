import express from "express";
const app = express();

import http from "http";
const server = http.createServer(app);

import { WebSocketServer } from "ws";
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  if (wss.clients.size > 2) {
    return;
  }
  /**
   * expected call signal
   * - join
   * - start_call
   * - webrtc_offer
   * - webrtc_answer
   * - webrtc_ice_candidate
   */
  ws.on('message', (message) => {
    console.log('received: %s', message);
    const response = JSON.parse(message);
    switch (response.type) {
      case "join":
        join();
        break;
      default:
        broadcast(response);
        break;
    }
  });

  ws.on('close', () => {
    console.log("disconnect");
  })
});

wss.broadcast = (msg) => {
  wss.clients.forEach((client) => {
    client.send(msg);
  });
};

const join = () => {
  console.log("try join to room");
  if (wss.clients.size == 1) {
    broadcast({ type: "room_created" });
  } else {
    broadcast({ type: "room_joined" });
  }
}
const broadcast = (data = {}) => {
  console.log(`BroadCasting ${data.type} event to peers`);
  wss.broadcast(JSON.stringify(data));
}

const port = 3000;
server.listen(port, () => {
  console.log("Singaling server for P2P with only websocket | port : " + port);
});