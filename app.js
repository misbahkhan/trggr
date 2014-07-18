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
var comments = []; 

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

}

getTokens();
getListings();

exports.newpost = function(req, res) {
    console.log(req.body);
    res.end();
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


