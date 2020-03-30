const STUN = 'stun:stun.l.google.com:19302'
const config = {
  iceServers: [{ urls: STUN }]
};

const vid = document.querySelector('video');
const  pc = new RTCPeerConnection(config);
  pc.onicecandidate = async ({candidate}) => {
    await pc.addIceCandidate(candidate);
  };

let inboundStream = null;
pc.ontrack = ev => {
  if (ev.streams && ev.streams[0]) {
    vid.srcObject = ev.streams[0];
  } else {
    if (!inboundStream) {
      inboundStream = new MediaStream();
      vid.srcObject = inboundStream;
      vid.play();
    }

    inboundStream.addTrack(ev.track);
  }
}

pc.ondatachannel = ev => {
  const channel = event.channel;
  channel.onopen = ev => channel.send('pong');
  channel.onmessage = ev => console.log(ev.data);
}
let signaler;

const handleGetCandidate = async (candidate) => {
  console.log('get candidate');
  try {
    await pc.addIceCandidate(candidate);
    const channel = pc.createDataChannel('com');
    channel.onopen = ev => {
      console.log('chan opened');
      channel.send('ping');
      console.log('ping send');
    }

  } catch (err) {
    console.error(err);
  }
}

const handleGetDescription = async ({description}) => {
  console.log('get desc');
  pc.onicecandidate = async ({candidate}) => {
    await pc.addIceCandidate(candidate);
  };

  try {
    console.log(pc.signalingState);
    await pc.setRemoteDescription(description);
    console.log(pc.signalingState);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    signaler.emit('sendPeerDescription', pc.localDescription);
  } catch (err) { console.error(err); }
}

const handleGetPeerDescription = async (description) => {
  console.log('get peer desc');
  await pc.setRemoteDescription(description);
};

const initOffer = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true, audio: true, muted: true
  });

  for (const track of stream.getTracks()) {
    pc.addTrack(track);
  }

  console.log('init offer');
  try {
    const offer = await pc.createOffer();
    pc.onicecandidate = ({candidate}) => {
      signaler.emit('sendCandidate', candidate);
    }
    await pc.setLocalDescription(offer);
    signaler.emit('sendDescription', { description: pc.localDescription });
  } catch (err) {
    console.error(err);
  }
}

const handlePong = data => {
  console.log('handle pong: ', data);
}

const sock = io();
sock.emit('init', 'hi');
sock.on('pong', handlePong);
sock.on('getDescription', handleGetDescription);
sock.on('addCandidate', handleGetCandidate);
sock.on('getPeerDescription', handleGetPeerDescription);
sock.on('makeOffer', initOffer);
signaler = sock;
console.log('here');
