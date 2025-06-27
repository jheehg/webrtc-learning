const socket = io().connect('http://localhost:4000');

const elements = {
  roomName: document.getElementById('room-name'),
  joinRoomButton: document.getElementById('join-room-button'),
  videoChatLobby: document.getElementById('video-chat-lobby'),
  muteButton: document.getElementById('mute-button'),
  leaveRoomButton: document.getElementById('leave-room-button'),
  hideCameraButton: document.getElementById('hide-camera-button'),
  roomControls: document.getElementById('room-controls'),
  localVideo: document.getElementById('local-video'),
  remoteVideo: document.getElementById('remote-video'),
};

const appState = {
  peerConnection: null,
  userStream: null,
  creator: false,
  currentRoom: null,
};

// ============= UI HANDLERS =============

const uiHandlers = {
  handleJoinRoom: () => {
    const room = elements.roomName.value;

    if (room) {
      console.log(`[UI] Joining room: ${room}`);
      appState.currentRoom = room;
      socket.emit('joinRoom', room);
    } else {
      console.log('⚠️ [UI] Room name is empty');
      alert('Please enter a room name');
    }
  },

  handleMuteToggle: () => {
    if (!appState.userStream) {
      console.log('⚠️ [UI] No user stream for mute toggle');
      return;
    }

    const isMuted = appState.userStream.muted;
    if (isMuted) {
      appState.userStream.unmuteLocalAudio();
      elements.muteButton.textContent = 'Mute';
      console.log('[UI] Audio unmuted');
    } else {
      appState.userStream.muteLocalAudio();
      elements.muteButton.textContent = 'Unmute';
      console.log('[UI] Audio muted');
    }
  },

  handleCameraToggle: () => {
    if (!appState.userStream) {
      console.log('⚠️ [UI] No user stream for camera toggle');
      return;
    }

    const isHideCamera = appState.userStream.hideCamera;
    if (isHideCamera) {
      appState.userStream.showLocalVideo();
      elements.hideCameraButton.textContent = 'Hide Camera';
      console.log('[UI] Camera shown');
    } else {
      appState.userStream.hideLocalVideo();
      elements.hideCameraButton.textContent = 'Show Camera';
      console.log('[UI] Camera hidden');
    }
  },

  handleLeaveRoom: () => {
    const roomName = appState.currentRoom;
    console.log(`[UI] Leaving room: ${roomName}`);

    roomManager.leaveRoom(roomName);
    uiManager.showLobby();
  },
};

// ============= UI MANAGEMENT =============

const uiManager = {
  showLobby: () => {
    console.log('[UI] Showing lobby');
    elements.videoChatLobby.style.display = 'block';
    elements.roomControls.style.display = 'none';
  },

  showRoomControls: () => {
    console.log('[UI] Showing room controls');
    elements.videoChatLobby.style.display = 'none';
    elements.roomControls.style.display = 'block';
  },

  clearRoomName: () => {
    appState.currentRoom = null;
    elements.roomName.value = '';
  },

  setupEventListeners: () => {
    console.log('[UI] Setting up event listeners');

    elements.joinRoomButton.addEventListener('click', uiHandlers.handleJoinRoom);
    elements.muteButton.addEventListener('click', uiHandlers.handleMuteToggle);
    elements.hideCameraButton.addEventListener('click', uiHandlers.handleCameraToggle);
    elements.leaveRoomButton.addEventListener('click', uiHandlers.handleLeaveRoom);
  },
};

// ============= ROOM MANAGEMENT =============

const roomManager = {
  async setupAsCreator(roomName) {
    console.log(`[Room] Setting up as creator: ${roomName}`);
    appState.creator = true;
    appState.currentRoom = roomName;

    await this.initializeStream();
    uiManager.showRoomControls();
  },

  async setupAsJoiner(roomName) {
    console.log(`[Room] Setting up as joiner: ${roomName}`);
    appState.creator = false;
    appState.currentRoom = roomName;

    await this.initializeStream();
    uiManager.showRoomControls();
  },

  async initializeStream() {
    console.log('[Room] Initializing stream...');

    try {
      appState.userStream = new Stream({
        localVideo: elements.localVideo,
        remoteVideo: elements.remoteVideo,
      });

      await appState.userStream.init();
      console.log('[Room] Stream initialized');

      socket.emit('ready', appState.currentRoom);
    } catch (error) {
      console.error('[Room] Stream initialization failed:', error);
      uiManager.showRoomControls();
    }
  },

  leaveRoom(roomName) {
    console.log(`[Room] Leaving room: ${roomName}`);

    if (appState.userStream) {
      appState.userStream.clearAllStreams();
    }

    peerConnectionManager.close();
    socket.emit('leaveRoom', roomName);
    uiManager.clearRoomName();
  },

  handleUserLeft() {
    console.log('[Room] User left, becoming creator');
    appState.creator = true;

    if (appState.userStream) {
      appState.userStream.clearRemoteStream();
    }

    peerConnectionManager.close();
  },
};

