const Sequelize = require('sequelize');

const sequelize = new Sequelize('SenecaDB', 'SenecaDB_owner', 'wUZfuMsO40SL', {
    host: 'ep-super-scene-a5jm773y.us-east-2.aws.neon.tech',
    dialect: 'postgres',
    port: 5432,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    logging: console.log
});

// Define the Student model
const Student = sequelize.define('Student', {
    studentNum: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    firstName: Sequelize.STRING,
    lastName: Sequelize.STRING,
    email: Sequelize.STRING,
    addressStreet: Sequelize.STRING,
    addressCity: Sequelize.STRING,
    addressProvince: Sequelize.STRING,
    TA: Sequelize.BOOLEAN,
    status: Sequelize.STRING,
    courseId: {
        type: Sequelize.INTEGER,
        references: {
            model: 'Courses', 
            key: 'courseId'
        },
        allowNull: true 
    }
});


// Define the Course model
const Course = sequelize.define('Course', {
    courseId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    courseCode: Sequelize.STRING,
    courseDescription: Sequelize.STRING
});

// Define the relationship
Course.hasMany(Student, { foreignKey: 'courseId', as: 'students' });
Student.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

// Initialize database
module.exports.initialize = function () {
    return sequelize.sync()
        .then(() => console.log('Database synchronized'))
        .catch(err => console.error('Database synchronization failed:', err));
};


// Get all students
module.exports.getAllStudents = function () {
    return Student.findAll({
        include: [{
            model: Course,
            as: 'course',  // Use the alias here
            required: false  // LEFT OUTER JOIN to include students without courses
        }]
    }).then(students => {
        if (students.length === 0) {
            throw new Error('No students found');
        }
        return students;
    });
};


// Get all TAs
module.exports.getTAs = function () {
    return Student.findAll({ where: { TA: true } })
        .then(students => {
            if (students.length === 0) {
                throw new Error('No TAs found');
            }
            return students;
        });
};

// Get all courses
module.exports.getCourses = function () {
    return Course.findAll()
        .then(courses => {
            if (courses.length === 0) {
                throw new Error('No courses found');
            }
            return courses;
        });
};

// Get student by studentNum
module.exports.getStudentByNum = function (num) {
    return Student.findByPk(num)
        .then(student => {
            if (!student) {
                throw new Error('Student not found');
            }
            return student;
        });
};

// Get students by courseId
module.exports.getStudentsByCourse = function (courseId) {
    return Student.findAll({ where: { courseId: courseId } })
        .then(students => {
            if (students.length === 0) {
                throw new Error('No students found for this course');
            }
            return students;
        });
};

// Add a new student
module.exports.addStudent = function (studentData) {
    studentData.TA = !!studentData.TA;

    for (let prop in studentData) {
        if (studentData[prop] === "") {
            studentData[prop] = null;
        }
    }

    return Student.create(studentData)
        .catch((err) => {
            console.error('Error creating student:', err);
            throw new Error('Unable to create student');
        });
};

// Get course by courseId
module.exports.getCourseById = function (id) {
    return Course.findByPk(id)
        .then(course => {
            if (!course) {
                throw new Error('Course not found');
            }
            return course;
        });
};

// Update student details
module.exports.updateStudent = function (studentData) {
    studentData.TA = !!studentData.TA;

    for (let prop in studentData) {
        if (studentData[prop] === "") {
            studentData[prop] = null;
        }
    }
    if (!studentData.courseId) {
        studentData.courseId = null;
    }

    return Student.update(studentData, { where: { studentNum: studentData.studentNum } })
        .then(([affectedCount]) => {
            if (affectedCount === 0) {
                throw new Error('Student not found or no changes made');
            }
        });
};

// Add a new course
module.exports.addCourse = function (courseData) {
    for (let prop in courseData) {
        if (courseData[prop] === "") {
            courseData[prop] = null;
        }
    }

    return Course.create(courseData)
        .catch(() => { throw new Error('Unable to create course'); });
};

// Update course details
module.exports.updateCourse = function (courseData) {
    for (let prop in courseData) {
        if (courseData[prop] === "") {
            courseData[prop] = null;
        }
    }

    return Course.update(courseData, { where: { courseId: courseData.courseId } })
        .then(([affectedCount]) => {
            if (affectedCount === 0) {
                throw new Error('Course not found or no changes made');
            }
        });
};

// Delete a course
module.exports.deleteCourseById = function (id) {
    return Course.destroy({ where: { courseId: id } })
        .then(affectedCount => {
            if (affectedCount === 0) {
                throw new Error('Course not found');
            }
        });
};

// Delete a student
module.exports.deleteStudentByNum = function (studentNum) {
    return Student.destroy({ where: { studentNum: studentNum } })
        .then(affectedCount => {
            if (affectedCount === 0) {
                throw new Error('Student not found');
            }
        });
};
