var express = require("express");
const app = express();
const http = require('http');
const server = http.createServer(app); // Create an HTTP server
const port = 3000;
const path = require("path");
const con = require("./connection");
var bodyParser = require("body-parser");
const cors = require('cors');
const { Server } = require('socket.io');

const session = require("express-session");
const sharedSession = require("express-socket.io-session");
const { render } = require("ejs");
var multer = require("multer");

const sessionMiddleware = session({
  secret: "flashblog",
  saveUninitialized: true,
  resave: true,
  cookie: {
    maxAge: 60*60*1000,
    secure: false
  },
});

// Use session middleware for Express
app.use(sessionMiddleware);

// Socket.IO initialization
const io = new Server(server, {
  cors: {
    origin: "*", // Same port as the Express app
    methods: ["GET", "POST"]
  }
});

// Use shared session middleware for Socket.IO
io.use(sharedSession(sessionMiddleware, {
  autoSave: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/static", express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static("files"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("public", path.join(__dirname, "public"));
app.use("/images", express.static("public/uploads"));

app.use(cors());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

app.post("/file", upload.single("image"), (req, res, next) => {
  // console.log(req.file);
  const name = req.session.name;
  const email = req.session.email;
  
  const caption=req.body.caption;
  
  const server_url = `${req.protocol}://${req.get("host")}`;
  if (!req.file) {
    res.send("no select file");
  } else {
    var image = req.file.filename;
    var sql = `INSERT INTO tbl_details(name, email, image, image_url,caption) VALUES ("${name}", "${email}", "${image}", "${server_url}","${caption}")`;
    con.query(sql, (error, result1) => {
      res.redirect("/post");
    });
  }
});

app.get("/add", (req, res) => {
  const session = req.session;
  if (session && session.email) {
    const sql = `SELECT * FROM user_details WHERE email = '${session.email}'`;
    con.query(sql, (error, result) => {
      console.log(result);
      if (error) throw error;

      res.render("add", { data: result });
    });
  } else {
    res.redirect("/login");
  }
});


app.get("/post", (req, res, next) => {
  const session=req.session;
  if(session && session.email)
  {
    const fatchimage = `SELECT * FROM tbl_details`;
  con.query(fatchimage, (error, result) => {
    if (error) throw error;
    res.render("post", { data: result,name:session.name });
  });
  }
  else{
    res.redirect("/login")
  }
});

//delete
app.post('/delete-image', (req, res) => {
  const imageName = req.body.image;

  // SQL query to delete image from database
  const query = `DELETE FROM tbl_details WHERE image = ?`;

  con.query(query, [imageName], (err, results) => {
      if (err) {
          console.error('Error deleting image:', err);
          res.json({ status: 'error', error: err.message });
      } else {
          res.json({ status: 'success' });
      }
  });
});

app.get("/profile", (req, res, next) => {
  const session=req.session;
  if(session && session.email)
  {
    const query = 'SELECT * FROM user_details WHERE name = ?';
    con.query(query, [req.session.name], (err, results) => {
        if (err) {
            return res.status(500).send('Error fetching user profile');
        }
  
        if (results.length > 0) {
            // Render the profile page with the user's information
            const fatchimage = `SELECT * FROM tbl_details`;
            con.query(fatchimage, (error, result) => {
              if (error) throw error;
              res.render("profile", { data: result, user: results[0] ,name:session.name, LoggedInUser:req.session.name});
            });
        } 
        else{
          res.redirect('/login');
        }
    });


  }
  else {
    // Handle case when user is not found
    res.redirect("/login")        }
});

//delete
app.post('/delete-image', (req, res) => {
  const imageName = req.body.image;

  // SQL query to delete image from database
  const query = `DELETE FROM tbl_details WHERE image = ?`;

  con.query(query, [imageName], (err, results) => {
      if (err) {
          console.error('Error deleting image:', err);
          res.json({ status: 'error', error: err.message });
      } else {
          res.json({ status: 'success' });
      }
  });
});

app.get("/", (req, res) => {
  const session = req.session;
  if (session && session.email) {
    const sql = `SELECT * FROM user_details WHERE email = '${session.email}'`;
    con.query(sql, (error, result) => {
      if (error) throw error;
      res.render("login", { data: result ,name:session.name}); // Adjust this line to match your EJS file name
    });
  } else {
    res.render("login", { data: [] });
  }
});
app.get("/confirm", (req, res) => {
  
  req.session.destroy((err) => {
    if (err) {
      console.log("Error destroying session:", err);
    } else {
      res.redirect("/");
    }
  });
});

app.get("/logout", (req, res) => {
  
  res.render("confirm");
});



app.get("/login", (req, res) => {
  const session = req.session;
  if (session && session.email && session.name ) {
    user_name=session.email;
    const sql = `SELECT * FROM user_details WHERE email = '${session.email}'`;
    con.query(sql, (error, result) => {
      if (error) throw error;
      res.render("login", { data: result });
    });
  } else {
    res.render("login", { data: [],user_name: null});
  }
});

app.get("/signup", (req, res) => {
  const session = req.session;
  if (session && session.email) {
    const sql =` SELECT * FROM user_details WHERE email = '${session.email}'`;
    con.query(sql, (error, result) => {
      if (error) throw error;
      res.render("register", { data: result });
    });
  } else {
    res.render("register", { data: [] });
  }
});

app.post("/login", (req, res) => {
  var email = req.body.email;
  var password = req.body.password;

  var sql = `SELECT * FROM user_details WHERE email = "${email}" AND password = "${password}"`;
  con.query(sql, function (error, result) {
    if (error) throw error;
    if (result[0]) {
      const session = req.session;
      session.email = result[0].email;
      session.name = result[0].name; // Assuming you want to store the user's name in the session
      
      
      res.redirect("/profile");
    } else {
      res.send("Invalid Username and Password");
    }
  });
});
app.post("/register", upload.single("profile_image"), (req, res) => {
  var name = req.body.name;
  var email = req.body.email;
  var password = req.body.password;
  var cpassword = req.body.cpass;
  var profileImage = req.file ? req.file.filename : "default.png"; // Use default if no image uploaded

  const sql = "SELECT * FROM user_details WHERE email = ? ";
  con.query(sql, [email], (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      res.send("Email already exists");
    } else {
      if (password == cpassword) {
        const nsql =
          "INSERT INTO user_details (name, email, password, profile_image) VALUES ('" +
          name +
          "', '" +
          email +
          "', '" +
          password +
          "', '" + profileImage + "')";
        con.query(nsql, function (err) {
          if (err) throw err;
          res.redirect("/login");
        });
      } else {
        res.send("Password and Confirm Password do not match");
      }
    }
  });
});
app.post('/upload-profile-image', upload.single('profile_image'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const userId = req.session.email; 
  const profileImage = req.file.filename;

  const sql = 'UPDATE user_details SET profile_image = ? WHERE email = ?';
  con.query(sql, [profileImage, userId], (err, result) => {
    if (err) {
      console.error('Error updating profile image:', err);
      return res.status(500).send('Server error.');
    }

    res.redirect('/edit');
  });
});

app.post('/save_changes', (req, res) => {
  if (req.session && req.session.email) {
    const userId = req.session.email;
    const userName = req.body.name;
    const userBio = req.body.bio;

    // Update the user's name and bio in the database
    const sql = 'UPDATE user_details SET name = ?, bio = ? WHERE email = ?';
    con.query(sql, [userName, userBio, userId], (err, result) => {
      if (err) {
        console.error('Error updating profile:', err);
        return res.status(500).send('Error saving profile changes');
      }

      res.redirect('/profile'); // Redirect to profile page after saving changes
    });
  } else {
    res.status(401).send('Unauthorized: No active session');
  }
});





app.get('/edit', (req, res) => {
  if (req.session && req.session.email) {
    const query = 'SELECT * FROM user_details WHERE email = ?';
    con.query(query, [req.session.email], (err, results) => {
      if (err) {
        return res.status(500).send('Error fetching user profile');
      }

      if (results.length > 0) {
        res.render('editProfile', { user: results[0] });
      } else {
        res.status(404).send('User not found');
      }
    });
  } else {
    res.redirect('/login'); // Redirect if not logged in
  }
});



app.get('/profile/:name', (req, res) => {
  const userName = req.params.name;  // Get the user name from the URL

  const session=req.session;
  if(session && session.email)
  {
    const query = 'SELECT * FROM user_details WHERE name = ?';
    con.query(query, [userName], (err, results) => {
        if (err) {
            return res.status(500).send('Error fetching user profile');
        }
  
        if (results.length > 0) {
            // Render the profile page with the user's information
            const fatchimage = `SELECT * FROM tbl_details`;
            con.query(fatchimage, (error, result) => {
              if (error) throw error;
              res.render("profile", { data: result, user: results[0] ,name:userName,LoggedInUser:req.session.name});
            });
        } 
    });


  }
  else {
    // Handle case when user is not found
    res.redirect("/login") }
});

// Socket.IO connection handling
const users = {};

io.on('connection', (socket) => {
  const session = socket.handshake.session;
  // console.log('Session on connection:', session);
  if (session && session.name) {
    socket.emit('user-name', session.name);
  }

  socket.on('new-user-joined', (name) => {
    name=session.name;
    users[socket.id] = name;
    if (session && session.name) {
      socket.broadcast.emit('user-joined', name);
    }
    
  });

  // Send chat history when a new user connects
  const historySql = 'SELECT sender, message, timestamp FROM chat_messages ORDER BY timestamp ASC';

con.query(historySql, (err, results) => {
  if (err) {
    console.error('Error fetching chat history:', err);
    throw err;
  }

  // Add the user's name to each message object
  const chatHistoryWithName = results.map(message => ({
    ...message,
    name: socket.handshake.session.name
  }));

  // Emit the modified chat history to the client
  socket.emit('chat-history', chatHistoryWithName);



  socket.on('privateMessage', (data) => {
    const { senderId, receiverId, message } = data;

    // Store message in the database
    const query = `INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)`;
    con.query(query, [senderId, receiverId, message], (err) => {
        if (err) throw err;
    });

    // Emit the message to the receiver
    io.to(receiverId).emit('receiveMessage', data);
});

socket.on('joinRoom', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined the room`);
});





});

  socket.on('send', message => {
    const sender = users[socket.id];
    const sql = `INSERT INTO chat_messages (sender, message) VALUES ('${sender}', '${message}')`;
    
    con.query(sql, [sender, message], (err) => {
      if (err) throw err;
      // console.log('Message saved to the database');
    });

    socket.broadcast.emit('receive', { message: message, name: sender });
  });

  socket.on('disconnect', () => {
    socket.broadcast.emit('left', users[socket.id]);
    delete users[socket.id];
  });

  

});

app.get("/chat", (req, res) => {
  const session = req.session;
  if (session && session.email && session.name) {
    console.log(session.name);
    res.render("chat", { data: session.name }); // Pass the session data to the chat template
  } else {
    res.redirect("/login");
  }
});

app.get('/get-like-status/:imageName', (req, res) => {
  const imageName = req.params.imageName;
  const userEmail = req.session.email; 

  // Fetch like count
  const likeQuery = `SELECT COUNT(*) as likes FROM user_likes WHERE image = ?`;
  const userLikeQuery = `SELECT COUNT(*) as userLiked FROM user_likes WHERE user_email = ? AND image = ?`;

  con.query(likeQuery, [imageName], (err, likeResults) => {
      if (err) {
          console.error('Error fetching like count:', err);
          return res.status(500).json({ error: 'Error fetching like count' });
      }

      con.query(userLikeQuery, [userEmail, imageName], (err, userLikeResults) => {
          if (err) {
              console.error('Error fetching user like status:', err);
              return res.status(500).json({ error: 'Error fetching user like status' });
          }

          res.json({
              likes: likeResults[0].likes,
              userLiked: userLikeResults[0].userLiked > 0
          });
      });
  });
});

// Route to handle like/unlike toggle
app.post('/like-post', express.json(), (req, res) => {
  const image = req.body.image;
  const userEmail = req.session.email;

  if (!userEmail) {
      return res.status(401).json({ error: 'User not authenticated' });
  }

  const checkLikeQuery = 'SELECT * FROM user_likes WHERE user_email = ? AND image = ?';
  con.query(checkLikeQuery, [userEmail, image], (err, results) => {
      if (err) {
          console.error('Error checking like status:', err);
          return res.status(500).json({ error: 'An error occurred' });
      }

      if (results.length > 0) {
          // User has already liked the post, so remove the like
          const deleteLikeQuery = 'DELETE FROM user_likes WHERE user_email = ? AND image = ?';
          con.query(deleteLikeQuery, [userEmail, image], (err) => {
              if (err) {
                  console.error('Error removing like:', err);
                  return res.status(500).json({ error: 'An error occurred' });
              }

              const decrementLikeQuery = 'UPDATE tbl_details SET likes = likes - 1 WHERE image = ?';
              con.query(decrementLikeQuery, [image], (err) => {
                  if (err) {
                      console.error('Error decrementing like count:', err);
                      return res.status(500).json({ error: 'An error occurred' });
                  }

                  res.json({ status: 'disliked' });
              });
          });
      } else {
          // User has not liked the post, so add a like
          const addLikeQuery = 'INSERT INTO user_likes (user_email, image) VALUES (?, ?)';
          con.query(addLikeQuery, [userEmail, image], (err) => {
              if (err) {
                  console.error('Error adding like:', err);
                  return res.status(500).json({ error: 'An error occurred' });
              }

              const incrementLikeQuery = 'UPDATE tbl_details SET likes = likes + 1 WHERE image = ?';
              con.query(incrementLikeQuery, [image], (err) => {
                  if (err) {
                      console.error('Error incrementing like count:', err);
                      return res.status(500).json({ error: 'An error occurred' });
                  }

                  res.json({ status: 'liked' });
              });
          });
      }
  });
});

app.get('/search', (req, res) => {
  if (req.session && req.session.email ) {
    
  
  const query = 'SELECT * FROM user_details'

  con.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      res.sendStatus(500);
    } else {
      // Render the search page with the list of users
      res.render('searchUser', { data:req.session.name, users: results });
    }
  });
}else{res.redirect('/login')}
});












//private chat

app.get('/dm', (req, res) => {
  if (req.session && req.session.email) {
    const { name, email } = req.session;
    const query = `SELECT * FROM user_details WHERE name = ? AND email = ?`;
    con.query(query, [name, email], (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            res.redirect(`/privateChat/${result[0].id}`);
        } else {
            res.send('Invalid credentials');
        }
    });
  }
  else{
    res.render('login')
  }
})


app.get('/privateChat-history/:receiverId', (req, res) => {
  const senderId = req.query.senderId;
  const receiverId = req.params.receiverId;

  const query = `
      SELECT * FROM messages
      WHERE (sender_id = ? AND receiver_id = ?) 
      OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at ASC
  `;

  con.query(query, [senderId, receiverId, receiverId, senderId], (err, messages) => {
      if (err) throw err;
      res.json(messages);
  });
});

app.get('/privateChat/:userId', (req, res) => {
  const userId = req.params.userId;
  con.query('SELECT * FROM user_details WHERE id != ?', [userId], (err, users) => {
      if (err) throw err;

      // Fetch chat history between the logged-in user and selected users
      const chatHistoryQuery = `
          SELECT * FROM messages 
          WHERE (sender_id = ? AND receiver_id = ?) 
          OR (sender_id = ? AND receiver_id = ?)
          ORDER BY created_at ASC
      `;

      // You need to replace the "0" values with actual sender and receiver IDs
      con.query(chatHistoryQuery, [userId, 0, 0, userId], (err, messages) => {
          if (err) throw err;
          res.render('privateChat', { users, userId, messages: JSON.stringify(messages) });
      });
  });
});

server.listen(port,'192.168.168.198', () => {
  console.log(`Server running on http://192.168.168.198:${port}`);
});






























































// var express = require("express");
// const app = express();
// const http = require('http');
// const server = http.createServer(app); // Create an HTTP server
// const port = 3000;
// const path = require("path");
// const con = require("./connection");
// var bodyParser = require("body-parser");
// const cors = require('cors');
// const { Server } = require('socket.io');

// const session = require("express-session");
// const sharedSession = require("express-socket.io-session");
// const { render } = require("ejs");
// var multer = require("multer");

// const sessionMiddleware = session({
//   secret: "flashblog",
//   saveUninitialized: true,
//   resave: true,
//   cookie: {
//     maxAge: 60*60*1000,
//     secure: false
//   },
// });

// // Use session middleware for Express
// app.use(sessionMiddleware);

// // Socket.IO initialization
// const io = new Server(server, {
//   cors: {
//     origin: "*", // Same port as the Express app
//     methods: ["GET", "POST"]
//   }
// });

// // Use shared session middleware for Socket.IO
// io.use(sharedSession(sessionMiddleware, {
//   autoSave: true
// }));

// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

// app.use("/static", express.static(path.join(__dirname, "public")));
// app.use(express.static(path.join(__dirname, "public")));
// app.use(express.static("files"));
// app.set("view engine", "ejs");
// app.set("views", path.join(__dirname, "views"));
// app.set("public", path.join(__dirname, "public"));
// app.use("/images", express.static("public/uploads"));

// app.use(cors());

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "public/uploads");
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + "-" + file.originalname);
//   },
// });
// const upload = multer({ storage });

// app.post("/file", upload.single("image"), (req, res, next) => {
//   // console.log(req.file);
//   const name = req.session.name;
//   const email = req.session.email;
  
//   const caption=req.body.caption;
  
//   const server_url = `${req.protocol}://${req.get("host")}`;
//   if (!req.file) {
//     res.send("no select file");
//   } else {
//     var image = req.file.filename;
//     var sql1 = `INSERT INTO tbl_details(name, email, image, image_url,caption) VALUES ("${name}", "${email}", "${image}", "${server_url}","${caption}")`;
//     con.query(sql1, (error, result1) => {
//       res.redirect("/");
//     });
//   }
// });

// app.get("/add", (req, res) => {
//   const session = req.session;
//   if (session && session.email) {
//     const sql = `SELECT * FROM user_details WHERE email = '${session.email}'`;
//     con.query(sql, (error, result) => {
//       console.log(result);
//       if (error) throw error;

//       res.render("add", { data: result });
//     });
//   } else {
//     res.redirect("/login");
//   }
// });


// app.get("/post", (req, res, next) => {
//   const session=req.session;
//   if(session && session.email)
//   {
//     const fatchimage = `SELECT * FROM tbl_details`;
//   con.query(fatchimage, (error, result) => {
//     if (error) throw error;
//     res.render("post", { data: result,name:session.name });
//   });
//   }
//   else{
//     res.redirect("/login")
//   }
// });

// //delete
// app.post('/delete-image', (req, res) => {
//   const imageName = req.body.image;

//   // SQL query to delete image from database
//   const query = `DELETE FROM tbl_details WHERE image = ?`;

//   con.query(query, [imageName], (err, results) => {
//       if (err) {
//           console.error('Error deleting image:', err);
//           res.json({ status: 'error', error: err.message });
//       } else {
//           res.json({ status: 'success' });
//       }
//   });
// });

// app.get("/profile", (req, res, next) => {
//   const session=req.session;
//   if(session && session.email)
//   {
//     const query = 'SELECT * FROM user_details WHERE name = ?';
//     con.query(query, [req.session.name], (err, results) => {
//         if (err) {
//             return res.status(500).send('Error fetching user profile');
//         }
  
//         if (results.length > 0) {
//             // Render the profile page with the user's information
//             const fatchimage = `SELECT * FROM tbl_details`;
//             con.query(fatchimage, (error, result) => {
//               if (error) throw error;
//               res.render("profile", { data: result, user: results[0] ,name:session.name, LoggedInUser:req.session.name});
//             });
//         } 
//     });


//   }
//   else {
//     // Handle case when user is not found
//     res.redirect("/login")        }
// });

// //delete
// app.post('/delete-image', (req, res) => {
//   const imageName = req.body.image;

//   // SQL query to delete image from database
//   const query = `DELETE FROM tbl_details WHERE image = ?`;

//   con.query(query, [imageName], (err, results) => {
//       if (err) {
//           console.error('Error deleting image:', err);
//           res.json({ status: 'error', error: err.message });
//       } else {
//           res.json({ status: 'success' });
//       }
//   });
// });

// app.get("/", (req, res) => {
//   const session = req.session;
//   if (session && session.email) {
//     const sql = `SELECT * FROM user_details WHERE email = '${session.email}'`;
//     con.query(sql, (error, result) => {
//       if (error) throw error;
//       res.render("index", { data: result }); // Adjust this line to match your EJS file name
//     });
//   } else {
//     res.render("index", { data: [] });
//   }
// });

// app.get("/logout", (req, res) => {
  
//   res.render("confirm");
// });

// app.get("/confirm", (req, res) => {
  
//   req.session.destroy((err) => {
//     if (err) {
//       console.log("Error destroying session:", err);
//     } else {
//       res.redirect("/");
//     }
//   });
// });

// app.get("/login", (req, res) => {
//   const session = req.session;
//   if (session && session.email && session.name ) {
//     user_name=session.email;
//     const sql = `SELECT * FROM user_details WHERE email = '${session.email}'`;
//     con.query(sql, (error, result) => {
//       if (error) throw error;
//       res.render("login", { data: result });
//     });
//   } else {
//     res.render("login", { data: [],user_name: null});
//   }
// });

// app.get("/signup", (req, res) => {
//   const session = req.session;
//   if (session && session.email) {
//     const sql =` SELECT * FROM user_details WHERE email = '${session.email}'`;
//     con.query(sql, (error, result) => {
//       if (error) throw error;
//       res.render("register", { data: result });
//     });
//   } else {
//     res.render("register", { data: [] });
//   }
// });

// app.post("/register", upload.single("profile_image"), (req, res) => {
//   var name = req.body.name;
//   var email = req.body.email;
//   var password = req.body.password;
//   var cpassword = req.body.cpass;
//   var profileImage = req.file ? req.file.filename : "default.png"; // Use default if no image uploaded

//   const sql = "SELECT * FROM user_details WHERE email = ? ";
//   con.query(sql, [email], (err, result) => {
//     if (err) throw err;
//     if (result.length > 0) {
//       res.send("Email already exists");
//     } else {
//       if (password == cpassword) {
//         const nsql =
//           "INSERT INTO user_details (name, email, password, profile_image) VALUES ('" +
//           name +
//           "', '" +
//           email +
//           "', '" +
//           password +
//           "', '" + profileImage + "')";
//         con.query(nsql, function (err) {
//           if (err) throw err;
//           res.redirect("/login");
//         });
//       } else {
//         res.send("Password and Confirm Password do not match");
//       }
//     }
//   });
// });
// app.post('/upload-profile-image', upload.single('profile_image'), (req, res) => {
//   if (!req.file) {
//       return res.status(400).send('No file uploaded.');
//   }

//   const userId = req.session.email; // Assuming you're using session to track the user
//   const profileImage = req.file.filename; // The filename of the uploaded image
//   const userName=req.body.name;
//   const userBio=req.body.bio;

//   // Update the user's profile image in the database
//   const sql = 'UPDATE user_details SET profile_image = ?,name=?,bio=? WHERE email = ?';
//   con.query(sql, [profileImage,userName,userBio, userId], (err, result) => {
//       if (err) {
//           console.error('Error updating profile image:', err);
//           return res.status(500).send('Server error.');
//       }

//       res.redirect('/edit'); // Redirect to profile page after upload
//   });
// });

// app.post('/save_changes', (req, res) => {
  

//   const userId = req.session.email; // Assuming you're using session to track the user
//   const userName=req.body.name;
//   const userBio=req.body.bio;

//   // Update the user's profile image in the database
//   const sql = 'UPDATE user_details SET name=?,bio=? WHERE email = ?';
//   con.query(sql, [userName,userBio, userId], (err, result) => {
      

//       res.redirect('/edit'); // Redirect to profile page after upload
//   });
// });


// app.post("/login", (req, res) => {
//   var email = req.body.email;
//   var password = req.body.password;

//   var sql = `SELECT * FROM user_details WHERE email = "${email}" AND password = "${password}"`;
//   con.query(sql, function (error, result) {
//     if (error) throw error;
//     if (result[0]) {
//       const session = req.session;
//       session.email = result[0].email;
//       session.name = result[0].name; // Assuming you want to store the user's name in the session
      
      
//       res.redirect("/");
//     } else {
//       res.send("Invalid Username and Password");
//     }
//   });
// });

// app.get('/edit',(req,res)=>{

//   if (req.session && req.session.email) {
//     const query = 'SELECT * FROM user_details WHERE name = ?';
//     con.query(query, [req.session.name], (err, results) => {
//         if (err) {
//             return res.status(500).send('Error fetching user profile');
//         }
  
//         if (results.length > 0) {
//             // Render the profile page with the user's information
//             res.render('editProfile', { user: results[0] });
//         } else {
//             // Handle case when user is not found
//             res.status(404).send('User not found');
//         }
//     });
// }})


// app.get('/profile/:name', (req, res) => {
//   const userName = req.params.name;  // Get the user name from the URL

//   const session=req.session;
//   if(session && session.email)
//   {
//     const query = 'SELECT * FROM user_details WHERE name = ?';
//     con.query(query, [userName], (err, results) => {
//         if (err) {
//             return res.status(500).send('Error fetching user profile');
//         }
  
//         if (results.length > 0) {
//             // Render the profile page with the user's information
//             const fatchimage = `SELECT * FROM tbl_details`;
//             con.query(fatchimage, (error, result) => {
//               if (error) throw error;
//               res.render("profile", { data: result, user: results[0] ,name:userName,LoggedInUser:req.session.name});
//             });
//         } 
//     });


//   }
//   else {
//     // Handle case when user is not found
//     res.redirect("/login") }
// });

// // Socket.IO connection handling
// const users = {};

// io.on('connection', (socket) => {
//   const session = socket.handshake.session;
//   // console.log('Session on connection:', session);
//   if (session && session.name) {
//     socket.emit('user-name', session.name);
//   }

//   socket.on('new-user-joined', (name) => {
//     name=session.name;
//     users[socket.id] = name;
//     if (session && session.name) {
//       socket.broadcast.emit('user-joined', name);
//     }
    
//   });

//   // Send chat history when a new user connects
//   const historySql = 'SELECT sender, message, timestamp FROM chat_messages ORDER BY timestamp ASC';

// con.query(historySql, (err, results) => {
//   if (err) {
//     console.error('Error fetching chat history:', err);
//     throw err;
//   }

//   // Add the user's name to each message object
//   const chatHistoryWithName = results.map(message => ({
//     ...message,
//     name: socket.handshake.session.name
//   }));

//   // Emit the modified chat history to the client
//   socket.emit('chat-history', chatHistoryWithName);
// });

//   socket.on('send', message => {
//     const sender = users[socket.id];
//     const sql = `INSERT INTO chat_messages (sender, message) VALUES ('${sender}', '${message}')`;
    
//     con.query(sql, [sender, message], (err) => {
//       if (err) throw err;
//       // console.log('Message saved to the database');
//     });

//     socket.broadcast.emit('receive', { message: message, name: sender });
//   });

//   socket.on('disconnect', () => {
//     socket.broadcast.emit('left', users[socket.id]);
//     delete users[socket.id];
//   });

  

// });

// app.get("/chat", (req, res) => {
//   const session = req.session;
//   if (session && session.email && session.name) {
//     console.log(session.name);
//     res.render("chat", { data: session.name }); // Pass the session data to the chat template
//   } else {
//     res.redirect("/login");
//   }
// });

// app.get('/get-like-status/:imageName', (req, res) => {
//   const imageName = req.params.imageName;
//   const userEmail = req.session.email; 

//   // Fetch like count
//   const likeQuery = `SELECT COUNT(*) as likes FROM user_likes WHERE image = ?`;
//   const userLikeQuery = `SELECT COUNT(*) as userLiked FROM user_likes WHERE user_email = ? AND image = ?`;

//   con.query(likeQuery, [imageName], (err, likeResults) => {
//       if (err) {
//           console.error('Error fetching like count:', err);
//           return res.status(500).json({ error: 'Error fetching like count' });
//       }

//       con.query(userLikeQuery, [userEmail, imageName], (err, userLikeResults) => {
//           if (err) {
//               console.error('Error fetching user like status:', err);
//               return res.status(500).json({ error: 'Error fetching user like status' });
//           }

//           res.json({
//               likes: likeResults[0].likes,
//               userLiked: userLikeResults[0].userLiked > 0
//           });
//       });
//   });
// });

// // Route to handle like/unlike toggle
// app.post('/like-post', express.json(), (req, res) => {
//   const image = req.body.image;
//   const userEmail = req.session.email;

//   if (!userEmail) {
//       return res.status(401).json({ error: 'User not authenticated' });
//   }

//   const checkLikeQuery = 'SELECT * FROM user_likes WHERE user_email = ? AND image = ?';
//   con.query(checkLikeQuery, [userEmail, image], (err, results) => {
//       if (err) {
//           console.error('Error checking like status:', err);
//           return res.status(500).json({ error: 'An error occurred' });
//       }

//       if (results.length > 0) {
//           // User has already liked the post, so remove the like
//           const deleteLikeQuery = 'DELETE FROM user_likes WHERE user_email = ? AND image = ?';
//           con.query(deleteLikeQuery, [userEmail, image], (err) => {
//               if (err) {
//                   console.error('Error removing like:', err);
//                   return res.status(500).json({ error: 'An error occurred' });
//               }

//               const decrementLikeQuery = 'UPDATE tbl_details SET likes = likes - 1 WHERE image = ?';
//               con.query(decrementLikeQuery, [image], (err) => {
//                   if (err) {
//                       console.error('Error decrementing like count:', err);
//                       return res.status(500).json({ error: 'An error occurred' });
//                   }

//                   res.json({ status: 'disliked' });
//               });
//           });
//       } else {
//           // User has not liked the post, so add a like
//           const addLikeQuery = 'INSERT INTO user_likes (user_email, image) VALUES (?, ?)';
//           con.query(addLikeQuery, [userEmail, image], (err) => {
//               if (err) {
//                   console.error('Error adding like:', err);
//                   return res.status(500).json({ error: 'An error occurred' });
//               }

//               const incrementLikeQuery = 'UPDATE tbl_details SET likes = likes + 1 WHERE image = ?';
//               con.query(incrementLikeQuery, [image], (err) => {
//                   if (err) {
//                       console.error('Error incrementing like count:', err);
//                       return res.status(500).json({ error: 'An error occurred' });
//                   }

//                   res.json({ status: 'liked' });
//               });
//           });
//       }
//   });
// });

// app.get('/search', (req, res) => {
//   if (req.session && req.session.email ) {
    
  
//   const query = 'SELECT name FROM user_details'

//   con.query(query, (err, results) => {
//     if (err) {
//       console.error('Error fetching users:', err);
//       res.sendStatus(500);
//     } else {
//       // Render the search page with the list of users
//       res.render('searchUser', { data:req.session.name, users: results });
//     }
//   });
// }else{res.redirect('/login')}
// });

// server.listen(port,'192.168.74.198', () => {
//   console.log(`Server running on http://192.168.74.198:${port}`);
// });
