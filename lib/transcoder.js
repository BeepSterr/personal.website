import Asset from "./asset.js"
import * as fs from "fs/promises"
import * as fss from "fs"
import cp from 'child_process';
const exec = Util.promisify(cp.exec);
import * as Path from "path"
import FileLocation from "./filelocation.js"
import * as Util from "util"
import chalk from 'chalk';
import less from 'less';
import Handlebars from "handlebars";

Handlebars.registerHelper('json', function(context) {
	return JSON.stringify(context);
});

Handlebars.registerHelper("template", function(context, options) {
	context.data.root.transcoder.log('HandlebarsTemplate', 'compiling template ' + context.hash.id);

	const newTemplateData = fss.readFileSync(Path.join(process.cwd(), 'src', context.hash.id)).toString();
	let template = Handlebars.compile(newTemplateData);
	return template({ main: context.fn(context.data.root), ...context.hash, ...context.data.root});
});

export default class Transcoder {

	asset = null;
	metadata = {};

	/**
	 * @param asset {typeof Asset}
	 */
	constructor(asset) {
		if(asset instanceof Asset){
			this.asset = asset;
		}else{
			throw new Error('asset is not an instance of Asset.');
		}
	}

	/**
	 * @returns {Promise<boolean>}
	 */
	async startTranscode(){

		if(this.asset.source.base.endsWith('.meta.js')){
			return false;
		}

		this.metadata = await this.getMetadata(this.asset.source);

		// Clean up old assets.
		try{
			await fs.rm(this.asset.destination.full);
		}catch(ex){
			// No worries :)
		}

		try {

			// Make sure destination folder exists.
			await fs.mkdir(this.asset.destination.dir, { recursive: true} );
			this.log('ensureExists', this.asset.destination.dir);

			// Run transcode.
			await this.transcode();
			return true;

		}catch(ex){
			console.error(ex);
			return false;
		}
	}

	async transcode(){
		// Base transcoder just copies the file to dist folder.
		this.log('copy');
		await fs.copyFile(this.asset.source.full, this.asset.destination.full);
		return true;
	}

	#log(method, path, messageColor){
		if(!method){
			method = 'unknown_method';
		}

		if(!path){
			path = this.asset.destination;
		}

		if(path instanceof FileLocation){
			path = path.full;
		}

		log(
				`${this.constructor.name}/${method}`,
				messageColor(path)
			);
	}

	log(method, path){
		this.#log(method, path, chalk.blueBright);
	}

	warn(method, path){
		this.#log(method, path, chalk.yellowBright);
	}

	error(method, path){
		this.#log(method, path, chalk.redBright);
	}

	async getMetadata(path) {

		const filepath = FileLocation.resolve(path);

		const meta_file = filepath.toMetaFile();
		const meta_file_index = filepath.changeFile('index').toMetaFile();

		let data = {};

		try{
			await fs.access(meta_file.full)
			data = (await import(meta_file.full + `?update=${Date.now()}`)).default;
			this.log('fetchMetadata', meta_file.full);
		}catch(e) {
			this.warn('fetchMetadata', 'No direct metadata found for ' + meta_file.full);
		}
		try{

			await fs.access(meta_file_index.full)
			data = (await import(meta_file_index.full + `?update=${Date.now()}`)).default;
			this.log('fetchMetadata', meta_file_index.full);
		}catch(e) {
			this.warn('fetchMetadata', 'No direct derivative metadata found at ' + meta_file_index.full);
		}

		if(data === false){
			this.error('fetchMetadata', 'Exhausted all metadata locations for ' + meta_file.full);
		}

		return {...data, now: new Date().toUTCString(), transcoder: this};

	}

}

export class ImageTranscoder extends Transcoder {

	async transcode(){

		// favicons!
		if(this.metadata.favicon === true){
			await this.generateFavicon(this.asset.destination.changeExtension('.ico'));
			return true	;
		}

		// Run copy here aswell.
		await super.transcode();

		await this.generateThumb(this.asset.destination.rename(this.asset.destination.name + '_thumb'));
		return true;
	}

	async generateThumb(thumb_file){
		this.log('generateThumbnail', thumb_file.full);
		const command = `convert -define ${this.asset.source.ext.substring(1)}:size=500x180 "${this.asset.source.full}" -auto-orient -thumbnail 512x256 -unsharp 0x.5 "${thumb_file.full}"`;
		await exec(command);

		return true;
	}

	async generateFavicon(icon_loc){
		this.log('favicon', icon_loc);
		const command = `magick "${this.asset.source.full}" -background none -resize 128x128 -density 128x128 "${icon_loc.full}"`;
		await exec(command);
	}

}

export class VideoTranscoder extends Transcoder {
		// TODO: Video transcoder!!
		// Probably needs like, a way to generate preview gifs and getting the first frame (for thumbnails and previews)
}

export class LessTranscoder extends Transcoder {

	async transcode(){

		// NOT CALLING SUPER HERE, do not wamt to copy over raw less file!!

		// TODO: Test with @imports n stuff.
		const dest = this.asset.destination.changeExtension('.css').full;
		less.render((await fs.readFile(this.asset.source.full)).toString(), {}, function(error, output) {
			this.log('lessToCSS', 'compiled file to ' + dest)
			fs.writeFile(dest, output.css);
		}.bind(this))
	}

}

export class TextTranscoder extends Transcoder {

	async transcode(){
		// no super here either, we're compiling templates.
		let file = await fs.readFile(this.asset.source.full);
		let template = Handlebars.compile(file.toString());
		const compiledTemplate = template(this.metadata)
		await fs.writeFile(this.asset.destination.full, compiledTemplate);
	}

}

export class MarkdownTranscoder extends TextTranscoder {

}

export class HypertextTranscoder extends TextTranscoder {

}