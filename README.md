# camera
using an invisible HTML5 input tag to capture a foto on ios and android. Foto is resized (bilinear) and uploaded by XHR with progress info

## Usage example
####Browser


      var $info = $('#photo_info');
      var showInfo = function(s){// true ... ok, number ... percentage, string ... error
            $info.html((s.response)?s.response:(isNaN(s))?s:s + '%');
      };
      var showPhoto = function(url){$('#image').attr('src', url);};

      $('#photo_button').click(function(){
        camera({
          photo_max_size:     800,       //resize to 800 pixel (height or width)
          photo_jpeg_quality: 0.7,       //jpeg-quality from 0 to 1.0
          xhr:                '/foto',   //url of where the photo shall be uploaded
          callback_xhr:       showInfo,  //show some info on upload progress
          callback_dataURL:   showPhoto  //display the photo in an img-element
        });
      });



####Server

    var formidable = require('formidable');
    router.post('/foto', function(req, res) {
       var form = new formidable.IncomingForm();
       form.uploadDir = './data/location';
       form.keepExtensions = true;
       form.maxFieldsSize = 5 * 1024 * 1024;
       form.parse(req, function(err, fields, files) {
          //console.log('files:',files,'fields:',fields);
          var f = files.camera;
          if (!f) return res.send('Error ... no file!');
          //console.log('foto rename: ',f.path,f.name);
          require('fs').rename(f.path, form.uploadDir+'/'+f.name, function(err) {
            if (err) return res.send('foto rename error: ' + err);
            res.send('Got Photo');
          });
        });
      });


##restrictions

Depends on jquery. Only for jpeg.

##tested

ios8, ios9, Android 5

##coming next

-Seperation of Capture and Upload to handle offline situations
-Usage of getUserMedia where possible

##credits

hMatoba https://github.com/hMatoba/MinifyJpegAsync
robertdmun && gokercebeci https://github.com/robertdmunn/canvasResize