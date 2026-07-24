const Student = require("../models/Student");
const Admin = require("../models/admin");

// -------------------------------------------------------------
// GET Admin Dashboard
// -------------------------------------------------------------
exports.getDashboard = async (req, res, next) => {
    try {
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(Date.UTC(currentYear, 0, 1));
        const startOfNextYear = new Date(Date.UTC(currentYear + 1, 0, 1));

        // 1. Execute all independent DB operations concurrently
        const [
            totalStudents,
            totalAdmins,
            monthlyAggregation,
            districtAggregation,
            percentageAggregation
        ] = await Promise.all([
            Student.countDocuments(),
            Admin.countDocuments(),
            
            // 2. Monthly Registrations Trend
            Student.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: startOfYear,
                            $lt: startOfNextYear
                        }
                    }
                },
                { 
                    $group: { 
                        _id: { $month: "$createdAt" }, 
                        count: { $sum: 1 } 
                    } 
                }
            ]),

            // 3. District Analytics (Top 5 + Others)
            Student.aggregate([
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
            ]),

            // 4. 12th Percentage Analytics (Adjust field name as per your Mongoose schema)
            Student.aggregate([
                { 
                    $match: { 
                        "education.twelfth.percentage": { $exists: true, $ne: null, $gte: 0 } 
                    } 
                },
                {
                    $bucket: {
                        groupBy: "$education.twelfth.percentage",
                        boundaries: [0, 50, 60, 70, 80, 90, 101],
                        default: "Unknown",
                        output: { count: { $sum: 1 } }
                    }
                }
            ])
        ]);

        // Process Monthly Data
        const monthlyData = Array(12).fill(0);
        monthlyAggregation.forEach(item => {
            if (item._id >= 1 && item._id <= 12) {
                monthlyData[item._id - 1] = item.count;
            }
        });

        // Process District Data
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

        // Process Percentage Bucket Data
        const bucketMap = { 0: 0, 50: 1, 60: 2, 70: 3, 80: 4, 90: 5 };
        const marksLabels = ["< 50%", "50-59%", "60-69%", "70-79%", "80-89%", "90-100%"];
        const marksData = Array(6).fill(0);

        percentageAggregation.forEach(bucket => {
            if (bucketMap[bucket._id] !== undefined) {
                marksData[bucketMap[bucket._id]] = bucket.count;
            }
        });

        // Render Dashboard
        return res.render("admin/dashboard", {
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
        // Pass to central error middleware or handle cleanly
        return next(err);
    }
};




/**
 * @desc    Export Students Data as CSV Stream
 * @route   GET /admin/students/export/csv
 * @access  Private (Admin)
 */
