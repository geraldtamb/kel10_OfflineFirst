var express = require('express'),
    nano = require('nano')('http://localhost:5984'), // local adress
    nanoweb = require('nano')('https://couchdb-f8cad3.smileupps.com'), // remote adress
    usersweb = nanoweb.db.use('users'),
    users = nano.db.use('users'),
    log = nano.db.use('log'),
    qs = require('querystring'),
    Cryptr = require('cryptr'),
    session = require('express-session'),
    connectivity = require("internet-available"),
    data = []

const cryptr = new Cryptr('mySecretKey')
var app = express()

app.use(session({secret: "Shh, its a secret!"}));

app.get('/', (req, res) => {
    if (req.session.username) 
        isLoggedIn(req, res)
    else 
        res.redirect('/login')

    connectivity().then(() => {
        console.log('You are connected to the internet')
        })
    .catch(() => {
        console.log('You are not connected to the internet')
    })
})

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/views/login.html')
})

app.post('/login', (req, res) => {
    var body = ''
    req.setEncoding('utf-8')
    req.on('data', chunk => {
        body += chunk
    })
    req.on('end', () => {
        var data = qs.parse(body)
        users.get(data.username, (err, body) => {
            if (err){
                usersweb.get(data.username, (err, body) => {
                    if (err) {
                        console.log('User not found')
                        log.insert({
                            message: 'User not found'
                        })
                        res.send('<h3>User not found!</h3> Click here to go back <a href='+'/logout'+'>Login</a>')
                    } 
                    else if ((data.password).localeCompare((body.password))) {
                        req.session.username = data.username
                        isLoggedIn(req, res)
                    }
                    else {
                        console.log('User found, wrong password')
                        log.insert({
                            message: 'User found, wrong password'
                        })
                        res.send('<h3>User found but, Wrong Password!</h3> Click here to go back <a href='+'/logout'+'>Login</a>')
                    }
                })
            }
            else{
                if ((data.password).localeCompare((body.password))) {
                    req.session.username = data.username
                    isLoggedIn(req, res)
                }
                else{
                    console.log('Wrong password')
                    log.insert({
                        message: 'Wrong password on Login'
                    })
                    res.send('<h3>Wrong Password!</h3> Click here to go back <a href='+'/logout'+'>Login</a>')
                }
            }
        })
    })
})

app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/views/register.html')
})

app.post('/register', (req, res) => {
        var body = ''
        req.setEncoding('utf-8')
        req.on('data', chunk => {
            body += chunk
        })
        req.on('end', () => {
            var data = qs.parse(body)
            if(data.password == data.confirm_password){
                connectivity().then(() => {
                    usersweb.insert({ _id: data.username, username: data.username, password: cryptr.encrypt(data.password) }, null, function (err, body) {
                        if (err) {
                            log.insert({
                                message: err
                            })
                            console.log(err)
                        }
                        else
                            console.log(body)
                        
                    })
                }).catch(() => {
                    users.insert({ _id: data.username, username: data.username, password: cryptr.encrypt(data.password) }, null, function (err, body) {
                        if (err) {
                            log.insert({
                                message: err
                            })
                            console.log(err)
                        } 
                        else {
                            log.insert({
                                message: body
                            })
                            console.log(body)
                        }
                    })
                })
                console.log('Register')
                log.insert({
                    message: 'Register of username: ' + data.username + ' is successful'
                })
                res.send('<h3>Register Successful!</h3> Click here to <a href='+'/login'+'>Login</a>')
            }
            else{
                res.send('<h3>Your password did not match!</h3> Click here to go back <a href='+'/register'+'>Register</a>')
                log.insert({
                    message: "Password doesn't match at Register"
                })
                console.log("Password doesn't match")
            } 
            
            })
})

app.get('/logout', (req, res) => {
    req.session.username = null
    console.log('Logged out')
    log.insert({
        message: 'Logged out'
    })
    res.redirect('/login');
})


function isLoggedIn(req, res){
    console.log('Login successful')
    log.insert({
        message: 'Login Successful'
    })
    res.send('<h1>You are logged in, '+req.session.username+
             '</h1><br> <button><a href='+'/logout'+'>Logout</a><button>')
}

app.listen(3000, () => {
    log.insert({
        message: 'Server started'
    })
    console.log('Offline first app is listening on port 3000!')
})