import Downloader from "./downloader.js";
import Uploader from "./uploader.js";

import { getConst, getOtherUserId } from "../lib/utils.js";

export default class Room {
  constructor(limitCount = getConst("LIMIT_CONNECTION")) {
    this.limitCount = limitCount;
    this.clients = [];
    this.sourcePC = {};
    this.relayPC = {};
  }

  join(ws) {
    if (this.clients.length > this.limitCount) {
      console.error("Join Error 'limit client count' :", ws.id);
      ws.close();
      return;
    }
    this.clients.push(ws);

    const pc = new Uploader(ws);
    const others = getOtherUserId(this.clients, ws.id);

    this.sourcePC[ws.id] = pc;

    ws.send(JSON.stringify({
      id: ws.id,
      type: "connect_server",
      users: others,
    }));

    others.forEach(id => {
      const pc = new Downloader(ws, this.sourcePC[id]);
      this.addDownloader(ws.id, id, pc);
      pc.sendOffer();
    });
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
    pc.setOnTrack(() => this.enterUser(pc));
    await pc.sendAnswer(data.sdp);
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
    await this.selectRelayPC(id, data.socketId).addIceCandidate(data.candidate);
  }

  leaveClient(ws) {
    if (this.relayPC[ws.id]) {
      this.relayPC[ws.id].map(({ pc }) => pc.close());
      delete this.relayPC[ws.id];

      Object.entries(this.relayPC).forEach(([id, pcList]) => {
        console.log("uploader leave", ws.id);
        pcList.filter((({ id }) => id == ws.id))[0].pc.close();
        this.sourcePC[id].leaveUser(ws.id);
      })
    }
    if (this.sourcePC[ws.id]) {
      this.sourcePC[ws.id].close();
      delete this.sourcePC[ws.id];
    }

    return this.removeClient(ws.id);
  }

  enterUser(source) {
    getOtherUserId(this.clients, source.getId()).forEach(id => {
      const relayWebSocket = this.findClient(id);
      if (!relayWebSocket) return;

      const pc = new Downloader(relayWebSocket, source);
      this.addDownloader(id, source.getId(), pc);
      pc.sendOffer();
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
}