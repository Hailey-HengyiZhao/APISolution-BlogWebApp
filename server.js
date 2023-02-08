
//  -- import npm ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
var express = require("express");
var app = express();
var HTTP_PORT = process.env.PORT || 8080;
const web322App = require("./blog-service");
//  -- import auth-service
const authData = require("./auth-service");
//  -- import auth-service

var path = require("path");
//  -- import npm ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑

//  -- import npm ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
cloudinary.config({
  cloud_name: "dwleas0js",
  api_key: "353252431234466",
  api_secret: "YYpEl4oJnukC1VSrQ1GYctxaGXU",
  secure: true,
});
const upload = multer();
//  -- import npm ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑

//  -- import handlebars ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
const exphbs = require("express-handlebars");
const stripJs = require("strip-js");
const blogData = require("./blog-service");

app.engine(
  ".hbs",
  exphbs.engine({
    extname: ".hbs",
    helpers: {
      navLink: function (url, options) {
        return (
          "<li" +
          (url == app.locals.activeRoute ? ' class="active" ' : "") +
          '><a href="' +
          url +
          '">' +
          options.fn(this) +
          "</a></li>"
        );
      },
      equal: function (lvalue, rvalue, options) {
        if (arguments.length < 3)
          throw new Error("Handlebars Helper equal needs 2 parameters");
        if (lvalue != rvalue) {
          return options.inverse(this);
        } else {
          return options.fn(this);
        }
      },
      safeHTML: function (context) {
        return stripJs(context);
      },
      //  - formatDate
      formatDate: function (dateObj) {
        let year = dateObj.getFullYear();
        let month = (dateObj.getMonth() + 1).toString();
        let day = dateObj.getDate().toString();
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      },
    },
  })
);
app.set("view engine", ".hbs");

//  -- import handlebars ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑

//  -- import Client session
const clientSessions = require("client-sessions");
//  -- Configuring Client Session Middleware
app.use(
  clientSessions({
    cookieName: "session",
    secret: "blog_web3222",
    duration: 2 * 60 * 1000,
    activeDuration: 1000 * 60,
  })
);

function ensureLogin(req,res,next){
  if(!req.session.user){
    res.redirect('/login')
  }else{
    next();
  }
}

app.use(function(req, res, next) {
  res.locals.session = req.session;
  next();
});


/*********************************************************************************
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
*********************************************************************************/

//  -- "require" blog-service.js module at the top of the server.js
function onHttpStart() {
  console.log("Express http server listening on " + HTTP_PORT);
}

//  -- adding the following middleware function above your routes in server.js
app.use(function (req, res, next) {
  let route = req.path.substring(1);
  app.locals.activeRoute =
    "/" +
    (isNaN(route.split("/")[1])
      ? route.replace(/\/(?!.*)/, "")
      : route.replace(/\/(.*)/, ""));
  app.locals.viewingCategory = req.query.category;
  next();
});

//  -- adding the following middleware function above your routes in server.js
app.use(express.urlencoded({ extended: true }));

//  -- GET the homepage and redirect to /about
app.get("/", (req, res) => {
  res.redirect("/blog");
});

//  -- GET the route of about and send html
app.get("/about", (req, res) => {
  //res.sendFile(path.join(__dirname, "/views/about.html"));
  //  -- render about.hbs and main.hbs
  res.render("about", {
    layout: "main",
  });
});

//  -- GET the route of /blog
app.get("/blog", async (req, res) => {
  // Declare an object to store properties for the view
  let viewData = {};
  try {
    // declare empty array to hold "post" objects
    let posts = [];
    // if there's a "category" query, filter the returned posts by category
    if (req.query.category) {
      // Obtain the published "posts" by category
      posts = await blogData.getPublishedPostsByCategory(req.query.category);
    } else {
      // Obtain the published "posts"
      posts = await blogData.getPublishedPosts();
    }

    // sort the published posts by postDate
    posts.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));
    // get the latest post from the front of the list (element 0)
    let post = posts[0];
    // store the "posts" and "post" data in the viewData object (to be passed to the view)
    viewData.posts = posts;
    viewData.post = post;
  } catch (err) {
    viewData.message = "no results";
  }

  try {
    // Obtain the full list of "categories"
    let categories = await blogData.getCategories();
    // store the "categories" data in the viewData object (to be passed to the view)
    viewData.categories = categories;
  } catch (err) {
    viewData.categoriesMessage = "no results";
  }
  // render the "blog" view with all of the data (viewData)
  res.render("blog", { data: viewData });
});