// ============= PEER CONNECTION MANAGEMENT =============

const peerConnectionManager = {
  create() {
    console.log('[Peer] Creating connection...');

    appState.peerConnection = new PeerConnection({
      socket: socket,
      roomName: appState.currentRoom,
      remoteVideo: elements.remoteVideo,
    });

    console.log('[Peer] Connection created');
  },

  close() {
    if (appState.peerConnection) {
      console.log('[Peer] Closing connection...');
      appState.peerConnection.closePeerConnection();
      appState.peerConnection = null;
    }
  },

  async createAndSendOffer() {
    console.log('[Peer] Creating and sending offer...');

    this.create();

    const localStream = appState.userStream.localStream;
    if (localStream) {
      appState.peerConnection.addTracks(localStream);

      try {
        const offer = await appState.peerConnection.createUserOffer();
        socket.emit('offer', appState.currentRoom, offer);
        console.log('[Peer] Offer sent');
      } catch (error) {
        console.error('[Peer] Failed to create offer:', error);
      }
    }
  },

  async createAndSendAnswer(offer) {
    console.log('[Peer] Creating and sending answer...');

    this.create();

    const localStream = appState.userStream.localStream;
    if (localStream) {
      appState.peerConnection.addTracks(localStream);

      try {
        const answer = await appState.peerConnection.createUserAnswer(offer);
        socket.emit('answer', appState.currentRoom, answer);
        console.log('[Peer] Answer sent');
      } catch (error) {
        console.error('[Peer] Failed to create answer:', error);
      }
    }
  },

  receiveAnswer(answer) {
    console.log('[Peer] Receiving answer...');

    if (appState.peerConnection) {
      appState.peerConnection.receiveUserAnswer(answer);
      console.log('[Peer] Answer received');
    }
  },

  addIceCandidate(candidate) {
    console.log('[Peer] Adding ICE candidate...');

    if (appState.peerConnection) {
      const iceCandidate = new RTCIceCandidate(candidate);
      appState.peerConnection.addIceCandidate(iceCandidate);
      console.log('[Peer] ICE candidate added');
    }
  },
};

// ============= SOCKET EVENT HANDLERS =============

const socketHandlers = {
  async onRoomCreated(data) {
    console.log(`[Socket] Room created: ${data.room}`);

    try {
      await roomManager.setupAsCreator(data.room);
      alert(`Room ${data.room} does not exist. We created a new room for you.`);
    } catch (error) {
      console.error('[Socket] Room creation error:', error);
    }
  },

  async onRoomJoined(data) {
    console.log(`[Socket] Room joined: ${data.room} (user: ${data.userId})`);

    try {
      await roomManager.setupAsJoiner(data.room);
    } catch (error) {
      console.error('[Socket] Room join error:', error);
    }
  },

  onRoomIsFull: (data) => {
    console.log(`[Socket] Room full: ${data.room}`);
    alert(`Room ${data.room} is full. Please try again later.`);
  },

  onUserLeft: (data) => {
    console.log(`[Socket] User left: ${data.userId}`);
    roomManager.handleUserLeft();
  },

  async onSomeoneReady(data) {
    console.log('[Socket] Someone ready:', data);

    if (appState.creator) {
      await peerConnectionManager.createAndSendOffer();
    }
  },

  onCandidate(candidate) {
    console.log('[Socket] ICE candidate received');
    peerConnectionManager.addIceCandidate(candidate);
  },

  async onOffer(offer) {
    console.log('[Socket] Offer received');

    if (!appState.creator) {
      await peerConnectionManager.createAndSendAnswer(offer);
    }
  },

  onAnswer(answer) {
    console.log('[Socket] Answer received');
    peerConnectionManager.receiveAnswer(answer);
  },
};

// ============= SOCKET EVENT SETUP =============

const setupSocketListeners = () => {
  console.log('[Socket] Setting up listeners');

  socket.on('roomCreated', socketHandlers.onRoomCreated);
  socket.on('roomJoined', socketHandlers.onRoomJoined);
  socket.on('roomIsFull', socketHandlers.onRoomIsFull);
  socket.on('userLeaved', socketHandlers.onUserLeft);
  socket.on('someOneIsReady', socketHandlers.onSomeoneReady);
  socket.on('sendCandidateToRemotePeer', socketHandlers.onCandidate);
  socket.on('offer', socketHandlers.onOffer);
  socket.on('answer', socketHandlers.onAnswer);
};

// ============= APPLICATION INITIALIZATION =============

const initializeApp = () => {
  console.log('[App] Initializing video chat...');

  uiManager.setupEventListeners();
  setupSocketListeners();

  console.log('[App] Video chat initialized');
};

initializeApp();
