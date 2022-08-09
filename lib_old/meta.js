const path = require('path');
const os = require("os")

module.exports = class MetaFile {

	data
	#path;

	constructor(filename){

		this.#path = filename.replace(path.extname(filename), '.json');

		try{
			this.data = require(this.#path);
		}catch(ex){
			console.warn(`[WARN] ${filename} has no valid metadata at "${this.#path}"`);
			this.data = {};
		}

		this.data = {...this.data, ...{
			generator:{
				time: new Date().toLocaleTimeString(),
				time_unix: Date.now(),
				date: new Date().toLocaleDateString(),
				pid: process.pid,
				arch: process.arch,
				platform: process.platform,
				hostname: os.hostname,
				homedir: os.homedir()
			}
		}}
	}

}