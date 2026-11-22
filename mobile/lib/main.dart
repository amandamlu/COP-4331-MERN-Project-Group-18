
import 'package:flutter/material.dart'; //access flutter matterials 
import 'package:http/http.dart' as http; //enable http communication
import 'dart:convert'; //conver dart to json, json to dart

void main() {
  runApp(const MyApp());
}

//initialize the app 
class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SPLINT',
      theme: ThemeData(
        useMaterial3: true,
      ),
      home: const LoginPage(),
    );
  }
}

//login
class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState(); //login changes and updates 
}
class _LoginPageState extends State<LoginPage> {
  final TextEditingController _loginController =TextEditingController();//communicate with text fields 
  final TextEditingController _passwordController =TextEditingController();

  String _errorMessage='';
  bool _isLoading = false;
  //asynch so Flutter doesn't freeze the application while waiting for backend responses 
  Future<void> _login() async {
    setState(() {
      _isLoading = true;//is error message being processed 
      _errorMessage = '';
    });

    //send http post request as login to backend 
    try { 
      final response = await http.post(
        Uri.parse('https://lamp.alugo.org/api/auth/login'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({ //whats being sent to backend 
          'login': _loginController.text.trim(),
          'password': _passwordController.text,
        }),
      );

      //just prints i used for debug, not critical code
      debugPrint('LOGIN STATUS: ${response.statusCode}'); 
      debugPrint('LOGIN BODY: ${response.body}');

      if (response.statusCode ==200) {
        final data = jsonDecode(response.body);//decode response from JSON to Dart 
        final user = data['user']; //retrieves the user information 

        if (data['error'] == null &&
            data['token'] is String &&
            user is Map &&
            user['FirstName'] != null &&
            user['LastName'] != null) {
          if (!mounted) return;
          
          //Navigate to the Dashboard with the info 
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => DashboardPage(
                firstName: user['FirstName'].toString(),
                lastName: user['LastName'].toString(),
              ),
            ),
          );
        } else {
          setState(() {
            _errorMessage =
                data['error']?.toString() ?? 'Login failed.';
          });
        }
      } else {
        final data = jsonDecode(response.body);

        setState(() {
          _errorMessage = data is Map
              ? (data['error'] ?? 'Login failed. Please try again.')
                  .toString()
              : 'Login failed. Please try again.';
        });
      }
    } catch (e, stackTrace) {
      debugPrint('LOGIN EXCEPTION: $e'); //to see the exact error 
      debugPrint('STACK TRACE: $stackTrace');

      if (mounted) {
        setState(() {
          _errorMessage =
              'Error, check the debug console.';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  //builds the UI
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              //title
              const Text(
                'Login',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 40),

              //login box
              TextField(
                controller: _loginController,
                decoration: const InputDecoration(
                  labelText: 'Login Name',
                  border: OutlineInputBorder(),
                ),
              ),

              const SizedBox(height: 16),

              //password box
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(),
                ),
              ),

              const SizedBox(height: 24),
              
              //submit button
              ElevatedButton(
                onPressed: _isLoading ? null : _login,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isLoading
                    ? const CircularProgressIndicator()
                    : const Text(
                        'Login',
                        style: TextStyle(fontSize: 16),
                      ),
              ),

              const SizedBox(height: 16),

              if (_errorMessage.isNotEmpty)
                Text(
                  _errorMessage,
                  style: const TextStyle(
                    color: Colors.red,
                    fontSize: 14,
                  ),
                  textAlign: TextAlign.center,
                ),

              const SizedBox(height: 16),

              //button to navigate to register page 
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text("Don't have an account? "),
                  TextButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) =>
                              const RegisterPage(),
                        ),
                      );
                    },
                    child: const Text('Create Account'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _loginController.dispose();
    _passwordController.dispose();
    super.dispose();
  }
}

//register
class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}
class _RegisterPageState extends State<RegisterPage> {
  //fields on the register form 
  final TextEditingController _firstNameController =TextEditingController();
  final TextEditingController _lastNameController =TextEditingController();
  final TextEditingController _loginController =TextEditingController();
  final TextEditingController _emailController =TextEditingController();
  final TextEditingController _passwordController=TextEditingController();
  final TextEditingController _confirmPasswordController =TextEditingController();

  //validate registration form 
  final _formKey = GlobalKey<FormState>();

