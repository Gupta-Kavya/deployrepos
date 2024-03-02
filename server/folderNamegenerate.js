require('dotenv').config();

const keywords = "qwertyuiopasdfghjklzxcvbnm123456789";
function generateRandomName(length) {
    let name = '';
    const keywordsLength = keywords.length;
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * keywordsLength);
      name += keywords.charAt(randomIndex);
    }
    return name;
  }
  

  module.exports = generateRandomName;