exports.exportStudentsCSV = async (req, res, next) => {
    try {
        // 1. Verify records exist before starting the stream
        const hasRecords = await Student.exists({});
        if (!hasRecords) {
            return res.status(404).send("No student records found to export.");
        }

        // 2. Set Response Headers for CSV File Streaming
        const fileName = `Students_Export_${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

        // Prepend UTF-8 BOM for Microsoft Excel UTF-8 compatibility
        res.write('\uFEFF');

        // Helper: Safe value formatting & CSV Formula Injection Protection
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

            let strVal = String(val).replace(/"/g, '""');

            // Sanitize potential CSV Injection / Formula Execution triggers
            if (/^[=+\-@\t\r]/.test(strVal)) {
                strVal = `'${strVal}`;
            }

            return `"${strVal}"`;
        };

        // Helper: Extract nested values safely
        const getNestedValue = (obj, path) => {
            if (!obj || !path) return null;
            return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined) ? acc[part] : null, obj);
        };

        // Helper: Determine document upload status
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
            { label: "Father Phone Code", path: "father.phoneCode" },
            { label: "Father Phone", path: "father.phone" },
            { label: "Father Email", path: "father.email" },
            { label: "Mother Name", path: "mother.name" },
            { label: "Mother Phone Code", path: "mother.phoneCode" },
            { label: "Mother Phone", path: "mother.phone" },
            { label: "Mother Email", path: "mother.email" },

            // Emergency Contact
            { label: "Emergency Contact Name", path: "emergencyContact.name" },
            { label: "Emergency Contact Phone Code", path: "emergencyContact.phoneCode" },
            { label: "Emergency Contact Phone", path: "emergencyContact.phone" },

            // Addresses
            { label: "Present Address", getValue: (s) => s.presentAddress ? `${s.presentAddress.address1 || ''} ${s.presentAddress.city || ''} ${s.presentAddress.district || ''} ${s.presentAddress.state || ''} ${s.presentAddress.pincode || ''}`.trim() : '' },
            { label: "Permanent Address", getValue: (s) => s.permanentAddress ? `${s.permanentAddress.address1 || ''} ${s.permanentAddress.city || ''} ${s.permanentAddress.district || ''} ${s.permanentAddress.state || ''} ${s.permanentAddress.pincode || ''}`.trim() : '' },

            // Education Details
            { label: "10th School Name", getValue: (s) => getNestedValue(s, "education.tenth.schoolName") },
            { label: "10th Percentage", getValue: (s) => getNestedValue(s, "education.tenth.percentage") },
            { label: "12th School Name", getValue: (s) => getNestedValue(s, "education.twelfth.schoolName") },
            { label: "12th Percentage", getValue: (s) => getNestedValue(s, "education.twelfth.percentage") },
            { label: "Diploma Institute", getValue: (s) => getNestedValue(s, "education.diploma.schoolName") },
            { label: "Diploma Percentage", getValue: (s) => getNestedValue(s, "education.diploma.percentage") },

            // Document Status Checks
            { 
                label: "Aadhaar Proof Status", 
                isDocument: true, 
                getValue: (s) => getNestedValue(s, "documents.aadhaarProof") 
            },
            { 
                label: "ABC ID Proof Status", 
                isDocument: true, 
                getValue: (s) => getNestedValue(s, "documents.abcIdProof") 
            },
            { 
                label: "10th Marksheet Status", 
                isDocument: true, 
                getValue: (s) => getNestedValue(s, "education.tenth.marksheet") 
            },
            { 
                label: "12th Marksheet Status", 
                isDocument: true, 
                getValue: (s) => getNestedValue(s, "education.twelfth.marksheet") 
            },
            { 
                label: "Diploma Marksheet Status", 
                isDocument: true, 
                getValue: (s) => getNestedValue(s, "education.diploma.marksheet") 
            },
            { 
                label: "Caste Proof Status", 
                isDocument: true, 
                getValue: (s) => getNestedValue(s, "documents.casteProof") || getNestedValue(s, "documents.casteCertificate") 
            },
            { 
                label: "Leaving Certificate Status", 
                isDocument: true, 
                getValue: (s) => getNestedValue(s, "documents.leavingCertificate") 
            },
            { 
                label: "PWD Proof Status", 
                isDocument: true, 
                getValue: (s) => getNestedValue(s, "documents.pwdProof") 
            }
        ];

        // 3. Write CSV Header Row
        const headerRow = schemaColumns.map(col => `"${col.label}"`).join(',') + '\n';
        res.write(headerRow);

        // 4. Stream Documents via Cursor
        const cursor = Student.find({}).lean().cursor();

        // Cleanup cursor if client disconnects mid-download
        req.on('close', () => {
            cursor.close();
        });

        cursor.on('data', (student) => {
            const row = schemaColumns.map(col => {
                const rawVal = col.getValue ? col.getValue(student) : getNestedValue(student, col.path);

                if (col.isDocument) {
                    return `"${getDocumentStatus(rawVal)}"`;
                }

                if (col.path === '_id' && rawVal) {
                    return `"${rawVal.toString()}"`;
                }

                return formatValue(rawVal);
            }).join(',') + '\n';

            res.write(row);
        });

        cursor.on('end', () => {
            res.end();
        });

        cursor.on('error', (err) => {
            if (!res.headersSent) {
                return next(err);
            }
            res.end();
        });

    } catch (err) {
        return next(err);
    }
};



