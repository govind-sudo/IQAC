const Student = require("../models/Student");
const Admin = require("../models/admin");

// -------------------------------------------------------------
// GET Admin Dashboard
// -------------------------------------------------------------
exports.getDashboard = async (req, res) => {
    try {
        // 1. Existing Stat Counts
        const totalStudents = await Student.countDocuments();
        const totalAdmins = await Admin.countDocuments();

        // 2. Monthly Registrations Trend
        const currentYear = new Date().getFullYear();
        const monthlyAggregation = await Student.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lte: new Date(`${currentYear}-12-31`)
                    }
                }
            },
            { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } }
        ]);

        const monthlyData = Array(12).fill(0);
        monthlyAggregation.forEach(item => { monthlyData[item._id - 1] = item.count; });

        // 3. District Analytics (Pie Chart - Top 5 + Others)
       // District Analytics based on presentAddress.district
const districtAggregation = await Student.aggregate([
    { 
        $match: { 
            "presentAddress.district": { $exists: true, $ne: null, $ne: "" } 
        } 
    },
    { 
        $group: { 
            _id: "$presentAddress.district", 
            count: { $sum: 1 } 
        } 
    },
    { $sort: { count: -1 } }
]);

let districtLabels = [];
let districtData = [];

if (districtAggregation.length > 5) {
    const top5 = districtAggregation.slice(0, 5);
    const othersCount = districtAggregation.slice(5).reduce((acc, curr) => acc + curr.count, 0);

    districtLabels = top5.map(d => d._id);
    districtData = top5.map(d => d.count);
    districtLabels.push("Others");
    districtData.push(othersCount);
} else {
    districtLabels = districtAggregation.map(d => d._id);
    districtData = districtAggregation.map(d => d.count);
}

        // 4. 12th Percentage Analytics (Bar Chart Brackets)
        const percentageAggregation = await Student.aggregate([
            { $match: { twelthPercentage: { $ne: null } } },
            {
                $bucket: {
                    groupBy: "$twelthPercentage",
                    boundaries: [0, 50, 60, 70, 80, 90, 101],
                    default: "Unknown",
                    output: { count: { $sum: 1 } }
                }
            }
        ]);

        // Map bucket output to friendly labels
        const bucketMap = { 0: "< 50%", 50: "50-59%", 60: "60-69%", 70: "70-79%", 80: "80-89%", 90: "90-100%" };
        const marksLabels = ["< 50%", "50-59%", "60-69%", "70-79%", "80-89%", "90-100%"];
        const marksData = Array(6).fill(0);

        percentageAggregation.forEach(b => {
            if (bucketMap[b._id]) {
                const index = marksLabels.indexOf(bucketMap[b._id]);
                if (index !== -1) marksData[index] = b.count;
            }
        });

        // Render Dashboard
        res.render("admin/dashboard", {
            currentPage: "dashboard",
            admin: req.admin,
            metrics: { totalStudents, totalAdmins },
            chartData: JSON.stringify(monthlyData),
            districtLabels: JSON.stringify(districtLabels),
            districtData: JSON.stringify(districtData),
            marksLabels: JSON.stringify(marksLabels),
            marksData: JSON.stringify(marksData)
        });
    } catch (err) {
        console.error("Dashboard Error:", err);
        res.status(500).render("errors/500");
    }
};
// -------------------------------------------------------------
// GET Export Students Data (CSV)
// -------------------------------------------------------------
exports.exportStudentsCSV = async (req, res) => {
    try {
        const students = await Student.find({}).lean();

        // Build CSV Header
        let csv = "Full Name,UG Number,Enrollment No,Email,Phone,Gender,Joining Date,Status\n";

        // Append rows cleanly
        students.forEach(s => {
            const name = `"${s.fullName || (s.firstName + ' ' + s.lastName)}"`;
            const ug = `"${s.ugNumber || ''}"`;
            const enroll = `"${s.enrollmentNo || ''}"`;
            const email = `"${s.email || ''}"`;
            const phone = `"${s.phone || ''}"`;
            const gender = `"${s.gender || ''}"`;
            const date = s.joiningDate ? `"${new Date(s.joiningDate).toISOString().split('T')[0]}"` : '""';
            const status = `"${s.studentStatus || 'active'}"`;

            csv += `${name},${ug},${enroll},${email},${phone},${gender},${date},${status}\n`;
        });

        // Set response headers for direct browser download
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=Students_Export_${Date.now()}.csv`);
        res.status(200).send(csv);
    } catch (err) {
        console.error("CSV Export Error:", err);
        res.status(500).send("Error exporting data.");
    }
};




// Render list of all students
exports.getStudentsList = async (req, res) => {
    try {
        const students = await Student.find({})
            .select('firstName lastName fullName email ugNumber enrollmentNo phone phoneCode studentStatus')
            .sort({ createdAt: -1 })
            .lean();

        res.render('admin/students', {
            currentPage: 'students',
            admin: req.admin,
            students
        });
    } catch (err) {
        console.error("Error fetching students list:", err);
        res.status(500).render('errors/500');
    }
};

// Render detailed student profile
exports.getStudentInDetail = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id).lean();

        if (!student) {
            return res.status(404).render('errors/404', { message: 'Student not found' });
        }

        res.render('admin/studentInDetail', {
            currentPage: 'students',
            admin: req.admin,
            student
        });
    } catch (err) {
        console.error("Error fetching detailed student view:", err);
        res.status(500).render('errors/500');
    }
};