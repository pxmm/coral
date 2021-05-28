//Sample data for POST reqs

var seller1_username = "johndoe12345"
var seller1_password = "Password123"
var buyer1_username = "janedoe1"
var buyer1_password = "p@ssword!"

// (Seller & Buyer) - Signup (password reqs handled client side)

var s_valid_signup = 
{
    "username": seller1_username,
    "password": seller1_password,
}

var b_valid_signup = 
{
    "username": buyer1_username,
    "password": buyer1_password,
}

// (Seller & Buyer) - Valid Login

var s_valid_login = s_valid_signup
var b_valid_login = b_valid_signup

// (Seller & Buyer) - Invalid Login - Wrong password

var s_invalid_login_wrong_pass =
{
    "username": seller1_username,
    "password": seller1_password + Math.random()
}

var b_invalid_login_wrong_pass =
{
    "username": buyer1_username,
    "password": buyer1_password + Math.random()
}

// (Seller & Buyer) - Invalid Login - User does not exist

var s_invalid_login_user_dne =
{
    "username": seller1_username + Math.random(),
    "password": seller1_password
}

var b_invalid_login_user_dne =
{
    "username": buyer1_username + Math.random(),
    "password": buyer1_password
}

// (Buyer) - Create Task
var task1 = {
    "irb_approval": "abc123",
    "question": "What is your favorite Ice Cream Flavor?",
    "answer1": "Strawberry",
    "answer2": "Vanilla",
    "answer3": "Chocolate",
    "answer4": "Other",
    "location": "POINT(0 0)", //I just used chicago latitude and longitude points
    "num_data_points": "3",
    "deadline": '2025-01-25',
    "budget": "15",
    "buyer_id": buyer1_username,
} 

// (Buyer) - Create Task
var task2 = {
    "irb_approval": "abc1234",
    "question": "What is your favorite Ice Cream Flavor Pt2?",
    "answer1": "Strawberry",
    "answer2": "Vanilla",
    "answer3": "Chocolate",
    "answer4": "Other",
    "location": "POINT(0 0)", //I just used chicago latitude and longitude points
    "num_data_points": "3",
    "deadline": '2025-01-25',
    "budget": "25",
    "buyer_id": buyer1_username,
} 

// throw error, no irb_approval
var task3 = {
    "question": "What is your favorite Ice Cream Flavor Pt2?",
    "answer1": "Strawberry",
    "answer2": "Vanilla",
    "answer3": "Chocolate",
    "answer4": "Other",
    "location": "POINT(0 0)", //I just used chicago latitude and longitude points
    "num_data_points": "3",
    "deadline": '2025-01-25',
    "budget": "25",
    "buyer_id": buyer1_username,
} 

// no error, 2 answer options should be fine
var task4 = {
    "irb_approval": "abc1234",
    "question": "Cats or dogs?",
    "answer1": "Cats",
    "answer2": "Dogs",
    "location": "POINT(0 0)", //I just used chicago latitude and longitude points
    "num_data_points": "20",
    "deadline": '2025-01-25',
    "budget": "100",
    "buyer_id": buyer1_username,
} 

// throw error, need 2 options minimum
var task5 = {
    "irb_approval": "abc1234",
    "question": "Cats or dogs?",
    "answer1": "Cats",
    "location": "POINT(0 0)", //I just used chicago latitude and longitude points
    "num_data_points": "20",
    "deadline": '2025-01-25',
    "budget": "100",
    "buyer_id": buyer1_username,
} 

// throw error, cannot have more than 4 options
var task6 = {
    "irb_approval": "abc1234",
    "question": "What is your favorite Ice Cream Flavor Pt2?",
    "answer1": "Strawberry",
    "answer2": "Vanilla",
    "answer3": "Chocolate",
    "answer4": "Other",
    "answer5": "Rocky Road",
    "location": "POINT(0 0)", //I just used chicago latitude and longitude points
    "num_data_points": "20",
    "deadline": '2025-01-25',
    "budget": "100",
    "buyer_id": buyer1_username,
} 

// throw error, missing location
var task6 = {
    "irb_approval": "abc1234",
    "question": "What is your favorite Ice Cream Flavor Pt2?",
    "answer1": "Strawberry",
    "answer2": "Vanilla",
    "answer3": "Chocolate",
    "answer4": "Other",
    "num_data_points": "20",
    "deadline": '2025-01-25',
    "budget": "100",
    "buyer_id": buyer1_username,
} 

// throw error, missing # data points
var task7 = {
    "irb_approval": "abc1234",
    "question": "What is your favorite Ice Cream Flavor Pt2?",
    "answer1": "Strawberry",
    "answer2": "Vanilla",
    "answer3": "Chocolate",
    "answer4": "Other",
    "location": "POINT(0 0)", //I just used chicago latitude and longitude points
    "deadline": '2025-01-25',
    "budget": "100",
    "buyer_id": buyer1_username,
} 

