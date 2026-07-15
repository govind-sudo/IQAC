// init/data.js (Part 1)

module.exports = [
  {
    title: "Mr",
    firstName: "Govind",
    middleName: "Singh",
    lastName: "Bhadoriya",
    gender: "male",
    dob: new Date("2004-08-15"),
    bloodGroup: "B+",
    category: "General",
    religion: "Hinduism",
    caste: "Rajput",
    nationality: "Indian",
    state: "Madhya Pradesh",
    district: "Gwalior",
    country: "India",
    city: "Gwalior",

    residesInHostel: true,
    hostelName: "Boys Hostel A",

    email: "govindbhadoriya672@gmail.com",
    parulEmailActive: false,

    enrollmentNo: "24UG040999",
    ugNumber: "24UG040999",

    faculty: "FET",
    institute: "Parul Institute of Engineering & Technology (First Shift)",
    course: "B.Tech",
    program: "Computer Science & Engineering",
    department: "Computer Science & Engineering",
    branch: "CSE",
    specialization: "AIML",

    joiningDate: new Date("2024-08-01"),
    admissionYear: 2024,
    admissionType: "Regular",
    admissionQuota: "General",
    studentStatus: "active",

    phone: "9876543210",
    whatsapp: "9876543210",
    alternateEmail: "govind.personal@gmail.com",

    emergencyContact: {
      name: "Rakesh Bhadoriya",
      phone: "9876500001",
    },

    father: {
      name: "Rakesh Singh Bhadoriya",
      phone: "9876500001",
      email: "rakesh@gmail.com",
    },

    mother: {
      name: "Sunita Bhadoriya",
      phone: "9876500002",
      email: "sunita@gmail.com",
    },

    presentAddress: {
      address1: "Boys Hostel A, Room 205",
      address2: "",
      address3: "",
      city: "Vadodara",
      district: "Waghodia",
      state: "Gujarat",
      country: "India",
      pincode: "391760",
    },

    permanentAddress: {
      address1: "Shiv Nagar",
      address2: "",
      address3: "",
      city: "Gwalior",
      district: "Gwalior",
      state: "Madhya Pradesh",
      country: "India",
      pincode: "474001",
    },

    education: {
      tenth: {
        schoolName: "Kendriya Vidyalaya Gwalior",
        percentage: 89.6,
        marksheet: "uploads/10th/govind.pdf",
      },
      twelfth: {
        schoolName: "Kendriya Vidyalaya Gwalior",
        percentage: 86.2,
        marksheet: "uploads/12th/govind.pdf",
      },
      diploma: undefined,
    },

    documents: {
      abcIdProof: "uploads/docs/govind_abc.pdf",
      casteProof: "uploads/docs/govind_caste.pdf",
      nationalityProof: "uploads/docs/govind_nationality.pdf",
      leavingCertificate: "uploads/docs/govind_lc.pdf",
      aadhaarNumber: "458712369874",
    },

    abcId: "ABC24000001",

    role: "student",
    isActive: true,
    profileStatus: "verified",
  },
  {
    title: "Mr",
    firstName: "Raman",
    middleName: "",
    lastName: "Kumar",
    gender: "male",
    dob: new Date("2006-05-14"),
    bloodGroup: "O+",
    category: "General",
    religion: "Hinduism",
    caste: "Maratha",
    nationality: "Indian",
    state: "Maharashtra",
    district: "Nashik",
    country: "India",
    city: "Nashik",

    residesInHostel: true,
    hostelName: "Boys Hostel B",

    email: "raghav7434@gmail.com",
    parulEmailActive: false,
    enrollmentNo: "24UG046750",
    ugNumber: "24UG046750",

    faculty: "FET",
    institute: "Parul Institute of Engineering & Technology (First Shift)",
    course: "B.Tech",
    program: "Computer Science & Engineering",
    department: "Computer Science & Engineering",
    branch: "CSE",
    specialization: "AIML",

    joiningDate: new Date("2024-08-01"),
    admissionYear: 2024,
    admissionType: "Regular",
    admissionQuota: "General",
    studentStatus: "active",

    phone: "9876543220",
    whatsapp: "9876543220",

    emergencyContact: {
      name: "Pravin Chavan",
      phone: "9876500111",
    },

    father: {
      name: "Pravin Chavan",
      phone: "9876500111",
      email: "pravin@gmail.com",
    },

    mother: {
      name: "Sunita Chavan",
      phone: "9876500112",
      email: "sunita@gmail.com",
    },

    presentAddress: {
      address1: "Boys Hostel B Room 210",
      city: "Vadodara",
      district: "Waghodia",
      state: "Gujarat",
      country: "India",
      pincode: "391760",
    },

    permanentAddress: {
      address1: "Gangapur Road",
      city: "Nashik",
      district: "Nashik",
      state: "Maharashtra",
      country: "India",
      pincode: "422013",
    },

    education: {
      tenth: {
        schoolName: "St Xavier School",
        percentage: 90,
        marksheet: "uploads/10th/yash.pdf",
      },
      twelfth: {
        schoolName: "St Xavier School",
        percentage: 88,
        marksheet: "uploads/12th/yash.pdf",
      },
    },

    documents: {
      abcIdProof: "uploads/docs/yashabc.pdf",
      casteProof: "uploads/docs/yashcaste.pdf",
      nationalityProof: "uploads/docs/yashnat.pdf",
      leavingCertificate: "uploads/docs/yashlc.pdf",
      aadhaarNumber: "456789012350",
    },

    abcId: "ABC24000002",

    role: "student",
    isActive: true,
    profileStatus: "verified",
  },
  {
    title: "Mr",
    firstName: "Yash",
    middleName: "Pravin",
    lastName: "Chavan",
    gender: "male",
    dob: new Date("2006-05-14"),
    bloodGroup: "O+",
    category: "General",
    religion: "Hinduism",
    caste: "Maratha",
    nationality: "Indian",
    state: "Maharashtra",
    district: "Nashik",
    country: "India",
    city: "Nashik",

    residesInHostel: true,
    hostelName: "Boys Hostel B",

    email: "yash.chavan24@example.com",
    parulEmailActive: false,
    enrollmentNo: "24UG040120",
    ugNumber: "24UG040120",
    // NOTE: this record previously duplicated Raman Kumar's phone, abcId,
    // aadhaar, and parent details (all unique-indexed) — fixed below so
    // seeding doesn't throw an E11000 duplicate key error.

    faculty: "FET",
    institute: "Parul Institute of Engineering & Technology (First Shift)",
    course: "B.Tech",
    program: "Computer Science & Engineering",
    department: "Computer Science & Engineering",
    branch: "CSE",
    specialization: "AIML",

    joiningDate: new Date("2024-08-01"),
    admissionYear: 2024,
    admissionType: "Regular",
    admissionQuota: "General",
    studentStatus: "active",

    phone: "9876543230",
    whatsapp: "9876543230",

    emergencyContact: {
      name: "Suresh Chavan",
      phone: "9876500115",
    },

    father: {
      name: "Suresh Chavan",
      phone: "9876500115",
      email: "sureshchavan@gmail.com",
    },

    mother: {
      name: "Meera Chavan",
      phone: "9876500116",
      email: "meerachavan@gmail.com",
    },

    presentAddress: {
      address1: "Boys Hostel B Room 211",
      city: "Vadodara",
      district: "Waghodia",
      state: "Gujarat",
      country: "India",
      pincode: "391760",
    },

    permanentAddress: {
      address1: "College Road",
      city: "Nashik",
      district: "Nashik",
      state: "Maharashtra",
      country: "India",
      pincode: "422005",
    },

    education: {
      tenth: {
        schoolName: "St Xavier School",
        percentage: 90,
        marksheet: "uploads/10th/yash.pdf",
      },
      twelfth: {
        schoolName: "St Xavier School",
        percentage: 88,
        marksheet: "uploads/12th/yash.pdf",
      },
    },

    documents: {
      abcIdProof: "uploads/docs/yashabc.pdf",
      casteProof: "uploads/docs/yashcaste.pdf",
      nationalityProof: "uploads/docs/yashnat.pdf",
      leavingCertificate: "uploads/docs/yashlc.pdf",
      aadhaarNumber: "456789012351",
    },

    abcId: "ABC24000004",

    role: "student",
    isActive: true,
    profileStatus: "verified",
  },

  {
    title: "Ms",
    firstName: "Neha",
    middleName: "Ashok",
    lastName: "Iyer",
    gender: "female",
    dob: new Date("2006-09-02"),
    bloodGroup: "A+",
    category: "General",
    religion: "Hinduism",
    caste: "Iyer",
    nationality: "Indian",
    state: "Tamil Nadu",
    district: "Chennai",
    country: "India",
    city: "Chennai",

    residesInHostel: true,
    hostelName: "Girls Hostel A",

    email: "neha.iyer24@example.com",
    enrollmentNo: "24UG040121",
    ugNumber: "24UG040121",

    faculty: "FET",
    institute: "Parul Institute of Engineering & Technology (First Shift)",
    course: "B.Tech",
    program: "Computer Science & Engineering",
    department: "Computer Science & Engineering",
    branch: "CSE",
    specialization: "AIRO",

    joiningDate: new Date("2024-08-01"),
    admissionYear: 2024,
    admissionType: "Regular",
    admissionQuota: "General",

    phone: "9876543221",
    whatsapp: "9876543221",

    emergencyContact: { name: "Ashok Iyer", phone: "9876500113" },
    father: { name: "Ashok Iyer", phone: "9876500113", email: "ashok@gmail.com" },
    mother: { name: "Radha Iyer", phone: "9876500114", email: "radha@gmail.com" },

    presentAddress: {
      address1: "Girls Hostel A",
      city: "Vadodara",
      district: "Waghodia",
      state: "Gujarat",
      country: "India",
      pincode: "391760",
    },

    permanentAddress: {
      address1: "Besant Nagar",
      city: "Chennai",
      district: "Chennai",
      state: "Tamil Nadu",
      country: "India",
      pincode: "600090",
    },

    education: {
      tenth: {
        schoolName: "DAV Chennai",
        percentage: 94,
        marksheet: "uploads/10th/neha.pdf",
      },
      twelfth: {
        schoolName: "DAV Chennai",
        percentage: 91,
        marksheet: "uploads/12th/neha.pdf",
      },
    },

    documents: {
      aadhaarNumber: "567890123460",
    },

    abcId: "ABC24000003",

    role: "student",
    isActive: true,
    profileStatus: "verified",
  },

  {
    title: "Mr",
    firstName: "Farhan",
    middleName: "",
    lastName: "Sheikh",
    gender: "male",
    dob: new Date("2005-12-20"),
    bloodGroup: "B+",
    category: "OBC",
    religion: "Islam",
    caste: "Sheikh",
    nationality: "Indian",
    state: "Madhya Pradesh",
    district: "Bhopal",
    country: "India",
    city: "Bhopal",

    residesInHostel: false,

    email: "farhan.sheikh24@example.com",
    enrollmentNo: "24UG040122",
    ugNumber: "24UG040122",

    faculty: "FET",
    institute: "Parul Institute of Engineering & Technology (First Shift)",
    course: "B.Tech",
    program: "Computer Science & Engineering",
    department: "Computer Science & Engineering",
    branch: "CSE",
    specialization: "AIML",

    joiningDate: new Date("2024-08-05"),
    admissionYear: 2024,
    admissionType: "Lateral Entry",
    admissionQuota: "Other",

    phone: "9876543222",
    whatsapp: "9876543222",

    emergencyContact: {
      name: "Iqbal Sheikh",
      phone: "9876500115",
    },

    father: {
      name: "Iqbal Sheikh",
      phone: "9876500115",
      email: "iqbal@gmail.com",
    },

    mother: {
      name: "Nasreen Sheikh",
      phone: "9876500116",
      email: "nasreen@gmail.com",
    },

    presentAddress: {
      address1: "Atladara",
      city: "Vadodara",
      district: "Vadodara",
      state: "Gujarat",
      country: "India",
      pincode: "390012",
    },

    permanentAddress: {
      address1: "MP Nagar",
      city: "Bhopal",
      district: "Bhopal",
      state: "Madhya Pradesh",
      country: "India",
      pincode: "462011",
    },

    education: {
      diploma: {
        schoolName: "Govt Polytechnic Bhopal",
        percentage: 83,
        marksheet: "uploads/diploma/farhan.pdf",
      },
    },

    documents: {
      aadhaarNumber: "678901234570",
    },

    role: "student",
    isActive: true,
    profileStatus: "verified",
  },

  {
    title: "Ms",
    firstName: "Ritika",
    middleName: "Anil",
    lastName: "Bansal",
    gender: "female",
    dob: new Date("2006-02-11"),
    bloodGroup: "AB+",
    category: "General",
    religion: "Hinduism",
    caste: "Bansal",
    nationality: "Indian",
    state: "Delhi",
    district: "West Delhi",
    country: "India",
    city: "New Delhi",

    residesInHostel: true,
    hostelName: "Girls Hostel C",

    email: "ritika.bansal24@example.com",
    enrollmentNo: "24UG040123",
    ugNumber: "24UG040123",

    faculty: "FET",
    institute: "Parul Institute of Engineering & Technology (First Shift)",
    course: "B.Tech",
    program: "Computer Science & Engineering",
    department: "Computer Science & Engineering",
    branch: "CSE",
    specialization: "AIRO",

    joiningDate: new Date("2024-08-01"),
    admissionYear: 2024,
    admissionType: "Regular",
    admissionQuota: "General",

    phone: "9876543223",
    whatsapp: "9876543223",

    emergencyContact: {
      name: "Anil Bansal",
      phone: "9876500117",
    },

    father: {
      name: "Anil Bansal",
      phone: "9876500117",
      email: "anil@gmail.com",
    },

    mother: {
      name: "Kavita Bansal",
      phone: "9876500118",
      email: "kavita@gmail.com",
    },

    presentAddress: {
      address1: "Girls Hostel C",
      city: "Vadodara",
      district: "Waghodia",
      state: "Gujarat",
      country: "India",
      pincode: "391760",
    },

    permanentAddress: {
      address1: "Rajouri Garden",
      city: "New Delhi",
      district: "West Delhi",
      state: "Delhi",
      country: "India",
      pincode: "110027",
    },

    education: {
      tenth: {
        schoolName: "Modern School",
        percentage: 93,
        marksheet: "uploads/10th/ritika.pdf",
      },
      twelfth: {
        schoolName: "Modern School",
        percentage: 89,
        marksheet: "uploads/12th/ritika.pdf",
      },
    },

    documents: {
      aadhaarNumber: "789012345671",
    },

    abcId: "ABC24000005",

    role: "student",
    isActive: true,
    profileStatus: "verified",
  },
{
  title: "Mr",
  firstName: "Aditya",
  middleName: "Rajesh",
  lastName: "Patel",
  gender: "male",
  dob: new Date("2005-11-18"),
  bloodGroup: "A+",
  category: "OBC",
  religion: "Hinduism",
  caste: "Patel",
  nationality: "Indian",
  state: "Gujarat",
  district: "Anand",
  country: "India",
  city: "Anand",

  residesInHostel: false,

  email: "aditya.patel24@example.com",
  parulEmailActive: false,
  enrollmentNo: "24UG040124",
  ugNumber: "24UG040124",

  faculty: "FET",
  institute: "Parul Institute of Engineering & Technology (First Shift)",
  course: "B.Tech",
  program: "Computer Science & Engineering",
  department: "Computer Science & Engineering",
  branch: "CSE",
  specialization: "AIML",

  joiningDate: new Date("2024-08-01"),
  admissionYear: 2024,
  admissionType: "Regular",
  admissionQuota: "General",
  studentStatus: "active",

  phone: "9876543224",
  whatsapp: "9876543224",

  emergencyContact: {
    name: "Rajesh Patel",
    phone: "9876500124",
  },

  father: {
    name: "Rajesh Patel",
    phone: "9876500124",
    email: "rajesh@gmail.com",
  },

  mother: {
    name: "Meena Patel",
    phone: "9876500125",
    email: "meena@gmail.com",
  },

  presentAddress: {
    address1: "Parul PG",
    city: "Vadodara",
    district: "Vadodara",
    state: "Gujarat",
    country: "India",
    pincode: "390019",
  },

  permanentAddress: {
    address1: "Vallabh Vidyanagar",
    city: "Anand",
    district: "Anand",
    state: "Gujarat",
    country: "India",
    pincode: "388120",
  },

  education: {
    tenth: {
      schoolName: "St Mary's School",
      percentage: 87,
      marksheet: "uploads/10th/aditya.pdf",
    },
    twelfth: {
      schoolName: "St Mary's School",
      percentage: 84,
      marksheet: "uploads/12th/aditya.pdf",
    },
  },

  documents: {
    aadhaarNumber: "789654123111",
  },

  abcId: "ABC24000006",

  role: "student",
  isActive: true,
  profileStatus: "verified",
},

{
  title: "Ms",
  firstName: "Priya",
  middleName: "Mahesh",
  lastName: "Sharma",
  gender: "female",
  dob: new Date("2006-01-09"),
  bloodGroup: "O-",
  category: "EWS",
  religion: "Hinduism",
  caste: "Sharma",
  nationality: "Indian",
  state: "Rajasthan",
  district: "Jaipur",
  country: "India",
  city: "Jaipur",

  residesInHostel: true,
  hostelName: "Girls Hostel B",

  email: "priya.sharma24@example.com",
  enrollmentNo: "24UG040125",
  ugNumber: "24UG040125",

  faculty: "FET",
  institute: "Parul Institute of Engineering & Technology (First Shift)",
  course: "B.Tech",
  program: "Computer Science & Engineering",
  department: "Computer Science &Engineering",
  branch: "CSE",
  specialization: "AIRO",

  joiningDate: new Date("2024-08-01"),
  admissionYear: 2024,
  admissionType: "Regular",
  admissionQuota: "General",

  studentStatus: "active",

  phone: "9876543225",
  whatsapp: "9876543225",

  emergencyContact: {
    name: "Mahesh Sharma",
    phone: "9876500126",
  },

  father: {
    name: "Mahesh Sharma",
    phone: "9876500126",
    email: "mahesh@gmail.com",
  },

  mother: {
    name: "Sangeeta Sharma",
    phone: "9876500127",
    email: "sangeeta@gmail.com",
  },

  presentAddress: {
    address1: "Girls Hostel B Room 108",
    city: "Vadodara",
    district: "Waghodia",
    state: "Gujarat",
    country: "India",
    pincode: "391760",
  },

  permanentAddress: {
    address1: "Vaishali Nagar",
    city: "Jaipur",
    district: "Jaipur",
    state: "Rajasthan",
    country: "India",
    pincode: "302021",
  },

  education: {
    tenth: {
      schoolName: "Ryan International",
      percentage: 94,
      marksheet: "uploads/10th/priya.pdf",
    },
    twelfth: {
      schoolName: "Ryan International",
      percentage: 92,
      marksheet: "uploads/12th/priya.pdf",
    },
  },

  documents: {
    aadhaarNumber: "789654123112",
  },

  abcId: "ABC24000007",

  role: "student",
  isActive: true,
  profileStatus: "verified",
},

{
  title: "Mr",
  firstName: "Karan",
  middleName: "Suresh",
  lastName: "Verma",
  gender: "male",
  dob: new Date("2005-07-28"),
  bloodGroup: "AB-",
  category: "SC",
  religion: "Hinduism",
  caste: "Verma",
  nationality: "Indian",
  state: "Uttar Pradesh",
  district: "Lucknow",
  country: "India",
  city: "Lucknow",

  residesInHostel: true,
  hostelName: "Boys Hostel C",

  email: "karan.verma24@example.com",
  enrollmentNo: "24UG040126",
  ugNumber: "24UG040126",

  faculty: "FET",
  institute: "Parul Institute of Engineering & Technology (First Shift)",
  course: "B.Tech",
  program: "Computer Science & Engineering",
  department: "Computer Science & Engineering",
  branch: "CSE",
  specialization: "AIML",

  joiningDate: new Date("2024-08-01"),
  admissionYear: 2024,
  admissionType: "Regular",
  admissionQuota: "Sports",

  studentStatus: "active",

  phone: "9876543226",
  whatsapp: "9876543226",

  emergencyContact: {
    name: "Suresh Verma",
    phone: "9876500128",
  },

  father: {
    name: "Suresh Verma",
    phone: "9876500128",
    email: "suresh@gmail.com",
  },

  mother: {
    name: "Anita Verma",
    phone: "9876500129",
    email: "anita@gmail.com",
  },

  presentAddress: {
    address1: "Boys Hostel C",
    city: "Vadodara",
    district: "Waghodia",
    state: "Gujarat",
    country: "India",
    pincode: "391760",
  },

  permanentAddress: {
    address1: "Aliganj",
    city: "Lucknow",
    district: "Lucknow",
    state: "Uttar Pradesh",
    country: "India",
    pincode: "226024",
  },

  education: {
    tenth: {
      schoolName: "City Montessori School",
      percentage: 81,
      marksheet: "uploads/10th/karan.pdf",
    },
    twelfth: {
      schoolName: "City Montessori School",
      percentage: 83,
      marksheet: "uploads/12th/karan.pdf",
    },
  },

  documents: {
    aadhaarNumber: "789654123113",
  },

  abcId: "ABC24000008",

  role: "student",
  isActive: true,
  profileStatus: "verified",
},

{
  title: "Ms",
  firstName: "Ayesha",
  middleName: "Salim",
  lastName: "Khan",
  gender: "female",
  dob: new Date("2006-03-17"),
  bloodGroup: "B-",
  category: "General",
  religion: "Islam",
  caste: "Khan",
  nationality: "Indian",
  state: "Maharashtra",
  district: "Pune",
  country: "India",
  city: "Pune",

  residesInHostel: false,

  email: "ayesha.khan24@example.com",
  enrollmentNo: "24UG040127",
  ugNumber: "24UG040127",

  faculty: "FET",
  institute: "Parul Institute of Engineering & Technology (First Shift)",
  course: "B.Tech",
  program: "Computer Science & Engineering",
  department: "Computer Science & Engineering",
  branch: "CSE",
  specialization: "AIRO",

  joiningDate: new Date("2024-08-01"),
  admissionYear: 2024,
  admissionType: "Regular",
  admissionQuota: "Management",

  studentStatus: "active",

  phone: "9876543227",
  whatsapp: "9876543227",

  emergencyContact: {
    name: "Salim Khan",
    phone: "9876500130",
  },

  father: {
    name: "Salim Khan",
    phone: "9876500130",
    email: "salim@gmail.com",
  },

  mother: {
    name: "Shabana Khan",
    phone: "9876500131",
    email: "shabana@gmail.com",
  },

  presentAddress: {
    address1: "Atladara",
    city: "Vadodara",
    district: "Vadodara",
    state: "Gujarat",
    country: "India",
    pincode: "390012",
  },

  permanentAddress: {
    address1: "Camp",
    city: "Pune",
    district: "Pune",
    state: "Maharashtra",
    country: "India",
    pincode: "411001",
  },

  education: {
    tenth: {
      schoolName: "Army Public School",
      percentage: 90,
      marksheet: "uploads/10th/ayesha.pdf",
    },
    twelfth: {
      schoolName: "Army Public School",
      percentage: 88,
      marksheet: "uploads/12th/ayesha.pdf",
    },
  },

  documents: {
    aadhaarNumber: "789654123114",
  },

  abcId: "ABC24000009",

  role: "student",
  isActive: true,
  profileStatus: "verified",
},

{
  title: "Mr",
  firstName: "Rohit",
  middleName: "Vijay",
  lastName: "Nair",
  gender: "male",
  dob: new Date("2005-04-06"),
  bloodGroup: "O+",
  category: "ST",
  religion: "Hinduism",
  caste: "Nair",
  nationality: "Indian",
  state: "Kerala",
  district: "Kochi",
  country: "India",
  city: "Kochi",

  residesInHostel: true,
  hostelName: "Boys Hostel D",

  email: "rohit.nair24@example.com",
  enrollmentNo: "24UG040128",
  ugNumber: "24UG040128",

  faculty: "FET",
  institute: "Parul Institute of Engineering & Technology (First Shift)",
  course: "B.Tech",
  program: "Computer Science & Engineering",
  department: "Computer Science & Engineering",
  branch: "CSE",
  specialization: "AIML",

  joiningDate: new Date("2024-08-01"),
  admissionYear: 2024,
  admissionType: "Transfer",
  admissionQuota: "Other",

  studentStatus: "active",

  phone: "9876543228",
  whatsapp: "9876543228",

  emergencyContact: {
    name: "Vijay Nair",
    phone: "9876500132",
  },

  father: {
    name: "Vijay Nair",
    phone: "9876500132",
    email: "vijay@gmail.com",
  },

  mother: {
    name: "Lakshmi Nair",
    phone: "9876500133",
    email: "lakshmi@gmail.com",
  },

  presentAddress: {
    address1: "Boys Hostel D",
    city: "Vadodara",
    district: "Waghodia",
    state: "Gujarat",
    country: "India",
    pincode: "391760",
  },

  permanentAddress: {
    address1: "MG Road",
    city: "Kochi",
    district: "Ernakulam",
    state: "Kerala",
    country: "India",
    pincode: "682016",
  },

  education: {
    tenth: {
      schoolName: "Kendriya Vidyalaya Kochi",
      percentage: 86,
      marksheet: "uploads/10th/rohit.pdf",
    },
    twelfth: {
      schoolName: "Kendriya Vidyalaya Kochi",
      percentage: 84,
      marksheet: "uploads/12th/rohit.pdf",
    },
  },

  documents: {
    aadhaarNumber: "789654123115",
  },

  abcId: "ABC24000010",

  role: "student",
  isActive: true,
  profileStatus: "verified",
},

// ============================================================
// INTERNATIONAL STUDENTS (nationality: "Other")
// Mirrors what the live registration form actually submits — the
// nationality <select> only ever sends "Indian" or "Other" (see
// register.ejs), so we use "Other" literally rather than a country name.
// The actual home country lives in permanentAddress.country / state /
// district, same as any "Other" country selection on the address blocks.
// ============================================================
{
  title: "Ms",
  firstName: "Emily",
  middleName: "Grace",
  lastName: "Carter",
  gender: "female",
  dob: new Date("2005-09-22"),
  bloodGroup: "A+",
  category: "General",
  religion: "Christianity",
  nationality: "Other",
  state: "California",
  district: "Los Angeles",
  country: "United States",
  city: "Los Angeles",

  residesInHostel: true,
  hostelName: "Girls Hostel A",

  email: "emily.carter24@example.com",
  enrollmentNo: "24UG040129",
  ugNumber: "24UG040129",

  faculty: "FET",
  institute: "Parul Institute of Engineering & Technology (First Shift)",
  course: "B.Tech",
  program: "Computer Science & Engineering",
  department: "Computer Science & Engineering",
  branch: "CSE",
  specialization: "AIML",

  joiningDate: new Date("2024-08-01"),
  admissionYear: 2024,
  admissionType: "Regular",
  admissionQuota: "Other",

  studentStatus: "active",

  phone: "9998887701",
  whatsapp: "9998887701",
  alternateEmail: "emily.grace.carter@gmail.com",

  emergencyContact: {
    name: "Robert Carter",
    phone: "12135550134",
  },

  father: {
    name: "Robert Carter",
    phone: "12135550134",
    email: "robert.carter@gmail.com",
  },

  mother: {
    name: "Linda Carter",
    phone: "12135550135",
    email: "linda.carter@gmail.com",
  },

  presentAddress: {
    address1: "Girls Hostel A, Room 112",
    city: "Vadodara",
    district: "Waghodia",
    state: "Gujarat",
    country: "India",
    pincode: "391760",
  },

  permanentAddress: {
    address1: "4521 Sunset Boulevard",
    city: "Los Angeles",
    district: "Los Angeles County",
    state: "California",
    country: "United States",
    pincode: "90027",
  },

  education: {
    tenth: {
      schoolName: "Beverly Hills High School",
      percentage: 91,
      marksheet: "uploads/10th/emily.pdf",
    },
    twelfth: {
      schoolName: "Beverly Hills High School",
      percentage: 89,
      marksheet: "uploads/12th/emily.pdf",
    },
  },

  documents: {
    nationalityProof: "uploads/docs/emily_nationality.pdf",
    aoLevelCertificate: "uploads/docs/emily_aolevel.pdf",
    puOfferLetter: "uploads/docs/emily_offerletter.pdf",
    passport: "uploads/docs/emily_passport.pdf",
  },

  role: "student",
  isActive: true,
  profileStatus: "verified",
},

{
  title: "Mr",
  firstName: "Daniel",
  middleName: "Chukwuemeka",
  lastName: "Okafor",
  gender: "male",
  dob: new Date("2005-02-11"),
  bloodGroup: "O+",
  category: "General",
  religion: "Christianity",
  nationality: "Other",
  state: "Lagos",
  district: "Lagos Mainland",
  country: "Nigeria",
  city: "Lagos",

  residesInHostel: true,
  hostelName: "Boys Hostel A",

  email: "daniel.okafor24@example.com",
  enrollmentNo: "24UG040130",
  ugNumber: "24UG040130",

  faculty: "FET",
  institute: "Parul Institute of Engineering & Technology (First Shift)",
  course: "B.Tech",
  program: "Computer Science & Engineering",
  department: "Computer Science & Engineering",
  branch: "CSE",
  specialization: "AIRO",

  joiningDate: new Date("2024-08-01"),
  admissionYear: 2024,
  admissionType: "Regular",
  admissionQuota: "Other",

  studentStatus: "active",

  phone: "9998887702",
  whatsapp: "9998887702",

  emergencyContact: {
    name: "Chidi Okafor",
    phone: "2348030001234",
  },

  father: {
    name: "Chidi Okafor",
    phone: "2348030001234",
    email: "chidi.okafor@gmail.com",
  },

  mother: {
    name: "Ngozi Okafor",
    phone: "2348030001235",
    email: "ngozi.okafor@gmail.com",
  },

  presentAddress: {
    address1: "Boys Hostel A, Room 214",
    city: "Vadodara",
    district: "Waghodia",
    state: "Gujarat",
    country: "India",
    pincode: "391760",
  },

  permanentAddress: {
    address1: "17 Marina Road",
    city: "Lagos",
    district: "Lagos Mainland",
    state: "Lagos",
    country: "Nigeria",
    pincode: "100001",
  },

  education: {
    tenth: {
      schoolName: "Corona Secondary School",
      percentage: 85,
      marksheet: "uploads/10th/daniel.pdf",
    },
    twelfth: {
      schoolName: "Corona Secondary School",
      percentage: 82,
      marksheet: "uploads/12th/daniel.pdf",
    },
  },

  documents: {
    nationalityProof: "uploads/docs/daniel_nationality.pdf",
    aoLevelCertificate: "uploads/docs/daniel_aolevel.pdf",
    puOfferLetter: "uploads/docs/daniel_offerletter.pdf",
    passport: "uploads/docs/daniel_passport.pdf",
  },

  role: "student",
  isActive: true,
  profileStatus: "verified",
},

{
  title: "Ms",
  firstName: "Sabina",
  middleName: "",
  lastName: "Gurung",
  gender: "female",
  dob: new Date("2005-12-03"),
  bloodGroup: "B+",
  category: "General",
  religion: "Hinduism",
  nationality: "Other",
  state: "Bagmati",
  district: "Kathmandu",
  country: "Nepal",
  city: "Kathmandu",

  residesInHostel: true,
  hostelName: "Girls Hostel B",

  email: "sabina.gurung24@example.com",
  enrollmentNo: "24UG040131",
  ugNumber: "24UG040131",

  faculty: "FET",
  institute: "Parul Institute of Engineering & Technology (First Shift)",
  course: "B.Tech",
  program: "Computer Science & Engineering",
  department: "Computer Science & Engineering",
  branch: "CSE",
  specialization: "AIML",

  joiningDate: new Date("2024-08-01"),
  admissionYear: 2024,
  admissionType: "Regular",
  admissionQuota: "Other",

  studentStatus: "active",

  phone: "9998887703",
  whatsapp: "9998887703",

  emergencyContact: {
    name: "Prakash Gurung",
    phone: "9779841234567",
  },

  father: {
    name: "Prakash Gurung",
    phone: "9779841234567",
    email: "prakash.gurung@gmail.com",
  },

  mother: {
    name: "Sunita Gurung",
    phone: "9779841234568",
    email: "sunita.gurung@gmail.com",
  },

  presentAddress: {
    address1: "Girls Hostel B, Room 118",
    city: "Vadodara",
    district: "Waghodia",
    state: "Gujarat",
    country: "India",
    pincode: "391760",
  },

  permanentAddress: {
    address1: "Baneshwor Marg",
    city: "Kathmandu",
    district: "Kathmandu",
    state: "Bagmati",
    country: "Nepal",
    pincode: "44600",
  },

  education: {
    tenth: {
      schoolName: "Rato Bangala School",
      percentage: 88,
      marksheet: "uploads/10th/sabina.pdf",
    },
    diploma: {
      schoolName: "Kathmandu Polytechnic Institute",
      percentage: 80,
      marksheet: "uploads/diploma/sabina.pdf",
    },
  },

  documents: {
    nationalityProof: "uploads/docs/sabina_nationality.pdf",
    aoLevelCertificate: "uploads/docs/sabina_aolevel.pdf",
    puOfferLetter: "uploads/docs/sabina_offerletter.pdf",
    passport: "uploads/docs/sabina_passport.pdf",
  },

  role: "student",
  isActive: true,
  profileStatus: "verified",
}
];