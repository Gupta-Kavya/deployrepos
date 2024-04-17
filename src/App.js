import "./App.css";
import Sidebar from "./components/Sidebar";
import { useEffect } from "react";
import { ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";

function App() {
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    // Get the value of the 'accessToken' parameter
    const accessTokenParam = searchParams.get("accessToken");
    const userName = searchParams.get("userName");
    const jwtToken = searchParams.get("jwtToken");

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
      const decodedToken = jwtDecode(localStorage.getItem("token"));
      if (
        decodedToken.accessToken === localStorage.getItem("accessToken") &&
        decodedToken.userName === localStorage.getItem("userName")
      ) {
      } else {
        window.location = `${process.env.REACT_APP_FRONTEND_URI}/login`;
      }
    } else {
      window.location = `${process.env.REACT_APP_FRONTEND_URI}/login`;
    }

  }, []);

  return (
    <div>
      <Sidebar />
      <ToastContainer />
    </div>
  );
}

export default App;
