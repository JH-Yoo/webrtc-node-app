import DefaultRtcPC from "./default-rtc-pc.js";

export default class Uploader extends DefaultRtcPC {
  constructor(ws) {
    super(ws);
    this.setOnIceCandidate();
    this.track = null;
    this.dataChannel = null;
    this.video = true; // temp 수정필요
    this.audio = false;
    this.data = false;
    this.downloaderList = {};
    console.log("connect uploader :", ws.id);
  }
  checkIsReady(func) {
    if (this.video && (this.audio || this.data)) func();
  }
  setOnTrack() {
    this.pc.ontrack = (e) => {
      // this.addSender(e.track.kind, this.sourceStream.addTrack(e.track));
      this.sourceStream = e.streams[0];
      this[e.track.kind] = true;
    };
    this.pc.ondatachannel = ({ channel }) => {
      this.dataChannel = channel;
      this.dataChannel.onopen = () => {
        this.data = true;
        console.log("open the data channel");
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
  leaveUser(uploaderId) {
    this.sendMessage({
      type: "uploader_leave",
      socketId: uploaderId,
    })
  }
}