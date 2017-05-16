/* global require, module */
const path = require("path");
const webpack = require("webpack");

const ExtractTextPlugin = require("extract-text-webpack-plugin");

const js_dir = path.join(__dirname, "src", "main", "resources", "static", "js");

module.exports = {
    context: js_dir,
    entry: {
        "styles-bundle": [ "./styles" ]
    },
    output: {
        path: js_dir,
        publicPath: "",
        filename: "[name].js"
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ExtractTextPlugin.extract({
                    use: "css-loader"
                })
            },
            {
                test:/\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: "url-loader"
            },
            {
                test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: "url-loader"
            },
            {
                test: /\.(jpe?g|png|gif)$/,
                loader: "url-loader"
            }
        ]
    },
    plugins: [
        new ExtractTextPlugin({ filename: path.join("..", "css", "dm.css") })
    ]
};
