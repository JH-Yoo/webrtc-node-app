import express from "express";
const app = express();

import http from "http";
const server = http.createServer(app);

import socket from "socket.io";
const io = socket(server);

app.use("/", express.static("public"));

io.on("connection", (socket) => {
  socket.on("join", (roomId) => {
    const roomClient = io.sockets.adapter.rooms.get(roomId) || { length: 0 };
    const numberOfClient = roomClient.length;
    if (numberOfClient == 0) {
      console.log("Create room : " + roomId);
      socket.join(roomId);
      socket.emit("room_created", roomId);
    } else {
      console.log("Join room : " + roomId);
      socket.join(roomId);
      socket.emit("room_joined", roomId);
    }
  });

  socket.on("start_call", (roomId) => {
    console.log("BroadCasting start call event to peers in room : " + roomId);
    socket.broadcast.to(roomId).emit("start_call");
  });

  socket.on("webrtc_offer", (event) => {
    console.log("BroadCasting web rtc offer event to peers in room : " + event.roomId);
    socket.broadcast.to(event.roomId).emit("webrtc_offer", event);
  });

  socket.on("webrtc_answer", (event) => {
    console.log("BroadCasting web rtc answer event to peers in room : " + event.roomId);
    socket.broadcast.to(event.roomId).emit("webrtc_answer", event);
  });

  socket.on("webrtc_ice_candidate", (event) => {
    console.log("BroadCasting web rtc ice candidate event to peers in room : " + event.roomId);
    socket.broadcast.to(event.roomId).emit("webrtc_ice_candidate", event);
  });
});

const port = 3000;
server.listen(port, () => {
  console.log("Signaling server for P2P with socket io | port : " + port);
});