const http = require("node:http");
const { spawn } = require("node:child_process");
const { pipeline } = require("node:stream").promises;
const { Transform, PassThrough } = require("node:stream");

function logRequest(req, res, next) {
  const date = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const userAgent = req.headers["user-agent"];

  const coloredDate = "\x1b[36m" + date + "\x1b[0m"; // Cyan
  const coloredMethod = "\x1b[35m" + method + "\x1b[0m"; // Magenta
  const coloredUrl = "\x1b[33m" + url + "\x1b[0m"; // Yellow

  const coloredUserAgent = "\x1b[34m" + userAgent + "\x1b[0m"; // Blue

  const logMessage = `${coloredDate} - ${coloredMethod} ${coloredUrl} ${coloredUserAgent}`;

  console.log(logMessage);

  next(req, res, next);
}

const runBuild = async (res) => {
  const cp = spawn("./build");

  console.log("Server: Build started");

  await pipeline(
    cp.stdout,
    new PassThrough({
      transform(chunk, encoding, callback) {
        console.log(`stdout: ${chunk}`);
        this.push(chunk.toString().toUpperCase());
        callback();
      },
    }),
    res,
  );

  console.log("Server: Build complete");
};

const buildRouteHandler = async (req, res) => {
  try {
    const result = await runBuild(res);
    // res.writeHead(200, { "Content-Type": "application/json" });
    // res.end(JSON.stringify({ response: result }));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ response: err }));
  }
};

const buildRoute = async (req, res, next) => {
  if (req.method === "POST" && req.url.startsWith("/build")) {
    await buildRouteHandler(req, res);
    return;
  }

  next(req, res);
};

const notFoundRoute = (req, res) => {
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
};

const createChainLink = (handler, next) => {
  return async (req, res) => {
    await handler(req, res, next);
  };
};

const createChain = (routes) => {
  return routes.reduceRight((next, route) => {
    return createChainLink(route, next);
  });
};

const chain = createChain([logRequest, buildRoute, notFoundRoute]);

const server = http.createServer(async (req, res) => {
  await chain(req, res);
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
