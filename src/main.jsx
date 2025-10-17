import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

document.body.className = "page-body";

createRoot(document.getElementById("root")).render(<App />);
