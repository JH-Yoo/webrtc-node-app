import express from "express";
const app = express();

import http from "http";
const server = http.createServer(app);

import { WebSocketServer } from "ws";
const wss = new WebSocketServer({ server });

import Uploader from "../lib/uploader.js";
import Downloader from "../lib/downloader.js";

const LIMIT_CONNECTION = 10;
const PORT = 3000;

const uploaders = {};
const downloaders = {};

wss.on('connection', (ws) => {
  if (wss.clients.size > LIMIT_CONNECTION) {
    console.log("error : max connection! | limit count :", LIMIT_CONNECTION);
    return;
  }
  else {
    ws.id = wss.getUniqueID();
  }

  ws.on('message', (message) => {
    const response = JSON.parse(message);
    switch (response.type) {
      case "join":
        join(ws);
        break;
      case "uploader_offer":
        sendAnswer2Uploader(ws, response);
        break;
      case "downloader_answer":
        receiveAnswerFromDownloader(ws.id, response);
        break;
      case "uploader_candidate":
        getIceCandidate(uploaders[ws.id], response);
        break;
      case "downloader_candidate":
        getIceCandidate(findDownloader(ws.id, response.socketId), response);
        break;
      default:
        console.log("error : un expected type! : " + response.type);
        break;
    }
  });

  ws.on('close', () => {
    if (downloaders[ws.id]) {
      downloaders[ws.id].map(({ pc }) => pc.close());
      delete downloaders[ws.id];

      Object.entries(downloaders).forEach(([id, pcList]) => {
        console.log("uploader leave", ws.id);
        pcList.filter((({ id }) => id == ws.id))[0].pc.close();
        uploaders[id].leaveUser(ws.id);
      })
    }
    if (uploaders[ws.id]) {
      uploaders[ws.id].close();
      delete uploaders[ws.id];
    }
    console.log(ws.id + " disconnect");
  })
});

wss.getUniqueID = () => {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return s4() + s4() + '-' + s4();
};

const join = (ws) => {
  const pc = new Uploader(ws);
  const others = getOtherUser(ws.id);

  uploaders[ws.id] = pc;

  ws.send(JSON.stringify({
    id: ws.id,
    type: "connect_server",
    users: others,
  }));

  others.forEach(id => {
    const pc = new Downloader(ws, uploaders[id]);
    addDownloader(ws.id, id, pc);
    pc.sendOffer();
  });
}
const sendAnswer2Uploader = async (ws, data) => {
  const uploader = uploaders[ws.id];
  uploader.setOnTrack(() => enterUser(uploader));
  await uploader.sendAnswer(data.sdp);
}
const getIceCandidate = async (pc, data) => {
  await pc.addIceCandidate(data.candidate);
}
const receiveAnswerFromDownloader = async (socketId, data) => {
  const downloader = downloaders[socketId].find(({ id }) => id === data.socketId).pc;
  await downloader.setRemoteDescription(data.sdp);
}
const enterUser = (uploader) => {
  getOtherUser(uploader.getId()).forEach(id => {
    const downloaderWs = findClient(id);
    if (!downloaderWs) return;
    
    const pc = new Downloader(downloaderWs, uploader);
    addDownloader(id, uploader.getId(), pc);
    pc.sendOffer();
  });
}
const findClient = (id) => {
  for (const ws of wss.clients) {
    if (ws.id === id) {
      return ws;
    }
  }
  return null;
}
const findDownloader = (myId, uploaderId) => {
  return downloaders[myId].find(({ id }) => id === uploaderId).pc;
}
const addDownloader = (myId, uploaderId, pc) => {
  if (!downloaders[myId]) {
    downloaders[myId] = [];
  }
  downloaders[myId].push({
    id: uploaderId,
    pc,
  });
}
const getOtherUser = (myId) => {
  const users = [];
  wss.clients.forEach(({ id }) => {
    if (id !== myId) users.push(id);
  });
  return users;
}
server.listen(PORT, () => {
  console.log("Media server for SFU with only websocket | port : " + PORT);
});