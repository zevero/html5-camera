/* global FileReader, FormData, XMLHttpRequest, ArrayBuffer, Uint8Array, Blob, btoa, MinifyJpegAsync */
/* exported camera */
var camera = (function() {
  'use strict';
  var options;
  var $input;
  function byteStringToBlob(byteString) {//or dataURLtoBlob(dataURL)
    var mimeString = options.photo_type;//dataURL.split(',')[0].split(':')[1].split(';')[0];
    //var byteString = atob(dataURL.split(',')[1]);
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);                  //Dont remove
    for (var i = 0; i < byteString.length; i++) { //this
        ia[i] = byteString.charCodeAt(i);         //section!!!
    }
    var BB = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
    if (!BB) return new Blob([ab], {type: mimeString});  
    var bb = new BB();
    bb.append(ab);
    return bb.getBlob(mimeString);
  }
  
  function photoSend(byteString){
    if (options.callback_byteString) options.callback_byteString(byteString);
    if (options.callback_dataURL) {
      var dataURL = 'data:'+options.photo_type+';base64,' + btoa(byteString);
      options.callback_dataURL(dataURL);
    }
    var blob = byteStringToBlob(byteString);
    if (options.callback_blob) options.callback_blob(blob);
    if (!options.xhr && !options.callback_blob && !options.callback_dataURL && !options.callback_byteString)
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

  function photoResize(evt) {
    var files = evt.target.files;
    function minify(e){
      MinifyJpegAsync.minify(e.target.result, options.photo_max_size, photoSend);
    }
    for (var i = 0; i<files.length; i++){
      var f = files[i];
      //if (options.photo_max_size === Infinity) return photoSend(null,f);//this is a now a blob and not a dataURL
      var reader = new FileReader();
      reader.onloadend = minify;
      reader.readAsDataURL(f);
    }


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
      callback_byteString: null,        // function(byteString){do_something},
      callback_dataURL:    null         // function(url){$('#image').attr('src', url);}
    },options_,{
      photo_type:         'image/jpeg', // can not be changed
      photo_ext:          'jpg'        // can not be changed
    });
    getInputTag().trigger('click');
  };
}());

/*jshint ignore:start*/
/* To minify a jpeg image without loosing EXIF.
 * TESTED(24/01/2013): FireFox, GoogleChrome, IE10, Opera
 * Copyright (c) 2013 hMatoba
 * Released under the MIT license
 */

