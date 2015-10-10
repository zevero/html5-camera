/* global FileReader, FormData, XMLHttpRequest, ArrayBuffer, Uint8Array, Blob, btoa, loadImage */
/* exported camera */
var camera = (function() {
  'use strict';
  var options;
  var $input;

  function photoSend(blob){
    if (options.callback_blob) options.callback_blob(blob);
    if (!options.xhr && !options.callback_blob && !options.callback_canvas)
      return alert('Options need either callback_blob or xhr');
    // Send with Formdata 
    var name = options.xhr_name() + '.' + options.photo_ext;
    var formData = new FormData();
    blob.name = name;//if a blob has a name it is a File
    formData.append('camera', blob, name);
    var xhr = new XMLHttpRequest();
    xhr.open('post', options.xhr, true);
    xhr.upload.onprogress = function(e) {
      if (e.lengthComputable) {
        var percentage = Math.round((e.loaded / e.total) * 100);
        options.callback_xhr && options.callback_xhr(percentage);
      }
    };

    xhr.onerror = function(e) { //TODO
      options.callback_xhr && options.callback_xhr('An error occurred while submitting the form. Maybe your file is too big' +e);
    };
    
    xhr.onload = function() {
      //options.callback_xhr && options.callback_xhr((this.status===200)?true:this.statusText);
      options.callback_xhr && options.callback_xhr(this);
    };
    
    xhr.send(formData);
  }

  function canvasSend(canvas){
    //document.body.appendChild(canvas);
    canvas.toBlob(photoSend,'image/jpeg',options.photo_jpeg_quality);
  }

  function photoResize(evt) {
    var file = evt.target.files[0];
    var opts = {
      maxWidth: options.photo_max_size,
      maxHeight: options.photo_max_size,
      canvas: true
    };
    loadImage.parseMetaData(file, function (data) {
      if (data.exif) opts.orientation = data.exif.get('Orientation');
      loadImage(file, canvasSend, opts);
    });

  }

  function makeInputTag(){
    $input = $('<input type="file" accept="image/*" capture="camera" style="visibility:hidden">')
    .appendTo('body')
    .change(photoResize);
    return $input;
  }
  function getInputTag() {
    return $input || makeInputTag();
  }
  function getTimestamp(){return Date.now();}

  return function(options_){ 
    options = $.extend({
      photo_max_size:     Infinity,     // or 800
      photo_jpeg_quality:  0.7,         // 0-1 only for jpeg
      xhr:                 null,        // '/post/path/fotoupload',
      xhr_name:            getTimestamp,// function returns string
      callback_xhr:        null,        // function(s){$div.html((s===true)?'Upload finished':(isNaN(s))?'Error'+s:s + '%');} // true ... ok, number ... percentage, string ... error
      callback_blob:       null,        // function(blob){do_something},
      callback_canvas:     null         // function(canvas){$('#image').attr('src', canvas.toDataUrl());}
    },options_,{
      photo_type:         'image/jpeg', // can not be changed
      photo_ext:          'jpg'        // can not be changed
    });
    getInputTag().trigger('click');
  };
}());
