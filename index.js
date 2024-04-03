const http = require("node:http");
const { exec } = require("node:child_process");

const runBuild = () => {
  return new Promise((res, rej) => {
    exec("./build", (err, stdout, stderr) => {
      if (err) {
        rej(stdout);
        return;
      }

      res(stdout);
      console.log(stdout);
    });
  });
};

const buildRouteHandler = async (req, res) => {
  try {
    const result = await runBuild();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ response: result }));
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
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ response: "Not Found" }));
}

const createChainLink = (handler, next) => {
  return async (req, res) => {
    await handler(req, res, next);
  };
};

const createChain = (routes) => {
  return routes.reduceRight((next, route) => {
    return createChainLink(route, next);
  });
}

const server = http.createServer(async (req, res) => {
  const chain = createChain([buildRoute, notFoundRoute]);
  await chain(req, res);
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
