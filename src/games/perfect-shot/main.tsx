import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { TargetGallery } from "./dev/TargetGallery";

const gallery = new URLSearchParams(location.search).has("roda");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {gallery ? <TargetGallery /> : <App />}
  </StrictMode>
);
