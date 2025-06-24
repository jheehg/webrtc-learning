const socket = io().connect('http://localhost:4000');
const remote_limit = 3;

const roomName = document.getElementById('room-name');
const joinRoomButton = document.getElementById('join-room-button');
const videoChatLobby = document.getElementById('video-chat-lobby');
const leaveRoomButton = document.getElementById('leave-room-button');
const roomControls = document.getElementById('room-controls');
const localVideo = document.getElementById('local-video');
const remoteVideos = document.querySelectorAll('.remote-video');

const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
let peerConnection, localStream;

let creator = false;

const constraints = {
  video: { width: 320, height: 240 },
  audio: true,
};

const successCallback = (stream) => {
  localStream = stream;

  videoChatLobby.style.display = 'none';
  roomControls.style.display = 'block';

  localVideo.srcObject = stream;
  localVideo.onloadedmetadata = () => {
    localVideo.play();
  };

  socket.emit('ready', roomName.value);
};

const errorCallback = (error) => {
  console.error('Error accessing media devices:', error);

  videoChatLobby.style.display = 'none';
  roomControls.style.display = 'block';
};

const onIceCandidate = (event) => {
  if (event.candidate) {
    socket.emit('candidate', roomName.value, event.candidate);
  }
};

const onTrack = (event) => {
  remoteVideo.srcObject = event.streams[0];
  remoteVideo.onloadedmetadata = () => {
    remoteVideo.play();
  };
};

joinRoomButton.addEventListener('click', () => {
  const room = roomName.value;

  if (room) {
    socket.emit('joinRoom', room);
  } else {
    alert('Please enter a room name');
  }
});

leaveRoomButton.addEventListener('click', () => {
  socket.emit('leaveRoom', roomName.value);
  videoChatLobby.style.display = 'block';
  roomControls.style.display = 'none';
  localVideo.pause();
  localVideo.srcObject = null;
});

socket.on('roomCreated', async (data) => {
  creator = true;
  alert(`Room ${data.room} does not exist. We created a new room for you.`);

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: constraints.video,
      audio: constraints.audio,
    });

    successCallback(stream);
  } catch (error) {
    errorCallback(error);
  }
});

socket.on('roomJoined', async (data) => {
  creator = false;
  console.log(`User ${data.userId} joined the room ${data.room}`);

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: constraints.video,
      audio: constraints.audio,
    });

    successCallback(stream);
  } catch (error) {
    errorCallback(error);
  }
});

socket.on('roomIsFull', (data) => {
  alert(`Room ${data.room} is full. Please try again later.`);
});

socket.on('userLeaved', (data) => {
  console.log(`User ${data.userId} left the room.`);
});

socket.on('someOneReady', async (data) => {
  console.log('someOneReady', data);
  if (creator) {
    peerConnection = new RTCPeerConnection({ iceServers });
    peerConnection.onicecandidate = onIceCandidate;
    peerConnection.ontrack = onTrack;

    if (localStream) {
      peerConnection.addTrack(localStream.getTracks()[0], localStream);
      peerConnection.addTrack(localStream.getTracks()[1], localStream);

      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', roomName.value, offer);
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    }
  }
});

// 참여자
socket.on('candidate', (candidate) => {
  console.log('candidate', candidate);
  const iceCandidate = new RTCIceCandidate(candidate);
  peerConnection.addIceCandidate(iceCandidate);
});

socket.on('offer', async (offer) => {
  console.log('offer', offer);

  if (!creator) {
    peerConnection = new RTCPeerConnection({ iceServers });
    peerConnection.onicecandidate = onIceCandidate;
    peerConnection.ontrack = onTrack;
    console.log('참여자 localStream', localStream);
    if (localStream) {
      peerConnection.addTrack(localStream.getTracks()[0], localStream);
      peerConnection.addTrack(localStream.getTracks()[1], localStream);

      try {
        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        console.log('참여자 answer', answer);
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', roomName.value, answer);
      } catch (error) {
        console.error('Error creating answer:', error);
      }
    }
  }
});

socket.on('answer', (answer) => {
  console.log('answer', answer);
  peerConnection.setRemoteDescription(answer);
});
