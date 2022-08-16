const sendIceCandidate = (ws, candidate, socketId, type) => {
  if (candidate) {
    ws.send(JSON.stringify({
      type,
      candidate,
      socketId
    }));
  }
}

const callIceCandidate = (ws, socketId = null) => {
  return (event) => sendIceCandidate(
    ws,
    event.candidate,
    socketId,
    socketId ? "downloader_candidate" : "uploader_candidate"
  );
}

export {
  callIceCandidate,
}