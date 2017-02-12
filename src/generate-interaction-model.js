'use strict';

const app = require("./app");
const fs = require('fs');

if (!fs.existsSync('./dist/')) {
  fs.mkdirSync('./dist/');
}

fs.unlinkSync('./dist/schema.json');
fs.writeFile("./dist/schema.json", app.alexaApp.schema(), function(err) {
  if (err) {
    console.error("Unable to output schema.json. Error: ", err);
  }
});

fs.unlinkSync('./dist/utterances.txt');
fs.writeFile("./dist/utterances.txt", app.alexaApp.utterances(), function(err) {
  if (err) {
    console.error("Unable to output utterances.txt. Error: ", err);
  }
});
