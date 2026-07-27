// const XLSX = require('xlsx');

// // Full test dataset matching all student records
// const testData = [
//   {
//     "UG Number": "24UG040999",
//     "Enrollment No": "EN2024040999",
//     "Student Name": "Govind Singh Bhadoriya",
//     "Email": "govindbhadoriya672@gmail.com",
//     "Phone": "9876543210",
//     "Course": "B.Tech",
//     "Branch": "CSE",
//     "City": "Gwalior"
//   },
//   {
//     "UG Number": "24UG123456",
//     "Enrollment No": "EN2024123456",
//     "Student Name": "Safiya Munshi",
//     "Email": "safiyamunshi009@gmail.com",
//     "Phone": "9876543210",
//     "Course": "B.Tech",
//     "Branch": "CSE",
//     "City": "Vadodara"
//   },
//   {
//     "UG Number": "24UG046750",
//     "Enrollment No": "EN2024046750",
//     "Student Name": "Raman Kumar",
//     "Email": "raghavsoni4511@gmail.com",
//     "Phone": "9876543220",
//     "Course": "B.Tech",
//     "Branch": "CSE",
//     "City": "Nashik"
//   },
//   {
//     "UG Number": "24UG040120",
//     "Enrollment No": "EN2024040120",
//     "Student Name": "Yash Pravin Chavan",
//     "Email": "yash.chavan24@example.com",
//     "Phone": "9876543230",
//     "Course": "B.Tech",
//     "Branch": "CSE",
//     "City": "Nashik"
//   }
// ];

// // Create worksheet & workbook
// const worksheet = XLSX.utils.json_to_sheet(testData);
// const workbook = XLSX.utils.book_new();
// XLSX.utils.book_append_sheet(workbook, worksheet, "Enrollments");

// // Save file locally
// XLSX.writeFile(workbook, "student_enrollments.xlsx");
// console.log("Created student_enrollments.xlsx successfully with 4 test rows!");
