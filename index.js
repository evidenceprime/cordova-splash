var fs = require("fs-extra");
var path = require("path");
var xml2js = require("xml2js");
var ig = require("imagemagick");
var _ = require("underscore");
var Q = require("q");
var argv = require("minimist")(process.argv.slice(2));
var iosUpdateContentsJson = require("./ios_cordova_contents_override");
var androidRemoveCordovaSplash = require("./android_remove_cordova_splash");
var androidUpdateTheme = require("./android_update_theme");
var display = require("./display");

/**
 * @var {Object} settings - names of the config file and of the splash image
 */
var settings = {};
settings.CONFIG_FILE = argv.config || "config.xml";
settings.SPLASH_FILE = argv.splash || "splash.png";

/**
 * Check which platforms are added to the project and return their splash screen names and sizes
 *
 * @param  {String} projectName
 * @return {Promise} resolves with an array of platforms
 */
var getPlatforms = function (projectName) {
  var deferred = Q.defer();
  var platforms = [];
  var xcodeFolder = "/Images.xcassets/LaunchStoryboard.imageset/";

  platforms.push({
    name: "ios",
    // TODO: use async fs.exists
    isAdded: fs.existsSync("platforms/ios"),
    splashPath: "platforms/ios/" + projectName + xcodeFolder,
    splash: [
      // universal
      { name: "Default@1x~universal.png", width: 1366, height: 1366 },
      { name: "Default@2x~universal.png", width: 2732, height: 2732 },
      { name: "Default@3x~universal.png", width: 4098, height: 4098 },
    ],
    extraTask: function () {
      return iosUpdateContentsJson(projectName);
    },
  });
  platforms.push({
    name: "android",
    isAdded: fs.existsSync("platforms/android"),
    splashPath: "platforms/android/app/src/main/res/",
    splash: [
      // Default
      { name: "drawable-ldpi/screen.png", width: 180, height: 180 },
      { name: "drawable-mdpi/screen.png", width: 240, height: 240 },
      { name: "drawable-hdpi/screen.png", width: 360, height: 360 },
      { name: "drawable-xhdpi/screen.png", width: 480, height: 480 },
      { name: "drawable-xxhdpi/screen.png", width: 720, height: 720 },
      { name: "drawable-xxxhdpi/screen.png", width: 960, height: 960 },
    ],
    extraTask: function () {
      return Q.all([androidRemoveCordovaSplash(), androidUpdateTheme()]);
    },
  });
  platforms.push({
    name: "windows",
    isAdded: fs.existsSync("platforms/windows"),
    splashPath: "platforms/windows/images/",
    splash: [
      // Landscape
      { name: "SplashScreen.scale-100.png", width: 620, height: 300 },
      { name: "SplashScreen.scale-125.png", width: 775, height: 375 },
      { name: "SplashScreen.scale-140.png", width: 868, height: 420 },
      { name: "SplashScreen.scale-150.png", width: 930, height: 450 },
      { name: "SplashScreen.scale-180.png", width: 1116, height: 540 },
      { name: "SplashScreen.scale-200.png", width: 1240, height: 600 },
      { name: "SplashScreen.scale-400.png", width: 2480, height: 1200 },
      // Portrait
      { name: "SplashScreenPhone.scale-240.png", width: 1152, height: 1920 },
      { name: "SplashScreenPhone.scale-140.png", width: 672, height: 1120 },
      { name: "SplashScreenPhone.scale-100.png", width: 480, height: 800 },
    ],
  });
  deferred.resolve(platforms);
  return deferred.promise;
};

/**
 * read the config file and get the project name
 *
 * @return {Promise} resolves to a string - the project's name
 */
var getProjectName = function () {
  var deferred = Q.defer();
  var parser = new xml2js.Parser();
  fs.readFile(settings.CONFIG_FILE, function (err, data) {
    if (err) {
      deferred.reject(err);
      return;
    }
    parser.parseString(data, function (err, result) {
      if (err) {
        deferred.reject(err);
      }
      var projectName = result.widget.name[0];
      deferred.resolve(projectName);
    });
  });
  return deferred.promise;
};

/**
 * Crops and creates a new splash in the platform's folder.
 *
 * @param  {Object} platform
 * @param  {Object} splash
 * @return {Promise}
 */
