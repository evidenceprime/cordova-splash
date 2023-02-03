var fs = require("fs-extra");
var Q = require("q");
var xml2js = require("xml2js");
var display = require("./display");

var fileName = "platforms/android/app/src/main/res/values/themes.xml";

function updateTheme() {
  var deferred = Q.defer();

  fs.readFile(fileName, function (err, data) {
    if (err) {
      display.error("could not read theme for splash screen");
      deferred.reject(err);
      return;
    }
    var parser = new xml2js.Parser();
    parser.parseString(data, function (err, result) {
      if (err) {
        display.error("could not parse theme for splash screen");
        deferred.reject(err);
        return;
      }
      result.resources.style[0].item = result.resources.style[0].item.map(
        function (element) {
          if (element.$.name === "windowSplashScreenAnimatedIcon") {
            element._ = "@drawable/screen";
          }
          return element;
        }
      );
      var builder = new xml2js.Builder();
      var xml = builder.buildObject(result);
      fs.writeFile(fileName, xml, "utf-8", function (err) {
        if (err) {
          display.error("could not write theme for splash screen");
          deferred.reject(err);
          return;
        }
        display.success("updated theme for splash screen");
        deferred.resolve();
      });
    });
  });

  return deferred.promise;
}

module.exports = updateTheme;
