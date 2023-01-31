var fs = require("fs-extra");
var Q = require("q");
var display = require("./display");
var _ = require("underscore");

var scales = ["1x", "2x", "3x"];

function getPath(projectName) {
  return (
    "platforms/ios/" +
    projectName +
    "/Images.xcassets/LaunchStoryboard.imageset/Contents.json"
  );
}

function displayClass(className) {
  return className === "compact" ? "com" : className;
}

function updateContentsJson(projectName) {
  var deferred = Q.defer();
  var path = getPath(projectName);
  display.header("updating Contents.json for iOS...");
  fs.readJson(path, function (err, contents) {
    if (err) {
      deferred.reject(err);
      display.error("error during Contents.json for iOS update");
      return;
    }
    contents.images = [];
    _.each(scales, function (scale) {
      contents.images.push({
        scale: scale,
        idiom: "universal",
        filename: "Default@" + scale + "~universal.png",
      });
    });
    fs.writeJsonSync(path, contents, { spaces: 2 }, function (err) {
      if (err) {
        deferred.reject(err);
        display.error("error during Contents.json for iOS update");
        return;
      }
      display.success("updated Contents.json for iOS");
      deferred.resolve();
    });
  });
  return deferred.promise;
}

module.exports = updateContentsJson;
