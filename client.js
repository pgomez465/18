 //our username 
 var name;
 var connectedUser;
 var mediatype ='';


 //using Google public stun server 
 var configuration = {
    "iceServers": [{
        "url": "stun:stun2.1.google.com:19302"
    }]
};

 //connecting to our signaling server
 var conn = new WebSocket('ws://localhost:9090');

 conn.onopen = function() {
     console.log("Connected to the signaling server");
 };

 //when we got a message from a signaling server 
 conn.onmessage = function(msg) {
     console.log("Got message", msg.data);

     var data = JSON.parse(msg.data);

     switch (data.type) {
         case "login":
             handleLogin(data.success);
             break;
             //when somebody wants to call us 
         case "offer":
             mediatype = data.mediatype;
             handleOffer(data.offer, data.name, data.mediatype);             
             break;
         case "answer":
             handleAnswer(data.answer);
             break;
             //when a remote peer sends an ice candidate to us 
         case "candidate":
             handleCandidate(data.candidate);
             break;
         case "leave":
             handleLeave();
             break;
         default:
             break;
     }
 };

 conn.onerror = function(err) {
     console.log("Got error", err);
 };

 //alias for sending JSON encoded messages 
 function send(message) {
     //attach the other peer username to our messages 
     if (connectedUser) {
         message.name = connectedUser;
     }

     conn.send(JSON.stringify(message));
 };

 //************************************// 
 //UI selectors block 
 //************************************//

 var loginPage = document.querySelector('#loginPage');
 var usernameInput = document.querySelector('#usernameInput');
 var loginBtn = document.querySelector('#loginBtn');

 var callingPage = document.querySelector('#callingPage');
 var callAccept = document.querySelector('#callAccept');
 var callPage = document.querySelector('#callPage');
 var callToUsernameInput = document.querySelector('#callToUsernameInput');
 var callBtn = document.querySelector('#callBtn');
 var ansBtn = document.querySelector('#ansBtn');

 var hangUpBtn = document.querySelector('.hangUpBtn');

 var localVideo = document.querySelector('#localVideo');
 var remoteVideo = document.querySelector('#remoteVideo');
 var localAudio = document.querySelector('#localAudio');
 var remoteAudio = document.querySelector('#remoteAudio');
 var audioCallBtn = document.querySelector('#audioCallBtn');
 var videoCallBtn = document.querySelector('#videoCallBtn');
 var audioRemoveBtn = document.querySelector('#audioRemoveBtn');
 var videoRemoveBtn = document.querySelector('#videoRemoveBtn');
 var msgInput = document.querySelector('#msgInput');
 var sendMsgBtn = document.querySelector('#sendMsgBtn');
 var chatArea = document.querySelector('#chatarea');

 var yourConn;
 var stream;
 var streamA;
 var sendChannel;

 callingPage.style.display = "none";
 callPage.style.display = "none";

 //***************************************************// 
 // Set event listeners for user interface widgets
 //***************************************************//

 // Login when the user clicks the button 
 loginBtn.addEventListener("click", function(event) {
     name = usernameInput.value;

     if (name.length > 0) {
         send({
             type: "login",
             name: name
         });
     }

 });
 //initiating a call 
 callBtn.addEventListener("click", function() {
     var callToUsername = callToUsernameInput.value;

     if (callToUsername.length > 0) {

         connectedUser = callToUsername;

         // create an offer 
         yourConn.createOffer(function(offer) {
             send({
                 type: "offer",
                 offer: offer
             });

             yourConn.setLocalDescription(offer);
             //callPage.style.display = "block";
             callAccept.style.display = "block";
             ansBtn.disabled = true;
             ansBtn.style.display = "none";

             document.querySelector('#callAccept p.message').textContent = 'Calling to ' + connectedUser;

         }, function(error) {
             alert("Error when creating an offer");
         });

     }
 });
 ansBtn.addEventListener("click", function() {
    if (!mediatype) {
     //create an answer to an offer 
     yourConn.createAnswer(function(answer) {
         yourConn.setLocalDescription(answer);

         send({
             type: "answer",
             answer: answer
         });
         //ansBtn.style.display = "none";
         ansBtn.disabled = true;
         document.querySelector('#callAccept p.message').textContent = connectedUser + ' is Connected' + (mediatype ? ' with ' + mediatype : '');
         document.querySelector('#callReq').style.display = "none";
         callPage.style.display = "block";
     }, function(error) {
         alert("Error when creating an answer");
     });
    } else{
        var sdpConstraints = { 
            'mandatory': {
            'OfferToReceiveAudio': false,
            'OfferToReceiveVideo': false
        }
        };
     yourConn.createAnswer(sdpConstraints).then(function (sdp) {
        return yourConn.setLocalDescription(sdp).then(function() {
            send({
                type: "answer",
                answer: sdp,
                mediatype: mediatype
            });
            console.log("------ SEND ANSWER ------");
            //ansBtn.style.display = "none";
         ansBtn.disabled = true;
         document.querySelector('#callAccept p.message').textContent = connectedUser + ' is Connected' + (mediatype ? ' with ' + mediatype : '');
         document.querySelector('#callReq').style.display = "none";
         callPage.style.display = "block";         
        })
    }, function(error) {
        alert("Error when creating an answer");
    });
}
 });
 //hang up 
 hangUpBtn.addEventListener("click", function() {

     send({
         type: "leave"
     });

     handleLeave();
 });
 //when user clicks the "send message" button 
 sendMsgBtn.addEventListener("click", function(event) {
     var val = msgInput.value;
     //sending a message to a connected peer      
     appendDIV(val, name);
     sendChannel.send(val);
     msgInput.value = "";
     msgInput.focus();
     //mediatype="";    
 });
 //when user clicks the "Audio Call Request" button 
 audioCallBtn.addEventListener("click", function(event) {
     document.querySelector('#audioPlay').style.display = "block";
     //getting local audio stream 
     navigator.webkitGetUserMedia({
         video: false,
         audio: true
     }, function(myStream) {
         streamA = myStream;

         //displaying local audio stream on the page 
         localAudio.src = window.URL.createObjectURL(streamA);

         // setup stream listening 
         yourConn.addStream(streamA);
         mediatype = "audio";
         createMediaOffer(mediatype);
     }, function(error) {
         console.log(error);
     });
     audioRemoveBtn.style.display = "none";
     audioCallBtn.style.display = "block";
 });
 //when user clicks the "Stop Audio Call" button 
 audioRemoveBtn.addEventListener("click", function() {
     audioCallBtn.style.display = "block";
     console.log("removeAudioTrack()");
     streamA.removeTrack(streamA.getAudioTracks()[0]);
 });

 //when user clicks the "Stop Video Call" button 
 videoRemoveBtn.addEventListener("click", function() {
     videoCallBtn.style.display = "block";
     console.log("removeVideoTrack()");
     stream.removeTrack(stream.getVideoTracks()[0]);
 });

 //when user clicks the "Video Call Request" button 
 videoCallBtn.addEventListener("click", function(event) {
     audioCallBtn.disabled = true;
     mediatype = "video";
    // connectPeers();
     createMediaOffer(mediatype);

 });

 //***************************************************// 
 // Define Function
 //***************************************************//
 function handleLogin(success) {

     if (success === false) {
         alert("Ooops...try a different username");
     } else {
         loginPage.style.display = "none";
         callingPage.style.display = "block";

         connectPeers();
         //connectMedia();
     }
 };
 //when somebody sends us an offer 
 function handleOffer(offer, name, mediatype) {
     connectedUser = name;
     ansBtn.disabled = false;
     ansBtn.style.display = "block";
     callAccept.style.display = "block";
     yourConn.setRemoteDescription(new RTCSessionDescription(offer));
     if (mediatype == 'video') {
         document.querySelector('#callAccept p.message').textContent = connectedUser + ' is sending video call request...';
         //connectPeers();
         connectMedia(mediatype);
     } else {
         document.querySelector('#callAccept p.message').textContent = connectedUser + ' is calling...';
     }     
 };


 //when we got an answer from a remote user
 function handleAnswer(answer) {
     yourConn.setRemoteDescription(new RTCSessionDescription(answer));
     callAccept.style.display = "block";
     //ansBtn.style.display = "none";
     ansBtn.disabled = true;
     document.querySelector('#callAccept p.message').textContent = callToUsernameInput.value + ' is Connected';
     document.querySelector('#callReq').style.display = "none";
     callPage.style.display = "block";     
     //callPage.style.display = "block";

 };

 //when we got an ice candidate from a remote user 
 function handleCandidate(candidate) {
     yourConn.addIceCandidate(new RTCIceCandidate(candidate));
     //callPage.style.display = "block";    
 };

 //hang up
 function handleLeave() {
     connectedUser = null;
     remoteVideo.src = null;
     remoteAudio.src = null;

     yourConn.close();
     yourConn.onicecandidate = null;
     yourConn.onaddstream = null;
     document.querySelector('#callAccept p.message').textContent = '';
     //ansBtn.style.display = "block";
     ansBtn.disabled = false;
     callAccept.style.display = "none";
     callPage.style.display = "none";
     document.querySelector('#callReq').style.display = "block";
     document.querySelector('#videoPlay').style.display = "none";
     document.querySelector('#audioPlay').style.display = "none";
 };

 function appendDIV(data, userid) {
     chatArea.innerHTML += userid + ": " + data + "<br />";
     msgInput.focus();
 }
 //***************************************************//
 //Starting a peer connection 
 //***************************************************//

 function connectPeers() {
     

     /*yourConn = new webkitRTCPeerConnection(configuration, {
         optional: [{
             RtpDataChannels: true
         }]
     });*/
     
        yourConn = new RTCPeerConnection(configuration);


        // Setup ice handling 
        yourConn.onicecandidate = function(event) {
            if (event.candidate) {
                send({
                    type: "candidate",
                    candidate: event.candidate,
                    mediatype:mediatype
                });
            }
        };
        //when a remote user adds stream to the peer connection, we display it 
     yourConn.onaddstream = function(e) {
        alert('3');
       remoteVideo.src = window.URL.createObjectURL(e.stream);

       videoCallBtn.style.display = "none";
       videoRemoveBtn.style.display = "block";
   };
   yourConn.ontrack= function(e) {
       alert('4');
       remoteVideo.src = window.URL.createObjectURL(e.stream);

       videoCallBtn.style.display = "none";
       videoRemoveBtn.style.display = "block";
   };
        openDataChannel();  
     
 }

 function openDataChannel() {


     sendChannel = yourConn.createDataChannel("CHANNEL_NAME", {
         reliable: false
     });

     sendChannel.onopen = function(event) {
         var readyState = sendChannel.readyState;
         if (readyState == "open") {
             //sendChannel.send("Hello");
             console.log("open state");
         }
     };
     sendChannel.onmessage = function(event) {
         //alert("event.data");
         appendDIV(event.data, connectedUser);
     };
     yourConn.ondatachannel = function(event) {
         var receiveChannel = event.channel;
         receiveChannel.onmessage = function(event) {
             //alert(event.data);
             appendDIV(event.data, connectedUser);
         };
     };
     //when a remote user adds stream to the peer connection, we display it 
     yourConn.onaddstream = function(e) {
        alert('1');
       remoteVideo.src = window.URL.createObjectURL(e.stream);

       videoCallBtn.style.display = "none";
       videoRemoveBtn.style.display = "block";
   };
   yourConn.ontrack= function(e) {
       alert('2');
       remoteVideo.src = window.URL.createObjectURL(e.stream);

       videoCallBtn.style.display = "none";
       videoRemoveBtn.style.display = "block";
   };

 }

 function hasUserMedia() {
     //check if the browser supports the WebRTC 
     return !!(navigator.getUserMedia || navigator.webkitGetUserMedia ||
         navigator.mozGetUserMedia);
 }

 function createMediaOffer(mediatype) {
    // create an offer 
   /* yourConn.createOffer(function(offer) {
        send({
            type: "offer",//video-offer
            offer: offer,
            mediatype: mediatype
        });

        yourConn.setLocalDescription(offer);


        document.querySelector('#callAccept p.message').textContent = 'video Calling to ' + connectedUser;
        
        connectMedia(mediatype);

    }, function(error) {
        alert("Error when creating video offer");
    });*/
    connectMedia(mediatype);
    var sdpConstraints = { offerToReceiveAudio: true,  offerToReceiveVideo: true }
            yourConn.createOffer(sdpConstraints).then(function (sdp) {
                yourConn.setLocalDescription(sdp);
                send({
                    type: "offer",//video-offer
                    offer: sdp,
                    mediatype: mediatype
                });
                document.querySelector('#callAccept p.message').textContent = 'video Calling to ' + connectedUser;
        
        
                console.log("------ SEND OFFER ------");
            }, function (err) {
                console.log(err)
            });
}

