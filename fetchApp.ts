import http from "http";

http.get("http://localhost:3000", (res) => {
  let data = "";
  res.on("data", (chunk) => data += chunk);
  res.on("end", () => console.log("Status:", res.statusCode, "\\n", data.substring(0, 1000)));
}).on("error", (err) => console.log("Error:", err.message));
