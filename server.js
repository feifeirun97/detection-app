const express = require("express");
const bcrypt = require("bcrypt-nodejs");
const cors = require("cors");
const knex = require("knex");
const Clarifai = require("clarifai");


const db = knex({
  client: "pg",
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: true
  }
});

// console.log(
//   db
//     .select("*")
//     .from("users")
//     .then((data) => console.log(data))
// );

const app = express();


//中间件parser
app.use(express.json());
app.use(cors());

app.get("/", (req,res) => res.send('it is working!'))

app.post("/signin", (req, res) => {
  db.select('email', 'hash').from('login')
    .where('email', '=', req.body.email)
    .then(data => {
    const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
    if (isValid){
      db.select('*').from('users')
        .where('email', '=', req.body.email)
        .then(user => {
          res.json(user[0])
        })
        .catch(err=> res.status(400).json('unable to signin'))
    } else {
      res.status(400).json('wrong credentials')
    }
  })
  .catch(err => res.status(400).json('wrong credentials'))
});

app.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json('incorrect form submission')
  }
  const hash = bcrypt.hashSync(password);
  console.log("success");
    db.transaction(trx => {
      trx.insert({
        hash: hash,
        email: email
      })
      .into('login')
      .returning('email')
      .then(loginEmail => {
        return trx("users")
          .returning("*")
          .insert({
            name: name,
            email: loginEmail[0],
            joined: new Date(),
          })
          .then((user) => {
            res.json(user[0]);
          })
      
      })
      .then(trx.commit)
      .catch(trx.rollback)
    })
    .catch((err) => res.status(400).json("unable to register"));
});

app.get("/profile/:id", (req, res) => {
  const { id } = req.params;
  db.select("*")
    .from("users")
    .where({
      id: id,
    })
    .then((user) => {
      if (user.length) {
        res.json(user[0]);
      } else {
        res.status(400).json("not found");
      }
    })
    .catch((err) => res.status(400).json("error getting user"));
});

app.put("/image", (req, res) => {
  const { id } = req.body;
  db('users')
    .where("id", "=", id)
    .increment("usage", 1)
    .returning("usage")
    .then(usage => {
      // console.log(usage);
      res.json(usage[0]);
    })
    .catch(err => res.status(400).json('unable to get usage'))
});


const app2 = new Clarifai.App({
  apiKey: 'ddd8ec44fc4b46c1923422afae97ff96'
 });
 

app.put("/imageurl", (req, res) => {
  app2.models
    .predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
    .then(data => {
      res.json(data);
    })
    .catch(err => res.status(400).json('unable to work with api'))
});



app.listen(process.env.PORT || 3000, () => {
  console.log(`sever has successfully run on port ${process.env.PORT}`);
});

/*
| /signin          | POST | Success/Fail |
| /register        | POST | User         |
| /profile/:userId | GET  | User         |
| /image           | PUT  | User         |
*/
