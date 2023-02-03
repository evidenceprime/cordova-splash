var fs = require("fs-extra");
var Q = require("q");
var display = require("./display");

var fileToRemove =
  "platforms/android/app/src/main/res/drawable/ic_cdv_splashscreen.xml";

function removeCordovaSplash() {
  var deferred = Q.defer();

  fs.exists(fileToRemove, function (exists) {
    if (!exists) {
      display.success("default cordova splash does not exist");
      deferred.resolve();
      return;
    }
    fs.remove(fileToRemove, function (err) {
      if (err) {
        display.error("could not remove default cordova splash");
        deferred.reject(err);
        return;
      }
      display.success("default cordova splash removed");
      deferred.resolve();
    });
  });

  return deferred.promise;
}

module.exports = removeCordovaSplash;
