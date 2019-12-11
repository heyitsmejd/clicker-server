//#!/usr/bin/env node
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
var expressSession = require("express-session");
var sessionMiddleware = expressSession({
    name: "testing",
    secret: "testing",
    store: new (require("connect-mongo")(expressSession))({
        url: "mongodb://localhost/clicker"
    })
});
app.use(sessionMiddleware);

const io = require('socket.io')(server)
app.io = io;
// const io = require('socket.io')(server).use(function(socket, next) {
//     sessionMiddleware(socket.request, socket.request.res, next);
// });
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
app.use((req, res, next) => {
   res.header('Access-Control-Allow-Origin', '*');
   res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE');
   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested With, Content-Type, Accept');
   req.io = io;
   next();
});
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;
app.use(passport.initialize());
app.use(passport.session());
var User = require('./models/User');
var Heroes = require('./models/Heroes');
var Monster = require('./models/Monster');
var ItemDb = require('./models/ItemDb');
Monster.initialize();
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
    passport.serializeUser(function(user, done) {
        done(null, user._id);
});
mongoose.set('useFindAndModify', false);
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
    console.log()
	createNewUser(req.body).then((returned) => {
            loginProcess(req.body.socket, req.body.username)
			res.send(req.body.username)
	}).catch(e => {
        console.log(e)		
	})
})
app.post('/api/login', (req,res,next) => {
        passport.authenticate('local', function(err, user, info ) {
            if (err) {
                 res.status(401).send("Invalid username or password.");
            return next(err); 
            }
            if (!user) {
                res.status(401).send("Invalid username or password.");
            } else {  
                req.logIn(user, function(err) {
                 if (err) { return res.send(err); }
                 username = user.username
               // console.log(user.username + ' logged in') 
                // console.log(req.body)
             //  console.log(req.app.io.sockets.connected)
               loginProcess(req.body.socket, username)
                res.json('ok')
              });

            }
        })(req, res, next); 
     });
app.get('/', (req,res) => {
	// res.send('Please login or register.')
})
app.get('/start', (req, res) => {
  res.send('ok')
})
const createNewUser = (userInfo) => {
    var promise = new Promise((resolve, reject) => {
        User.findOne({ 'username' :  userInfo.username }, function(err, user) {
            // if there are any errors, return the error
            if (err)
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
    			newUser.save(function(error, result) {
                    resolve(result)
                })
            }                      
        })
    })
    return promise
}
var userData = [];
const getUserData = (socket) => {
  return userData.find(i => i.socketId == socket)
}
const getUserHeroData = (id) => {

}
const saveUser = (user) => {
    var promise = new Promise((resolve, reject) => {
        // if(user.level % 5 == 0){
        //     user.level--
        //     user.monsterCount = 10
        // }
        User.findOneAndUpdate({_id : user.id}, {
            $set: {
                level : user.level,
                gold : user.gold,
                monsterCount : user.monsterCount,
                inventory : user.inventory,
                goldBonus : user.goldBonus,
                bossFight: user.bossfight,
                dps : user.dps,
                dpc : user.dpc,
                equippedWeapon : user.equippedWeapon,
                equippedAmulet : user.equippedAmulet,
                equippedRing : user.equippedRing,
                equippedScroll : user.equippedScroll,
                heroes : user.heroes,
                failedBoss : user.failedBoss,
                heroUpgrades : user.heroUpgrades
               // reborns : user.reborns
            }}, (err, user) => {
            resolve(user)
        })
    })
    return promise 
}

const loginProcess = (socketId, username) => {
    userData.push({socketId : socketId, connected: false})
    var isLoggedIn = false;
        userData.forEach(i => {
            if(typeof i.data !== 'undefined'){
            if(i.data.username == username && i.connected == true){
                    isLoggedIn = true
            }}
        })
        if(isLoggedIn){
            return
        }
        User.findOne({ username : username}, function(err, user) {
            // let findUser = userData.find(i => i.socketId == socketId)
            // findUser.username = username
            var pushUser = user
            pushUser.password = undefined
            pushUser.email = undefined
            getUserData(socketId).data = pushUser
            getUserData(socketId).connected = true
            if(getUserData(socketId).data.monsterCount > 10){
                getUserData(socketId).data.monsterCount = 10
            }
            getUserData(socketId).data.canLoot = true
             getUserData(socketId).data.failedBoss = null
             // if(getUserData(socketId).data.heroes.length < heroes.length){
             //    getUserData(socketId).data.nextHero = heroes[(getUserData(socketId).data.heroes.length + 1)]
             // }
            // 
            getNewMonster(socketId).then(() => {
            io.to(socketId).emit('LOGIN', getUserData(socketId).data)
            console.log('we sent the login')
            setTimeout(() => { 
                  io.to(socketId).emit('READY', { canAttack: true});
                    getUserData(socketId).data.canAttack = true
                   startAutoDPS(socketId)
                    if(getUserData(socketId).data.level % 5 == 0){
                        getUserData(socketId).data.bossFight = true
                        startBossTimer(socketId)
                    }else {
                        getUserData(socketId).data.bossFight = false
                    }
                  
            }, 1000);


            })

        });
}

