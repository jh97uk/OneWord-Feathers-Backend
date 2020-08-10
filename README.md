### 👋 One Word - An introduction

This was a project I began on the 4th of July as a part of my drive to get back into programming as a hobby.

In the weeks following, I've been hard at work to make it fully functional

The goal of the game simple:

* You create a "story" with a prompt title

* You can then share a link to the story with a friend or (if the game is public), wait for someone to join your story through the matchmaking system

* Once you have someone to play with, all players in the game begin to craft a story, 1 word each

This can lead to some pretty funny and amusing stories.

### 🖥️ Technologies

For the backend of this project, I utilized:
 * NodeJS
 * Feathers
 * Hapi's JOI library (I ❤️ this!!!)
 * Sequelize (with SQLite)
  
#### Why NodeJS?
NodeJS is at the forefont of realtime web apps, and it felt like the best option for me, especially considering I'm already very familiar with Javascript. Plus, the NodeJS ecosystem has so much to offer, theres a wide variety of libraries and frameworks available through npm to aid development 

#### Why FeathersJS?
Feathers JS is a project I've always wanted to have a play with. It seemed like a really nice way to quickly build applications based off of realtime data, which obviously, with words being sent to and from the server has been key. I'm glad I chose it, it's proven to be very light weight, and not too overwhelming. It has allowed me to quickly throw together an API without getting too bogged down in the minutiae that building APIs causes.

#### Why Hapi Joi?
This is an *incredible* data validation library. I'm using it to validate data coming in from the frontend. Its fast, easy to use and super intuitive.

#### Why Sequelize?
I wanted a library that would hold my hand through managing a database, and Sequelize was the perfect contender for this. The app doesn't strictly rely on having a database, but moving forward, I want to store words of stories in the database rather than in memory, just to make sure that the server can take high story counts with large amounts of words without crashing.

### 🔨 Setup
Running the backend for OneWord should be pretty simple.

`npm start` will suffice.

### 📝 End notes
Some quick final notes, this project is more or less finished. I do plan on putting it onto a server in the near future once I've got my Mac build up and running so I can debug a few iOS specific issues. That being said, I'm not entirely happy with the code base just yet. I feel like I have a pretty nice setup going, but I'm not happy with the names of some classes and variables.