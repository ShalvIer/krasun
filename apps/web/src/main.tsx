import React from "react";
import ReactDOM from "react-dom/client";
import "mapbox-gl/dist/mapbox-gl.css";
import "./styles/global.css";
import { App } from "./app/App";
import { registerKrasunServiceWorker } from "./services/pwa";

void registerKrasunServiceWorker();

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
