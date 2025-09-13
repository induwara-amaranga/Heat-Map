import { useEffect, useRef } from "react";
import { getCachedSVG } from "./svgStore";

export default function ReadOnlySVGPage() {
  const svgContainerRef = useRef(null);

  useEffect(() => {
    const cached = getCachedSVG();
    if (cached && svgContainerRef.current) {
      // Clear previous content
      svgContainerRef.current.innerHTML = "";
      // Append a clone of the cached SVG
      svgContainerRef.current.appendChild(cached.cloneNode(true));
    }
  }, []);

  return (
    <div>
      <h2>Campus Map (Read-Only)</h2>
      {/* This div is where the SVG will appear */}
      <div ref={svgContainerRef} style={{ width: "100%", height: "100%" }}></div>
    </div>
  );
}