var MinifyJpegAsync = (function () {
    "use strict";
    var that = {};

    that.minify = function (image, new_size, callback) {
        var imageObj = new Image(),
            rawImage = [],
            dataURL = "";

        if (typeof image === "string") {
            if (image.match("data:image/jpeg;base64,")) {
                rawImage = that.decode64(image.replace("data:image/jpeg;base64,", ""));
                dataURL = image;
            } else if (image.match("\xff\xd8")) {
                for (var p=0; p<image.length; p++) {
                    rawImage[p] = image.charCodeAt(p);
                }
                dataURL = "data:image/jpeg;base64," + btoa(image);
            } else {
                throw "MinifyJpeg.minify got a not JPEG data";
            }
        } else {
            throw "First argument must be 'string'.";
        }

        imageObj.onload = function () {
            var segments = slice2Segments(rawImage),
                NEW_SIZE = parseInt(new_size),
                size = imageSizeFromSegments(segments),
                chouhen = (size[0] >= size[1]) ? size[0] : size[1];
            var exif,
                newImage;

            if (chouhen <= NEW_SIZE) {
                newImage = atob(dataURL.replace("data:image/jpeg;base64,", ""));
            } else {
                exif = getExif(segments);
                dataURL = resize(imageObj, segments, NEW_SIZE);
                if (exif.length) {
                    newImage = insertExif(dataURL, exif);
                } else {
                    newImage = atob(dataURL.replace("data:image/jpeg;base64,", ""));
                }
            }

            callback(newImage);
        };
        imageObj.src = dataURL;

    };


    that.encode64 = function (input) {
        var binStr = "";
        for (var p=0; p<input.length; p++) {
            binStr += String.fromCharCode(input[p]);
        }
        return btoa(binStr);
    };


    that.decode64 = function (input) {
        var binStr = atob(input);
        var buf = [];
        for (var p=0; p<binStr.length; p++) {
            buf[p] = binStr.charCodeAt(p);
        }
        return buf;
    };


    var imageSizeFromSegments = function (segments) {
        var seg,
            width,
            height,
            SOF = [192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207];
        for (var x = 0; x < segments.length; x++) {
            seg = segments[x];
            if (SOF.indexOf(seg[1]) >= 0) {
                height = seg[5] * 256 + seg[6];
                width = seg[7] * 256 + seg[8];
                break;
            }
        }
        return [width, height];
    };


    var getImageSize = function (imageArray) {
        var segments = slice2Segments(imageArray);
        return imageSizeFromSegments(segments);
    };


    var slice2Segments = function (rawImageArray) {
        var head = 0,
            segments = [];
        var length,
            endPoint,
            seg;

        while (1) {
            if (rawImageArray[head] == 255 && rawImageArray[head + 1] == 218) {
                break;
            }
            if (rawImageArray[head] == 255 && rawImageArray[head + 1] == 216) {
                head += 2;
            } else {
                length = rawImageArray[head + 2] * 256 + rawImageArray[head + 3];
                endPoint = head + length + 2;
                seg = rawImageArray.slice(head, endPoint);
                segments.push(seg);
                head = endPoint;
            }
            if (head > rawImageArray.length) {
                break;
            }
        }

        return segments;
    };


    var resize = function (img, segments, NEW_SIZE) {
        var size = imageSizeFromSegments(segments),
            width = size[0],
            height = size[1],
            chouhen = (width >= height) ? width : height,
            newSize = NEW_SIZE,
            scale = parseFloat(newSize) / chouhen,
            newWidth = parseInt(parseFloat(newSize) / chouhen * width),
            newHeight = parseInt(parseFloat(newSize) / chouhen * height);
        var canvas,
            ctx,
            srcImg,
            newCanvas,
            newCtx,
            destImg;

        canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        srcImg = ctx.getImageData(0, 0, width, height);

        newCanvas = document.createElement('canvas');
        newCanvas.width = newWidth;
        newCanvas.height = newHeight;
        newCtx = newCanvas.getContext("2d");
        destImg = newCtx.createImageData(newWidth, newHeight);
        bilinear(srcImg, destImg, scale);

        newCtx.putImageData(destImg, 0, 0);
        return newCanvas.toDataURL("image/jpeg");
    };


    var getExif = function (segments) {
        var seg;
        for (var x = 0; x < segments.length; x++) {
            seg = segments[x];
            if (seg[0] == 255 && seg[1] == 225) //(ff e1)
            {
                return seg;
            }
        }
        return [];
    };


    var insertExif = function (dataURL, exifArray) {
        var buf = that.decode64(dataURL.replace("data:image/jpeg;base64,", ""));
        if (buf[2] != 255 || buf[3] != 224) {
            throw "Couldn't find APP0 marker from resized image data.";
        }
        var app0_length = buf[4] * 256 + buf[5];
        var newImage = [255, 216].concat(exifArray, buf.slice(4 + app0_length));
        var jpegData = "";
        for (var p=0; p<newImage.length; p++) {
            jpegData += String.fromCharCode(newImage[p]);
        }
        return jpegData;
    };


    // compute vector index from matrix one
    var ivect = function (ix, iy, w) {
        // byte array, r,g,b,a
        return ((ix + w * iy) * 4);
    };


    var inner = function (f00, f10, f01, f11, x, y) {
        var un_x = 1.0 - x;
        var un_y = 1.0 - y;
        return (f00 * un_x * un_y + f10 * x * un_y + f01 * un_x * y + f11 * x * y);
    };


    var bilinear = function (srcImg, destImg, scale) {
        // taking the unit square
        var srcWidth = srcImg.width;
        var srcHeight = srcImg.height;
        var srcData = srcImg.data;
        var dstData = destImg.data;
        var i, j;
        var iyv, iy0, iy1, ixv, ix0, ix1;
        var idxD, idxS00, idxS10, idxS01, idxS11;
        var dx, dy;
        var r, g, b, a;
        for (i = 0; i < destImg.height; ++i) {
            iyv = (i + 0.5) / scale - 0.5;
            iy0 = Math.floor(iyv);
            iy1 = (Math.ceil(iyv) > (srcHeight - 1) ? (srcHeight - 1) : Math.ceil(iyv));
            for (j = 0; j < destImg.width; ++j) {
                ixv = (j + 0.5) / scale - 0.5;
                ix0 = Math.floor(ixv);
                ix1 = (Math.ceil(ixv) > (srcWidth - 1) ? (srcWidth - 1) : Math.ceil(ixv));
                idxD = ivect(j, i, destImg.width);
                idxS00 = ivect(ix0, iy0, srcWidth);
                idxS10 = ivect(ix1, iy0, srcWidth);
                idxS01 = ivect(ix0, iy1, srcWidth);
                idxS11 = ivect(ix1, iy1, srcWidth);

                dx = ixv - ix0;
                dy = iyv - iy0;

                //r
                dstData[idxD] = inner(srcData[idxS00], srcData[idxS10],
                    srcData[idxS01], srcData[idxS11], dx, dy);

                //g
                dstData[idxD + 1] = inner(srcData[idxS00 + 1], srcData[idxS10 + 1],
                    srcData[idxS01 + 1], srcData[idxS11 + 1], dx, dy);

                //b
                dstData[idxD + 2] = inner(srcData[idxS00 + 2], srcData[idxS10 + 2],
                    srcData[idxS01 + 2], srcData[idxS11 + 2], dx, dy);

                //a
                dstData[idxD + 3] = inner(srcData[idxS00 + 3], srcData[idxS10 + 3],
                    srcData[idxS01 + 3], srcData[idxS11 + 3], dx, dy);

            }
        }
    };


    return that;
})();