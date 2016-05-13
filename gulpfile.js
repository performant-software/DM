var gulp = require("gulp");
var gutil = require("gulp-util");
var webpack = require("webpack");

gulp.task("default", ["build"]);
gulp.task("build", ["webpack"]);
gulp.task("clean", []);

gulp.task("webpack", function (callback) {
    webpack(require("./webpack.config"), function(err, stats) {
        if (err) throw new gutil.PluginError("webpack", err);
        gutil.log("[webpack]", stats.toString());
        callback();
    });
});