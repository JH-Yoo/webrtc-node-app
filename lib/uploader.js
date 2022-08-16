import DefaultRtcPC from "./default-rtc-pc.js";
import {
  MediaStream,
} from "wrtc";

export default class Uploader extends DefaultRtcPC {
  constructor(ws) {
    super(ws);
    this.setOnIceCandidate();
    this.track = {};
  }
  setOnTrack(callbackFunc = () => {}) {
    this.pc.ontrack = (e) => {
      if (!this.track[e.track.kind]) {
        this.track = {
          ...this.track,
          [e.track.kind]: new MediaStream(),
        };
      }
      this.track[e.track.kind].addTrack(e.track);
      callbackFunc();
    };
  }
  async sendAnswer(offerSdp) {
    const answerSdp = await this.makeAnswer(offerSdp);
    if (!answerSdp) return;

    this.sendMessage({
      type: "connect_server_answer",
      sdp: answerSdp,
    })
  }
}