import wrtc from "wrtc";
const {
  MediaStream,
} = wrtc;

import DefaultRtcPC from "./default-rtc-pc.js";

export default class Downloader extends DefaultRtcPC {
  constructor(ws, uploader) {
    super(ws);
    this.uploader = uploader;
    this.setOnIceCandidate(this.uploader.getId());
    this.sourceStream = new MediaStream();
    console.log(`[${uploader.getId()}] Downloader :`, this.uploader.track)
    
    this.setMediaStream(this.pc, this.uploader.track);
    console.log("connect downloader :", ws.id);
  }
  setMediaStream(target, stream) {
    stream.getTracks().forEach((track) => {
      target.addTrack(track, stream);
    });
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