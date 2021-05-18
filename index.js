#!/usr/bin/env node

const blacklist = require("./blacklist.json");

const net = require("net");
const fs = require("fs").promises;

const server = net.createServer();

function getHost(data) {
  return data.toString().split("Host: ")[1].split("\r\n")[0];
}

function getURLFromData(data) {
  return data.toString().split("\r\n")[0];
}

const HTTP_DEFAULT_PORT = 80;

server.on("connection", (clientToProxySocket) => {
  // We need only the data once, the starting packet
  const urls = [];
  clientToProxySocket.on("data", (data) => urls.push(getURLFromData(data)));
  clientToProxySocket.once("data", async (data) => {
    const serverAddressWithPort = getHost(data);
    const serverAddress = serverAddressWithPort.replace(/:.*/, "");
    const port =
      Number(serverAddressWithPort.split(":")[1]) || HTTP_DEFAULT_PORT;
    if (!blacklist.includes(serverAddress)) {
      const proxyToServerSocket = net.createConnection(
        {
          host: serverAddress,
          port: port,
        },
        () => {
          data = data.toString().replace(/(?<=^GET )http:\/\/[^/]*/, "");
          proxyToServerSocket.write(data);

          clientToProxySocket.pipe(proxyToServerSocket);
          proxyToServerSocket.pipe(clientToProxySocket);
        },
      );
      proxyToServerSocket.on("data", (data) => {
        const responseStatus = data.toString("ASCII").split("\r\n")[0];
        fs.appendFile("./log.txt", `URL: ${urls.pop()}\n${responseStatus}\n`);
      });
    } else {
      fs.appendFile(
        "./log.txt",
        `URL: ${serverAddress}\nHTTP/1.0 403 Forbidden\n`,
      );
      const denyHTML = await fs.readFile("./denied.html");
      clientToProxySocket.write("HTTP/1.0 403 Forbidden\r\n" + "\r\n");
      clientToProxySocket.write(denyHTML);
      clientToProxySocket.end();
    }
  });
});

server.listen(8080, () => {
  console.log("Server runnig at http://localhost:" + 8080);
});
