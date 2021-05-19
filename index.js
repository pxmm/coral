// ============= Imports & Setup =====================
const express = require("express");
const crypto = require('crypto');

//const bodyParser = require('body-parser');
const app = express();
app.engine('html', require('ejs').renderFile);
app.use(express.json());
app.use(express.urlencoded())
let port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;
}
app.listen(port, () => {
    console.log("Server Up");
});

// Configure DB connection
const {dbconfig} = require("./config.js");
const { Pool } = require("pg");
const { get } = require("http");

const pool = new Pool(dbconfig);


// Show API Docs on default page
app.get("/", (req, res, next) => {
    res.render("index.html");
});

//====================================================

// Wrapper for a transaction.  This automatically re-calls the operation with
// the client as an argument as long as the database server asks for
// the transaction to be retried.
// Source: // https://github.com/cockroachlabs/hello-world-node-pg/blob/main/app.js

async function retryTxn(n, max, client, operation, callback) {
    await client.query("BEGIN;");
    while (true) {
      n++;
      if (n === max) {
        throw new Error("Max retry count reached.");
      }
      try {
        await operation(client, callback);
        await client.query("COMMIT;");
        return;
      } catch (err) {
        if (err.code !== "40001") {
          return callback(err);
        } else {
          console.log("Transaction failed. Retrying transaction.");
          console.log(err.message);
          await client.query("ROLLBACK;", () => {
            console.log("Rolling back transaction.");
          });
          await new Promise((r) => setTimeout(r, 2 ** n * 1000));
        }
      }
    }
  }


// ===== Seller Endpoints ============

app.get("/seller/exists/:username", async(req, res) => {
    var user = req.params["username"];
    async function checkUsername(client, callback) {
        //todo: edit query using parametized queries to prevent sql injection attacks
        const checkUserDNE = "SELECT EXISTS (SELECT 1 FROM mobilemarket.datum WHERE datum_type = 'login' AND datum_owner = '" + user + "');"
        await client.query(checkUserDNE, (err, res) => {
            if (err) {
              return callback(err, null);
            }
            var userExists = res.rows[0];
              return callback(err, userExists);
        })
    }
    (async () => {
        // Connect to database
        const client = await pool.connect();

        // Transfer funds in transaction retry wrapper
        console.log("Checking Username Exists...");
        await retryTxn(0, 15, client, checkUsername, (err, result) => {
            if (err) {
                res.status(404);
                res.send(err);
            }
            else {
                res.status(200);
                res.send(result);
            }
        });
    })().catch((err) => console.log(err.stack));
})


// Register
app.post("/seller/signup", async(req, res) => {
    var user = req.body['username'];
    var pass = req.body['password'];
    const hash = crypto.createHash('sha256').update(pass).digest('base64');

    async function signupUser(client, callback) {
        const createUser = "INSERT INTO mobilemarket.datum (datum_owner, datum_type, data) VALUES($1, $2, $3) RETURNING datum_id;"
        const data = {
            "username": user,
            "password": hash,
        }
        const values = [user, 'login', JSON.stringify(data)];
        await client.query(createUser, values, (err, res) => {
            if (err){
                return callback(err, null)
            }
            else {
                return callback(err, res.rows[0])
            }
        });
    }

    (async () => {
        // Connect to database
        const client = await pool.connect();

        // Transfer funds in transaction retry wrapper
        console.log("Registering User...");
        await retryTxn(0, 15, client, signupUser, (err, result) => {
            if (err) {
                console.log("error")
                console.log(err)
                res.status(400);
                res.send(err);
            }
            else {
                console.log("success!")
                res.status(200);
                res.send(result);
            }
        });
    })().catch((err) => console.log(err.stack));    
});

// Login
app.post("/seller/login", async (req, res) => {
    var user = req.body['username'];
    var pass = req.body['password'];
    const hash = crypto.createHash('sha256').update(pass).digest('base64');

    async function loginUser(client, callback) {
        const q = "SELECT datum_id, data->>'password' AS password FROM mobilemarket.datum WHERE datum_type = 'login' AND datum_owner = '" + user + "';"
        await client.query(q, (err, res) => {
            if (err){
                return callback(err, null)
            }
            else {
                console.log(res)
                if (res.rows.length > 0){
                    return callback(err, res.rows[0].password)
                }
                else {
                    return callback("User DNE", null)
                }
            }
        })
    }

    (async () => {
        // Connect to database
        const client = await pool.connect();

        // Transfer funds in transaction retry wrapper
        await retryTxn(0, 15, client, loginUser, (err, result) => {
            if (err) {
                console.log("error")
                console.log(err)
                res.status(400);
                res.send("Failure");
            }
            else {
                if (result === hash){
                    res.status(200);
                    res.send("Success");
                }
                else {
                    res.status(300)
                    res.send("Failure");
                }
            }
        });
    })().catch((err) => console.log(err.stack));    


    /* 
        1. select from datum table
        "SELECT datum_id, data->>'password' AS password
        FROM mobilemarket.datum
        WHERE datum_type = 'login'
        AND datum_owner = '" + user + "';"

        2. check that password from query matches expected password

        query returns datum_id, as we use datum_id for datum ownership
        in other queries, e.g. submitting a response
    
    */
    //res.status(200);
    //res.send();
});