var generateSplash = function (platform, splash) {
  var deferred = Q.defer();
  var srcPath = settings.SPLASH_FILE;
  var platformPath = srcPath.replace(/\.png$/, "-" + platform.name + ".png");
  if (fs.existsSync(platformPath)) {
    srcPath = platformPath;
  }
  var dstPath = platform.splashPath + splash.name;
  var dst = path.dirname(dstPath);
  if (!fs.existsSync(dst)) {
    fs.mkdirsSync(dst);
  }
  ig.crop(
    {
      srcPath: srcPath,
      dstPath: dstPath,
      quality: 1,
      format: "png",
      width: splash.width,
      height: splash.height,
    },
    function (err, stdout, stderr) {
      if (err) {
        deferred.reject(err);
      } else {
        deferred.resolve();
        display.success(splash.name + " created");
      }
    }
  );
  return deferred.promise;
};

/**
 * Generates splash based on the platform object
 *
 * @param  {Object} platform
 * @return {Promise}
 */
var generateSplashForPlatform = function (platform) {
  var deferred = Q.defer();
  display.header("Generating splash screen for " + platform.name);
  var all = [];
  var splashes = platform.splash;
  splashes.forEach(function (splash) {
    all.push(generateSplash(platform, splash));
  });
  if (platform.extraTask) {
    all.push(platform.extraTask());
  }
  Q.all(all)
    .then(function () {
      deferred.resolve();
    })
    .catch(function (err) {
      console.log(err);
    });
  return deferred.promise;
};

/**
 * Goes over all the platforms and triggers splash screen generation
 *
 * @param  {Array} platforms
 * @return {Promise}
 */
var generateSplashes = function (platforms) {
  var deferred = Q.defer();
  var sequence = Q();
  var all = [];
  _(platforms)
    .where({ isAdded: true })
    .forEach(function (platform) {
      sequence = sequence.then(function () {
        return generateSplashForPlatform(platform);
      });
      all.push(sequence);
    });
  Q.all(all).then(function () {
    deferred.resolve();
  });
  return deferred.promise;
};

/**
 * Checks if at least one platform was added to the project
 *
 * @return {Promise} resolves if at least one platform was found, rejects otherwise
 */
var atLeastOnePlatformFound = function () {
  var deferred = Q.defer();
  getPlatforms().then(function (platforms) {
    var activePlatforms = _(platforms).where({ isAdded: true });
    if (activePlatforms.length > 0) {
      display.success(
        "platforms found: " + _(activePlatforms).pluck("name").join(", ")
      );
      deferred.resolve();
    } else {
      display.error(
        "No cordova platforms found. " +
          "Make sure you are in the root folder of your Cordova project " +
          "and add platforms with 'cordova platform add'"
      );
      deferred.reject();
    }
  });
  return deferred.promise;
};

/**
 * Checks if a valid splash file exists
 *
 * @return {Promise} resolves if exists, rejects otherwise
 */
var validSplashExists = function () {
  var deferred = Q.defer();
  fs.exists(settings.SPLASH_FILE, function (exists) {
    if (exists) {
      display.success(settings.SPLASH_FILE + " exists");
      deferred.resolve();
    } else {
      display.error(settings.SPLASH_FILE + " does not exist");
      deferred.reject();
    }
  });
  return deferred.promise;
};

/**
 * Checks if a config.xml file exists
 *
 * @return {Promise} resolves if exists, rejects otherwise
 */
var configFileExists = function () {
  var deferred = Q.defer();
  fs.exists(settings.CONFIG_FILE, function (exists) {
    if (exists) {
      display.success(settings.CONFIG_FILE + " exists");
      deferred.resolve();
    } else {
      display.error("cordova's " + settings.CONFIG_FILE + " does not exist");
      deferred.reject();
    }
  });
  return deferred.promise;
};

display.header("Checking Project & Splash");

atLeastOnePlatformFound()
  .then(validSplashExists)
  .then(configFileExists)
  .then(getProjectName)
  .then(getPlatforms)
  .then(generateSplashes)
  .catch(function (err) {
    if (err) {
      console.log(err);
    }
  })
  .then(function () {
    console.log("");
  });
