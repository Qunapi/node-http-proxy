const forever = require("forever");

const child = new forever.Forever("index.js", {
  max: 3,
  silent: true,
  args: [],
});

child.on("exit", () => {});
child.start();
