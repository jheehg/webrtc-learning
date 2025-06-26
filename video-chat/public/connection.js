const defaultIceServers = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];

class PeerConnection extends RTCPeerConnection {
  #isConnected = false;
  #socket = null;
  #roomName = null;

  constructor({ iceServers, socket, roomName } = { iceServers: defaultIceServers, socket: null, roomName: null }) {
    super({ iceServers: iceServers });
    this.#socket = socket;
    this.#roomName = roomName;
    this.#isConnected = true;
    this.#setupEventListeners();
  }

  #setupEventListeners() {
    this.onicecandidate = (event) => {
      if (!this.#socket) {
        console.error('Invalid socket');
        return;
      }

      if (!this.#roomName) {
        console.error('Invalid roomName');
        return;
      }

      if (!event.candidate) {
        console.error('Invalid event');
        return;
      }

      this.#socket.emit('candidate', this.#roomName, event.candidate);
    };

    this.ontrack = (event) => {
      console.log('Remote track received:', event);
      this.#isConnected = true;
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
