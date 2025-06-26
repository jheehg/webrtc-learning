const socket = io().connect('http://localhost:4000');

const roomName = document.getElementById('room-name');
const joinRoomButton = document.getElementById('join-room-button');
const videoChatLobby = document.getElementById('video-chat-lobby');
const muteButton = document.getElementById('mute-button');
const leaveRoomButton = document.getElementById('leave-room-button');
const hideCameraButton = document.getElementById('hide-camera-button');
const roomControls = document.getElementById('room-controls');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');

let peerConnection = null;
let userStream = null;
let creator = false;
let status = null;

const successCallback = (stream) => {
  videoChatLobby.style.display = 'none';
  roomControls.style.display = 'block';

  userStream.setLocalStream(stream);

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
  userStream.setRemoteStream(event.streams[0]);
};

const closePeerConnection = () => {
  peerConnection.closePeerConnection();
};

joinRoomButton.addEventListener('click', () => {
  const room = roomName.value;

  if (room) {
    socket.emit('joinRoom', room);
  } else {
    alert('Please enter a room name');
  }
});

muteButton.addEventListener('click', () => {
  const isMuted = userStream.muted;
  if (isMuted) {
    userStream.unmuteLocalAudio();
    muteButton.textContent = 'Mute';
  } else {
    userStream.muteLocalAudio();
    muteButton.textContent = 'Unmute';
  }
});

hideCameraButton.addEventListener('click', () => {
  const isHideCamera = userStream.hideCamera;
  if (isHideCamera) {
    userStream.showLocalVideo();
    hideCameraButton.textContent = 'Hide Camera';
  } else {
    userStream.hideLocalVideo();
    hideCameraButton.textContent = 'Show Camera';
  }
});

leaveRoomButton.addEventListener('click', () => {
  socket.emit('leaveRoom', roomName.value);
  videoChatLobby.style.display = 'block';
  roomControls.style.display = 'none';

  userStream.clearAllStreams();
  closePeerConnection();

  socket.emit('leaveRoom', roomName.value);
});

socket.on('roomCreated', async (data) => {
  creator = true;
  alert(`Room ${data.room} does not exist. We created a new room for you.`);

  try {
    userStream = new Stream({ localVideo, remoteVideo });
    await userStream.init();
    successCallback(userStream.localStream);
  } catch (error) {
    errorCallback(error);
  }
});

socket.on('roomJoined', async (data) => {
  creator = false;
  console.log(`User ${data.userId} joined the room ${data.room}`);

  try {
    userStream = new Stream({ localVideo, remoteVideo });
    await userStream.init();
    successCallback(userStream.localStream);
  } catch (error) {
    errorCallback(error);
  }
});

socket.on('roomIsFull', (data) => {
  alert(`Room ${data.room} is full. Please try again later.`);
});

socket.on('userLeaved', (data) => {
  creator = true;
  console.log(`User ${data.userId} left the room.`);

  userStream.clearRemoteStream();
  closePeerConnection();
});

socket.on('someOneIsReady', async (data) => {
  console.log('someOneIsReady', data);
  if (creator) {
    peerConnection = new PeerConnection({ socket, roomName: roomName.value });

    const localStream = userStream.localStream;

    if (localStream) {
      peerConnection.addTracks(localStream);

      try {
        const offer = await peerConnection.createUserOffer();
        socket.emit('offer', roomName.value, offer);
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    }
  }
});

socket.on('sendCandidateToRemotePeer', (candidate) => {
  console.log('sendCandidateToRemotePeer', candidate);
  const iceCandidate = new RTCIceCandidate(candidate);
  peerConnection.addIceCandidate(iceCandidate);
});

socket.on('offer', async (offer) => {
  console.log('offer', offer);

  if (!creator) {
    peerConnection = new PeerConnection({ socket, roomName: roomName.value });

    const localStream = userStream.localStream;

    if (localStream) {
      peerConnection.addTracks(localStream);

      try {
        const answer = await peerConnection.createUserAnswer(offer);
        socket.emit('answer', roomName.value, answer);
      } catch (error) {
        console.error('Error creating answer:', error);
      }
    }
  }
});

socket.on('answer', (answer) => {
  console.log('answer', answer);
  peerConnection.receiveUserAnswer(answer);
});
