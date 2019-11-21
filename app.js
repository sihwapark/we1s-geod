var express = require('express');
var https = require('https');
const dotenv = require('dotenv');
const router = express.Router();

var app = express();

dotenv.config();
const apiKey = process.env.GOOGLE_MAPS_API_KEY;

var googleMapAPI = "";
https.get('https://maps.googleapis.com/maps/api/js?callback=initMap&libraries=visualization,geometry&key=' + apiKey, function(res, error) {

  res.on('data', function(data) {
    googleMapAPI += data;
  });

  res.on('end', function() {

  });

  res.on('error', function(e) {
    console.log(e.message);
  });
});

router.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');	
});

router.get('/google-api-request', function (req, res) {
	res.send(googleMapAPI);
});

app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/public/script'));
app.use(express.static(__dirname + '/public/data'));
app.use(express.static(__dirname + '/public/images'));

app.set('port', (process.env.PORT || 5000));
app.use('/', router);

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});