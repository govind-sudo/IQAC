const Student = require("../models/Student");
const Admin = require("../models/admin");


// -------------------------------------------------------------
// Phone numbers are stored WITHOUT a country code — 10 digits only.
//
// Browsers autofill this field with "+919754434029" and users paste
// numbers in half a dozen formats, so the value is normalised here
// rather than trusting the form. Handles "+91 97544 34029",
// "091-9754434029", "9754434029" and similar, all of which reduce to
// the same 10 digits.
//
// Returns { ok, value, error }. An empty input is valid (phone is
// optional in the schema) and yields value: null.
// -------------------------------------------------------------
function normalizePhone(raw) {
    if (raw === undefined || raw === null || String(raw).trim() === "") {
        return { ok: true, value: null };
    }

    let digits = String(raw).replace(/\D/g, "");

    // Strip India's country code / trunk prefix if present.
    if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    else if (digits.length === 13 && digits.startsWith("091")) digits = digits.slice(3);
    else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);

    if (digits.length !== 10) {
        return {
            ok: false,
            error:
                "Enter a 10-digit phone number without the country code (e.g. 9754434029)."
        };
    }

    return { ok: true, value: digits };
}

// Queue a one-time message to show on the next page the admin lands on.
// Read and cleared by the flash middleware in routes/adminRoutes.js.
function setFlash(req, type, message) {
    req.session.flash = { type, message };
}


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
            adminRoleAggregation,
            monthlyAggregation,
            districtAggregation,
            percentageAggregation
        ] = await Promise.all([
            Student.countDocuments(),

            // Admin/Sub-Admin headcount broken down by role AND status in
            // one pass, rather than four separate countDocuments() calls.
            Admin.aggregate([
                {
                    $group: {
                        _id: { role: "$role", isActive: "$isActive" },
                        count: { $sum: 1 }
                    }
                }
            ]),
            
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

        // Process Admin / Sub-Admin Counts
        //
        // Previously the dashboard showed a single "Total Admins" figure
        // from Admin.countDocuments(), which counted sub-admins too — so
        // the number on screen never matched what the Admins page listed.
        // Split by role, and by active/inactive within each role.
        const adminCounts = {
            admins: { total: 0, active: 0, inactive: 0 },
            subadmins: { total: 0, active: 0, inactive: 0 }
        };

        adminRoleAggregation.forEach((row) => {
            const bucket = row._id.role === "admin" ? adminCounts.admins : adminCounts.subadmins;
            bucket.total += row.count;
            if (row._id.isActive) {
                bucket.active += row.count;
            } else {
                bucket.inactive += row.count;
            }
        });

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
            metrics: {
                totalStudents,
                admins: adminCounts.admins,
                subadmins: adminCounts.subadmins,
                // Kept so anything still reading metrics.totalAdmins does
                // not silently render blank — now correctly counts only
                // true admins, not sub-admins.
                totalAdmins: adminCounts.admins.total
            },
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

        // Page size is admin-selectable. Whitelisted rather than taken
        // straight from the query string: ?limit=100000 would otherwise
        // let anyone pull every student in one request, which is both a
        // slow query and a lot of personal data in a single response.
        const ALLOWED_LIMITS = [15, 30, 50, 100, 250];
        const DEFAULT_LIMIT = 15;

        const requestedLimit = parseInt(req.query.limit, 10);
        const limit = ALLOWED_LIMITS.includes(requestedLimit) ? requestedLimit : DEFAULT_LIMIT;

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
            const limitParam = limit !== DEFAULT_LIMIT ? `&limit=${limit}` : '';
            return res.redirect(`/admin/students?page=${totalPages}${searchParam}${limitParam}`);
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
            allowedLimits: ALLOWED_LIMITS,
            // "Showing 31-45 of 216" — more useful at a glance than a
            // bare page number once the page size can change.
            rangeStart: totalStudents === 0 ? 0 : (page - 1) * limit + 1,
            rangeEnd: Math.min(page * limit, totalStudents),
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


const {
    storeUploadedFiles,
    applyStoredFilePaths,
    deleteStoredFiles,
    deleteStudentDocuments,
    renameStudentDocuments,
} = require("../services/storageService");

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
                enrollmentNo: body.enrollmentNo || student.enrollmentNo,
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
        // Capture the enrollment number BEFORE overwriting it, so we can
        // detect an actual change and re-identify the stored documents.
        const previousEnrollmentNo = student.enrollmentNo;
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

        // ---------- Re-identify stored documents on enrollment assignment ----------
        // When an admin assigns (or corrects) the real enrollment number,
        // every stored file is renamed from
        //   {ugNumber}_{Name}_{docType}.ext
        // to
        //   {enrollmentNo}_{Name}_{docType}.ext
        // and the student's document paths are rewritten to match.
        // Deliberately runs BEFORE save() so the renamed paths are part
        // of the same write — if the rename throws, nothing is persisted
        // and the catch block below rolls back any new uploads too.
        if (student.enrollmentNo && student.enrollmentNo !== previousEnrollmentNo) {
            await renameStudentDocuments(student, student.enrollmentNo);
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
        // findByIdAndDelete returns the document it removed, which still
        // holds the file paths — so the uploaded documents can be cleaned
        // up afterwards. Previously only the database row was deleted,
        // leaving that student's Aadhaar card, passport, and marksheets
        // on disk permanently, referenced by nothing and invisible to
        // the app.
        const deleted = await Student.findByIdAndDelete(req.params.id);

        if (!deleted) {
            console.error(`Student with ID ${req.params.id} not found.`);
            setFlash(req, "error", "That student record no longer exists.");
            return res.redirect("/admin/students");
        }

        // File cleanup runs after the record is gone and never blocks the
        // delete: the admin asked for the student to be removed, and a
        // stubborn file (locked on Windows, already moved) should not
        // resurrect the record or throw a 500. Failures are logged with
        // enough detail to clear them up by hand.
        const cleanup = await deleteStudentDocuments(deleted);

        if (cleanup.failed.length) {
            console.error(
                `Deleted student ${deleted.ugNumber || deleted._id}, but ` +
                    `${cleanup.failed.length} file(s) could not be removed:\n  ` +
                    cleanup.failed.join("\n  ")
            );
        }

        const name =
            deleted.fullName ||
            `${deleted.firstName || ""} ${deleted.lastName || ""}`.trim() ||
            deleted.ugNumber;

        setFlash(
            req,
            cleanup.failed.length ? "error" : "success",
            cleanup.failed.length
                ? `Student "${name}" was deleted, but ${cleanup.failed.length} document file(s) ` +
                  `could not be removed from storage. Check the server log.`
                : `Student "${name}" and ${cleanup.deleted} document file(s) were deleted.`
        );

        return res.redirect("/admin/students");
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

        const phoneResult = normalizePhone(phone);
        if (!phoneResult.ok) {
            return res.status(400).render("admin/addSubadmin", {
                currentPage: "subadmins",
                admin: req.admin,
                errorMessage: phoneResult.error,
                formData: { fullName, misCode, email, phone, isActive }
            });
        }

        const newSubAdmin = new Admin({
            fullName: fullName.trim(),
            misCode: misCode.trim().toUpperCase(),
            email: email.trim().toLowerCase(),
            phone: phoneResult.value,
            role: "subadmin",
            isActive: isAccountActive,
            // If created as inactive, start the 1-year deletion timer now; otherwise set to null
            inactivatedAt: isAccountActive ? null : new Date(),
            createdBy: req.admin._id
        });

        await newSubAdmin.save();
        setFlash(req, "success", `Sub-Admin "${newSubAdmin.fullName}" created successfully.`);
        return res.redirect("/admin/subadmins");
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

        const phoneResult = normalizePhone(phone);
        if (!phoneResult.ok) {
            return res.status(400).render("admin/editSubadmin", {
                currentPage: "subadmins",
                admin: req.admin,
                subadmin,
                errorMessage: phoneResult.error,
                formData: { fullName, misCode, email, phone, isActive }
            });
        }
        subadmin.phone = phoneResult.value;

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

        setFlash(req, "success", `Sub-Admin "${subadmin.fullName}" updated successfully.`);
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


// An administrator's own details are theirs alone to change.
//
// One admin editing another's name, MIS code, or email would let them
// silently take over that account — changing the email unlinks the
// Google login (see updateAdminProfile), so the original owner could be
// locked out without ever being told. Peer control over other admins is
// therefore limited to the three coarse, visible actions on
// /admin/allAdmins: activate/deactivate, demote, and delete.
const CROSS_EDIT_MESSAGE =
    "Administrators can only edit their own details. You can activate, deactivate, " +
    "demote, or remove another administrator from the Admins page.";

function isEditingSelf(req, targetAdmin) {
    return String(targetAdmin._id) === String(req.session.userId);
}

// Builds the locals for admin/editProfile.
//
// The same template serves two different jobs — "edit my own profile"
// and "edit another administrator" — and framing both as the former was
// disorienting: the sidebar lit up "Edit Profile", the back link said
// "Back to Profile", and Cancel returned to YOUR profile even though you
// were editing somebody else. currentPage and the navigation targets now
// follow whose account is actually open.
function buildEditProfileLocals(req, targetAdmin, errorMessage) {
    const isSelf = String(targetAdmin._id) === String(req.session.userId);
    const backUrl = isSelf
        ? "/admin/profile"
        : targetAdmin.role === "admin"
            ? "/admin/allAdmins"
            : "/admin/subadmins";

    return {
        // Keeps the sidebar highlight on the section you navigated from,
        // instead of always claiming you are in "Edit Profile".
        currentPage: isSelf
            ? "editProfile"
            : targetAdmin.role === "admin"
                ? "allAdmins"
                : "subadmins",
        adminToEdit: targetAdmin,
        isSelf,
        backUrl,
        backLabel: isSelf
            ? "Back to Profile"
            : targetAdmin.role === "admin"
                ? "Back to All Administrators"
                : "Back to Sub-Admins",
        errorMessage
    };
}

// GET /admin/:id/edit — Render Edit Profile Form
exports.renderEditProfileForm = async (req, res) => {
    try {
        const targetAdmin = await Admin.findById(req.params.id);
        if (!targetAdmin) {
            return res.status(404).render("error", { message: "Admin account not found." });
        }

        if (!isEditingSelf(req, targetAdmin)) {
            setFlash(req, "error", CROSS_EDIT_MESSAGE);
            return res.redirect("/admin/allAdmins");
        }

        res.render("admin/editProfile", buildEditProfileLocals(req, targetAdmin, null));
    } catch (err) {
        console.error("Error loading edit profile page:", err);
        res.status(500).render("error", { message: "Failed to load edit profile form." });
    }
};

// PUT or POST /admin/:id/edit — Update All Admin Profile Details
//
// Guards two genuinely irreversible situations that the form itself
// cannot prevent:
//
//   1. LAST ADMIN LOCKOUT. Only a root admin can create or edit admins
//      (requireRole("admin") on these routes). If the last active admin
//      deactivates themselves or demotes themselves to subadmin, there
//      is nobody left in the system who can undo it — the account can
//      only be restored by editing the database by hand. That change is
//      refused outright, not merely warned about.
//
//   2. SELF-INFLICTED LOCKOUT. There is no password login for admins
//      (authController.login is commented out); the only way in is
//      Google. So a self-edit that changes the sign-in email, or that
//      deactivates the account, can end the admin's own access. Those
//      are allowed, but only after an explicit confirmation step.
exports.updateAdminProfile = async (req, res) => {
    try {
        const { fullName, misCode, email, phone, role, isActive } = req.body;

        const targetAdmin = await Admin.findById(req.params.id);
        if (!targetAdmin) {
            return res.status(404).render("errors/404", { message: "Admin account not found." });
        }

        if (!isEditingSelf(req, targetAdmin)) {
            setFlash(req, "error", CROSS_EDIT_MESSAGE);
            return res.redirect("/admin/allAdmins");
        }

        const renderEditWithError = (errorMessage) =>
            res
                .status(400)
                .render("admin/editProfile", buildEditProfileLocals(req, targetAdmin, errorMessage));

        if (!fullName || !misCode || !email) {
            return renderEditWithError("Full Name, MIS Code, and Email are required fields.");
        }

        // ---------- Work out what is actually changing ----------
        const nextEmail = email.trim().toLowerCase();
        const nextRole = role || targetAdmin.role;
        const nextIsActive = isActive === "true" || isActive === true || isActive === "on";

        const emailChanged = nextEmail !== (targetAdmin.email || "").toLowerCase();
        const deactivating = targetAdmin.isActive && !nextIsActive;
        const demoting = targetAdmin.role === "admin" && nextRole !== "admin";

        const isSelf = String(targetAdmin._id) === String(req.session.userId);

        // ---------- Guard 1: never strip the system of its last admin ----------
        if (targetAdmin.role === "admin" && (deactivating || demoting)) {
            const otherActiveAdmins = await Admin.countDocuments({
                _id: { $ne: targetAdmin._id },
                role: "admin",
                isActive: true
            });

            if (otherActiveAdmins === 0) {
                const action = deactivating ? "deactivate" : "demote to Sub-Admin";
                return renderEditWithError(
                    `This is the only active Administrator account, so it cannot be ${action}d. ` +
                    `Doing so would leave the portal with no one able to manage admins, students, ` +
                    `or restore this account. Create and activate another Administrator first, ` +
                    `then retry this change.`
                );
            }
        }

        // ---------- Guard 2: confirm self-inflicted access changes ----------
        const needsConfirmation = isSelf && (emailChanged || deactivating || demoting);
        const confirmed = req.body.confirmDangerousChange === "yes";

        if (needsConfirmation && !confirmed) {
            const warnings = [];

            if (deactivating) {
                warnings.push({
                    title: "You will be signed out and locked out immediately",
                    body:
                        "Deactivating your own account ends your session at once and blocks you from " +
                        "signing back in. Only another active Administrator can reactivate it. " +
                        "Inactive accounts are also permanently deleted by the database after 365 days."
                });
            }

            if (demoting) {
                warnings.push({
                    title: "You will lose Administrator privileges",
                    body:
                        "Sub-Admins cannot add, edit, or promote administrators. You will not be able " +
                        "to restore your own Administrator role — another Administrator must do it for you."
                });
            }

            if (emailChanged) {
                warnings.push({
                    title: "You will be signed out and must sign in with the new email address",
                    body:
                        "Admins sign in with Google only — there is no password fallback. Saving a new " +
                        "email address unlinks the Google account currently attached to this profile, so " +
                        "the next sign-in will accept ONLY the Google account matching the new address. " +
                        "Make absolutely sure you own and can access that Google account: if the address " +
                        "is wrong, nobody can sign in as you and only another active Administrator can " +
                        "correct it."
                });
            }

            return res.status(200).render("admin/confirmProfileChange", {
                currentPage: "editProfile",
                adminToEdit: targetAdmin,
                warnings,
                formValues: {
                    fullName: fullName.trim(),
                    misCode: misCode.trim().toUpperCase(),
                    email: nextEmail,
                    phone: phone ? phone.trim() : "",
                    role: nextRole,
                    isActive: nextIsActive ? "true" : "false"
                },
                cancelUrl: `/admin/${targetAdmin._id}/edit`
            });
        }

        // ---------- Apply ----------
        const phoneResult = normalizePhone(phone);
        if (!phoneResult.ok) {
            return renderEditWithError(phoneResult.error);
        }

        targetAdmin.fullName = fullName.trim();
        targetAdmin.misCode = misCode.trim().toUpperCase();
        targetAdmin.email = nextEmail;
        targetAdmin.phone = phoneResult.value;
        targetAdmin.role = nextRole;

        // Changing the email must also break the existing Google link.
        //
        // Admin login (googleAuthRoutes.js) only compares googleId once
        // it is set — the email is never re-checked. So without this,
        // a changed email is completely inert: the OLD Google account
        // still signs in and the NEW address never can. Clearing
        // googleId puts the account back into "first login" mode, where
        // the next Google sign-in is matched against the new email and
        // re-links from there.
        if (emailChanged && targetAdmin.googleId) {
            targetAdmin.googleId = null;
        }

        // Keep inactivatedAt in step with isActive, matching how
        // updateSubAdmin already handles it. Without this the TTL index
        // on inactivatedAt never arms for admins, so a deactivated admin
        // account would linger forever while a deactivated sub-admin is
        // cleaned up after 365 days — an inconsistency that was easy to
        // miss because nothing surfaces it.
        if (!nextIsActive) {
            targetAdmin.isActive = false;
            if (!targetAdmin.inactivatedAt) {
                targetAdmin.inactivatedAt = new Date();
            }
        } else {
            targetAdmin.isActive = true;
            targetAdmin.inactivatedAt = null;
        }

        await targetAdmin.save();

        // Any self-edit that changes how (or whether) you can sign in
        // must end the current session immediately. Otherwise the admin
        // keeps browsing on a live session belonging to an account whose
        // credentials no longer work — and only discovers the problem
        // much later, after the session quietly expires.
        if (isSelf && deactivating) {
            return req.session.destroy(() => {
                res.clearCookie("connect.sid");
                res.redirect("/login?error=Your account has been deactivated.");
            });
        }

        if (isSelf && emailChanged) {
            return req.session.destroy(() => {
                res.clearCookie("connect.sid");
                res.redirect(
                    "/login?error=" +
                    encodeURIComponent(
                        "Email updated. Please sign in again using the Google account for " +
                        nextEmail + "."
                    )
                );
            });
        }

        // Editing your own profile lands on your profile page; editing
        // another administrator returns to the list you came from,
        // rather than dumping you on your own profile as if you had
        // just edited yourself.
        if (!isSelf) {
            setFlash(req, "success", `"${targetAdmin.fullName}" updated successfully.`);
            return res.redirect(
                targetAdmin.role === "admin" ? "/admin/allAdmins" : "/admin/subadmins"
            );
        }

        setFlash(req, "success", "Your profile has been updated.");
        return res.redirect("/admin/profile");
    } catch (err) {
        console.error("Error updating admin profile:", err);
        const targetAdmin = await Admin.findById(req.params.id);
        if (!targetAdmin) {
            return res.status(404).render("errors/404", { message: "Admin account not found." });
        }

        return res.status(500).render(
            "admin/editProfile",
            buildEditProfileLocals(
                req,
                targetAdmin,
                err.code === 11000
                    ? "MIS Code or Email already exists."
                    : "Failed to update profile details."
            )
        );
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

        // 2. Validate the phone number (10 digits, no country code)
        const phoneResult = normalizePhone(phone);
        if (!phoneResult.ok) {
            return res.status(400).render('admin/addAdmin', {
                currentPage: 'addAdmin',
                admin: req.admin,
                formData: { fullName, misCode, email, phone, role, isActive },
                errorMessage: phoneResult.error
            });
        }

        // 3. Create and Save New Admin
        const assignedRole = role || 'subadmin';

        const created = await Admin.create({
            fullName: fullName.trim(),
            misCode: normalizedMisCode,
            email: normalizedEmail,
            phone: phoneResult.value,
            role: assignedRole,
            isActive: isActive === 'true',
            createdBy: req.admin ? req.admin._id : null
        });

        // Land on the list that actually contains the new account.
        // Previously this always redirected to /admin/subadmins, so
        // creating an Administrator dropped you on a page where the new
        // account was nowhere to be seen.
        const isAdminRole = created.role === 'admin';

        setFlash(
            req,
            'success',
            `${isAdminRole ? 'Admin' : 'Sub-Admin'} "${created.fullName}" created successfully.`
        );

        return res.redirect(isAdminRole ? '/admin/allAdmins' : '/admin/subadmins');

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
            .select('fullName name email phone phoneCode misCode role isActive createdAt')
            .sort({ createdAt: -1 })
            .lean();

        // The view needs to know how many admins would be left if one
        // were removed or demoted, so it can disable those buttons
        // rather than offering an action the server will refuse.
        const activeAdminCount = (admins || []).filter((a) => a.isActive).length;

        return res.status(200).render('admin/allAdmins', {
            title: 'All Administrators',
            currentPage: 'allAdmins',
            admins: admins || [],
            admin: req.user || req.admin, // Pass the authenticated session user
            currentAdminId: String(req.admin._id),
            isRootAdmin: req.admin.role === 'admin',
            activeAdminCount
        });

    } catch (error) {
        console.error('[getAllAdmins] Error:', error);
        return res.status(500).redirect('/admin/dashboard');
    }
};


// Render Help / Contact Support Page
// -------------------------------------------------------------
// ADMIN MANAGEMENT ACTIONS (root admin only)
//
// These back the buttons on /admin/allAdmins. Each one re-checks the
// same two invariants server-side, because a disabled button in the UI
// is a courtesy, not a control:
//
//   * You cannot act on your OWN account here. Self-changes go through
//     /admin/:id/edit, which shows the irreversibility warning and ends
//     your session properly. Silently demoting or deleting yourself from
//     a list page would strand you on an admin screen you no longer have
//     the rights to use.
//
//   * You cannot remove, demote, or deactivate the LAST active admin.
//     Only admins can manage admins, so that would leave the portal with
//     nobody able to undo it.
// -------------------------------------------------------------

// Shared precondition check. Returns { ok, admin, error }.
async function loadManageableAdmin(req, { requireNotLast }) {
    const target = await Admin.findById(req.params.id);

    if (!target || target.role !== "admin") {
        return { ok: false, error: "Administrator not found." };
    }

    if (String(target._id) === String(req.session.userId)) {
        return {
            ok: false,
            error:
                "You cannot change your own account from this page. Use Edit Profile, " +
                "which explains what the change affects before applying it."
        };
    }

    if (requireNotLast && target.isActive) {
        const otherActiveAdmins = await Admin.countDocuments({
            _id: { $ne: target._id },
            role: "admin",
            isActive: true
        });

        if (otherActiveAdmins === 0) {
            return {
                ok: false,
                error:
                    "This is the only active Administrator, so it cannot be removed, demoted, " +
                    "or deactivated. Activate another Administrator first."
            };
        }
    }

    return { ok: true, admin: target };
}

/**
 * @desc    Demote an administrator to sub-admin
 * @route   POST /admin/admins/:id/demote
 * @access  Private (Root Admin only)
 */
exports.demoteAdmin = async (req, res) => {
    try {
        const check = await loadManageableAdmin(req, { requireNotLast: true });
        if (!check.ok) {
            setFlash(req, "error", check.error);
            return res.redirect("/admin/allAdmins");
        }

        check.admin.role = "subadmin";
        await check.admin.save();

        setFlash(
            req,
            "success",
            `"${check.admin.fullName}" is now a Sub-Admin.`
        );
        return res.redirect("/admin/subadmins");
    } catch (err) {
        console.error("Error demoting admin:", err);
        setFlash(req, "error", "Could not change that administrator's role.");
        return res.redirect("/admin/allAdmins");
    }
};

/**
 * @desc    Activate or deactivate an administrator
 * @route   POST /admin/admins/:id/status
 * @access  Private (Root Admin only)
 */
exports.toggleAdminStatus = async (req, res) => {
    try {
        const activate = req.body.isActive === "true";

        // Only deactivation can strand the system, so the last-admin
        // rule is applied to that direction only.
        const check = await loadManageableAdmin(req, { requireNotLast: !activate });
        if (!check.ok) {
            setFlash(req, "error", check.error);
            return res.redirect("/admin/allAdmins");
        }

        const target = check.admin;

        if (activate) {
            target.isActive = true;
            // Clear the timestamp so the TTL index stops counting down
            // toward permanent deletion.
            target.inactivatedAt = null;
        } else {
            target.isActive = false;
            if (!target.inactivatedAt) target.inactivatedAt = new Date();
        }

        await target.save();

        setFlash(
            req,
            "success",
            `"${target.fullName}" is now ${activate ? "active" : "inactive"}.` +
                (activate ? "" : " They can no longer sign in.")
        );
        return res.redirect("/admin/allAdmins");
    } catch (err) {
        console.error("Error updating admin status:", err);
        setFlash(req, "error", "Could not update that administrator's status.");
        return res.redirect("/admin/allAdmins");
    }
};

/**
 * @desc    Promote a sub-admin to full administrator
 * @route   POST /admin/subadmins/:id/promote
 * @access  Private (Root Admin only)
 *
 * Deliberately has no "last admin" guard — promoting can only ever
 * increase the number of admins, never strand the system. An inactive
 * sub-admin stays inactive after promotion: changing two things at once
 * would hide the fact that the account still cannot sign in.
 */
exports.promoteSubAdmin = async (req, res) => {
    try {
        const target = await Admin.findOne({ _id: req.params.id, role: "subadmin" });

        if (!target) {
            setFlash(req, "error", "Sub-Admin not found.");
            return res.redirect("/admin/subadmins");
        }

        target.role = "admin";
        await target.save();

        setFlash(
            req,
            "success",
            `"${target.fullName}" is now an Administrator.` +
                (target.isActive
                    ? ""
                    : " Note: the account is still inactive, so they cannot sign in yet.")
        );
        return res.redirect("/admin/allAdmins");
    } catch (err) {
        console.error("Error promoting sub-admin:", err);
        setFlash(req, "error", "Could not promote that sub-admin.");
        return res.redirect("/admin/subadmins");
    }
};

/**
 * @desc    Permanently delete an administrator account
 * @route   POST /admin/admins/:id/delete  (or DELETE /admin/admins/:id)
 * @access  Private (Root Admin only)
 */
exports.deleteAdmin = async (req, res) => {
    try {
        const check = await loadManageableAdmin(req, { requireNotLast: true });
        if (!check.ok) {
            setFlash(req, "error", check.error);
            return res.redirect("/admin/allAdmins");
        }

        const name = check.admin.fullName;
        await Admin.deleteOne({ _id: check.admin._id, role: "admin" });

        setFlash(req, "success", `Administrator "${name}" has been deleted.`);
        return res.redirect("/admin/allAdmins");
    } catch (err) {
        console.error("Error deleting admin:", err);
        setFlash(req, "error", "Could not delete that administrator.");
        return res.redirect("/admin/allAdmins");
    }
};

exports.getHelpPage = (req, res) => {
    res.render("admin/help", {
        currentPage: "help"
    });
};