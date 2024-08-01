const express = require('express');
const app = express();
const path = require('path');
const collegeData = require('./modules/collegeData');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');

// Custom Handlebars helpers
const hbs = exphbs.create({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    helpers: {
        navLink: function(url, options) {
            return '<li' + 
                ((url == app.locals.activeRoute) ? ' class="nav-item active" ' : ' class="nav-item" ') + 
                '><a class="nav-link" href="' + url + '">' + options.fn(this) + '</a></li>';
        },
        equal: function(lvalue, rvalue, options) {
            if (arguments.length < 3) {
                throw new Error("Handlebars Helper equal needs 2 parameters");
            }
            if (lvalue != rvalue) {
                return options.inverse(this);
            } else {
                return options.fn(this);
            }
        }
    },
    runtimeOptions: {
        protoAccess: 'allow'
    }
});

app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to serve static files from the 'public' directory
app.use(express.static('public'));

// Middleware for Nav
app.use(function(req, res, next) {
    let route = req.path.substring(1);
    app.locals.activeRoute = "/" + (isNaN(route.split('/')[1]) ? route.replace(/\/(?!.*)/, "") : route.replace(/\/(.*)/, ""));
    next();
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));


// Initialize the database
collegeData.initialize().then(() => {
    console.log('Database initialized');
}).catch(err => {
    console.error('Database initialization failed:', err);
});

// Home route
app.get('/', (req, res) => {
    res.render('home');
});

// About route
app.get('/about', (req, res) => {
    res.render('about');
});

// HTML Demo route
app.get('/htmlDemo', (req, res) => {
    res.render('htmlDemo');
});

// Display all students
app.get('/students', (req, res) => {
    collegeData.getAllStudents().then(students => {
        // Convert Sequelize model instances to plain objects
        const plainStudents = students.map(student => student.get({ plain: true }));

        console.log('Students Data:', plainStudents); // Log to verify

        if (plainStudents.length > 0) {
            res.render('students', { students: plainStudents });
        } else {
            res.render('students', { message: "No students found" });
        }
    }).catch(err => {
        console.error('Error fetching students:', err); // Log errors
        res.render('students', { message: "Error fetching students" });
    });
});

// Display student by studentNum
app.get('/student/:studentNum', (req, res) => {
    let viewData = {};

    collegeData.getStudentByNum(req.params.studentNum)
        .then(data => {
            if (data) {
                viewData.student = data.get({ plain: true });
            } else {
                viewData.student = null;
            }
        })
        .catch(() => {
            viewData.student = null;
        })
        .then(() => collegeData.getCourses())
        .then(data => {
            viewData.courses = data.map(course => course.get({ plain: true }));
            // Mark the selected course
            viewData.courses.forEach(course => {
                if (course.courseId === viewData.student.courseId) {
                    course.selected = true;
                }
            });
        })
        .catch(() => {
            viewData.courses = [];
        })
        .then(() => {
            if (viewData.student === null) {
                res.status(404).send("Student Not Found");
            } else {
                res.render("student", { viewData: viewData });
            }
        });
});


// Add a new student
app.get('/students/add', (req, res) => {
    collegeData.getCourses().then((courses) => {
        const plainCourses = courses.map(course => course.get({ plain: true }));
        res.render('addStudent', { courses: plainCourses });
    }).catch(() => {
        res.render('addStudent', { courses: [] });
    });
});

app.post('/students/add', (req, res) => {
    const studentData = { ...req.body };
    if (studentData.courseId === "") {
        studentData.courseId = null;
    }
    
    collegeData.addStudent(studentData).then(() => {
        res.redirect('/students');
    }).catch((err) => {
        console.error('Error:', err);
        res.status(500).send("Unable to add student");
    });
});


// Update student details
app.post('/student/update', (req, res) => {
    collegeData.updateStudent(req.body).then(() => {
        res.redirect('/students');
    }).catch(err => {
        res.status(500).send('Unable to update student');
    });
});


// Delete a student
app.get('/student/delete/:studentNum', (req, res) => {
    collegeData.deleteStudentByNum(req.params.studentNum).then(() => {
        res.redirect('/students');
    }).catch(() => {
        res.status(500).send('Unable to remove student or student not found');
    });
});

// Display all courses
app.get('/courses', (req, res) => {
    collegeData.getCourses().then(courses => {
        const plainCourses = courses.map(course => course.get({ plain: true }));
        if (plainCourses.length > 0) {
            res.render('courses', { courses: plainCourses });
        } else {
            res.render('courses', { message: "No courses found" });
        }
    }).catch(err => {
        res.render('courses', { message: "Error fetching courses" });
    });
});

// Display course details by courseId
app.get('/course/:courseId', (req, res) => {
    collegeData.getCourseById(req.params.courseId).then(course => {
        res.render('course', { course: course });
    }).catch(() => {
        res.status(404).send('Course not found');
    });
});

// Add a new course
app.get('/courses/add', (req, res) => {
    res.render('addCourse');
});

app.post('/courses/add', (req, res) => {
    collegeData.addCourse(req.body).then(() => {
        res.redirect('/courses');
    }).catch((err) => {
        console.error(err);
        res.status(500).send("Unable to add course");
    });
});

// Update course details
app.post('/course/update', (req, res) => {
    collegeData.updateCourse(req.body).then(() => {
        res.redirect('/courses');
    }).catch(err => {
        res.status(500).send('Unable to update course');
    });
});

// Delete a course
app.get('/course/delete/:courseId', (req, res) => {
    collegeData.deleteCourseById(req.params.courseId).then(() => {
        res.redirect('/courses');
    }).catch(() => {
        res.status(500).send('Unable to remove course or course not found');
    });
});

// Handle 404 errors
app.use((req, res, next) => {
    res.status(404).render('404');
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
