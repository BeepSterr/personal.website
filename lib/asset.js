import Transcoder, {HypertextTranscoder, LessTranscoder, MarkdownTranscoder} from "./transcoder.js"
import {ImageTranscoder} from "./transcoder.js"
import {VideoTranscoder} from "./transcoder.js"
import FileLocation from "./filelocation.js"

export default class Asset {

	#sourcePath = null;
	#destinationPath = null

	#sourceData

	constructor(path, dest) {

		// Fully resolve paths to full.
		this.#sourcePath = new FileLocation(path);
		this.#destinationPath = new FileLocation(dest);
	}

	get [Symbol.toStringTag]() {
		return this.#sourcePath.full;
	}

	getTranscoder(){

		/*
			Transcoders allow for handing specific asset types when building.
			Example usages:
			- Transcoding video to different formats
			- Generating thumbnails for assets
			- Compiling less to css
			- Minimizing JS
		 */

		switch(this.#sourcePath.ext){
			case ".jpg":
			case ".jpeg":
			case ".png":
				return new ImageTranscoder(this);

			case ".mp4":
			case ".avi":
				return new VideoTranscoder(this);

			case ".less":
				return new LessTranscoder(this);

			case ".html":
				return new HypertextTranscoder(this);

			case ".md":
				return new MarkdownTranscoder(this);
		}

		return new Transcoder(this);

	}

	get destination(){
		return this.#destinationPath;
	}

	get source(){
		return this.#sourcePath;
	}

}