var fs = require('fs');
var http = require('http');

var express = require('express');
var multer = require('multer');
var serveStatic = require('serve-static')
var app = express();
var server = http.createServer(app);
var port = 6001;

app.use("/", serveStatic(__dirname + "/"));

// Start up the server on the port specified in the config
server.listen(port, '0.0.0.0', port, function() {
});

app.use(multer({
    dest: './uploads/',
    rename: function (fieldname, filename) {
        return filename.replace(/\W+/g, '-').toLowerCase() + Date.now()
    }
}));

app.post('/upload', function (req, res) {
    console.log(req.files);
    res.send({success:true, files: req.files});
});

console.log('Server - listening on port: ' + port);