// Get All Tasks
app.get("/seller/alltasks", async(req, res) => {
    var status = req.params["status"];
    var status = "'IN PROGRESS'"
    async function getAllTasks(client, callback) {
        //const q = "SELECT * FROM mobilemarket.task WHERE status =" + status + ";"
        const q = "SELECT * FROM mobilemarket.task WHERE status IS NOT NULL;"
        await client.query(q, (err, res) => {
            if (err){
                return callback(err, null)
            }
            else {
                return callback(err, res.rows)
            }
        });
    }
    (async () => {
        // Connect to database
        const client = await pool.connect();
        await retryTxn(0, 15, client, getAllTasks, (err, result) => {
            if (err) {
                console.log("error")
                console.log(err)
                res.status(400);
                res.send(err);
            }
            else {
                res.status(200);
                res.send(result);
            }
        });
    })().catch((err) => console.log(err.stack));  
    /*

        1. thinking task status types may be like:
            1. IN REVIEW
            2. APPROVED
            3. IN PROGRESS
            4. COMPLETE
            5. CANCELLED
        for our purposes, i'm assuming this API get only retrieves
        tasks in progress?

        2. query
        SELECT * FROM mobilemarket.task WHERE status = 'IN PROGRESS';
    */
});

// View Task given ID
app.get("/seller/tasks/:taskid", async (req, res) => {
    var taskid = req.params["taskid"];
    
    async function viewTask(client, callback) {
        const q = "SELECT * FROM mobilemarket.task WHERE task_id = '" + taskid + "';"
        await client.query(q, (err, res) => {
            if (err){
                return callback(err, null)
            }
            else {
                return callback(err, res.rows[0])
            }
        })
    }
    (async () => {
        // Connect to database
        const client = await pool.connect();
        await retryTxn(0, 15, client, viewTask, (err, result) => {
            if (err) {
                console.log("error")
                console.log(err)
                res.status(400);
                res.send(err);
            }
            else {
                res.status(200);
                res.send(result);
            }
        });
    })().catch((err) => console.log(err.stack));  
    /* 
    
        "SELECT * FROM mobilemarket.task 
        WHERE task_id = '" + taskid "';"

    */
});


// Submit Response
app.post("/seller/submit/:username/:taskid", async (req, res, next) => {
    /*
    e.g format 
        {
            "user": "johndoe123"
            "answer": "1",
            "deletion_date": "06/10/2021",
            "question_id": "abcdefg1234"
        }   

        would be great if we could add datum_id of the user's login info 
        here for contextual integrity – login_id

    */
    var user = req.params["username"];
    var answer = req.params["answer"];
    var deletion_date = req.params["deletion_date"];
    var question_id = req.params["question_id"];


    async function initDatum(client, callback) {
        const insertResponse = "INSERT INTO mobilemarket.datum (datum_owner, datum_type, data, deletion_date, task_id, question_id) VALUES ($1, $2, $3,$4, $5, $6) RETURNING datum_id;"
        const insertResponseValues = [user, 'response', {"response": answer}, deletion_date, taskid, question_id];
        await client.query(insertResponse, insertResponseValues, (err, res) => {
            if (err){
                return callback("Error inserting response into datum table");
            }
            response_id = res.rows[0]['datum_id'];
        })
        const linkSource = "INSERT INTO mobilemarket.datum_source (datum_id, source_id) VALUES ($1, $2);";
        const linkSouceValues = [response_id, login_id];
     
        await client.query(insertResponse, insertResponseValues, (err, res) => {
            if (err){
                return callback("Error linking source");
            }
        })

        const linkReceiver = "INSERT INTO mobilemarket.datum_receiver (datum_id, receiver_id) VALUES ($1, $2);";
        const linkReceiverValues = [login_id, response_id];
        await client.query(insertResponse, insertResponseValues, (err, res) => {
            if (err){
                return callback("Error linking response");
            }
        })
    }
    (async () => {
        // Connect to database
        const client = await pool.connect();
        await retryTxn(0, 15, client, initDatum, (err, result) => {
            if (err) {
                console.log("error")
                console.log(err)
                res.status(400);
                res.send(err);
            }
            else {
                res.status(200);
                res.send(result);
            }
        });
    })().catch((err) => console.log(err.stack));   

    /* 

        1. add to datum table
        INSERT INTO mobilemarket.datum
        (datum_owner, datum_type, data, deletion_date, task_id, question_id)
        VALUES
        (user, 'response', {"response": answer}, deletion_date, taskid, 
        question_id);

        2. get datum_id of entry from (1) — response_id
        "SELECT datum_id FROM mobilemarket.datum
        WHERE datum_owner = '" + user + "' 
        AND question_id = '" + question_id "';"

        3. add to datum_source and datum_receiver table
        INSERT INTO mobilemarket.datum_source
        (datum_id, source_id)
        VALUES
        (response_id, login_id);

        INSERT INTO mobilemarket.datum_receiver 
        (datum_id, receiver_id)
        VALUES
        (login_id, response_id);

    */
    res.status(200);
    res.send();
});


