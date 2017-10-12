var redis = require("redis")
var express = require('express')
var app = express()



// parses the VCAP_SERVICES env var and looks for redis service instances
function getVcapServices() {
  var vcstr = process.env.VCAP_SERVICES;
  if (vcstr != null && vcstr.length > 0 && vcstr != '{}') {
    console.log("found VCAP_SERVICES: " + vcstr)

    var vcap = JSON.parse(vcstr);
    if (vcap != null) {
      if (vcap.hasOwnProperty("p.redis")) {
        console.log("found redis instance: " + vcap["p.redis"][0].name);
        return vcap["p.redis"][0]
      }
      else if (vcap.hasOwnProperty("p-redis")) {
        console.log("found redis instance: " + vcap["p-redis"][0].name);
        return vcap["p-redis"][0]
      }
      else {
        console.log("ERROR: no redis service bound!")
      }
    }
    else {
      console.log("ERROR: no redis service bound!")
    }
  }
  else {
    console.log("ERROR: VCAP_SERVICES does not contain a redis block")
  }
  return null
}

// pulls the necessary connection info out of the parsed VCAP_SERVICES block for
// the redis connection
function getRedisInfo(vcap) {
  var info = {}
  info["host"] = vcap["credentials"]["host"]
  info["port"] = vcap["credentials"]["port"]
  info["password"] = vcap["credentials"]["password"]
  return info
}


// set the port to listen on; for apps in PCF it's important to listen on $PORT (usually 8000)
app.set('port', (process.env.PORT || 8080))


// this method looks in VCAP_SERVICES for a redis service instance and outputs the 
// host / port / password info to the response
app.get('/', function(request, response) {
  console.log("Getting Redis connection info from the environment...")

  var vcap = getVcapServices()
  if (vcap != null) {
    var info = getRedisInfo(vcap)
    console.log("connection info: " + info.host + " / " + info.port + " / " + info.password)
    response.send("connection info: " + info.host + " / " + info.port + " / " + info.password)
  }
  else {
    console.log("ERROR: VCAP_SERVICES does not contain a redis block or no redis bound")
    response.send("ERROR: VCAP_SERVICES does not contain a redis block or no redis bound")
  }
})


// this method sets a key in the bound redis to the value you specify. make your request to
// /set?kn=NAME&kv=VALUE
app.get('/set', function(request, response) {
  console.log("connecting to redis to set key")
  if (!request.query.hasOwnProperty("kn") || !request.query.hasOwnProperty("kv")) {
    console.log("ERROR: key or val unspecified")
    response.send("ERROR: key or val unspecified")
  }
  else {
    var info = getRedisInfo(getVcapServices())
    client = redis.createClient(info)
    client.on("error", function (err) {
      console.log("Error " + err);
    });

    client.set(request.query.kn, request.query.kv)
    response.send("set key: " + request.query.kn + " to val: " + request.query.kv)
  }
})


// this method retrieves the value of a given key in the bound redis instance. make your request 
// to /get?kn=NAME
app.get('/get', function(request, response) {
  console.log("connecting to redis to get key")
  if (!request.query.hasOwnProperty("kn")) {
    console.log("ERROR: key unspecified")
    response.send("ERROR: key unspecified")
  }
  else {
    var info = getRedisInfo(getVcapServices())
    client = redis.createClient(info)
    client.on("error", function (err) {
      console.log("Error " + err);
    });

    client.get(request.query.kn, function(err, reply) {
      console.log("reply was: " + reply)
      response.send(reply)
    })
  }
})


// start listening for connections
app.listen(app.get('port'), function() {
  console.log("Node app is running on port:" + app.get('port'))
})
