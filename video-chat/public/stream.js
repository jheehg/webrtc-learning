const defaultConstraints = {
  video: { width: 320, height: 240 },
  audio: true,
};

class Stream {
  #localStream = null;
  #localVideo = null;
  #remoteVideo = null;
  #constraints = null;
  #muted = false;
  #hideCamera = false;

  constructor({ localVideo, remoteVideo, constraints = defaultConstraints }) {
    this.#constraints = constraints;
    this.#localVideo = localVideo;
    this.#remoteVideo = remoteVideo;
  }

  async init() {
    try {
      this.#localStream = await navigator.mediaDevices.getUserMedia({
        video: this.#constraints.video,
        audio: this.#constraints.audio,
      });
      this.setLocalStream(this.#localStream);
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  }

  muteLocalAudio() {
    if (this.#localStream?.getAudioTracks().length > 0) {
      this.#muted = true;
      this.#localStream.getAudioTracks()[0].enabled = false;
    }
  }

  unmuteLocalAudio() {
    if (this.#localStream?.getAudioTracks().length > 0) {
      this.#muted = false;
      this.#localStream.getAudioTracks()[0].enabled = true;
    }
  }

  hideLocalVideo() {
    if (this.#localStream?.getVideoTracks().length > 0) {
      this.#hideCamera = true;
      this.#localStream.getVideoTracks()[0].enabled = false;
    }
  }

  showLocalVideo() {
    if (this.#localStream?.getVideoTracks().length > 0) {
      this.#hideCamera = false;
      this.#localStream.getVideoTracks()[0].enabled = true;
    }
  }

  setLocalStream(stream) {
    if (!stream) {
      console.error('[Stream] No local stream to set');
      return;
    }

    this.#localVideo.srcObject = stream;
    this.#localVideo.onloadedmetadata = () => {
      this.#localVideo.play();
    };
  }

  setRemoteStream(stream) {
    this.#remoteVideo.srcObject = stream;
    this.#remoteVideo.onloadedmetadata = () => {
      this.#remoteVideo.play();
    };
  }

  clearLocalStream() {
    if (this.#localStream) {
      this.#localStream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    this.#localVideo.srcObject = null;
    this.#localStream = null;
  }

  clearRemoteStream() {
    if (this.#remoteVideo.srcObject) {
      this.#remoteVideo.srcObject.getTracks().forEach((track) => {
        track.stop();
      });

      this.#remoteVideo.srcObject = null;
      this.#remoteVideo.pause();
    }
  }

  clearAllStreams() {
    if (this.#localStream) {
      this.#localStream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    if (this.#remoteVideo.srcObject) {
      this.#remoteVideo.srcObject.getTracks().forEach((track) => {
        track.stop();
      });
    }

    this.#localVideo.srcObject = null;
    this.#localStream = null;
    this.#remoteVideo.srcObject = null;
    this.#remoteVideo = null;
  }

  get muted() {
    return this.#muted;
  }

  get hideCamera() {
    return this.#hideCamera;
  }

  get localStream() {
    return this.#localStream;
  }
}
