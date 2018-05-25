
// let username = prompt('Enter your username');
let username = 'denver';


// Generate random room name if needed
if (!location.hash) {
   location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
}
const roomHash = location.hash.substring(1);

// TODO: Replace with your own channel ID
const drone = new ScaleDrone('yiS12Ts5RdNhebyM');
// Room name needs to be prefixed with 'observable-'
const roomName = 'observable-' + roomHash;
const configuration = {
   iceServers: [{
      urls: 'stun:stun.l.google.com:19302'
   }]
};
let room;
let pc;
let dataChannel;


function onSuccess() { };
function onError(error) {
   console.error(error);
};

drone.on('open', error => {
   if (error) {
      return console.error(error);
   }
   room = drone.subscribe(roomName);
   room.on('open', error => {
      if (error) {
         onError(error);
      }
   });
   // We're connected to the room and received an array of 'members'
   // connected to the room (including us). Signaling server is ready.
   room.on('members', members => {
      console.log('MEMBERS', members);
      // If we are the second user to connect to the room we will be creating the offer
      const isOfferer = members.length === 2;
      startWebRTC(isOfferer);
   });
});

// Send signaling data via Scaledrone
function sendMessage(message) {
   drone.publish({
      room: roomName,
      message
   });
}

function startWebRTC(isOfferer) {
   pc = new RTCPeerConnection(configuration);

   // 'onicecandidate' notifies us whenever an ICE agent needs to deliver a
   // message to the other peer through the signaling server
   pc.onicecandidate = event => {
      if (event.candidate) {
         sendMessage({ 'candidate': event.candidate });
      }
   };

   // If user is offerer let the 'negotiationneeded' event create the offer
   if (isOfferer) {
      pc.onnegotiationneeded = () => {
         pc.createOffer().then(localDescCreated).catch(onError);
      }

      dataChannel = pc.createDataChannel('chat');
      setupDataChannel();
   }else{
      pc.ondatachannel = (event) => {
         dataChannel = event.channel;
         setupDataChannel();
      }
   }

   // startListentingToSignals();

   // When a remote stream arrives display it in the #remoteVideo element
   pc.onaddstream = event => {
      remoteVideo.srcObject = event.stream;
      // pc.addStream(event.stream);
      
      console.log('oc.onaddstreams');
   };
  
   navigator.mediaDevices.getUserMedia({
         audio: true,
         video: true,
      }).then(stream => {
         // Display your local video in #localVideo element
         console.log('navigator.mediaDevices');
         localVideo.srcObject = stream;

         // Add your stream to be sent to the conneting peer
         pc.addStream(stream);
   }, onError);

   // Listen to signaling data from Scaledrone
   room.on('data', (message, client) => {
      // Message was sent by us
      if (client.id === drone.clientId) {
         return;
      }

      if (message.sdp) {
         // This is called after receiving an offer or answer from another peer
         pc.setRemoteDescription(new RTCSessionDescription(message.sdp), () => {
            // When receiving an offer lets answer it
            if (pc.remoteDescription.type === 'offer') {
               pc.createAnswer().then(localDescCreated).catch(onError);
            }
         }, onError);
      } else if (message.candidate) {
         // Add the new ICE candidate to our connections remote description
         pc.addIceCandidate(
            new RTCIceCandidate(message.candidate), onSuccess, onError
         );
      }
   });
}



function localDescCreated(desc) {
   pc.setLocalDescription(
      desc,
      () => sendMessage({ 'sdp': pc.localDescription }),
      onError
   );
}

function insertMessageToDOM(message, outbound){
   let messageClass = '';

   (outbound) ? messageClass = 'left-align' : messageClass = 'right-align';
   document.getElementById('convoDiv').innerHTML += `<p class='${messageClass}'>${message}</p>`;
   // document.getElementById('convoDiv').innerHTML += `<p>${message}</p>`;

}

function setupDataChannel(){
   checkDataChannelState();
   dataChannel.onopen = checkDataChannelState;
   dataChannel.onclose = checkDataChannelState;
   dataChannel.onmessage = event => {
      let message = JSON.parse(event.data)

      console.log(message.content);
      // document.getElementById('convoDiv').innerHTML += `<p>${message.content}</p>`;
      insertMessageToDOM(message.content, true)

      // document.getElementById('convoDiv').appendChild(document.createElement(`<h4>${message.content}</h4>`));
      // ${(event.data.content}
   }
   // insertMessageToDOM(JSON.parse(event.data), false)
}

function checkDataChannelState(){
   console.log('WebRTC channel state: ', dataChannel.readyState);
   if (dataChannel.readyState === 'open') {
      // insertMessageToDOM({ content: 'WebRTC data channel is now open' });
      console.log('WebRTC data channel is now open!');
   }
}