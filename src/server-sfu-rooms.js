import express from "express";
const app = express();

import http from "http";
const server = http.createServer(app);

import { WebSocketServer } from "ws";
const wss = new WebSocketServer({ server });

import { getConst, signal } from "../lib/utils.js";
import Room from "../lib/room.js";

const house = {};

wss.on('connection', (ws) => {
  if (wss.clients.size > getConst("LIMIT_CONNECTION")) {
    console.log("error : max connection! | limit count :", getConst("LIMIT_CONNECTION"));
    ws.send(JSON.stringify({
      type: "limit_connection"
    }));
    return;
  }
  else {
    ws.id = wss.getUniqueID();
  }
  console.log("Connect : ", ws.id);

  ws.on('message', (message) => {
    const { roomId, ...response} = JSON.parse(message);
    switch (response.type) {
      case signal.join:
        joinRoom(ws, roomId, response);
        break;
      case signal.uploader.connect:
        callRoom(ws, roomId, (room) => room.connectSource(ws));
        break;
      case signal.uploader.offer:
        callRoom(ws, roomId, (room) => room.sendAnswerToSourcePC(ws, response));
        break;
      case signal.downloader.answer:
        callRoom(ws, roomId, (room) => room.receiveAnswerFromRelayPC(ws.id, response));
        break;
      case signal.uploader.candidate:
        callRoom(ws, roomId, (room) => room.getSourceIceCandidate(ws.id, response));
        break;
      case signal.downloader.candidate:
        callRoom(ws, roomId, (room) => room.getRelayIceCandidate(ws.id, response));
        break;
      case signal.uploader.stats:
        callRoom(ws, roomId, (room) => room.setStats(ws, response));
        break;
      case signal.uploader.toggleVideo:
        callRoom(ws, roomId, (room) => room.toggleVideo(ws));
        break;
      default:
        console.log("error : un expected type! : " + response.type);
        break;
    }
  });

  ws.on('close', () => {
    const leftCount = house[ws.roomId].leaveClient(ws);
    console.log(ws.id + " disconnect / left : " + leftCount);
    
    if (leftCount === 0) removeRoom(ws.roomId);
  })
});

wss.getUniqueID = () => {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return s4() + s4() + '-' + s4();
};

const removeRoom = (roomId) => {
  delete house[roomId];
  console.log("the empty room removed :", roomId);
}

const joinRoom = (ws, roomId, response) => {
  if (!house[roomId]) {
    house[roomId] = new Room();
  }

  if (response.clientId) {
    ws.id = response.clientId;
  }
  console.log(ws.id);

  house[roomId].join(ws);
  ws.roomId = roomId;
}

const callRoom = (ws, roomId, callback) => {
  if (!roomId || !house[roomId]) {
    if (!ws.roomId || !house[ws.roomId]) {
      console.error("Cannot find room :", roomId, ws.roomId);
      return null;
    }
    return callback(house[ws.roomId]);
  }
  return callback(house[roomId]);
}

server.listen(getConst("PORT"), () => {
  console.log("Media server for SFU with only websocket | port : " + getConst("PORT"));
});