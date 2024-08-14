var express = require('express');
var app = express();
var http = require('http').Server(app);
var request = require('request');
var async = require('async');
var io = require('socket.io')(http);
var path = require("path");
var Etcd = require('node-etcd');
var cors = require('cors');
var bodyParser = require("body-parser");

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

etcd = new Etcd("http://example-etcd-cluster-client-service:2379");
etcd.mkdirSync('pod-list');

app.post('/scale', function (req, res) {
  var scale = req.body.count;
  console.log('Count requested is: %s', scale);
  var url = "http://localhost:2345/apis/apps/v1/namespaces/default/deployments/puzzle";
  var patchBody = {
    spec: {
      replicas: scale
    }
  };

  request({ url: url, method: 'PATCH', json: patchBody}, function (err, httpResponse, body) {
    if (err) {
      console.error('Failed to scale:', err);
      return res.status(500).send('Failed to scale');
    }
    console.log('Response: ' + JSON.stringify(httpResponse));
    res.status(httpResponse.statusCode).json(body);
  });
});

app.post('/loadtest/concurrent', function (req, res) {
  var count = req.body.count;
  console.log('Count requested is: %s', count);
  var url = "http://puzzle:3000/puzzle/v1/crossword";
  var myUrls = [];
  for (var i = 0; i < req.body.count; i++) {
    myUrls.push(url);
  } 
  async.map(myUrls, function(url, callback) {
    request(url, function(error, response, html){
      if (response && response.hasOwnProperty("statusCode")) {
        console.log(response.statusCode);
      } else {
        console.log("Error: " + error);
      }
    });
  }, function(err, results) {
    console.log(results);
  });
  res.send('concurrent done');
});

app.post('/loadtest/consecutive', function (req, res) {
  var count = req.body.count;
  var url = "http://puzzle:3000/puzzle/v1/crossword";
  var callArray = [];

  for (var i = 0; i < req.body.count; i++) {
    callArray.push(function (cb) {
      setTimeout(function () {
        request(url, function(error, response, html) {
          cb(null, response && response.statusCode);
        });
      }, 100);
    });
  }
  async.series(callArray, function (err, results) {
    var finalCount = results && results.length;
    console.log(`${finalCount} requests sent.`)
  });
  res.send('consecutive done');
});

app.get('/up/:podId', function (req, res) {
  console.log('Server UP: %s', req.params.podId);
  etcd.setSync("pod-list/" + req.params.podId, req.params.podId);
  res.send('up done');
});

app.get('/down/:podId', function (req, res) {
  console.log('Server DOWN: %s', req.params.podId);
  etcd.delSync("pod-list/" + req.params.podId, req.params.podId);
  res.send('down done');
});

app.get('/hit/:podId', function (req, res) {
  var d = new Date();
  var n = d.getTime();

  console.log("Emitting hit from %s", req.params.podId);
  io.emit('hit', { podId: req.params.podId, time: n });
  res.send('hit done')
});

app.get('/pods', function (req, res) {
  try {
    var pods = etcd.getSync("pod-list", { recursive: true });
    console.log('Pods data:', JSON.stringify(pods, null, 2)); 

    let podNodes = [];
    if (pods && pods.body && pods.body.node && pods.body.node.nodes) {
      podNodes = pods.body.node.nodes;
    } else {
      console.error('Invalid pods structure:', pods);
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ pods: podNodes }));
  } catch (error) {
    console.error('Error fetching pods:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.delete('/pods', function (req, res) {
  var pods = etcd.delSync("pod-list/", { recursive: true });
  res.send('pods deleted')
});

io.on('connection', function(socket){
  console.log("Websocket connection established.");
  socket.on('disconnect', function() {
    console.log("Websocket disconnect.");
  })
});

app.get('/', function(req, res){
  res.send('basic GET successful');
});

// Khởi động server
http.listen(3001, function () {
  console.log('Listening on port 3001!');
});