  String _errorMessage = '';
  String _successMessage = '';
  bool _isLoading = false;

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    //check password 
    if (_passwordController.text !=
        _confirmPasswordController.text) {
      setState(() {
        _errorMessage = 'Passwords do not match.';
        _successMessage = '';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = '';
      _successMessage = '';
    });
    
    //post request to resgister 
    try {
      final response = await http.post(
        Uri.parse('https://lamp.alugo.org/api/auth/register'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'firstName': _firstNameController.text.trim(),
          'lastName': _lastNameController.text.trim(),
          'login': _loginController.text.trim(),
          'email': _emailController.text.trim(),
          'password': _passwordController.text,
          'degree': '',
          'major': '',
        }),
      );

      debugPrint('REGISTER STATUS: ${response.statusCode}');
      debugPrint('REGISTER BODY: ${response.body}');

      final data = jsonDecode(response.body);

      if (!mounted) return;

      if (response.statusCode >= 200 &&
          response.statusCode < 300) {
        setState(() {
          _successMessage = 'Account created';
          _errorMessage = '';
        });
      } else {
        setState(() {
          _errorMessage = data is Map
              ? (data['error'] ?? 'Registration failed.').toString()
              : 'Registration failed.';
          _successMessage = '';
        });
      }
    } catch (e) {
      debugPrint('REGISTER EXCEPTION: $e');

      if (mounted) { //check if widget still part of tree, like if the page doesn't exist 
        setState(() {
          _errorMessage = 'Unable to communicat with backend.';
          _successMessage = '';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Account'),
      ),

      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Create Account',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.bold,
                    ),
                  ),

                  const SizedBox(height: 30),

                  // First Name
                  TextFormField(
                    controller: _firstNameController,
                    decoration: const InputDecoration(
                      labelText: 'First Name',
                      hintText: 'Enter first name',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Please enter your first name.';
                      }
                      return null;
                    },
                  ),

                  const SizedBox(height: 16),

                  // Last Name
                  TextFormField(
                    controller: _lastNameController,
                    decoration: const InputDecoration(
                      labelText: 'Last Name',
                      hintText: 'Enter last name',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Please enter your last name.';
                      }
                      return null;
                    },
                  ),

                  const SizedBox(height: 16),

                  // Username
                  TextFormField(
                    controller: _loginController,
                    decoration: const InputDecoration(
                      labelText: 'Username',
                      hintText: 'Choose a username',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Please enter a username.';
                      }
                      return null;
                    },
                  ),

                  const SizedBox(height: 16),

                  // Email
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email Address',
                      hintText: 'Enter your email',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Please enter your email.';
                      }
                      if (!value.contains('@')) {
                        return 'Please enter a valid email.';
                      }
                      return null;
                    },
                  ),

                  const SizedBox(height: 16),

                  // Password
                  TextFormField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Password',
                      hintText: 'Create a password',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter a password.';
                      }
                      return null;
                    },
                  ),

                  const SizedBox(height: 16),

                  // Confirm Password
                  TextFormField(
                    controller: _confirmPasswordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Confirm Password',
                      hintText: 'Re-enter your password',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please confirm your password.';
                      }
                      if (value != _passwordController.text) {
                        return 'Passwords do not match.';
                      }
                      return null;
                    },
                  ),

                  const SizedBox(height: 24),

                  // Create Account
                  ElevatedButton(
                    onPressed: _isLoading ? null : _register,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: _isLoading
                        ? const CircularProgressIndicator()
                        : const Text(
                            'Create Account',
                            style: TextStyle(fontSize: 16),
                          ),
                  ),

                  const SizedBox(height: 16),

                  if (_errorMessage.isNotEmpty)
                    Text(
                      _errorMessage,
                      style: const TextStyle(
                        color: Colors.red,
                        fontSize: 14,
                      ),
                      textAlign: TextAlign.center,
                    ),

                  if (_successMessage.isNotEmpty)
                    Text(
                      _successMessage,
                      style: const TextStyle(
                        color: Colors.green,
                        fontSize: 14,
                      ),
                      textAlign: TextAlign.center,
                    ),

                  const SizedBox(height: 16),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('Already have an account? '),
                      TextButton(
                        onPressed: () {
                          Navigator.pop(context);
                        },
                        child: const Text('Sign In'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _loginController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }
}

class ApplicationInfo {
  final String id;
  final String company;
  final String role;
  final String location;
  final String status;
  final String salaryHourly;
  final String dateApplied;

  ApplicationInfo({
    required this.id,
    required this.company,
    required this.role,
    required this.location,
    required this.status,
    required this.salaryHourly,
    required this.dateApplied,
  });
}

//dashboard
class DashboardPage extends StatefulWidget { 
  final String firstName;
  final String lastName;