/**
 * Helper: Escapes special characters for safe standard Regular Expression creation
 */
const escapeRegex = (text) => {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

/**
 * @desc    Get Paginated & Searched Student List
 * @route   GET /admin/students
 * @access  Private (Admin)
 */
exports.getStudentsList = async (req, res, next) => {
    try {
        // 1. Sanitize & Normalize Pagination Parameters
        let page = parseInt(req.query.page, 10);
        if (isNaN(page) || page < 1) page = 1;

        const limit = 15;
        const search = req.query.search ? req.query.search.trim() : '';

        // 2. Build Query Safely
        let query = {};

        if (search) {
            // Escape special regex characters to eliminate ReDoS attack vectors
            const safeSearch = escapeRegex(search);
            const searchRegex = new RegExp(safeSearch, 'i');

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

        // 3. Count total documents matching query first to get totalPages
        const totalStudents = await Student.countDocuments(query);
        const totalPages = Math.ceil(totalStudents / limit) || 1;

        // 4. Redirect gracefully if requested page exceeds actual available pages
        if (page > totalPages && totalStudents > 0) {
            const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
            return res.redirect(`/admin/students?page=${totalPages}${searchParam}`);
        }

        // 5. Fetch current page students
        const students = await Student.find(query)
            .select('firstName middleName lastName fullName email ugNumber enrollmentNo phone phoneCode studentStatus createdAt')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        // 6. Render Admin Students View
        return res.render('admin/students', {
            currentPage: 'students',
            page,
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
        return next(err);
    }
};


const mongoose = require('mongoose');

/**
 * @desc    Get Detailed Student Profile View
 * @route   GET /admin/students/:id
 * @access  Private (Admin)
 */
exports.getStudentInDetail = async (req, res, next) => {
    try {
        const studentId = req.params.id;

        // 1. Validate Mongo ObjectId format before querying DB to prevent CastError 500s
        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(404).render('errors/404', { message: 'Student profile not found' });
        }

        // 2. Fetch Student Record
        const student = await Student.findById(studentId).lean();

        if (!student) {
            return res.status(404).render('errors/404', { message: 'Student profile not found' });
        }

        // 3. Compute Document Upload Status Checklist based on exact schema keys
        const documentStatus = {
            aadhaar: !!student.documents?.aadhaarProof,
            tenthMarksheet: !!student.education?.tenth?.marksheet,
            twelfthMarksheet: !!(student.education?.twelfth?.marksheet || student.education?.diploma?.marksheet),
            leavingCertificate: !!student.documents?.leavingCertificate,
            casteCertificate: !!student.documents?.casteProof,
        };

        // 4. Render Admin Detailed View
        return res.render('admin/studentInDetail', {
            currentPage: 'students',
            admin: req.admin,
            student,
            documentStatus,
        });

    } catch (err) {
        return next(err);
    }
};


const { storeUploadedFiles, applyStoredFilePaths, deleteStoredFiles } = require("../services/storageService");

/**
 * @desc    Render full editable student form
 * @route   GET /admin/students/:id/edit
 * @access  Private (Admin)
 */
exports.renderEditStudentForm = async (req, res, next) => {
    try {
        const studentId = req.params.id;

        // 1. Validate Mongo ObjectId before querying DB to avoid CastError 500s
        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(404).render("errors/404", { message: "Student not found" });
        }

        // 2. Fetch Student Record
        const student = await Student.findById(studentId).lean();
        if (!student) {
            return res.status(404).render("errors/404", { message: "Student not found" });
        }

        // 3. Render Edit Student Form
        return res.render("admin/editStudent", {
            currentPage: "students",
            admin: req.admin,
            student,
            errorMessage: null
        });

    } catch (err) {
        return next(err);
    }
};

// PUT /admin/students/:id — Update ALL student fields, including document
// re-upload. Admin uploads bypass OCR/AI verification entirely — an
// admin correcting/replacing a document is trusted at face value, only
// the same signature/format check (real PDF/JPG/PNG, not corrupted)
// still applies via handleUpload's fileFilter + Multer limits.
exports.updateStudent = async (req, res) => {
    const { id } = req.params;
    const body = req.body || {};
    let storedFilePaths = null;

    try {
        const student = await Student.findById(id);
        if (!student) {
            return res.status(404).render("errors/404", { message: "Student not found" });
        }

        const isIndian = (body.nationality || student.nationality) === "Indian";

        // If any new documents were uploaded, store them and merge the
        // resulting paths into body — same storage logic as
        // registration, but with NO OCR/document verification call at
        // all (that's the entire point: admin-trusted, instant).
        if (req.files && Object.keys(req.files).length > 0) {
            storedFilePaths = await storeUploadedFiles(req.files, {
                ugNumber: body.ugNumber || student.ugNumber,
                firstName: body.firstName || student.firstName,
                lastName: body.lastName || student.lastName,
            });
            applyStoredFilePaths(body, storedFilePaths);
        }

        // ---------- Basic fields ----------
        student.title = body.title || student.title;
        student.firstName = body.firstName || student.firstName;
        student.middleName = body.middleName || undefined;
        student.lastName = body.lastName || student.lastName;
        student.gender = body.gender || student.gender;
        if (body.dob) student.dob = new Date(body.dob);
        student.bloodGroup = body.bloodGroup || undefined;
        student.category = isIndian ? (body.category || student.category) : undefined;
        student.religion = body.religion || undefined;
        student.caste = isIndian ? (body.caste || student.caste) : undefined;
        student.nationality = body.nationality || student.nationality;
        student.passportNumber = isIndian ? undefined : (body.passportNumber || student.passportNumber);
        student.aadhaarNumber = isIndian ? (body.aadhaarNumber || student.aadhaarNumber) : undefined;
        student.abcId = body.abcId || student.abcId;

        student.residesInHostel = body.residesInHostel === "true";
        student.hostelName = student.residesInHostel ? (body.hostelName || student.hostelName) : undefined;

        if (body.email) student.email = body.email.trim().toLowerCase();
        if (body.ugNumber) student.ugNumber = body.ugNumber.trim().toUpperCase();
        student.enrollmentNo = body.enrollmentNo || student.enrollmentNo;

        student.faculty = body.faculty || student.faculty;
        student.institute = body.institute || student.institute;
        student.course = body.course || student.course;
        student.branch = body.branch || student.branch;
        student.specialization = body.specialization || student.specialization;

        if (body.joiningDate) {
            student.joiningDate = new Date(body.joiningDate);
            student.admissionYear = student.joiningDate.getFullYear();
        }
        student.admissionType = body.admissionType || student.admissionType;
        student.studentStatus = body.studentStatus || student.studentStatus;
        student.profileStatus = body.profileStatus || student.profileStatus;

        student.phoneCode = body.phoneCode || student.phoneCode;
        student.phone = body.phone || student.phone;
        student.whatsapp = body.whatsapp || undefined;
        student.alternateEmail = body.alternateEmail ? body.alternateEmail.toLowerCase() : undefined;

        // ---------- Nested groups ----------
        if (body.emergencyContact) {
            student.emergencyContact = {
                name: body.emergencyContact.name || student.emergencyContact?.name,
                phoneCode: body.emergencyContact.phoneCode || student.emergencyContact?.phoneCode || "+91",
                phone: body.emergencyContact.phone || student.emergencyContact?.phone,
            };
        }
        if (body.father) {
            student.father = {
                name: body.father.name || student.father?.name,
                phoneCode: body.father.phoneCode || student.father?.phoneCode || "+91",
                phone: body.father.phone || student.father?.phone,
                email: body.father.email || student.father?.email,
            };
        }
        if (body.mother) {
            student.mother = {
                name: body.mother.name || student.mother?.name,
                phoneCode: body.mother.phoneCode || student.mother?.phoneCode || "+91",
                phone: body.mother.phone || student.mother?.phone,
                email: body.mother.email || student.mother?.email,
            };
        }
        if (body.presentAddress) {
            student.presentAddress = { ...student.presentAddress?.toObject?.(), ...body.presentAddress };
        }
        if (body.permanentAddress) {
            student.permanentAddress = { ...student.permanentAddress?.toObject?.(), ...body.permanentAddress };
        }

        // ---------- Education ----------
        if (body.education) {
            const qualKey = body.qualificationType === "diploma" ? "diploma" : "twelfth";
            const existingEdu = student.education?.toObject?.() || {};

            if (body.education.tenth) {
                existingEdu.tenth = {
                    schoolName: body.education.tenth.schoolName || existingEdu.tenth?.schoolName,
                    percentage: body.education.tenth.percentage !== undefined && body.education.tenth.percentage !== ""
                        ? Number(body.education.tenth.percentage) : existingEdu.tenth?.percentage,
                    marksheet: body.education.tenth.marksheet || existingEdu.tenth?.marksheet,
                };
            }
            if (body.education[qualKey]) {
                existingEdu[qualKey] = {
                    schoolName: body.education[qualKey].schoolName || existingEdu[qualKey]?.schoolName,
                    percentage: body.education[qualKey].percentage !== undefined && body.education[qualKey].percentage !== ""
                        ? Number(body.education[qualKey].percentage) : existingEdu[qualKey]?.percentage,
                    marksheet: body.education[qualKey].marksheet || existingEdu[qualKey]?.marksheet,
                };
            }
            student.education = existingEdu;
        }

        // ---------- Documents ----------
        if (body.documents) {
            const existingDocs = student.documents?.toObject?.() || {};
            student.documents = {
                aadhaarProof: body.documents.aadhaarProof || existingDocs.aadhaarProof,
                abcIdProof: body.documents.abcIdProof || existingDocs.abcIdProof,
                casteProof: body.documents.casteProof || existingDocs.casteProof,
                pwdProof: body.documents.pwdProof || existingDocs.pwdProof,
                leavingCertificate: body.documents.leavingCertificate || existingDocs.leavingCertificate,
                aoLevelCertificate: body.documents.aoLevelCertificate || existingDocs.aoLevelCertificate,
                puAdmissionLetter: body.documents.puAdmissionLetter || existingDocs.puAdmissionLetter,
                passportUpload: body.documents.passportUpload || existingDocs.passportUpload,
            };
        }

        await student.save();
        res.redirect(`/admin/students/${id}/inDetail`);
    } catch (err) {
        if (storedFilePaths) {
            await deleteStoredFiles(storedFilePaths);
        }
        console.error("Error updating student:", err);

        let errorMessage = "Something went wrong while updating the student.";
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern || {})[0] || "field";
            errorMessage = `A student with this ${field} already exists.`;
        } else if (err.name === "ValidationError") {
            errorMessage = Object.values(err.errors).map((e) => e.message).join(" ");
        }

        const student = await Student.findById(id).lean();
        return res.status(400).render("admin/editStudent", {
            currentPage: "students",
            admin: req.admin,
            student,
            errorMessage
        });
    }
};