function connectMedia(mediatype) {    
    if (hasUserMedia()) {       
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia;
        //getting local video stream 
     navigator.webkitGetUserMedia({ video: true, audio: true }, function (myStream) { 
       stream = myStream; 
       document.querySelector('#videoPlay').style.display = "block";  
       //displaying local video stream on the page 
       localVideo.src = window.URL.createObjectURL(stream); 
          
       yourConn = new webkitRTCPeerConnection(configuration); 
          
       // setup stream listening 
       yourConn.addStream(stream); 
          
       //when a remote user adds stream to the peer connection, we display it 
       yourConn.onaddstream = function (e) { 
        alert('onaddstream');
          remoteVideo.src = window.URL.createObjectURL(e.stream); 
          videoCallBtn.style.display = "none";
                videoRemoveBtn.style.display = "block";
       }; 
       yourConn.ontrack = function (e) { 
           alert('ontrac');
        remoteVideo.src = window.URL.createObjectURL(e.stream); 
        videoCallBtn.style.display = "none";
              videoRemoveBtn.style.display = "block";
     }; 
          
    }, function (error) { 
       console.log(error); 
    }); 
    } else {
        alert("WebRTC is not supported");
    }
}

var sdpConstraints = { 
    'mandatory': {
    'OfferToReceiveAudio': false,
    'OfferToReceiveVideo': false
}
};