//  -- get /blog/:id
app.get("/blog/:id", async (req, res) => {
  // Declare an object to store properties for the view
  let viewData = {};

  try {
    // declare empty array to hold "post" objects
    let posts = [];

    // if there's a "category" query, filter the returned posts by category
    if (req.query.category) {
      // Obtain the published "posts" by category
      posts = await blogData.getPublishedPostsByCategory(req.query.category);
    } else {
      // Obtain the published "posts"
      posts = await blogData.getPublishedPosts();
    }
    // sort the published posts by postDate
    posts.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));
    // store the "posts" and "post" data in the viewData object (to be passed to the view)
    viewData.posts = posts;
  } catch (err) {
    viewData.message = "no results";
  }

  try {
    // Obtain the post by "id"
    viewData.post = await blogData.getPostById(req.params.id);
  } catch (err) {
    viewData.message = "no results";
  }

  try {
    // Obtain the full list of "categories"
    let categories = await blogData.getCategories();
    // store the "categories" data in the viewData object (to be passed to the view)
    viewData.categories = categories;
  } catch (err) {
    viewData.categoriesMessage = "no results";
  }
  // render the "blog" view with all of the data (viewData)
  res.render("blog", { data: viewData });
});

//  -- search id = value post /params
app.get("/post/:id", ensureLogin, (req, res) => {
  web322App
    .getPostById(req.params.id)
    .then((post) => {
      res.json(post);
    })
    .catch((err) => {
      console.log(err);
      res.send("there's been a error!");
    });
});


//  -- GET the route of /posts
app.get("/posts", ensureLogin, (req, res) => {
  //  -- query	/posts?category=value
  if (req.query.category) {
    web322App
      .getPostsByCategory(req.query.category)
      .then((post) => {
        res.render("posts", {
          data: post,
          layout: "main",
        });
      })
      .catch((err) => {
        res.render("posts", { message: err });
      });
  } else if (req.query.minDate) {
    //  -- query	/posts?minDate=value
    web322App
      .getPostsByMinDate(req.query.minDate)
      .then((post) => {
        res.render("posts", {
          data: post,
          layout: "main",
        });
      })
      .catch((err) => {
        res.render("posts", { message: err });
      });
  } else {
    web322App
      .getAllPosts()
      .then((post) => {
        
        if (post.length > 0) {
          res.render("posts", {
            data: post,
            layout: "main",
          });
        } else {
          res.render("posts", { message: "no results" });
        }
      })
      .catch((err) => {
        res.render("posts", { message: err });
      });
  }
});

//  -- GET the route of /categories
app.get("/categories", ensureLogin, (req, res) => {
  //  --
  web322App
    .getCategories()
    .then((categories) => {
      if (categories.length > 0) {
        res.render("categories", {
          categories: categories,
          layout: "main",
        });
      } else {
        res.render("categories", { message: "no results" });
      }
    })
    .catch((err) => {
      res.render("categories", { message: err });
    });
});

//  -- DELETE post by ID
app.get("/posts/delete/:id", ensureLogin, (req, res) => {
  web322App
    .deletePostById(req.params.id)
    .then(() => {
      res.redirect("/posts");
    })
    .catch((err) => {
      console.log(err);
      res
        .status(500)
        .send({ message: "Unable to Remove Post / Post not found)" });
    });
});

