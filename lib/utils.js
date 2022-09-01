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
  syncCandidate,
  getSdpType,
  getIceServers,
  getConst,
  getOtherUserId,
}