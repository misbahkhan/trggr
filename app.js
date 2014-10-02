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
            res.json("Didn't work"); 
        } else {
            console.log("token: "+result.access_token);
            res.json(result);
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
var pricelist = {};
var listingtitles = {};

function getTokens() {
    access_token = "1406166242.992cfa2.e903f530cfe044f391958163a757c67c"; 
    return;
    
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
                pricelist[results[i].get('ig_id')] = results[i].get('price');
                listingtitles[results[i].get('ig_id')] = results[i].get('caption');
                pictures.push(results[i].get('ig_id'));
                queue( results[i].get('ig_id'), 5000 ); 
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
                cacheComment(picid, commentid);
            }    
        },
         error: function(error) {
            console.log("Error: " + error.code + " " + error.message);
        }
    });
}

function cacheComment(id, commentid) {
    if( !Array.isArray(comments[id]) ) {
        comments[id] = []; 
    }
    if(comments[id].indexOf(commentid) === -1){
        comments[id].push(commentid);
    }
}

function databaseComment(id, comment) {
    var checking = Parse.Object.extend("checked");
    var check = new checking(); 
    check.set("pic_id", id);
    check.set("comment_id", comment.id);
    check.set("person_id", comment.from.id);
    check.save(null, {
        success: function(object) {
        }, 
        error: function(object, error) {
            console.log('Failed to create new object, with error code: ' + error.message);
        }
    });  
}

function maketrggr(id, comment) {
    var trggr = Parse.Object.extend("trggrs");
    var mktrggr = new trggr();
    mktrggr.set("comment", comment.text);
    mktrggr.set("comment_id", comment.id);
    mktrggr.set("person_id", comment.from.id);
    mktrggr.set("pic_id", id);
    mktrggr.set("state", "pending");
    mktrggr.set("trggred_time", comment.created_time);
    mktrggr.set("price", pricelist[id]);
    mktrggr.set("caption", listingtitles[id]);
    mktrggr.save(null, {
        success: function (mktrggr) {
            console.log("New trggr created with objectId: " + mktrggr.id);
        },
        error: function(mktrggr, error) {
            console.log("Failed to create new trggr, with error code: " + error.message);    
        }
    });    
}

function handleComment(id, comment) {
    if( Array.isArray(comments[id]) ){
        if(comments[id].indexOf(comment.id) !== -1){                    
            console.log("found in recent cache");
            return;
        }
    }    
    
    cacheComment(id, comment.id);
        
    var checking = Parse.Object.extend("checked");
    var check = new Parse.Query(checking);
    check.equalTo("comment_id", comment.id);
    check.count({
        success: function(count) {
            if(count < 1){
                databaseComment(id, comment);
                var query = new Parse.Query(Parse.User);
                query.equalTo("ig_id", comment.from.id);
                query.first({
                    success: function(user) {
                        var trggrword = user.get("keyword"); 
                        var text = comment.text; 
                        textarr = text.split(" ");
                        if(textarr.indexOf(trggrword) !== -1){
                            maketrggr(id, comment);                    
                        }else{
                            console.log("isn't trggr");
                            return;
                        }
                    }, 
                    error: function(user) {
                        console.log("Error: " + error.code + " " + error.message);
                    }
                });
            }else{
                console.log("comment checked");
                return;
            }
        },
        error: function(error) {
            console.log("Error: " + error.code + " " + error.message);        
        }
    });
}

function destroy (obj) {
    obj.destroy({
        success: function(result) {
            console.log("deleted object");     
        }, 
        error: function(result, error) {
            console.log("Error: " + error.code + " " + error.message);
        }
    });
}

function deleteComments (pic_id) {
    var checked = Parse.Object.extend("checked");
    var checking = new Parse.Query(checked);
    checking.equalTo("pic_id", pic_id);
    checking.find({
        success: function(results) {
            for (var i = 0; i < results.length; ++i) {
                destroy( results[i] ); 
            }    
        }, 
        error: function(error) {
            console.log("Error: " + error.code + " " + error.message);        
        }
    });
}

function deleteListing (id) {
    var listings = Parse.Object.extend("listings"); 
    var listing = new Parse.Query(listings);
    listing.equalTo("ig_id", id);
    listing.find({
        success: function(results) {
            for (var i = 0; i < results.length; ++i) {
                destroy( results[i] ); 
            }
        },
        error: function (error) {
            console.log("Error: " + error.code + " " + error.message);  
        }
    });
}

function handleDeleted (id) {
    clearInterval( pinglist[id] );
    delete pinglist[id];
    delete comments[id]; 
    deleteListing(id); 
    deleteComments(id);
}

function queue(id, speed) {
    pinglist[id] = setInterval(function(){
        var url = "https://api.instagram.com/v1/media/"+id+"/comments?access_token="+access_token;
        request( url, function( error, response, body ) {
            if (!error && response.statusCode == 200) {
                var data = JSON.parse(body);
                data = data.data; 
                if(data.length < 1) return;
                for(var i = 0; i < data.length; ++i){
                    handleComment(id, data[i]);
                }               
            } else { //if (response.statusCode == 400) {
                handleDeleted(id);
                console.log(body);
            }            
        });            
    }, speed);
}

function changespeed(id, speed) {
    clearTimeout( pingList[id] );
    queue(id, speed);
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
                if( data.tags.length < 2 ){
                    console.log("not enough tags"); 
                    return; 
                }
                if( data.tags.indexOf( tag ) !== -1 ){
                    var price = 1000;

                    price = data.tags[data.tags.length - 1];
                    price *= 100; 
                    
                    var listings = Parse.Object.extend("listings");
                    var listing = new listings();
                    listing.set("ig_id", data.id);
                    listing.set("created_by_ig_uid", data.user.id);
                    listing.set("posted_on", data.created_time);
                    listing.set("caption", data.caption.text);
                    listing.set("stock", 10);
                    listing.set("stock_remaining", 1);
                    listing.set("price", price); 
                    listing.set("tags", data.tags);
                    listing.set("url", data.images.standard_resolution.url);
                    listing.save(null, {
                        success: function(listing) {
                            queue(data.id, 5000);
                            listingtitles[data.id] = data.caption.text;
                            pricelist[data.id] = price; 
                        }, 
                        error: function(listing, error) {
                            console.log('Failed to create new object, with error code: ' + error.message);
                        }
                    });
                } else {
                    console.log("is not trggr image");
                }
            } else if (response.statusCode == 400) {
                //handle deleted image
                console.log(body);
            }     
        }); 
    }
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


