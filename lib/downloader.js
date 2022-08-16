import DefaultRtcPC from "./default-rtc-pc.js";

export default class Downloader extends DefaultRtcPC {
  constructor(ws, uploader) {
    super(ws);
    this.uploader = uploader;
    this.setOnIceCandidate(this.uploader.getId());
    for (const key in this.uploader.track) {
      this.setMediaStream(this.uploader.track[key]);
    }
  }
  setMediaStream(uploaderMediaStream) {
    uploaderMediaStream.getTracks().forEach((track) => {
      this.pc.addTrack(track, uploaderMediaStream);
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