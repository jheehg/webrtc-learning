# Socket.IO 이벤트 정의

## 클라이언트 → 서버

- `joinRoom`: 사용자 방 참여
- `leaveRoom`: 방 나가기

## 서버 → 클라이언트

- `roomCreated`: 방 생성
- `userJoined`: 사용자 방 참여 완료
- `userLeaved`: 방 나가기 완료
- `roomIsFull`: 방 참여인원 초과로 인한 참여 불가
