const express = require('express');
const app = express();
const mongoose = require('mongoose')
const mongoDB = 'mongodb://127.0.0.1/clicker';
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const server = app.listen(3001, function() {
console.log('Server started on port 3001');
});
const session = require('express-session')
const io = require('socket.io')(server);
const MongoStore     = require('connect-mongo')(session); 
const passportSocketIo = require("passport.socketio");
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;
mongoose.connect(mongoDB, { useNewUrlParser: true });
// Get Mongoose to use the global promise library
mongoose.Promise = global.Promise;
//Get the default connection
var db = mongoose.connection;
app.use(cookieParser('testing'));
var sessionStore = new MongoStore({
mongooseConnection: db });

app.use((req, res, next) => {
   res.header('Access-Control-Allow-Origin', '*');
   res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE');
   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested With, Content-Type, Accept');
   next();
});
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;
app.use(session({
        secret: 'testing',
        resave: false,
        saveUninitialized: false,
        store: sessionStore
      }
  ))
app.use(passport.initialize());
app.use(passport.session());
var User = require('./models/User');
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
    passport.serializeUser(function(user, done) {
        done(null, user._id);
});

passport.deserializeUser(function(id, done) {
    User.findOne({_id: id}, function(err, user) {
        console.log(err)
        done(err, user);
    });
});
passport.use('local', new LocalStrategy(
    function(username, password, done) { 
        User.findOne({ 'username' :  username },function(err, user) {
            if (err)
                return done(err);
                // if no user is found, return the message
        if (!user)
                return done(null, false); 
        // if the user is found but the password is wrong
        if (!user.validPassword(password))
            return done(null, false); // create the loginMessage and save it to session as flashdata
          // all is well, return successful user
        return done(null, user);
    });
}));
app.post('/register', (req, res) => {
	createNewUser(req.body)
	.then((returned) => {
			res.redirect('/start')
	}).catch(e => {
		console.log('user exists!')
		res.send('user exists')
	})
})

app.post('/login', (req,res,next)=> {
        passport.authenticate('local', function(err, user, info ) {
          console.log('-------------------')
            if (err) {
                console.log("inside error");
            return next(err); 
            }
            if (!user) {
                console.log("No user");
                res.status(401).send("not user");
            } else {  

                req.logIn(user, function(err) {
                 if (err) { return res.send(err); }
                 console.log(req.user)
                
                res.redirect('/')
              });

            }
        })(req, res, next); 
     });
app.get('/', (req,res) => {
	res.send('Please login or register.')
})
app.get('/start', (req, res) => {
  res.send('ok')
})
let createNewUser = (userInfo) => new Promise((resolve, reject) => {
    User.findOne({ 'username' :  userInfo.username }, function(err, user) {
        // if there are any errors, return the error
        if (err)
        	console.log(err)
        	reject(err)
        // check to see if theres already a user with that email
        if (user) {
            reject(err)
        } else {
            var newUser            = new User();
            newUser.username    = userInfo.username;
            newUser.email    = userInfo.email;
            newUser.password = newUser.generateHash(userInfo.password);
			newUser.save(function(err) {
                resolve(userInfo)
            })
        }                      
    })
})
var userData = [];
var getUserData = (socket) => {
  return userData.find(i => i.socketId == socket)
}
var saveUser = (user) => new Promise((resolve, reject) => {
    User.findOneAndUpdate({_id : user.id}, {
        $set: {
            level : user.level,
            gold : user.gold,
            monsterCount : user.monsterCount,
            dpc: user.dpc,
            dps: user.dps
        }}, (err, user) => {
        resolve(user)
    })
})
let currentUsers = 0;
io.on('connection', function(socket) {
    currentUsers++; 
    console.log('User connected : ' + socket.id)
    console.log('Current Players: ' + currentUsers)
    userData.push({socketId : socket.id})
    socket.on('CheckUser', data => { //TODO: not send all user data, only relevant one.
        User.findOne({ username : data.user}, function(err, user) {
            var pushUser = user
            getUserData(socket.id).data = pushUser
            io.to(socket.id).emit('LOGIN', pushUser)
            console.log(getUserData(socket.id))
        });
    })
	  socket.on('DAMAGE', data => {
        if((data.monsterCurrentHP - data.amount ) <= 0) {
            data.amount = data.monsterCurrentHP;
        }
	    	io.to(socket.id).emit('ATTACK', { amount : data.amount, socketId : socket.id})
	    	console.log('user hit a monster for ' + data.amount + '!')
    })
    socket.on('LOGIN', data => { //Unused for now.

    })
    socket.on('LEVEL-CHANGE', data => {
        if(socket.id == data.socketId)
        {
  	        console.log('saving user ' + getUserData(socket.id).data.username)
  	        getUserData(socket.id).data.level++
  	        console.log('New level is : ' + getUserData(socket.id).data.level)
            saveUser(getUserData(socket.id).data).then( returned => {
                io.to(socket.id).emit('LEVEL-CHANGE', { 
                  goldCount : getUserData(socket.id).data.gold, 
                  level : getUserData(socket.id).data.level, 
                  username: getUserData(socket.id).data.username
                })  
            }).catch(e => console.log(e));
        }
    })
    socket.on('KILL-MONSTER', data => {
            getUserData(socket.id).data.monsterCount++
            if(getUserData(socket.id).data.monsterCount == 11){
                getUserData(socket.id).data.monsterCount = 1;
            }
	    	    let amount =  Math.round(((data.monsterHP / 15) * Math.floor(((0 / 100) + 1))));
	    	    getUserData(socket.id).data.gold = getUserData(socket.id).data.gold + amount
	    	    console.log(`${getUserData(socket.id).data.username} killed a monster and earned ${amount} gold!`)
            saveUser(getUserData(socket.id).data).then( returned => {
  	    	      io.to(socket.id).emit('GOLD', { 
                    goldCount : getUserData(socket.id).data.gold,  
                    monsterCount:  getUserData(socket.id).data.monsterCount, 
                    socketId : socket.id, 
                    username: getUserData(socket.id).data.username
                });
                setTimeout(() => { 
                  io.to(socket.id).emit('READY', { canAttack: true});
                  console.log('sending!')
                }, 2000);
            }).catch(e => console.log(e));
    })
    socket.on('disconnect', data => {
        currentUsers--;
        console.log('Player disconnected : ' + socket.id)
        console.log('Current Players: ' + currentUsers)
    })
});