// Get All Responses Submitted
app.get("/seller/view/tasks/:username", async (req, res) => {
    var user = req.params["username"];
    async function getResponsesSubmitted(client, callback) {
        const q  = "SELECT * FROM mobilemarket.datum WHERE datum_owner = '" + user + "'AND datum_type = 'response';"
        await client.query(q, (err, res) => {
            if (err){
                return callback(err);
            }
            return callback(err, res.rows);
        })
    }
    (async () => {
        // Connect to database
        const client = await pool.connect();
        await retryTxn(0, 15, client, getResponsesSubmitted, (err, result) => {
            if (err) {
                console.log("error")
                console.log(err)
                res.status(400);
                res.send(err);
            }
            else {
                res.status(200);
                res.send(result);
            }
        });
    })().catch((err) => console.log(err.stack));   
    /* 
        1. select from datum table
        "SELECT * FROM mobilemarket.datum
        WHERE datum_owner = '" + user "'
        AND datum_type = 'response';"

    */ 
});


// ===== Buyer Endpoints ============

// Register
app.post("/buyer/signup", async(req, res) => {
    var user = req.body['username'];
    var pass = req.body['password'];
    const hash = crypto.createHash('sha256').update(pass).digest('base64');

    console.log(req)
    async function signupUser(client, callback) {
        const createUser = "INSERT INTO mobilemarket.buyer (username, password) VALUES ($1, $2)";
        const values = [user, hash];
        await client.query(createUser, values, (err, res) => {
            if (err){
                return callback(err, null)
            }
            else {
                return callback(err, res.rows[0])
            }
        });
    }

    (async () => {
        // Connect to database
        const client = await pool.connect();

        // Transfer funds in transaction retry wrapper
        console.log("Registering User...");
        await retryTxn(0, 15, client, signupUser, (err, result) => {
            if (err) {
                console.log("error")
                console.log(err)
                res.status(400);
                res.send(err);
            }
            else {
                console.log("success!")
                res.status(200);
                res.send(result);
            }
        });
    })().catch((err) => console.log(err.stack));    
});

// Login
app.post("/buyer/login", async (req, res) => {
    var user = req.body['username'];
    var pass = req.body['password'];
    const hash = crypto.createHash('sha256').update(pass).digest('base64');

    async function loginUser(client, callback) {
        const q = "SELECT * FROM mobilemarket.buyer WHERE username = '" + user + "';"
        await client.query(q, (err, res) => {
            if (err){
                return callback(err, null)
            }
            else {
                console.log(res)
                if (res.rows.length > 0){
                    return callback(err, res.rows[0].password)
                }
                else {
                    return callback("User DNE", null)
                }
            }
        })
    }

    (async () => {
        // Connect to database
        const client = await pool.connect();

        // Transfer funds in transaction retry wrapper
        await retryTxn(0, 15, client, loginUser, (err, result) => {
            if (err) {
                console.log("error")
                console.log(err)
                res.status(400);
                res.send("Failure");
            }
            else {
                if (result === hash){
                    res.status(200);
                    res.send("Success");
                }
                else {
                    res.status(300)
                    res.send("Failure");
                }
            }
        });
    })().catch((err) => console.log(err.stack));
});


