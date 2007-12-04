/*
 *  $Id$
 *
 * The MIT License
 *
 * Copyright (c) 2007 Lim Chee Aun <cheeaun@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * MooEditable.js
 * MooEditable class for contentEditable-capable browsers
 *
 * @package     MooEditable
 * @subpackage  Core
 * @author      Lim Chee Aun <cheeaun@gmail.com>
 * @author      Marc Fowler <marc.fowler@defraction.net>
 * @author      Radovan Lozej <xrado@email.si>
 * @license     http://www.opensource.org/licenses/mit-license.php MIT License
 * @link        http://code.google.com/p/mooeditable/
 * @since       1.0
 * @version     $Revision: 8 $
 * @credits     Most code is based on Stefan's work "Safari Supports Content Editing!"
 *                  <http://www.xs4all.nl/~hhijdra/stefan/ContentEditable.html>
 *              Main reference from Peter-Paul Koch's "execCommand compatibility" research
 *                  <http://www.quirksmode.org/dom/execCommand.html>
 *              Some ideas inspired by TinyMCE <http://tinymce.moxiecode.com/>
 *              Some functions inspired by Inviz's "Most tiny wysiwyg you ever seen"
 *                  <http://forum.mootools.net/viewtopic.php?id=746>,
 *                  <http://forum.mootools.net/viewtopic.php?id=5740>
 *              Some regex from Cameron Adams's widgEditor
 *                  <http://themaninblue.com/experiment/widgEditor/>
 *              IE support referring Robert Bredlau's "Rich Text Editing" part 1 and 2 articles
 *                  <http://www.rbredlau.com/drupal/node/6>
 *              Tango icons from the Tango Desktop Project
 *                  <http://tango.freedesktop.org/>
 *              Additional tango icons from Tango OpenOffice set by Jimmacs
 *                  <http://www.gnome-look.org/content/show.php/Tango+OpenOffice?content=54799>
 */

