# webrtc-node-app
Web RTC test app by node js

## P2P With Socket.io

```
npm run server
```

Socket.io를 사용한 서버는 Client와 함께 구현되어있음.

간단한 P2P Signaling을 담당하는 서버.

## P2P With WebSocket

```
npm run server-ws
```

WebSocket 패키지를 사용하여 구현한 서버로, Socket.io를 이용하기 어려운 상황에서 테스트할 수 있도록 마련한 서버.

Client는 현 Repo에 구현되어있지 않으며 위와 동일하게 P2P Signaling을 위한 서버.

room 기능은 따로 없으며 서버 전체에 연결된 Client가 2개 이상이면 더이상 접속 할 수 없도록 구현.

## SFU (Selective Forwading Unit) With WebSocket

```
npm run server-sfu
```

WebSocket 패키지를 사용하여 구현한 SFU를 위한 미디어 서버.