import _const from "../config/constant.js";

const sdpType = [
  "offer",
  "pranswer",
  "answer",
  "rollback",
]

const iceServers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ]
}

const signal = {
  join: "join",
  uploader: {
    connect: "uploader_connect",
    offer: "uploader_offer",
    candidate: "uploader_candidate",
    stats: "uploader_stats",
  },
  downloader: {
    answer: "downloader_answer",
    candidate: "downloader_candidate",
  },
}

const syncCandidate = (candidate) => {
  const _candidate = {}
  for (const key in candidate) {
    const first = key[0].toLowerCase();
    const rest = key.slice(1, key.length);
    _candidate[first + rest] = candidate[key];
  }
  return _candidate;
}

const getSdpType = (idx) => {
  return sdpType[idx];
}

const getIceServers = () => iceServers;

const getConst = (name) => _const[name];

const getOtherUserId = (list, myId) => {
  const users = [];
  list.forEach(({ id }) => {
    if (id !== myId) users.push(id);
  });
  return users;
}

export {
  signal,
  syncCandidate,
  getSdpType,
  getIceServers,
  getConst,
  getOtherUserId,
}