function ImageList() {
  this.image_meta = Array();
  this.flickr_api_key = '140eb4963780f2fc7b3ff26cf93f33d1';
}

ImageList.prototype = {
  /* merge in another ImageList */
  merge: function(imagelist) {
    if (imagelist.images_meta) {
      for (var i = 0; i < imagelist.image_meta.length; i++) {
        this.image_meta.push(imagelist.image_meta[i]);
      }
    }
    return this;
  },

  _getBaseFlickrURI: function() {
    return (document.location.protocol ==
        'https:' ? 'https://secure' : 'http://api') + '.flickr.com/services' +
      '/rest?api_key=' + escape(this.flickr_api_key) + '&format=json' +
      '&nojsoncallback=1';
  },

  _getFromFlickrURL: function(rest_url, callback, get_photolist) {
    if (!window.XMLHttpRequest) {
      if (0) this.debug('no xmlhttprequest support');
      return;
    }
    var req = new XMLHttpRequest();
    req.onreadystatechange = function(me) {
      return function() {
        if (req.readyState == 4 && req.status == 200) {
          var response = JSON.parse(req.responseText);
          if (response.stat == "ok") {
            var set = get_photolist(response);
            me.image_meta = new Array();
            for (var i = 0; i < set.photo.length; i++) {
              me.image_meta.push({
                uri: set.photo[i].url_s,
                caption: set.photo[i].title + (
                  this.ownername_in_captions ? (" by " +
                    (set.photo[i].ownername !== undefined ?
                     set.photo[i].ownername : set.owner)) : ""),
                href: 'http://www.flickr.com/photos/' +
                  escape(set.photo[i].owner !== undefined ?
                         set.photo[i].owner : set.owner) +
                  '/' + escape(set.photo[i].id) +
                  (set.id !== undefined ? '/in/set-' + set.id : ''),
              });
            }
            if (callback !== undefined) {
              callback(me.image_meta);
            }
          }
        }
      };
    }(this);
    req.open('GET', rest_url, true);
    req.send();
  },

  getFromFlickrPhotoset: function(photoset_id, callback) {
    var rest_url = this._getBaseFlickrURI() +
      '&method=flickr.photosets.getPhotos' +
      '&photoset_id=' + escape(photoset_id) +
      '&extras=o_dims,owner_name,url_s,license' +
      '';
    this.rest_url = rest_url;
    this._getFromFlickrURL(rest_url, callback, function(response) {
      this.response = response;
      return response.photoset;
    });
  },

  getFromFlickrSearch: function(constraints, callback) {
    var rest_url = this._getBaseFlickrURI() +
      '&method=flickr.photos.search' +
      '&extras=o_dims,owner_name,url_s,license' +
      '&per_page=500' +
      '&media=photos' +
      '';
    if (constraints.text) {
      rest_url += '&text=' + escape(constraints.text);
    }
    if (constraints.user_id) {
      rest_url += '&user_id' + escape(constraints.user_id);
    }
    if (constraints.tags) {
      rest_url += '&tags=' + escape(constraints.tags);
      if (constraints.tag_mode) {
        rest_url += '&tag_mode=' + escape(constraints.tag_mode);
      }
    }
    this._getFromFlickrURL(rest_url, callback, function(response) {
      return response.photos;
    });
  },

  getFromFlickrTextSearch: function(text, callback) {
    this.getFromFlickrSearch({ text: text }, callback);
  },

  /* 'tags' is a comma-delimited string; tag_mode is one of 'and' or 'or' */
  getFromFlickrTagSearch: function(tags, tag_mode, callback) {
    this.getFromFlickrSearch({ tags: tags, tag_mode: tag_mode }, callback);
  },

};

function ImageCanvas(parent_element, images, width, height) {
  this.parent_element = parent_element;
  this.rows = 2;
  this.columns = 2;
  this.image_width = width;
  this.image_height = height;
  this.image_meta = images;
  this.init_done = false;
  this.debug_output = false;
  this.random_switch = false;
  this.random_order = true;
  this.spacing = 10;
  this.interval = 2000;
  this.enable_canvas = true;
  this.enable_captions = false;
  this.caption_color = '#fff';
  this.caption_font = "9px sans-serif";
  this.caption_font_height = 9;
  this.caption_inset = 4;
  this.ownername_in_captions = true;
  this.fade_steps = 40;
  this.fade_step_time = 50; // ms
  // if unset, we'll try to figure it out from CSS styles
  this.background_style = null;
}

