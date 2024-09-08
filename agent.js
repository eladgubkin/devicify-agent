const cron = require("node-cron");
const WebSocket = require("ws");
const { runScripts } = require("./scriptRunner");

// Configuration
const SERVER_URL = "wss://your-server-url.com";
const SCAN_INTERVAL = "0 * * * * *"; // Run every 5 seconds

let ws;

// Function to connect WebSocket
function connectWebSocket() {
  ws = new WebSocket(SERVER_URL);

  ws.on("open", () => {
    console.log("WebSocket connection established");
  });

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    if (data.command === "runScan") {
      console.log("Received command to run scan immediately");
      performScan();
    }
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed. Reconnecting...");
    setTimeout(connectWebSocket, 5000);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
}

// Function to perform the scan
async function performScan() {
  console.log("Starting scan...");

  try {
    // Run your scripts and collect results
    const scanResults = await runScripts();

    // Send results to the server
    sendResultsToServer(scanResults);

    console.log("Scan completed successfully");
  } catch (error) {
    console.error("Error during scan:", error);
  }
}

// Function to send results to the server
function sendResultsToServer(results) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "scanResults", data: results }));
    console.log("Results sent to server");
  } else {
    console.error("WebSocket is not open. Cannot send results.");
  }
}

// Connect to WebSocket
connectWebSocket();

// Schedule the scan to run every 5 seconds
cron.schedule(SCAN_INTERVAL, performScan);

console.log("Agent started. Scans will run every 5 seconds and on demand.");
