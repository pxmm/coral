// Documentation on expected inputs and outputs here:
// https://docs.google.com/document/d/1lxV20TRWgL5rYEykQwSrHtl5sTBbiR8EmIj3XTpE7Yw/edit

// ============= Imports & Setup =======================
const express = require("express");
const crypto = require('crypto');

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
const { get, request } = require("http");
const { response } = require("express");

const pool = new Pool(dbconfig);


// Show API Docs on default page
app.get("/", (req, res, next) => {
    res.render("index.html");
});

//================== CRDB Helper Function ========================

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


// ============== Seller Endpoints =============================

// Checks if username exists
app.get("/seller/exists/:username", async(req, res) => {
    var user = req.params["username"];
    async function checkUsername(client, callback) {
        //Should do: Edit query using parametized queries to prevent sql injection attacks
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
        const client = await pool.connect();
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


// Register seller
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
        const client = await pool.connect();
        console.log("Registering User...");
        await retryTxn(0, 15, client, signupUser, (err, result) => {
            if (err) {
                console.log("error")
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


// Login seller
app.post("/seller/login", async (req, res) => {
    var user = req.body['username'];
    var pass = req.body['password'];
    // Hash password
    const hash = crypto.createHash('sha256').update(pass).digest('base64');

    async function loginUser(client, callback) {
        // Select from datum table
        const q = "SELECT datum_id, data->>'password' AS password FROM mobilemarket.datum WHERE datum_type = 'login' AND datum_owner = '" + user + "';"
        await client.query(q, (err, res) => {
            if (err){
                return callback(err, null)
            }
            else {
                return callback(err, res.rows)
            }
        })
    }

    (async () => {
        const client = await pool.connect();

        await retryTxn(0, 15, client, loginUser, (err, result) => {
            if (err) {
                res.status(404);
                res.send(err)
            }
            // USER exists
            else if (result.length > 0){
                hashpass = result[0].password
                // Check if password matches
                if (result === hash){
                    res.status(200);
                    res.send("Success");
                }
                else {
                    res.status(403)
                    res.send("Failure");
                }
            }
            //USER DNE
            else {
                res.status(403)
                res.send("Failure");
            }
        });
    })().catch((err) => console.log(err.stack));
});


// Get All Tasks For Sellers (Currently not personalized)
app.get("/seller/alltasks", async(req, res) => {
    var status = req.params["status"];
    var status = "'IN PROGRESS'"
    async function getAllTasks(client, callback) {
        // Should do: Edit to allow filtering tasks by status
        // const q = "SELECT * FROM mobilemarket.task WHERE status =" + status + ";"
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
});


// View A Task given a task ID
app.get("/tasks/:taskid", async (req, res) => {
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
});


// Submit Response
app.post("/seller/submit/:username/:taskid", async (req, res, next) => {
    var user = req.params["username"];
    var taskid = req.params["taskid"];
    var answer = req.body["answer"];
    var deletion_date = req.body["deletion_date"];
    var question_id = req.body["question_id"];

    // Verify values submitted
    // Should do: check the datetimes
    if (answer > 4 || answer < 1) {
        res.status(300)
        res.send("Answer out of bounds")
        return;
    }
    
    async function addToDatum(client, callback) {
        const q = "INSERT INTO mobilemarket.datum (datum_owner, datum_type, data, deletion_date, task_id, question_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING datum_id;"
        const data = {"response": answer}
        const v = [user, 'response', JSON.stringify(data), deletion_date, taskid, question_id];
        await client.query(q, v, (err, result) => {
            if (err){
                return callback(err);
            }
            console.log(result)
            console.log(result.rows)
            return callback(err, result.rows)
        })
    }

    async function getLoginID(client, callback) {
        const q = "SELECT datum_id FROM mobilemarket.datum WHERE datum_owner='" + user + "' AND datum_type = 'login';"
        await client.query(q, (err, result) => {
            if (err){
                return callback(err);
            }
            return callback(err, result.rows);
        })
    }

    async function addToDatumSource(client, response_id, login_id, callback) {
        const q = "INSERT INTO mobilemarket.datum_source (datum_id, source_id) VALUES ($1, $2);"
        const v = [response_id, login_id]
        await client.query(q, v, (err, result) => {
            if (err){
                return callback(err);
            }
            return callback(err, result.rows);
        })
    }
    
    (async () => {
        const client = await pool.connect();
        await addToDatum(client, (err, result) => {
            if (err) {
                res.status(400);
                res.send(err);
                return
            }
            response_id = result[0]['datum_id']
            
            getLoginID(client, (err, result) => {
                if (err) {
                    console.log(err)
                    res.status(404)
                    res.send(err)
                    return
                }
                login_id = result[0]['datum_id']

                addToDatumSource(client, response_id, login_id, (err, result) => {
                    if (err) {
                        console.log(err)
                        res.status(404)
                        res.send(err)
                    }
                    else {
                        console.log("success")
                        res.status(200)
                        res.send("Submitted")
                    }
                })
            })
        });
    })().catch((err) => console.log(err.stack));   
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

// Register buyer
app.post("/buyer/signup", async(req, res) => {
    var user = req.body['username'];
    var pass = req.body['password'];
    const hash = crypto.createHash('sha256').update(pass).digest('base64');

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

// Login buyer
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
                return callback(err, res.rows)
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
                res.status(404);
                res.send(err);
            }
            else {
                if (result.length > 0){
                    hashpass = result[0].password
                    if (hashpass === hash){
                        res.status(200);
                        res.send("Success");
                    }
                    else {
                        res.status(403)
                        res.send("Failure");
                    }
                }
                else {
                    res.status(403)
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

    // Check that body is properly formatted
    body_keys = Object.keys(req.body);
    required_fields = ['irb_approval', 'question', 'answer1', 'answer2', 'answer3', 'answer4', 'location', 'num_data_points', 'deadline', 'budget', 'buyer_id']
    missing_fields = []
    for (var i = 0; i < required_fields.length; i++) {
        f = required_fields[i]
        if (!(body_keys.includes(f))){
            missing_fields.push(f)
        }
    }
    if (missing_fields.length > 0){
        res.status(300)
        res.send({"missing": missing_fields})
    }
    else {    
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
            const client = await pool.connect();
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
    }
});


// Get All Tasks Made By Buyer
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
        const client = await pool.connect();

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
});

// Get Processed Data For a Task
app.get("/buyer/view/results/:taskid", async(req, res, next) => {
    var taskid = req.params["taskid"];

    /* 
        query below assumes data is already processed

        1. select from datum table
        "SELECT data FROM mobilemarket.datum
        WHERE task_id = " + taskid + "
        AND datum_type = 'processed';"

    */

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
        const client = await pool.connect();
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
});


// ===== Admin Endpoint ============


app.get("/admin/approve/:taskid", async(req, res) => {
    /*
    To approve tasks initially - this will create question ids for the task given
    e.g format 
        {
            "admin_username": "abc123", (Should do: maybe we should add the admin's username)
            "taskid": '0810ec0a-f7e2-4195-83e6-447337017b41'
        }   
    */
    var taskid = req.params["taskid"];

    async function formallyAddRequest(client, callback) {
        console.log("formally add request")
        const q = "INSERT INTO mobilemarket.request (time_sent, status, task_id) VALUES (CURRENT_TIMESTAMP, 'APPROVED', '"+ taskid + "') RETURNING request_id;"
        await client.query(q, (err, res) => {
            if (err){
                return callback(err);
            }
            return callback(err, res.rows)
        })
    }

    async function getTaskQuestions(client, callback) {
        console.log("get task questions")
        const q = "SELECT question, answer_1, answer_2, answer_3, answer_4 FROM mobilemarket.task WHERE task_id='" + taskid + "';"
        await client.query(q, (err, res) => {
            if (err){
                return callback(err);
            }
            if (res.rows.length > 0){
                return callback(err, res.rows)
            }
            else {
                return callback("DNE: task id does not exist")
            }   
        })
    }

    async function addQuestion(client, request_id, questionres, callback) {
        console.log("add question")
        console.log(questionres)
        question = questionres['question'];
        answer_1 = questionres['answer_1'];
        answer_2 = questionres['answer_2'];
        answer_3 = questionres['answer_3'];
        answer_4 = questionres['answer_4']; 

        const q = "INSERT INTO mobilemarket.question (question, answer_1, answer_2, answer_3, answer_4, question_number, request_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING question_id;";
        const v = [question, answer_1, answer_2, answer_3, answer_4, 1, request_id]
        await client.query(q, v, (err, res) => {
            if (err){
                return callback(err);
            }
            return callback(err, res.rows);
        })
    }

    async function updateTaskStatus(client, callback) {
        console.log("update task status")
        const q = "UPDATE mobilemarket.task SET status = 'APPROVED' WHERE task_id='"+ taskid + "';"
        await client.query(q, (err, res) => {
            if (err){
                return callback(err);
            }
            return callback(err, res.rows)
        })
    }

    (async () => {
        const client = await pool.connect();

        await getTaskQuestions(client, (err, result) => {
            if (err) {
                console.log(err)
                res.status(404)
                res.send(err)
                return
            }
            questionres = result[0]
            
            formallyAddRequest(client, (err, result) => {
                if (err) {
                    console.log(err)
                    res.status(404)
                    res.send(err)
                    return
                }
                
                request_id = result[0]['request_id']
                console.log(request_id)

                addQuestion(client, request_id, questionres, (err, result) => {
                    if (err) {
                        console.log(err)
                        res.status(404)
                        res.send(err)
                        return
                    }
                    question_id = result[0]['question_id']

                    updateTaskStatus(client, (err, result) => {
                        if (err) {
                            console.log(err)
                            res.status(404)
                            res.send(err)   
                            return
                        }
                        res.status(200)
                        res.send({"request_id": request_id, "question_ids": [question_id]})
                    })
                })
            })
        })
    })().catch((err) => console.log(err.stack));  
});