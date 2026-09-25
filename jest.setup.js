// Runs before each test file's imports. Keeps error-level logs visible
// (useful for the failure-path tests) while silencing the routine
// info/warn logging that would otherwise flood test output.
process.env.LOG_LEVEL = "error";
