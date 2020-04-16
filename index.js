#!/usr/bin/env node

const blacklist = require("/home/qunapi/ksis/lab4/blacklist.json");

const net = require("net");
const fs = require("fs").promises;

const server = net.createServer();

function getHost(data) {
  return data.toString().split("Host: ")[1].split("\r\n")[0];
}

function getURLFromData(data) {
  return data.toString().split("\r\n")[0];
}

server.on("connection", (clientToProxySocket) => {
  // We need only the data once, the starting packet
  const urls = [];
  clientToProxySocket.on("data", (data) => urls.push(getURLFromData(data)));
  clientToProxySocket.once("data", async (data) => {
    const HTTP_DEFAULT_PORT = 80;
    const serverAddress = getHost(data);

    if (!blacklist.includes(serverAddress)) {
      console.log(serverAddress);
      const proxyToServerSocket = net.createConnection(
        {
          host: serverAddress,
          port: HTTP_DEFAULT_PORT,
        },
        () => {
          proxyToServerSocket.write(data);

          clientToProxySocket.pipe(proxyToServerSocket);
          proxyToServerSocket.pipe(clientToProxySocket);

          clientToProxySocket.on("error", () => {
            proxyToServerSocket.end();
          });
          clientToProxySocket.on("end", () => {
            proxyToServerSocket.end();
          });
        },
      );
      proxyToServerSocket.on("data", (data) => {
        const responseStatus = data.toString("ASCII").split("\r\n")[0];
        fs.appendFile(
          "/home/qunapi/ksis/lab4/log.txt",
          `URL: ${urls.pop()}\n${responseStatus}\n`,
        );
      });
      proxyToServerSocket.on("error", () => {
        clientToProxySocket.end();
      });
      proxyToServerSocket.on("end", () => {
        clientToProxySocket.end();
      });
    } else {
      fs.appendFile(
        "/home/qunapi/ksis/lab4/log.txt",
        `URL: ${serverAddress}\nHTTP/1.0 403 Forbidden\n`,
      );
      const denyHTML = await fs.readFile("/home/qunapi/ksis/lab4/denied.html");
      clientToProxySocket.write("HTTP/1.0 403 Forbidden\r\n" + "\r\n");
      clientToProxySocket.write(denyHTML);
      clientToProxySocket.end();
    }
  });
});

server.listen(8080, () => {
  console.log("Server runnig at http://localhost:" + 8080);
});