var MooEditable = new Class({

	Implements: [Events, Options],

	options:{
		toolbar: true,
		buttons: 'bold,italic,underline,strikethrough,separator,insertunorderedlist,insertorderedlist,indent,outdent,separator,undo,redo,separator,\
					createlink,unlink,separator,urlimage,separator,toggleview',
		text: {
			'bold': 'Bold',
			'italic': 'Italic',
			'underline': 'Underline',
			'strikethrough': 'Strikethrough',
			'insertunorderedlist': 'Unordered List',
			'insertorderedlist': 'Ordered List',
			'indent': 'Indent',
			'outdent': 'Outdent',
			'undo': 'Undo',
			'redo': 'Redo',
			'createlink': 'Add Hyperlink',
			'unlink': 'Remove Hyperlink',
			'urlimage': 'Add image from URL',
			'separator': '|',
			'toggleview': 'Toggle View'
		}
	},

	initialize: function(el,options){
		this.setOptions(options);
		this.textarea = el;
		this.build();
	},

	build: function(){
		// Build the container
		this.container = new Element('div',{
			'id': (this.textarea.id) ? this.textarea.id+'-container' : null,
			'class': 'mooeditable-container',
			'styles': {
				'width': this.textarea.getOffsetSize().x,
				'margin': this.textarea.getStyle('margin')
			}
		});

		// Put textarea inside container
		this.container.wraps(this.textarea);

		this.textarea.setStyles({
			'margin': 0,
			'display': 'none',
			'resize': 'none', // disable resizable textareas in Safari
			'outline': 'none' // disable focus ring in Safari
		});

		// Fix IE bug, refer "IE/Win Inherited Margins on Form Elements" <http://positioniseverything.net/explorer/inherited_margin.html>
		if(Browser.Engine.trident) new Element('span').wraps(this.textarea);

		// Build the iframe
		var pads = this.textarea.getStyle('padding').split(' ');
		pads = pads.map(function(p){ return (p == 'auto') ? 0 : p.toInt(); });

		this.iframe = new IFrame({
			'class': 'mooeditable-iframe',
			'styles': {
				'width': this.textarea.getStyle('width').toInt() + pads[1] + pads[3],
				'height': this.textarea.getStyle('height').toInt() + pads[0] + pads[2],
				'border-color': this.textarea.getStyle('border-color'),
				'border-width': this.textarea.getStyle('border-width'),
				'border-style': this.textarea.getStyle('border-style')
			}
		});
		this.iframe.inject(this.container, 'top');

		// contentWindow and document references
		this.win = this.iframe.contentWindow;
		this.doc = this.win.document;

		// Build the content of iframe
		var documentTemplate = '\
			<html style="cursor: text; height: 100%">\
				<body id=\"editable\" style="font-family: sans-serif; border: 0">'+
				this.cleanup(this.textarea.value) +
				'</body>\
			</html>\
		';
		this.doc.open();
		this.doc.write(documentTemplate);
		this.doc.close();

		// Turn on Design Mode
		this.doc.designMode = 'on';

		// In IE6, after designMode is on, it forgots what is this.doc. Weird.
		if(Browser.Engine.trident4) this.doc = this.win.document;

		// Assign view mode
		this.mode = 'iframe';

		// Update the event for textarea's corresponding labels
		if(this.textarea.id && $$('label[for="'+this.textarea.id+'"]')){
			$$('label[for="'+this.textarea.id+'"]').addEvent('click', function(e){
				if(this.mode == 'iframe'){
					e = new Event(e).stop();
					this.win.focus();
				}
			}.bind(this));
		}

		// Update & cleanup content befour submit
		this.form = this.textarea.getParent('form');
		if(this.form) this.form.addEvent('submit',function(){
			this.updateContent();
		}.bind(this));

		if(this.options.toolbar) this.buildToolbar();
	},

	updateContent: function(){
		if(this.mode=='iframe') this.textarea.value = this.cleanup(this.doc.getElementById('editable').innerHTML);
	},

	buildToolbar: function(){
		this.toolbar = new Element('div',{ 'class': 'mooeditable-toolbar' });
		this.toolbar.inject(this.iframe, 'before');

		var toolbarButtons = this.options.buttons.split(',');

		for (var i=0 ; i<toolbarButtons.length ; i++){
			var command = toolbarButtons[i];
			var b;
			if (command == 'separator'){
				b = new Element('span',{ 'class': 'toolbar-separator' });
			}
			else{
				b = new Element('button',{
					'class': command+'-button toolbar-button',
					'title': this.options.text[command]
				});
			}
			b.set('text', this.options.text[command]);
			b.inject(this.toolbar, 'bottom');
		}

		this.toolbar.getElements('.toolbar-button').each(function(item){
			item.addEvent('click', function(e){
				e = new Event(e).stop();
				if (!item.hasClass('disabled')){
					var command = item.className.split(' ')[0].split('-')[0];
					this.action(command);
				}
				this.win.focus();
			}.bind(this));

			// remove focus rings off the buttons in Firefox
			item.addEvent('mousedown', function(e){ new Event(e).stop(); });

			// add hover effect for IE6
			if(Browser.Engine.trident4) item.addEvents({
				'mouseenter': function(e){ this.addClass('hover'); },
				'mouseleave': function(e){ this.removeClass('hover'); }
			});
		}.bind(this));
	},

	action: function(command){
		var selection = '';
		switch(command){
			case 'createlink':
				if (this.doc.selection){
					selection = this.doc.selection.createRange().text;
					if (selection == ''){
						alert("Please select the text you wish to hyperlink.");
						break;
					}
				}
				else{
					selection = this.win.getSelection();
					if (selection == ''){
						alert("Please select the text you wish to hyperlink.");
						break;
					}
				}
				var url = prompt('Enter URL','http://');
				if (url) this.execute(command, false, url.trim());
				break;
			case 'urlimage':
				var url = prompt("Enter Image URL","http://");
				if (url) this.execute("insertImage", false, url.trim());
				break;
			case 'toggleview':
				this.toggleView();
				break;
			default:
				if (!Browser.Engine.trident) this.execute('styleWithCSS', false, false);
				this.execute(command, false, '');
		}
	},

	execute: function(command, param1, param2){
	    if (!this.busy){
			this.busy = true;
			this.doc.execCommand(command, param1, param2);
			this.textarea.value = this.cleanup(this.doc.getElementById('editable').innerHTML);
			this.busy = false;
		}
		return false;
	},

	toggleView: function() {
		if (this.mode == 'textarea') {
			this.mode = 'iframe';
			this.iframe.setStyle('display', '');
			(function(){
				this.doc.getElementById('editable').innerHTML = this.textarea.value;
			}).bind(this).delay(1); // dealing with Adobe AIR's webkit bug
			this.toolbar.getElements('.toolbar-button').each(function(item){
				item.removeClass('disabled');
				item.set('opacity', 1);
			});
			this.textarea.setStyle('display', 'none');
		} else {
			this.mode = 'textarea';
			this.textarea.setStyle('display', '');
			this.textarea.value = this.cleanup(this.doc.getElementById('editable').innerHTML);
			this.toolbar.getElements('.toolbar-button').each(function(item){
				if (!item.hasClass('toggleview-button')) {
					item.addClass('disabled');
					item.set('opacity', 0.4);
				}
			});
			this.iframe.setStyle('display', 'none');
		}
	},

	cleanup: function(source){
		// Webkit cleanup
		source = source.replace(/<br class\="webkit-block-placeholder">/gi, "<br />");
		source = source.replace(/<span class="Apple-style-span">(.*)<\/span>/gi, '$1');
		source = source.replace(/ class="Apple-style-span"/gi, '');
		source = source.replace(/<span style="">/gi, '');

		// Remove padded paragraphs
		source = source.replace(/<p>\s*<br \/>\s*<\/p>/gi, '<p>\u00a0</p>');
		source = source.replace(/<p>(&nbsp;|\s)*<\/p>/gi, '<p>\u00a0</p>');
		source = source.replace(/\s*<br \/>\s*<\/p>/gi, '</p>');

		// Replace improper BRs
		source = source.replace(/<br>/gi, "<br />");

		// Remove leading and trailing BRs
		source = source.replace(/<br \/>$/gi, '');
		source = source.replace(/^<br \/>/gi, '');

		// Remove useless BRs
		source = source.replace(/><br \/>/gi, '>');

		// Remove BRs right before the end of blocks
		source = source.replace(/<br \/>\s*<\/(h1|h2|h3|h4|h5|h6|li|p)/gi, '</$1');

		// Remove empty tags
		source = source.replace(/(<[^\/]>|<[^\/][^>]*[^\/]>)\s*<\/[^>]*>/gi, '');

		// Semantic conversion
		source = source.replace(/<span style="font-weight: bold;">(.*)<\/span>/gi, '<strong>$1</strong>');
		source = source.replace(/<span style="font-style: italic;">(.*)<\/span>/gi, '<em>$1</em>');
		source = source.replace(/<b(\s+|>)/g, "<strong$1");
		source = source.replace(/<\/b(\s+|>)/g, "</strong$1");
		source = source.replace(/<i(\s+|>)/g, "<em$1");
		source = source.replace(/<\/i(\s+|>)/g, "</em$1");

		// Replace uppercase element names with lowercase
		source = source.replace(/<[^> ]*/g, function(match){return match.toLowerCase();});

		// Replace uppercase attribute names with lowercase
		source = source.replace(/<[^>]*>/g, function(match){
			match = match.replace(/ [^=]+=/g, function(match2){return match2.toLowerCase();});
			return match;
		});

		// Put quotes around unquoted attributes
		source = source.replace(/<[^>]*>/g, function(match){
			match = match.replace(/( [^=]+=)([^"][^ >]*)/g, "$1\"$2\"");
			return match;
		});

		// Final trim
		source = source.trim();

		return source;
	}
});