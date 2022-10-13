import * as Path from "path"

export default class FileLocation {

	#data;
	#raw;

	constructor(path) {
		this.#raw = Path.resolve(path);
		this.#data = Path.parse(this.#raw);
	}

	rename(name){
		return new FileLocation(`${this.dir}${Path.sep}${name}${this.ext}`);
	}

	changeExtension(ext){
		return new FileLocation(`${this.dir}${Path.sep}${this.name}${ext}`);
	}

	changeFile(file){
		return new FileLocation(`${this.dir}${Path.sep}${file}`);
	}

	toMetaFile(){
		return new FileLocation(`${this.dir}${Path.sep}${this.base}.meta.js`)
	}

	static resolve(input){
		if(input instanceof FileLocation){
			return input;
		}else{
			return new FileLocation(input);
		}
	}

	get [Symbol.toStringTag]() {
		return this.full;
	}

	get full(){
		return this.#raw;
	}

	get root(){
		return this.#data.root;
	}

	get dir(){
		return this.#data.dir;
	}

	get base(){
		return this.#data.base;
	}

	get name(){
		return this.#data.name;
	}

	get ext(){
		return this.#data.ext;
	}

}