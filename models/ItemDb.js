

var itemDb = {};
// Item types 
// 0 : Weapon
// 1 : Amulet 
// 2 : Ring
// 3 : Scroll

// Bonus Types 
// 0 : Gold
// 1 : DPS 
// 2 : DPC
// 3 : Souls

itemDb.items = [
 {
    id : 1,
    itemType: 0,
    name: 'Broadsword',
    icon: 'broadsword.jpg',
    bonusType: 2,
    bonusAmount: 3,
    chance: 100
 }, {
    id : 2,
    itemType: 0,
    name: 'Demonic Blade',
    icon: 'demonsword.jpg',
    bonusType: 2,
    bonusAmount: 7,
    chance: 100
 }
]
// monsters.checkPlaceOwnership = function(req, res, next)
// {
// }
module.exports = itemDb;