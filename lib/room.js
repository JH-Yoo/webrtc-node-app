import Downloader from "./downloader.js";
import Uploader from "./uploader.js";

import { getConst, getOtherUserId } from "../lib/utils.js";

export default class Room {
  constructor(limitCount = getConst("LIMIT_ROOM_CONNECTION")) {
    this.limitCount = limitCount;
    this.clients = [];
    this.sourcePC = {};
    this.relayPC = {};
  }

  join(ws) {
    if (this.clients.length >= this.limitCount) {
      console.error("Join Error 'limit client count' :", ws.id);
      ws.send(JSON.stringify({
        type: "no_vacancy"
      }));
      return;
    }
    this.clients.push(ws);
    
    const others = getOtherUserId(this.clients, ws.id);
    others.forEach(id => {
      if (!this.sourcePC[id]) return;
      const pc = new Downloader(ws, this.sourcePC[id]);
      this.addDownloader(ws.id, id, pc);
      // pc.sendOffer();
    });
  }

  connectSource(ws) {
    const pc = new Uploader(ws);

    this.sourcePC[ws.id] = pc;

    ws.send(JSON.stringify({
      id: ws.id,
      type: "connect_server",
    }));
  }

  addDownloader(myId, sourceId, pc) {
    if (!this.relayPC[myId]) {
      this.relayPC[myId] = [];
    }
    this.relayPC[myId].push({
      id: sourceId,
      pc,
    });
  }
  
  async sendAnswerToSourcePC(ws, data) {
    const pc = this.sourcePC[ws.id];
    pc.setOnTrack();
    await pc.sendAnswer(data.sdp);
    console.log("Call enter user", ws.id)
    this.enterUser(pc);
  }

  async receiveAnswerFromRelayPC(socketId, data) {
    const pc = this.selectRelayPC(socketId, data.socketId);
    if (!pc) return;

    await pc.setRemoteDescription(data.sdp);
  }

  async getSourceIceCandidate(id, data) {
    await this.sourcePC[id].addIceCandidate(data.candidate);
  }

  async getRelayIceCandidate(id, data) {
    await this.selectRelayPC(id, data.socketId)?.addIceCandidate(data.candidate);
  }

  leaveClient(ws) {
    const leaveClientId = ws.id;
    if (this.relayPC[leaveClientId]) {
      this.relayPC[leaveClientId].map(({ pc }) => pc.close());
      delete this.relayPC[leaveClientId];

      Object.entries(this.relayPC).forEach(([id, pcList]) => {
        console.log("uploader leave", leaveClientId);
        const idx = pcList.findIndex((({ id }) => id === leaveClientId));
        if (idx > -1) {
          pcList[idx]?.pc.close();
          pcList.splice(idx, 1);
        }

        if (this.sourcePC[id]) {
          this.sourcePC[id].leaveUser(leaveClientId);
        }
      })
    }
    if (this.sourcePC[leaveClientId]) {
      this.sourcePC[leaveClientId].close();
      delete this.sourcePC[leaveClientId];
    }

    return this.removeClient(leaveClientId);
  }

  enterUser(source) {
    getOtherUserId(this.clients, source.getId()).forEach(id => {
      const relayWebSocket = this.findClient(id);
      if (!relayWebSocket) return;

      console.log(`${source.getId()} : enter ${relayWebSocket.id}`);
      const pc = new Downloader(relayWebSocket, source);
      this.addDownloader(id, source.getId(), pc);
      // pc.sendOffer();
    })
  }
  findClient(id) {
    for (const ws of this.clients) {
      if (ws.id === id) return ws;
    }
    return null;
  }
  removeClient(id) {
    const rmIdx = this.clients.findIndex(({ id: _id }) => _id === id);
    this.clients.splice(rmIdx, 1);

    return this.clients.length;
  }
  selectRelayPC(myId, sourceId) {
    return this.relayPC[myId].find(({ id }) => id === sourceId)?.pc;
  }
  setStats(ws, stats) {
    console.log(`[${ws.id}] bitrate :`, stats.bitrate);
  }
  toggleVideo(ws) {
    console.log(`[${ws.id}] toggle video`);
    this.clients.forEach((_ws) => {
      if (_ws.id !== ws.id) {
        _ws.send(JSON.stringify({
          type: "toggle_video",
          socketId: ws.id,
        }));
      }
    });
  }
}