  const DashboardPage({
    super.key,
    required this.firstName,
    required this.lastName,
  });

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}
class _DashboardPageState extends State<DashboardPage> {

  final _formKey = GlobalKey<FormState>();

  final _searchController = TextEditingController();
  final _companyController = TextEditingController();
  final _roleController = TextEditingController();
  final _locationController = TextEditingController();
  final _salaryController = TextEditingController();
  final _dateController = TextEditingController();

  String _status = 'Applied';
  String _search = '';

  // Initial application values
  final List<ApplicationInfo> _applications = [
    ApplicationInfo(
      id: '1',
      company: 'Texas Instruments',
      role: 'Applications Engineering Intern',
      location: 'Dallas, TX',
      status: 'Offer',
      salaryHourly: '38',
      dateApplied: '2026-09-10',
    ),
    ApplicationInfo(
      id: '2',
      company: 'AMD',
      role: 'CPU Post-Silicon Validation Co-op',
      location: 'Austin, TX',
      status: 'Interviewing',
      salaryHourly: '38',
      dateApplied: '2026-09-22',
    ),
    ApplicationInfo(
      id: '3',
      company: 'Lockheed Martin',
      role: 'Software Engineering Intern',
      location: 'Orlando, FL',
      status: 'Applied',
      salaryHourly: '31',
      dateApplied: '2026-10-05',
    ),
  ];

  // Search applications
  List<ApplicationInfo> get _filteredApplications {
    return _applications.where((app) { //"where" filters the list 
      final search = _search.toLowerCase();

      return app.company.toLowerCase().contains(search) || //check if text has the term 
          app.role.toLowerCase().contains(search) ||
          app.status.toLowerCase().contains(search);
    }).toList(); //convert the results into a list 
  }

  // Add application
  void _addApplication() {
    if (!_formKey.currentState!.validate()) return; //check if the form fields are valid 

    setState(() {
      _applications.add( //fill in the application with the form field answers
        ApplicationInfo(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          company: _companyController.text.trim(),
          role: _roleController.text.trim(),
          location: _locationController.text.trim(),
          status: _status,
          salaryHourly: _salaryController.text.isEmpty
              ? '0'
              : _salaryController.text,
          dateApplied: _dateController.text.isEmpty
              ? '2026-11-05'
              : _dateController.text,
        ),
      );
    });

    _companyController.clear();
    _roleController.clear();
    _locationController.clear();
    _salaryController.clear();
    _dateController.clear();

    setState(() {
      _status = 'Applied';
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Application added!')),
    );
  }

  // Delete application
  void _deleteApplication(String id) {
    setState(() {
      _applications.removeWhere((app) => app.id == id);
    });
  }

  // Select date
  Future<void> _selectDate() async {
    final selectedDate = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );

    if (selectedDate != null) {
      setState(() {
        _dateController.text =
            '${selectedDate.year}-'
            '${selectedDate.month.toString().padLeft(2, '0')}-'
            '${selectedDate.day.toString().padLeft(2, '0')}';
      });
    }
  }

  // Status colors
  Color _statusColor(String status) {
    switch (status) {
      case 'Offer':
        return Colors.green;
      case 'Interviewing':
        return Colors.blue;
      case 'Rejected':
        return Colors.red;
      default:
        return Colors.orange;
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _companyController.dispose();
    _roleController.dispose();
    _locationController.dispose();
    _salaryController.dispose();
    _dateController.dispose();
    super.dispose();
  }

  //build the UI
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F6F8),

