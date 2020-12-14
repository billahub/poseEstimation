
'use strict';

var remote_video = document.querySelector("#remoteVideo");
var info = document.getElementsByClassName("wait");
var warning = document.getElementById("warning");
var room = roomId;
var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var pc;
var remoteStream;
var dataChannel;
var result;
var vid_div = document.getElementById("touch");
var shouldSendDataChannel = true;
var localAudioTrack;
var btn_mute = document.getElementById("btn-mute");
var btn_speaker = document.getElementById("btn-speaker");
var leave = document.getElementById("leave");
var isPlaying = false;

var pcConfig = {
  iceServers: [{
    urls: 'stun:stun.l.google.com:19302'
  },
  {
    urls: 'turn:13.127.131.117:9357',
    username: 'technoturn',
    credential: 'Wipro@123'
  }],
  'mandatory': {
    'OfferToReceiveAudio': true,
    'OfferToReceiveVideo': true
  }
};

const audio_constraints = {
  audio: true,
  video: false
}

/////////////////////////////////////////////

var socket = io.connect("https://remoteassistance.coughrecorder.com/");

socket.emit('create or join', room);
console.log('Attempted to create or join room', room);

socket.on('created', function (room) {
  console.log('Created room ' + room);
  isInitiator = true;
});

socket.on('full', function (room) {
  console.log('Room ' + room + ' is full');
  alert("Socket room is full.");
});

socket.on('join', function (room) {
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the initiator of room ' + room + '!');
  isChannelReady = true;
});

socket.on('joined', function (room) {
  console.log('joined: ' + room);
  isChannelReady = true;
});

socket.on('log', function (array) {
  console.log.apply(console, array);
});

socket.on("bye", function(msg){
  isPlaying = false;
  info[0].style.visibility = 'visible';
  handleRemoteHangup();

});

////////////////////////////////////////////////

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', room, message);
}

