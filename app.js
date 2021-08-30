const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const ejs = require('ejs');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');
const { Recoverable } = require('repl');
const { json } = require('express');
const port = 3000;
const url = 'mongodb://localhost:27017/todo';
const client = new MongoClient(url);

async function main() {
  try {
    await client.connect();
    console.log('Database Connection successful');
  } catch (e) {
    console.log(e);
  }
}
main().catch((err) => {
  console.log(err);
});

// return a token
let signToken = (username, jwt) => {
  return jwt.sign({ username: username }, 'my-ultra-high-secure-secret-key');
};

// verify token
const verifyToken = (req, res, next) => {
  let token = req.headers['authorization'];
  if (token) {
    token = token.replace(/\r?\n|\r/g, '');
  }

  if (!token) {
    return res.status(403).json({ error: 'A token is required to access this page' });
  }
  try {
    const decoded = jwt.verify(token, 'my-ultra-high-secure-secret-key'); // wrong secret key leads to an error
    req.user = decoded;
  } catch (err) {
    return res.status(401).json({ error: 'Invalid Token' });
  }
  return next();
};

app.use(express.json());

// new code for adding user
app.post('/create', (req, res) => {
  if (!req.body.username || !req.body.password) {
    return res.status(403).json({ error: 'Please fill all details' });
  }

  const token = signToken(req.body.username, jwt);
  bcrypt.hash(req.body.password, 10, function (err, hashedData) {
    let newUser = {
      username: req.body.username,
      password: hashedData,
      notes: [],
    };

    async function createUserDocument(client, newDocument) {
      try {
        const isExistAccount = await client.db('todo').collection('todos').findOne({ username: newUser.username });
        if (isExistAccount.username == req.body.username) {
          console.log('User already exist');
          newUser = { message: 'User already exist.' };
          return res.json({ message: 'User already exist' });
        } else {
          const result = await client.db('todo').collection('todos').insertOne(newDocument);
          console.log(`Document inserted with id ${result.insertedId}`);
          res.json(newUser);
        }
      } catch (error) {
        console.log(error);
      }
    }

    //new mongodb code
    createUserDocument(client, newUser);
  });
});

app.post('/login', (req, res) => {
  if (!req.body.username || !req.body.password) {
    return res.status(403).json({ error: 'Please fill all details' });
  }
  const userDocument = {
    username: req.body.username,
    password: req.body.password,
  };

  async function signInUser(client, userDocument) {
    try {
      const result = await model.findOne({ username: userDocument.username });
      bcrypt.compare(userDocument.password, result.password).then(async (data) => {
        if (data) {
          const token = await signToken(userDocument.username, jwt);
          console.log(token);
          // console.log(user);
          if (jwt.verify(token, 'my-ultra-high-secure-secret-key')) {
            result.token = token;
            console.log(`User found id ${result._id}`);
            // console.log(result);
            return res.json(result);
          } else {
            return res.json({ error: 'Invalid token' });
          }
        } else {
          return res.json({ error: 'wrong username or password' });
        }
      });
      // console.log(result);
      return result;
    } catch (error) {
      console.log(error);
    }
  }
  signInUser(client, userDocument).then((data) => {
    console.log(data);
    // res.json(data);
  });
});

// new route to add note
app.post('/addNote', verifyToken, (req, res) => {
  if (req.body.newnote == null || req.body.newnote == '') {
    return res.status(403).json({ error: "ERROR! Can't add empty note" });
  }

  const result = client.db('todo').collection('todos').findOne({ username: req.user.username });
  result.then((data) => {
    console.log(data);
    const oldNoteArr = data.notes;
    oldNoteArr.push(req.body.newnote);
    console.log(oldNoteArr);
    const result2 = client
      .db('todo')
      .collection('todos')
      .updateOne({ username: req.user.username }, { $set: { notes: oldNoteArr } });
    res.json(data.notes);
  });
});

app.get('/notes', verifyToken, (req, res) => {
  console.log(req.user.username);
  const result = client.db('todo').collection('todos').findOne({ username: req.user.username });
  result.then((data) => {
    // console.log(data);

    if (data.notes.length == 0) {
      res.json({ message: 'There are no notes.' });
    } else {
      res.json(data.notes);
    }
  });
});

app.get('*', function (req, res) {
  res.status(404).json({ status: 'Fail', error: 'ERROR! Page Not Found!' });
});

app.listen(port, () => console.log(`Todo app listening on port 3000!`));
