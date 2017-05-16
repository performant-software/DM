/* global require */
const browserSync = require("browser-sync").create();
const webpack = require("webpack");
const webpackDevMiddleware = require("webpack-dev-middleware");
const stripAnsi = require("strip-ansi");
const proxy = require("http-proxy-middleware");

const webpackConfig = require("../webpack.config");
const bundler = webpack(webpackConfig);

bundler.plugin("done", function(stats) {
    if (stats.hasErrors() || stats.hasWarnings()) {
        browserSync.sockets.emit("fullscreen:message", {
            title: "Webpack Error:",
            body: stripAnsi(stats.toString()),
            timeout: 100000
        });
    }
    browserSync.reload();
});

browserSync.init({
    server: {
        baseDir: "src/main/resources",
        directory: true,
        middleware: [
            proxy(["**", '!/static/**'], {target: "http://localhost:8080"}),
            webpackDevMiddleware(bundler, {
                publicPath: "/static/js",
                stats: { colors: true }
            })
        ]
    },
    files: ["src/main/resources/static"],
    plugins: ["bs-fullscreen-message"]
});
