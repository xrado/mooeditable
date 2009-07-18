/*
Script: MooEditable.UI.Forecolor.js
	UI Class to change the color of the text from a list a predifined colors.

Usage:
   Add the following tags in your html
   <link rel="stylesheet" type="text/css" href="MooEditable.Forecolor.css">
   <script type="text/javascript" src="mootools.js"></script>
   <script type="text/javascript" src="MooEditable.js"></script>
   <script type="text/javascript" src="MooEditable.UI.ButtonOverlay.js"></script>
   <script type="text/javascript" src="MooEditable.Forecolor.js"></script>

   <script type="text/javascript">
	window.addEvent('load', function(){
		var mooeditable = $('textarea-1').mooEditable({
			actions: 'bold italic underline strikethrough | forecolor | toggleview'
		});
   </script>

License:
	MIT-style license.

Author:
    Olivier Refalo orefalo@yahoo.com
*/


MooEditable.Actions.forecolor = {
	
	type: 'button-overlay',
	title: 'Change Color',
	options: {
		overlaySize: {x:'auto', y:'auto'},
		overlayHTML: (function(){
			var html = new Element('div');
			var colors = [
				['000000', '993300', '333300', '003300', '003366', '000077', '333399', '333333'], 
				['770000', 'ff6600', '777700', '007700', '007777', '0000ff', '666699', '777777'], 
				['ff0000', 'ff9900', '99cc00', '339966', '33cccc', '3366f0', '770077', '999999'], 
				['ff00ff', 'ffcc00', 'ffff00', '00ff00', '00ffff', '00ccff', '993366', 'cccccc'], 
				['ff99cc', 'ffcc99', 'ffff99', 'ccffcc', 'ccffff', '99ccff', 'cc9977', 'ffffff']
			];		
			$each(colors, function(row){
				$each(row, function(c){
					new Element('a',{
						'class' : 'colorPickerColor',
						'styles' : { 'background-color' : '#'+c }
					}).inject(html,'bottom');
	            },self);
				new Element('br',{styles:{'clear':'both'}}).inject(html,'bottom');
	        },self);
			return html.get('html');
		})()
	},
	
	command: function(buttonOverlay, e){
		var el = $( e.target || e.srcElement);
		if (el.get('tag') != 'a') return;
		var color = el.getStyle('background-color');
		this.execute('forecolor', false, color);
		this.focus();
	}
	
};