const getLevelCost = (user, hero) => {
      let totalLevelCost = 0;
      let startingLevel = hero.level;
      let endLevel = hero.level + user.levelRate;
      for (let i = startingLevel; i < endLevel; i++)
      {
          if(i > 25)
          {
            totalLevelCost = totalLevelCost + Math.round(hero.baseCost * (Math.pow(1.07525,i)))
          } else {
              totalLevelCost = totalLevelCost + Math.round(hero.baseCost * (Math.pow(1.06975,i)))
          }
      }
      return totalLevelCost
}

let activeUsers = []
io.on('connection', function(socket) {
    io.to(socket.id).emit('SocketId', {
        socketId : socket.id
    })
    console.log(socket.id + ' connected')

	  socket.on('DAMAGE', data => {
        if(getUserData(socket.id).data.canAttack && getUserData(socket.id).data.currentMonster.monsterCurrentHP > 0){
        var amount = getUserData(socket.id).data.dpc
        
        if((getUserData(socket.id).data.currentMonster.monsterCurrentHP -  amount ) <= 0) {
            amount = getUserData(socket.id).data.currentMonster.monsterCurrentHP;
            killMonster(socket.id)
        } else {
            getUserData(socket.id).data.currentMonster.monsterCurrentHP = getUserData(socket.id).data.currentMonster.monsterCurrentHP - amount
        }
        
	    	io.to(socket.id).emit('ATTACK', { monsterCurrentHP : getUserData(socket.id).data.currentMonster.monsterCurrentHP })
        }
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
            saveUser(getUserData(socket.id).data).then( returned => {
                io.to(socket.id).emit('EQUIPPED', { 
                    equippedWeapon : getUserData(socket.id).data.equippedWeapon, 
                    inventory : getUserData(socket.id).data.inventory,
                    dpc : getUserData(socket.id).data.dpc
                })
            }).catch(e => console.log(e));    
        }
        if(data.itemType == 2){
            if(getUserData(socket.id).data.equippedRing.name){ //if equipped weapon exists, remove DPC bonus from it.
                getUserData(socket.id).data.inventory.push(getUserData(socket.id).data.equippedRing)
                getUserData(socket.id).data.goldBonus = getUserData(socket.id).data.goldBonus - getUserData(socket.id).data.equippedRing.bonusAmount
                getUserData(socket.id).data.equippedRing = {}
            }
            let equipItem =  getUserData(socket.id).data.inventory.find(i => i.id === data.id)
            let fileteredInv =  getUserData(socket.id).data.inventory.filter(i => i.id != data.id)
            getUserData(socket.id).data.goldBonus = getUserData(socket.id).data.goldBonus + equipItem.bonusAmount
            getUserData(socket.id).data.equippedRing = equipItem
            getUserData(socket.id).data.inventory = fileteredInv // So we remove it from inventory after adding it to Equipped slot.
            // then emit socket... and update DPC on client side... save user.
            saveUser(getUserData(socket.id).data).then( returned => {
                io.to(socket.id).emit('EQUIPPED', { 
                    equippedRing : getUserData(socket.id).data.equippedRing, 
                    inventory : getUserData(socket.id).data.inventory,
                    goldBonus : getUserData(socket.id).data.goldBonus
                })
            }).catch(e => console.log(e));    
        }
    })
    socket.on('LEVEL-CHAR', data => {
        let user = getUserData(socket.id).data
        let levelingHero = user.heroes.find(slot => slot.name == data.name)
        let initialCost = levelingHero.baseCost
        let totalLevelCost = getLevelCost(user, levelingHero);
        let endLevel = levelingHero.level + user.levelRate;
            if(user.gold >= totalLevelCost)
            {
              user.gold = user.gold - totalLevelCost
              levelingHero.level = endLevel;
              levelingHero.cost = Math.round(initialCost * (1.07 * levelingHero.level))
              //Update all heroes dps and return to user
              updateDps(socket.id)
            }    
    })
    socket.on('LEVEL-RATE', data => { //Unused for now.
        getUserData(socket.id).data.levelRate = data.levelRate
    })
    socket.on('LOGIN', data => { //Unused for now.

    })
    socket.on('BOSS-END', data => { //Unused for now.
        // Check if boss killed before time ended
        // if(getUserData(socket.id).data.currentMonster.monsterCurrentHP > 0){
        //     getUserData(socket.id).data.bossKilled = false
        //     if(getUserData(socket.id).data.level % 5 == 0){
        //          getUserData(socket.id).data.failedBoss = getUserData(socket.id).data.level
        //          getUserData(socket.id).data.level--
        //     }
        //     getNewMonster(socket.id).then(() => {

        //          getUserData(socket.id).data.bossFight = false
        //         saveUser(getUserData(socket.id).data).then( returned => {
        //             io.to(socket.id).emit('DOWN-LEVEL', { 
        //               monsterCount : 9,
        //               level : getUserData(socket.id).data.level, 
        //               bossKilled: getUserData(socket.id).data.bossKilled,
        //               currentMonster : getUserData(socket.id).data.currentMonster
        //             })  
        //         }).catch(e => console.log(e)); 
        //     }) 
           
        // }
        // if(getUserData(socket.id).data.currentMonster.monsterCurrentHP <= 0){
        //     getUserData(socket.id).data.failedBoss = false;
        // }
        // If not, repeat previous round at 10/10... Have button shown to go back to boss.

        // If so, go to new round, change mons count to 1/10 and start new level.
        // if(data.bossHP <= 0){

        // }
    })
    socket.on('BUY-CHAR', data => {
     var buyingHero = heroes.find( slot => slot.name == data.name )
        buyHero(getUserData(socket.id).data._id, buyingHero.name, buyingHero.baseCost, socket.id).then(res => {
            getUserData(socket.id).data.dps = res.dps
            getUserData(socket.id).data.heroes = res.heroes
            getUserData(socket.id).data.gold = res.gold
            io.to(socket.id).emit('BUY-CHAR', { bought : res.heroes, next: res.nextHero, gold: res.gold, dps : res.dps })
            
        }).catch(e => {
            //This should only happen if the user has the Hero
            console.log(e)
        })
     })
    socket.on('RESTART-BOSS', data => {

        if(getUserData(socket.id).data.failedBoss){
            getUserData(socket.id).data.bossFight = true
            startBossTimer(socket.id)
            getUserData(socket.id).data.level = getUserData(socket.id).data.failedBoss
            getUserData(socket.id).data.failedBoss = null;
            getNewMonster(socket.id).then(() => {
                    io.to(socket.id).emit('LEVEL-CHANGE', { 
                      monsterCount : 1,
                      level : getUserData(socket.id).data.level, 
                      bossFight: getUserData(socket.id).data.bossFight,
                      currentMonster: getUserData(socket.id).data.currentMonster
                    })   
            })
            
        }
    })
    socket.on('BUY-SKILL', data => {
        buyHeroUpgrade(socket.id, data.skillId, data.heroId)
    })
    socket.on('disconnect', data => {
       // let account = activeUsers.find(i => i.socketId == socket.id)
       // account.connected = false;
        if(typeof getUserData(socket.id) !== 'undefined'){
            getUserData(socket.id).connected = false
            console.log('saving user')
            saveUser(getUserData(socket.id).data).then(() => {
                console.log('Player disconnected : ' + getUserData(socket.id).data.username)
                let delIndex = userData.findIndex(i => i.socketId == socket.id)
                userData.splice(delIndex, 0)
                console.log('removed user from memory store.')
            })
        } else {
            console.log('user has no data, not saving.')
        }
        let findUser = activeUsers.filter(i => i.id != socket.id)
        activeUsers = findUser
        console.log('Current Players: ' + activeUsers.length)
    })
});
const startBossTimer = (socketId) => {
            getUserData(socketId).data.bossFight = true;
            console.log('starting boss timer...')

            var endTime = new Date(); 
            endTime = new Date(endTime .getTime() + 30000);
            var interval = setInterval(function() {
                    var now = new Date();
                    var distance = endTime - now;
                    if(distance < 0)
                    {
                        distance = 0
                    }
                    io.to(socketId).emit('BOSS-TIMER', { currentTime : (distance / 1000).toFixed(2), canAttack : true});   
                    if(!getUserData(socketId).data.bossFight) {
                        console.log('boss fight is over')
                        clearInterval(interval)
                    }
                    else if(now > endTime)
                    {
                        failedBoss(socketId)
                        console.log('times up, user failed.')
                        clearInterval(interval)
                    }
            }, 75);
}
const getNewMonster = (id) => {
    var promise = new Promise((resolve, reject) => {
        let currentLevelMon =  Monster.levels.find(level => level.level ==  getUserData(id).data.level)
        if(getUserData(id).data.failedBoss != null) {
            console.log('user failed boss.')
            let randomVal = Math.floor(Math.random() * currentLevelMon.list.length)
            console.log(randomVal)
            let curMonster = getUserData(id).data.currentMonster
            getUserData(id).data.currentMonster = currentLevelMon.list.find((i, index) => index == randomVal) 
            while(curMonster.name == getUserData(id).data.currentMonster){
                console.log('new monster has same name, randomizing..')
                randomVal = Math.floor(Math.random() * currentLevelMon.list.length)
                console.log(randomVal)
                getUserData(id).data.currentMonster = currentLevelMon.list.find((i, index) => index == randomVal) 
            }
            
        } else {
            getUserData(id).data.currentMonster = currentLevelMon.list.find((i, index) => index == (getUserData(id).data.monsterCount)) 
        }
        
        // Create monster HP based on levels.
        getUserData(id).data.currentMonster.monsterCurrentHP = Math.round(10 * ((getUserData(id).data.level-1) + Math.pow(1.55, getUserData(id).data.level - 1)))
        getUserData(id).data.currentMonster.monsterMaxHP = Math.round(10 * ((getUserData(id).data.level-1) + Math.pow(1.55, getUserData(id).data.level - 1)))
        if(getUserData(id).data.level % 5 === 0)
        {
            // this.startBossTimer()
            getUserData(id).data.bossKilled = false;
            getUserData(id).data.currentMonster.monsterCurrentHP = Math.round(10 * ((getUserData(id).data.level-1) + Math.pow(1.55, getUserData(id).data.level)) * 10)
            getUserData(id).data.currentMonster.monsterMaxHP = Math.round(10 * ((getUserData(id).data.level-1) + Math.pow(1.55, getUserData(id).data.level)) * 10)
        }
        resolve(getUserData(id).data.currentMonster)
    })
    return promise
}
const startAutoDPS = (socketId) => {
        function auto() {
            if(!getUserData(socketId).connected){
                return
            }
            if(!getUserData(socketId).data.canAttack){
                console.log('unable to attack.')
                setTimeout(() => auto(),  500) 
            } else {


            if(getUserData(socketId).data.dps > 10){
                if(getUserData(socketId).data.currentMonster.monsterCurrentHP > 0 && getUserData(socketId).data.canAttack) {
                    if((getUserData(socketId).data.dps/10) > getUserData(socketId).data.currentMonster.monsterCurrentHP){
                        getUserData(socketId).data.currentMonster.monsterCurrentHP = 0
                    } else {
                        getUserData(socketId).data.currentMonster.monsterCurrentHP = getUserData(socketId).data.currentMonster.monsterCurrentHP - (getUserData(socketId).data.dps/10)
                    }
                    io.to(socketId).emit('ATTACK', { monsterCurrentHP : getUserData(socketId).data.currentMonster.monsterCurrentHP});    
                }
                if(getUserData(socketId).data.currentMonster.monsterCurrentHP <= 0){
                    killMonster(socketId)

                }
                
                setTimeout(() => auto(),  100)
            } else {
                if(getUserData(socketId).data.currentMonster.monsterCurrentHP > 0 && getUserData(socketId).data.canAttack) {
                    if((getUserData(socketId).data.dps) > getUserData(socketId).data.currentMonster.monsterCurrentHP){
                        getUserData(socketId).data.currentMonster.monsterCurrentHP = 0
                    } else {
                        getUserData(socketId).data.currentMonster.monsterCurrentHP = getUserData(socketId).data.currentMonster.monsterCurrentHP - (getUserData(socketId).data.dps)
                    }
                    io.to(socketId).emit('ATTACK', { monsterCurrentHP : getUserData(socketId).data.currentMonster.monsterCurrentHP});    
                }
                if(getUserData(socketId).data.currentMonster.monsterCurrentHP <= 0){
                    killMonster(socketId)

                }
                 setTimeout(() => auto(),  1000)
                
            }}
        }  
        setTimeout(() => auto(), 100)
}
/// TODO CHANGE LEVEL
const nextLevel = (socketId) => {
            getUserData(socketId).data.level++
            //Emit Level Change.
            io.to(socketId).emit('LEVEL-CHANGE', { 
                      monsterCount : 0,
                      goldCount : getUserData(socketId).data.gold, 
                      level : getUserData(socketId).data.level, 
                      username: getUserData(socketId).data.username,
                      bossFight: getUserData(socketId).data.bossFight,
            })  
            if(getUserData(socketId).data.level % 5 == 0)
            {
                getUserData(socketId).data.monsterCount = 0
                console.log('Boss level')
                getUserData(socketId).data.bossFight = true
                //Start Boss timer
                setTimeout(() => startBossTimer(socketId), 2500)
                //Emit Boss timer Socket.
            } else {
                getUserData(socketId).data.monsterCount = 0
                console.log('Regular level')
                getUserData(socketId).data.bossFight = false            
            }
}
const failedBoss = (socketId) => {
    getUserData(socketId).data.failedBoss = getUserData(socketId).data.level
    getUserData(socketId).data.canAttack = false;
    //Lower level
    getUserData(socketId).data.level--
    //Set Monsters to 9, don't auto level.
    getUserData(socketId).data.monsterCount = 10
    getNewMonster(socketId).then(() => {
            io.to(socketId).emit('DOWN-LEVEL', { 
                      monsterCount : 10,
                      level : getUserData(socketId).data.level, 
                      currentMonster : getUserData(socketId).data.currentMonster,
                      username: getUserData(socketId).data.username,
                      bossFight: false,
            }) 
                            setTimeout(() => { 

                          io.to(socketId).emit('READY', { canAttack: true});
                          getUserData(socketId).data.canAttack = true; 
                }, 2500);
    })

    //Enable Return to boss button
}
const checkBossKill = (socketId) => {
    if(getUserData(socketId).data.currentMonster.monsterCurrentHP > 0){
        //User failed to kill boss. Downlevel him.
        console.log('user failed to kill boss.')
        failedBoss(socketId)
    } else if (getUserData(socketId).data.currentMonster <= 0){
        //User killed the boss.
        console.log('user killed boss!')
        killMonster(socketId)
        //Clear timers
    }
}
const killMonster = (socketId) => {
        if(getUserData(socketId).data.bossFight){
            // User killed the boss reset to false.
            getUserData(socketId).data.bossFight = false

            getUserData(socketId).data.monsterCount = 10
        }
        getUserData(socketId).data.canLoot = false
        getUserData(socketId).data.canAttack = false;
            if(getUserData(socketId).data.currentMonster.hasDrop){
                let dropItems = getUserData(socketId).data.currentMonster.hasDrop
                let itemDrops = []
                if(dropItems.length > 0){
                dropItems.forEach(i => {
                    let item = ItemDb.items.find(x => i == x.id)
                    let roll = Math.floor(Math.random() * 101);
                    if(roll <= item.chance){
                        itemDrops.push(item)
                        getUserData(socketId).data.inventory.push(item)
                    }
                })}
                if(itemDrops.length > 0){
                    io.to(socketId).emit('ITEM-DROP', {
                        inventory : getUserData(socketId).data.inventory,
                        itemDrops : itemDrops
                    })
                }
            }
            if(getUserData(socketId).data.monsterCount < 10 ){
                    getUserData(socketId).data.monsterCount++
            } 
            if(getUserData(socketId).data.monsterCount == 10 && !getUserData(socketId).data.failedBoss){
                   nextLevel(socketId)
            }
                let amount =  Math.round(((getUserData(socketId).data.currentMonster.monsterMaxHP / 15) * Math.floor(((0 / 100) + 1))));
                if(getUserData(socketId).data.goldBonus > 0){
                  amount = Math.round(amount * ( 1 + getUserData(socketId).data.goldBonus + getUserData(socketId).data.heroGoldBonus))
                }
                getUserData(socketId).data.gold = getUserData(socketId).data.gold + amount 
                getNewMonster(socketId).then(() => {
                    saveUser(getUserData(socketId).data).then( returned => {
                        io.to(socketId).emit('GOLD', { 
                        goldCount : getUserData(socketId).data.gold,  
                        monsterCount:  getUserData(socketId).data.monsterCount, 
                        socketId : socketId, 
                        username: getUserData(socketId).data.username,
                        currentMonster : getUserData(socketId).data.currentMonster
                });
                setTimeout(() => { 
                    getUserData(socketId).data.canLoot = true
                          io.to(socketId).emit('READY', { canAttack: true});
                          getUserData(socketId).data.canAttack = true; 
                }, 2100);
            }).catch(e => console.log(e));
    })
}
const buyHero = (id, heroName, cost, socket) => {
    var promise = new Promise((resolve, reject) => {
        User.findOne({ '_id' :  id }, function(err, user) {
            // if there are any errors, return the error
            if (err)
                reject(err)
            if (user) {
                if(user.heroes.length > 0) {
                let owned = user.heroes.filter(i => i.name == heroName)
                if(owned.length > 0){ //user owns hero
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
                                let res = getUserData(socket).data
                                return resolve(result)
                            }
                            
                        })
                    }
                }
                 else {  //Not enough gold to buy
                     return reject(user)
                }
            }                      
        })
    })
 return promise
}
// Item types 
// 0 : Weapon
// 1 : Amulet 
// 2 : Ring
// 3 : Scroll

