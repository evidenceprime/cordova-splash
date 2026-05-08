var fs = require("fs-extra");
var Q = require("q");
var xml2js = require("xml2js");
var display = require("./display");

var fileName = "platforms/android/app/src/main/res/values/cdv_themes.xml";
var fallbackFileName = "platforms/android/app/src/main/res/values/themes.xml";

var filesToTry = [fileName, fallbackFileName];

function updateTheme() {
  var deferred = Q.defer();

  var targetFileName = filesToTry.find(fs.existsSync);

  if (!targetFileName) {
    display.error("could not find theme file");
    deferred.reject(new Error("could not find theme file"));
    return;
  }

  fs.readFile(targetFileName, function (err, data) {
    if (err) {
      display.error(
        "could not read theme for splash screen (" + targetFileName + ")"
      );
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
      fs.writeFile(targetFileName, xml, "utf-8", function (err) {
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
