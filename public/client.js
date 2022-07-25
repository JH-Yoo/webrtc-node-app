const roomSelectionContainer = document.getElementById("room-selection-container");
const roomInput = document.getElementById("room-input");
const connectButton = document.getElementById("connect-button");
const videoChatContainer = document.getElementById("video-chat-container");
const localVideoComponent = document.getElementById("local-video");
const remoteVideoComponent = document.getElementById("remote-video");

const socket = io();
const mediaConstraints = {
  audio: true,
  video: { width: 1280, height: 720 }
}
let localStream;
let remoteStream;
let isRoomCreator;
let rtcPeerConnection;
let roomId;

const iceServers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ]
}

connectButton.addEventListener("click", () => {
  joinRoom(roomInput.value);
});

// SOCKET EVENT CALL BACK
socket.on("room_created", async () => {
  console.log("Socket event call back : room created");
  await setLocalStream(mediaConstraints);
  isRoomCreator = true;
});
socket.on("room_joined", async () => {
  console.log("Socket event call back : room joined");
  await setLocalStream(mediaConstraints);
  socket.emit("start_call", roomId);
});
// socket.on("full_room", () => {});

socket.on("start_call", async () => {
  console.log("Socket event call back : start_call");

  if (isRoomCreator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    addLocalTracks(rtcPeerConnection);
    rtcPeerConnection.ontrack = setRemoteStream;
    rtcPeerConnection.onicecandidate = sendIceCandidate;
    await createOffer(rtcPeerConnection);
  }
});

socket.on("webrtc_offer", async (event) => {
  console.log("Socket event call back : webrtc_offer");

  if (!isRoomCreator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    addLocalTracks(rtcPeerConnection);
    rtcPeerConnection.ontrack = setRemoteStream;
    rtcPeerConnection.onicecandidate = sendIceCandidate;
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event.sdp));
    await createAnswer(rtcPeerConnection);
  }
});

socket.on("webrtc_answer", async (event) => {
  console.log("Socket event call back : webrtc_answer");
  rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event.sdp));
});

socket.on("webrtc_ice_candidate", async (event) => {
  console.log("Socket event call back : webrtc_ice_candidate");
  let candidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate,
  });
  rtcPeerConnection.addIceCandidate(candidate);
});

// UTIL FUNCTIONS
const joinRoom = (room) => {
  if (room == '') {
    alert("Please Input the room id");
  } else {
    roomId = room;
    socket.emit("join", room);
    showVideoConference();
  }
}
const showVideoConference = () => {
  roomSelectionContainer.style.display = 'none';
  videoChatContainer.style.display = 'block';
}
const setLocalStream = async (mediaConstraints) => {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
  } catch (e) {
    console.log("show error. " + e);
  }
  localStream = stream;
  localVideoComponent.srcObject = stream;
}
const addLocalTracks = (rtcPeerConnection) => {
  localStream.getTracks().forEach((track) => {
    rtcPeerConnection.addTrack(track, localStream);
  });
}
const createOffer = async (rtcPeerConnection) => {
  let sessionDescription;
  try {
    sessionDescription = await rtcPeerConnection.createOffer();
    rtcPeerConnection.setLocalDescription(sessionDescription);
  } catch (e) {
    console.log("create offer error : " + e);
  }
  socket.emit("webrtc_offer", {
    type: "webrtc_offer",
    sdp: sessionDescription,
    roomId,
  });
}
const createAnswer = async (rtcPeerConnection) => {
  let sessionDescription;
  try {
    sessionDescription = await rtcPeerConnection.createAnswer();
    rtcPeerConnection.setLocalDescription(sessionDescription);
  } catch (e) {
    console.log("create answer error : " + e);
  }
  socket.emit("webrtc_answer", {
    type: "webrtc_answer",
    sdp: sessionDescription,
    roomId,
  });
}
const setRemoteStream = (event) => {
  remoteVideoComponent.srcObject = event.streams[0];
  remoteStream = event.stream;
}
const sendIceCandidate = (event) => {
  if (event.candidate) {
    socket.emit("webrtc_ice_candidate", {
      roomId,
      label: event.candidate.sdpMLineIndex,
      candidate: event.candidate.candidate,
    });
  }
}