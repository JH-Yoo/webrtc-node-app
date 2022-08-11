const wrtc = require("wrtc");
const express = require("express");
const app = express();
const server = require("http").createServer(app);

const { WebSocketServer } = require("ws");

const wss = new WebSocketServer({ server });

const LIMIT_CONNECTION = 10;
const iceServers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ]
}
const sdpType = [
  "offer",
  "answer",
  "pranswer",
  "rollback",
]

const users = {};
const uploaders = {};
const downloaders = {};

wss.on('connection', (ws) => {
  if (wss.clients.size > LIMIT_CONNECTION) {
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
      case "uploader_candidate":
        getIceCandidate(ws.id, response);
        break;
      case "downloader_answer":
        receiveAnswer2Downloader(ws.id, response);
        break;
      case "downloader_candidate":
        getDownloaderIceCandidate(ws.id, response);
        break;
      default:
        console.log("error : un expected type! : " + response.type);
        break;
    }
  });

  ws.on('close', () => {
    console.log(ws.id + " disconnect");
    if (downloaders[ws.id]) {
      downloaders[ws.id].map(({ pc }) => pc.close());
      delete downloaders[ws.id];
    }
    if (users[ws.id]) {
      delete users[ws.id];
    }
    if (uploaders[ws.id]) {
      uploaders[ws.id].close();
      delete uploaders[ws.id];
    }
  })
});

wss.broadcast = (msg) => {
  wss.clients.forEach((client) => {
    client.send(msg);
  });
};

wss.getUniqueID = () => {
  const s4 = () => {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4();
};

const join = (ws) => {
  const pc = new wrtc.RTCPeerConnection(iceServers);
  const others = getOtherUser(ws.id);

  if (uploaders[ws.id]) uploaders[ws.id] = pc;
  else Object.assign(uploaders, { [ws.id]: pc });

  ws.send(JSON.stringify({
    id: ws.id,
    type: "connect_server",
    users: others,
  }));

  if (!downloaders[ws.id]) {
    downloaders[ws.id] = [];
  }

  others.forEach(id => {
    const pc = createDownloaderPC(ws, id);
    downloaders[ws.id].push({
      id,
      pc,
    });
    createDownloaderOffer(ws, id, pc);
  });
}
const sendAnswer2Uploader = async (ws, event) => {
  const pc = uploaders[ws.id];
  pc.onicecandidate = callIceCandidate(ws);
  pc.oniceconnectionstatechange = e => {
    console.log(`${pc.iceConnectionState}-state`);
  };
  pc.ontrack = (e) => {
    console.log("On Track");
    console.log(e.track.enabled);
    
    const mediaStream = new wrtc.MediaStream();
    mediaStream.addTrack(e.track);

    if (users[ws.id]) {
      users[ws.id] = {
        ...users[ws.id],
        [e.track.kind]: mediaStream,
      }
    }
    else {
      users[ws.id] = {
        [e.track.kind]: mediaStream,
      };
    }

    enterUser(ws);

    console.log("after upload on track");
  }
  
  try {
    await pc.setRemoteDescription(new wrtc.RTCSessionDescription({
      ...event.sdp,
      type: sdpType[event.sdp.type],
    }));
    const sdp = await pc.createAnswer();
    await pc.setLocalDescription(sdp);

    console.log("connect uploader :", ws.id);
    ws.send(JSON.stringify({
      type: "connect_server_answer",
      sdp
    }));
  } catch (e) {
    console.log("Error : " + e);
  }
}

const callIceCandidate = (ws, socketId = null) => {
  return (event) => sendIceCandidate(ws, event, socketId);
}

const sendIceCandidate = (ws, event, socketId) => {
  if (event.candidate) {
    ws.send(JSON.stringify({
      type: socketId ? "downloader_candidate" : "uploader_candidate",
      candidate: event.candidate,
      socketId
    }));
  }
}

const getIceCandidate = async (id, data) => {
  try {
    const pc = uploaders[id];
    for (const key in data.candidate) {
      const first = key[0].toLowerCase();
      const rest = key.slice(1, key.length);
      data.candidate[first + rest] = data.candidate[key];
      delete data.candidate[key];
    }
    await pc.addIceCandidate(new wrtc.RTCIceCandidate(data.candidate));
  } catch (e) {
    console.log("error upload candidate " + id)
    console.log(e);
  }
}
const getDownloaderIceCandidate = async (socketId, data) => {
  try {
    const pc = downloaders[socketId].find(({ id }) => id === data.socketId).pc;
    if (!pc) {
      console.log("error : pc not found");
      return;
    }

    for (const key in data.candidate) {
      const first = key[0].toLowerCase();
      const rest = key.slice(1, key.length);
      data.candidate[first + rest] = data.candidate[key];
      delete data.candidate[key];
    }
    await pc.addIceCandidate(new wrtc.RTCIceCandidate(data.candidate));
  } catch (e) {
    console.log("error : downloader candidate " + socketId + " - " + data.socketId)
    console.log(e);
  }
}

const createDownloaderPC = (ws, uploaderId) => {
  const pc = new wrtc.RTCPeerConnection(iceServers);
  pc.onicecandidate = callIceCandidate(ws, uploaderId);
  pc.oniceconnectionstatechange = e => {
    console.log(`${ws.id} by ${uploaderId} - ${pc.iceConnectionState}-state`);
  };

  const mediaStream = users[uploaderId].video;
  mediaStream.getTracks().forEach((track) => {
    pc.addTrack(track, mediaStream);
  });
  return pc;
}

const createDownloaderOffer = async (ws, uploaderId, pc) => {
  let sdp;
  try {
    sdp = await pc.createOffer();
    pc.setLocalDescription(sdp);
  } catch(e) {
    console.log("error in create downloader offer" + e);
  }
  console.log("send downloader offer :", ws.id, "/ uploader -", uploaderId);
  ws.send(JSON.stringify({
    type: "downloader_offer",
    socketId: uploaderId,
    sdp
  }));
}

const receiveAnswer2Downloader = async (socketId, data) => {
  const pc = downloaders[socketId].find(({ id }) => id === data.socketId).pc;
  try {
    await pc.setRemoteDescription(new wrtc.RTCSessionDescription({
      ...data.sdp,
      type: sdpType[data.sdp.type],
    }));
  } catch (e) {
    console.log("error : " + e);
  }
}

const enterUser = (uploader) => {
  getOtherUser(uploader.id).forEach(id => {
    const downloader = findClient(id);
    const pc = createDownloaderPC(downloader, uploader.id);
    if (!downloaders[id]) {
      downloaders[id] = [];
    }
    downloaders[id].push({
      id: uploader.id,
      pc,
    });
    createDownloaderOffer(downloader, uploader.id, pc);
  });
}

const getUserMedia = (uploaderId, type = "video") => {
  return new Promise((res, rej) => {
    if (users[uploaderId] && users[uploaderId][type]) {
      res(users[uploaderId][type]);
    }
  })
}

const findClient = (id) => {
  for (const ws of wss.clients) {
    if (ws.id === id) {
      return ws;
    }
  }
  return null;
}

const getOtherUser = (myId) => {
  const users = [];
  wss.clients.forEach(({ id }) => {
    if (id != myId) users.push(id);
  });
  return users;
}

const port = 3000;
server.listen(port, () => {
  console.log("Media server for SFU with only websocket | port : " + port);
});