//  -- DELETE categories
app.get("/categories/delete/:id", ensureLogin, (req, res) => {
  web322App
    .deleteCategoryById(req.params.id)
    .then(() => {
      res.redirect("/categories");
    })
    .catch((err) => {
      console.log(err);
    });
});

//  -- GET the route of /categories/add
app.get("/categories/add", ensureLogin, (req, res) => {
  //res.sendFile(path.join(__dirname, "/views/addPost.html"));
  //  -- render addPost.hbs and main.hbs
  res.render("addCategory", {
    layout: "main",
  });
});

// -- POST the route of /categories/add
app.post("/categories/add", ensureLogin, (req, res) => {
  console.log(req.body);
  web322App.addCategory(req.body).then(() => {
    res.redirect("/categories");
  });
});
//  -- GET the route of /posts/add
app.get("/posts/add", ensureLogin, (req, res) => {
  //res.sendFile(path.join(__dirname, "/views/addPost.html"));
  // -- render addPost.hbs and main.hbs
  web322App
    .getCategories()
    .then((categories) => {
      res.render("addPost", {
        categories: categories,
        layout: "main",
      });
    })
    .catch(() => {
      let categories = [];
      res.render("addPost", {
        categories: categories,
        layout: "main",
      });
    });
});

//  -- POST the new posts
app.post("/posts/add", upload.single("featureImage"), ensureLogin, (req, res) => {
  if (req.file) {
    let streamUpload = (req) => {
      return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream((error, result) => {
          if (result) {
            resolve(result);
          } else {
            reject(error);
          }
        });

        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    async function upload(req) {
      let result = await streamUpload(req);
      console.log(result);
      return result;
    }

    upload(req).then((uploaded) => {
      processPost(uploaded.url);
    });
  } else {
    processPost("");
  }

  function processPost(imageUrl) {
    req.body.featureImage = imageUrl;

    // Process the req.body and add it as a new Blog Post before redirecting to /posts
    console.log(req.body);
    //  --
    web322App.addPost(req.body).then(() => {
      res.redirect("/posts");
    });
  }
});



//  -- GET /login
app.get("/login",(req,res)=>{
  res.render("login", {
    layout: "main",
  });
})

//  -- GET /register
app.get("/register",(req,res)=>{
  res.render("register", {
    layout: "main",
  });
})

//  -- POST /register
app.post("/register", (req, res)=>{
  authData.registerUser(req.body).then((data)=>{
    console.log(data)
    res.render('register',{
      successMessage: "User created"
    })
  }).catch((err)=>{
    res.render('register',{
      errorMessage: err,
      userName: req.body.userName
    })
  })
})

//  -- POST /login
app.post('/login', (req,res)=>{
  console.log(req.session.user);
  req.body.userAgent = req.get('User-Agent');
  authData.checkUser(req.body).then((user)=>{
    req.session.user = {
      userName: user.userName,
      email: user.email,
      loginHistory: user.loginHistory
  }
  console.log(req.session.user)
  res.redirect('/posts')
  }).catch((err)=>{
    res.render('login',{
      errorMessage: err, 
      userName: req.body.userName
    })
  })
})

// -- GET /logout
app.get('/logout', (req,res)=>{
  req.session.reset()
  res.redirect('/')
})

// -- GET /userHistory
app.get('/userHistory', ensureLogin, (req,res)=>{
  res.render('userHistory',{
    layout: 'main'
  })
})

//  -- send 404 if non-found route
app.use((req, res) => {
  res.status(404).render("404", {
    layout: "main",
  });
});

//  -- initialization
// web322App
//   .initialize()
//   .then(() => {
//     app.listen(HTTP_PORT, onHttpStart()); //once the resource has been read, we listen the website
//   })
//   .catch((err) => {
//     console.log(err);
//   });

// -- initialization
web322App
  .initialize()
  .then(authData.initialize())
  .then(() => {
    app.listen(HTTP_PORT, onHttpStart()); //once the resource has been read, we listen the website
    console.log("app listening on: " + HTTP_PORT);
  })
  .catch((err) => {
    console.log("unable to start server: " + err);
  });
