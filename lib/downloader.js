import wrtc from "wrtc";
const {
  MediaStream,
} = wrtc;

import DefaultRtcPC from "./default-rtc-pc.js";

export default class Downloader extends DefaultRtcPC {
  constructor(ws, uploader) {
    super(ws);
    this.dataChannel = null;
    this.uploader = uploader;
    this.setOnIceCandidate(this.uploader.getId());
    this.sourceStream = new MediaStream();
    console.log(`[${uploader.getId()}] Downloader :`, this.uploader.track);

    this.setMediaStream(this.pc, this.uploader.track);

    this.setDataChannel();
    console.log("connect downloader :", ws.id);
  }
  setMediaStream(target, stream) {
    stream.getTracks().forEach((track) => {
      target.addTrack(track, stream);
    });
  }
  setDataChannel() {
    this.dataChannel = this.pc.createDataChannel("downloader-data");
    this.dataChannel.onclose = () => {
      console.log("downloader data channel closed");
    }
    this.dataChannel.onerror = (event) => {
      console.log("error :", event.error);
    }
    this.uploader?.dataChannel?.addEventListener("message", ({ data }) => {
      if (this.dataChannel.readyState == "open") {
        this.dataChannel.send(data);
      }
    })
  }
  async sendOffer() {
    const offerSdp = await this.makeOffer();
    if (!offerSdp) return;

    this.sendMessage({
      type: "downloader_offer",
      socketId: this.uploader.getId(),
      sdp: offerSdp,
    });
  }
  getUploaderId() {
    return this.uploader.getId();
  }
}