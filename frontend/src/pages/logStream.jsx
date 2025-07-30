import { createParser } from "eventsource-parser";
import { useEffect, useState } from "react";

const LogStreamer = ({ logFile, setIsDisabled }) => {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("");

  const startStream = async () => {
    setIsDisabled(true); // Set running to true when stream starts

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/stream-logs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logFile),
      }
    );

    if (!response.ok) {
      setStatus("Failed to connect to log stream.");
      setIsDisabled(false); // Stop running if connection fails
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    const parser = createParser({
      onEvent: (event) => {
        if (event) {
          if (event.event === "log" || event.event === undefined) {
            setLogs((prev) => [...prev, event.data]);
          } else if (event.event === "done") {
            setStatus(event.data);
            setIsDisabled(false); // Set running to false when stream ends
          }
        }
      },
    });

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value));
      }
    } finally {
      setIsDisabled(false); // Ensure running is false on any exit
    }
  };

  useEffect(() => {
    if (logFile) startStream();
    // eslint-disable-next-line
  }, [logFile]);

  return (
    <div>
      <h2 className="font-bold mb-4">Log Streams</h2>
      <div
        style={{
          background: "rgb(112 152 230)",
          color: "white",
          padding: "20px",
          height: "300px",
          overflowY: "scroll",
        }}
      >
        {logs.map((line, index) => (
          <div key={index} className="text-left">
            {line}
          </div>
        ))}
      </div>
      {status && (
        <p>
          <strong>Status:</strong> {status}
        </p>
      )}
    </div>
  );
};

export default LogStreamer;