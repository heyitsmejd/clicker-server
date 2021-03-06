

var monster = {};

monster.levels = []
monster.initialize = function(){
	console.log('Starting level creation...')
	const verbs = ['Dangerous', 'Cunning', 'Wild', 'Extreme', 'Fiesty', 'Crazy', 'Sleepy', 'Cutthroat', 'Energetic', 'Smiling']
	const images = ['monsters/3.png', 'slug.svg']
	var prevMon = false;
	for(var i = 0; i < 100; i++){
		// if(i % 5 === 0){
		if(i == 1){
			console.log('Level building started.')
		}
		// } else {}
		var levelObj = {}
		levelObj.level = i
		levelObj.list = []
		for(var x = 0; x < 12; x++){
			monsterObj = {}
			monsterObj.name = verbs[Math.floor(Math.random() * 11)] + ' Boop'
			monsterObj.image = images[Math.floor(Math.random() * 2)]
			monsterObj.hasDrop = [1,2,3]
			if(prevMon){
			while(monsterObj.name == prevMon.name || monsterObj.image == prevMon.image){
			//	console.log('we found two consecutive monsters with the same name or image, randomizing again.')
				monsterObj.name = verbs[Math.floor(Math.random() * 11)] + ' Boop'
				monsterObj.image = images[Math.floor(Math.random() * 2)]
			}}
			levelObj.list.push(monsterObj)
			prevMon = monsterObj
		}
		monster.levels.push(levelObj)
		if(i == 100){
			console.log('Done building levels.')
		}
	}

}
// monsters.checkPlaceOwnership = function(req, res, next)
// {
// }
module.exports = monster;