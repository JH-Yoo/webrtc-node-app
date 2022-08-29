import DefaultRtcPC from "./default-rtc-pc.js";

export default class Uploader extends DefaultRtcPC {
  constructor(ws) {
    super(ws);
    this.setOnIceCandidate();
    this.track = null;
    this.dataChannel = null;
    this.video = false;
    this.audio = false;
    this.data = false;
    this.downloaderList = {};
    console.log("connect uploader :", ws.id);
  }
  checkIsReady(func) {
    if (this.video && (this.audio || this.data)) func();
  }
  setOnTrack(callbackFunc = () => {}) {
    this.pc.ontrack = (e) => {
      this.track = e.streams[0];
      this[e.track.kind] = true;
      this.checkIsReady(callbackFunc);
    };
    this.pc.ondatachannel = ({ channel }) => {
      this.dataChannel = channel;
      this.dataChannel.onopen = () => {
        this.data = true;
        console.log("open the data channel");
        this.checkIsReady(callbackFunc);
      }
      this.dataChannel.onclose = () => {
        console.log("uploader data channel closed");
      }
    }
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