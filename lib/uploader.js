import DefaultRtcPC from "./default-rtc-pc.js";

export default class Uploader extends DefaultRtcPC {
  constructor(ws) {
    super(ws);
    this.setOnIceCandidate();
    this.track = null;
    this.video = false;
    this.audio = false;
    console.log("connect uploader :", ws.id);
  }
  setOnTrack(callbackFunc = () => {}) {
    this.pc.ontrack = (e) => {
      this.track = e.streams[0];
      this[e.track.kind] = true;
      if (
        this.video &&
        this.audio
      ) callbackFunc();
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