// throw error, no deadline
var task8 = {
    "irb_approval": "abc1234",
    "question": "What is your favorite Ice Cream Flavor Pt2?",
    "answer1": "Strawberry",
    "answer2": "Vanilla",
    "answer3": "Chocolate",
    "answer4": "Other",
    "location": "POINT(0 0)", //I just used chicago latitude and longitude points
    "num_data_points": "20",
    "budget": "100",
    "buyer_id": buyer1_username,
} 

// throw error, no budget
var task9 = {
    "irb_approval": "abc1234",
    "question": "What is your favorite Ice Cream Flavor Pt2?",
    "answer1": "Strawberry",
    "answer2": "Vanilla",
    "answer3": "Chocolate",
    "answer4": "Other",
    "location": "POINT(0 0)", //I just used chicago latitude and longitude points
    "num_data_points": "20",
    "deadline": '2025-01-25',
    "buyer_id": buyer1_username,
} 

// throw error, no buyer_id
var task10 = {
    "irb_approval": "abc1234",
    "question": "What is your favorite Ice Cream Flavor Pt2?",
    "answer1": "Strawberry",
    "answer2": "Vanilla",
    "answer3": "Chocolate",
    "answer4": "Other",
    "location": "POINT(0 0)", //I just used chicago latitude and longitude points
    "num_data_points": "20",
    "deadline": '2025-01-25',
    "budget": "100",
} 

// throw error, options need to be in order
var task11 = {
    "irb_approval": "abc1234",
    "question": "What is your favorite Ice Cream Flavor Pt2?",
    "answer1": "Strawberry",
    "answer2": "Vanilla",
    "answer4": "Other",
    "location": "POINT(0 0)", //I just used chicago latitude and longitude points
    "num_data_points": "20",
    "deadline": '2025-01-25',
    "budget": "100",
    "buyer_id": buyer1_username,
} 

// throw error, budget cannot be negative
var task12 = {
    "irb_approval": "abc1234",
    "question": "What is your favorite Ice Cream Flavor Pt2?",
    "answer1": "Strawberry",
    "answer2": "Vanilla",
    "answer3": "Chocolate",
    "answer4": "Other",
    "location": "POINT(0 0)", //I just used chicago latitude and longitude points
    "num_data_points": "3",
    "deadline": '2025-01-25',
    "budget": "-10",
    "buyer_id": buyer1_username,
} 



// (Seller) - Submit Response

var task1_response1 = {
    "answer": "1",
    "deletion_date": "2025-01-25",
    "question_id": "5f6a7b1f-dc41-4333-9756-a444c44fb162"
}

var task1_response2 = {
    "answer": "3",
    "deletion_date": "06/20/2021",
    "question_id": "5f6a7b1f-dc41-4333-9756-a444c44fb162"
}

// no answer, should throw error
var task1_response3 = {
    "deletion_date": "06/20/2021",
    "question_id": "5f6a7b1f-dc41-4333-9756-a444c44fb162"
}

// answer out of bounds, throw error
var task1_response4 = {
    "answer": "0",
    "deletion_date": "06/20/2021",
    "question_id": "5f6a7b1f-dc41-4333-9756-a444c44fb162"
}

// answer out of bounds, throw error
var task1_response5 = {
    "answer": "5",
    "deletion_date": "06/20/2021",
    "question_id": "5f6a7b1f-dc41-4333-9756-a444c44fb162"
}

// no question_id, throw error
var task1_response6 = {
    "answer": "3",
    "deletion_date": "06/20/2021"
}

// =======================================================================
const axios = require('axios')

base_url = "http://localhost:8000"

function create_seller() {
    var url = "/signup"
    axios.post(base_url + "/seller" + url, 
        s_valid_signup
    )
    .then(res => {
        console.log(res.status)
        console.log(res.data)
      })
      .catch(error => {
        //console.error(error)
    })
}

function login_seller() {
    var url = "/login"
    axios.post(base_url + "/seller" + url, 
        s_invalid_login_user_dne
    )
    .then(res => {
        console.log(res)
        console.log(res.status)
        console.log(res.data)
      })
      .catch(error => {
        console.error(error)
        console.log(res.status)
        console.log(res.data)
    })
}


function create_buyer() {
    var url = "/signup"
    axios.post(base_url + "/buyer" + url, 
        b_valid_signup
    )   
}

function login_buyer() {
    var url = "/login"
    axios.post(base_url + "/buyer" + url, 
        b_valid_login
    )
    .then(res => {
        console.log(res)
        console.log(res.status)
        console.log(res.data)
      })
      .catch(error => {
        console.error(error)
    })
}

function create_task() {
    var url = "/create/task"
    axios.post(base_url + "/buyer" + url,
        task2)  
}

function submit_response(username, taskid){
    var url = "/submit/" + username + "/" + taskid
    axios.post(base_url + "/seller" + url, 
        task1_response1
    ).then(res => {
        console.log(res)
        console.log(res.status)
        console.log(res.data)
      })
      .catch(error => {
        console.error(error)
    })
}

//create_seller()
//login_seller()
//create_buyer()
//login_buyer()
//create_task()
//submit_response(seller1_username, '0810ec0a-f7e2-4195-83e6-447337017b41')