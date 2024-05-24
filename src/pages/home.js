import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Peer from "simple-peer";
import { ChatContainer, WhatsappHome } from "../components/Chat";
import { Sidebar } from "../components/sidebar";
import SocketContext from "../context/SocketContext";
import {
  getConversations,
  updateMessagesAndConversations,
} from "../features/chatSlice";
import Call from "../components/Chat/call/Call";
import {
  getConversationId,
  getConversationName,
  getConversationPicture,
} from "../utils/chat";

const callData = {
  socketId: "",
  receivingCall: false,
  callEnded: false,
  name: "",
  picture: "",
  signal: "",
};

function Home({ socket }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const { activeConversation } = useSelector((state) => state.chat);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [call, setCall] = useState(callData);
  const [stream, setStream] = useState();
  const [show, setShow] = useState(false);
  const { receivingCall, callEnded, socketId } = call;
  const [callAccepted, setCallAccepted] = useState(false);
  const [totalSecInCall, setTotalSecInCall] = useState(0);
  const myVideo = useRef(null);
  const userVideo = useRef(null);
  const connectionRef = useRef(null);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    socket.emit("join", user._id);
    socket.on("get-online-users", (users) => {
      setOnlineUsers(users);
    });
  }, [user, socket]);

  useEffect(() => {
    setupMedia();
    socket.on("setup socket", (id) => {
      setCall((prevCall) => ({ ...prevCall, socketId: id }));
    });
    socket.on("call user", (data) => {
      setCall({
        socketId: data.from,
        name: data.name,
        picture: data.picture,
        signal: data.signal,
        receivingCall: true,
        callEnded: false,
      });
    });
    socket.on("end call", () => {
      setShow(false);
      setCall((prevCall) => ({
        ...prevCall,
        callEnded: true,
        receivingCall: false,
      }));
      if (myVideo.current) {
        myVideo.current.srcObject = null;
      }
      if (callAccepted) {
        connectionRef.current?.destroy();
      }
    });
  }, [socket, callAccepted]);

  const callUser = () => {
    enableMedia();
    setCall((prevCall) => ({
      ...prevCall,
      name: getConversationName(user, activeConversation.users),
      picture: getConversationPicture(user, activeConversation.users),
    }));
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });
    peer.on("signal", (data) => {
      socket.emit("call user", {
        userToCall: getConversationId(user, activeConversation.users),
        signal: data,
        from: socketId,
        name: user.name,
        picture: user.picture,
      });
    });
    peer.on("stream", (stream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    });
    socket.on("call accepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });
    connectionRef.current = peer;
  };

  const answerCall = () => {
    enableMedia();
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });
    peer.on("signal", (data) => {
      socket.emit("answer call", { signal: data, to: call.socketId });
    });
    peer.on("stream", (stream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    });
    peer.signal(call.signal);
    connectionRef.current = peer;
  };

  const endCall = () => {
    setShow(false);
    setCall((prevCall) => ({
      ...prevCall,
      callEnded: true,
      receivingCall: false,
    }));
    if (myVideo.current) {
      myVideo.current.srcObject = null;
    }
    socket.emit("end call", call.socketId);
    connectionRef.current?.destroy();
  };

  const setupMedia = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
      });
  };

  const enableMedia = () => {
    if (myVideo.current) {
      myVideo.current.srcObject = stream;
    }
    setShow(true);
  };

  useEffect(() => {
    if (user?.token) {
      dispatch(getConversations(user.token));
    }
  }, [user, dispatch]);

  useEffect(() => {
    socket.on("receive message", (message) => {
      dispatch(updateMessagesAndConversations(message));
    });
    socket.on("typing", (conversation) => setTyping(conversation));
    socket.on("stop typing", () => setTyping(false));
  }, [socket, dispatch]);

  return (
    <>
      <div className="h-screen dark:bg-dark_bg_1 flex items-center justify-center overflow-hidden">
        <div className="container h-screen flex py-[19px]">
          <Sidebar onlineUsers={onlineUsers} typing={typing} />
          {activeConversation._id ? (
            <ChatContainer
              onlineUsers={onlineUsers}
              callUser={callUser}
              typing={typing}
            />
          ) : (
            <WhatsappHome />
          )}
        </div>
      </div>
      <div className={(show || call.signal) && !call.callEnded ? "" : "hidden"}>
        <Call
          call={call}
          setCall={setCall}
          callAccepted={callAccepted}
          myVideo={myVideo}
          userVideo={userVideo}
          stream={stream}
          answerCall={answerCall}
          show={show}
          endCall={endCall}
          totalSecInCall={totalSecInCall}
          setTotalSecInCall={setTotalSecInCall}
        />
      </div>
    </>
  );
}

const HomeWithSocket = (props) => (
  <SocketContext.Consumer>
    {(socket) => <Home {...props} socket={socket} />}
  </SocketContext.Consumer>
);

export default HomeWithSocket;
