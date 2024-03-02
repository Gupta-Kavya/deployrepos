import "./App.css";
import Sidebar from "./components/Sidebar";
import { useEffect } from "react";
import { ToastContainer, toast, Bounce } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";

import { io } from "socket.io-client";

function App() {
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    // Get the value of the 'accessToken' parameter
    const accessTokenParam = searchParams.get("accessToken");
    const userName = searchParams.get("userName");
    const jwtToken = searchParams.get("jwtToken");

    const decodedToken = jwtDecode(localStorage.getItem("token"));

    // Update state with the access token
    if (accessTokenParam && userName && jwtToken) {
      localStorage.setItem("accessToken", accessTokenParam);
      localStorage.setItem("userName", userName);
      localStorage.setItem("token", jwtToken);
    } else if (
      localStorage.getItem("accessToken") &&
      localStorage.getItem("userName") &&
      localStorage.getItem("token")
    ) {
      if (decodedToken.accessToken === localStorage.getItem("accessToken") && decodedToken.userName === localStorage.getItem("userName")) {
      } else {
        window.location = `${process.env.REACT_APP_FRONTEND_URI}/login`;
      }
    } else {
      window.location = `${process.env.REACT_APP_FRONTEND_URI}/login`;
    }

    // window.location = "http://localhost:3000/login";

    const socket = io(`${process.env.REACT_APP_BACKEND_URI}`);

    socket.on("connect", () => {
      console.log("Socket connected");
    });

    // socket.on("status-update", (message) => {
    //   console.log("Received message:", message);

    //   toast.success(message, {
    //     position: "top-center",
    //     autoClose: 5000,
    //     hideProgressBar: false,
    //     closeOnClick: true,
    //     pauseOnHover: true,
    //     draggable: true,
    //     progress: undefined,
    //     theme: "dark",
    //     transition: Bounce,
    //   });
    // });

    socket.on("error", (message) => {
      console.log("Received message:", message);

      toast.error(`${message}`, {
        position: "bottom-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
        transition: Bounce,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div>
      <Sidebar />
      <ToastContainer />
    </div>
  );
}

export default App;
