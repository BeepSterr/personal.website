const Handlebars = require("handlebars");
const fs = require("fs")
const path = require("path")
const mime = require('mime-types')
const MarkdownIt = require("markdown-it");

Handlebars.registerHelper('json', function(context) {
	return JSON.stringify(context);
});

module.exports = class Block {

	template = false;
	file;

	content =  null;
	meta = false;

	static HAS_META_EXTS = ['.htm', '.html', '.md' ];

	constructor(filepath){

		this.path = path.normalize(filepath);
		this.file = path.parse(this.path);
		this.mime = mime.lookup(this.file.ext);


		this.content = fs.readFileSync(filepath);

		if(Block.HAS_META_EXTS.includes(this.file.ext)){
			if(fs.existsSync(filepath.replace(this.file.ext, '.js'))){
				try{

					const metafile = require(filepath.replace(path.extname(filepath), '.js'));
					this.template = metafile.template;

					if(typeof metafile.data === 'function'){
						this.meta = metafile.data(this);
					}else{
						this.meta = metafile.data;
					}

				}catch(ex){
					console.warn(`[ERROR] ${filepath}`);
					console.warn(ex);
					this.meta = {};
				}
			}else{
				console.warn(`[WARN] no metafile found for ${filepath}`);
			}
		}

	}

	addMeta(content) {
		this.meta = {...this.meta, ...content};
	}

	compile(){
		return {
			content: this.render(),
			filename: this.file.name + this.file.ext,
			meta: this.meta
		}
	}

	render(template_content, child_meta){

		switch(this.mime){

			case "application/javascript":

				var template = Handlebars.compile(this.content.toString());
				return template({...this.meta, ...child_meta, template_content: template_content});

			case "text/markdown":

				var MarkdownIt = require('markdown-it');
				var md = new MarkdownIt({
					html: true,
					breaks: true
				});
				this.content = md.render(this.content.toString());

			case "text/html":

				if(this.template){
					this.content = this.template.render(this.content.toString(), {...this.meta, ...child_meta})
				}

				// overwrite file extension to be html instead of md.
				this.file.ext = '.html';

				var template = Handlebars.compile(this.content.toString());
				return template({...this.meta, ...child_meta, template_content: template_content});

			default:
				console.warn(`${this.mime} has no render()`);
				return this.content;

		}
	}

	toString(){
		return this.render();
	}

}