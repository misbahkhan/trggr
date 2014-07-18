/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3030);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var request = require('request');

var Parse = require('parse').Parse;
Parse.initialize("fdF95nvmdcNwgUtCzToLgLMFoKgjFUHB8WdoGwty", "hZfyIqOB60P4vySuiRnYOQFsG6ugSQ69KiCBgyos");                                                                       

var api = require('instagram-node').instagram();

api.use({ client_id: '992cfa2cf00e43838ff399ff394019f7',
      client_secret: '7ca2d577e4144dda82a4acc157870b7f' });

api.add_user_subscription('http://www.infinicoins.com/subscription', function(err, result, limit){});

var redirect_uri = 'http://www.infinicoins.com/handleauth';

exports.authorize_user = function(req, res) {
    res.redirect(api.get_authorization_url(redirect_uri, { scope: ['likes'], state: 'a state' }));
};

exports.handleauth = function(req, res) {
    api.authorize_user(req.query.code, redirect_uri, function(err, result) {
        if (err) {
            console.log(err.body);
            res.send("Didn't work"); 
        } else {
            console.log("token: "+result.access_token);
            res.send("Worked"); 
        }
    });
}

exports.subscribe = function(req, res) {
    res.end(req.query.hub_challenge);
}

function islisting(id, access_token) {
    
}

var tokens = []; 
var pictures = [];
var comments = {}; 
var pinglist = {};

function getTokens() {
    var query = new Parse.Query(Parse.User);
    query.find({
        success: function(users) {
            for (var i = 0; i < users.length; ++i){
                var user_token = users[i].get('access_token');
                if( user_token !== undefined){
                    tokens.push( user_token );
                }
            }
            access_token = tokens[0];
        },
        error: function(error) {
            console.log("Error: "+ error.code + " " + error.message); 
        }
    });
}

function getListings() {
    var listings = Parse.Object.extend("listings");
    var listing = new Parse.Query(listings);
    listing.greaterThan("stock_remaining", 0);
    listing.find({
        success: function(results) {
            for(var i = 0; i < results.length; ++i){
                pictures.push(results[i].get('ig_id'));
            }
        },
        error: function(error) {
            console.log("Error: " + error.code + " " + error.message);
        }
    });
}

function getComments() {
    var checking = Parse.Object.extend("checked");
    var check = new Parse.Query(checking);
    check.find({
        success: function(results) {
            for(var i = 0; i < results.length; ++i){
                var picid = results[i].get('pic_id');
                var commentid = results[i].get('comment_id');
                if( !Array.isArray(comments[picid]) ){
                    comments[picid] = []; 
                }
                comments[picid].push(commentid);
            }    
        },
         error: function(error) {
            console.log("Error: " + error.code + " " + error.message);
        }
    });
}

var a

function queue(id, speed) {
    pingList[id] = setInterval(function(){
        
    }, speed);
}

var access_token;
getTokens();
getListings();
getComments(); 

var tag = "test"; 

exports.newpost = function(req, res) {
    res.end();
    var update = req.body; 
    for( var i = 0; i < update.length; ++i){
        var media_id = update[i].data.media_id; 
        var url = "https://api.instagram.com/v1/media/"+media_id+"?access_token="+access_token;
        request( url, function( error, response, body ) {
            if (!error && response.statusCode == 200) {
                console.log(response.headers["x-ratelimit-remaining"]);
                var data = JSON.parse(body); 
                data = data.data;
                console.log(data);
                if( data.tags.indexOf( tag ) !== -1 ){
                    console.log("is trggr image");
                } else {
                    console.log("is not trggr image");
                }
            } else if (response.statusCode == 400) {
                console.log(body);
            }     
        }); 
    }
    console.log(update.length);
}

app.get('/', routes.index);
app.get('/users', user.list);
app.get('/authorize_user', exports.authorize_user);
app.get('/handleauth', exports.handleauth);
app.get('/subscription', exports.subscribe);
app.post('/subscriptions', exports.newpost);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


