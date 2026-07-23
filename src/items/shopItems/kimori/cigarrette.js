module.exports = {
    id: 'cigarrette',
    name: 'Cigarrette',
    cost: 120,
    sell: 90,
    desc: '"I cant believe Im selling this..." - Kimori Kaechan (decrease 20 HP and Restores 50 Stamina)',
    type: ['consumable'],
    effects: { health: -20, stamina: 50 },
    is_sellable: true,
    is_tradeable: true
};
