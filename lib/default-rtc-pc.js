import wrtc from "wrtc";
const {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
} = wrtc;
import {
  syncCandidate,
  getSdpType,
  getIceServers,
} from "./utils.js";
import { callIceCandidate } from "./ice-candidate.js";

export default class DefaultRtcPC {
  constructor(ws) {
    this.ws = ws;
    this.pc = new RTCPeerConnection(getIceServers());
    this.pc.oniceconnectionstatechange = e => {
      if (this.pc.iceConnectionState == "failed") {
        console.log(`${this.ws.id} : ${this.pc.iceConnectionState}-state`);
        console.log(`${this.ws.id} : restart ICE`)
        this.pc.restartIce();
        return;
      }
      console.log(`${this.ws.id} : ${this.pc.iceConnectionState}-state`);
    };
    this.sourceStream = new MediaStream();
    this.senders = {};
  }
  setOnIceCandidate(id = null) {
    this.pc.onicecandidate = callIceCandidate(this.ws, id);
  }
  async setRemoteDescription(sdp) {
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription({
        ...sdp,
        type: typeof sdp.type == "number"
          ? getSdpType(sdp.type)
          : sdp.type,
      }));
    } catch(err) {
      this.logErrorMsg("setRemoteDescription", err);
    }
  }
  async makeAnswer(offerSdp) {
    try {
      await this.setRemoteDescription(offerSdp);
      const answerSdp = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answerSdp);
      return answerSdp;
    } catch(err) {
      this.logErrorMsg("makeAnswer", err);
      return false;
    }
  }
  async makeOffer() {
    try {
      const offerSdp = await this.pc.createOffer();
      await this.pc.setLocalDescription(offerSdp);
      return offerSdp;
    } catch(err) {
      this.logErrorMsg("makeOffer", err);
      return false;
    }
  }
  async addIceCandidate(candidate) {
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(
        syncCandidate(candidate)
      ));
    } catch(err) {
      this.logErrorMsg("addIceCandidate", err);
    }
  }
  close() {
    this.pc.close();
  }
  getId() {
    return this.ws.id;
  }
  logErrorMsg(methodName, error) {
    console.log(`Error [${this.ws.id}] in ${methodName} :`, error);
  }
  sendMessage(message) {
    this.ws.send(JSON.stringify(message));
  }
  addSender(type, sender) {
    if (this.senders[type] == null) {
      this.senders[type] = [];
    }
    this.senders[type].push(sender);
  }
}