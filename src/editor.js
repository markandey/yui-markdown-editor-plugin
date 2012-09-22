YUI.add('mdeditor', function(Y) {
	"use strict"

	function editor(textarea) {
		this.textarea = textarea;
		this.converter = new Y.Showdown.converter();
		this.isPreview = false;
		this.textAreaNode = this.textarea._node;
		this._initCaretPostion(this.textAreaNode);
		this.caretPosition = 0;
	}

	/*************************
      editor prototype
   **************************/
	editor.prototype = {
		/**************
	    setText
	   ************/
		getText: function() {
			return this.textarea.get('value');
		},
		/**************
	    setText
	   ************/
		setText: function(value) {
			return this.textarea.set('value', value);
		},
		/*****************
	    getCurrentSelecttion
	    // gets the current selection
	   *****************/
		getCurrentSelection: function() {
			var caretPos = this._getCaretPos(this.textarea._node);
			if (caretPos.start != caretPos.end) {
				caretPos.text = this.getText().substring(caretPos.start, caretPos.end);
			} else {
				caretPos.text = "";
			}

			return caretPos
		},
		/*****************
	    wrapCurrentSelection
	    // gets the current selection
	   *****************/
		wrapCurrentSelection: function(sWrap, eWrap) {
			eWrap = eWrap || sWrap;
			this._replaceSelection(this.textarea._node, sWrap + this.getCurrentSelection().text + eWrap);
		},
		/*****************
	    replaceCurrentSelection
	    // gets the current selection
	   *****************/
		replaceCurrentSelection: function(text) {
			text = text || "";
			this._replaceSelection(this.textarea._node, text);
		},
		/*****************
	    preview
	    // gets the current selection
	   *****************/
		preview: function(cmd) {
			if (!this.isPreview) {
				if (this.previewOverlay === undefined) {
					this.previewOverlay = new Y.Overlay({
						'constrain': this.textarea
					});
					this.previewOverlay.render();
				}
				var TaRegion = this.textarea.get('region');
				var style = "border:1px solid #eee;background:#fff;overflow:scroll;text-align:left;";
				var nodesrc = '<div class="preview-ovelay" style="{style}width:{width}px;height:{height};">{html}</div>';
				nodesrc = nodesrc.replace("{style}", style);
				nodesrc = nodesrc.replace("{width}", TaRegion.width);
				nodesrc = nodesrc.replace("{height}", TaRegion.height);
				var html = this.converter.makeHtml(this.getText());
				nodesrc = nodesrc.replace("{html}", html);
				var node = Y.Node.create(nodesrc);
				this.previewOverlay.set('bodyContent', node);
				this.previewOverlay.set('visible', true);

			} else {
				if (this.previewOverlay) {
					this.previewOverlay.set('visible', false);
				}
			}
			this.isPreview = !this.isPreview;
		},
		/*****************
	    executeCommand
	    // executes command
	   *****************/
		executeCommand: function(cmd) {
			var charPos = this._getCaretPos(this.textarea._node);
			var isToInsert = (charPos.start == charPos.end);
			cmd = cmd.toLowerCase();
			console.log(cmd);
			switch (cmd) {
			case "bold":
				this._commandBold(cmd, charPos, isToInsert);
				break;
			case "italic":
				this._commandItalic(cmd, charPos, isToInsert);
				break;
			case "code":
				this._commandCode(cmd, charPos, isToInsert);
				break;
			case "link":
				this._commandLink(cmd, charPos, isToInsert);
				break;
			case "preview":
				this.preview(cmd, charPos, isToInsert);
				break;
			}

		},
		_commandBold: function(cmd, charPos, isToInsert) {
			if (isToInsert) {
				return this.insertExample(cmd);
			}
			this.wrapCurrentSelection('**');
		},
		_commandItalic: function(cmd, charPos, isToInsert) {
			if (isToInsert) {
				return this.insertExample(cmd);
			}
			this.wrapCurrentSelection('--');
		},
		_commandCode: function(cmd, charPos, isToInsert) {
			if (isToInsert) {
				return this.insertExample(cmd);
			}
			var curText = this.getCurrentSelection().text;
			if (curText.indexOf('\n') < 0) {
				this.wrapCurrentSelection('`');
			} else {
				curText = curText.replace(/(^\s*(.+)|)/gm, '    $2');
				this.replaceCurrentSelection(curText);
			}
		},
		_commandLink: function(cmd, charPos, isToInsert) {
			if (isToInsert) {
				return this.insertExample(cmd);
			}
			var curText = this.getCurrentSelection().text;
			var linkurl = prompt("Please enter link", "http://www.");
			var mdString = "[{text}]({link})".replace("{text}", curText).replace("{link}", linkurl);
			this.replaceCurrentSelection(mdString);
		},
		insertExample: function(cmd) {
			var insertText = {
				'bold': "**strong text**",
				'italic': "**italic text**",
				'code': "`your code goes here`",
				'link': "[your text](http://www.your-link-is-here.com)",
			}
			this._insertAtCaretPos(this.textarea._node, insertText[cmd]);
		},
		/*****************
	    _replaceSelection
	    // executes command
	   *****************/
		_replaceSelection: function(textAreaNode, inputStr) {
			var input = textAreaNode;
			var start;
			var end;
			var position = 0;
			var rc;
			var re;
			var number = 0;
			var minus = 0;
			var mozScrollFix = (input.scrollTop == undefined) ? 0 : input.scrollTop;

			if (document.selection && typeof(input.selectionStart) != "number") {
				var s = document.selection.createRange();

				// IE support
				if (typeof(input.selectionStart) != "number") { // return null if the selected text not from the needed area
					var firstRe;
					var secondRe;
					re = input.createTextRange();
					rc = re.duplicate();
					firstRe = re.text;
					re.moveToBookmark(s.getBookmark());
					secondRe = re.text;
					try {
						rc.setEndPoint("EndToStart", re);
					} catch (err) {
						return this;
					}
					if (firstRe == secondRe && firstRe != s.text || rc.text.length > firstRe.length) {
						return this;
					}
				}
				if (s.text) {
					part = s.text;
					if (input.value.match(/\n/g) != null) {
						number = input.value.match(/\n/g).length; // number of EOL simbols
					}
					// IE support
					start = rc.text.length;
					// remove all EOL to have the same start and end positons as in MOZILLA
					if (number > 0) {
						for (var i = 0; i <= number; i++) {
							var w = input.value.indexOf("\n", position);
							if (w != -1 && w < start) {
								position = w + 1;
								minus++;

							} else {
								i = number;
							}
						}
					}
					s.text = inputStr;
					this.caretPosition = rc.text.length + inputStr.length;
					re.move("character", this.caretPosition);
					document.selection.empty();
					input.blur();
				}
				return this;
			} else if (typeof(input.selectionStart) == "number" && input.selectionStart != input.selectionEnd) {

				start = input.selectionStart;
				end = input.selectionEnd;
				input.value = input.value.substr(0, start) + inputStr + input.value.substr(end);
				position = start + inputStr.length;
				input.setSelectionRange(position, position);
				input.scrollTop = mozScrollFix;
				return this;
			}
			return this;
		},
		_getCaretPos: function(textAreaNode) {
			var carPos = {
				'start': null,
				'end': null
			};
			if (textAreaNode.selectionStart || textAreaNode.selectionStart == 0) {
				carPos.start = textAreaNode.selectionStart;
				carPos.end = textAreaNode.selectionEnd;
			} else if (document.selection) {
				var range = document.selection.createRange();
				var range_all = document.body.createTextRange();
				range_all.moveToElementText(textAreaNode);
				var sel_start;
				for (sel_start = 0; range_all.compareEndPoints('StartToStart', range) < 0; sel_start++) {
					range_all.moveStart('character', 1);
				}
				textAreaNode.sel_start = sel_start;
				carPos.start = textAreaNode.sel_start;
				carPos.end = textAreaNode.sel_start;
			}
			return carPos;
		},
		_setSelection: function(textAreaNode, startPosition, endPosition) {
			startPosition = parseInt(startPosition);
			endPosition = parseInt(endPosition);

			var input = textAreaNode;
			input.focus();
			if (typeof(input.selectionStart) != "number") {
				re = input.createTextRange();
				if (re.text.length < endPosition) {
					endPosition = re.text.length + 1;
				}
			}
			if (endPosition < startPosition) {
				return this;
			}
			if (document.selection) {
				var number = 0;
				var plus = 0;
				var position = 0;
				var plusEnd = 0;
				if (typeof(input.selectionStart) != "number") { // IE
					re.collapse(true);
					re.moveEnd('character', endPosition);
					re.moveStart('character', startPosition);
					re.select();
					return this;
				} else if (typeof(input.selectionStart) == "number") { // Opera
					if (input.value.match(/\n/g) != null) {
						number = input.value.match(/\n/g).length; // number of EOL simbols
					}
					if (number > 0) {
						for (var i = 0; i <= number; i++) {
							var w = input.value.indexOf("\n", position);
							if (w != -1 && w < startPosition) {
								position = w + 1;
								plus++;
								plusEnd = plus;
							} else if (w != -1 && w >= startPosition && w <= endPosition) {
								if (w == startPosition + 1) {
									plus--;
									plusEnd--;
									position = w + 1;
									continue;
								}
								position = w + 1;
								plusEnd++;
							} else {
								i = number;
							}
						}
					}
					startPosition = startPosition + plus;
					endPosition = endPosition + plusEnd;
					input.selectionStart = startPosition;
					input.selectionEnd = endPosition;
					input.focus();
					return this;
				} else {
					input.focus();
					return this;
				}
			} else if (input.selectionStart || input.selectionStart == 0) { // MOZILLA support
				input.focus();
				window.getSelection().removeAllRanges();
				input.selectionStart = startPosition;
				input.selectionEnd = endPosition;
				input.focus();
				return this;
			}
		},
		// insert text at current caret position
		_insertAtCaretPos: function(textAreaNode, inputStr) {
			var input = textAreaNode;
			var start;
			var end;
			var position;
			var s;
			var re;
			var rc;
			var point;
			var minus = 0;
			var number = 0;
			var mozScrollFix = (input.scrollTop == undefined) ? 0 : input.scrollTop;

			input.focus();
			if (document.selection && typeof(input.selectionStart) != "number") {
				if (input.value.match(/\n/g) != null) {
					number = input.value.match(/\n/g).length; // number of EOL simbols
				}
				point = parseInt(this.caretPosition);
				if (number > 0) {
					for (var i = 0; i <= number; i++) {
						var w = input.value.indexOf("\n", position);
						if (w != -1 && w <= point) {
							position = w + 1;
							point = point - 1;
							minus++;
						}
					}
				}
			}
			//this.caretPosition);
			// IE
			input.onkeyup = function() { // for IE because it loses caret position when focus changed
				if (document.selection && typeof(input.selectionStart) != "number") {
					input.focus();
					s = document.selection.createRange();
					re = input.createTextRange();
					rc = re.duplicate();
					re.moveToBookmark(s.getBookmark());
					rc.setEndPoint("EndToStart", re);
					this.caretPosition = rc.text.length;
				}

			}

			input.onmouseup = function() { // for IE because it loses caret position when focus changed
				if (document.selection && typeof(input.selectionStart) != "number") {
					input.focus();
					s = document.selection.createRange();
					re = input.createTextRange();
					rc = re.duplicate();
					re.moveToBookmark(s.getBookmark());
					rc.setEndPoint("EndToStart", re);
					this.caretPosition = rc.text.length;
				}
			}

			if (document.selection && typeof(input.selectionStart) != "number") {
				s = document.selection.createRange();
				if (s.text.length != 0) {
					return this;
				}
				re = input.createTextRange();
				textLength = re.text.length;
				rc = re.duplicate();
				re.moveToBookmark(s.getBookmark());
				rc.setEndPoint("EndToStart", re);
				start = rc.text.length;
				if (this.caretPosition > 0 && start == 0) {
					minus = this.caretPosition - minus;
					re.move("character", minus);
					re.select();
					s = document.selection.createRange();
					this.caretPosition += inputStr.length;
				} else if (!(this.caretPosition >= 0) && textLength == 0) {
					s = document.selection.createRange();
					this.caretPosition = inputStr.length + textLength;
				} else if (!(this.caretPosition >= 0) && start == 0) {
					re.move("character", textLength);
					re.select();
					s = document.selection.createRange();
					this.caretPosition = inputStr.length + textLength;
				} else if (!(this.caretPosition >= 0) && start > 0) {
					re.move("character", 0);
					document.selection.empty();
					re.select();
					s = document.selection.createRange();
					this.caretPosition = start + inputStr.length;
				} else if (this.caretPosition >= 0 && this.caretPosition == textLength) {
					if (textLength != 0) {
						re.move("character", textLength);
						re.select();
					} else {
						re.move("character", 0);
					}
					s = document.selection.createRange();
					this.caretPosition = inputStr.length + textLength;
				} else if (this.caretPosition >= 0 && start != 0 && this.caretPosition >= start) {
					minus = this.caretPosition - start;
					re.move("character", minus);
					document.selection.empty();
					re.select();
					s = document.selection.createRange();
					this.caretPosition = this.caretPosition + inputStr.length;
				} else if (this.caretPosition >= 0 && start != 0 && this.caretPosition < start) {
					re.move("character", 0);
					document.selection.empty();
					re.select();
					s = document.selection.createRange();
					this.caretPosition = this.caretPosition + inputStr.length;
				} else {
					document.selection.empty();
					re.select();
					s = document.selection.createRange();
					this.caretPosition = this.caretPosition + inputStr.length;
				}
				s.text = inputStr;
				input.focus();

				return this;
			} else if (typeof(input.selectionStart) == "number" && input.selectionStart == input.selectionEnd) {
				position = input.selectionStart + inputStr.length;
				start = input.selectionStart;
				end = input.selectionEnd;
				input.value = input.value.substr(0, start) + inputStr + input.value.substr(end);
				input.setSelectionRange(position, position);
				input.scrollTop = mozScrollFix;
				return this;
			}
			return this;
		},
		_initCaretPostion: function(textAreaNode) {
			if (navigator.appName == "Microsoft Internet Explorer") {
				var input=textAreaNode;
				this.caretPosition = input.value.length;
				input.onmouseup = function() { // for IE because it loses caret position when focus changed
					input = document.activeElement;
					input.focus();
					var s = document.selection.createRange();
					var re = input.createTextRange();
					var rc = re.duplicate();
					re.moveToBookmark(s.getBookmark());
					rc.setEndPoint("EndToStart", re);
					this.caretPosition = rc.text.length;
				}
				input.onkeyup = function() {
					input = document.activeElement;
					input.focus();
					var s = document.selection.createRange();
					var re = input.createTextRange();
					var rc = re.duplicate();
					re.moveToBookmark(s.getBookmark());
					rc.setEndPoint("EndToStart", re);
					this.caretPosition = rc.text.length;
				}
			}
		}
		//}*/
	};

	/**************
   	mdEditor module object
   ***********/
	Y.mdEditor = {
		create: function(textarea) {
			return new editor(Y.one(textarea));
		}
	};
}, '0.0.0', {
	requires: ['overlay', 'showdown', 'node', 'event']
});