// This client receives a message
socket.on('message', function (message) {
  console.log('Client received message:', message);
  
  if (message.type === 'offer') {
    if (!isStarted) {
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } else if (message.type === 'answer' && isStarted) {
    console.log("received answer");
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate' && isStarted) {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    pc.addIceCandidate(candidate);
  }
});

////////////////////////////////////////////////////

function maybeStart() {
  console.log('>>>>>>> maybeStart() ', isStarted, isChannelReady);
  if (!isStarted && isChannelReady) {
    console.log('>>>>>> creating peer connection');
    createPeerConnection();
    isStarted = true;
    console.log('isInitiator', isInitiator);
  }
}


/////////////////////////////////////////////////////////


function clbkDataChannelMsg(msg) {
  console.log(msg.data);
  result = msg.data;
}

function callback_ondatachannel(event) {
  console.log("Data channel recieved.");
  dataChannel = null;
  dataChannel = event.channel;
  dataChannel.onmessage = clbkDataChannelMsg;
}

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(pcConfig);
    pc.onicecandidate = handleIceCandidate;
    pc.ondatachannel = callback_ondatachannel;
    if ('ontrack' in pc) {
      pc.ontrack = handleRemoteStreamAdded;
    } else {
      // deprecated
      pc.onaddstream = handleRemoteStreamAdded;
    }
    pc.onremovestream = handleRemoteStreamRemoved;
    if(localAudioTrack !== "undefined"){
      pc.addTrack(localAudioTrack[0]);
    }
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) {
  console.log('icecandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log('End of candidates.');
  }
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  console.log(event.streams[0]);
  remoteVideo.srcObject = event.streams[0];
  remoteStream = event.streams[0];
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function doCall() {
  console.log('Sending offer to peer');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
  console.log('Sending answer to peer.');
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription) {
  // Set Opus as the preferred codec in SDP if Opus is present.
  //  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message', sessionDescription);
  sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function hangup() {
  console.log('Hanging up.');
  sendMessage('bye');
  stop();
  socket.disconnect()
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  stop();
  isInitiator = false;
}

function stop() {
  isStarted = false;
  // isAudioMuted = false;
  // isVideoMuted = false;
  pc = null;
  dataChannel = null;
  //socket.disconnect()
}

function sendMsgDataChannel(msg) {
  if(shouldSendDataChannel){
    if (dataChannel.readyState == "open") {
      dataChannel.send(msg);
      console.log("Mouse coordinates are send.");
      shouldSendDataChannel = false;
    } else {
      console.log("Data Channel is not in open state.");
    }
    setTimeout(function(){
      shouldSendDataChannel = true;
    }, 3000);
  }
}

var mouse_coordinates = [];

remote_video.addEventListener("playing", function () {
  info[0].style.visibility = 'hidden';
  adjustVideoSize();
  isPlaying = true;
});


window.onbeforeunload = function () {
  hangup();
};

navigator.mediaDevices.getUserMedia(audio_constraints).then(function(stream){
  localAudioTrack = stream.getAudioTracks();
}).catch(function(){
  console.log("Unable to get audio source.")
})

function adjustVideoSize(){
  console.log("setting width and height of video.");
  var windowSizeRatio = window.innerWidth/window.innerHeight;
  var videoSizeRatio = remote_video.videoWidth/remote_video.videoHeight;
  if(videoSizeRatio <= windowSizeRatio){
    remote_video.style.height = window.innerHeight+"px";
    remote_video.style.width = "auto";
  }
  else{
    remote_video.style.width = window.innerWidth+"px";
    remote_video.style.height = "auto";
  }
}

window.onresize = function(){
  adjustVideoSize();
}

remote_video.onresize = function(){
  adjustVideoSize();
}

btn_mute.addEventListener("click", function(){
  var icon = btn_mute.firstElementChild;
  if(icon.classList.contains("fa-microphone")){
    icon.classList.remove("fa-microphone");
    icon.classList.add("fa-microphone-slash");
    btn_mute.classList.remove("btn-dark");
    btn_mute.classList.add("btn-danger");
    localAudioTrack[0].enabled = false;
  }else{
    icon.classList.remove("fa-microphone-slash");
    icon.classList.add("fa-microphone");
    btn_mute.classList.remove("btn-danger");
    btn_mute.classList.add("btn-dark");
    localAudioTrack[0].enabled = true;
  }
})

btn_speaker.addEventListener("click", function(){
  var icon = btn_speaker.firstElementChild;
  if(icon.classList.contains("fa-volume-up")){
    icon.classList.remove("fa-volume-up");
    icon.classList.add("fa-volume-mute");
    btn_speaker.classList.remove("btn-dark");
    btn_speaker.classList.add("btn-danger");
    remote_video.volume = 0.0;
  }else{
    icon.classList.remove("fa-volume-mute");
    icon.classList.add("fa-volume-up");
    btn_speaker.classList.remove("btn-danger");
    btn_speaker.classList.add("btn-dark");
    remote_video.volume = 1.0;
  }
})

leave.addEventListener("click", function(){
  hangup()
  window.location.replace("/remote/logout");
})

document.body.addEventListener("click", function(){
  const mouseX = event.clientX;
  const mouseY = event.clientY;
  const leftX = remote_video.offsetLeft;
  const rightX = leftX + remote_video.offsetWidth;
  const topY = remote_video.offsetTop;
  const bottomY = topY + remote_video.offsetHeight;

  if((mouseX >= leftX) && (mouseX <= rightX)){
    if((mouseY >= topY) && (mouseY <= bottomY)){
      if(isInsideXY(mouseX, mouseY)){
        if(isPlaying){
          mouse_coordinates.push([(mouseX - leftX), (mouseY - topY)]);
          mouse_coordinates.push([remote_video.offsetWidth, remote_video.offsetHeight]);
          console.log("mouse coordinates : " + mouse_coordinates);
          sendMsgDataChannel(JSON.stringify(mouse_coordinates))
          mouse_coordinates = [];
        }
      }
    }
  }
})

window.onload = function(){
  remote_video.style.visibility = "hidden";
}

remote_video.addEventListener("canplay", function(){
  remote_video.style.visibility = "visible";
  remote_video.play();
})

function isInsideXY(x, y){
  const mutePoints = btn_mute.getBoundingClientRect();
  const leavePoints = leave.getBoundingClientRect();
  if((x < mutePoints.left) || (x > (leavePoints.left+leavePoints.width))){
    return true;
  }
  else{
    if((y < mutePoints.top) || (y > (mutePoints.top+mutePoints.height))){
      return true;
    }else{
      return false;
    }
  }
}