// DELETE /admin/students/:id
exports.deleteStudent = async (req, res) => {
    try {
        const deleted = await Student.findByIdAndDelete(req.params.id);
        if (!deleted) {
            console.error(`Student with ID ${req.params.id} not found.`);
        }
        res.redirect("/admin/students");
    } catch (err) {
        console.error("Error deleting student:", err);
        res.status(500).render("errors/500");
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
        const isAccountActive = isActive === "true" || isActive === true || isActive === "on";

        const newSubAdmin = new Admin({
            fullName: fullName.trim(),
            misCode: misCode.trim().toUpperCase(),
            email: email.trim().toLowerCase(),
            phone: phone ? phone.trim() : null,
            role: "subadmin",
            isActive: isAccountActive,
            // If created as inactive, start the 1-year deletion timer now; otherwise set to null
            inactivatedAt: isAccountActive ? null : new Date(),
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

exports.updateSubAdmin = async (req, res) => {
    const { id } = req.params;
    const { fullName, misCode, email, phone, isActive } = req.body;

    try {
        const subadmin = await Admin.findOne({ _id: id, role: "subadmin" });

        if (!subadmin) {
            return res.status(404).render("errors/404", { message: "Sub-Admin not found" });
        }

        const updatedIsActive = isActive === "true" || isActive === true || isActive === "on";

        // Update standard fields
        subadmin.fullName = fullName.trim();
        subadmin.misCode = misCode.trim().toUpperCase();
        subadmin.email = email.trim().toLowerCase();
        subadmin.phone = phone ? phone.trim() : null;

        // Manage isActive and inactivatedAt timestamp
        if (!updatedIsActive) {
            subadmin.isActive = false;
            // Only set timestamp if transitioning from active -> inactive
            if (!subadmin.inactivatedAt) {
                subadmin.inactivatedAt = new Date();
            }
        } else {
            subadmin.isActive = true;
            // Clear timestamp so TTL index won't auto-delete
            subadmin.inactivatedAt = null; 
        }

        await subadmin.save();

        return res.redirect("/admin/subadmins");

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


/**
 * @desc    Render Add New Admin Form
 * @route   GET /admin/add
 * @access  Private (Root Admin Only)
 */
exports.renderAddAdminForm = async (req, res) => {
    return res.render('admin/addAdmin', {
        currentPage: 'addAdmin',
        admin: req.admin,
        formData: {},
        errorMessage: null
    });
};

/**
 * @desc    Create New Admin / Sub-admin
 * @route   POST /admin/add
 * @access  Private (Root Admin Only)
 */
exports.addAdmin = async (req, res, next) => {
    try {
        const { fullName, misCode, email, phone, role, isActive } = req.body;

        const normalizedEmail = email ? email.toLowerCase().trim() : '';
        const normalizedMisCode = misCode ? misCode.toUpperCase().trim() : '';

        // 1. Check if Email or MIS Code already exists
        const existingAdmin = await Admin.findOne({
            $or: [
                { email: normalizedEmail },
                { misCode: normalizedMisCode }
            ]
        });

        if (existingAdmin) {
            return res.status(400).render('admin/addAdmin', {
                currentPage: 'addAdmin',
                admin: req.admin,
                formData: { fullName, misCode, email, phone, role, isActive },
                errorMessage: 'An administrator with this Email or MIS Code already exists.'
            });
        }

        // 2. Create and Save New Admin
        await Admin.create({
            fullName: fullName.trim(),
            misCode: normalizedMisCode,
            email: normalizedEmail,
            phone: phone ? phone.trim() : null,
            role: role || 'subadmin',
            isActive: isActive === 'true',
            createdBy: req.admin ? req.admin._id : null
        });

        return res.redirect('/admin/subadmins');

    } catch (err) {
        return next(err);
    }
};


/**
 * Render the page displaying all main system administrators.
 * Accessible by both Admins and Sub-Admins.
 * 
 * @route   GET /admin/allAdmins
 * @access  Private (Admin / Sub-Admin)
 */
exports.getAllAdmins = async (req, res, next) => {
    try {
        const admins = await Admin.find({ role: 'admin' })
            .select('fullName name email phone phoneCode role')
            .sort({ createdAt: -1 })
            .lean();

        // Ensure logged-in user object is explicitly passed as 'admin' or 'currentUser'
        return res.status(200).render('admin/allAdmins', {
            title: 'All Administrators',
            currentPage: 'allAdmins',
            admins: admins || [],
            admin: req.user || req.admin // Pass the authenticated session user
        });

    } catch (error) {
        console.error('[getAllAdmins] Error:', error);
        return res.status(500).redirect('/admin/dashboard');
    }
};


// Render Help / Contact Support Page
exports.getHelpPage = (req, res) => {
    res.render("admin/help", {
        currentPage: "help"
    });
};