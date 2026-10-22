use('InternshipTracker');

const christianId = ObjectId("6ad83e07ebc483e1301a16d5");
const alexId = ObjectId("6ad83e07ebc483e1301a16d8");

const tiAppId = ObjectId("6ad84112ebc483e1301a16d6");
const amdAppId = ObjectId("6ad84112ebc483e1301a16d9");
const lmAppId = ObjectId("6ad84112ebc483e1301a16da");

// 1. Reset and Insert Users
db.getCollection('Users').deleteMany({});
db.getCollection('Users').insertMany([
  {
    _id: christianId,
    FirstName: "Christian",
    LastName: "Pumarada",
    Login: "cpumarada",
    Email: "cpuma@ucf.edu",
    Password: "COP4331Password1",
    IsVerified: true,
    Degree: "Master of Science",
    Major: "Computer Engineering",
    GraduationYear: 2028
  },
  {
    _id: alexId,
    FirstName: "Alex",
    LastName: "Rivera",
    Login: "arivera",
    Email: "arivera@ucf.edu",
    Password: "COP4331Password2",
    IsVerified: true,
    Degree: "Bachelor of Science",
    Major: "Computer Science",
    GraduationYear: 2027
  }
]);

// 2. Reset and Insert Applications (UserId -> Users._id)
db.getCollection('Applications').deleteMany({});
db.getCollection('Applications').insertMany([
  {
    _id: tiAppId,
    UserId: christianId,
    Company: "Texas Instruments",
    Role: "Applications Engineering Intern",
    Location: "Dallas, TX",
    Status: "Offer",
    SalaryHourly: 38,
    DateApplied: "2026-09-10",
    JobLink: "https://careers.ti.com/",
    Notes: "DLP team role working with Zynq UltraScale+ FPGA migration.",
    LastUpdated: "2026-10-15"
  },
  {
    _id: amdAppId,
    UserId: christianId,
    Company: "AMD",
    Role: "CPU Post-Silicon Validation Co-op",
    Location: "Austin, TX",
    Status: "Interviewing",
    SalaryHourly: 38,
    DateApplied: "2026-09-22",
    JobLink: "https://careers.amd.com/",
    Notes: "Completed technical interview covering digital logic.",
    LastUpdated: "2026-10-18"
  },
  {
    _id: lmAppId,
    UserId: alexId,
    Company: "Lockheed Martin",
    Role: "Software Engineering Intern",
    Location: "Orlando, FL",
    Status: "Applied",
    SalaryHourly: 31,
    DateApplied: "2026-10-05",
    JobLink: "https://www.lockheedmartinjobs.com/",
    Notes: "Submitted resume through UCF career fair portal.",
    LastUpdated: "2026-10-05"
  }
]);

// 3. Reset and Insert Contacts (UserId -> Users._id, ApplicationId -> Applications._id)
db.getCollection('Contacts').deleteMany({});
db.getCollection('Contacts').insertMany([
  {
    _id: ObjectId("6ad84299ebc483e1301a16d7"),
    UserId: christianId,
    ApplicationId: tiAppId,
    Name: "Sarah Jenkins",
    Role: "University Recruiter",
    Company: "Texas Instruments",
    Email: "sjenkins@ti.com",
    Phone: "214-555-0142",
    NextFollowUp: "2026-10-25"
  },
  {
    _id: ObjectId("6ad84299ebc483e1301a16db"),
    UserId: christianId,
    ApplicationId: amdAppId,
    Name: "Marcus Vance",
    Role: "Silicon Validation Manager",
    Company: "AMD",
    Email: "mvance@amd.com",
    Phone: "512-555-0198",
    NextFollowUp: "2026-10-27"
  },
  {
    _id: ObjectId("6ad84299ebc483e1301a16dc"),
    UserId: alexId,
    ApplicationId: lmAppId,
    Name: "David Miller",
    Role: "Engineering Campus Lead",
    Company: "Lockheed Martin",
    Email: "david.miller@lmco.com",
    Phone: "407-555-0177",
    NextFollowUp: "2026-10-30"
  }
]);

// Verify counts and output
({
  Users: db.getCollection('Users').find({}).toArray(),
  Applications: db.getCollection('Applications').find({}).toArray(),
  Contacts: db.getCollection('Contacts').find({}).toArray()
});