// Bonus Types 
// 0 : Gold 
// 1 : DPS Overall
// 2 : DPC All
// 3 : Souls 
// 4 : DPS ALL HERO
// 5 : DPS HERO BONUS  || This works like this, BASE HERO DPS * (SINGLE HERO BONUS + EXTRA BONUS) e.g 100 * 
// 6 : GOLD BONUS HERO
const buyHeroUpgrade = (socketId, skillId, heroId) => {
    console.log(skillId, heroId)
    //find skill ID
    let skill = heroUpgrades.find(i => i.heroId == heroId && i.skillId == skillId)
    console.log(skill)
    let hero = getUserData(socketId).data.heroes.find(i => i.id == heroId)
    //Check money available
    if(getUserData(socketId).data.gold >= skill.cost && hero.level >= skill.requiredLevel){
        console.log(`We've got enough money and are high enough level`)
        //Check uer doesn't skill.
        let hasSkill = getUserData(socketId).data.heroUpgrades.some(i => i.heroId == heroId && i.skillId == skillId)
        console.log(hasSkill)
        if(!hasSkill){
            // Purchase skill TODO
            getUserData(socketId).data.gold -= skill.cost
            getUserData(socketId).data.heroUpgrades.push(skill)
            console.log('we bought the skill and spent ' + skill.cost)
            if(skill.bonusType == 5){
                hero.bonusDps += skill.bonusAmount
                console.log(hero.bonusDps)
                updateDps(socketId)
            }
            else if(skill.bonusType == 4){
                 getUserData(socketId).data.heroDpsBonus += skill.bonusAmount
                 updateDps(socketId)
            }
            else if(skill.bonusType == 6){
                 getUserData(socketId).data.heroGoldBonus += skill.bonusAmount
            }
        }  else {
            console.log('user owns this skill already.')
           // console.log(hasSkill)
        } 
    }
}

