require("colors");

/**
 * @var {Object} console utils
 */
var display = {};
display.success = function (str) {
  str = "✓  ".green + str;
  console.log("  " + str);
};
display.error = function (str) {
  str = "✗  ".red + str;
  console.log("  " + str);
};
display.header = function (str) {
  console.log("");
  console.log(" " + str.cyan.underline);
  console.log("");
};

module.exports = display;
