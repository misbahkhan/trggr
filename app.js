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

var api = require('instagram-node').instagram();

api.use({ client_id: '992cfa2cf00e43838ff399ff394019f7',
      client_secret: '7ca2d577e4144dda82a4acc157870b7f' });


var redirect_uri = 'http://www.infinicoisn.com/handleauth';

exports.authorize_user = function(req, res) {
    res.redirect(api.get_authorization_url(rediret_url, { scope: ['likes'], state: 'a state' }));
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

app.get('/', routes.index);
app.get('/users', user.list);
app.get('/authorize_user', exports.authorize_user);
app.get('/handleauth', exports.handleauth);


http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