const updateDps = (socketId) => {
    // Calculate Individual hero DPS
    let total = 0;
    let heroDpsAllBonus = 0;
    heroDpsAllBonus += getUserData(socketId).data.heroDpsBonus
    getUserData(socketId).data.heroes.forEach(hero => {
        let totalBonus = 0;
        if(typeof hero.bonusDps !== 'undefined'){
            totalBonus = hero.bonusDps 
        }
        let heroDps = (hero.baseDps * hero.level) * (1 + totalBonus + heroDpsAllBonus)
        console.log(`Base DPS: ${hero.baseDps}`)
        console.log(`LEVEL: ${hero.level}`)
        console.log(`Hero DPS BONUS: ${totalBonus}`)
        console.log(`ALL HERO BONUS: ${heroDpsAllBonus}`)
        console.log(`TOTAL HERO DPS: ${heroDps}`)
        hero.dps = Math.round(heroDps);
        total += hero.dps
    })
    getUserData(socketId).data.dps = total
    io.to(socketId).emit('update-chars', {
        heroes : getUserData(socketId).data.heroes
    })
    console.log(total)
    // Calculate Total DPS

}

const heroUpgrades = [
   {
       heroId : 0,
       skillId : 0,
       name : 'One for all',
       icon : 'blah.jpg',
       bonusType : 5,
       bonusAmount : 0.25,
       cost : 1,
       requiredLevel : 10,
   },{
       heroId : 0,
       skillId : 1,
       name : 'Super Beam',
       icon : 'blah.jpg',
       bonusType : 5,
       bonusAmount : 0.50,
       cost : 1,
       requiredLevel : 25,
   },{
       heroId : 0,
       skillId : 2,
       name : 'Limit Breaker',
       icon : 'blah.jpg',
       bonusType : 2,
       bonusAmount : 0.25,
       cost : 1,
       requiredLevel : 50,
   },   {
       heroId : 10,
       skillId : 0,
       name : 'One for all',
       icon : 'blah.jpg',
       bonusType : 5,
       bonusAmount : 0.25,
       cost : 1,
       requiredLevel : 10,
   },{
       heroId : 10,
       skillId : 1,
       name : 'Super Beam',
       icon : 'blah.jpg',
       bonusType : 5,
       bonusAmount : 0.50,
       cost : 1,
       requiredLevel : 25,
   },
]
const heroes = [
      { name: 'Luna',
        fullImg: 'luna.jpg',
        headImg: 'luna-head.jpg',
        dps: 1,
        level: 1,
        baseDps: 1,
        baseCost: 10,
        bonusDps: 0,
        id: 0,
        upgrades: [],
        cost: 10 },
      { name: 'Suyeon',
        fullImg: 'suyeon.jpg',
        headImg: 'suyeon-head.jpg',
        dps: 5,
        bonusDps: 0,
        level: 1,
        baseDps: 5,
        id: 1,
        baseCost: 49,
        cost: 49 },
      { name: 'Yukki',
        fullImg: 'yukki.jpg',
        bonusDps: 0,
        headImg: 'yukki-head.jpg',
        dps: 19,
        level: 1,
        baseDps: 19,
        id: 2,
        baseCost: 240,
        cost: 240 },
      { name: 'Mikon',
        fullImg: 'mikon.jpg',
        bonusDps: 0,
        headImg: 'mikon-head.jpg',
        dps: 70,
        level: 1,
        baseDps: 70,
        baseCost: 1176,
        id: 3,
        cost: 1176 },

      { name: 'Fate',
        fullImg: 'fate.jpg',
        bonusDps: 0,
        headImg: 'fate-head.jpg',
        dps: 257,
        level: 1,
        id: 4,
        baseDps: 257,
        baseCost: 5762,
        cost: 5762 },
      { name: 'Albedo',
        fullImg: 'albedo.jpg',
        headImg: 'albedo-head.jpg',
        dps: 941,
        level: 1,
        baseCost: 28234,
        baseDps: 941,
        id: 5,
        cost: 28234 },
        { name: 'Kayle',
        fullImg: 'albedo.jpg',
        bonusDps: 0,
        headImg: 'kayle-head.jpg',
        dps: 3444,
        level: 1,
        id: 6,
        baseCost: 138346,
        baseDps: 3444,
        cost: 138346 },
        { name: 'Rie',
        fullImg: 'albedo.jpg',
        headImg: 'rie-head.jpg',
        bonusDps: 0,
        dps: 12605,
        level: 1,
        baseCost: 677895,
        baseDps: 12605,
        id: 7,
        cost: 677895 },
        { name: 'Nell',
        fullImg: 'albedo.jpg',
        bonusDps: 0,
        headImg: 'nell-head.jpg',
        dps: 46134,
        level: 1,
        baseCost: 3321685,
        id: 8,
        baseDps: 46134,
        cost: 3321685 },
        { name: 'Boop',
        bonusDps: 0,
        fullImg: 'boop.jpg',
        headImg: 'boop-head.jpg',
        dps: 168849,
        id: 9,
        level: 1,
        baseCost: 16276253,
        baseDps: 168849,
        cost: 16276253 },
        { name: 'Vel',
        bonusDps: 0,
        fullImg: 'vel.jpg',
        headImg: 'vel-head.jpg',
        dps: 617982,
        level: 1,
        id: 10,
        baseCost: 79753623,
        baseDps: 617982,
        cost: 79753623 },
      ]