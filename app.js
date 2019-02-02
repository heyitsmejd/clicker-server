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
var Heroes = require('./models/Heroes');
var Monster = require('./models/Monster');
var ItemDb = require('./models/ItemDb');
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
app.post('/api/register', (req, res) => {
	createNewUser(req.body)
	.then((returned) => {
			res.redirect('/start')
	}).catch(e => {
		console.log('user exists!')
		res.send('user exists')
	})
})

app.post('/api/login', (req,res,next)=> {
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
            newUser.nextHero = heroes[0]
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
var getUserHeroData = (id) => {

}
var saveUser = (user) => new Promise((resolve, reject) => {
    User.findOneAndUpdate({_id : user.id}, {
        $set: {
            level : user.level,
            gold : user.gold,
            monsterCount : user.monsterCount,
            inventory : user.inventory,
            goldBonus : user.goldBonus,
            dps : user.dps,
            dpc : user.dpc,
            equippedWeapon : user.equippedWeapon,
            equippedAmulet : user.equippedAmulet,
            equippedRing : user.equippedRing,
            equippedScroll : user.equippedScroll
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
            pushUser.password = undefined
            pushUser.email = undefined
            getUserData(socket.id).data = pushUser
            if(getUserData(socket.id).data.monsterCount > 10){
                getUserData(socket.id).data.monsterCount = 10
            }
            let currentLevelMon =  Monster.levels.find(level => level.level ==  getUserData(socket.id).data.level)
            getUserData(socket.id).data.currentMonster = currentLevelMon.list.find((i, index) => index == (getUserData(socket.id).data.monsterCount - 1))
            io.to(socket.id).emit('LOGIN', getUserData(socket.id).data)
        });
    })
	  socket.on('DAMAGE', data => {
        var amount = getUserData(socket.id).data.dpc
        if((getUserData(socket.id).data.monsterCurrentHP -  amount ) <= 0) {
            amount = getUserData(socket.id).data.monsterCurrentHP;
        }
	    	io.to(socket.id).emit('ATTACK', { amount : amount, event : data.event})
	    	console.log(`${getUserData(socket.id).data.username} hit a monster for ${amount} !`)
    })
    socket.on('EQUIP', data => {
        if(data.itemType == 0){
            if(getUserData(socket.id).data.equippedWeapon.name){ //if equipped weapon exists, remove DPC bonus from it.
                getUserData(socket.id).data.inventory.push(getUserData(socket.id).data.equippedWeapon)
                getUserData(socket.id).data.dpc = getUserData(socket.id).data.dpc - getUserData(socket.id).data.equippedWeapon.bonusAmount
                getUserData(socket.id).data.equippedWeapon = {}
            }
            let equipItem =  getUserData(socket.id).data.inventory.find(i => i.id === data.id)
            let fileteredInv =  getUserData(socket.id).data.inventory.filter(i => i.id != data.id)
            getUserData(socket.id).data.dpc = getUserData(socket.id).data.dpc + equipItem.bonusAmount
            getUserData(socket.id).data.equippedWeapon = equipItem
            getUserData(socket.id).data.inventory = fileteredInv // So we remove it from inventory after adding it to Equipped slot.
            // then emit socket... and update DPC on client side... save user.
            console.log(getUserData(socket.id).data.inventory)
            console.log('========')
            saveUser(getUserData(socket.id).data).then( returned => {
                io.to(socket.id).emit('EQUIPPED', { 
                    equippedWeapon : getUserData(socket.id).data.equippedWeapon, 
                    inventory : getUserData(socket.id).data.inventory,
                    dpc : getUserData(socket.id).data.dpc
                })
            }).catch(e => console.log(e));    
        }
    })
    socket.on('LEVEL-CHAR', data => {
          var char = heroes.find( slot => slot.name == data.name)
        //   let totalLevelCost = this.getLevelCost(charName);
        //   let endLevel = char.level + this.levelRate;
        //     if(this.goldCount >= totalLevelCost)
        //     {
        //       this.goldCount = this.goldCount - totalLevelCost
        //       char.level = endLevel;
        //       this.calcExtraDps(charName)
        //       char.cost = Math.round(char.baseCost * (1.07 * char.level))
        //       //Lets update our DPS total now.
        //       var totalDps = 0
        //       this.characters.forEach(slot => {
        //         if(slot.bought)
        //         {
        //           totalDps = totalDps + slot.dps
        //         }
        //       })
        //       this.dps = totalDps
        //     }
        // },        
    })
    socket.on('LOGIN', data => { //Unused for now.

    })
    socket.on('BOSS-START', data => { //Start boss round
        io.to(socket.id).emit('BOSS-START', { timeLimit : 30000 })
        setTimeout(() => io.to(socket.id).emit('BOSS-END', {}), 30000)
    })
    socket.on('BOSS-END', data => { //Unused for now.
        // Check if boss killed before time ended
        if(data.bossHP > 0){
            getUserData(socket.id).data.bossKilled = false
            console.log('User failed to defeat boss on level : ' + getUserData(socket.id).data.level)
            console.log('Putting them back on previouss level at 10/10.')
            getUserData(socket.id).data.level--
            let bossFight = false
            saveUser(getUserData(socket.id).data).then( returned => {
                io.to(socket.id).emit('DOWN-LEVEL', { 
                  monsterCount : 10,
                  level : getUserData(socket.id).data.level, 
                  bossKilled: getUserData(socket.id).data.bossKilled
                })  
            }).catch(e => console.log(e));            
        }
        // If not, repeat previous round at 10/10... Have button shown to go back to boss.

        // If so, go to new round, change mons count to 1/10 and start new level.
        // if(data.bossHP <= 0){

        // }
    })
    socket.on('BUY-CHAR', data => {
     var buyingHero = heroes.find( slot => slot.name == data.name )
        buyHero(getUserData(socket.id).data._id, buyingHero.name, buyingHero.baseCost, socket.id).then(res => {
            getUserData(socket.id).data.dps = res.dps
            getUserData(socket.id).data.gold = res.gold
            io.to(socket.id).emit('BUY-CHAR', { bought : res.heroes, next: res.nextHero, gold: res.gold, dps : res.dps })
        }).catch(e => {
            //This should only happen if the user has the Hero
            console.log(e)
        })
     })
    socket.on('LEVEL-CHANGE', data => {
            console.log(data)
            // getUserData(socket.id).data.monsterCount = 1
  	        console.log('saving user ' + getUserData(socket.id).data.username)
  	        getUserData(socket.id).data.level++
  	        console.log('New level is : ' + getUserData(socket.id).data.level)
             getUserData(socket.id).data.bossFight = data.isBoss
            console.log(getUserData(socket.id).data.level)
            let currentLevelMon =  Monster.levels.find(level => level.level ==  getUserData(socket.id).data.level)
            getUserData(socket.id).data.currentMonster = currentLevelMon.list[0]
            console.log(getUserData(socket.id).data.currentMonster)
            if(getUserData(socket.id).data.level % 5 === 0)
            {
                console.log('Boss level')
                getUserData(socket.id).data.bossFight = true
                saveUser(getUserData(socket.id).data).then( returned => {
                    io.to(socket.id).emit('LEVEL-CHANGE', { 
                      monsterCount : 1,
                      goldCount : getUserData(socket.id).data.gold, 
                      level : getUserData(socket.id).data.level, 
                      username: getUserData(socket.id).data.username,
                      bossFight: getUserData(socket.id).data.bossFight,
                      currentMonster: getUserData(socket.id).data.currentMonster
                    })  
                }).catch(e => console.log(e));
            } else {
                console.log('Regular level')
                getUserData(socket.id).data.bossFight = false
                saveUser(getUserData(socket.id).data).then( returned => {
                    io.to(socket.id).emit('LEVEL-CHANGE', { 
                      monsterCount : 1,
                      goldCount : getUserData(socket.id).data.gold, 
                      level : getUserData(socket.id).data.level, 
                      username: getUserData(socket.id).data.username,
                      bossFight: getUserData(socket.id).data.bossFight,
                      currentMonster: getUserData(socket.id).data.currentMonster
                    })  
                }).catch(e => console.log(e));                
            }
    })
    socket.on('KILL-MONSTER', data => {
            if(getUserData(socket.id).data.currentMonster.hasDrop){
                let dropItem = ItemDb.items.find(i => i.id === getUserData(socket.id).data.currentMonster.hasDrop)
                console.log('we should get item : ' + dropItem.name)
                let itemDrops = []
                itemDrops.push(dropItem)
                getUserData(socket.id).data.inventory.push(dropItem)
                io.to(socket.id).emit('ITEM-DROP', {
                    inventory : getUserData(socket.id).data.inventory,
                    itemDrops : itemDrops
                })
                console.log(getUserData(socket.id).data.inventory)
            }
        //    console.log(data)
            if(!data.isBoss){
                if(getUserData(socket.id).data.monsterCount == 11){
                    getUserData(socket.id).data.monsterCount = 1
                }
                if(getUserData(socket.id).data.monsterCount < 11){
                    getUserData(socket.id).data.monsterCount++
                } else {
                getUserData(socket.id).data.monsterCount = 1
                }
            }
            if(getUserData(socket.id).data.bossKilled == false) {
                getUserData(socket.id).data.monsterCount = 10
            }

	    	    let amount =  Math.round(((data.monsterHP / 15) * Math.floor(((0 / 100) + 1))));
	    	    getUserData(socket.id).data.gold = getUserData(socket.id).data.gold + amount
	    	    console.log(`${getUserData(socket.id).data.username} killed a monster and earned ${amount} gold!`)
            let currentLevelMon =  Monster.levels.find(level => level.level ==  getUserData(socket.id).data.level)
            getUserData(socket.id).data.currentMonster = currentLevelMon.list.find((i, index) => index == (getUserData(socket.id).data.monsterCount))                    
           // console.log(getUserData(socket.id).data.currentMonster)
            saveUser(getUserData(socket.id).data).then( returned => {
  	    	      io.to(socket.id).emit('GOLD', { 
                    goldCount : getUserData(socket.id).data.gold,  
                    monsterCount:  getUserData(socket.id).data.monsterCount, 
                    socketId : socket.id, 
                    username: getUserData(socket.id).data.username,
                    currentMonster : getUserData(socket.id).data.currentMonster
                     // isBoss: getUserData(socket.id).data.currentMonster.isBoss
                });
                setTimeout(() => { 
                  io.to(socket.id).emit('READY', { canAttack: true});
                }, 1000);
            }).catch(e => console.log(e));
    })
    socket.on('disconnect', data => {
        currentUsers--;
        console.log('Player disconnected : ' + socket.id)
        console.log('Current Players: ' + currentUsers)
    })
});
let buyHero = (id, heroName, cost, socket) => new Promise((resolve, reject) => {
    console.log(id, heroName, cost, socket)
    User.findOne({ '_id' :  id }, function(err, user) {
        // if there are any errors, return the error
        if (err)
            reject(err)
        if (user) {
            if(user.heroes.length > 0) {
            let owned = user.heroes.filter(i => i.name == heroName)
            if(owned.length > 0){
                    console.log('user already owns hero!')
                   return reject(user)
            }}
            
            if(user.gold >= cost){
                var buyIndex = heroes.findIndex( slot => slot.name == heroName )
                if(buyIndex + 1 >= heroes.length) {
                    User.findOneAndUpdate({ '_id' :  id }, {$push: { 
                    heroes : heroes[buyIndex],
                    },
                    dps : user.dps + heroes[buyIndex].baseDps,
                    gold : user.gold - cost,
                    nextHero : {}
                }, {new: true}, (e, result) => {
                    if(e){
                            reject(e)
                        } else {
                            let res = getUserData(socket).data
                            console.log(result)
                             return resolve(result)
                        }
                })
                } else {
                    User.findOneAndUpdate({ '_id' :  id }, {$push: { 
                    heroes : heroes[buyIndex],
                    },
                    dps : user.dps + heroes[buyIndex].baseDps,
                    gold : user.gold - cost,
                    nextHero : heroes[buyIndex+1]
                    }, {new: true}, (e, result) => {
                        if(e){
                            reject(e)
                        } else {
                            console.log(result)
                            return resolve(result)
                        }
                        
                    })
                }
            }
             else {
                console.log('user has insufficient funds')
                 return reject(user)
            }
        }                      
    })
})
var heroes = [
      { name: 'Luna',
        fullImg: 'luna.jpg',
        headImg: 'luna-head.jpg',
        dps: 1,
        level: 1,
        baseDps: 1,
        baseCost: 10,
        cost: 10 },
      { name: 'Suyeon',
        fullImg: 'suyeon.jpg',
        headImg: 'suyeon-head.jpg',
        dps: 5,
        level: 1,
        baseDps: 5,
        baseCost: 49,
        cost: 49 },
      { name: 'Yukki',
        fullImg: 'yukki.jpg',
        headImg: 'yukki-head.jpg',
        dps: 19,
        level: 1,
        baseDps: 19,
        baseCost: 240,
        cost: 240 },
      { name: 'Mikon',
        fullImg: 'mikon.jpg',
        headImg: 'mikon-head.jpg',
        dps: 70,
        level: 1,
        baseDps: 70,
        baseCost: 1176,
        cost: 1176 },
      { name: 'Fate',
        fullImg: 'fate.jpg',
        headImg: 'fate-head.jpg',
        dps: 257,
        level: 1,
        baseDps: 257,
        baseCost: 5762,
        cost: 5762 },
      { name: 'Albedo',
        fullImg: 'albedo.jpg',
        headImg: 'albedo-head.jpg',
        dps: 941,
        level: 1,
        baseCost: 28234,
        baseDps: 28334,
        cost: 28234 },
      ]