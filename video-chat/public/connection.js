const defaultIceServers = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];

class PeerConnection extends RTCPeerConnection {
  #isConnected = false;
  #socket = null;
  #roomName = null;
  #remoteVideo = null;

  constructor(
    { iceServers, socket, roomName, remoteVideo } = {
      iceServers: defaultIceServers,
      socket: null,
      roomName: null,
      remoteVideo: null,
    }
  ) {
    super({ iceServers: iceServers });
    this.#socket = socket;
    this.#roomName = roomName;
    this.#remoteVideo = remoteVideo;
    this.#setupEventListeners();
    this.#isConnected = true;
  }

  #setupEventListeners() {
    this.onicecandidate = (event) => {
      console.log('[PeerConnection] onicecandidate', event.candidate);
      if (!this.#socket) {
        console.error('[PeerConnection] Invalid socket');
        return;
      }

      if (!this.#roomName) {
        console.error('[PeerConnection] Invalid roomName');
        return;
      }

      if (!event.candidate) {
        console.error('[PeerConnection] Invalid event');
        return;
      }

      this.#socket.emit('candidate', this.#roomName, event.candidate);
    };

    this.ontrack = (event) => {
      console.log('[PeerConnection] Remote track received:', event);
      this.#isConnected = true;

      this.#remoteVideo.srcObject = event.streams[0];
      this.#remoteVideo.onloadedmetadata = () => {
        this.#remoteVideo.play();
      };
    };
  }

  closePeerConnection() {
    if (!this.#isConnected) return;

    this.onicecandidate = null;
    this.ontrack = null;

    this.close();
    this.#isConnected = false;
  }

  addTracks(stream) {
    if (!this.#isConnected) return;
    this.addTrack(stream.getVideoTracks()[0], stream);
    this.addTrack(stream.getAudioTracks()[0], stream);
    this.#isConnected = true;
  }

  async createUserOffer() {
    if (!this.#isConnected) return;

    const offer = await this.createOffer();
    await this.setLocalDescription(offer);

    return offer;
  }

  async createUserAnswer(offer) {
    if (!this.#isConnected) return;

    this.setRemoteDescription(offer);
    const answer = await this.createAnswer();
    await this.setLocalDescription(answer);

    return answer;
  }

  receiveUserAnswer(answer) {
    if (!this.#isConnected) return;

    this.setRemoteDescription(answer);
  }

  get isConnected() {
    return this.#isConnected;
  }
}
