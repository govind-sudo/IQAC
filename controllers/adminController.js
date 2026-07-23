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

        if (!students || students.length === 0) {
            return res.status(404).send("No student records found to export.");
        }

        // Helper: Safe value formatting
        const formatValue = (val) => {
            if (val === null || val === undefined) return '""';

            if (val instanceof Date) {
                return `"${val.toISOString().split('T')[0]}"`;
            }

            if (typeof val === 'object') {
                if (val.path || val.url || val.filename || val.secure_url || val.buffer) {
                    return '"Uploaded"';
                }
                if (Object.keys(val).length === 0) return '"Pending"';
            }

            const strVal = String(val).replace(/"/g, '""');
            return `"${strVal}"`;
        };

        // Helper: Resolve nested key paths dynamically
        const getNestedValue = (obj, path) => {
            if (!obj || !path) return null;
            return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined) ? acc[part] : null, obj);
        };

        // Helper: Check document upload status
        const getDocumentStatus = (docVal) => {
            if (!docVal) return "Pending";
            if (typeof docVal === 'string' && docVal.trim() !== '') return "Uploaded";
            if (typeof docVal === 'object' && (docVal.url || docVal.path || docVal.filename || docVal.secure_url || docVal.buffer)) {
                return "Uploaded";
            }
            return "Pending";
        };

        const schemaColumns = [
            // Basic Info
            { label: "Student ID", path: "_id" },
            { label: "Title", path: "title" },
            { 
                label: "Full Name", 
                getValue: (s) => s.fullName || [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ")
            },
            { label: "First Name", path: "firstName" },
            { label: "Middle Name", path: "middleName" },
            { label: "Last Name", path: "lastName" },
            { label: "Gender", path: "gender" },
            { label: "Date of Birth", path: "dob" },
            { label: "Blood Group", path: "bloodGroup" },
            { label: "Category", path: "category" },
            { label: "Religion", path: "religion" },
            { label: "Caste", path: "caste" },
            { label: "Nationality", path: "nationality" },
            { label: "Passport Number", path: "passportNumber" },
            { label: "Aadhaar Number", path: "aadhaarNumber" },
            { label: "ABC ID", path: "abcId" },

            // Contact
            { label: "Email", path: "email" },
            { label: "Parul Email", path: "parulEmailId" },
            { label: "Alternate Email", path: "alternateEmail" },
            { label: "Phone Code", path: "phoneCode" },
            { label: "Phone", path: "phone" },
            { label: "WhatsApp", path: "whatsapp" },

            // Academic & Identity
            { label: "UG Number", path: "ugNumber" },
            { label: "Enrollment No", path: "enrollmentNo" },
            { label: "Faculty", path: "faculty" },
            { label: "Institute", path: "institute" },
            { label: "Course", path: "course" },
            { label: "Branch", path: "branch" },
            { label: "Specialization", path: "specialization" },
            { label: "Admission Year", path: "admissionYear" },
            { label: "Admission Type", path: "admissionType" },
            { label: "Joining Date", path: "joiningDate" },
            { label: "Student Status", path: "studentStatus" },

            // Hostel
            { label: "Resides In Hostel", path: "residesInHostel" },
            { label: "Hostel Name", path: "hostelName" },

            // Parents Info
            { label: "Father Name", path: "father.name" },
            { label: "Father Occupation", path: "father.occupation" },
            { label: "Father Phone", path: "father.phone" },
            { label: "Mother Name", path: "mother.name" },
            { label: "Mother Occupation", path: "mother.occupation" },
            { label: "Mother Phone", path: "mother.phone" },

            // Emergency Contact
            { label: "Emergency Contact Name", path: "emergencyContact.name" },
            { label: "Emergency Contact Relation", path: "emergencyContact.relation" },
            { label: "Emergency Contact Phone", path: "emergencyContact.phone" },

            // Addresses
            { label: "Present Address", getValue: (s) => s.presentAddress ? `${s.presentAddress.address1 || ''} ${s.presentAddress.city || ''} ${s.presentAddress.state || ''} ${s.presentAddress.pincode || ''}`.trim() : '' },
            { label: "Permanent Address", getValue: (s) => s.permanentAddress ? `${s.permanentAddress.address1 || ''} ${s.permanentAddress.city || ''} ${s.permanentAddress.state || ''} ${s.permanentAddress.pincode || ''}`.trim() : '' },

            // Education Details
            { label: "10th School Name", getValue: (s) => getNestedValue(s, "education.tenth.schoolName") },
            { label: "10th Percentage", getValue: (s) => getNestedValue(s, "education.tenth.percentage") },
            { label: "12th School Name", getValue: (s) => getNestedValue(s, "education.twelfth.schoolName") || getNestedValue(s, "education.twelth.schoolName") },
            { label: "12th Percentage", getValue: (s) => getNestedValue(s, "education.twelfth.percentage") || getNestedValue(s, "education.twelth.percentage") },

            // Document Status Checks
            { 
                label: "Photo Status", 
                isDocument: true, 
                getValue: (s) => getNestedValue(s, "documents.photo") 
            },
            { 
                label: "Signature Status", 
                isDocument: true, 
                getValue: (s) => getNestedValue(s, "documents.signature") 
            },
            { 
                label: "Aadhaar Card Status", 
                isDocument: true, 
                getValue: (s) => getNestedValue(s, "documents.aadhaarProof") || getNestedValue(s, "documents.aadhaarCard") 
            },
            { 
                label: "ABC ID Proof Status", 
                isDocument: true, 
                getValue: (s) => getNestedValue(s, "documents.abcIdProof") 
            },
            { 
                label: "10th Marksheet Status", 
                isDocument: true, 
                getValue: (s) => getNestedValue(s, "education.tenth.marksheet") || getNestedValue(s, "documents.marksheet10th") 
            },
            { 
                label: "12th Marksheet Status", 
                isDocument: true, 
                getValue: (s) => getNestedValue(s, "education.twelfth.marksheet") || getNestedValue(s, "education.twelth.marksheet") || getNestedValue(s, "documents.marksheet12th") 
            },
            { 
                label: "Diploma Marksheet Status", 
                isDocument: true, 
                getValue: (s) => getNestedValue(s, "documents.marksheetDiploma") || getNestedValue(s, "education.diploma.marksheet") 
            },
            { 
                label: "Caste Certificate Status", 
                isDocument: true, 
                getValue: (s) => getNestedValue(s, "documents.casteCertificate") 
            },
            { 
                label: "Leaving Certificate Status", 
                isDocument: true, 
                getValue: (s) => getNestedValue(s, "documents.leavingCertificate") 
            }
        ];

        // 1. Build CSV Header
        let csv = schemaColumns.map(col => `"${col.label}"`).join(',') + '\n';

        // 2. Build Data Rows
        students.forEach(student => {
            const row = schemaColumns.map(col => {
                const rawVal = col.getValue ? col.getValue(student) : getNestedValue(student, col.path);

                if (col.isDocument) {
                    return `"${getDocumentStatus(rawVal)}"`;
                }

                if (col.path === '_id' && rawVal) {
                    return `"${rawVal.toString()}"`;
                }

                return formatValue(rawVal);
            }).join(',');

            csv += row + '\n';
        });

        // Set Headers and Send Response
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename=Students_Export_${Date.now()}.csv`);
        res.status(200).send(csv);

    } catch (err) {
        console.error("CSV Export Error:", err);
        res.status(500).send("Error exporting student data.");
    }
};

// Render list of all students with Server-Side Pagination (15 per page) & Search
exports.getStudentsList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 15; // Fixed page size of 15 items
        const skip = (page - 1) * limit;
        const search = req.query.search ? req.query.search.trim() : '';

        // Base query
        let query = {};

        // Optimized search regex across key fields
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { fullName: searchRegex },
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex },
                { ugNumber: searchRegex },
                { enrollmentNo: searchRegex },
                { phone: searchRegex }
            ];
        }

        // Execute count and paginated query concurrently
        const [totalStudents, students] = await Promise.all([
            Student.countDocuments(query),
            Student.find(query)
                .select('firstName lastName fullName email ugNumber enrollmentNo phone phoneCode studentStatus')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
        ]);

        const totalPages = Math.ceil(totalStudents / limit) || 1;

        res.render('admin/students', {
            currentPage: 'students', // Keep 'students' for sidebar active link highlight
            page,                     // Numeric current page
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1,
            limit,
            totalStudents,
            students,
            search,
            admin: req.admin
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


// Fetch Sub-Admins List with Server-Side Pagination & Search Optimization
// Fetch Sub-Admins List with Server-Side Pagination & Search Optimization
exports.getSubAdminsList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Fixed page size of 10 items
        const skip = (page - 1) * limit;
        const search = req.query.search ? req.query.search.trim() : '';

        // Base query: Fetch only subadmins
        let query = { role: 'subadmin' };

        // Optimized Search Regex for fullName, misCode, and email
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { fullName: searchRegex },
                { misCode: searchRegex },
                { email: searchRegex }
            ];
        }

        // Execute total count and paginated query concurrently for higher performance
        const [totalSubAdmins, subadmins] = await Promise.all([
            Admin.countDocuments(query),
            Admin.find(query)
                .select('fullName misCode email phone isActive createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
        ]);

        const totalPages = Math.ceil(totalSubAdmins / limit) || 1;

        res.render('admin/subadmins', {
            currentPage: "subadmins", // Required for sidebar active link highlight
            page,                     // Numeric current page for pagination math
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1,
            limit,
            totalSubAdmins,
            subadmins,
            search,
            admin: req.admin
        });
    } catch (err) {
        console.error("Error fetching subadmins list:", err);
        res.status(500).render('errors/500');
    }
};

// Delete a Sub-Admin
exports.deleteSubAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        // Delete only if target account has the 'subadmin' role
        const deletedSubAdmin = await Admin.findOneAndDelete({ 
            _id: id, 
            role: 'subadmin' 
        });

        if (!deletedSubAdmin) {
            console.error(`Sub-admin with ID ${id} not found or is an admin.`);
        }

        // Redirect back to sub-admins list page
        res.redirect('/admin/subadmins');
    } catch (err) {
        console.error("Error deleting sub-admin:", err);
        res.status(500).render('errors/500');
    }
};


// Render Add Sub-Admin Form
exports.renderAddSubAdminForm = (req, res) => {
    res.render("admin/addSubadmin", {
        currentPage: "subadmins",
        admin: req.admin,
        errorMessage: null,
        formData: {}
    });
};

// Handle Sub-Admin Creation
exports.createSubAdmin = async (req, res) => {
    const { fullName, misCode, email, phone, isActive } = req.body;

    try {
        const newSubAdmin = new Admin({
            fullName: fullName.trim(),
            misCode: misCode.trim().toUpperCase(),
            email: email.trim().toLowerCase(),
            phone: phone ? phone.trim() : null,
            role: "subadmin",
            isActive: isActive === "true" || isActive === true || isActive === "on",
            createdBy: req.admin._id
        });

        await newSubAdmin.save();
        res.redirect("/admin/subadmins");
    } catch (err) {
        console.error("Error creating sub-admin:", err);

        let errorMessage = "Something went wrong. Please try again.";
        if (err.code === 11000) {
            errorMessage = "A sub-admin with this Email or MIS Code already exists.";
        }

        // Re-render same form page with error & existing input data
        return res.status(400).render("admin/addSubadmin", {
            currentPage: "subadmins",
            admin: req.admin,
            errorMessage,
            formData: { fullName, misCode, email, phone, isActive }
        });
    }
};


// Render Edit Sub-Admin Form
exports.renderEditSubAdminForm = async (req, res) => {
    try {
        const { id } = req.params;
        const subadmin = await Admin.findOne({ _id: id, role: "subadmin" }).lean();

        if (!subadmin) {
            return res.status(404).render("errors/404", { message: "Sub-Admin not found" });
        }

        res.render("admin/editSubadmin", {
            currentPage: "subadmins",
            admin: req.admin,
            subadmin,
            errorMessage: null,
            formData: undefined
        });
    } catch (err) {
        console.error("Error fetching sub-admin for edit:", err);
        res.status(500).render("errors/500");
    }
};

// Handle Sub-Admin Update
exports.updateSubAdmin = async (req, res) => {
    const { id } = req.params;
    const { fullName, misCode, email, phone, isActive } = req.body;

    try {
        const updatedIsActive = isActive === "true" || isActive === true || isActive === "on";

        const updatedSubAdmin = await Admin.findOneAndUpdate(
            { _id: id, role: "subadmin" },
            {
                fullName: fullName.trim(),
                misCode: misCode.trim().toUpperCase(),
                email: email.trim().toLowerCase(),
                phone: phone ? phone.trim() : null,
                isActive: updatedIsActive
            },
            { new: true, runValidators: true }
        );

        if (!updatedSubAdmin) {
            return res.status(404).render("errors/404", { message: "Sub-Admin not found" });
        }

        res.redirect("/admin/subadmins");
    } catch (err) {
        console.error("Error updating sub-admin:", err);

        let errorMessage = "Something went wrong. Please try again.";
        if (err.code === 11000) {
            errorMessage = "A sub-admin with this Email or MIS Code already exists.";
        }

        return res.status(400).render("admin/editSubadmin", {
            currentPage: "subadmins",
            admin: req.admin,
            subadmin: { _id: id, fullName, misCode, email, phone, isActive: isActive === "true" || isActive === "on" },
            errorMessage,
            formData: { fullName, misCode, email, phone, isActive }
        });
    }
};

// GET /admin/profile - Render read-only profile details
exports.getMyProfile = async (req, res) => {
    try {
        const currentAdmin = await Admin.findById(req.admin._id).populate("createdBy", "fullName email");

        res.render("admin/myProfile", {
            currentPage: "profile",
            admin: currentAdmin
        });
    } catch (err) {
        console.error("Error fetching profile:", err);
        res.status(500).render("error", { message: "Failed to load profile details." });
    }
};


// GET /admin/:id/edit — Render Edit Profile Form
exports.renderEditProfileForm = async (req, res) => {
    try {
        const targetAdmin = await Admin.findById(req.params.id);
        if (!targetAdmin) {
            return res.status(404).render("error", { message: "Admin account not found." });
        }

        res.render("admin/editProfile", {
            currentPage: "editProfile",
            adminToEdit: targetAdmin,
            errorMessage: null
        });
    } catch (err) {
        console.error("Error loading edit profile page:", err);
        res.status(500).render("error", { message: "Failed to load edit profile form." });
    }
};

// PUT or POST /admin/:id/edit — Update All Admin Profile Details
exports.updateAdminProfile = async (req, res) => {
    try {
        const { fullName, misCode, email, phone, role, isActive } = req.body;

        if (!fullName || !misCode || !email) {
            const targetAdmin = await Admin.findById(req.params.id);
            return res.status(400).render("admin/editProfile", {
                currentPage: "editProfile",
                adminToEdit: targetAdmin,
                errorMessage: "Full Name, MIS Code, and Email are required fields."
            });
        }

        await Admin.findByIdAndUpdate(req.params.id, {
            fullName: fullName.trim(),
            misCode: misCode.trim().toUpperCase(),
            email: email.trim().toLowerCase(),
            phone: phone ? phone.trim() : null,
            role: role,
            isActive: isActive === "true" || isActive === true
        });

        res.redirect("/admin/profile");
    } catch (err) {
        console.error("Error updating admin profile:", err);
        const targetAdmin = await Admin.findById(req.params.id);
        res.status(500).render("admin/editProfile", {
            currentPage: "editProfile",
            adminToEdit: targetAdmin,
            errorMessage: err.code === 11000 ? "MIS Code or Email already exists." : "Failed to update profile details."
        });
    }
};