import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { toast, Bounce } from "react-toastify";
import DOMPurify from "dompurify";
import { useWindowSize } from "@uidotdev/usehooks";
import Confetti from "react-confetti";

const ImportProject = () => {
  const [gitUrl, setGitUrl] = useState("");
  const [projectname, setProjectname] = useState("");
  const [rootPath, setrootPath] = useState("");
  const [framework, setFramework] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [logMessages, setLogMessages] = useState([]);
  const [addtoqueloader, setAddtoqueLoader] = useState(undefined);
  const [projectbuildloader, setProjectBuildLoader] = useState(undefined);
  const [deploymentloader, setDeploymentLoader] = useState(undefined);
  const [processsection, setProcesssection] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [logsmodal, setLogsmodal] = useState(false);
  const [buildlogsbtn, setBuildlogsbtn] = useState(false);
  const buildLogsRef = useRef(null);

  useEffect(() => {
    const socket = io(`${process.env.REACT_APP_BACKEND_URI}`, {
      // Pass the existing socket ID if available
      query: localStorage.getItem("socketId"),
    });

    socket.on("connect", () => {
      console.log("Socket connected");
      // Ensure the socket has an ID assigned
      if (!socket.id) {
        console.error("Socket ID is missing");
        return;
      }
      console.log("Socket ID is " + socket.id);

      // Store the socket ID in localStorage if it's not present
      if (!localStorage.getItem("socketId")) {
        localStorage.setItem("socketId", socket.id);
      }
    });

    const scrollToBottom = () => {
      if (buildLogsRef.current) {
        buildLogsRef.current.scrollTop = buildLogsRef.current.scrollHeight;
      }
    };

    // Scroll to bottom on initial render and whenever logMessages change
    scrollToBottom();

    const searchParams = new URLSearchParams(window.location.search);
    const gitUrl = DOMPurify.sanitize(searchParams.get("gitUrl"));

    const splittedUrl = gitUrl.split("/");
    const gitProjectName = splittedUrl[splittedUrl.length - 1];
    const projectName = gitProjectName.split(".")[0];

    if (gitUrl && projectName) {
      setGitUrl(gitUrl);
      setProjectname(projectName);
      localStorage.setItem("gitUrl", gitUrl);
      localStorage.setItem("projectName", projectName);
    } else if (
      localStorage.getItem("gitUrl") &&
      localStorage.getItem("projectName")
    ) {
      setGitUrl(localStorage.getItem("gitUrl"));
      setProjectname(localStorage.getItem("projectName"));
    } else {
      window.location = `${process.env.REACT_APP_FRONTEND_URI}`;
    }

    socket.on("status-update", (message) => {
      console.log("Received message:", message);

      if (message === "Added To Que") {
        setAddtoqueLoader(false);
      }

      if (message === "Project Build Started") {
        setProjectBuildLoader(true);
        setBuildlogsbtn(true);

        // setLogsmodal(true)
      }

      if (message === "Build Completed") {
        setProjectBuildLoader(false);
        setBuildlogsbtn(true);
      }

      if (message === "Deployment Started") {
        setDeploymentLoader(true);
        setBuildlogsbtn(true);
      }

      if (message === "Deployment Successfull") {
        setDeploymentLoader(false);
        setBuildlogsbtn(true);
        socket.disconnect();
        localStorage.removeItem("socketId");


        setTimeout(() => {
          setProcesssection(false);
          setLogsmodal(false);
          openModal();
        }, 1000);
      }
    });

    socket.on("error", (message) => {
      console.log("Received message:", message);

        // console.log("Received message:", message);
  
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
  

      // setProcesssection(false);
      setProjectBuildLoader(undefined);
      setBuildlogsbtn(true);
    });

    socket.on("build-log", (message) => {
      appendLogMessage({ text: message, type: "status" });
    });

    socket.on("build-error", (message) => {
      appendLogMessage({ text: message, type: "error" });
    });

    // return () => {
    //   socket.disconnect();
    // };
  }, [logMessages]);

  const appendLogMessage = (message) => {
    setLogMessages((prevMessages) => [...prevMessages, message]);
  };

  const sendRequestFoRBuild = async (gitUrl) => {
    window.addEventListener("beforeunload", function (e) {
      // Cancel the event
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = "";
      // Display a warning message
      return "Are you sure you want to reload this page? All unsaved changes will be lost.";
    });

    setIsDeploying(true);

    setTimeout(async () => {
      setAddtoqueLoader(true);
      setProcesssection(true);
      try {
        const socketId = localStorage.getItem("socketId"); // Get the socket ID from local storage
        const gitUrlObject = {
          gitUrl: gitUrl,
          rootPath: rootPath,
          framework: framework,
          userName: localStorage.getItem("userName"),
          accessToken: localStorage.getItem("accessToken"),
          projectName: projectname,
          socketId: socketId, // Pass the socket ID to the backend
        };
        const requestBody = JSON.stringify(gitUrlObject);

        let res = await fetch(
          `${process.env.REACT_APP_BACKEND_URI}/cloneProject`,
          {
            mode: "cors",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: requestBody,
          }
        );

        if (!res.ok) {
          throw new Error("Failed to fetch");
        }

        let resJson = await res.json();
        localStorage.setItem("buildId", resJson.id);
        setIsDeploying(false);
      } catch (error) {
        console.error("Error:", error);
      }
    }, 2000);
  };

  const openModal = () => {
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  const copyToClipboard = () => {
    const textField = document.createElement("textarea");
    textField.innerText = `http://${localStorage.getItem("buildId")}.${
      process.env.REACT_APP_SERVE_URI
    }/`;
    document.body.appendChild(textField);
    textField.select();
    document.execCommand("copy");
    textField.remove();

    toast.success("Link Copied To Clipboard", {
      position: "top-center",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "dark",
      transition: Bounce,
    });
  };

  const { width, height } = useWindowSize();

  return (
    <div>
      {isOpen && <Confetti width={width} height={height} />}

      <div className="p-4 sm:ml-64">
        <div className="block p-6 bg-white border rounded-lg deploy-main-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendRequestFoRBuild(gitUrl);
            }}
          >
            <div>
              <label
                htmlFor="project_name"
                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
              >
                Project Name
              </label>
              <input
                type="text"
                id="project_name"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-gray-500 focus:border-gray-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-gray-500 dark:focus:border-gray-500"
                placeholder="my-project"
                value={projectname}
                required
                readOnly
                disabled={true}
              />
            </div>

            <div className="mt-3">
              <label
                htmlFor="project_framework"
                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
              >
                Project Framework
              </label>
              <select
                id="project_framework"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-gray-500 focus:border-gray-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-gray-500 dark:focus:border-gray-500"
                required
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
              >
                <option value="" disabled defaultValue>
                  Select Framework
                </option>
                <option value="react">React</option>
                {/* Add more options as needed */}
              </select>
            </div>
            <label
              htmlFor="input-group-1"
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white mt-3"
            >
              Root Directory
            </label>
            <div className="relative mb-6">
              <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
                ./
              </div>
              <input
                type="text"
                id="input-group-1"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="frontend"
                value={rootPath}
                onChange={(e) => setrootPath(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700 mt-3 w-full flex items-center justify-center"
              disabled={
                addtoqueloader === true ||
                deploymentloader === true ||
                projectbuildloader === true
                  ? true
                  : false
              }
            >
              Deploy your Repository
              <div
                role="status"
                className="ml-3"
                style={{ display: `${isDeploying === false ? "none" : ""}` }}
              >
                <svg
                  aria-hidden="true"
                  className="w-4 h-4 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                  viewBox="0 0 100 101"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                    fill="currentColor"
                  />
                  <path
                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                    fill="currentFill"
                  />
                </svg>
                <span className="sr-only">Loading...</span>
              </div>
            </button>
          </form>
        </div>

        {processsection && (
          <div className="block p-6 bg-white border rounded-lg deploy-main-card mt-3">
            <div className="p-3 bg-white border border-gray-200 rounded-lg shadow  dark:bg-gray-800 dark:border-gray-700 mt-3 w-full flex justify-between items-center">
              <p className="text-sm font-semibold">Project Added To Que</p>

              <div className="indicator">
                <button
                  disabled
                  type="button"
                  className="py-2.5 px-5 text-sm font-medium text-gray-900 bg-white rounded-lg border border-gray-200 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 inline-flex items-center cursor-pointer"
                >
                  <svg
                    aria-hidden="true"
                    role="status"
                    className="inline w-4 h-4 text-gray-200 animate-spin dark:text-gray-600 process_ongoing"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      display: `${addtoqueloader === true ? "" : "none"}`,
                    }}
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                      fill="currentColor"
                    />
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                      fill="#1C64F2"
                    />
                  </svg>

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="w-4 h-4 text-gray-200 dark:text-gray-600 process_done"
                    style={{
                      display: `${addtoqueloader === false ? "" : "none"}`,
                    }}
                  >
                    <circle cx="12" cy="12" r="11" fill="#4CAF50" />
                    <path
                      fill="#FFFFFF"
                      d="M9.7 16.3c-.1 0-.3-.1-.4-.2l-4-4c-.2-.2-.2-.5 0-.7s.5-.2.7 0l3.3 3.3 7.6-7.6c.2-.2.5-.2.7 0s.2.5 0 .7l-8 8c-.1.1-.2.2-.3.2z"
                    />
                  </svg>

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 512 512"
                    className="w-4 h-4 text-gray-200 dark:text-gray-600"
                    style={{
                      display: `${addtoqueloader === undefined ? "" : "none"}`,
                    }}
                  >
                    <path d="M367.2 412.5L99.5 144.8C77.1 176.1 64 214.5 64 256c0 106 86 192 192 192c41.5 0 79.9-13.1 111.2-35.5zm45.3-45.3C434.9 335.9 448 297.5 448 256c0-106-86-192-192-192c-41.5 0-79.9 13.1-111.2 35.5L412.5 367.2zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="block p-3 bg-white border border-gray-200 rounded-lg shadow  dark:bg-gray-800 dark:border-gray-700 mt-3 w-full">
              <div className="flex justify-between items-center">
                <p className="text-sm font-semibold">Project Build Started</p>

                <div className="indicator">
                  <button
                    disabled
                    type="button"
                    className="py-2.5 px-5 text-sm font-medium text-gray-900 bg-white rounded-lg border border-gray-200 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 inline-flex items-center cursor-pointer"
                  >
                    <svg
                      aria-hidden="true"
                      role="status"
                      className="inline w-4 h-4 text-gray-200 animate-spin dark:text-gray-600 process_ongoing"
                      viewBox="0 0 100 101"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{
                        display: `${projectbuildloader === true ? "" : "none"}`,
                      }}
                    >
                      <path
                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                        fill="currentColor"
                      />
                      <path
                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                        fill="#1C64F2"
                      />
                    </svg>

                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="w-4 h-4 text-gray-200 dark:text-gray-600 process_done"
                      style={{
                        display: `${
                          projectbuildloader === false ? "" : "none"
                        }`,
                      }}
                    >
                      <circle cx="12" cy="12" r="11" fill="#4CAF50" />
                      <path
                        fill="#FFFFFF"
                        d="M9.7 16.3c-.1 0-.3-.1-.4-.2l-4-4c-.2-.2-.2-.5 0-.7s.5-.2.7 0l3.3 3.3 7.6-7.6c.2-.2.5-.2.7 0s.2.5 0 .7l-8 8c-.1.1-.2.2-.3.2z"
                      />
                    </svg>

                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 512 512"
                      className="w-4 h-4 text-gray-200 dark:text-gray-600"
                      style={{
                        display: `${
                          projectbuildloader === undefined ? "" : "none"
                        }`,
                      }}
                    >
                      <path d="M367.2 412.5L99.5 144.8C77.1 176.1 64 214.5 64 256c0 106 86 192 192 192c41.5 0 79.9-13.1 111.2-35.5zm45.3-45.3C434.9 335.9 448 297.5 448 256c0-106-86-192-192-192c-41.5 0-79.9 13.1-111.2 35.5L412.5 367.2zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z" />
                    </svg>
                  </button>
                </div>
              </div>

              {logsmodal && (
                <div
                  id="logs-modal"
                  className="fixed top-0 right-0 left-0 bottom-0 flex justify-center items-center bg-gray-900 bg-opacity-50 z-50"
                >
                  <div className="relative p-4 w-full max-w-3xl max-h-full">
                    <div className="relative bg-white rounded-lg shadow dark:bg-gray-800">
                      <div className="flex items-center justify-between p-4 md:p-5">
                        <h3 className="text-lg text-gray-500 dark:text-gray-400 font-semibold">
                          Logs for your Project Build.
                        </h3>
                        <button
                          type="button"
                          className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm h-8 w-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-700 dark:hover:text-white"
                          data-modal-toggle="course-modal"
                          onClick={() => {
                            setLogsmodal(false);
                          }}
                        >
                          <svg
                            className="w-3 h-3"
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 14 14"
                          >
                            <path
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                            />
                          </svg>
                          <span className="sr-only">Close modal</span>
                        </button>
                      </div>

                      <div className="px-4 pb-4 md:px-5 md:pb-5">
                        <div
                          ref={buildLogsRef}
                          className="bg-black text-white p-3 rounded-lg shadow-sm mt-3 overflow-x-auto max-h-80 overflow-y-scroll scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-100 build-logs"
                        >
                          {logMessages.map((message, index) => (
                            <div
                              key={index}
                              className={`py-1 ${
                                message.type === "error" ? "text-red-500" : ""
                              }`}
                            >
                              <pre className="m-0">
                                <code>{message.text}</code>
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* button foe seeing build logs */}

            {buildlogsbtn && (
              <button
                type="button"
                className="text-white bg-gradient-to-br from-black to-gray-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mt-3"
                onClick={() => {
                  setLogsmodal(true);
                }}
              >
                View Build Logs
              </button>
            )}
            {/* button foe seeing build logs */}

            <div className="p-3 bg-white border border-gray-200 rounded-lg shadow  dark:bg-gray-800 dark:border-gray-700 mt-3 w-full flex justify-between items-center">
              <p className="text-sm font-semibold">Deploying Your Build</p>

              <div className="indicator">
                <button
                  disabled
                  type="button"
                  className="py-2.5 px-5 text-sm font-medium text-gray-900 bg-white rounded-lg border border-gray-200 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 inline-flex items-center cursor-pointer"
                >
                  <svg
                    aria-hidden="true"
                    role="status"
                    className="inline w-4 h-4 text-gray-200 animate-spin dark:text-gray-600 process_ongoing"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      display: `${deploymentloader === true ? "" : "none"}`,
                    }}
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                      fill="currentColor"
                    />
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                      fill="#1C64F2"
                    />
                  </svg>

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="w-4 h-4 text-gray-200 dark:text-gray-600 process_done"
                    style={{
                      display: `${deploymentloader === false ? "" : "none"}`,
                    }}
                  >
                    <circle cx="12" cy="12" r="11" fill="#4CAF50" />
                    <path
                      fill="#FFFFFF"
                      d="M9.7 16.3c-.1 0-.3-.1-.4-.2l-4-4c-.2-.2-.2-.5 0-.7s.5-.2.7 0l3.3 3.3 7.6-7.6c.2-.2.5-.2.7 0s.2.5 0 .7l-8 8c-.1.1-.2.2-.3.2z"
                    />
                  </svg>

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 512 512"
                    className="w-4 h-4 text-gray-200 dark:text-gray-600"
                    style={{
                      display: `${
                        deploymentloader === undefined ? "" : "none"
                      }`,
                    }}
                  >
                    <path d="M367.2 412.5L99.5 144.8C77.1 176.1 64 214.5 64 256c0 106 86 192 192 192c41.5 0 79.9-13.1 111.2-35.5zm45.3-45.3C434.9 335.9 448 297.5 448 256c0-106-86-192-192-192c-41.5 0-79.9 13.1-111.2 35.5L412.5 367.2zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {isOpen && (
          <div
            id="course-modal"
            className="fixed top-0 right-0 left-0 bottom-0 flex justify-center items-center bg-gray-900 bg-opacity-50 z-50"
          >
            <div className="relative p-4 w-full max-w-lg max-h-full">
              <div className="relative bg-white rounded-lg shadow dark:bg-gray-800">
                <div className="flex items-center justify-between p-4 md:p-5">
                  <h3 className="text-lg text-gray-500 dark:text-gray-400">
                    <strong>
                      Congrats!! Project has been deployed successfully.
                    </strong>
                  </h3>
                  <button
                    type="button"
                    className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm h-8 w-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-700 dark:hover:text-white"
                    data-modal-toggle="course-modal"
                    onClick={closeModal}
                  >
                    <svg
                      className="w-3 h-3"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 14 14"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                      />
                    </svg>
                    <span className="sr-only">Close modal</span>
                  </button>
                </div>

                <div className="px-4 pb-4 md:px-5 md:pb-5">
                  <label
                    htmlFor="course-url"
                    className="text-sm font-medium text-gray-900 dark:text-white mb-2 block"
                  >
                    Copy this link to view your project :{" "}
                  </label>
                  <div className="relative mb-4">
                    <input
                      id="course-url"
                      type="text"
                      className="col-span-6 bg-gray-50 border border-gray-300 text-gray-500 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
                      value={`http://${localStorage.getItem(
                        "buildId"
                      )}.${process.env.REACT_APP_SERVE_URI}/`}
                      disabled
                      readOnly
                    />
                    <button
                      onClick={copyToClipboard}
                      className="absolute end-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg p-2 inline-flex items-center justify-center"
                    >
                      <span id="default-icon-course-url">
                        <svg
                          className="w-3.5 h-3.5"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="currentColor"
                          viewBox="0 0 18 20"
                        >
                          <path d="M16 1h-3.278A1.992 1.992 0 0 0 11 0H7a1.993 1.993 0 0 0-1.722 1H2a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2Zm-3 14H5a1 1 0 0 1 0-2h8a1 1 0 0 1 0 2Zm0-4H5a1 1 0 0 1 0-2h8a1 1 0 1 1 0 2Zm0-5H5a1 1 0 0 1 0-2h2V2h4v2h2a1 1 0 1 1 0 2Z" />
                        </svg>
                      </span>
                      <span
                        id="success-icon-course-url"
                        className="hidden inline-flex items-center"
                      >
                        <svg
                          className="w-3.5 h-3.5 text-blue-700 dark:text-blue-500"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 16 12"
                        >
                          <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M1 5.917 5.724 10.5 15 1.5"
                          />
                        </svg>
                      </span>
                    </button>
                    <div
                      id="tooltip-course-url"
                      role="tooltip"
                      className="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700"
                    >
                      <span id="default-tooltip-message-course-url">
                        Copy to clipboard
                      </span>
                      <span
                        id="success-tooltip-message-course-url"
                        className="hidden"
                      >
                        Copied!
                      </span>
                      <div className="tooltip-arrow" data-popper-arrow></div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="py-2.5 px-5 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700"
                    onClick={closeModal}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportProject;
