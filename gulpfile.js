var fs = require("fs");
var path = require("path");
var child_process = require("child_process");

var gulp = require("gulp");
var gutil = require("gulp-util");
var webpack = require("webpack");

gulp.task("default", ["build"]);
gulp.task("build", ["webpack", "google-closure-compile"]);
gulp.task("clean", []);

function closureCompile(cmd, targetFile, callback) {
    child_process.exec(
        [ "python" ].concat(cmd).join(" "),
        { cwd: "src/main/resources/static/js", maxBuffer: 10485760 },
        function(err, stdout, stderr) {
            if (err) {
                callback(err);
                return;
            }
            fs.writeFile(
                path.join("src/main/resources/static/js", targetFile), stdout,
                { mode: parseInt("644", 8) }, callback
            );
        }
    );
}

gulp.task("google-closure-deps", function(callback) {
    closureCompile([
        "closure-library/closure/bin/build/depswriter.py",
        "--root_with_prefix=\"atb ../../../atb/\"",
        "--root_with_prefix=\"jquery ../../../jquery\"",
        "--root_with_prefix=\"sc ../../../sc\"",
        "--root_with_prefix=\"fabric ../../../fabric\"",
        "--root_with_prefix=\"n3 ../../../n3\""
    ], "atb-deps.js", callback);
});

gulp.task("google-closure-compile", ["google-closure-deps"], function(callback) {
    closureCompile([
        "closure-library/closure/bin/build/closurebuilder.py",
        "--root=.",
        "--input=\"dm/fluid_workspace.js\"",
        "--output_mode=compiled",
        "--compiler_jar=compiler.jar",
        "--compiler_flags=\"--language_in=ECMASCRIPT5\""
    ], "all-js-code.js", callback);
});

gulp.task("webpack", function (callback) {
    webpack(require("./webpack.config"), function(err, stats) {
        if (err) throw new gutil.PluginError("webpack", err);
        gutil.log("[webpack]", stats.toString());

        // webpack wants to generate a JS resource, which is empty in our case
        fs.unlink("src/main/resources/static/styles.js", callback);
    });
});