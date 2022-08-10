#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import * as Path from "path"
import Asset from "./lib/asset.js"
import chalk from "chalk";
import glob from "glob";
import * as path from "path";
import * as fs from "fs";
import chokidar from "chokidar";
import * as os from "os";
import express from "express";
import getPort, {portNumbers} from "get-port";
import serveIndex from "serve-index";
import * as livereload from "livereload";

const pkg = JSON.parse(readFileSync('./package.json').toString());
const program = new Command();

program.name(pkg.name)
.description(pkg.description)
.version(pkg.version);

program.command('build')
.description('Builds a static site from start.')
.option('-i, --input <path>', 'path to input directory', './src')
.option('-o, --output <path>', 'path to output directory', './dist')
.action((str, options) => {
    build(options.opts().input, options.opts().output);
});

program.command('serve')
.description('Builds & automatically reloads ')
.option('-i, --input <path>', 'path to input directory', './src')
.action(async (str, options) => {

    const opts = options.opts();
    opts.output = fs.mkdtempSync(path.join(os.tmpdir(), pkg.name));

    const source = Path.resolve(opts.input);
    await build(opts.input, opts.output);
    const port = await getPort({port: portNumbers(8080, 8090)});

    serve(opts.output, port);

    // Live-reload
    const liveReloadServer = livereload.createServer();

    chokidar.watch(source).on('change', async (file, event) => {
        await build(opts.input, opts.output);
        await serve(opts.output, port);
        liveReloadServer.refresh(file);
    });

});

function build(input, output){

    state(state.BUILDING);

    return new Promise( async (resolve, reject) => {

        const source = path.resolve(input);
        const destination = path.resolve(output);
        const promises = [];

        fs.rmSync(destination, {recursive: true, force: true});

        glob("**/*", {cwd: source, mark: true}, async function (er, files) {
            for (let file of files) {

                // Skip directories!
                if (file.endsWith('/')) {
                    continue;
                }

                let asset = new Asset(Path.join(source, file), Path.join(destination, file));
                promises.push(asset.getTranscoder().startTranscode());

            }
        });

        setTimeout( () => {
            Promise.all(promises).then(a => {
                state(state.FINISHED);
                resolve();
            }).catch(a => {
                resolve();
            });
        }, 500)

    });

}

let server = null;
async function serve(dist_folder, port) {

    if (server !== null) {
        server.close(function () {
            server = null;
            serve(dist_folder, port);
        });
        return;
    }

    let app = express();
    //app.use((await import('connect-livereload')).default);
    app.use('/', express.static(dist_folder));
    app.use('/', serveIndex(dist_folder, {'icons': true}));
    server = app.listen(port, function () {
        log('LocalServer/ReloadDone', 'http://localhost:' + port.toString())
    }).on('error', ()=>{
        setTimeout( ()=> {
            serve(dist_folder, port);
        }, 500)
    });

}

global.state = function(state){
    // console.clear();
    console.log('');
    console.log('\t', state, '  ', chalk.gray(new Date().toLocaleTimeString()));
    console.log('');
}

global.state.FINISHED = chalk.bgGreenBright('DONE');
global.state.BUILDING = chalk.bgYellow('BUILDING');

global.log = function(id, message){
    console.log(
        chalk.cyan( '\t', new Date().toLocaleTimeString()), '\t',
        chalk.whiteBright(`${id}`),
        message);
}

program.parse();
