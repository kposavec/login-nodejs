const express = require('express');
const app = express ();
const mysql = require('mysql');
const bcrypt = require('bcrypt'); 
const generateAccessToken = require('./generateAccessToken');
const autenticateToken = require('./auten');
const jwt = require('jsonwebtoken');
require('dotenv').config();



const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

const port = process.env.PORT;

const db = mysql.createPool({
    connectionLimit:100,
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD, 
    database: DB_NAME 
}); 


app.use(express.json());

db.getConnection((err, connection) => {
    if(err) throw (err);
    console.log('DB connected successful: ' + connection.threadId);
});


//ADD USER
app.post('/createuser', async (req, res) => {
    const user = req.body.name;
    const hashedPassword = await bcrypt.hash(req.body.password, 10); 

    db.getConnection(async (err, connection) => {
        if (err) throw (err); 

        const sqlSearch = 'SELECT * FROM user where username = ?;';
        const searchQuery = mysql.format(sqlSearch, [user]);
        const sqlInsert = "INSERT INTO user (id, ime, prezime, username, password, prijava) VALUES (0, 'ime', 'prezime',?, ?, now());";
        const insertQuery = mysql.format(sqlInsert, [user, hashedPassword]);

        await connection.query(searchQuery,async (err, result) => {
            if (err) throw (err); 
            console.log('-Search result ' + result.length)

            if (result.length != 0){
                connection.release();
                console.log('User alerady exists');
                res.sendStatus(409);
            } else {
                await connection.query (insertQuery, (err, result)=> {
                    connection.release();

                    if(err) throw (err)
                    console.log('Created new User');
                    console.log(result.insertId);
                    res.sendStatus(201)
                });
            }
        });
    });
});

//LOGIN AUTENTICATE USER
app.post('/login', (req, res) => {
    const user = req.body.name;
    const password = req.body.password;

    db.getConnection (async (err, connection)=> {
        if(err) throw (err)

        const sqlSearch = "SELECT * FROM user WHERE username = ?";
        const searchQuery = mysql.format(sqlSearch, [user]);

        await connection.query(searchQuery, async (err, result) => {
            connection.release()
            console.log(result)
            if(err) throw (err)

            if(result.length == 0){
                console.log('User does not exist')
                res.sendStatus(404)
            } else {
                const hashedPassword = result[0].password;

                if (await bcrypt.compare(password, hashedPassword)){
                    console.log('Login successful!');
                    const token = generateAccessToken({user: user})
                    console.log(token)
                    //res.send(`${user} is logged in!`);
                    res.send({accessToken: token})
                } else {
                    console.log('Password Incorrect');
                    res.send('Password incorrect!');
                }
            }
        });

    })
});

app.get('/', autenticateToken, (req, res)=> {
    res.sendStatus(200);
    console.log(req.user);
}); 




app.listen(port, () => console.log(`Server Started on port ${port}...`)); 