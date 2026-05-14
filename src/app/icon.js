import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a1a1a 0%, #000000 100%)",
          borderRadius: 7,
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9.5 22.5V9.5H17.2c1.55 0 2.85.5 3.9 1.5 1.05 1 1.575 2.225 1.575 3.675 0 1.183-.35 2.225-1.05 3.125-.7.9-1.617 1.508-2.75 1.825L23.5 22.5h-3.05l-4.275-2.625H12.3V22.5H9.5Zm2.8-5.075h4.825c.85 0 1.554-.258 2.113-.775.558-.517.837-1.183.837-2 0-.833-.279-1.504-.837-2.012-.559-.508-1.263-.763-2.113-.763H12.3v5.55Z"
            fill="#fafafa"
          />
        </svg>
      </div>
    ),
    size
  );
}