// Create Task
app.post("/buyer/create/task", async (req, res, next) => {
    /*
    e.g format 
        {
            "irb_approval": "abc123",
            "question": "What is your favorite Ice Cream Flavor?",
            "answer1": "Strawberry",
            "answer2": "Vanilla",
            "answer3": "Chocolate",
            "answer4": "Other",
            "location": "41.8781:87.6298",
            "num_data_points": "3",
            "deadline": "06/01/2021",
            "budget": "15",
            "buyer_id": johndoe,
        }   
    */

    var irb_approval = req.body['irb_approval'];
    var question = req.body['question'];
    var answer1 = req.body['answer1'];
    var answer2 = req.body['answer2'];
    var answer3 = req.body['answer3'];
    var answer4 = req.body['answer4'];
    var location = req.body['location'];
    var num_data_points = req.body['num_data_points'];
    var deadline = req.body['deadline'];
    var budget = req.body['budget'];
    var buyer_id = req.body['buyer_id'];

    async function createTask(client, callback) {
        const q = "INSERT INTO mobilemarket.task (irb_approval, question, answer_1, answer_2, answer_3, answer_4, location, num_data_points, deadline, budget, status, buyer_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING task_id;"
        const values = [irb_approval, question, answer1, answer2, answer3, answer4, location, num_data_points, deadline, budget, "IN REVIEW", buyer_id]
        await client.query(q, values, (err, res) => {
            if (err){
                return callback(err);
            }
            return callback(err, res.rows[0]);
        })
    }

    (async () => {
        // Connect to database
        const client = await pool.connect();

        // Transfer funds in transaction retry wrapper
        console.log("Creating Task...");
        await retryTxn(0, 15, client, createTask, (err, result) => {
            if (err) {
                console.log("error")
                console.log(err)
                res.status(400);
                res.send(err);
            }
            else {
                console.log("success!")
                console.log(result)
                res.status(200);
                res.send(result);
            }
        });
    })().catch((err) => console.log(err.stack));   

    //todo: handling buyer dne


    /* 

        1. do we want tasks to be auto-approved, which means we automatically
        insert into the request and question tables as well?

        2. insert into task table
        INSERT INTO mobilemarket.task
        (irb_approval, question, answer_1, answer_2, answer_3, answer_4, 
        location, num_data_points, deadline, budget, status, buyer_id)
        VALUES
        (irb_approval, question, answer1, answer2, answer3, answer4,
        location, num_data_points, deadline, budget, "IN REVIEW", buyer_id);
    */
});


// Get All Tasks Made
app.get("/buyer/view/tasks/:username", async (req, res, next) => {
    var username = req.params["username"];
    async function getAllTasks(client, callback) {
        const q = "SELECT * FROM mobilemarket.task WHERE buyer_id = '" + username + "';"
        await client.query(q, (err, res) => {
            if (err){
                return callback(err);
            }
            return callback(err, res.rows);
        })
    }
    (async () => {
        // Connect to database
        const client = await pool.connect();

        // Transfer funds in transaction retry wrapper
        await retryTxn(0, 15, client, getAllTasks, (err, result) => {
            if (err) {
                console.log("error")
                console.log(err)
                res.status(400);
                res.send(err);
            }
            else {
                console.log(result)
                console.log("success!")
                res.status(200);
                res.send(result);
            }
        });
    })().catch((err) => console.log(err.stack));  
    /* 
        1. select from task table
        "SELECT * FROM mobilemarket.task
        WHERE buyer_id = '" + username + "';"

        ^ includes all task statuses
    
    res.status(200);
    res.send();
    */
});

// Get Processed Data For a Task
app.get("/buyer/view/results/:taskid", async(req, res, next) => {
    var taskid = req.params["taskid"];
    async function getProcessedData(client, callback) {
        const q = "SELECT data FROM mobilemarket.datum WHERE task_id = " + taskid + "AND datum_type = 'processed';"
        await client.query(q, (err, res) => {
            if (err){
                return callback(err);
            }
            return callback(err, res.rows);
        })
    }
    (async () => {
        // Connect to database
        const client = await pool.connect();

        // Transfer funds in transaction retry wrapper
        await retryTxn(0, 15, client, getProcessedData, (err, result) => {
            if (err) {
                console.log("error")
                console.log(err)
                res.status(400);
                res.send(err);
            }
            else {
                console.log(result)
                console.log("success!")
                res.status(200);
                res.send(result);
            }
        });
    })().catch((err) => console.log(err.stack));  

    /* 
        query below assumes data is already processed

        1. select from datum table
        "SELECT data FROM mobilemarket.datum
        WHERE task_id = " + taskid + "
        AND datum_type = 'processed';"

    */
});