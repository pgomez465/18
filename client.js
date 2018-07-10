 //our username 
 var name; 
 var connectedUser;
   
 //connecting to our signaling server
 var conn = new WebSocket('ws://localhost:9090');
   
 conn.onopen = function () { 
    console.log("Connected to the signaling server"); 
 };
   
 //when we got a message from a signaling server 
 conn.onmessage = function (msg) { 
    console.log("Got message", msg.data);
     
    var data = JSON.parse(msg.data); 
     
    switch(data.type) { 
       case "login": 
          handleLogin(data.success); 
          break; 
       //when somebody wants to call us 
       case "offer": 
          handleOffer(data.offer, data.name); 
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
   
 conn.onerror = function (err) { 
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
   
 //****** 
 //UI selectors block 
 //******
  
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
 var msgInput = document.querySelector('#msgInput'); 
 var sendMsgBtn = document.querySelector('#sendMsgBtn'); 
 var chatArea = document.querySelector('#chatarea'); 
  
 
 var yourConn; 
 var stream;
 var streamA;
 var dataChannel;
   
 callingPage.style.display = "none";
 callPage.style.display = "none";
 
 // Login when the user clicks the button 
 loginBtn.addEventListener("click", function (event) { 
    name = usernameInput.value;
     
    if (name.length > 0) { 
       send({ 
          type: "login", 
          name: name 
       }); 
    }
     
 });
   
 function handleLogin(success) { 
    if (success === false) { 
       alert("Ooops...try a different username"); 
    } else { 
       loginPage.style.display = "none"; 
       callingPage.style.display = "block";
         
       //********************** 
       //Starting a peer connection 
       //********************** 
           
       /*******************************/
       //using Google public stun server 
       var configuration = { 
            "iceServers": [{ "url": "stun:stun2.1.google.com:19302" }] 
       }; 
               
      yourConn = new webkitRTCPeerConnection(configuration, {optional: [{RtpDataChannels: true}]}); 
               
      // Setup ice handling 
      yourConn.onicecandidate = function (event) { 
            if (event.candidate) { 
                  send({ 
                  type: "candidate", 
                  candidate: event.candidate 
                  }); 
            } 
      }; 
      /*******************************/
       //getting local video stream 
       navigator.webkitGetUserMedia({ video: true, audio: true }, function (myStream) { 
          stream = myStream; 
             
          //displaying local video stream on the page 
          localVideo.src = window.URL.createObjectURL(stream);
          /*   
          //using Google public stun server 
          var configuration = { 
             "iceServers": [{ "url": "stun:stun2.1.google.com:19302" }]
          }; 
             
          //yourConn = new webkitRTCPeerConnection(configuration); 
          yourConn = new webkitRTCPeerConnection(configuration, {optional: [{RtpDataChannels: true}]}); 
     */
          // setup stream listening 
          yourConn.addStream(stream); 
             
          //when a remote user adds stream to the peer connection, we display it 
          yourConn.onaddstream = function (e) { 
             remoteVideo.src = window.URL.createObjectURL(e.stream); 
          };
           /*  
          // Setup ice handling 
          yourConn.onicecandidate = function (event) { 
             if (event.candidate) { 
                send({ 
                   type: "candidate", 
                   candidate: event.candidate 
                }); 
             } 
          };  */
             
       }, function (error) { 
          console.log(error); 
       }); 
       
       //////////////////////
       /*
       navigator.webkitGetUserMedia({ video: false, audio: true }, function (myStream) { 
             streamA = myStream; 
                      
             //displaying local audio stream on the page 
             localAudio.src = window.URL.createObjectURL(streamA);
                      
             //using Google public stun server 
             var configuration = { 
                "iceServers": [{ "url": "stun:stun2.1.google.com:19302" }] 
             }; 
                      
             yourConn = new webkitRTCPeerConnection(configuration); 
                      
             // setup stream listening 
             yourConn.addStream(streamA); 
                      
             //when a remote user adds stream to the peer connection, we display it 
             yourConn.onaddstream = function (e) { 
                remoteAudio.src = window.URL.createObjectURL(e.streamA); 
             }; 
                      
             // Setup ice handling 
             yourConn.onicecandidate = function (event) { 
                if (event.candidate) { 
                   send({ 
                      type: "candidate", 
                      candidate: event.candidate 
                   }); 
                } 
             }; 
                      
       }, function (error) { 
             console.log(error); 
       });
       */
       //////////////////////
       
       /************************************************/
       //creating data channel 
       dataChannel = yourConn.createDataChannel("channel1", {reliable:true}); 
         
       dataChannel.onerror = function (error) { 
          console.log("Ooops...error:", error); 
       }; 
         
       //when we receive a message from the other peer, display it on the screen 
       dataChannel.onmessage = function (event) { 
          chatArea.innerHTML += connectedUser + ": " + event.data + "<br />"; 
       }; 
         
       dataChannel.onclose = function () { 
          console.log("data channel is closed"); 
       };
       /**********************************************/
      //var dataChannel = peerConnection.createDataChannel("channel1", {reliable:true});
      var sendQueue = [];

      function sendMessage(msg) {
            switch(dataChannel.readyState) {
            case "connecting":
                  console.log("Connection not open; queueing: " + msg);
                  sendQueue.push(msg);
                  break;
            case "open":
                  sendQueue.forEach((msg) => dataChannel.send(msg));
                  break;
            case "closing":
                  console.log("Attempted to send message while closing: " + msg);
                  break;
            case "closed":
                  console.log("Error! Attempt to send while connection closed.");
                  break;
            }
      }
       /********************************/	
       //when user clicks the "send message" button 
      sendMsgBtn.addEventListener("click", function (event) { 
      var val = msgInput.value; 
      chatArea.innerHTML += name + ": " + val + "<br />"; 
         
      //sending a message to a connected peer        
      sendMessage(val);
      dataChannel.send(val);
      msgInput.value = ""; 
});
    } 
 };
   
 //initiating a call 
 callBtn.addEventListener("click", function () { 
    var callToUsername = callToUsernameInput.value;
     
    if (callToUsername.length > 0) { 
     
       connectedUser = callToUsername;
         
       // create an offer 
       yourConn.createOffer(function (offer) { 
          send({ 
             type: "offer", 
             offer: offer 
          }); 
             
          yourConn.setLocalDescription(offer); 
          callPage.style.display = "block";          
          callAccept.style.display = "block";
          ansBtn.style.display = "none";
          document.querySelector('#callAccept p.message').textContent='Calling to '+connectedUser;
       }, function (error) { 
          alert("Error when creating an offer"); 
       });
         
    } 
 });
   
 //when somebody sends us an offer 
 function handleOffer(offer, name) { 
    connectedUser = name; 
    callAccept.style.display = "block";
    document.querySelector('#callAccept p.message').textContent=connectedUser + ' is calling...';
    yourConn.setRemoteDescription(new RTCSessionDescription(offer));
    ansBtn.addEventListener("click", function () {        

        //create an answer to an offer 
        yourConn.createAnswer(function (answer) { 
        yourConn.setLocalDescription(answer); 
            
        send({ 
            type: "answer", 
            answer: answer 
        }); 
        ansBtn.style.display = "none";
        document.querySelector('#callAccept p.message').textContent=connectedUser + ' is Connected';
        callPage.style.display = "block";  
            
        }, function (error) { 
        alert("Error when creating an answer"); 
        });
    });
     
 };

   
 //when we got an answer from a remote user
 function handleAnswer(answer) { 
    callAccept.style.display = "block";
    ansBtn.style.display = "none";
    document.querySelector('#callAccept p.message').textContent=callToUsernameInput.value + ' is Connected';
    yourConn.setRemoteDescription(new RTCSessionDescription(answer)); 
    //callPage.style.display = "block";
 };
   
 //when we got an ice candidate from a remote user 
 function handleCandidate(candidate) { 
    yourConn.addIceCandidate(new RTCIceCandidate(candidate));
    //callPage.style.display = "block";
 };
    
 //hang up 
 hangUpBtn.addEventListener("click", function () { 
 
    send({ 
       type: "leave" 
    });  
     
    handleLeave(); 
 });
   
 function handleLeave() { 
    connectedUser = null; 
    remoteVideo.src = null; 
    remoteAudio.src = null;
     
    yourConn.close(); 
    yourConn.onicecandidate = null; 
    yourConn.onaddstream = null; 
    document.querySelector('#callAccept p.message').textContent='';
    ansBtn.style.display = "block";
    callAccept.style.display = "none";
    callPage.style.display = "none";
 };
 