      // TOP NAVBAR
      appBar: AppBar(
        backgroundColor: const Color(0xFF212529),
        foregroundColor: Colors.white,
        title: const Text(
          'Internship Tracker',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pushAndRemoveUntil(
                context,
                MaterialPageRoute(
                  builder: (context) => const LoginPage(),
                ),
                (route) => false,
              );
            },
            child: const Text(
              'Sign out',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),

      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // DASHBOARD HEADER
              Text(
                'Welcome, ${widget.firstName} ${widget.lastName}',
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),

              const SizedBox(height: 8),

              const Text(
                'Dashboard',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
              ),

              const SizedBox(height: 20),

              // ADD APPLICATION FORM
              Card(
                color: Colors.white,
                elevation: 2,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Add New Application',
                          style: TextStyle(
                            fontSize: 19,
                            fontWeight: FontWeight.w600,
                          ),
                        ),

                        const SizedBox(height: 16),

                        TextFormField(
                          controller: _companyController,
                          decoration: const InputDecoration(
                            labelText: 'Company',
                            hintText: 'e.g. AMD',
                            border: OutlineInputBorder(),
                          ),
                          validator: (value) {
                            if (value == null ||
                                value.trim().isEmpty) {
                              return 'Enter a company';
                            }
                            return null;
                          },
                        ),

                        const SizedBox(height: 12),

                        TextFormField(
                          controller: _roleController,
                          decoration: const InputDecoration(
                            labelText: 'Role',
                            hintText: 'e.g. Software Intern',
                            border: OutlineInputBorder(),
                          ),
                          validator: (value) {
                            if (value == null ||
                                value.trim().isEmpty) {
                              return 'Enter a role';
                            }
                            return null;
                          },
                        ),

                        const SizedBox(height: 12),

                        TextFormField(
                          controller: _locationController,
                          decoration: const InputDecoration(
                            labelText: 'Location',
                            hintText: 'e.g. Orlando, FL',
                            border: OutlineInputBorder(),
                          ),
                        ),

                        const SizedBox(height: 12),

                        DropdownButtonFormField<String>(
                          initialValue: _status,
                          decoration: const InputDecoration(
                            labelText: 'Status',
                            border: OutlineInputBorder(),
                          ),
                          items: [
                            'Applied',
                            'Interviewing',
                            'Offer',
                            'Rejected',
                          ].map((status) {
                            return DropdownMenuItem(
                              value: status,
                              child: Text(status),
                            );
                          }).toList(),
                          onChanged: (value) {
                            if (value != null) {
                              setState(() {
                                _status = value;
                              });
                            }
                          },
                        ),

                        const SizedBox(height: 12),

                        TextFormField(
                          controller: _salaryController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Hourly Pay (\$)',
                            border: OutlineInputBorder(),
                          ),
                        ),

                        const SizedBox(height: 12),

                        TextFormField(
                          controller: _dateController,
                          readOnly: true,
                          onTap: _selectDate,
                          decoration: const InputDecoration(
                            labelText: 'Date Applied',
                            hintText: 'Select a date',
                            border: OutlineInputBorder(),
                            suffixIcon: Icon(Icons.calendar_today),
                          ),
                        ),

                        const SizedBox(height: 16),

                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _addApplication,
                            style: ElevatedButton.styleFrom(
                              backgroundColor:
                                  const Color(0xFF0D6EFD),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                vertical: 14,
                              ),
                            ),
                            child: const Text('Add Application'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 28),

              // APPLICATIONS HEADER
              const Text(
                'Applications',
                style: TextStyle(
                  fontSize: 23,
                  fontWeight: FontWeight.bold,
                ),
              ),

              const SizedBox(height: 12),

              // SEARCH BAR
              TextField(
                controller: _searchController,
                onChanged: (value) {
                  setState(() {
                    _search = value;
                  });
                },
                decoration: InputDecoration(
                  hintText: 'Search applications...',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _search.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _searchController.clear();
                            setState(() {
                              _search = '';
                            });
                          },
                        )
                      : null,
                  border: const OutlineInputBorder(),
                  filled: true,
                  fillColor: Colors.white,
                ),
              ),

              const SizedBox(height: 12),

              // APPLICATION CARDS
              if (_filteredApplications.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(
                    child: Text('No applications found.'),
                  ),
                )
              else
                ..._filteredApplications.map((app) {
                  return Card(
                    color: Colors.white,
                    elevation: 1,
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment:
                                CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Text(
                                  app.company,
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              IconButton(
                                icon: const Icon(
                                  Icons.delete_outline,
                                  color: Colors.red,
                                ),
                                onPressed: () {
                                  _deleteApplication(app.id);
                                },
                              ),
                            ],
                          ),

                          Text(
                            app.role,
                            style: const TextStyle(fontSize: 15),
                          ),

                          const SizedBox(height: 12),

                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              Chip(
                                label: Text(app.status),
                                backgroundColor: _statusColor(app.status)
                                    .withValues(alpha: 0.15),
                                labelStyle: TextStyle(
                                  color: _statusColor(app.status),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              Chip(
                                label: Text(
                                  '\$${app.salaryHourly}/hr',
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 8),

                          Text(
                            app.location.isEmpty
                                ? 'Location not provided'
                                : app.location,
                            style: const TextStyle(
                              color: Colors.black54,
                            ),
                          ),

                          const SizedBox(height: 4),

                          Text(
                            'Applied: ${app.dateApplied}',
                            style: const TextStyle(
                              color: Colors.black54,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
            ],
          ),
        ),
      ),
    );
  }
}
