var fs = require("fs-extra");
var Q = require("q");
var display = require("./display");

var scales = ["1x", "2x", "3x"];

function getPath(projectName) {
  return (
    "platforms/ios/" +
    projectName +
    "/Images.xcassets/LaunchStoryboard.imageset/Contents.json"
  );
}

function updateContentsJson(projectName) {
  var deferred = Q.defer();
  var path = getPath(projectName);

  fs.readJson(path, function (err, contents) {
    if (err) {
      display.error("error during Contents.json for iOS update");
      deferred.reject(err);
      return;
    }

    contents.images = scales.map(function (scale) {
      return {
        scale: scale,
        idiom: "universal",
        filename: "Default@" + scale + "~universal.png",
      };
    });

    fs.writeJson(path, contents, { spaces: 2 }, function (err) {
      if (err) {
        display.error("error during Contents.json for iOS update");
        deferred.reject(err);
        return;
      }
      display.success("updated Contents.json for iOS");
      deferred.resolve();
    });
  });

  return deferred.promise;
}

module.exports = updateContentsJson;
