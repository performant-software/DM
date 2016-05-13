var path = require("path");
var webpack = require("webpack");

var ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
    context: __dirname + "/src/main/resources/static/js",
    entry: {
        "styles": [
            "../bootstrap/css/bootstrap.css",
            "../fineuploader/css/fineuploader.css",
            "../css/base.css",
            "./closure-library/closure/goog/css/combobox.css",
            "./closure-library/closure/goog/css/autocomplete.css",
            "./closure-library/closure/goog/css/button.css",
            "./closure-library/closure/goog/css/dialog.css",
            "./closure-library/closure/goog/css/linkbutton.css",
            "./closure-library/closure/goog/css/menu.css",
            "./closure-library/closure/goog/css/menuitem.css",
            "./closure-library/closure/goog/css/menuseparator.css",
            "./closure-library/closure/goog/css/tab.css",
            "./closure-library/closure/goog/css/tabbar.css",
            "./closure-library/closure/goog/css/toolbar.css",
            "./closure-library/closure/goog/css/colormenubutton.css",
            "./closure-library/closure/goog/css/custombutton.css",
            "./closure-library/closure/goog/css/palette.css",
            "./closure-library/closure/goog/css/colorpalette.css",
            "./closure-library/closure/goog/css/common.css",
            "./closure-library/closure/goog/css/editor/bubble.css",
            "./closure-library/closure/goog/css/editor/dialog.css",
            "./closure-library/closure/goog/css/editor/linkdialog.css",
            "./closure-library/closure/goog/css/editortoolbar.css",
            "./closure-library/closure/goog/css/datepicker.css",  /* is this used ? */
            "../css/goog/editortoolbar.css",
            "../css/jquery/jquery-ui-1.10.3.custom.css",
            "../css/jquery/blue.monday/jplayer.blue.monday.css",
            "../css/atb/atb.css",
            "../css/atb/bezel.css",
            "../css/atb/editor.css",
            "../css/atb/editorframe.css",
            "../css/atb/markereditor.css",
            "../css/atb/resourceviewer.css",   /* TODO: clean this up soon */
            "../css/atb/verticaltoolbar.css",
            "../css/atb/preferences.css",
            "../css/atb/annoTitlesList.css",
            "../css/atb/viewer.css",
            "../css/atb/viewerthumbnailtimeline.css",
            "../css/atb/clientapp.css",
            "../css/atb/workingresources.css",
            //"atb/repositorybrowser.css",
            //"atb/breadcrumbs.css",
            "../css/atb/radialmenu.css",
            "../css/atb/grid.css",
            "../css/atb/audioviewer.css",
            "../css/sc/BreadCrumbs.css",
            "../css/sc/RepoBrowser.css",
            "../css/sc/CanvasViewer.css",
            "../css/sc/ProjectViewer.css",
            "../css/sc/SearchViewer.css",
            "../css/atb.css",
            "../css/themes/dark/theme.css",
            "../css/dm/workspace.css"
        ]
    },
    output: {
        path: __dirname + "/src/main/resources/static",
        publicPath: "",
        filename: "[name].js"
    },
    module: {
        loaders: [
            { test: /\.css$/, loader: ExtractTextPlugin.extract("css") },
            { test:/\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "url-loader" },
            { test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "url-loader" },
            { test: /\.(jpe?g|png|gif)$/, loader: "url-loader" }
        ]
    },
    plugins: [
        new ExtractTextPlugin("css/dm.css"),
        new webpack.DefinePlugin({
            "process.env": {
                NODE_ENV: JSON.stringify("production")
            }
        }),
        new webpack.optimize.OccurenceOrderPlugin(),
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.UglifyJsPlugin()
    ]
};