ImageCanvas.prototype = {
  setRows: function (r) { this.rows = r; return this; },
  setColumns: function (c) { this.columns = c; return this; },
  setDebug: function (d) { this.debug_output = d; return this; },
  setImageHeight: function (p) { this.image_height = p; return this; },
  setImageWidth: function (p) { this.image_width = p; return this; },
  setRandomSwitching: function (t) { this.random_switch = t; return this; },
  setRandomImageOrder: function (t) { this.random_order = t; return this; },
  setSpacing: function (px) { this.spacing = px; return this; },
  setInterval: function(msec) { this.interval = msec; return this; },
  setFadeSteps: function(s) { this.fade_steps = s; return this; },
  setFadeStepTime: function(msec) { this.fade_step_time = msec; return this; },
  setImages: function (arr) { this.image_meta = arr; return this; },
  setEnableCanvas: function (b) { this.enable_canvas = b; return this; },
  setEnableCaptions: function(b) { this.enable_captions = b; return this; },
  setOwnerNameInCaptions: function(b) { this.ownername_in_captions = b; return this; },
  setCaptionFont: function (f) {
    this.caption_font = f;
    if (this.caption_font.match(/(\d+) *px/i)) {
      this.caption_font_height = parseInt(RegExp.$1);
    }
  },
  setCaptionColor: function (s) { this.caption_color = s; return this; },
  setBackgroundStyle: function (s) { this.background_style = s; return this; },

  _shuffleArray: function(a) {
    for (var i = a.length-1; i >= 0; i--) {
      var r = Math.floor(Math.random() * (i+1));
      var tmp = a[i];
      a[i] = a[r];
      a[r] = tmp;
    }
  },

  init: function() {
    if (this.init_done) {
      return;
    }
    if (!this.image_meta) {
      alert('No images supplied -- either pass a list when constructing' +
            ' ImageCanvas, or call setImages()');
      return;
    }
    this.init_done = true;
    this.canvas_element = document.createElement('canvas');
    var canvas_supported = !!this.canvas_element.getContext;
    var overall_width = this.image_width * this.columns +
                          (this.spacing * (this.columns-1));
    var overall_height = this.image_height * this.rows +
                          (this.spacing * (this.rows-1));

    if (this.random_order) {
      this._shuffleArray(this.image_meta);
    }

    if (this.enable_canvas && canvas_supported) {
      var parent_style = window.getComputedStyle(this.parent_element, null);
      this.canvas_element.style.setProperty(
        'background-color',
        parent_style.getPropertyValue('background-color'),
        parent_style.getPropertyPriority('background-color'));
      this.parent_element.appendChild(this.canvas_element);
      this.canvas_element.width = overall_width;
      this.canvas_element.height = overall_height;
      this.ctx = this.canvas_element.getContext('2d');
      this.next_image = 0;
      this.counter = 0;
      this.use_fade = true;
      this.current = new Array();
      this.backgrounds = new Array();

      for (var y = 0; y < this.rows; y++) {
        for (var x = 0; x < this.columns; x++) {
          var imgdata = this.ctx.getImageData(
            x * (this.image_width + this.spacing),
            y * (this.image_height + this.spacing),
            this.image_width, this.image_height);
          this.backgrounds.push(imgdata);
        }
      }
        
      this.hovered_tile = null;
      if (this.enable_captions) {
        this.canvas_element.onmouseover = function(me) {
          return function(e) {
            if (0) me.debug('mouse in');
            me.canvas_element.onmousemove = function(ev) {
              me.onMouseMove(ev);
            }
          };
        }(this);
        this.canvas_element.onmouseout = function(me) {
          return function(e) {
            if (0) me.debug('mouse out');
            me.canvas_element.onmousemove = null;
            if (me.enable_captions) {
              me.drawImageForPosition(me.hovered_tile,
                                      me.image_meta[me.hovered_tile].element,
                                      me.image_meta[me.hovered_tile].alpha);
            }
          };
        }(this);
      }
//      this.canvas_element.addEventListener('click', function(e) {
//        me.onClick(e);
//      }, false);
      this.canvas_element.onclick = function(me) {
        return function(e) {
          me.onClick(e);
        };
      }(this);
      this.images = new Array();
      for (var i = 0; i < this.rows*this.columns; i++) {
        this.image_meta[i].element = document.createElement('img');
        this.images[i] = this.image_meta[i].element;
        this.images[i].src = this.image_meta[i % this.image_meta.length].uri;
        this.current[i] = this.image_meta[i];
        this.images[i].onload = function(me, position) {
          return function() {
            if (0) me.debug('image=' + this + ' initial load for position ' + position);
            me.onInitialLoad(this /* image */, position);
          }
        }(this, i);
      }
    } else {
      var table_html = '<table>';
      for (var i = 0; i < this.rows; i++) {
        table_html += '<tr>';
        for (var i1 = 0; i1 < this.columns; i1++) {
          var img;
          if (this.random_switch) {
            img = Math.floor(Math.random() * this.image_meta.length);
          } else {
            img = (i*this.rows + i1) % this.image_meta.length;
          }
          var pad_left = i1 === 0 ? 0 : this.spacing;
          var pad_top = i === 0 ? 0 : this.spacing;
          table_html += '<td><img style="width: ' + this.image_width + 'px;' +
                        ' height: ' + this.image_height + 'px;' +
                        ' margin: ' + pad_top + 'px 0 0 ' + pad_left + 'px;' +
                        '" src="' + this.image_meta[img].uri + '" /></td>';
        }
        table_html += '</tr>';
      }
      table_html += '</table>';
      this.parent_element.innerHTML += table_html;
  //    var outer_div = document.createElement('div'); 
  //    outer_div.style = 'width: ' + overall_width + 'px;' +
  //                      'height: ' + overall_height + 'px;';
    }
  },

  drawCaptionForTile: function (tile) {
    var column = tile % this.columns;
    var row = Math.floor(tile / this.columns);
    if (this.current[tile] !== undefined &&
        this.current[tile].caption !== undefined) {
      this.ctx.font = this.caption_font;
      this.ctx.fillStyle = this.caption_color;
      this.ctx.fillText(this.current[tile].caption,
                        column * (this.image_width + this.spacing) +
                          this.caption_inset,
                        row * (this.image_height + this.spacing) +
                          this.image_height - this.caption_font_height);
    }
  },

  onMouseMove: function(e) {
    var offset = this._getCanvasRelativeOffsetForEvent(e);
    var row = Math.floor(offset.y / (this.image_height + this.spacing));
    var column = Math.floor(offset.x / (this.image_width + this.spacing));
    var tile = row * this.columns + column;
    if (this.hovered_tile == null || tile != this.hovered_tile) {
      if (this.hovered_tile !== null &&
          this.image_meta[this.hovered_tile] !== undefined) {
        if (0) this.debug('hovered tile changed to ' + tile);
        this.drawImageForPosition(this.hovered_tile,
                                  this.image_meta[this.hovered_tile].element,
                                  this.image_meta[this.hovered_tile].alpha);
      }
      this.hovered_tile = tile;
      this.drawCaptionForTile(tile);
    }
  },

  _getElementAbsolutePosition: function(element) {
    var here = { x: element.offsetLeft, y: element.offsetTop };
    if (element.offsetParent) {
      var above = this._getElementAbsolutePosition(element.offsetParent);
      here.x += above.x;
      here.y += above.y;
    }
    return here;
  },

  _getCanvasRelativeOffsetForEvent: function(e) {
    var pos = { x: e.offsetX, y: e.offsetY };
    if (e.offsetX !== undefined) {
      pos.x = e.offsetX;
      pos.y = e.offsetY;
    } else {
      var epos = this._getElementAbsolutePosition(this.canvas_element);
      pos.x = e.clientX - epos.x;
      pos.y = e.clientY - epos.y;
    }
    return pos;
  },

  onClick: function(e) {
    var offset = this._getCanvasRelativeOffsetForEvent(e);
    var row = Math.floor(offset.y / (this.image_height + this.spacing));
    var column = Math.floor(offset.x / (this.image_width + this.spacing));
    var tile = row * this.columns + column;
    if (this.current[tile] && this.current[tile].href !== undefined) {
      window.location = this.current[tile].href;
    }
  },

  _getPositionColumn: function(position) {
    return column * this.image_width + this.spacing * column;
  },

  _getPositionRow: function(position) {
    return Math.floor(position / this.columns);
  },

  _getPositionX: function(position) {
    var column = position % this.columns;
    var x = column * this.image_width + this.spacing * column;
    return x;
  },

  _getPositionY: function(position) {
    var row = Math.floor(position / this.columns);
    var y = row * this.image_height + this.spacing * row;
    return y;
  },

  drawImageForPosition: function(position, image, alpha) {
    var column = position % this.columns;
    var x = column * this.image_width + this.spacing * column;
    var row = Math.floor(position / this.columns);
    var y = row * this.image_height + this.spacing * row;
    if (0) { document.getElementById("debug").innerHTML +=
      "drawImageForPosition: position=" + position +
      " column=" + (position % this.columns) +
      " x=" + x + " y=" + y +
      "<br/>"; }
    if (alpha !== undefined && alpha != NaN) {
      this.ctx.globalAlpha = alpha;
      this.image_meta[position].alpha = alpha;
      if (0) {
        /* this ought to work, but doesn't -- putImageData is not subject to
         * the alpha blending rules that govern stroking/filling/drawImage.
         */
        this.ctx.putImageData(this.backgrounds[position],
                              this._getPositionX(position),
                              this._getPositionY(position));
      } else {
        if (this.background_style) {
          this.ctx.fillStyle = background_style;
        } else {
          this.ctx.fillStyle =
            window.getComputedStyle(this.canvas_element, null).getPropertyValue('background-color');
        }
        this.ctx.fillRect(this._getPositionX(position),
                          this._getPositionY(position),
                          this.image_width, this.image_height);
      }
    }
    var scale_x = this.image_width / image.width;
    var scale_y = this.image_height / image.height;
    var dominant_scale = Math.min(scale_x, scale_y);
    var scaled_x = image.width * dominant_scale;
    var scaled_y = image.height * dominant_scale;
    var offset_x = Math.max(0, (this.image_width - scaled_x)/2);
    var offset_y = Math.max(0, (this.image_height - scaled_y)/2);
    this.ctx.drawImage(image, x + offset_x, y + offset_y,
                       scaled_x, scaled_y);
  },

  fadeInImageAtPosition: function(position, image, steps,
                                  delay, callback, step) {
    if (step == undefined) {
      step = 0;
    }
    if (step == 0 && false) {
      this.ctx.clearRect(this._getPositionX(position),
                         this._getPositionY(position),
                         this.image_width, this.image_height);
    }
    this.drawImageForPosition(position, image, step/steps);
    if (this.enable_captions && position === this.hovered_tile) {
      this.drawCaptionForTile(position);
    }
    if (step < steps) {
      setTimeout(function(me) {
        return function() {
          me.fadeInImageAtPosition(position, image, steps,
                                   delay, callback, step+1);
        }
      }(this), delay);
    } else {
      callback();
    }
  },

  onInitialLoad: function(image, position) {
    this.drawImageForPosition(position, image, 1.0);
    if (++this.counter == this.rows * this.columns) {
      setTimeout(function(me) {
        return function() {
          me.loadNext();
        }
      }(this), this.interval);
    }
  },

  loadNext: function() {
    var next = this.image_meta[this.counter % this.image_meta.length];
    this.images[this.counter % this.images.length].src = next.uri;
    var tile = this.counter % this.images.length;
    this.images[this.counter % this.images.length].onload = function(me) {
      return function() {
        me.current[tile] = next;
        me.onImageLoad(this);
      }
    }(this);
  },

  debug: function(str) {
    if (this.debug_output) {
      document.getElementById('debug').innerHTML += str + "<br/>";
    }
  },

  onImageLoad: function(image) {
    var position;
    if (this.random_switch) {
      position = Math.floor(Math.random() * this.rows * this.columns);
    } else {
      position = this.counter % (this.rows * this.columns);
    }
    if (this.use_fade) {
      if (0) { this.debug('starting fadein at ' + (new Date()).toString()); }
      this.fadeInImageAtPosition(position, image,
          this.fade_steps, this.fade_step_time, 
          function(me) {
            return function() {
              me.counter++;
              if (0) me.debug('scheduling next fade for ' + me.interval + 'ms');
              setTimeout(function() {
                  me.loadNext();
              }, me.interval);
            };
          }(this));
    } else {
      this.drawImageForPosition(position, image);
      this.counter++;
      setTimeout(function(me) {
          return function() {
            me.loadNext();
          };
        }(this), this.interval);
    }
  },

}

/* vi: set ts=2 sw=2 et: */
